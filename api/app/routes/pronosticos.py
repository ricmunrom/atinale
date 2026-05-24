from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario, Partido, Envio, Pronostico
from app.services.hash_service import calcular_hash
from app.services.scoring_service import calcular_puntos_partido
from datetime import datetime, timezone
from typing import Optional
import os

router = APIRouter()

# ── AUTH HELPER ───────────────────────────────────────────────────────────
def get_usuario_actual(authorization: str = Header(...), db: Session = Depends(get_db)) -> Usuario:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.replace("Bearer ", "")
    from app.routes.auth import verificar_jwt
    payload = verificar_jwt(token)
    usuario = db.query(Usuario).filter(Usuario.id == int(payload["sub"])).first()
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")
    return usuario

# ── ENDPOINTS ─────────────────────────────────────────────────────────────

@router.get("/")
def get_todos_envios(db: Session = Depends(get_db)):
    envios = db.query(Envio).all()
    resultado = []
    for envio in envios:
        pronosticos_dict = {
            str(p.partido_id): {
                "gl": p.goles_local,
                "gv": p.goles_vis,
                "puntos": p.puntos
            }
            for p in envio.pronosticos
        }
        puntos_total = sum(p.puntos for p in envio.pronosticos if p.puntos is not None)
        resultado.append({
            "id":          envio.id,
            "usuario_id":  envio.usuario_id,
            "fase":        envio.fase,
            "hash":        envio.hash,
            "enviado_en":  envio.enviado_en.isoformat(),
            "puntos":      puntos_total,
            "pronosticos": pronosticos_dict,
        })
    return resultado

@router.get("/usuario/{usuario_id}")
def get_envios_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    envios = db.query(Envio).filter(Envio.usuario_id == usuario_id).all()
    resultado = []
    for envio in envios:
        pronosticos_dict = {
            str(p.partido_id): {
                "gl": p.goles_local,
                "gv": p.goles_vis,
                "puntos": p.puntos
            }
            for p in envio.pronosticos
        }
        puntos_total = sum(p.puntos for p in envio.pronosticos if p.puntos is not None)
        resultado.append({
            "id":          envio.id,
            "usuario_id":  envio.usuario_id,
            "fase":        envio.fase,
            "hash":        envio.hash,
            "enviado_en":  envio.enviado_en.isoformat(),
            "puntos":      puntos_total,
            "pronosticos": pronosticos_dict,
        })
    return resultado

@router.post("/enviar")
def enviar_pronosticos(
    body: dict,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual)
):
    fase        = body.get("fase")
    pronosticos = body.get("pronosticos", {})

    if not fase or not pronosticos:
        raise HTTPException(status_code=400, detail="fase y pronosticos son requeridos")

    # ¿Ya envió esta fase?
    ya_envio = db.query(Envio).filter(
        Envio.usuario_id == usuario.id,
        Envio.fase == fase,
    ).first()
    if ya_envio:
        raise HTTPException(status_code=409, detail="Ya enviaste esta fase, es inmutable")

    # Verificar que existen partidos para esta fase
    partidos_fase = db.query(Partido).filter(Partido.fase == fase).all()
    if not partidos_fase:
        raise HTTPException(status_code=404, detail=f"No hay partidos para la fase: {fase}")

    # Verificar deadline — cierre antes del primer partido de la fase
    ahora = datetime.now(timezone.utc)
    primer_partido = min(partidos_fase, key=lambda p: p.fecha)
    fecha_cierre = primer_partido.fecha.replace(tzinfo=timezone.utc)
    horas_cierre = float(os.getenv("HORAS_CIERRE", "2"))
    if (fecha_cierre - ahora).total_seconds() < horas_cierre * 3600:
        raise HTTPException(
            status_code=400,
            detail=f"El plazo para enviar pronósticos de {fase} ya cerró"
        )

    # Construir payload enriquecido con nombres de equipos
    timestamp = datetime.now(timezone.utc).isoformat()

    pronosticos_enriquecidos = {}
    for partido in partidos_fase:
        pid_str = str(partido.id)
        if pid_str not in pronosticos:
            raise HTTPException(status_code=400, detail=f"Falta pronóstico para partido {pid_str}")
        v = pronosticos[pid_str]
        pronosticos_enriquecidos[pid_str] = {
            "local":     partido.equipo_local,
            "visitante": partido.equipo_visitante,
            "gl":        v["gl"],
            "gv":        v["gv"],
        }

    payload_enriquecido = {
        "fase":        fase,
        "pronosticos": pronosticos_enriquecidos,
        "timestamp":   timestamp,
        "usuario":     usuario.email,
    }

    # Hash sobre el payload enriquecido completo
    hash_val = calcular_hash(payload_enriquecido)

    # Guardar envío
    envio = Envio(
        usuario_id=usuario.id,
        fase=fase,
        hash=hash_val,
        enviado_en=datetime.now(timezone.utc),
        bloqueado=True,
    )
    db.add(envio)
    db.flush()

    # Guardar pronósticos individuales
    for partido in partidos_fase:
        pid_str = str(partido.id)
        v = pronosticos[pid_str]
        pron = Pronostico(
            envio_id   =envio.id,
            usuario_id =usuario.id,
            partido_id =partido.id,
            goles_local=v["gl"],
            goles_vis  =v["gv"],
            puntos     =None,
        )
        db.add(pron)

    db.commit()

    # JSON completo que se descarga al usuario
    json_correo = {**payload_enriquecido, "hash": hash_val}

    return {
        "ok":          True,
        "hash":        hash_val,
        "enviado_en":  timestamp,
        "json_correo": json_correo,
    }

@router.get("/tabla")
def get_tabla(db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).filter(Usuario.activo == True).all()
    tabla = []
    for u in usuarios:
        pronosticos = db.query(Pronostico).filter(Pronostico.usuario_id == u.id).all()
        puntos    = sum(p.puntos for p in pronosticos if p.puntos is not None)
        exactos   = sum(1 for p in pronosticos if p.puntos == 3)
        ganadores = sum(1 for p in pronosticos if p.puntos == 1)
        jugados   = sum(1 for p in pronosticos if p.puntos is not None)
        tabla.append({
            "id":       u.id,
            "nombre":   u.nombre,
            "apellido": u.apellido,
            "email":    u.email,
            "foto":     u.foto,
            "puntos":   puntos,
            "exactos":  exactos,
            "ganadores":ganadores,
            "jugados":  jugados,
        })
    return sorted(tabla, key=lambda x: x["puntos"], reverse=True)
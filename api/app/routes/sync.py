from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Partido, Pronostico
from app.services.scoring_service import calcular_puntos_partido
import os

router = APIRouter()

def verificar_sync_token(x_sync_token: str = Header(...)):
    expected = os.getenv("SYNC_TOKEN", "dev_sync_token")
    if x_sync_token != expected:
        raise HTTPException(status_code=403, detail="Token de sync inválido")

@router.post("/resultado")
def cargar_resultado_manual(
    body: dict,
    db: Session = Depends(get_db),
    _: None = Depends(verificar_sync_token)
):
    partido_id      = body.get("partido_id")
    goles_local     = body.get("goles_local")
    goles_visitante = body.get("goles_visitante")

    if partido_id is None or goles_local is None or goles_visitante is None:
        raise HTTPException(status_code=400, detail="partido_id, goles_local y goles_visitante son requeridos")

    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    if partido.terminado:
        raise HTTPException(status_code=409, detail="Este partido ya tiene resultado cargado")

    partido.goles_local     = goles_local
    partido.goles_visitante = goles_visitante
    partido.terminado       = True
    db.commit()

    pronosticos = db.query(Pronostico).filter(
        Pronostico.partido_id == partido_id
    ).all()

    for pron in pronosticos:
        pron.puntos = calcular_puntos_partido(
            pron.goles_local, pron.goles_vis,
            goles_local, goles_visitante
        )

    db.commit()

    return {
        "ok": True,
        "confirmacion": f"✓ {partido.equipo_local} {goles_local} - {goles_visitante} {partido.equipo_visitante}",
        "pronosticos_evaluados": len(pronosticos),
    }

@router.get("/pendientes")
def get_partidos_pendientes(
    db: Session = Depends(get_db),
    _: None = Depends(verificar_sync_token)
):
    partidos = db.query(Partido).filter(
        Partido.terminado == False
    ).order_by(Partido.fecha).all()

    return [
        {
            "id":      p.id,
            "grupo":   p.grupo,
            "partido": f"{p.equipo_local} vs {p.equipo_visitante}",
            "fecha":   p.fecha.strftime("%d %b %H:%M UTC"),
        }
        for p in partidos
    ]

@router.get("/resultados")
def get_partidos_con_resultado(
    db: Session = Depends(get_db),
    _: None = Depends(verificar_sync_token)
):
    partidos = db.query(Partido).filter(
        Partido.terminado == True
    ).order_by(Partido.fecha).all()

    return [
        {
            "id":        p.id,
            "grupo":     p.grupo,
            "partido":   f"{p.equipo_local} vs {p.equipo_visitante}",
            "resultado": f"{p.goles_local}-{p.goles_visitante}",
        }
        for p in partidos
    ]


@router.patch("/resultado")
def corregir_resultado(
    body: dict,
    db: Session = Depends(get_db),
    _: None = Depends(verificar_sync_token)
):
    """
    Corrige el resultado de un partido ya cargado y recalcula puntos.
    Body: { partido_id, goles_local, goles_visitante }
    """
    partido_id      = body.get("partido_id")
    goles_local     = body.get("goles_local")
    goles_visitante = body.get("goles_visitante")

    if partido_id is None or goles_local is None or goles_visitante is None:
        raise HTTPException(status_code=400, detail="partido_id, goles_local y goles_visitante son requeridos")

    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    # Actualizar resultado
    partido.goles_local     = goles_local
    partido.goles_visitante = goles_visitante
    partido.terminado       = True
    db.commit()

    # Recalcular puntos de todos los pronósticos
    pronosticos = db.query(Pronostico).filter(
        Pronostico.partido_id == partido_id
    ).all()

    for pron in pronosticos:
        pron.puntos = calcular_puntos_partido(
            pron.goles_local, pron.goles_vis,
            goles_local, goles_visitante
        )

    db.commit()

    return {
        "ok": True,
        "confirmacion": f"✓ Corregido: {partido.equipo_local} {goles_local} - {goles_visitante} {partido.equipo_visitante}",
        "pronosticos_recalculados": len(pronosticos),
    }
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Partido
from typing import Optional

router = APIRouter()

@router.get("/")
def get_partidos(fase: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Devuelve todos los partidos.
    Opcionalmente filtra por fase: grupos, octavos, cuartos, semifinal, final
    """
    query = db.query(Partido)
    if fase:
        query = query.filter(Partido.fase == fase)
    partidos = query.order_by(Partido.fecha).all()
    return [
        {
            "id":               p.id,
            "api_football_id":  p.api_football_id,
            "fase":             p.fase,
            "grupo":            p.grupo,
            "fecha":            p.fecha.isoformat(),
            "equipo_local":     p.equipo_local,
            "equipo_visitante": p.equipo_visitante,
            "bandera_local":    p.bandera_local,
            "bandera_visitante":p.bandera_visitante,
            "goles_local":      p.goles_local,
            "goles_visitante":  p.goles_visitante,
            "terminado":        p.terminado,
        }
        for p in partidos
    ]

@router.get("/resultados")
def get_resultados(db: Session = Depends(get_db)):
    """
    Devuelve partidos ya terminados con resultado.
    Público — visible para todos los participantes.
    """
    partidos = db.query(Partido).filter(
        Partido.terminado == True
    ).order_by(Partido.fecha.desc()).all()

    return [
        {
            "id":               p.id,
            "grupo":            p.grupo,
            "fase":             p.fase,
            "fecha":            p.fecha.isoformat(),
            "equipo_local":     p.equipo_local,
            "equipo_visitante": p.equipo_visitante,
            "goles_local":      p.goles_local,
            "goles_visitante":  p.goles_visitante,
        }
        for p in partidos
    ]

@router.get("/{partido_id}")
def get_partido(partido_id: int, db: Session = Depends(get_db)):
    p = db.query(Partido).filter(Partido.id == partido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return {
        "id":               p.id,
        "fase":             p.fase,
        "grupo":            p.grupo,
        "fecha":            p.fecha.isoformat(),
        "equipo_local":     p.equipo_local,
        "equipo_visitante": p.equipo_visitante,
        "bandera_local":    p.bandera_local,
        "bandera_visitante":p.bandera_visitante,
        "goles_local":      p.goles_local,
        "goles_visitante":  p.goles_visitante,
        "terminado":        p.terminado,
    }


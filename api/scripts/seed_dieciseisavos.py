import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from app.database import SessionLocal, engine, Base
from app.models import Partido
from datetime import datetime
Base.metadata.create_all(bind=engine)

# Dieciseisavos de Final — Mundial 2026
# Horas convertidas de CDMX (UTC-6) a UTC
PARTIDOS = [
    {"fecha":"2026-06-28T19:00:00Z","local":"Sudáfrica","vis":"Canadá"},
    {"fecha":"2026-06-29T17:00:00Z","local":"Brasil","vis":"Japón"},
    {"fecha":"2026-06-29T20:30:00Z","local":"Alemania","vis":"Paraguay"},
    {"fecha":"2026-06-30T01:00:00Z","local":"Países Bajos","vis":"Marruecos"},
    {"fecha":"2026-06-30T17:00:00Z","local":"Costa de Marfil","vis":"Noruega"},
    {"fecha":"2026-06-30T21:00:00Z","local":"Francia","vis":"Suecia"},
    {"fecha":"2026-07-01T01:00:00Z","local":"México","vis":"Ecuador"},
    {"fecha":"2026-07-01T16:00:00Z","local":"Inglaterra","vis":"RD Congo"},
    {"fecha":"2026-07-01T20:00:00Z","local":"Bélgica","vis":"Senegal"},
    {"fecha":"2026-07-02T00:00:00Z","local":"Estados Unidos","vis":"Bosnia y Herzegovina"},
    {"fecha":"2026-07-02T19:00:00Z","local":"España","vis":"Austria"},
    {"fecha":"2026-07-02T23:00:00Z","local":"Portugal","vis":"Croacia"},
    {"fecha":"2026-07-03T03:00:00Z","local":"Suiza","vis":"Argelia"},
    {"fecha":"2026-07-03T18:00:00Z","local":"Australia","vis":"Egipto"},
    {"fecha":"2026-07-03T22:00:00Z","local":"Argentina","vis":"Cabo Verde"},
    {"fecha":"2026-07-04T01:30:00Z","local":"Colombia","vis":"Ghana"},
]

def seed():
    db = SessionLocal()
    try:
        existentes = db.query(Partido).filter(Partido.fase == "dieciseisavos").count()
        if existentes > 0:
            print(f"⚠️  Ya hay {existentes} partidos de dieciseisavos en DB. No se insertó nada.")
            return

        for p in PARTIDOS:
            partido = Partido(
                api_football_id=None,
                fase="dieciseisavos",
                grupo=None,
                fecha=datetime.fromisoformat(p["fecha"].replace("Z","+00:00")),
                equipo_local=p["local"],
                equipo_visitante=p["vis"],
                bandera_local=None,
                bandera_visitante=None,
                goles_local=None,
                goles_visitante=None,
                terminado=False,
            )
            db.add(partido)

        db.commit()
        print(f"✓ {len(PARTIDOS)} partidos de Dieciseisavos insertados correctamente")
        print(f"✓ Cierre de pronósticos: domingo 28 de junio · 11:00 AM hora CDMX")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

seed()
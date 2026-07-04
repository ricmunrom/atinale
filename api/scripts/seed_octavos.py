import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from app.database import SessionLocal, engine, Base
from app.models import Partido
from datetime import datetime
Base.metadata.create_all(bind=engine)

# Octavos de Final — Mundial 2026
# Horas convertidas de CDMX (UTC-6) a UTC
PARTIDOS = [
    {"fecha":"2026-07-04T17:00:00Z","local":"Canadá","vis":"Marruecos"},
    {"fecha":"2026-07-04T21:00:00Z","local":"Paraguay","vis":"Francia"},
    {"fecha":"2026-07-05T20:00:00Z","local":"Brasil","vis":"Noruega"},
    {"fecha":"2026-07-06T00:00:00Z","local":"México","vis":"Inglaterra"},
    {"fecha":"2026-07-06T19:00:00Z","local":"Portugal","vis":"España"},
    {"fecha":"2026-07-07T00:00:00Z","local":"Estados Unidos","vis":"Bélgica"},
    {"fecha":"2026-07-07T16:00:00Z","local":"Argentina","vis":"Egipto"},
    {"fecha":"2026-07-07T20:00:00Z","local":"Suiza","vis":"Colombia"},
]

def seed():
    db = SessionLocal()
    try:
        existentes = db.query(Partido).filter(Partido.fase == "octavos").count()
        if existentes > 0:
            print(f"⚠️  Ya hay {existentes} partidos de octavos en DB. No se insertó nada.")
            return

        for p in PARTIDOS:
            partido = Partido(
                api_football_id=None,
                fase="octavos",
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
        print(f"✓ {len(PARTIDOS)} partidos de Octavos insertados correctamente")
        print(f"✓ Cierre de pronósticos: sábado 4 de julio · 9:00 AM hora CDMX")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

seed()
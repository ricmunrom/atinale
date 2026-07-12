import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from app.database import SessionLocal, engine, Base
from app.models import Partido
from datetime import datetime
Base.metadata.create_all(bind=engine)

# Semifinales — Mundial 2026
# Horas convertidas de CDMX (UTC-6) a UTC
PARTIDOS = [
    {"fecha":"2026-07-14T19:00:00Z","local":"Francia","vis":"España"},
    {"fecha":"2026-07-15T19:00:00Z","local":"Inglaterra","vis":"Argentina"},
]

def seed():
    db = SessionLocal()
    try:
        existentes = db.query(Partido).filter(Partido.fase == "semifinal").count()
        if existentes > 0:
            print(f"⚠️  Ya hay {existentes} partidos de semifinal en DB. No se insertó nada.")
            return

        for p in PARTIDOS:
            partido = Partido(
                api_football_id=None,
                fase="semifinal",
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
        print(f"✓ {len(PARTIDOS)} partidos de Semifinal insertados correctamente")
        print(f"✓ Cierre de pronósticos: martes 14 de julio · 11:00 AM hora CDMX")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

seed()
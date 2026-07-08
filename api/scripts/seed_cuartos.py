import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from app.database import SessionLocal, engine, Base
from app.models import Partido
from datetime import datetime
Base.metadata.create_all(bind=engine)

# Cuartos de Final — Mundial 2026
# Horas convertidas de CDMX (UTC-6) a UTC
PARTIDOS = [
    {"fecha":"2026-07-09T20:00:00Z","local":"Francia","vis":"Marruecos"},
    {"fecha":"2026-07-10T19:00:00Z","local":"España","vis":"Bélgica"},
    {"fecha":"2026-07-11T21:00:00Z","local":"Noruega","vis":"Inglaterra"},
    {"fecha":"2026-07-12T01:00:00Z","local":"Argentina","vis":"Suiza"},
]

def seed():
    db = SessionLocal()
    try:
        existentes = db.query(Partido).filter(Partido.fase == "cuartos").count()
        if existentes > 0:
            print(f"⚠️  Ya hay {existentes} partidos de cuartos en DB. No se insertó nada.")
            return

        for p in PARTIDOS:
            partido = Partido(
                api_football_id=None,
                fase="cuartos",
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
        print(f"✓ {len(PARTIDOS)} partidos de Cuartos de Final insertados correctamente")
        print(f"✓ Cierre de pronósticos: jueves 9 de julio · 12:00 PM hora CDMX")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

seed()
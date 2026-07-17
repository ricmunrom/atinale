import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from app.database import SessionLocal, engine, Base
from app.models import Partido
from datetime import datetime
Base.metadata.create_all(bind=engine)

PARTIDOS = [
    {"fecha":"2026-07-18T21:00:00Z","local":"Francia","vis":"Inglaterra"},
]

def seed():
    db = SessionLocal()
    try:
        existentes = db.query(Partido).filter(Partido.fase == "tercer_lugar").count()
        if existentes > 0:
            print(f"⚠️  Ya hay partidos de tercer lugar en DB. No se insertó nada.")
            return
        for p in PARTIDOS:
            partido = Partido(
                api_football_id=None, fase="tercer_lugar", grupo=None,
                fecha=datetime.fromisoformat(p["fecha"].replace("Z","+00:00")),
                equipo_local=p["local"], equipo_visitante=p["vis"],
                bandera_local=None, bandera_visitante=None,
                goles_local=None, goles_visitante=None, terminado=False,
            )
            db.add(partido)
        db.commit()
        print(f"✓ Tercer lugar insertado correctamente")
        print(f"✓ Cierre: sábado 18 de julio · 1:00 PM hora CDMX")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

seed()
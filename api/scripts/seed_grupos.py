import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from app.database import SessionLocal, engine, Base
from app.models import Partido
from datetime import datetime, timezone
Base.metadata.create_all(bind=engine)

# Fuente: Yahoo Sports / ESPN - Mayo 2026
# Horas en UTC (ET + 4h, CDT + 5h)
PARTIDOS = [
    # ── GRUPO A: México, Sudáfrica, Corea del Sur, Checoslovaquia ──
    {"fecha":"2026-06-11T19:00:00Z","local":"México",          "vis":"Sudáfrica",            "grupo":"A"},
    {"fecha":"2026-06-12T02:00:00Z","local":"Corea del Sur",   "vis":"Chequia",              "grupo":"A"},
    {"fecha":"2026-06-18T16:00:00Z","local":"Chequia",         "vis":"Sudáfrica",            "grupo":"A"},
    {"fecha":"2026-06-19T01:00:00Z","local":"México",          "vis":"Corea del Sur",        "grupo":"A"},
    {"fecha":"2026-06-25T01:00:00Z","local":"Chequia",         "vis":"México",               "grupo":"A"},
    {"fecha":"2026-06-25T01:00:00Z","local":"Sudáfrica",       "vis":"Corea del Sur",        "grupo":"A"},

    # ── GRUPO B: Canadá, Bosnia y Herz., Qatar, Suiza ──
    {"fecha":"2026-06-12T19:00:00Z","local":"Canadá",          "vis":"Bosnia y Herzegovina", "grupo":"B"},
    {"fecha":"2026-06-13T19:00:00Z","local":"Qatar",           "vis":"Suiza",                "grupo":"B"},
    {"fecha":"2026-06-18T19:00:00Z","local":"Suiza",           "vis":"Bosnia y Herzegovina", "grupo":"B"},
    {"fecha":"2026-06-18T22:00:00Z","local":"Canadá",          "vis":"Qatar",                "grupo":"B"},
    {"fecha":"2026-06-24T19:00:00Z","local":"Suiza",           "vis":"Canadá",               "grupo":"B"},
    {"fecha":"2026-06-24T19:00:00Z","local":"Bosnia y Herzegovina","vis":"Qatar",            "grupo":"B"},

    # ── GRUPO C: Brasil, Marruecos, Haití, Escocia ──
    {"fecha":"2026-06-13T22:00:00Z","local":"Brasil",          "vis":"Marruecos",            "grupo":"C"},
    {"fecha":"2026-06-14T01:00:00Z","local":"Haití",           "vis":"Escocia",              "grupo":"C"},
    {"fecha":"2026-06-19T22:00:00Z","local":"Escocia",         "vis":"Marruecos",            "grupo":"C"},
    {"fecha":"2026-06-20T00:30:00Z","local":"Brasil",          "vis":"Haití",                "grupo":"C"},
    {"fecha":"2026-06-24T22:00:00Z","local":"Escocia",         "vis":"Brasil",               "grupo":"C"},
    {"fecha":"2026-06-24T22:00:00Z","local":"Marruecos",       "vis":"Haití",                "grupo":"C"},

    # ── GRUPO D: Estados Unidos, Paraguay, Australia, Türkiye ──
    {"fecha":"2026-06-13T01:00:00Z","local":"Estados Unidos",  "vis":"Paraguay",             "grupo":"D"},
    {"fecha":"2026-06-13T04:00:00Z","local":"Australia",       "vis":"Türkiye",              "grupo":"D"},
    {"fecha":"2026-06-19T19:00:00Z","local":"Estados Unidos",  "vis":"Australia",            "grupo":"D"},
    {"fecha":"2026-06-20T03:00:00Z","local":"Türkiye",         "vis":"Paraguay",             "grupo":"D"},
    {"fecha":"2026-06-26T02:00:00Z","local":"Türkiye",         "vis":"Estados Unidos",       "grupo":"D"},
    {"fecha":"2026-06-26T02:00:00Z","local":"Paraguay",        "vis":"Australia",            "grupo":"D"},

    # ── GRUPO E: Alemania, Curazao, Costa de Marfil, Ecuador ──
    {"fecha":"2026-06-14T17:00:00Z","local":"Alemania",        "vis":"Curazao",              "grupo":"E"},
    {"fecha":"2026-06-14T23:00:00Z","local":"Costa de Marfil", "vis":"Ecuador",              "grupo":"E"},
    {"fecha":"2026-06-20T21:00:00Z","local":"Alemania",        "vis":"Costa de Marfil",      "grupo":"E"},
    {"fecha":"2026-06-20T23:00:00Z","local":"Ecuador",         "vis":"Curazao",              "grupo":"E"},
    {"fecha":"2026-06-26T22:00:00Z","local":"Ecuador",        "vis":"Alemania",              "grupo":"E"},
    {"fecha":"2026-06-26T22:00:00Z","local":"Curazao",         "vis":"Costa de Marfil",      "grupo":"E"},

    # ── GRUPO F: Países Bajos, Japón, Suecia, Túnez ──
    {"fecha":"2026-06-14T20:00:00Z","local":"Países Bajos",    "vis":"Japón",                "grupo":"F"},
    {"fecha":"2026-06-15T02:00:00Z","local":"Suecia",          "vis":"Túnez",                "grupo":"F"},
    {"fecha":"2026-06-20T22:00:00Z","local":"Países Bajos",    "vis":"Suecia",               "grupo":"F"},
    {"fecha":"2026-06-21T02:00:00Z","local":"Túnez",           "vis":"Japón",                "grupo":"F"},
    {"fecha":"2026-06-27T02:00:00Z","local":"Túnez",           "vis":"Países Bajos",         "grupo":"F"},
    {"fecha":"2026-06-27T02:00:00Z","local":"Japón",           "vis":"Suecia",               "grupo":"F"},    

    # ── GRUPO G: Bélgica, Egipto, Irán, Nueva Zelanda ──
    {"fecha":"2026-06-15T22:00:00Z","local":"Bélgica",         "vis":"Egipto",               "grupo":"G"},
    {"fecha":"2026-06-16T04:00:00Z","local":"Irán",            "vis":"Nueva Zelanda",        "grupo":"G"},
    {"fecha":"2026-06-21T19:00:00Z","local":"Bélgica",         "vis":"Irán",                 "grupo":"G"},
    {"fecha":"2026-06-21T23:00:00Z","local":"Nueva Zelanda",          "vis":"Egipto",        "grupo":"G"},
    {"fecha":"2026-06-27T22:00:00Z","local":"Nueva Zelanda",         "vis":"Bélgica",        "grupo":"G"},
    {"fecha":"2026-06-27T22:00:00Z","local":"Egipto",          "vis":"Irán",                 "grupo":"G"},

    # ── GRUPO H: España, Cabo Verde, Arabia Saudita, Uruguay ──
    {"fecha":"2026-06-15T17:00:00Z","local":"España",          "vis":"Cabo Verde",           "grupo":"H"},
    {"fecha":"2026-06-15T22:00:00Z","local":"Arabia Saudita",  "vis":"Uruguay",              "grupo":"H"},
    {"fecha":"2026-06-21T17:00:00Z","local":"España",          "vis":"Arabia Saudita",       "grupo":"H"},
    {"fecha":"2026-06-21T22:00:00Z","local":"Uruguay",         "vis":"Cabo Verde",           "grupo":"H"},
    {"fecha":"2026-06-27T17:00:00Z","local":"Uruguay",          "vis":"España",              "grupo":"H"},
    {"fecha":"2026-06-27T17:00:00Z","local":"Cabo Verde",      "vis":"Arabia Saudita",       "grupo":"H"},

    # ── GRUPO I: Francia, Senegal, Noruega, Iraq ──
    {"fecha":"2026-06-16T19:00:00Z","local":"Francia",         "vis":"Senegal",              "grupo":"I"},
    {"fecha":"2026-06-16T22:00:00Z","local":"Iraq",           "vis":"Noruega",               "grupo":"I"},
    {"fecha":"2026-06-22T19:00:00Z","local":"Francia",         "vis":"Iraq",                 "grupo":"I"},
    {"fecha":"2026-06-22T23:00:00Z","local":"Noruega",         "vis":"Senegal",              "grupo":"I"},
    {"fecha":"2026-06-28T22:00:00Z","local":"Noruega",         "vis":"Francia",              "grupo":"I"},
    {"fecha":"2026-06-28T22:00:00Z","local":"Senegal",         "vis":"Iraq",                 "grupo":"I"},

    # ── GRUPO J: Argentina, Argelia, Austria, Jordania ──
    {"fecha":"2026-06-17T01:00:00Z","local":"Argentina",       "vis":"Argelia",              "grupo":"J"},
    {"fecha":"2026-06-17T04:00:00Z","local":"Austria",         "vis":"Jordania",             "grupo":"J"},
    {"fecha":"2026-06-22T22:00:00Z","local":"Argentina",       "vis":"Austria",              "grupo":"J"},
    {"fecha":"2026-06-23T01:00:00Z","local":"Jordania",         "vis":"Argelia",             "grupo":"J"},
    {"fecha":"2026-06-29T01:00:00Z","local":"Jordania",       "vis":"Argentina",             "grupo":"J"},
    {"fecha":"2026-06-29T01:00:00Z","local":"Argelia",         "vis":"Austria",              "grupo":"J"},

    # ── GRUPO K: Portugal, DR Congo, Colombia, Uzbekistan ──
    {"fecha":"2026-06-17T17:00:00Z","local":"Portugal",        "vis":"DR Congo",             "grupo":"K"},
    {"fecha":"2026-06-17T23:00:00Z","local":"Uzbekistan",        "vis":"Colombia",              "grupo":"K"},
    {"fecha":"2026-06-23T17:00:00Z","local":"Portugal",        "vis":"Uzbekistan",             "grupo":"K"},
    {"fecha":"2026-06-23T23:00:00Z","local":"Colombia",         "vis":"DR Congo",             "grupo":"K"},
    {"fecha":"2026-06-29T22:00:00Z","local":"Colombia",        "vis":"Portugal",              "grupo":"K"},
    {"fecha":"2026-06-29T22:00:00Z","local":"DR Congo",        "vis":"Uzbekistan",             "grupo":"K"},

    # ── GRUPO L: Inglaterra, Croacia, Ghana, Panamá ──
    {"fecha":"2026-06-18T17:00:00Z","local":"Inglaterra",      "vis":"Croacia",               "grupo":"L"},
    {"fecha":"2026-06-18T23:00:00Z","local":"Ghana",      "vis":"Panamá",               "grupo":"L"},
    {"fecha":"2026-06-23T19:00:00Z","local":"Inglaterra",      "vis":"Ghana",           "grupo":"L"},
    {"fecha":"2026-06-24T01:00:00Z","local":"Panamá",          "vis":"Croacia",               "grupo":"L"},
    {"fecha":"2026-06-30T01:00:00Z","local":"Panamá",      "vis":"Inglaterra",               "grupo":"L"},
    {"fecha":"2026-06-30T01:00:00Z","local":"Croacia",          "vis":"Ghana",           "grupo":"L"},
]

def seed():
    db = SessionLocal()
    try:
        existentes = db.query(Partido).count()
        if existentes > 0:
            print(f"⚠️  Ya hay {existentes} partidos en DB. Borra la DB primero si quieres reinsertar.")
            return
        for p in PARTIDOS:
            partido = Partido(
                api_football_id=None,
                fase="grupos",
                grupo=p["grupo"],
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
        print(f"✓ {len(PARTIDOS)} partidos insertados · 12 grupos · fuente: ESPN/Yahoo Sports Mayo 2026")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()

seed()
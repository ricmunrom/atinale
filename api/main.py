from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, partidos, pronosticos, sync
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import logging
import os

load_dotenv()
logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Atínale API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/auth")
app.include_router(partidos.router,    prefix="/partidos")
app.include_router(pronosticos.router, prefix="/pronosticos")
app.include_router(sync.router,        prefix="/sync")

@app.get("/")
def root():
    return {"status": "ok", "app": "Atínale API"}
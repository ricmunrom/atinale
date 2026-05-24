from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario
from datetime import datetime, timedelta
from jose import jwt
import httpx
import os

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_in_prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 días

def crear_jwt(usuario_id: int, email: str) -> str:
    payload = {
        "sub": str(usuario_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verificar_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

async def get_current_user(token: str, db: Session = Depends(get_db)) -> Usuario:
    payload = verificar_jwt(token)
    usuario = db.query(Usuario).filter(Usuario.id == int(payload["sub"])).first()
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")
    return usuario

@router.post("/google")
async def google_auth(body: dict, db: Session = Depends(get_db)):
    """
    Recibe el token de Google del frontend,
    lo verifica con Google y devuelve JWT propio.
    """
    google_token = body.get("token")
    if not google_token:
        raise HTTPException(status_code=400, detail="Token de Google requerido")

    # Verificar token con Google
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_token}"}
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token de Google inválido")

    google_data = resp.json()
    google_id = google_data.get("sub")
    email     = google_data.get("email")
    nombre    = google_data.get("given_name", "")
    apellido  = google_data.get("family_name", "")
    foto      = google_data.get("picture", "")

    # ¿Ya existe?
    usuario = db.query(Usuario).filter(Usuario.google_id == google_id).first()
    es_nuevo = False

    if not usuario:
        # Registro — primera vez
        usuario = Usuario(
            google_id=google_id,
            email=email,
            nombre=nombre,
            apellido=apellido,
            foto=foto,
            acepto_en=datetime.utcnow(),
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        es_nuevo = True
    else:
        # Login — actualizar foto por si cambió
        usuario.foto = foto
        db.commit()

    token = crear_jwt(usuario.id, usuario.email)

    return {
        "token": token,
        "es_nuevo": es_nuevo,
        "usuario": {
            "id":      usuario.id,
            "email":   usuario.email,
            "nombre":  usuario.nombre,
            "apellido":usuario.apellido,
            "foto":    usuario.foto,
        }
    }

@router.get("/me")
async def me(token: str, db: Session = Depends(get_db)):
    """
    Valida el JWT guardado en el frontend y devuelve el usuario.
    El frontend llama esto al cargar la app para ver si la sesión sigue viva.
    """
    payload = verificar_jwt(token)
    usuario = db.query(Usuario).filter(Usuario.id == int(payload["sub"])).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "id":      usuario.id,
        "email":   usuario.email,
        "nombre":  usuario.nombre,
        "apellido":usuario.apellido,
        "foto":    usuario.foto,
    }
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Usuario(Base):
    __tablename__ = "usuarios"
    id            = Column(Integer, primary_key=True)
    google_id     = Column(String, unique=True, index=True, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    nombre        = Column(String, nullable=False)
    apellido      = Column(String, nullable=False)
    foto          = Column(String)
    activo        = Column(Boolean, default=True)
    acepto_en     = Column(DateTime, default=datetime.utcnow)
    created_at    = Column(DateTime, default=datetime.utcnow)
    pronosticos   = relationship("Pronostico", back_populates="usuario")

class Partido(Base):
    __tablename__ = "partidos"
    id               = Column(Integer, primary_key=True)
    api_football_id  = Column(Integer, unique=True, index=True)
    fase             = Column(String, nullable=False)  # grupos, octavos, cuartos, semifinal, final
    grupo            = Column(String)                  # solo fase de grupos
    fecha            = Column(DateTime, nullable=False)
    equipo_local     = Column(String, nullable=False)
    equipo_visitante = Column(String, nullable=False)
    bandera_local    = Column(String)
    bandera_visitante= Column(String)
    goles_local      = Column(Integer)                 # null hasta que termina
    goles_visitante  = Column(Integer)                 # null hasta que termina
    terminado        = Column(Boolean, default=False)
    created_at       = Column(DateTime, default=datetime.utcnow)

class Envio(Base):
    __tablename__ = "envios"
    id          = Column(Integer, primary_key=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fase        = Column(String, nullable=False)
    hash        = Column(String, nullable=False)
    enviado_en  = Column(DateTime, default=datetime.utcnow)
    bloqueado   = Column(Boolean, default=True)       # siempre True una vez enviado
    usuario     = relationship("Usuario")
    pronosticos = relationship("Pronostico", back_populates="envio")

class Pronostico(Base):
    __tablename__ = "pronosticos"
    id          = Column(Integer, primary_key=True)
    envio_id    = Column(Integer, ForeignKey("envios.id"), nullable=False)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    partido_id  = Column(Integer, ForeignKey("partidos.id"), nullable=False)
    goles_local = Column(Integer, nullable=False)
    goles_vis   = Column(Integer, nullable=False)
    puntos      = Column(Integer)                     # null hasta que hay resultado
    envio       = relationship("Envio", back_populates="pronosticos")
    usuario     = relationship("Usuario", back_populates="pronosticos")
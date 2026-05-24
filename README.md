
# Atínale 🏆⚽

Plataforma de pronósticos deportivos para el Mundial 2026, construida para uso privado entre grupos de amigos o compañeros de trabajo.

## ¿Qué es?

Atínale permite a un grupo de participantes subir sus pronósticos de los partidos del Mundial antes de que comiencen, garantizando la inmutabilidad de los mismos mediante hashing SHA-256. Cada pronóstico queda sellado criptográficamente y es verificable públicamente por cualquier participante.

## Características

- 🔐 **Autenticación con Google OAuth** — registro único, login recurrente
- 🔒 **Pronósticos inmutables** — hash SHA-256 generado al enviar, copia JSON descargada al usuario
- 👁 **Transparencia total** — cualquier participante puede ver los pronósticos de cualquier otro
- ✅ **Verificador de integridad** — carga tu JSON y verifica que nadie manipuló tu documento ni el servidor
- 🏆 **Tabla de posiciones** en tiempo real
- ⚽ **Resultados** — sección pública con partidos ya jugados
- 📋 **Carga manual de resultados** — simple y sin dependencias externas
- 🛡 **Sin gestión de dinero** — la plataforma es solo un organizador de pronósticos

## Stack

**Backend**
- Python 3.13 + FastAPI
- SQLite (SQLAlchemy)
- Google OAuth + JWT
- SHA-256 para integridad de pronósticos

**Frontend**
- React + Vite
- Google OAuth (`@react-oauth/google`)
- CSS-in-JS con diseño dark theme

## Estructura

```
atinale/
├── api/                  → FastAPI backend
│   ├── app/
│   │   ├── models/       → SQLAlchemy models
│   │   ├── routes/       → auth, partidos, pronosticos, sync
│   │   ├── services/     → hash, scoring
│   │   └── jobs/         → cron (simplificado)
│   ├── scripts/
│   │   └── seed_grupos.py → seed de los 72 partidos del Mundial 2026
│   └── main.py
└── ui/                   → React + Vite frontend
    └── src/
        ├── App.jsx
        └── api.js
```

## Cómo funciona la integridad

Al enviar pronósticos el servidor genera un hash SHA-256 del JSON completo (usuario, fase, timestamp, pronósticos con nombres de equipos). El usuario descarga ese JSON. Si alguien modifica el pronóstico en la base de datos, el hash almacenado no coincidirá con el del archivo del usuario — la manipulación es detectable por cualquier participante.

```
Capas de integridad:
  1. Hash en DB
  2. JSON en poder del usuario (descarga automática)
  3. Hashes públicos visibles para todos
  4. Verificador en el frontend (100% en el navegador)
```

## Carga de resultados

Los resultados se cargan manualmente via API:

```bash
# Ver partidos pendientes
curl http://tu-servidor/sync/pendientes \
  -H "x-sync-token: tu_token"

# Cargar resultado
curl -X POST http://tu-servidor/sync/resultado \
  -H "x-sync-token: tu_token" \
  -H "Content-Type: application/json" \
  -d '{"partido_id": 1, "goles_local": 2, "goles_visitante": 0}'

# Corregir resultado
curl -X PATCH http://tu-servidor/sync/resultado \
  -H "x-sync-token: tu_token" \
  -H "Content-Type: application/json" \
  -d '{"partido_id": 1, "goles_local": 1, "goles_visitante": 1}'
```

## Setup local

```bash
# Backend
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # llenar variables
uvicorn main:app --reload --port 8000

# Seed de partidos
python scripts/seed_grupos.py

# Frontend
cd ui
npm install
npm run dev
```

## Variables de entorno

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
FRONTEND_URL=http://localhost:5173
DATABASE_URL=sqlite:///./atinale.db
HORAS_CIERRE=2
SYNC_TOKEN=
```

## Disclaimer legal

Atínale es una plataforma de pronósticos deportivos para uso privado entre participantes conocidos. No gestiona, retiene ni transfiere dinero de ningún tipo. Cualquier acuerdo económico entre participantes es de su exclusiva responsabilidad.
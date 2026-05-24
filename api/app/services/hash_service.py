import hashlib
import json

def canonical_json(data: dict) -> str:
    """
    Mismo algoritmo que el frontend usa para verificar.
    Claves ordenadas, sin espacios, UTF-8.
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def calcular_hash(data: dict) -> str:
    canonical = canonical_json(data)
    print(f"CANONICAL: {canonical[:200]}")  # primeros 200 chars
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()

def construir_payload_hash(usuario_email: str, fase: str, pronosticos: dict, timestamp: str) -> dict:
    """
    Construye el objeto que se hashea y se manda al usuario.
    Mismo orden siempre para que el frontend pueda reconstruirlo.
    """
    pronosticos_ordenados = dict(sorted(pronosticos.items(), key=lambda x: int(x[0])))
    return {
        "fase": fase,
        "pronosticos": pronosticos_ordenados,
        "timestamp": timestamp,
        "usuario": usuario_email,
    }
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("atinale_token");
}

function setToken(token) {
  localStorage.setItem("atinale_token", token);
}

function removeToken() {
  localStorage.removeItem("atinale_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const resp = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${resp.status}`);
  }
  return resp.json();
}

// ── AUTH ──────────────────────────────────────────────────────────────────
export async function loginConGoogle(googleToken) {
  const data = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ token: googleToken }),
  });
  setToken(data.token);
  return data; // { token, es_nuevo, usuario }
}

export async function getMe() {
  const token = getToken();
  if (!token) return null;
  try {
    return await request(`/auth/me?token=${token}`);
  } catch {
    removeToken();
    return null;
  }
}

export function logout() {
  removeToken();
}

// ── PARTIDOS ──────────────────────────────────────────────────────────────
export async function getPartidos(fase = null) {
  const qs = fase ? `?fase=${fase}` : "";
  return request(`/partidos/${qs}`);
}

// ── PRONÓSTICOS ───────────────────────────────────────────────────────────
export async function getTodosEnvios() {
  return request("/pronosticos/");
}

export async function getEnviosUsuario(usuarioId) {
  return request(`/pronosticos/usuario/${usuarioId}`);
}

export async function enviarPronosticos(fase, pronosticos) {
  return request("/pronosticos/enviar", {
    method: "POST",
    body: JSON.stringify({ fase, pronosticos }),
  });
}

export async function getTabla() {
  return request("/pronosticos/tabla");
}

export async function getResultados() {
    return request("/partidos/resultados");
  }
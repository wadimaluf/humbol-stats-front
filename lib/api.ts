// Thin client for the Marito-stats backend (Python / FastAPI).
// The base URL is provided via BACKEND_URL (see .env.example).

const BACKEND_URL = process.env.BACKEND_URL ?? "";

export function isBackendConfigured(): boolean {
  return BACKEND_URL.length > 0;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isBackendConfigured()) {
    throw new Error("BACKEND_URL no está configurado en el entorno");
  }
  const res = await fetch(`${BACKEND_URL}${path}`, { ...init });
  if (!res.ok) {
    throw new Error(`Backend respondió ${res.status} para ${path}`);
  }
  return res.json() as Promise<T>;
}

/** JSON endpoints used by the dashboard views. */
export function getMatch(matchId: string) {
  return request("/matches/" + encodeURIComponent(matchId));
}

export function getPlayerStats(matchId: string) {
  return request("/matches/" + encodeURIComponent(matchId) + "/stats");
}

export function getSprintEvents(matchId: string) {
  return request("/matches/" + encodeURIComponent(matchId) + "/sprints");
}

export function getRoster(matchId: string) {
  return request("/matches/" + encodeURIComponent(matchId) + "/roster");
}

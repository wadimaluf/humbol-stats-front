// Thin client for the Marito-stats backend API v1.
// The base URL is provided via BACKEND_URL (see .env.example).
// All endpoints return JSON typed according to the OpenAPI contract
// (see /Users/mariano/Dev/integration/openapi.yaml).

import type {
  Calibration,
  MatchDetail,
  MatchList,
  PlayerStatsList,
  Roster,
  SprintList,
} from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "";

export function isBackendConfigured(): boolean {
  return BACKEND_URL.length > 0;
}

interface ProblemFields {
  code: string | null;
  detail: string | undefined;
}

/** Accept both a root-level RFC 9457 body and FastAPI's legacy `detail` wrapper. */
function readProblemFields(body: unknown): ProblemFields {
  if (!body || typeof body !== "object") {
    return { code: null, detail: undefined };
  }
  const root = body as Record<string, unknown>;
  const nested =
    root.detail && typeof root.detail === "object"
      ? (root.detail as Record<string, unknown>)
      : root;
  return {
    code: typeof nested.code === "string" ? nested.code : null,
    detail: typeof nested.detail === "string" ? nested.detail : undefined,
  };
}

class BackendError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "BackendError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isBackendConfigured()) {
    throw new BackendError(
      "BACKEND_URL no está configurado en el entorno",
      0,
      "BACKEND_NOT_CONFIGURED",
    );
  }

  const url = `${BACKEND_URL.replace(/\/$/, "")}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init });
  } catch {
    throw new BackendError(
      `No se pudo conectar con la API en ${url}`,
      0,
      "NETWORK_ERROR",
    );
  }

  if (!res.ok) {
    let code: string | null = null;
    let detail: string | undefined;
    try {
      const problem = readProblemFields(await res.json());
      code = problem.code;
      detail = problem.detail;
    } catch {
      // Ignore parse errors; fall back to status text
    }
    throw new BackendError(
      detail ?? `Backend respondió ${res.status} para ${path}`,
      res.status,
      code,
    );
  }

  return (await res.json()) as Promise<T>;
}

/** JSON endpoints used by the dashboard views. */

export function getMatches(limit?: number, cursor?: string) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<MatchList>(`/v1/matches${qs}`);
}

export function getMatch(matchId: string) {
  return request<MatchDetail>(
    `/v1/matches/${encodeURIComponent(matchId)}`,
  );
}

export function getPlayerStats(matchId: string) {
  return request<PlayerStatsList>(
    `/v1/matches/${encodeURIComponent(matchId)}/stats`,
  );
}

export function getSprintEvents(
  matchId: string,
  playerId?: string,
  limit?: number,
  cursor?: string,
) {
  const params = new URLSearchParams();
  if (playerId) params.set("playerId", playerId);
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<SprintList>(
    `/v1/matches/${encodeURIComponent(matchId)}/sprints${qs}`,
  );
}

/**
 * Fetch every sprint event for a match by following `nextCursor`.
 * The API paginates (50 by default), so a single request can silently
 * truncate matches with many events.
 */
export async function getAllSprintEvents(
  matchId: string,
  pageSize = 200,
): Promise<SprintList> {
  const first = await getSprintEvents(matchId, undefined, pageSize);
  if (!first.nextCursor) {
    return first;
  }

  const items = [...first.items];
  const seen = new Set<string>();
  let cursor: string | null = first.nextCursor;

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const page = await getSprintEvents(matchId, undefined, pageSize, cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
  }

  return { ...first, items, nextCursor: null };
}

export function getRoster(matchId: string) {
  return request<Roster>(
    `/v1/matches/${encodeURIComponent(matchId)}/roster`,
  );
}

export function getCalibration(matchId: string) {
  return request<Calibration>(
    `/v1/matches/${encodeURIComponent(matchId)}/calibration`,
  );
}

export function getHeatmaps(matchId: string) {
  return request<{
    matchId: string;
    globalUrl: string | null;
    players: Array<{ playerId: string; url: string | null }>;
  }>(`/v1/matches/${encodeURIComponent(matchId)}/heatmaps`);
}

export { BackendError };

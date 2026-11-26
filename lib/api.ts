// Thin client for the Marito-stats backend API (v2, database-backed).
// The base URL is provided via BACKEND_URL (see .env.example).
// Reads use the normalized read-model served by /v2/matches/{id}/read-model.

import type {
  CreateMatchInput,
  UpdateCalibrationInput,
  AddVideoInput,
  AddLandmarkInput,
  AddVideoSourceInput,
  MatchReadModel,
  MatchReadModelDocument,
  MatchSummaryV2,
  MatchV2,
  MatchVideoSource,
  YouTubeLink,
  RosterEntry,
  Team,
  UpdatePlayerInput,
  UpdateTeamInput,
} from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "";

// Shared secret for the mutating /v2 endpoints. Every caller of this module is
// a server component or route handler, so the value never reaches the browser
// bundle; a missing value makes writes fail closed with 401/503.
const WRITE_TOKEN = process.env.INGEST_TOKEN ?? "";

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
    detail:
      typeof nested.detail === "string"
        ? nested.detail
        : Array.isArray(nested.detail)
          ? (nested.detail[0] as { msg?: string } | undefined)?.msg
          : undefined,
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

async function send(path: string, init?: RequestInit): Promise<Response> {
  if (!isBackendConfigured()) {
    throw new BackendError(
      "BACKEND_URL no está configurado en el entorno",
      0,
      "BACKEND_NOT_CONFIGURED",
    );
  }

  const url = `${BACKEND_URL.replace(/\/$/, "")}${path}`;
  const headers = new Headers(init?.headers);
  if (WRITE_TOKEN) {
    headers.set("X-Ingest-Token", WRITE_TOKEN);
  }
  // Render Free duerme el servicio y devuelve 429 mientras arranca. Reintentar
  // un GET es seguro y evita que el operador vea un error por un cold start.
  const method = (init?.method ?? "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";
  const retryable = new Set([429, 502, 503]);

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      res = await fetch(url, { ...init, headers });
    } catch {
      throw new BackendError(
        `No se pudo conectar con la API en ${url}`,
        0,
        "NETWORK_ERROR",
      );
    }
    if (res.ok) return res;
    if (!canRetry || !retryable.has(res.status) || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }

  if (!res) {
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

  return res;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await send(path, init);
  return (await res.json()) as T;
}

/** For endpoints that answer 204 No Content (deletes). */
async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await send(path, init);
  // Release the socket if a proxy rewrote 204 into 200 with a body.
  await res.body?.cancel();
}

export { BackendError };

// ──────────────────────────────────────────────────────────────────────
// V2 Database-backed API functions
// ──────────────────────────────────────────────────────────────────────

/** Create a new match in the database. */
export function createMatch(input: CreateMatchInput) {
  return request<{ match_id: string; status: string }>("/v2/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Get a match from the database (V2). */
export function getMatchV2(matchId: string) {
  return request<MatchV2>(
    `/v2/matches/${encodeURIComponent(matchId)}`,
  );
}

/**
 * Whether a match is registered at all. Used when a read-model 404 means
 * "not processed yet" (redirect to /carga) rather than "does not exist".
 */
export async function matchExists(matchId: string): Promise<boolean> {
  try {
    await getMatchV2(matchId);
    return true;
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * List the dashboard cards in one request. The backend returns the aggregates
 * and the unpaginated total in `X-Total-Count`, so the page does not need a
 * read-model request per match.
 */
export async function listMatchSummaries(
  limit = 24,
  offset = 0,
): Promise<{ items: MatchSummaryV2[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await send(`/v2/matches/summaries?${params.toString()}`);
  const items = (await res.json()) as MatchSummaryV2[];
  const header = res.headers.get("x-total-count");
  const parsed = header === null ? Number.NaN : Number.parseInt(header, 10);
  return {
    items,
    total: Number.isFinite(parsed) ? parsed : items.length,
  };
}

/**
 * Fetch the normalized read-model (players, roster, sprints, calibration)
 * recombined into the same camelCase shape the v1 views already consume.
 */
export async function getMatchReadModel(
  matchId: string,
): Promise<MatchReadModel> {
  const doc = await request<MatchReadModelDocument>(
    `/v2/matches/${encodeURIComponent(matchId)}/read-model`,
  );
  return {
    match: doc,
    players: doc._players,
    roster: doc._roster,
    sprints: doc._sprints,
    calibration: doc._calibration,
  };
}

/** Update calibration data for a match. */
export function updateCalibration(matchId: string, input: UpdateCalibrationInput) {
  return request<{ match_id: string; status: string }>(
    `/v2/matches/${encodeURIComponent(matchId)}/calibration`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

/** Add a video to a match. */
export function addVideo(matchId: string, input: AddVideoInput) {
  return request<{ id: number; name: string; path: string; frames: number }>(
    `/v2/matches/${encodeURIComponent(matchId)}/videos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

/** Add a landmark to a match. */
export function addLandmark(matchId: string, input: AddLandmarkInput) {
  return request<{ id: number; landmark_id: string }>(
    `/v2/matches/${encodeURIComponent(matchId)}/landmarks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

/**
 * Edit operator-owned player fields. Omitted keys are left untouched and
 * survive read-model re-ingests from Kaggle. Works for roster-only players
 * (substitutes) as well, so the response is the roster entry shape.
 */
export function updatePlayer(
  matchId: string,
  playerId: string,
  input: UpdatePlayerInput,
) {
  return request<RosterEntry>(
    `/v2/matches/${encodeURIComponent(matchId)}/players/${encodeURIComponent(playerId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

/** Edit an operator-owned field of a match team (currently the name). */
export function updateTeam(
  matchId: string,
  teamId: string,
  input: UpdateTeamInput,
) {
  return request<Team>(
    `/v2/matches/${encodeURIComponent(matchId)}/teams/${encodeURIComponent(teamId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

// ──────────────────────────────────────────────────────────────────────
// Video sources: register a Drive/local source; never upload raw video
// ──────────────────────────────────────────────────────────────────────

/** Register (or refresh) a user-owned video source. */
export function addVideoSource(matchId: string, input: AddVideoSourceInput) {
  return request<MatchVideoSource>(
    `/v2/matches/${encodeURIComponent(matchId)}/sources`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

/** List the registered sources for a match. */
export function listVideoSources(matchId: string) {
  return request<MatchVideoSource[]>(
    `/v2/matches/${encodeURIComponent(matchId)}/sources`,
  );
}

/** Remove a registered source (the video itself is untouched). */
export function removeVideoSource(matchId: string, sourceId: number) {
  return requestVoid(
    `/v2/matches/${encodeURIComponent(matchId)}/sources/${sourceId}`,
    { method: "DELETE" },
  );
}

/** Attach a YouTube reference link for clip deep links (never processed). */
export function setYouTubeLink(
  matchId: string,
  url: string,
  matchStartSec = 0,
) {
  return request<YouTubeLink>(
    `/v2/matches/${encodeURIComponent(matchId)}/youtube`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, match_start_sec: matchStartSec }),
    },
  );
}

/** Remove the YouTube reference link from a match. */
export function clearYouTubeLink(matchId: string) {
  return requestVoid(`/v2/matches/${encodeURIComponent(matchId)}/youtube`, {
    method: "DELETE",
  });
}

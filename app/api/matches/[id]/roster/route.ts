import { NextResponse } from "next/server";

import { BackendError, updatePlayer, updateTeam } from "@/lib/api";
import type { RosterEntry, Team, UpdatePlayerInput } from "@/lib/types";

const TEAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const PLAYER_ID_PATTERN = /^P\d{2}$/;

interface TeamChange {
  id: string;
  name: string | null;
}

interface PlayerChange {
  id: string;
  input: UpdatePlayerInput;
}

interface RosterBody {
  teams?: unknown;
  players?: unknown;
}

class RosterError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RosterError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Team names are trimmed; an empty input clears the stored name. */
function teamName(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new RosterError("El nombre de equipo no es válido.", 400);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTeams(value: unknown): TeamChange[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new RosterError("La lista de equipos no es válida.", 400);
  }
  const changes: TeamChange[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string") {
      throw new RosterError("Cada equipo necesita un id.", 400);
    }
    const id = entry.id.trim();
    if (!TEAM_ID_PATTERN.test(id)) {
      throw new RosterError(`El id de equipo "${id}" no es válido.`, 400);
    }
    if (seen.has(id)) {
      throw new RosterError(`El equipo ${id} viene repetido.`, 400);
    }
    seen.add(id);
    changes.push({ id, name: teamName(entry.name) });
  }
  return changes;
}

function parsePlayers(value: unknown): PlayerChange[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new RosterError("La lista de jugadores no es válida.", 400);
  }
  const changes: PlayerChange[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string") {
      throw new RosterError("Cada jugador necesita un id.", 400);
    }
    const id = entry.id.trim();
    if (!PLAYER_ID_PATTERN.test(id)) {
      throw new RosterError(`El id de jugador "${id}" no es válido.`, 400);
    }
    if (seen.has(id)) {
      throw new RosterError(`El jugador ${id} viene repetido.`, 400);
    }
    seen.add(id);

    const input: UpdatePlayerInput = {};
    if ("displayName" in entry) {
      input.display_name = teamName(entry.displayName);
    }
    if ("teamId" in entry) {
      const raw = entry.teamId;
      if (raw !== null && typeof raw !== "string") {
        throw new RosterError(`El equipo de ${id} no es válido.`, 400);
      }
      const teamId = raw === null ? null : raw.trim();
      if (teamId !== null && !TEAM_ID_PATTERN.test(teamId)) {
        throw new RosterError(`El equipo de ${id} no es válido.`, 400);
      }
      input.team_id = teamId;
    }
    if (Object.keys(input).length === 0) {
      throw new RosterError(`El jugador ${id} no tiene cambios.`, 400);
    }
    changes.push({ id, input });
  }
  return changes;
}

function backendStatus(error: unknown): number {
  if (error instanceof BackendError) {
    return error.status === 0 ? 503 : error.status;
  }
  return 502;
}

/**
 * Persist the roster editor. Teams are patched before players so a player can
 * reference a team name that was not exported by the engine yet.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json(
      { error: "El identificador del partido no es válido." },
      { status: 400 },
    );
  }

  let body: RosterBody;
  try {
    body = (await request.json()) as RosterBody;
  } catch {
    return NextResponse.json(
      { error: "El cuerpo del pedido no es JSON válido." },
      { status: 400 },
    );
  }

  let teams: TeamChange[];
  let players: PlayerChange[];
  try {
    teams = parseTeams(body.teams);
    players = parsePlayers(body.players);
  } catch (error) {
    if (error instanceof RosterError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  if (teams.length === 0 && players.length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para guardar." },
      { status: 400 },
    );
  }

  const savedTeams: Team[] = [];
  const savedPlayers: RosterEntry[] = [];
  let applied = 0;
  try {
    for (const team of teams) {
      savedTeams.push(await updateTeam(id, team.id, { name: team.name }));
      applied += 1;
    }
    for (const player of players) {
      savedPlayers.push(await updatePlayer(id, player.id, player.input));
      applied += 1;
    }
  } catch (error) {
    const detail =
      error instanceof BackendError && error.status === 404
        ? "El partido o el jugador ya no existe."
        : error instanceof Error
          ? error.message
          : "Error desconocido.";
    return NextResponse.json(
      {
        error:
          applied > 0
            ? `Se guardaron ${applied} de ${teams.length + players.length} cambios. ${detail}`
            : detail,
        partial: applied > 0,
        teams: savedTeams,
        players: savedPlayers,
      },
      { status: backendStatus(error) },
    );
  }

  return NextResponse.json({ teams: savedTeams, players: savedPlayers });
}

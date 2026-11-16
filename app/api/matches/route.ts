import { NextResponse } from "next/server";

import {
  BackendError,
  addVideoSource,
  createMatch,
  getMatchV2,
  setYouTubeLink,
} from "@/lib/api";
import { parseDriveFileId } from "@/lib/drive";
import { isYouTubeUrl } from "@/lib/youtube";
import { parseKickoff } from "@/lib/kickoff";
import type { MatchVideoSource, YouTubeLink } from "@/lib/types";

interface RegisterMatchBody {
  matchId?: unknown;
  driveUrl?: unknown;
  kickoff?: unknown;
  youtubeUrl?: unknown;
}

interface RegisterMatchResponse {
  matchId: string;
  source: MatchVideoSource;
  youtube: YouTubeLink | null;
  youtubeWarning: string | null;
}

class RegistrationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RegistrationError";
    this.status = status;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function backendStatus(error: BackendError): number {
  return error.status === 0 ? 503 : error.status;
}

function driveError(error: unknown): RegistrationError {
  if (error instanceof BackendError) {
    if (error.status === 0) {
      return new RegistrationError(
        "No pudimos conectar con la API para validar el video.",
        503,
      );
    }
    if (error.status === 400) {
      return new RegistrationError(
        "El link de Drive no es válido. Pegá el enlace de un archivo compartido de Google Drive.",
        400,
      );
    }
    if (error.status === 403) {
      return new RegistrationError(
        "Google Drive rechazó el acceso. Revisá que el archivo esté compartido.",
        403,
      );
    }
    if (error.status === 404) {
      return new RegistrationError(
        "No encontramos el archivo en Google Drive. Revisá el link y los permisos.",
        404,
      );
    }
    if (error.status === 502) {
      return new RegistrationError(
        "No pudimos validar el link con Google Drive. Intentá de nuevo en unos segundos.",
        502,
      );
    }
    return new RegistrationError(
      `No pudimos registrar el video (HTTP ${error.status}).`,
      backendStatus(error),
    );
  }
  return new RegistrationError("No pudimos registrar el video.", 500);
}

function youtubeWarning(error: unknown): string {
  if (error instanceof BackendError) {
    if (error.status === 400) {
      return "El link de YouTube no es válido; el partido quedó cargado igual.";
    }
    if (error.status === 0 || error.status === 502) {
      return "No pudimos validar el link de YouTube; el partido quedó cargado igual. Podés agregarlo más tarde.";
    }
  }
  return "No pudimos guardar el link de YouTube; el partido quedó cargado igual.";
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: RegisterMatchBody;
  try {
    body = (await request.json()) as RegisterMatchBody;
  } catch {
    return NextResponse.json(
      { error: "El cuerpo del pedido no es JSON válido." },
      { status: 400 },
    );
  }

  const matchId = text(body.matchId);
  const driveUrl = text(body.driveUrl);
  const rawKickoff = text(body.kickoff);
  const youtubeUrl = text(body.youtubeUrl);

  if (!/^[A-Za-z0-9_-]+$/.test(matchId)) {
    return NextResponse.json(
      {
        error:
          "El identificador del partido no es válido. Usá solo letras, números, guiones o guiones bajos.",
      },
      { status: 400 },
    );
  }

  const driveFileId = parseDriveFileId(driveUrl);
  if (!driveFileId) {
    return NextResponse.json(
      {
        error:
          "El link de Drive no es válido. Pegá el enlace de un archivo compartido de Google Drive.",
      },
      { status: 400 },
    );
  }

  const kickoffSec = parseKickoff(rawKickoff);
  if (kickoffSec === null) {
    return NextResponse.json(
      { error: "El kickoff debe tener el formato mm:ss (por ejemplo 05:30)." },
      { status: 400 },
    );
  }

  try {
    try {
      await createMatch({ match_id: matchId });
    } catch (error) {
      if (!(error instanceof BackendError) || error.status !== 409) {
        throw error;
      }
      // A previous attempt may have created the match before failing. Resume
      // only when the Drive file is the same; never attach a second video to
      // an existing match by accident.
      const existing = await getMatchV2(matchId);
      const existingDrive = existing.sources.find(
        (source) => source.provider === "gdrive",
      );
      if (existingDrive && existingDrive.external_id !== driveFileId) {
        throw new RegistrationError(
          "Ese partido ya tiene otro video de Drive registrado. Elegí otro identificador.",
          409,
        );
      }
    }

    let source: MatchVideoSource;
    try {
      source = await addVideoSource(matchId, {
        provider: "gdrive",
        location: driveUrl,
        start_sec: kickoffSec,
      });
    } catch (error) {
      throw driveError(error);
    }

    let youtube: YouTubeLink | null = null;
    let warning: string | null = null;
    if (youtubeUrl) {
      if (!isYouTubeUrl(youtubeUrl)) {
        warning = "El link de YouTube no es válido; el partido quedó cargado igual.";
      } else {
        try {
          youtube = await setYouTubeLink(matchId, youtubeUrl, kickoffSec);
        } catch (error) {
          warning = youtubeWarning(error);
        }
      }
    }

    const payload: RegisterMatchResponse = {
      matchId,
      source,
      youtube,
      youtubeWarning: warning,
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof BackendError) {
      return NextResponse.json(
        {
          error:
            error.status === 0
              ? "No pudimos conectar con la API. Intentá de nuevo."
              : `La API rechazó la carga (HTTP ${error.status}).`,
        },
        { status: backendStatus(error) },
      );
    }
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al registrar el partido." },
      { status: 500 },
    );
  }
}

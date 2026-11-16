import { Suspense } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/app/data-states";
import { BackendError, getMatchReadModel, listMatchesV2 } from "@/lib/api";
import { describeBackendError } from "@/lib/errors";
import { formatMatchDate } from "@/lib/format";
import type { MatchV2 } from "@/lib/types";

export const metadata = {
  title: "Partidos | Humbol Stats",
  description: "Partidos cargados y sus estadísticas",
};

interface MatchCardData {
  matchId: string;
  title: string;
  /** Display date (already formatted) or the raw match id. */
  date: string;
  status: string;
  playerCount: number;
  durationSec: number;
  hasSprintEvents: boolean;
  /** processed = has read-model; pending = registered only; error = read failed. */
  state: "processed" | "pending" | "error";
}

export default function MatchesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Partidos cargados y procesados. Elegí uno para ver estadísticas,
            roster y cancha.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/partidos/nuevo" />}
        >
          Cargar un partido
        </Button>
      </div>

      <Suspense fallback={<MatchesSkeleton />}>
        <MatchesContent />
      </Suspense>
    </div>
  );
}

async function MatchesContent() {
  let matches: MatchV2[];
  try {
    // Bounded page size: each card needs its read-model for the aggregates.
    matches = await listMatchesV2(30);
  } catch (error) {
    return (
      <ErrorState
        title="No se pudieron cargar los partidos"
        description={describeBackendError(error, "la lista de partidos")}
        retryHref="/partidos"
      />
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay partidos"
        description="Cargá el primero con un link de Google Drive. Cuando el motor termine de procesarlo, va a aparecer acá con sus estadísticas."
        actionHref="/partidos/nuevo"
        actionLabel="Cargar un partido"
      />
    );
  }

  const cards = await Promise.all(
    matches.map(async (match) => {
      const base = {
        matchId: match.match_id,
        title: `Partido ${match.match_id}`,
        date: formatMatchDate(match.match_id),
        status: "pending",
        playerCount: 0,
        durationSec: 0,
        hasSprintEvents: false,
      };
      try {
        const readModel = await getMatchReadModel(match.match_id);
        const sprintEvents = readModel.match.quality?.sprintEvents;
        return {
          ...base,
          title: readModel.match.title || base.title,
          date: formatMatchDate(readModel.match.date || match.match_id),
          status: readModel.match.status,
          playerCount: readModel.players.length,
          durationSec: readModel.match.durationSec ?? 0,
          hasSprintEvents:
            sprintEvents?.available ?? readModel.match.hasSprintEvents,
          state: "processed",
        } satisfies MatchCardData;
      } catch (error) {
        // 404 = registered but not processed yet. Anything else is a real
        // failure and must not be disguised as "pending".
        return {
          ...base,
          state:
            error instanceof BackendError && error.status === 404
              ? "pending"
              : "error",
        } satisfies MatchCardData;
      }
    }),
  );

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((match) => (
        <li key={match.matchId}>
          <MatchCard match={match} />
        </li>
      ))}
    </ul>
  );
}

function MatchCard({ match }: { match: MatchCardData }) {
  const processed = match.state === "processed";
  const failed = match.state === "error";
  const href = processed
    ? `/partidos/${match.matchId}`
    : failed
      ? `/partidos/${match.matchId}`
      : `/partidos/${match.matchId}/carga`;

  return (
    <Link
      href={href}
      className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-shadow group-hover:shadow-sm group-hover:ring-foreground/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{match.title}</CardTitle>
              <CardDescription>{match.date}</CardDescription>
            </div>
            <Badge
              variant={failed ? "destructive" : statusVariant(match.status)}
            >
              {failed ? "Error de lectura" : statusLabel(match.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
          {processed ? (
            <>
              <span>{match.playerCount} jugadores</span>
              <span aria-hidden>·</span>
              <span>~{Math.round(match.durationSec / 60)} min</span>
            </>
          ) : failed ? (
            <span>No pudimos leer las estadísticas de este partido</span>
          ) : (
            <span>Cargado, esperando procesamiento</span>
          )}
        </CardContent>

        <CardFooter className="justify-between">
          {processed ? (
            <Badge variant={match.hasSprintEvents ? "secondary" : "outline"}>
              {match.hasSprintEvents ? "Con sprints" : "Sin sprints"}
            </Badge>
          ) : failed ? (
            <Badge variant="destructive">Lectura fallida</Badge>
          ) : (
            <Badge variant="outline">Sin procesar</Badge>
          )}
          <span className="text-primary inline-flex items-center gap-1 font-medium">
            {processed
              ? "Ver estadísticas"
              : failed
                ? "Reintentar"
                : "Ver estado de la carga"}
            <span aria-hidden>→</span>
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function MatchesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completado";
    case "processing":
      return "Procesando";
    case "needs_calibration":
      return "Revisar cancha";
    case "pending":
      return "Pendiente";
    case "failed":
      return "Falló";
    default:
      return status;
  }
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "secondary";
    case "failed":
      return "destructive";
    case "processing":
    case "needs_calibration":
    case "pending":
      return "outline";
    default:
      return "secondary";
  }
}

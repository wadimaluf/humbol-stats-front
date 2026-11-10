import { Suspense } from "react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { BackendError, getMatches } from "@/lib/api";
import type { MatchList, MatchSummary } from "@/lib/types";

export const metadata = {
  title: "Partidos | Humbol Stats",
  description: "Partidos procesados y sus estadísticas",
};

export default function MatchesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Partidos procesados por el motor. Elegí uno para ver estadísticas,
            roster y cancha.
          </p>
        </div>
        <Button render={<Link href="/partidos/nuevo" />}>
          Subir un partido
        </Button>
      </div>

      <Suspense fallback={<MatchesSkeleton />}>
        <MatchesContent />
      </Suspense>
    </div>
  );
}

async function MatchesContent() {
  let data: MatchList;
  try {
    data = await getMatches();
  } catch (error) {
    const detail =
      error instanceof BackendError && error.status === 0
        ? "La API no está configurada o no está disponible en este entorno."
        : "La API respondió con un error al pedir la lista de partidos.";
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudieron cargar los partidos</AlertTitle>
        <AlertDescription>
          <p>{detail}</p>
          <p>
            Revisá que el backend esté corriendo y{" "}
            <Link href="/partidos">volvé a intentar</Link>.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
        <p className="font-medium">Todavía no hay partidos procesados</p>
        <p className="text-muted-foreground max-w-md text-sm">
          Cuando el motor termine de procesar un video, el partido va a aparecer
          acá con sus estadísticas.
        </p>
        <Button
          className="mt-2"
          variant="outline"
          render={<Link href="/partidos/nuevo" />}
        >
          Subir un partido
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((match) => (
        <li key={match.matchId}>
          <MatchCard match={match} />
        </li>
      ))}
    </ul>
  );
}

function MatchCard({ match }: { match: MatchSummary }) {
  return (
    <Link
      href={`/partidos/${match.matchId}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-shadow group-hover:shadow-sm group-hover:ring-foreground/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{match.title}</CardTitle>
              <CardDescription>{formatMatchDate(match.date)}</CardDescription>
            </div>
            <Badge variant={statusVariant(match.status)}>
              {statusLabel(match.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{match.playerCount} jugadores</span>
          <span aria-hidden>·</span>
          <span>~{Math.round(match.durationSec / 60)} min</span>
        </CardContent>

        <CardFooter className="justify-between">
          <Badge variant={match.hasSprintEvents ? "secondary" : "outline"}>
            {match.hasSprintEvents ? "Con sprints" : "Sin sprints"}
          </Badge>
          <span className="text-primary inline-flex items-center gap-1 font-medium">
            Ver estadísticas
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

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Format `YYYY-MM-DD` without timezone shifts. */
function formatMatchDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) {
    return isoDate;
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completado";
    case "processing":
      return "Procesando";
    case "needs_calibration":
      return "Revisar cancha";
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
      return "outline";
    default:
      return "secondary";
  }
}

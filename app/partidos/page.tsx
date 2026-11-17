import { Suspense } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { listMatchSummaries } from "@/lib/api";
import { describeBackendError } from "@/lib/errors";
import { formatMatchDate } from "@/lib/format";
import type { MatchSummaryV2 } from "@/lib/types";

export const metadata = {
  title: "Partidos | Humbol Stats",
  description: "Partidos cargados y sus estadísticas",
};

const PAGE_SIZE = 12;

interface MatchesSearchParams {
  page?: string | string[];
}

export default function MatchesPage(props: PageProps<"/partidos">) {
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
        <MatchesContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function pageHref(page: number): string {
  return page <= 1 ? "/partidos" : `/partidos?page=${page}`;
}

async function MatchesContent({
  searchParams,
}: {
  searchParams: Promise<MatchesSearchParams>;
}) {
  const page = parsePage((await searchParams).page);
  const offset = (page - 1) * PAGE_SIZE;

  let summaries: MatchSummaryV2[];
  let total: number;
  try {
    const result = await listMatchSummaries(PAGE_SIZE, offset);
    summaries = result.items;
    total = result.total;
  } catch (error) {
    return (
      <ErrorState
        title="No se pudieron cargar los partidos"
        description={describeBackendError(error, "la lista de partidos")}
        retryHref="/partidos"
      />
    );
  }

  if (total === 0) {
    return (
      <EmptyState
        title="Todavía no hay partidos"
        description="Cargá el primero con un link de Google Drive. Cuando el motor termine de procesarlo, va a aparecer acá con sus estadísticas."
        actionHref="/partidos/nuevo"
        actionLabel="Cargar un partido"
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (summaries.length === 0) {
    return (
      <EmptyState
        title="Esta página no tiene partidos"
        description={`Hay ${total} partido${total === 1 ? "" : "s"} en ${totalPages} página${totalPages === 1 ? "" : "s"}.`}
        actionHref={pageHref(totalPages)}
        actionLabel="Ir a la última página"
      />
    );
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {`${total} partido${total === 1 ? "" : "s"}${
          totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""
        }`}
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((match) => (
          <li key={match.match_id}>
            <MatchCard match={match} />
          </li>
        ))}
      </ul>

      <Pagination page={page} totalPages={totalPages} />
    </>
  );
}

function MatchCard({ match }: { match: MatchSummaryV2 }) {
  const href = match.processed
    ? `/partidos/${match.match_id}`
    : `/partidos/${match.match_id}/carga`;

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
              <CardDescription>{formatMatchDate(match.date)}</CardDescription>
            </div>
            <Badge variant={statusVariant(match.status)}>
              {statusLabel(match.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
          {match.processed ? (
            <>
              <span>{match.player_count} jugadores</span>
              <span aria-hidden>·</span>
              <span>~{Math.round(match.duration_sec / 60)} min</span>
            </>
          ) : (
            <span>Cargado, esperando procesamiento</span>
          )}
        </CardContent>

        <CardFooter className="justify-between">
          {match.processed ? (
            <Badge
              variant={match.sprint_events_available ? "secondary" : "outline"}
            >
              {match.sprint_events_available ? "Con sprints" : "Sin sprints"}
            </Badge>
          ) : (
            <Badge variant="outline">Sin procesar</Badge>
          )}
          <span className="text-primary inline-flex items-center gap-1 font-medium">
            {match.processed ? "Ver estadísticas" : "Ver estado de la carga"}
            <span aria-hidden>→</span>
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Paginación de partidos"
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
    >
      {page > 1 ? (
        <Link
          href={pageHref(page - 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← Anterior
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          ← Anterior
        </Button>
      )}
      <span className="text-muted-foreground text-sm">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={pageHref(page + 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Siguiente →
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Siguiente →
        </Button>
      )}
    </nav>
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

import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { RosterAssigner } from "@/components/app/roster-assigner";
import { AssetImage } from "@/components/app/asset-image";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/app/data-states";
import { BackendError, getRoster } from "@/lib/api";
import { describeBackendError } from "@/lib/errors";
import type { Roster } from "@/lib/types";

export default function RosterPage(props: PageProps<"/partidos/[id]/roster">) {
  return (
    <Suspense fallback={<RosterSkeleton />}>
      <RosterContent params={props.params} />
    </Suspense>
  );
}

async function RosterContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rosterImageUrl = `/v1/matches/${encodeURIComponent(id)}/assets/roster-image`;

  let roster: Roster;
  try {
    roster = await getRoster(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <MatchSteps matchId={id} current={1} />
        <ErrorState
          title="No se pudo cargar el roster"
          description={describeBackendError(error, "el roster del partido")}
          retryHref={`/partidos/${id}/roster`}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <MatchSteps matchId={id} current={1} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Asignar equipos
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Arrastrá cada jugador a su equipo. Las fotos son muestras extraídas del
          partido por el motor de identificación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jugadores detectados</CardTitle>
          <CardDescription>
            Galería de muestras generada automáticamente por el motor de
            identificación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetImage
            src={rosterImageUrl}
            alt={`Galería de jugadores detectados en el partido ${id}`}
            className="mx-auto w-full max-w-3xl rounded-lg border"
            fallback={
              <div className="text-muted-foreground flex aspect-video w-full items-center justify-center rounded-lg border bg-muted text-sm">
                Galería de jugadores no disponible para este partido
              </div>
            }
          />
        </CardContent>
      </Card>

      {roster.players.length > 0 ? (
        <RosterAssigner
          players={roster.players}
          teams={roster.teams}
          rosterImageUrl={rosterImageUrl}
        />
      ) : (
        <EmptyState
          title="No se detectaron jugadores"
          description="El motor no encontró jugadores en este partido. Revisá la calibración de la cancha o volvé a procesar el video."
          actionHref={`/partidos/${id}/cancha`}
          actionLabel="Revisar la cancha"
        />
      )}
    </div>
  );
}

function RosterSkeleton() {
  return (
    <PageSkeleton maxWidth="max-w-5xl">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </PageSkeleton>
  );
}

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { StatsDashboard } from "@/components/app/stats-dashboard";
import { ErrorState, PageSkeleton } from "@/components/app/data-states";
import { BackendError, getMatchReadModel, matchExists } from "@/lib/api";
import { describeBackendError } from "@/lib/errors";
import { formatMatchDate } from "@/lib/format";
import type { MatchReadModel } from "@/lib/types";

export default function MatchDashboardPage(props: PageProps<"/partidos/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent params={props.params} />
    </Suspense>
  );
}

async function DashboardContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return null;

  let readModel: MatchReadModel;
  try {
    readModel = await getMatchReadModel(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      // A registered match without a read-model is not "missing": send the
      // operator to the upload status page instead of a 404.
      if (await matchExists(id)) {
        redirect(`/partidos/${encodeURIComponent(id)}/carga`);
      }
      notFound();
    }
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <MatchSteps matchId={id} current={2} />
        <ErrorState
          title="No se pudieron cargar las estadísticas"
          description={describeBackendError(
            error,
            "las estadísticas del partido",
          )}
          retryHref={`/partidos/${id}`}
        />
      </div>
    );
  }

  const { match, players, sprints, calibration } = readModel;
  const sprintEvents = match.quality?.sprintEvents;
  const sprintsAvailable = sprintEvents?.available ?? match.hasSprintEvents;
  const date = match.date ? formatMatchDate(match.date) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <MatchSteps matchId={id} current={2} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {match.title || `Partido ${match.matchId}`}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kickoff en el video: {match.kickoffClock}
            {date ? ` · ${date}` : ""}
            {calibration.rmsM != null
              ? ` · Calibración: ${calibration.rmsM} m RMS`
              : ""}
          </p>
        </div>
      </div>

      <StatsDashboard
        stats={players}
        sprints={sprints}
        sprintsAvailable={sprintsAvailable}
        sprintsReason={sprintEvents?.reason ?? null}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <PageSkeleton maxWidth="max-w-6xl">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-80" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-24 flex-1 min-w-40" />
        ))}
      </div>
    </PageSkeleton>
  );
}

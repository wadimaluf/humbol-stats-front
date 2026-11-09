import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { StatsDashboard } from "@/components/app/stats-dashboard";
import { BackendError, getMatch, getPlayerStats, getSprintEvents } from "@/lib/api";
import type { MatchDetail, PlayerStatsList, SprintList } from "@/lib/types";

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

  let match: MatchDetail;
  let stats: PlayerStatsList;
  let sprints: SprintList;
  try {
    [match, stats, sprints] = await Promise.all([
      getMatch(id),
      getPlayerStats(id),
      getSprintEvents(id),
    ]);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <MatchSteps matchId={id} current={2} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{match.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kickoff en el video: {match.kickoffClock}
            {match.date ? ` · ${match.date}` : ""}
          </p>
        </div>
      </div>

      <StatsDashboard
        matchId={id}
        stats={stats.players}
        sprints={sprints.available ? sprints.items : []}
        sprintsAvailable={sprints.available}
        sprintsReason={sprints.reason}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-80" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-24 flex-1 min-w-40" />
        ))}
      </div>
    </div>
  );
}

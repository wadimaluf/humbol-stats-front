import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { StatsDashboard } from "@/components/app/stats-dashboard";
import { mockMatchSummary, mockPlayerStats, mockSprintEvents } from "@/lib/mock";

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

  // TODO: replace with real backend calls (getPlayerStats / getSprintEvents)
  const summary = mockMatchSummary(id);
  const stats = mockPlayerStats();
  const sprints = mockSprintEvents();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <MatchSteps matchId={id} current={2} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{summary.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kickoff en el video: {summary.kickoffTimestamp}
            {summary.date ? ` · ${summary.date}` : ""}
          </p>
        </div>
      </div>

      <StatsDashboard matchId={id} stats={stats} sprints={sprints} />
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

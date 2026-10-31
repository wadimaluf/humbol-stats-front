import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { RosterAssigner } from "@/components/app/roster-assigner";
import { mockRoster } from "@/lib/mock";

export default function RosterPage(props: PageProps<"/partidos/[id]/roster">) {
  return (
    <Suspense fallback={<RosterSkeleton />}>
      <RosterContent params={props.params} />
    </Suspense>
  );
}

async function RosterContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <MatchSteps matchId={id} current={1} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asignar equipos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Arrastrá cada jugador a su equipo. Las fotos son muestras extraídas del
          partido por el motor de identificación.
        </p>
      </div>

      {/* TODO: fetch real roster from backend (roster.csv / roster.json) */}
      <RosterAssigner players={mockRoster()} />
    </div>
  );
}

function RosterSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

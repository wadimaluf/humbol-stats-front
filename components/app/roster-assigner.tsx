"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RosterEntry } from "@/lib/types";

type Team = "A" | "B" | null;

interface Props {
  players: RosterEntry[];
}

const TEAM_STYLES: Record<"A" | "B", { badge: string; border: string; label: string }> = {
  A: {
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    border: "border-rose-300 bg-rose-50/40",
    label: "Equipo A",
  },
  B: {
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    border: "border-sky-300 bg-sky-50/40",
    label: "Equipo B",
  },
};

/** Step 3 of the flow: drag auto-detected players into Team A / Team B. */
export function RosterAssigner({ players }: Props) {
  const [entries, setEntries] = useState<RosterEntry[]>(players);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function drop(team: Team) {
    setEntries((prev) =>
      prev.map((p) => (p.id === draggingId ? { ...p, team } : p)),
    );
    setDraggingId(null);
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  const unassigned = entries.filter((p) => p.team === null);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {(["A", "B"] as const).map((letter) => (
          <Card key={letter} className={TEAM_STYLES[letter].border}>
            <CardHeader>
              <CardTitle>{TEAM_STYLES[letter].label}</CardTitle>
              <CardDescription>
                Arrastrá acá los jugadores de este equipo
              </CardDescription>
            </CardHeader>
            <CardContent
              className="min-h-32"
              onDrop={() => drop(letter)}
              onDragOver={onDragOver}
            >
              <div className="flex flex-wrap gap-3">
                {entries
                  .filter((p) => p.team === letter)
                  .map((p) => (
                    <PlayerChip key={p.id} entry={p} onDragStart={setDraggingId} />
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sin asignar ({unassigned.length})</CardTitle>
          <CardDescription>
            Los 10 jugadores detectados automáticamente en el partido
          </CardDescription>
        </CardHeader>
        <CardContent
          className="min-h-32"
          onDrop={() => drop(null)}
          onDragOver={onDragOver}
        >
          <div className="flex flex-wrap gap-3">
            {unassigned.map((p) => (
              <PlayerChip
                key={p.id}
                entry={p}
                onDragStart={setDraggingId}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button disabled={unassigned.length > 0}>Guardar roster</Button>
      </div>
    </div>
  );
}

function PlayerChip({
  entry,
  onDragStart,
}: {
  entry: RosterEntry;
  onDragStart: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(entry.id)}
      className="flex cursor-grab flex-col items-center gap-1 rounded-lg border bg-card p-2 shadow-sm transition-transform hover:scale-105 active:cursor-grabbing"
      title={entry.id}
    >
      {/* Backend asset: roster.csv/png gallery photo */}
      <div className="h-16 w-16 overflow-hidden rounded-md bg-muted" aria-hidden />
      <Badge variant="secondary" className={entry.team ? TEAM_STYLES[entry.team].badge : undefined}>
        {entry.id}
      </Badge>
    </div>
  );
}

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
import { Input } from "@/components/ui/input";
import { PencilIcon, UserRoundIcon } from "lucide-react";
import { AssetImage } from "@/components/app/asset-image";
import type { RosterEntry, Team } from "@/lib/types";

type Assignment = "A" | "B" | null;

interface Props {
  players: RosterEntry[];
  teams: Team[];
}

const TEAM_STYLES: Record<
  "A" | "B",
  { badge: string; border: string; ring: string; placeholder: string }
> = {
  A: {
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    border: "border-rose-300 bg-rose-50/40",
    ring: "focus-visible:ring-rose-500/30",
    placeholder: "Equipo A",
  },
  B: {
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    border: "border-sky-300 bg-sky-50/40",
    ring: "focus-visible:ring-sky-500/30",
    placeholder: "Equipo B",
  },
};

/** Step 3 of the flow: drag auto-detected players into Team A / Team B.
 *
 * v1 is read-only: team names and player names are edited locally and are not
 * persisted to the backend. Persistence will be added in v2.
 */
export function RosterAssigner({ players, teams }: Props) {
  const [entries, setEntries] = useState<RosterEntry[]>(players);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<Record<"A" | "B", string>>({
    A: teams.find((t) => t.id === "A")?.name ?? "",
    B: teams.find((t) => t.id === "B")?.name ?? "",
  });

  function drop(team: Assignment) {
    if (draggingId) {
      assignPlayer(draggingId, team);
    }
    setDraggingId(null);
  }

  function assignPlayer(id: string, team: Assignment) {
    setEntries((prev) =>
      prev.map((p) => (p.id === id ? { ...p, teamId: team } : p)),
    );
  }

  function renamePlayer(id: string, name: string) {
    setEntries((prev) =>
      prev.map((p) => (p.id === id ? { ...p, displayName: name } : p)),
    );
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  const unassigned = entries.filter((p) => p.teamId === null);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {(["A", "B"] as const).map((letter) => {
          const styles = TEAM_STYLES[letter];
          const color = letter.toLowerCase() as "a" | "b";
          return (
            <Card key={letter} className={styles.border}>
              <CardHeader>
                <CardTitle>
                  <TeamNameInput
                    letter={letter}
                    value={teamNames[letter]}
                    placeholder={styles.placeholder}
                    ring={styles.ring}
                    onChange={(name) =>
                      setTeamNames((prev) => ({ ...prev, [letter]: name }))
                    }
                  />
                </CardTitle>
                <CardDescription>
                  Arrastrá acá los jugadores de este equipo
                </CardDescription>
              </CardHeader>
              <CardContent
                className="min-h-20 md:min-h-32"
                onDrop={() => drop(letter)}
                onDragOver={onDragOver}
                data-testid={`team-dropzone-${color}`}
              >
                <div className="flex flex-wrap gap-3">
                  {entries
                    .filter((p) => p.teamId === letter)
                    .map((p) => (
                      <PlayerChip
                        key={p.id}
                        entry={p}
                        onDragStart={setDraggingId}
                        onRename={renamePlayer}
                        onAssign={assignPlayer}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sin asignar ({unassigned.length})</CardTitle>
          <CardDescription>
            Los 10 jugadores detectados automáticamente en el partido
          </CardDescription>
        </CardHeader>
        <CardContent onDrop={() => drop(null)} onDragOver={onDragOver}>
          <div className="flex flex-wrap gap-3">
            {unassigned.map((p) => (
              <PlayerChip
                key={p.id}
                entry={p}
                onDragStart={setDraggingId}
                onRename={renamePlayer}
                onAssign={assignPlayer}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled variant="outline">
          Guardar roster (disponible en v2)
        </Button>
      </div>
    </div>
  );
}

/** Editable team name in the card header. */
function TeamNameInput({
  letter,
  value,
  placeholder,
  ring,
  onChange,
}: {
  letter: "A" | "B";
  value: string;
  placeholder: string;
  ring: string;
  onChange: (name: string) => void;
}) {
  return (
    <label className="group flex items-center gap-2">
      <Badge variant="secondary" className={TEAM_STYLES[letter].badge}>
        {letter}
      </Badge>
      <PencilIcon
        className="size-3.5 shrink-0 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-hidden
      />
      <Input
        value={value}
        placeholder={placeholder}
        aria-label={`Nombre del equipo ${letter}`}
        className={`h-auto border-transparent bg-transparent px-1 text-base font-semibold shadow-none focus-visible:bg-card ${ring}`}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function PlayerChip({
  entry,
  onDragStart,
  onRename,
  onAssign,
}: {
  entry: RosterEntry;
  onDragStart: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAssign: (id: string, team: Assignment) => void;
}) {
  const teamBadge =
    entry.teamId === "A" || entry.teamId === "B"
      ? TEAM_STYLES[entry.teamId].badge
      : undefined;

  return (
    <div
      className="group flex w-24 cursor-grab flex-col items-center gap-1 rounded-lg border bg-card p-2 shadow-sm transition-transform hover:scale-105 active:cursor-grabbing"
      title={`El nombre de ${entry.id} es editable y la foto se arrastra a un equipo`}
    >
      {/* Backend asset: roster.csv/png gallery photo. Thumbnail doubles as
          the drag handle so the name input stays clickable. */}
      <div className="relative">
        <div
          draggable
          onDragStart={() => onDragStart(entry.id)}
          className="h-14 w-14 cursor-grab touch-none overflow-hidden rounded-md bg-muted active:cursor-grabbing"
          aria-hidden
        >
          <AssetImage
            src={entry.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            fallback={
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <UserRoundIcon className="size-6" aria-hidden />
              </div>
            }
          />
        </div>
        <PencilIcon
          className="absolute -right-1.5 -top-1.5 size-4 rounded-full border bg-card p-0.5 text-muted-foreground opacity-60 shadow-xs transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          aria-hidden
        />
      </div>
      <Badge variant="secondary" className={teamBadge ?? undefined}>
        {entry.id}
      </Badge>
      <Input
        value={entry.displayName ?? ""}
        placeholder="Nombre"
        aria-label={`Nombre del jugador ${entry.id}`}
        className="h-6 border-transparent bg-transparent px-1 text-center text-xs shadow-none focus-visible:bg-card"
        onChange={(e) => onRename(entry.id, e.target.value)}
      />
      <select
        aria-label={`Equipo de ${entry.id}`}
        value={entry.teamId ?? ""}
        onChange={(e) =>
          onAssign(entry.id, (e.target.value || null) as Assignment)
        }
        className="h-6 w-full rounded border bg-card px-1 text-center text-[0.7rem] text-foreground"
      >
        <option value="">Sin equipo</option>
        <option value="A">Equipo A</option>
        <option value="B">Equipo B</option>
      </select>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
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
import { CheckIcon, PencilIcon } from "lucide-react";
import { AssetImage } from "@/components/app/asset-image";
import type { RosterEntry, Team } from "@/lib/types";

type Assignment = "A" | "B" | null;
type DropTarget = "A" | "B" | "unassigned" | null;

interface Props {
  players: RosterEntry[];
  teams: Team[];
}

const TEAM_STYLES: Record<
  "A" | "B",
  {
    badge: string;
    border: string;
    ring: string;
    dropActive: string;
    placeholder: string;
  }
> = {
  A: {
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    border: "border-rose-300 bg-rose-50/40",
    ring: "focus-visible:ring-rose-500/30",
    dropActive: "ring-2 ring-rose-400 bg-rose-100/70",
    placeholder: "Equipo A",
  },
  B: {
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    border: "border-sky-300 bg-sky-50/40",
    ring: "focus-visible:ring-sky-500/30",
    dropActive: "ring-2 ring-sky-400 bg-sky-100/70",
    placeholder: "Equipo B",
  },
};

const NOTICE_MS = 3200;

/** Step 3 of the flow: drag auto-detected players into Team A / Team B.
 *
 * v1 is read-only: team names and player names are edited locally and are not
 * persisted to the backend. Persistence will be added in v2.
 */
export function RosterAssigner({ players, teams }: Props) {
  const initialTeamNames = {
    A: teams.find((t) => t.id === "A")?.name ?? "",
    B: teams.find((t) => t.id === "B")?.name ?? "",
  };
  const [entries, setEntries] = useState<RosterEntry[]>(players);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [teamNames, setTeamNames] =
    useState<Record<"A" | "B", string>>(initialTeamNames);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
    };
  }, []);

  function announce(message: string) {
    setNotice(message);
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
    }
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }

  function drop(team: Assignment) {
    if (draggingId) {
      assignPlayer(draggingId, team);
    }
    setDraggingId(null);
    setDropTarget(null);
  }

  function assignPlayer(id: string, team: Assignment) {
    const player = entries.find((p) => p.id === id);
    if (!player || player.teamId === team) {
      return;
    }
    setEntries((prev) =>
      prev.map((p) => (p.id === id ? { ...p, teamId: team } : p)),
    );
    const name = player.displayName || id;
    announce(
      team
        ? `${name} asignado a ${teamNames[team] || TEAM_STYLES[team].placeholder}`
        : `${name} quedó sin asignar`,
    );
  }

  function renamePlayer(id: string, name: string) {
    setEntries((prev) =>
      prev.map((p) => (p.id === id ? { ...p, displayName: name } : p)),
    );
  }

  function resetChanges() {
    setEntries(players);
    setTeamNames(initialTeamNames);
    setDraggingId(null);
    setDropTarget(null);
    announce("Cambios descartados");
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  const unassigned = entries.filter((p) => p.teamId === null);
  const teamCounts = {
    A: entries.filter((p) => p.teamId === "A").length,
    B: entries.filter((p) => p.teamId === "B").length,
  };
  const dirty =
    entries.some(
      (p, i) =>
        p.teamId !== players[i]?.teamId ||
        p.displayName !== players[i]?.displayName,
    ) ||
    teamNames.A !== initialTeamNames.A ||
    teamNames.B !== initialTeamNames.B;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge className={TEAM_STYLES.A.badge}>
              {teamNames.A || TEAM_STYLES.A.placeholder} · {teamCounts.A}
            </Badge>
            <Badge className={TEAM_STYLES.B.badge}>
              {teamNames.B || TEAM_STYLES.B.placeholder} · {teamCounts.B}
            </Badge>
            <span className="text-muted-foreground">
              {unassigned.length} sin asignar
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetChanges}
              disabled={!dirty}
            >
              Descartar cambios
            </Button>
            <Button disabled variant="outline" size="sm">
              Guardar roster (v2)
            </Button>
          </div>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex min-h-5 items-center gap-1.5 text-sm"
        >
          {notice ? (
            <>
              <CheckIcon className="size-3.5 text-emerald-600" aria-hidden />
              {notice}
            </>
          ) : (
            <span>
              Los nombres y equipos se mantienen en esta sesión hasta que
              exista guardado (v2).
            </span>
          )}
        </p>
      </div>

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
                className={`min-h-20 transition-colors md:min-h-32 ${
                  dropTarget === letter ? styles.dropActive : ""
                }`}
                onDrop={() => drop(letter)}
                onDragOver={(event) => {
                  onDragOver(event);
                  setDropTarget(letter);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setDropTarget(null);
                  }
                }}
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
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropTarget(null);
                        }}
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
        <CardContent
          className={`transition-colors ${
            dropTarget === "unassigned"
              ? "ring-2 ring-border bg-muted/50"
              : ""
          }`}
          onDrop={() => drop(null)}
          onDragOver={(event) => {
            onDragOver(event);
            setDropTarget("unassigned");
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDropTarget(null);
            }
          }}
        >
          <div className="flex flex-wrap gap-3">
            {unassigned.map((p) => (
              <PlayerChip
                key={p.id}
                entry={p}
                onDragStart={setDraggingId}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTarget(null);
                }}
                onRename={renamePlayer}
                onAssign={assignPlayer}
              />
            ))}
          </div>
        </CardContent>
      </Card>
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
  onDragEnd,
  onRename,
  onAssign,
}: {
  entry: RosterEntry;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onRename: (id: string, name: string) => void;
  onAssign: (id: string, team: Assignment) => void;
}) {
  const teamBadge =
    entry.teamId === "A" || entry.teamId === "B"
      ? TEAM_STYLES[entry.teamId].badge
      : undefined;

  const initials =
    entry.displayName?.split(" ").reduce((acc, word) => acc + word[0], "") ?? entry.id.slice(0, 2).toUpperCase();

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
          onDragEnd={onDragEnd}
          className="h-14 w-14 cursor-grab touch-none overflow-hidden rounded-md bg-muted active:cursor-grabbing"
          aria-hidden
        >
          <AssetImage
            src={entry.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover rounded-md"
            fallback={
              <div
                className="flex h-full w-full items-center justify-center rounded-md rose-400"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {initials}
                </span>
              </div>
            }
          />
        </div>
        <PencilIcon
          className="absolute -right-1.5 -top-1.5 size-4 rounded-full border bg-card p-0.5 text-muted-foreground opacity-60 shadow-xs transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          aria-hidden
        />
      </div>
      {entry.displayName != null && (
        <span className="text-xs font-medium text-capitalize truncate">{entry.displayName}</span>
      )}
      {entry.displayName == null && (
        <span className="text-xs font-medium text-muted-foreground truncate">{entry.id}</span>
      )}
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

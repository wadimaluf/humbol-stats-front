"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AssetImage } from "@/components/app/asset-image";
import { EmptyState } from "@/components/app/data-states";
import { describeSprintAvailability } from "@/lib/format";
import type { PlayerStats, SprintEvent } from "@/lib/types";

interface Props {
  stats: PlayerStats[];
  sprints: SprintEvent[];
  sprintsAvailable: boolean;
  sprintsReason: string | null;
}

/** Step 4 of the flow: stats dashboard (tables, charts, heatmaps, sprints). */
export function StatsDashboard({
  stats,
  sprints,
  sprintsAvailable,
  sprintsReason,
}: Props) {
  if (stats.length === 0) {
    return (
      <EmptyState
        title="Sin estadísticas para este partido"
        description="El motor no generó estadísticas por jugador. Revisá la calibración de la cancha o volvé a procesar el video."
      />
    );
  }

  return (
    <Tabs defaultValue="resumen" className="flex flex-col gap-4">
      <TabsList className="max-w-full overflow-x-auto">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        <TabsTrigger value="heatmaps">Mapas de calor</TabsTrigger>
        <TabsTrigger value="sprints">Sprints</TabsTrigger>
      </TabsList>

      <TabsContent value="resumen">
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por jugador</CardTitle>
            <CardDescription>
              Distancia recorrida, velocidades, sprints y cobertura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 sm:hidden">
              {stats.map((p) => (
                <PlayerSummaryCard key={p.id} player={p} />
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Distancia (km)</TableHead>
                    <TableHead className="text-right">Vel. prom (km/h)</TableHead>
                    <TableHead className="text-right">Vel. máx (km/h)</TableHead>
                    <TableHead className="text-right">Sprints</TableHead>
                    <TableHead className="text-right">Cobertura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.displayName ?? p.id}
                      </TableCell>
                      <TableCell>
                        <TeamBadge teamId={p.teamId} />
                      </TableCell>
                      <TableCell className="text-right">
                        {p.minutesPlayed}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.distanceKm}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.avgSpeedKmh}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.maxSpeedKmh}
                      </TableCell>
                      <TableCell className="text-right">{p.sprints}</TableCell>
                      <TableCell className="text-right">
                        {p.coveragePct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="graficos">
        <Card>
          <CardHeader>
            <CardTitle>Distancia recorrida (km)</CardTitle>
            <CardDescription>
              Comparación entre jugadores del partido
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats}
                margin={{ left: -20, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="id" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar
                  dataKey="distanceKm"
                  name="Distancia"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="heatmaps">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {p.displayName ?? p.id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AssetImage
                  src={p.heatmapUrl}
                  alt={`Heatmap de ${p.displayName ?? p.id}`}
                  className="w-full h-auto rounded-md border"
                  fallback={
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                      Heatmap no disponible
                    </div>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="sprints">
        {!sprintsAvailable ? (
          <EmptyState
            title="Sprints no disponibles"
            description={describeSprintAvailability(sprintsReason)}
          />
        ) : sprints.length === 0 ? (
          <EmptyState
            title="No se detectaron sprints"
            description="El partido está procesado, pero el motor no registró eventos de sprint."
          />
        ) : (
          <SprintsTable sprints={sprints} players={stats} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function TeamBadge({ teamId }: { teamId: string | null }) {
  if (!teamId) {
    return <span className="text-muted-foreground">Sin asignar</span>;
  }
  return (
    <Badge variant={teamId === "A" ? "destructive" : "secondary"}>
      {teamId}
    </Badge>
  );
}

function PlayerSummaryCard({ player }: { player: PlayerStats }) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{player.displayName ?? player.id}</span>
        <TeamBadge teamId={player.teamId} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Stat label="Minutos" value={player.minutesPlayed} />
        <Stat label="Distancia" value={`${player.distanceKm} km`} />
        <Stat label="Vel. prom." value={`${player.avgSpeedKmh} km/h`} />
        <Stat label="Vel. máx." value={`${player.maxSpeedKmh} km/h`} />
        <Stat label="Sprints" value={player.sprints} />
        <Stat label="Cobertura" value={`${player.coveragePct}%`} />
      </dl>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

const SPRINT_PAGE_SIZE = 40;

type SprintSort = "time" | "speed" | "distance";

function SprintsTable({
  sprints,
  players,
}: {
  sprints: SprintEvent[];
  players: PlayerStats[];
}) {
  const names = new Map(players.map((p) => [p.id, p.displayName ?? p.id]));
  const hasYoutube = sprints.some((s) => s.youtubeUrl);
  const [playerFilter, setPlayerFilter] = useState("all");
  const [sort, setSort] = useState<SprintSort>("time");
  const [visibleCount, setVisibleCount] = useState(SPRINT_PAGE_SIZE);

  const playersWithSprints = useMemo(
    () => players.filter((p) => sprints.some((s) => s.playerId === p.id)),
    [players, sprints],
  );

  const fastest = useMemo(
    () => sprints.reduce((best, s) => (s.maxSpeedKmh > best.maxSpeedKmh ? s : best)),
    [sprints],
  );
  const longest = useMemo(
    () => sprints.reduce((best, s) => (s.distanceM > best.distanceM ? s : best)),
    [sprints],
  );

  const filtered = useMemo(() => {
    const subset =
      playerFilter === "all"
        ? sprints
        : sprints.filter((s) => s.playerId === playerFilter);
    return [...subset].sort((a, b) => {
      if (sort === "speed") return b.maxSpeedKmh - a.maxSpeedKmh;
      if (sort === "distance") return b.distanceM - a.distanceM;
      return a.startSec - b.startSec;
    });
  }, [sprints, playerFilter, sort]);

  const visible = filtered.slice(0, visibleCount);

  function changePlayer(value: string) {
    setPlayerFilter(value);
    setVisibleCount(SPRINT_PAGE_SIZE);
  }

  function changeSort(value: SprintSort) {
    setSort(value);
    setVisibleCount(SPRINT_PAGE_SIZE);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sprints detectados</CardTitle>
        <CardDescription>Marcas de tiempo desde el kickoff</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SprintSummary label="Sprints" value={sprints.length} />
          <SprintSummary label="Jugadores" value={playersWithSprints.length} />
          <SprintSummary
            label="Más rápido"
            value={`${fastest.maxSpeedKmh} km/h`}
            hint={names.get(fastest.playerId)}
          />
          <SprintSummary
            label="Más largo"
            value={`${longest.distanceM} m`}
            hint={names.get(longest.playerId)}
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Jugador</span>
              <select
                value={playerFilter}
                onChange={(e) => changePlayer(e.target.value)}
                className="h-8 rounded-md border bg-card px-2 text-sm text-foreground"
              >
                <option value="all">Todos</option>
                {playersWithSprints.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName ?? p.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Ordenar por</span>
              <select
                value={sort}
                onChange={(e) => changeSort(e.target.value as SprintSort)}
                className="h-8 rounded-md border bg-card px-2 text-sm text-foreground"
              >
                <option value="time">Momento</option>
                <option value="speed">Velocidad</option>
                <option value="distance">Distancia</option>
              </select>
            </label>
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">
            {filtered.length === sprints.length
              ? `${sprints.length} sprints`
              : `${filtered.length} de ${sprints.length} sprints`}
          </p>
        </div>

        <ul className="flex flex-col gap-2 sm:hidden">
          {visible.map((s) => (
            <SprintCard
              key={`${s.id}-${s.startSec}`}
              sprint={s}
              name={names.get(s.playerId) ?? s.playerId}
            />
          ))}
        </ul>

        <div className="hidden overflow-x-auto sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Momento</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="text-right">Duración</TableHead>
                <TableHead className="text-right">Distancia</TableHead>
                <TableHead className="text-right">Vel. máx</TableHead>
                <TableHead className="text-right">Vel. media</TableHead>
                {hasYoutube && <TableHead>Video</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((s) => (
                <TableRow key={`${s.id}-${s.startSec}`}>
                  <TableCell className="tabular-nums">
                    {s.startClock}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">
                        {names.get(s.playerId) ?? s.playerId}
                      </span>
                      <SprintRecordBadges sprint={s} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.durationSec.toFixed(2)} s
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.distanceM} m
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.maxSpeedKmh} km/h
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.meanSpeedKmh} km/h
                  </TableCell>
                  {hasYoutube && (
                    <TableCell>
                      {s.youtubeUrl ? (
                        <a
                          href={s.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-4"
                        >
                          Ver momento
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {visible.length < filtered.length && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((n) => n + SPRINT_PAGE_SIZE)}
            >
              Ver más ({filtered.length - visible.length} restantes)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SprintSummary({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="font-semibold tabular-nums">{value}</p>
      {hint && (
        <p className="text-muted-foreground truncate text-xs">{hint}</p>
      )}
    </div>
  );
}

function SprintRecordBadges({ sprint }: { sprint: SprintEvent }) {
  if (!sprint.isFastest && !sprint.isLongest) {
    return null;
  }
  return (
    <>
      {sprint.isFastest && (
        <Badge variant="outline">Récord de velocidad</Badge>
      )}
      {sprint.isLongest && (
        <Badge variant="outline">Récord de distancia</Badge>
      )}
    </>
  );
}

function SprintCard({ sprint, name }: { sprint: SprintEvent; name: string }) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground text-sm tabular-nums">
          {sprint.startClock}
        </span>
      </div>
      {(sprint.isFastest || sprint.isLongest) && (
        <div className="mt-1 flex flex-wrap gap-1">
          <SprintRecordBadges sprint={sprint} />
        </div>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Stat label="Duración" value={`${sprint.durationSec.toFixed(2)} s`} />
        <Stat label="Distancia" value={`${sprint.distanceM} m`} />
        <Stat label="Vel. máx" value={`${sprint.maxSpeedKmh} km/h`} />
        <Stat label="Vel. media" value={`${sprint.meanSpeedKmh} km/h`} />
      </dl>
      {sprint.youtubeUrl && (
        <a
          href={sprint.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-2 inline-block text-sm underline underline-offset-4"
        >
          Ver momento
        </a>
      )}
    </li>
  );
}

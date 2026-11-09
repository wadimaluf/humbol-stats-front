"use client";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { AssetImage } from "@/components/app/asset-image";
import type { PlayerStats, SprintEvent } from "@/lib/types";

interface Props {
  stats: PlayerStats[];
  sprints: SprintEvent[];
  matchId: string;
  sprintsAvailable: boolean;
  sprintsReason: string | null;
}

/** Step 4 of the flow: stats dashboard (tables, charts, heatmaps, sprints). */
export function StatsDashboard({
  stats,
  sprints,
  matchId,
  sprintsAvailable,
  sprintsReason,
}: Props) {
  return (
    <Tabs defaultValue="resumen" className="flex flex-col gap-4">
      <TabsList>
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
          <CardContent className="overflow-x-auto">
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
                      {p.teamId ? (
                        <Badge
                          variant={
                            p.teamId === "A" ? "destructive" : "secondary"
                          }
                        >
                          {p.teamId}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          Sin asignar
                        </span>
                      )}
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
          <Alert variant="destructive">
            Sprints no disponibles para este partido.
            {sprintsReason ? ` (${sprintsReason})` : ""}
          </Alert>
        ) : (
          <SprintsTable sprints={sprints} matchId={matchId} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function SprintsTable({
  sprints,
  matchId,
}: {
  sprints: SprintEvent[];
  matchId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sprints detectados</CardTitle>
        <CardDescription>
          {`Marcas de tiempo del partido ${matchId}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead className="text-right">Duración</TableHead>
              <TableHead className="text-right">Vel. máx</TableHead>
              <TableHead>YouTube</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sprints.map((s, i) => {
              const key = `${s.id}-${s.startSec}-${i}`;
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{s.playerId}</TableCell>
                  <TableCell>{s.startClock}</TableCell>
                  <TableCell className="text-right">
                    {s.durationSec}s
                  </TableCell>
                  <TableCell className="text-right">
                    {s.maxSpeedKmh} km/h
                  </TableCell>
                  <TableCell>
                    {s.youtubeUrl && (
                      <a
                        href={s.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        Ver momento
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

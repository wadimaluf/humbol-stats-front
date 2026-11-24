import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorState } from "@/components/app/data-states";
import { RetryDownloadButton } from "@/components/app/retry-download-button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackendError, getMatchV2 } from "@/lib/api";
import { describeBackendError } from "@/lib/errors";
import { formatKickoff } from "@/lib/kickoff";
import type { MatchV2, MatchVideoSource } from "@/lib/types";

export const metadata = {
  title: "Carga del partido | Humbol Stats",
  description: "Estado de la carga del video y el procesamiento",
};

const PROVIDER_LABELS: Record<string, string> = {
  gdrive: "Google Drive",
  local: "Archivo local",
};

function formatSize(bytes: number | null): string | null {
  if (!bytes) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SOURCE_STATUS_LABELS: Record<string, string> = {
  validated: "Validado",
  queued: "En cola",
  processing: "Procesando",
  failed: "Falló",
};

function SourceStatus({ source }: { source: MatchVideoSource }) {
  const label =
    SOURCE_STATUS_LABELS[source.status] ?? "Pendiente de validación";
  return (
    <Badge variant={source.status === "failed" ? "destructive" : "outline"}>
      {label}
    </Badge>
  );
}

function SourceItem({ source }: { source: MatchVideoSource }) {
  const size = formatSize(source.size_bytes);
  const label = source.title ?? source.external_id;
  return (
    <li className="flex flex-col gap-1 border-b py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {PROVIDER_LABELS[source.provider] ?? source.provider}
          </span>
          <SourceStatus source={source} />
        </div>
        <span className="text-muted-foreground text-xs">
          Kickoff {formatKickoff(source.start_sec)}
        </span>
      </div>

      {source.provider === "local" ? (
        <span className="text-muted-foreground break-all text-sm">{label}</span>
      ) : (
        <a
          href={source.location}
          target="_blank"
          rel="noreferrer"
          className="text-primary break-all text-sm underline underline-offset-4"
        >
          {label}
        </a>
      )}

      <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 text-xs">
        {size && <span>{size}</span>}
        {size && source.mime_type && <span aria-hidden>·</span>}
        {source.mime_type && <span>{source.mime_type}</span>}
      </div>

      {source.validation_note && (
        <p className="text-muted-foreground text-xs">{source.validation_note}</p>
      )}
    </li>
  );
}

async function MatchUploadStatusContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ youtubeWarning?: string }>;
}) {
  // Wait for connection before reading request-time APIs
  await connection();

  const { id } = await params;
  const { youtubeWarning } = await searchParams;

  let match: MatchV2;
  try {
    match = await getMatchV2(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <ErrorState
          title="No pudimos cargar el estado del partido"
          description={describeBackendError(error, "el estado del partido")}
          retryHref={`/partidos/${encodeURIComponent(id)}/carga`}
        />
      </div>
    );
  }

  const gdriveSources = match.sources.filter(
    (source) => source.provider === "gdrive",
  );
  const failed = match.calibration_status === "failed";
  // Solo se relanza lo que se puede volver a bajar: una fuente local no tiene
  // token de Drive que renovar.
  const canRetry = failed && gdriveSources.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge variant={failed ? "destructive" : "outline"}>
            {failed ? "El procesamiento falló" : "Pendiente de procesamiento"}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            {failed ? "El procesamiento no terminó" : "Carga registrada"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Partido <span className="font-mono">{match.match_id}</span>.{" "}
            {failed
              ? "El video sigue en tu Drive: se puede relanzar sin volver a cargar el formulario."
              : "El video quedó vinculado; falta que el job de procesamiento lo analice."}
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/partidos" />}
        >
          Volver a partidos
        </Button>
      </div>

      {failed && (
        <Alert variant="destructive">
          <AlertTitle>El run se cortó</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              {match.calibration_note ??
                "El job de Kaggle no pudo terminar el procesamiento."}
            </span>
            {canRetry && <RetryDownloadButton matchId={match.match_id} />}
          </AlertDescription>
        </Alert>
      )}

      {youtubeWarning && (
        <Alert>
          <AlertTitle>Link de YouTube no validado</AlertTitle>
          <AlertDescription>
            El partido y el video de Drive quedaron registrados, pero no pudimos
            validar el link de YouTube. El procesamiento no se ve afectado: el
            link solo se usa para abrir clips de sprints.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Video de origen</CardTitle>
          <CardDescription>
            Nunca subimos el video: el job lo descarga una vez desde Drive y
            trabaja sobre una copia temporal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {match.sources.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                No hay ninguna fuente de video registrada para este partido.
              </p>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/partidos/nuevo" />}
              >
                Volver a cargar el partido
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {match.sources.map((source) => (
                <SourceItem key={source.id} source={source} />
              ))}
            </ul>
          )}
          {gdriveSources.length === 0 && match.sources.length > 0 && (
            <p className="text-muted-foreground mt-3 text-xs">
              Este partido no tiene un video de Google Drive; solo fuentes
              locales.
            </p>
          )}
        </CardContent>
      </Card>

      {match.youtube_url && (
        <Card>
          <CardHeader>
            <CardTitle>Link de YouTube</CardTitle>
            <CardDescription>
              Referencia para abrir los clips de sprints. No se descarga ni se
              procesa desde YouTube.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <a
              href={match.youtube_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary break-all text-sm underline underline-offset-4"
            >
              {match.youtube_url}
            </a>
            {match.youtube_match_start_sec !== null && (
              <p className="text-muted-foreground text-xs">
                Kickoff en YouTube:{" "}
                {formatKickoff(match.youtube_match_start_sec)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Qué sigue</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-muted-foreground flex list-decimal flex-col gap-2 pl-5 text-sm">
            <li>El job de Kaggle descarga el video desde Drive.</li>
            <li>
              Corre detección, tracking y métricas físicas por jugador.
            </li>
            <li>
              Publica el read-model normalizado en la base v2, junto con los
              heatmaps.
            </li>
          </ol>
          <p className="text-muted-foreground mt-4 text-xs">
            El procesamiento corre fuera de esta web. Podés cerrar la página:
            cuando termine, el partido va a estar disponible en la base.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<Link href="/partidos/nuevo" />}>
          Cargar otro partido
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/partidos" />}
        >
          Ver partidos
        </Button>
      </div>
    </div>
  );
}

export default async function MatchUploadStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ youtubeWarning?: string }>;
}) {
  return (
    <Suspense fallback={<MatchUploadStatusSkeleton />}>
      <MatchUploadStatusContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function MatchUploadStatusSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
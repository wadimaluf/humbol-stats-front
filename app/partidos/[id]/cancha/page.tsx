import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { AssetImage } from "@/components/app/asset-image";
import { ErrorState, PageSkeleton } from "@/components/app/data-states";
import { BackendError, getCalibration } from "@/lib/api";
import { describeBackendError } from "@/lib/errors";
import { describeCalibrationLabel } from "@/lib/format";
import type { Calibration } from "@/lib/types";

export default function CourtPage(props: PageProps<"/partidos/[id]/cancha">) {
  return (
    <Suspense fallback={<CourtSkeleton />}>
      <CourtContent params={props.params} />
    </Suspense>
  );
}

async function CourtContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let calibration: Calibration;
  try {
    calibration = await getCalibration(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <MatchSteps matchId={id} current={0} />
        <ErrorState
          title="No se pudo cargar la cancha"
          description={describeBackendError(
            error,
            "la calibración de la cancha",
          )}
          retryHref={`/partidos/${id}/cancha`}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <MatchSteps matchId={id} current={0} />

      <h1 className="text-2xl font-semibold tracking-tight">
        Verificar la cancha
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Región de interés (ROI)</CardTitle>
          <CardDescription>
            El backend extrajo un frame con la cancha detectada. Validá que el
            recorte cubra la cancha completa; en versiones futuras vas a poder
            ajustar los puntos de calibración manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="w-full max-w-3xl flex flex-col items-center gap-4">
            <AssetImage
              src={calibration.pitchImageUrl}
              alt="Frame de control de la cancha"
              className="w-full max-w-[800px] h-auto rounded-lg border"
              fallback={
                <div className="flex aspect-video w-full max-w-[800px] items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
                  Imagen de cancha no disponible para este partido
                </div>
              }
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                Estado:{" "}
                {describeCalibrationLabel(
                  calibration.status,
                  calibration.approved,
                )}
              </span>
              {calibration.rmsM != null && (
                <span>Error RMS: {calibration.rmsM} m</span>
              )}
              {calibration.outOfPitchPct != null && (
                <span>
                  Fuera de cancha: {calibration.outOfPitchPct}%
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/partidos/${id}/cancha?edit=1`} />}
            >
              Ajustar puntos
            </Button>
            <Button
              nativeButton={false}
              render={<Link href={`/partidos/${id}/roster`} />}
            >
              Confirmar y continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CourtSkeleton() {
  return (
    <PageSkeleton maxWidth="max-w-5xl">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-96 w-full max-w-3xl" />
    </PageSkeleton>
  );
}

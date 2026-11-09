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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { AssetImage } from "@/components/app/asset-image";
import { BackendError, getCalibration } from "@/lib/api";
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

  let calibration: Calibration | null;
  try {
    calibration = await getCalibration(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    calibration = null;
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
          {calibration ? (
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
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  Estado:{" "}
                  {calibration.approved ? "Aprobada" : "Pendiente de revisión"}
                  <span className="text-xs font-normal ml-1 opacity-70">
                    ({calibration.status})
                  </span>
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
          ) : (
            <Alert>
              <AlertTitle>No se pudo cargar la calibración</AlertTitle>
              <AlertDescription>
                No hay datos de calibración disponibles para este partido.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button variant="outline" render={<Link href={`/partidos/${id}/cancha?edit=1`} />}>
              Ajustar puntos
            </Button>
            <Button render={<Link href={`/partidos/${id}/roster`} />}>
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-96 w-full max-w-3xl" />
    </div>
  );
}

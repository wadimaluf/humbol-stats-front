import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchSteps } from "@/components/app/match-steps";
import { isBackendConfigured } from "@/lib/api";

export default function CourtPage(props: PageProps<"/partidos/[id]/cancha">) {
  return (
    <Suspense fallback={<CourtSkeleton />}>
      <CourtContent params={props.params} />
    </Suspense>
  );
}

async function CourtContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendConfigured = isBackendConfigured();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <MatchSteps matchId={id} current={0} />

      <h1 className="text-2xl font-semibold tracking-tight">Verificar la cancha</h1>

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
          {backendConfigured ? (
            <div className="w-full max-w-3xl">
              {/* Backend asset: court thumbnail extracted from a frame */}
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
                Cargando thumbnail de la cancha desde el backend…
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTitle>Backend no configurado</AlertTitle>
              <AlertDescription>
                Configurá la variable <code>BACKEND_URL</code> para ver el
                thumbnail de la cancha generado por el motor de procesamiento.
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

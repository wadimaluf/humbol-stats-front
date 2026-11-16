"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseDriveFileId } from "@/lib/drive";
import { isYouTubeUrl } from "@/lib/youtube";
import { parseKickoff } from "@/lib/kickoff";

const MATCH_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Step 1: register a match from a Google Drive link + kickoff mark.
 * YouTube is optional and reference-only (clip deep links); no video is
 * uploaded to our servers.
 */
export function UploadForm({ defaultMatchId }: { defaultMatchId: string }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState(defaultMatchId);
  const [driveUrl, setDriveUrl] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!MATCH_ID_PATTERN.test(matchId.trim())) {
      setError(
        "El identificador no es válido. Usá solo letras, números, guiones o guiones bajos.",
      );
      return;
    }
    if (!parseDriveFileId(driveUrl)) {
      setError(
        "El link de Drive no es válido. Pegá el enlace de un archivo compartido de Google Drive.",
      );
      return;
    }
    if (parseKickoff(kickoff) === null) {
      setError("El kickoff debe tener el formato mm:ss (por ejemplo 05:30).");
      return;
    }
    if (youtubeUrl.trim()) {
      if (!isYouTubeUrl(youtubeUrl.trim())) {
        setError("El link de YouTube no es válido. Usá un enlace de youtube.com o youtu.be.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: matchId.trim(),
          driveUrl: driveUrl.trim(),
          kickoff: kickoff.trim(),
          youtubeUrl: youtubeUrl.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        matchId?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Error al registrar el partido (${res.status})`);
      }
      if (!data.matchId) {
        throw new Error("La API no devolvió el identificador del partido.");
      }
      router.push(`/partidos/${encodeURIComponent(data.matchId)}/carga`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Cargar partido</CardTitle>
        <CardDescription>
          Pegá el link de Google Drive con el video del partido y marcá dónde
          arranca el kickoff. El video no se sube: el procesamiento lo descarga
          desde tu Drive.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="matchId">Identificador del partido</Label>
            <Input
              id="matchId"
              required
              pattern="[A-Za-z0-9_\-]+"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              disabled={submitting}
            />
            <p className="text-muted-foreground text-xs">
              Por defecto es la fecha en formato YYYYMMDD. Si ya existe un
              partido ese día, agregá un sufijo: 20261114-b.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="driveUrl">Link de Google Drive</Label>
            <Input
              id="driveUrl"
              type="url"
              required
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              disabled={submitting}
            />
            <p className="text-muted-foreground text-xs">
              El archivo tiene que estar compartido con cualquiera que tenga el
              link. Lo validamos al registrarlo.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="kickoff">Kickoff en el video (mm:ss)</Label>
            <Input
              id="kickoff"
              required
              pattern="\d{1,3}:\d{2}"
              inputMode="numeric"
              placeholder="05:30"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              disabled={submitting}
            />
            <p className="text-muted-foreground text-xs">
              Segundo dentro del video donde arranca el partido. Si el video
              tiene una intro, sumala acá.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="youtubeUrl">Link de YouTube (opcional)</Label>
            <Input
              id="youtubeUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={submitting}
            />
            <p className="text-muted-foreground text-xs">
              Solo se usa para enlazar los clips de los sprints. Nunca se
              descarga ni se procesa desde YouTube.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Registrando…" : "Registrar partido"}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            No almacenamos el video. El job de procesamiento lo descarga una vez
            desde Drive y sube solo las estadísticas y las imágenes derivadas.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

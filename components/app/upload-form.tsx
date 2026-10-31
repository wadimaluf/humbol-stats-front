"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "idle" | "uploading" | "error";

/** Step 1 of the flow: upload a match (MP4 or YouTube link) + kickoff mark. */
export function UploadForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [kickoffTimestamp, setKickoffTimestamp] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!videoFile && !youtubeUrl) {
      setError("Ingresá un link de YouTube o subí un archivo de video");
      return;
    }
    setStep("uploading");
    setError(null);

    const form = new FormData();
    if (videoFile) form.append("video", videoFile);
    if (youtubeUrl) form.append("youtubeUrl", youtubeUrl);
    form.append("kickoffTimestamp", kickoffTimestamp);

    try {
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir el partido");
      router.push(`/partidos/${encodeURIComponent(data.matchId)}/cancha`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setStep("error");
    }
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Subir partido</CardTitle>
        <CardDescription>
          Elegí un video MP4 o pegá un link de YouTube, e indicá dónde arranca el
          partido dentro del video (kickoff).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="youtubeUrl">Link de YouTube (opcional)</Label>
            <Input
              id="youtubeUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={step === "uploading" || videoFile !== null}
            />
          </div>

          <p className="text-muted-foreground text-center text-sm text-muted-foreground">— o —</p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="video">Archivo de video (opcional)</Label>
            <Input
              id="video"
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              disabled={step === "uploading" || youtubeUrl.length > 0}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="kickoff">Kickoff en el video (mm:ss)</Label>
            <Input
              id="kickoff"
              required
              pattern="\d{1,3}:\d{2}"
              placeholder="ej. 05:30"
              value={kickoffTimestamp}
              onChange={(e) => setKickoffTimestamp(e.target.value)}
              disabled={step === "uploading"}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={step === "uploading"}>
            {step === "uploading" ? "Subiendo…" : "Procesar partido"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

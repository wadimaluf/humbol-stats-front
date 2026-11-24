"use client";

import { useState } from "react";
import { DriveFolderPicker } from "@/components/app/DriveFolderPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDriveToken } from "@/lib/google-drive";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface DriveFolder {
  id: string;
  url: string;
}

// El token dura una hora y lo usa el kernel de Kaggle cuando arranca (cola
// incluida), así que al enviar pedimos uno con casi toda su vida por delante.
const TOKEN_TTL_FOR_SUBMIT_MS = 50 * 60 * 1000;

export default function NuevoPartidoPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  const [folder, setFolder] = useState<DriveFolder | null>(null);
  const [matchName, setMatchName] = useState("");
  const [trimStart, setTrimStart] = useState("0");
  const [trimEndInLast, setTrimEndInLast] = useState("");
  const [calibration, setCalibration] = useState<"auto" | "fixed" | "landmarks">("auto");
  const [status, setStatus] = useState<"idle" | "authorizing" | "creating" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [matchId, setMatchId] = useState<string | null>(null);
  const busy = status === "authorizing" || status === "creating";

  const handleFolderSelect = (id: string, url: string) => {
    setFolder({ id, url });
    setStatus("idle");
    setMessage("");
  };

  const handleCreate = async () => {
    if (!folder) {
      setStatus("error");
      setMessage("Primero seleccioná una carpeta de Drive");
      return;
    }
    if (!matchName.trim()) {
      setStatus("error");
      setMessage("Poné un nombre al partido");
      return;
    }
    if (!clientId) {
      setStatus("error");
      setMessage("Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en el front.");
      return;
    }

    setStatus("authorizing");
    setMessage("Renovando el permiso de Google Drive…");

    // El token se emite acá, no cuando se eligió la carpeta: si el operador
    // tardó en completar el formulario, el token de la selección ya es viejo.
    let token: string;
    try {
      token = await getDriveToken(clientId, {
        minRemainingMs: TOKEN_TTL_FOR_SUBMIT_MS,
      });
    } catch (err: any) {
      setStatus("error");
      setMessage(
        err?.message ??
          "No pudimos obtener permiso para leer la carpeta de Drive. Reintentá.",
      );
      return;
    }

    setStatus("creating");
    setMessage("Creando partido y disparando procesamiento…");

    try {
      const res = await fetch("/v2/matches/from-drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: matchName.trim(),
          drive_folder_id: folder.id,
          drive_folder_url: folder.url,
          trim_start: trimStart.trim() || "0",
          trim_end_in_last: trimEndInLast.trim() || undefined,
          calibration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail?.message || data.detail || `HTTP ${res.status}`);
      }

      setMatchId(data.match_id);
      setStatus("success");
      setMessage(`Partido creado: ${data.match_id}. Procesamiento iniciado en Kaggle.`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Error desconocido");
    }
  };

  if (!clientId || !apiKey || !appId) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Faltan credenciales de Google</h2>
        <p className="text-muted-foreground mt-2">
          Configurá <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>,{" "}
          <code>NEXT_PUBLIC_GOOGLE_API_KEY</code> y{" "}
          <code>NEXT_PUBLIC_GOOGLE_APP_ID</code> en <code>.env.local</code> y
          reiniciá el servidor.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo partido desde Google Drive</h1>
        <p className="text-muted-foreground mt-1">
          Seleccioná la carpeta con los videos, poné un nombre y dispará el procesamiento en la nube.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Carpeta de videos en Drive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DriveFolderPicker
            onFolderSelected={handleFolderSelect}
            clientId={clientId}
            developerKey={apiKey}
            appId={appId}
            disabled={busy}
          />
          {folder && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Carpeta seleccionada</span>
              </div>
              <p className="text-sm text-green-600 break-all">{folder.url}</p>
              <p className="text-xs text-green-500">ID: {folder.id}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Nombre del partido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="ej: vs River 2025-06-15"
            value={matchName}
            onChange={(e) => setMatchName(e.target.value)}
            disabled={status === "creating"}
            className="max-w-md"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                Inicio del partido (en el primer video)
              </label>
              <Input
                placeholder="00:03:30"
                value={trimStart}
                onChange={(e) => setTrimStart(e.target.value)}
                disabled={status === "creating"}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Segundos o HH:MM:SS desde el arranque de la primera grabación.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Final del partido (en el último video)
              </label>
              <Input
                placeholder="00:14:45"
                value={trimEndInLast}
                onChange={(e) => setTrimEndInLast(e.target.value)}
                disabled={status === "creating"}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Segundos o HH:MM:SS desde el arranque de la última grabación.
                Vacío = hasta el final.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Calibración de la cancha
            </label>
            <select
              value={calibration}
              onChange={(e) => setCalibration(e.target.value as "auto" | "fixed" | "landmarks")}
              disabled={status === "creating"}
              className="max-w-xs border rounded px-2 py-1"
            >
              <option value="auto">
                Automática (transferir la referencia y validar contra líneas pintadas)
              </option>
              <option value="fixed">
                Fija (reutilizar la homografía/ROI de 2025-06-10)
              </option>
              <option value="landmarks">
                Manual (clicks en la UI — pendiente)
              </option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Cada fecha cambia el encuadre. <code>auto</code> registra la imagen
              contra la referencia validada (SIFT en estructura estática) y pasa el
              gate de líneas pintadas. <code>fixed</code> solo sirve si la cámara
              está exactamente en la misma posición.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleCreate}
        disabled={busy || !folder || !matchName.trim()}
        className="w-full"
        size="lg"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {status === "authorizing" ? "Autorizando Drive…" : "Creando y procesando…"}
          </>
        ) : (
          "🚀 Crear partido y procesar en Kaggle"
        )}
      </Button>

      {(status === "success" || status === "error") && (
        <Alert variant={status === "success" ? "default" : "destructive"} className="mt-4">
          <AlertDescription className="flex items-start gap-2">
            {status === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div>{message}</div>
          </AlertDescription>
        </Alert>
      )}

      {matchId && status === "success" && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="font-medium">Partido creado: <code>{matchId}</code></p>
          <p className="text-sm text-blue-700">
            El procesamiento corre en Kaggle. Los assets (heatmaps, roster, cancha) aparecerán
            automáticamente en la página del partido cuando terminen.
          </p>
          <a
            href={`/partidos/${matchId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            Ver partido →
          </a>
        </div>
      )}
    </div>
  );
}
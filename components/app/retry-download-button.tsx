"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDriveToken } from "@/lib/google-drive";

// El kernel puede esperar en la cola de Kaggle, así que el token tiene que
// arrancar con casi toda su vida: no lo reutilizamos si ya lleva un rato.
const TOKEN_TTL_FOR_RETRY_MS = 50 * 60 * 1000;

/**
 * Relanza un partido que falló sin pedir el formulario de nuevo.
 *
 * El backend guarda la carpeta, los trims y el modo de calibración; lo único
 * que falta es un token de Drive fresco, que Google emite en silencio porque
 * el usuario ya dio el consentimiento.
 */
export function RetryDownloadButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!clientId) {
      setError("Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en el front.");
      return;
    }

    setWorking(true);
    setError(null);
    try {
      const token = await getDriveToken(clientId, {
        minRemainingMs: TOKEN_TTL_FOR_RETRY_MS,
      });

      const response = await fetch(
        `/v2/matches/${encodeURIComponent(matchId)}/retry-download`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          (body as { detail?: string } | null)?.detail ?? `HTTP ${response.status}`,
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos relanzar el procesamiento.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={working} className="self-start">
        {working ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Relanzando…
          </>
        ) : (
          <>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reintentar descarga y procesamiento
          </>
        )}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

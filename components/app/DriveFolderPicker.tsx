"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface DriveFolderPickerProps {
  onFolderSelected: (folderId: string, folderUrl: string, accessToken: string) => void;
  clientId: string;
  developerKey: string;
  appId: string;
  disabled?: boolean;
}

/**
 * Selector de carpeta de Google Drive con Google Identity Services + Picker.
 *
 * Las credenciales NO dan acceso a ningún Drive: identifican a esta app frente
 * a Google. El acceso concreto lo concede cada usuario en el consentimiento y
 * vive en su `access_token`, que viaja al backend y nunca se persiste.
 */
export function DriveFolderPicker({
  onFolderSelected,
  clientId,
  developerKey,
  appId,
  disabled = false,
}: DriveFolderPickerProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenClient = useRef<any>(null);
  const accessToken = useRef<{ value: string; expiresAt: number } | null>(null);

  useEffect(() => {
    if (!clientId || !developerKey || !appId) {
      setError("Faltan credenciales de Google (clientId, API key o project number)");
      return;
    }

    let cancelled = false;
    const loaded: Record<string, boolean> = { picker: false, gis: false };

    const markLoaded = () => {
      if (!cancelled && loaded.picker && loaded.gis) setReady(true);
    };

    // google.picker vive en el loader de APIs de Google.
    const apiScript = document.createElement("script");
    apiScript.src = "https://apis.google.com/js/api.js";
    apiScript.async = true;
    apiScript.onload = () => {
      window.gapi.load("picker", () => {
        loaded.picker = true;
        markLoaded();
      });
    };
    apiScript.onerror = () => setError("No se pudo cargar Google Picker");

    // google.accounts.oauth2 es la librería vigente (gapi.auth2 está retirada).
    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.async = true;
    gisScript.onload = () => {
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: () => {},
      });
      loaded.gis = true;
      markLoaded();
    };
    gisScript.onerror = () => setError("No se pudo cargar Google Sign-In");

    document.head.appendChild(apiScript);
    document.head.appendChild(gisScript);

    return () => {
      cancelled = true;
      apiScript.remove();
      gisScript.remove();
    };
  }, [clientId, developerKey, appId]);

  const showPicker = useCallback(
    (token: string) => {
      try {
        const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true)
          .setIncludeFolders(true)
          .setMode(window.google.picker.DocsViewMode.LIST);

        const picker = new window.google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(token)
          .setDeveloperKey(developerKey)
          .setAppId(appId)
          .setTitle("Seleccioná la carpeta con los videos del partido")
          .setCallback((data: any) => {
            if (data.action !== window.google.picker.Action.PICKED) return;
            const doc = data.docs?.[0];
            if (!doc?.id) return;
            onFolderSelected(
              doc.id,
              `https://drive.google.com/drive/folders/${doc.id}`,
              token,
            );
          })
          .build();

        picker.setVisible(true);
      } catch (err) {
        console.error("Picker error:", err);
        setError("No se pudo abrir el selector de Drive");
      }
    },
    [appId, developerKey, onFolderSelected],
  );

  const requestToken = useCallback(
    (prompt: "consent" | "") => {
      const client = tokenClient.current;
      if (!client) return;
      client.callback = (response: any) => {
        if (response.error) {
          setError(`Google rechazó el acceso: ${response.error}`);
          return;
        }
        const ttl = Number(response.expires_in ?? 3600);
        accessToken.current = {
          value: response.access_token,
          expiresAt: Date.now() + (ttl - 60) * 1000,
        };
        showPicker(response.access_token);
      };
      client.requestAccessToken({ prompt });
    },
    [showPicker],
  );

  const handleClick = useCallback(() => {
    setError(null);
    const cached = accessToken.current;
    if (cached && cached.expiresAt > Date.now()) {
      showPicker(cached.value);
      return;
    }
    // Primer uso: consentimiento explícito. Siguientes: silencioso.
    requestToken(accessToken.current ? "" : "consent");
  }, [requestToken, showPicker]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!ready) {
    return (
      <button type="button" disabled className="btn btn-secondary w-full">
        Cargando Google Drive…
      </button>
    );
  }

  return (
    <button type="button" onClick={handleClick} disabled={disabled} className="btn btn-primary w-full">
      📁 Seleccionar carpeta de Google Drive
    </button>
  );
}
"use client";

import { useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface DriveFolderPickerProps {
  onFolderSelected: (folderId: string, folderUrl: string, accessToken: string) => void;
  clientId: string;
  apiKey: string;
  developerKey: string;
  disabled?: boolean;
}

export function DriveFolderPicker({
  onFolderSelected,
  clientId,
  apiKey,
  developerKey,
  disabled = false,
}: DriveFolderPickerProps) {
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !apiKey || !developerKey) {
      setError("Faltan credenciales de Google (clientId, apiKey, developerKey)");
      return;
    }

    // Cargar gapi script
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load("client:auth2:picker", initGapi);
    };
    script.onerror = () => setError("No se pudo cargar la API de Google");
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      window.gapi?.auth2?.getAuthInstance()?.disconnect();
    };
  }, [clientId, apiKey, developerKey]);

  const initGapi = useCallback(async () => {
    try {
      await window.gapi.client.init({
        apiKey,
        clientId,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        scope: "https://www.googleapis.com/auth/drive.readonly",
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      setSignedIn(authInstance.isSignedIn.get());

      authInstance.isSignedIn.listen(setSignedIn);
      setLoaded(true);
    } catch (err) {
      console.error("GAPI init error:", err);
      setError("Error al inicializar Google API");
    }
  }, [apiKey, clientId]);

  const signIn = useCallback(async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signIn({ scope: "https://www.googleapis.com/auth/drive.readonly" });
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Error al iniciar sesión");
    }
  }, []);

  const openPicker = useCallback(() => {
    if (!loaded) return;

    const authInstance = window.gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      signIn().then(showPicker);
      return;
    }
    showPicker();
  }, [loaded, signIn]);

  const showPicker = useCallback(() => {
    try {
      const token = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

      const picker = new window.google.picker.PickerBuilder()
        .addView(
          new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
            .setSelectFolderEnabled(true)
            .setIncludeFolders(true)
            .setMode(window.google.picker.DocsViewMode.LIST)
        )
        .setOAuthToken(token)
        .setDeveloperKey(developerKey)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs.length > 0) {
            const doc = data.docs[0];
            const folderId = doc.id;
            const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
            onFolderSelected(folderId, folderUrl, token);
          }
        })
        .setTitle("Seleccioná la carpeta con los videos del partido")
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error("Picker error:", err);
      setError("Error al abrir el selector de Drive");
    }
  }, [developerKey, onFolderSelected]);

  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  if (!loaded) return <button disabled className="btn btn-secondary">Cargando Drive…</button>;

  return (
    <button
      type="button"
      onClick={openPicker}
      disabled={disabled}
      className="btn btn-primary w-full"
    >
      {signedIn ? "📁 Seleccionar carpeta de Google Drive" : "🔐 Conectar con Google Drive"}
    </button>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";

import { getDriveToken, loadDrivePicker } from "@/lib/google-drive";

type PickerData = {
  action?: string;
  docs?: Array<{ id?: string }>;
};

interface DriveFolderPickerProps {
  onFolderSelected: (folderId: string, folderUrl: string) => void;
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

  useEffect(() => {
    if (!clientId || !developerKey || !appId) {
      setError("Faltan credenciales de Google (clientId, API key o project number)");
      return;
    }

    let cancelled = false;
    loadDrivePicker()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar Google Picker");
      });

    return () => {
      cancelled = true;
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
          .setCallback((data: PickerData) => {
            if (data.action !== window.google.picker.Action.PICKED) return;
            const doc = data.docs?.[0];
            if (!doc?.id) return;
            onFolderSelected(doc.id, `https://drive.google.com/drive/folders/${doc.id}`);
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

  const getToken = useCallback(
    () => getDriveToken(clientId, { minRemainingMs: 10 * 60 * 1000 }),
    [clientId],
  );

  const handleClick = useCallback(async () => {
    setError(null);
    try {
      showPicker(await getToken());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos autorizar Drive");
    }
  }, [getToken, showPicker]);

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

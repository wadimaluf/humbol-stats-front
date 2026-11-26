"use client";

// Google Drive access for the browser.
//
// The app never receives a refresh token: Google Identity Services hands out a
// one-hour access token and nothing else. That means the token has to be
// minted as late as possible — right before the request that uses it — instead
// of when the operator picks the folder ten minutes earlier.
//
// The module keeps a single token client for the whole tab so a renewed token
// never opens the consent screen again (unless Google revoked the grant).

/* eslint-disable @typescript-eslint/no-explicit-any -- Google's JS libs ship no types. */
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

/** Google's answer was not a token: the caller has to tell the user to retry. */
export class DriveAuthError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "DriveAuthError";
    this.code = code;
  }
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
};

/** The slice of `google.accounts.oauth2.TokenClient` this module uses. */
type TokenClient = {
  callback: (response: TokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
};

let tokenClient: TokenClient | null = null;
let tokenClientId: string | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;
let inFlight: Promise<string> | null = null;

const scriptPromises = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const pending = scriptPromises.get(src);
  if (pending) return pending;

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // A failed load must be retried on the next click, not remembered.
      scriptPromises.delete(src);
      reject(new Error(`No se pudo cargar ${src}`));
    };
    document.head.appendChild(script);
  });

  scriptPromises.set(src, load);
  return load;
}

/** Loads `google.picker` (the Drive folder chooser). */
export function loadDrivePicker(): Promise<void> {
  return loadScript(GAPI_SRC).then(
    () =>
      new Promise<void>((resolve) => {
        window.gapi.load("picker", () => resolve());
      }),
  );
}

/**
 * Returns the token client only if GIS is already loaded, without awaiting.
 *
 * `requestAccessToken` opens a window, and browsers only allow that inside the
 * click handler: awaiting anything first loses the gesture and the popup gets
 * blocked. Components call `preloadDriveAuth` on mount so this hits.
 */
function tokenClientIfReady(clientId: string): TokenClient | null {
  if (!window.google?.accounts?.oauth2) return null;
  if (!tokenClient || tokenClientId !== clientId) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: () => {},
    }) as TokenClient;
    tokenClientId = clientId;
    cachedToken = null;
  }
  return tokenClient;
}

/** Loads Google Identity Services ahead of the click that needs it. */
export function preloadDriveAuth(): Promise<void> {
  return loadScript(GIS_SRC);
}

async function getTokenClient(clientId: string): Promise<TokenClient> {
  await loadScript(GIS_SRC);
  if (!tokenClient || tokenClientId !== clientId) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: () => {},
    }) as TokenClient;
    tokenClientId = clientId;
    cachedToken = null;
  }
  return tokenClient;
}

function requestAccessToken(
  client: TokenClient,
  prompt: "consent" | "",
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    client.callback = (response: TokenResponse) => {
      if (response?.error) {
        reject(toAuthError(response.error));
        return;
      }
      if (!response?.access_token) {
        reject(new DriveAuthError("Google no devolvió un token de acceso."));
        return;
      }
      const ttl = Number(response.expires_in ?? 3600);
      cachedToken = {
        value: response.access_token,
        // Keep a two-minute safety margin: a token that expires mid-download
        // fails the whole run.
        expiresAt: Date.now() + Math.max(ttl - 120, 60) * 1000,
      };
      resolve(response.access_token);
    };

    try {
      client.requestAccessToken({ prompt });
    } catch (err) {
      reject(
        new DriveAuthError(
          err instanceof Error
            ? err.message
            : "Google no pudo iniciar la autorización.",
        ),
      );
    }
  });
}

function toAuthError(code: string): DriveAuthError {
  switch (code) {
    case "access_denied":
      return new DriveAuthError(
        "Google rechazó el permiso de lectura de Drive. Necesitamos ese permiso para bajar los videos.",
        code,
      );
    case "popup_closed_by_user":
    case "popup_closed":
      return new DriveAuthError(
        "Se cerró la ventana de Google antes de autorizar el acceso a Drive.",
        code,
      );
    case "popup_blocked_by_browser":
    case "popup_failed_to_open":
      return new DriveAuthError(
        "El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio y reintentá.",
        code,
      );
    case "interaction_required":
      return new DriveAuthError(
        "Google pide que autorices el acceso a Drive de nuevo. Reintentá y completá la ventana de Google.",
        code,
      );
    default:
      return new DriveAuthError(`Google rechazó el acceso: ${code}`, code);
  }
}

async function requestTokenWith(client: TokenClient): Promise<string> {
  try {
    return await requestAccessToken(client, "");
  } catch (err) {
    // Only a silent failure that Google says needs interaction is retried with
    // the consent screen; a closed popup must not be reopened behind the user.
    if (err instanceof DriveAuthError && err.code === "interaction_required") {
      return requestAccessToken(client, "consent");
    }
    throw err;
  }
}

async function requestToken(clientId: string): Promise<string> {
  return requestTokenWith(await getTokenClient(clientId));
}

/**
 * Returns a Drive access token, minted fresh when the cached one is too close
 * to expiring.
 *
 * @param minRemainingMs how much life the token must have left to be reused.
 *   Pass ~50 minutes before submitting a match (the token is used by a queued
 *   Kaggle run) and ~10 minutes to open the folder picker.
 */
export function getDriveToken(
  clientId: string,
  options: { minRemainingMs?: number } = {},
): Promise<string> {
  if (!clientId) {
    return Promise.reject(
      new DriveAuthError("Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en el front."),
    );
  }

  const minRemainingMs = options.minRemainingMs ?? 10 * 60 * 1000;
  if (cachedToken && cachedToken.expiresAt - Date.now() >= minRemainingMs) {
    return Promise.resolve(cachedToken.value);
  }
  if (inFlight) return inFlight;

  // Order matters: if GIS is loaded (the normal case after preload), the token
  // request starts synchronously inside the click gesture.
  const ready = tokenClientIfReady(clientId);
  const request = (ready ? requestTokenWith(ready) : requestToken(clientId)).finally(
    () => {
      inFlight = null;
    },
  );
  inFlight = request;
  return request;
}

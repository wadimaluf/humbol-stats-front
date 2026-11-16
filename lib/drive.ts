/** Google Drive share-link helpers shared by the form and its route. */

const DRIVE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
]);

const FILE_PATH_RE = /^\/file\/d\/([A-Za-z0-9_-]{10,})(?:\/|$)/;
const FILE_ID_RE = /^[A-Za-z0-9_-]{10,}$/;

/** Extract the file id from a Drive share link, or null if it is not one. */
export function parseDriveFileId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!DRIVE_HOSTS.has(url.hostname.toLowerCase())) return null;

  const pathMatch = FILE_PATH_RE.exec(url.pathname);
  if (pathMatch) return pathMatch[1];

  const id = url.searchParams.get("id");
  return id && FILE_ID_RE.test(id) ? id : null;
}

/** YouTube URL helpers shared by the form and its route. */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const YOUTUBE_WATCH_PATH_RE = /^\/watch$/;
const YOUTUBE_SHORTS_PATH_RE = /^\/shorts\/([A-Za-z0-9_-]{11})(?:\/|$)/;
const YOUTUBE_EMBED_PATH_RE = /^\/embed\/([A-Za-z0-9_-]{11})(?:\/|$)/;
const YOUTUBE_LIVE_PATH_RE = /^\/live\/([A-Za-z0-9_-]{11})(?:\/|$)/;
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extract the 11-char video id from a YouTube URL, or null if not a YouTube URL. */
export function parseYouTubeVideoId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

  // youtu.be/<id>
  if (url.hostname === "youtu.be") {
    const candidate = url.pathname.slice(1).split("/")[0];
    return candidate && YOUTUBE_ID_RE.test(candidate) ? candidate : null;
  }

  // youtube.com/watch?v=<id>
  if (YOUTUBE_WATCH_PATH_RE.test(url.pathname)) {
    const v = url.searchParams.get("v");
    return v && YOUTUBE_ID_RE.test(v) ? v : null;
  }

  // youtube.com/shorts/<id>
  const shortsMatch = YOUTUBE_SHORTS_PATH_RE.exec(url.pathname);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/embed/<id>
  const embedMatch = YOUTUBE_EMBED_PATH_RE.exec(url.pathname);
  if (embedMatch) return embedMatch[1];

  // youtube.com/live/<id>
  const liveMatch = YOUTUBE_LIVE_PATH_RE.exec(url.pathname);
  if (liveMatch) return liveMatch[1];

  return null;
}

/** Validate that a string is a YouTube URL (not just any URL). */
export function isYouTubeUrl(value: string): boolean {
  return parseYouTubeVideoId(value) !== null;
}
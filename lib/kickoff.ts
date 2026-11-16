/** "mm:ss" parsing/formatting shared by the upload form and its route. */

/** Parse "mm:ss" (minutes 0-999, seconds 00-59) into seconds. */
export function parseKickoff(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Format seconds as "mm:ss" for display (minutes may exceed 99). */
export function formatKickoff(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

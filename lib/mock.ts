import type { MatchSummary, PlayerStats, RosterEntry, SprintEvent } from "@/lib/types";

// Sample data mirroring the backend outputs (player_stats.csv, sprint_events.csv,
// roster.csv). Marked as MOCK so real API calls can replace them per-view.

export const MOCK_MATCH_ID = "demo";

export function mockMatchSummary(matchId: string): MatchSummary {
  return {
    matchId,
    title: matchId === MOCK_MATCH_ID ? "Partido de ejemplo" : `Partido ${matchId}`,
    kickoffTimestamp: "05:30",
    date: "2026-10-31",
  };
}

export function mockPlayerStats(): PlayerStats[] {
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return {
      id: `P${String(n).padStart(2, "0")}`,
      team: n <= 5 ? "A" : "B",
      minutesPlayed: 40 + ((n * 7) % 6),
      distanceKm: Math.round((3 + ((n * 13) % 25) / 10) * 10) / 10,
      avgSpeedKmh: Math.round((4.2 + ((n * 11) % 22) / 10) * 10) / 10,
      maxSpeedKmh: Math.round((17 + ((n * 17) % 60) / 10) * 10) / 10,
      sprints: 2 + ((n * 3) % 8),
      coveragePct: 15 + ((n * 4) % 20),
    };
  });
}

export function mockSprintEvents(): SprintEvent[] {
  const players = ["01", "03", "05", "07"];
  return players.flatMap((pid, pi) =>
    Array.from({ length: 2 }, (_, si) => {
      const minutes = 8 + pi * 9 + si * 4;
      return {
        id: `P${pid}`,
        startTimestamp: `${minutes}:${String((pi * 17 + si * 23) % 60).padStart(2, "0")}`,
        durationSec: 8 + ((pi + si) % 12),
        maxSpeedKmh: Math.round((18 + (pi * 3 + si) * 1.1) * 10) / 10,
        youtubeUrl: `https://www.youtube.com/watch?v=demo&t=${minutes * 60 + ((pi * 17 + si * 23) % 60)}s`,
      };
    }),
  );
}

export function mockRoster(): RosterEntry[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `P${String(i + 1).padStart(2, "0")}`,
    thumbnailUrl: "",
    team: i % 2 === 0 ? "A" : "B",
  }));
}

export const MOCK_KICKOFF_TIMESTAMP = "05:30";

// Types for the data structures produced by the Marito-stats Python backend.
// Source: Marito-stats/docs/frontend_briefing.md

export type PlayerId = string; // P01..P10

export interface PlayerStats {
  id: PlayerId;
  name?: string;
  team: "A" | "B";
  minutesPlayed: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  sprints: number;
  coveragePct: number;
}

export interface SprintEvent {
  id: PlayerId;
  /** Video timestamp where the sprint starts, e.g. "12:34" */
  startTimestamp: string;
  durationSec: number;
  maxSpeedKmh: number;
  /** Optional YouTube deep link to the exact moment */
  youtubeUrl?: string;
}

export interface RosterEntry {
  id: PlayerId;
  /** Sample face photo extracted from the match */
  thumbnailUrl: string;
  team: "A" | "B" | null;
}

export interface Roster {
  matchId: string;
  players: RosterEntry[];
}

export interface CalibrationInfo {
  matchId: string;
  /** Field thumbnail extracted from a frame */
  thumbnailUrl: string;
  /** ROI / calibration points are backend-owned; frontend only reviews */
  roiValid: boolean;
}

export interface MatchSummary {
  matchId: string;
  title: string;
  /** Kickoff timestamp within the video, "mm:ss" */
  kickoffTimestamp: string;
  date?: string;
}

export type MatchUploadInput = {
  videoFile?: File;
  youtubeUrl?: string;
  /** Where the match starts inside the video, "mm:ss" */
  kickoffTimestamp: string;
};

export type MatchUploadResponse = MatchSummary;

// Types for the data structures produced by the Marito-stats Python backend.
// Source: Marito-stats/docs/frontend_briefing.md + integration contract (openapi.yaml)

export type PlayerId = string; // P01..P10

export interface PitchPoint {
  xM: number;
  yM: number;
}

export interface SpeedZonesPct {
  walk: number;
  jog: number;
  run: number;
  fast: number;
  sprint: number;
}

export interface PitchPosition {
  meanXM: number;
  meanYM: number;
  stdXM: number;
  stdYM: number;
}

export interface ThirdsPct {
  defensive: number;
  middle: number;
  attacking: number;
}

export interface PlayerStats {
  id: PlayerId;
  /** Display name set by the user; falls back to id */
  displayName: string | null;
  /** Team assignment ("A" | "B" | null if not assigned) */
  teamId: string | null;
  minutesPlayed: number;
  visibleSeconds: number;
  spanSeconds: number;
  coveragePct: number;
  distanceKm: number;
  distancePerMinuteM: number;
  avgSpeedKmh: number;
  medianKmh: number;
  p95Kmh: number;
  p99Kmh: number;
  maxSpeedKmh: number;
  sprints: number;
  sprintDistanceM: number;
  sprintPct: number;
  peak1MinDistanceM: number;
  speedZonesPct: SpeedZonesPct;
  position: PitchPosition;
  thirdsPct: ThirdsPct;
  areaCellsM2: number;
  hullAreaM2: number;
  heatmapUrl: string | null;
}

export interface SprintEvent {
  /** Stable event ID within the match, e.g. "P05-S01" */
  id: string;
  playerId: PlayerId;
  sprintNo: number;
  /** Sprint start in seconds from kickoff */
  startSec: number;
  endSec: number;
  durationSec: number;
  startClock: string; // "MM:SS"
  endClock: string; // "MM:SS"
  distanceM: number;
  maxSpeedKmh: number;
  meanSpeedKmh: number;
  startPosition: PitchPoint;
  endPosition: PitchPoint;
  /** Offset in the source video (kickoffSec + startSec) */
  videoStartSec: number;
  youtubeUrl: string | null;
  isLongest: boolean;
  isFastest: boolean;
}

export interface SprintList {
  matchId: string;
  available: boolean;
  reason: string | null;
  total: number;
  items: SprintEvent[];
  nextCursor: string | null;
}

export interface RosterEntry {
  id: PlayerId;
  /** Display name set by the user; falls back to id */
  displayName: string | null;
  /** Sample face photo extracted from the match */
  thumbnailUrl: string | null;
  /** Team assignment ("A" | "B" | null if not assigned) */
  teamId: string | null;
}

export interface Team {
  id: string;
  name: string | null;
  color: string | null;
}

export interface Roster {
  matchId: string;
  teams: Team[];
  players: RosterEntry[];
}

export interface CalibrationQuality {
  status: string;
  approved: boolean;
  rmsM: number | null;
  outOfPitchPct: number | null;
}

export interface Calibration {
  matchId: string;
  status: string;
  approved: boolean;
  rmsM: number | null;
  maxErrM: number | null;
  landmarksCount: number | null;
  outOfPitchPct: number | null;
  pitch: {
    lengthM: number;
    widthM: number;
  };
  imageSize: {
    width: number;
    height: number;
  } | null;
  pitchImageUrl: string | null;
}

export interface TrackingQuality {
  matchedFraction: number | null;
  assignedFraction: number | null;
}

export interface SprintAvailability {
  available: boolean;
  reason: string | null;
}

export interface MatchQuality {
  meanCoveragePct: number;
  minCoveragePct: number;
  calibration: CalibrationQuality;
  tracking: TrackingQuality;
  sprintEvents: SprintAvailability;
}

export interface MatchTotals {
  totalDistanceM: number;
  meanDistanceM: number;
  totalSprints: number;
  meanCoveragePct: number;
}

export interface VideoSource {
  type: "file" | "youtube";
  playbackUrl: string | null;
}

export interface MatchLinks {
  self: string;
  roster: string;
  stats: string;
  sprints: string;
  calibration: string;
  heatmaps: string;
}

export interface MatchList {
  items: MatchSummary[];
  nextCursor: string | null;
}

export interface PlayerStatsList {
  matchId: string;
  players: PlayerStats[];
}

export interface MatchSummary {
  matchId: string;
  title: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Offset of match start within the source video, in seconds */
  kickoffSec: number;
  durationSec: number;
  status: string;
  playerCount: number;
  hasSprintEvents: boolean;
}

export interface MatchDetail extends MatchSummary {
  /** "MM:SS" representation of kickoffSec */
  kickoffClock: string;
  video: VideoSource | null;
  totals: MatchTotals;
  quality: MatchQuality;
  teams: Team[];
  links: MatchLinks;
}

export type MatchUploadInput = {
  videoFile?: File;
  youtubeUrl?: string;
  /** Where the match starts inside the video, "mm:ss" */
  kickoffTimestamp: string;
};

export type MatchUploadResponse = MatchSummary;

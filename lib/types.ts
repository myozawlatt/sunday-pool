export type MatchType = 'card' | 'snooker';
export type DayStatus = 'draft' | 'published';

export interface Player {
  id: string;
  name: string;
  avatarUrl: string | null;
  handle: string; // profile URL: /player/{handle}
  quote: string | null;
}

export interface ScoreRow {
  playerId: string;
  score: number;
}

export interface Match {
  type: MatchType;
  rows: ScoreRow[];
}

export interface MatchDay {
  id: string;
  date: string; // YYYY-MM-DD
  status: DayStatus;
  matches: Match[]; // at most one per type, in MATCH_TYPES order
}

export type PlayerMap = Record<string, Player>;

export const MATCH_TYPES: ReadonlyArray<{ type: MatchType; title: string }> = [
  { type: 'card', title: 'Card' },
  { type: 'snooker', title: 'Snooker' },
];

export const matchTitle = (type: MatchType) => MATCH_TYPES.find((m) => m.type === type)?.title ?? type;

export type RunRecord = {
  at: number;
  score: number;
  gems: number;
  bars: number;
  hits: number;
  challenge: string;
  /** null for classic runs without objectives */
  won: boolean | null;
};

export const HISTORY_KEY = "orbdash-history";
export const HISTORY_LIMIT = 50;

/** Newest first, capped so storage never grows forever. */
export function addRun(list: RunRecord[], run: RunRecord): RunRecord[] {
  return [run, ...list].slice(0, HISTORY_LIMIT);
}

export function parseHistory(raw: string | null): RunRecord[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((r) => r && typeof r.score === "number") : [];
  } catch {
    return [];
  }
}

export function summarize(list: RunRecord[]) {
  const withGoals = list.filter((r) => r.won !== null);
  return {
    runs: list.length,
    best: list.reduce((m, r) => Math.max(m, r.score), 0),
    avg: list.length ? Math.round(list.reduce((s, r) => s + r.score, 0) / list.length) : 0,
    challengesWon: withGoals.filter((r) => r.won).length,
    challengesTried: withGoals.length,
  };
}

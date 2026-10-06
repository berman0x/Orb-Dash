export type Challenge = {
  title: string;
  briefing: string;
  targetScore: number;
  gemGoal: number;
  barJumpGoal: number;
  obstacleDensity: number; // 0.2 - 0.9 chance a non-free lane gets an obstacle
  barRatio: number; // 0 - 0.7 share of obstacles that are jumpable bars
  gemFrequency: number; // 0.3 - 1 chance the free lane carries gems
  startSpeed: number; // 12 - 24
  maxSpeed: number; // 26 - 46
};

export const CLASSIC: Challenge = {
  title: "Classic run",
  briefing: "Go as far as you can.",
  targetScore: 0,
  gemGoal: 0,
  barJumpGoal: 0,
  obstacleDensity: 0.6,
  barRatio: 0.3,
  gemFrequency: 0.7,
  startSpeed: 16,
  maxSpeed: 40,
};

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
};

export function clampTarget(v: unknown) {
  return Math.round(clamp(v, 100, 20000, 1000));
}

/** Keeps AI output inside ranges the game can actually play. */
export function normalizeChallenge(raw: Partial<Challenge>, target: number): Challenge {
  const targetScore = clampTarget(target);
  const startSpeed = clamp(raw.startSpeed, 12, 24, 16);
  return {
    title: String(raw.title || "Custom run").slice(0, 40),
    briefing: String(raw.briefing || "Beat the objectives.").slice(0, 160),
    targetScore,
    gemGoal: Math.round(clamp(raw.gemGoal, 0, Math.max(3, Math.floor(targetScore / 15)), 10)),
    barJumpGoal: Math.round(clamp(raw.barJumpGoal, 0, Math.max(2, Math.floor(targetScore / 60)), 3)),
    obstacleDensity: clamp(raw.obstacleDensity, 0.2, 0.9, 0.6),
    barRatio: clamp(raw.barRatio, 0, 0.7, 0.3),
    gemFrequency: clamp(raw.gemFrequency, 0.3, 1, 0.7),
    startSpeed,
    maxSpeed: Math.max(startSpeed + 4, clamp(raw.maxSpeed, 26, 46, 40)),
  };
}

export const STYLES = ["Chill cruise", "Gem hunter", "Jump master", "Speed chaos"];

import { describe, expect, it } from "vitest";
import { normalizeChallenge } from "./challenge";

describe("normalizeChallenge", () => {
  it("keeps the player's target score", () => {
    expect(normalizeChallenge({}, 2500).targetScore).toBe(2500);
  });
  it("clamps AI speeds and density into playable ranges", () => {
    const c = normalizeChallenge({ startSpeed: 99, maxSpeed: 5, obstacleDensity: 3 }, 1000);
    expect(c.startSpeed).toBe(24);
    expect(c.maxSpeed).toBe(28);
    expect(c.obstacleDensity).toBe(0.9);
  });
  it("caps gem goal relative to target score", () => {
    expect(normalizeChallenge({ gemGoal: 500 }, 300).gemGoal).toBe(20);
  });
});

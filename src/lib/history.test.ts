import { describe, expect, it } from "vitest";
import { addRun, parseHistory, summarize, HISTORY_LIMIT, type RunRecord } from "./history";

const r = (score: number, won: boolean | null = null): RunRecord => ({ at: 0, score, gems: 1, bars: 0, hits: 1, challenge: "x", won });

describe("run history", () => {
  it("saves newest run first", () => {
    expect(addRun([r(10)], r(20))[0]?.score).toBe(20);
  });
  it("caps stored runs", () => {
    let l: RunRecord[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) l = addRun(l, r(i));
    expect(l.length).toBe(HISTORY_LIMIT);
  });
  it("survives corrupt storage", () => {
    expect(parseHistory("{bad")).toEqual([]);
  });
  it("counts challenge results, ignoring classic runs", () => {
    const s = summarize([r(100, true), r(50, false), r(300)]);
    expect(s).toMatchObject({ runs: 3, best: 300, avg: 150, challengesWon: 1, challengesTried: 2 });
  });
});

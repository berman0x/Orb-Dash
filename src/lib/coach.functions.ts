import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const n = (v: number) => Math.max(0, Math.min(1_000_000, Math.round(v || 0)));

export const getCoachTip = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ score: z.number(), gems: z.number(), hits: z.number(), best: z.number(), challenge: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { generateTip } = await import("./coach.server");
    return generateTip({ score: n(data.score), gems: n(data.gems), hits: n(data.hits), best: n(data.best), challenge: data.challenge });
  });

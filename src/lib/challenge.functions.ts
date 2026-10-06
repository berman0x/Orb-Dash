import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { clampTarget } from "./challenge";

export const createChallenge = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ targetScore: z.number(), style: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { generateChallenge } = await import("./challenge.server");
    return generateChallenge(clampTarget(data.targetScore), data.style.trim() || "Balanced");
  });

import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText, APICallError } from "ai";
import { z } from "zod";
import { normalizeChallenge, type Challenge } from "./challenge";

const schema = z.object({
  title: z.string(),
  briefing: z.string(),
  gemGoal: z.number(),
  barJumpGoal: z.number(),
  obstacleDensity: z.number(),
  barRatio: z.number(),
  gemFrequency: z.number(),
  startSpeed: z.number(),
  maxSpeed: z.number(),
});

export type ChallengeResult = { ok: true; challenge: Challenge } | { ok: false; error: string };

export async function generateChallenge(targetScore: number, style: string): Promise<ChallengeResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "AI is not configured." };
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: `You design runs for "Orb Dash", a 3-lane endless runner. The player rolls a ball, switches lanes to dodge tall blocks, jumps purple bars, and collects gold gems (+25 points each). Distance gives about 8 points per second at start speed 16.
Return a challenge matching the player's target score and style.
Ranges: gemGoal 0..targetScore/15, barJumpGoal 0..targetScore/60, obstacleDensity 0.2..0.9, barRatio 0..0.7, gemFrequency 0.3..1, startSpeed 12..24, maxSpeed 26..46.
Title max 4 words, playful. Briefing one short sentence speaking to the player.
Make it achievable but exciting; the objectives must fit the style (e.g. gem hunters get high gem goals and gemFrequency, jumpers high barRatio and barJumpGoal, chill = low density/speed, chaos = high density and speed).`,
      messages: [{ role: "user", content: `Target score: ${targetScore}. Preferred style: ${style.slice(0, 120)}` }],
      output: Output.object({ schema }),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const out = await result.output;
    return { ok: true, challenge: normalizeChallenge(out, targetScore) };
  } catch (e) {
    const status = APICallError.isInstance(e) ? e.statusCode : undefined;
    console.error("challenge generation failed", status, e);
    if (status === 402) return { ok: false, error: "AI credits are used up. Add credits in workspace billing to keep generating challenges." };
    if (status === 429) return { ok: false, error: "Too many requests right now. Please wait a moment and try again." };
    if (status === 403) return { ok: false, error: "AI access is blocked for this workspace." };
    return { ok: false, error: "Couldn't create a challenge. Please try again." };
  }
}

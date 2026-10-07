import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText, APICallError } from "ai";
import { z } from "zod";

const schema = z.object({ focus: z.string(), tip: z.string() });

export type CoachInput = { score: number; gems: number; hits: number; best: number; challenge: string };
export type CoachResult = { ok: true; focus: string; tip: string } | { ok: false; error: string };

export async function generateTip(d: CoachInput): Promise<CoachResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "AI is not configured." };
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: `You are a friendly coach for "Orb Dash", a 3-lane endless runner on phones. The player swipes left/right (or taps screen sides) to switch lanes, swipes up (or taps middle) to jump purple bars, must avoid tall dark blocks, and collects gold gems worth +25 points. Distance gives points; speed keeps rising. Any obstacle hit ends the run.
Give a "focus": 2-5 words naming the single thing to work on next run. Give a "tip": 1-2 short, concrete, encouraging sentences tied to the player's numbers. No markdown.`,
      messages: [{
        role: "user",
        content: `Latest run: score ${d.score}, gems ${d.gems}, obstacles hit ${d.hits}. Personal best ${d.best}. Mode: ${d.challenge.slice(0, 60)}.`,
      }],
      output: Output.object({ schema }),
      providerOptions: {
        openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
      },
    });
    const out = await result.output;
    return { ok: true, focus: String(out.focus).slice(0, 60), tip: String(out.tip).slice(0, 300) };
  } catch (e) {
    const status = APICallError.isInstance(e) ? e.statusCode : undefined;
    console.error("coach tip failed", status, e);
    if (status === 402) return { ok: false, error: "AI credits are used up. Add credits in workspace billing to keep getting tips." };
    if (status === 429) return { ok: false, error: "Too many requests right now. Please wait a moment and try again." };
    if (status === 403) return { ok: false, error: "AI access is blocked for this workspace." };
    return { ok: false, error: "Couldn't get a tip. Please try again." };
  }
}

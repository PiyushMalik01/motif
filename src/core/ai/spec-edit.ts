/**
 * A1 — AI model accessor + prompt builder for spec editing.
 *
 * `getModel()` uses the OpenAI provider (openai()) and reads OPENAI_API_KEY.
 * MOTIF_MODEL controls only the model name string (default: "gpt-4o-mini").
 *
 * To switch providers you must change the code, not just set MOTIF_MODEL:
 *   - Anthropic SDK:  replace `openai(model)` with `anthropic(model)` from "@ai-sdk/anthropic"
 *   - Vercel AI Gateway:  replace `openai(model)` with the gateway provider and use a
 *     "provider/model" MOTIF_MODEL string (e.g. "anthropic/claude-3-5-haiku").
 *
 * MOTIF_MODEL alone is NOT enough to switch providers — the import and call must change too.
 */

import { openai } from "@ai-sdk/openai";
import type { MotionSpec } from "../motion-spec";

/**
 * Returns the AI SDK model instance via the OpenAI provider.
 * MOTIF_MODEL sets the model name (default: "gpt-4o-mini"); OPENAI_API_KEY must be set.
 * To use a different provider (Anthropic, AI Gateway, etc.) you must edit the code here.
 * Not unit-tested (env/IO side-effect).
 */
export function getModel() {
  const model = process.env.MOTIF_MODEL ?? "gpt-4o-mini";
  return openai(model);
}

/**
 * Composes a prompt for editing a MotionSpec from a natural-language instruction.
 * Pure function — no side effects, fully unit-testable.
 *
 * @param current - The existing MotionSpec, or null if none yet.
 * @param instruction - The user's natural-language animation request.
 * @returns A prompt string for use with generateObject({ schema: motionSpec }).
 */
export function buildSpecEditPrompt(current: MotionSpec | null, instruction: string): string {
  const currentSpecSection =
    current !== null
      ? `Current spec:\n${JSON.stringify(current, null, 2)}`
      : "Current spec: none yet";

  return `You are an animation spec editor for a Framer Motion component library called Motif.

${currentSpecSection}

User instruction: ${instruction}

Based on the instruction, produce an updated MotionSpec JSON object. Follow these rules:
- trigger: one of "mount" | "hover" | "tap" | "inView"
- from / to: animatable props (opacity, x, y, scale, rotate) — all optional numbers
- transition: either { type: "spring", stiffness, damping, mass, delay } or { type: "tween", duration, ease, delay }
- element: the HTML tag name (e.g. "div", "button")
- Keep existing values that the instruction does not mention.
- Return ONLY the JSON object matching the MotionSpec schema.`;
}

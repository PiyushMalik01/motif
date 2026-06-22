/**
 * A1 — AI model accessor + prompt builder for spec editing.
 *
 * Model accessor reads OPENAI_API_KEY from the environment.
 * To swap providers:
 *   - Anthropic: `import { anthropic } from "@ai-sdk/anthropic"; return anthropic(model)`
 *   - AI Gateway: pass a "provider/model" string via MOTIF_MODEL (e.g. "anthropic/claude-3-5-haiku")
 *     and use the Vercel AI Gateway provider instead of the direct openai() accessor.
 */

import { openai } from "@ai-sdk/openai";
import type { MotionSpec } from "../motion-spec";

/**
 * Returns the AI SDK model instance.
 * Reads MOTIF_MODEL (default: "gpt-4o-mini") and OPENAI_API_KEY from the environment.
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

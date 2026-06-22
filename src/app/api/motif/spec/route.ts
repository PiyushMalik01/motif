/**
 * A2 — POST /api/motif/spec
 * AI spec-editing endpoint: natural language instruction → validated MotionSpec.
 *
 * Uses generateObject() with the motionSpec Zod schema so validation is built in;
 * the model's output is NEVER returned without Zod validation.
 */

import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { motionSpec } from "../../../../core/motion-spec";
import type { MotionSpec } from "../../../../core/motion-spec";
import { buildSpecEditPrompt, getModel } from "../../../../core/ai/spec-edit";

export async function POST(request: Request): Promise<Response> {
  // Parse and validate the request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (
    typeof body !== "object" ||
    body === null ||
    !("instruction" in body) ||
    typeof (body as Record<string, unknown>).instruction !== "string" ||
    ((body as Record<string, unknown>).instruction as string).trim() === ""
  ) {
    return NextResponse.json(
      { error: "Request body must include a non-empty 'instruction' string" },
      { status: 400 }
    );
  }

  const { instruction, currentSpec } = body as {
    instruction: string;
    currentSpec?: MotionSpec | null;
  };

  // Build the prompt
  const prompt = buildSpecEditPrompt(currentSpec ?? null, instruction.trim());

  try {
    // generateObject validates the output against motionSpec Zod schema automatically.
    // If the model returns something that doesn't match, the AI SDK throws NoObjectGeneratedError.
    const { object } = await generateObject({
      model: getModel(),
      schema: motionSpec,
      prompt,
    });

    return NextResponse.json({ spec: object });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Model error: ${message}` }, { status: 500 });
  }
}

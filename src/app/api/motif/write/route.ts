/**
 * A3 — POST /api/motif/write
 * Dev-only endpoint: applies a MotionSpec to a real source file via patchSource().
 *
 * Safety guarantees:
 * - 403 in production (NODE_ENV === "production")
 * - Only writes to disk when patchSource returns ok:true
 * - Returns the suggestion (never writes) on ok:false
 */

import { NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { patchSource } from "../../../../core/ast-patch";
import { motionSpec } from "../../../../core/motion-spec";
import type { SourceLocation } from "../../../../core/source-location";

export async function POST(request: Request): Promise<Response> {
  // Dev-only guard
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "This endpoint is not available in production" }, { status: 403 });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.filePath !== "string" || b.filePath.trim() === "") {
    return NextResponse.json({ error: "Missing or invalid 'filePath'" }, { status: 400 });
  }

  if (
    typeof b.location !== "object" ||
    b.location === null ||
    typeof (b.location as Record<string, unknown>).lineNumber !== "number" ||
    typeof (b.location as Record<string, unknown>).columnNumber !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid 'location'" }, { status: 400 });
  }

  if (b.spec === undefined || b.spec === null) {
    return NextResponse.json({ error: "Missing 'spec'" }, { status: 400 });
  }

  // Validate spec against Zod schema
  const specResult = motionSpec.safeParse(b.spec);
  if (!specResult.success) {
    return NextResponse.json(
      { error: "Invalid spec", details: specResult.error.message },
      { status: 400 }
    );
  }

  const rawFilePath = b.filePath.trim();
  const location = b.location as SourceLocation;
  const spec = specResult.data;

  // Security: resolve and confine to project root; restrict to .tsx/.jsx
  const root = process.cwd();
  const resolved = path.resolve(root, rawFilePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "filePath escapes project root" }, { status: 400 });
  }
  if (!/\.(tsx|jsx)$/.test(resolved)) {
    return NextResponse.json({ error: "only .tsx/.jsx files may be edited" }, { status: 400 });
  }

  const filePath = resolved;

  // Read the source file
  let source: string;
  try {
    source = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Could not read file: ${message}` }, { status: 500 });
  }

  // Apply the patch via patchSource (reuses existing core module)
  const result = patchSource(source, location, spec);

  if (!result.ok) {
    // Safety: DO NOT write to disk on failure — return suggestion instead
    return NextResponse.json({
      ok: false,
      reason: result.reason,
      suggestion: result.suggestion,
    });
  }

  // Write the patched content to disk only on success
  try {
    fs.writeFileSync(filePath, result.code, "utf-8");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Could not write file: ${message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    summary: result.summary,
  });
}

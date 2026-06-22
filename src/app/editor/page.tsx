/**
 * B3 — /editor page.
 *
 * Composes all four panels over one useMotionSpec state:
 *   PromptBar  — AI instruction → updates spec
 *   Inspector  — hand-tweak sliders → updates spec
 *   CodePanel  — live code from spec (read-only)
 *   LiveStage  — live motion preview (read-only)
 *
 * Also mounts MotifInspector (dev-only) so clicking any element in
 * the page seeds the source location for "Save to file".
 *
 * "Save to file" POSTs to /api/motif/write with the selected location + spec.
 * The page itself is a Server Component; the interactive client logic is in
 * the "use client" EditorClient component below.
 */

import React from "react";
import { EditorClient } from "./EditorClient";

export default function EditorPage() {
  return <EditorClient />;
}

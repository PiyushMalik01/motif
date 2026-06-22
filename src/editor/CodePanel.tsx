/**
 * B1 — CodePanel.
 *
 * Renders the result of specToCode(spec) — a copy-pasteable Framer Motion snippet.
 * Purely derived from the spec; no local state.
 */
"use client";

import React from "react";
import type { MotionSpec } from "../core/motion-spec";
import { specToCode } from "../core/spec-to-code";

export interface CodePanelProps {
  spec: MotionSpec;
}

export function CodePanel({ spec }: CodePanelProps) {
  const code = specToCode(spec);

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-950 text-gray-100 rounded-md min-w-64">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Generated Code</h2>
      <pre
        data-testid="code-panel"
        className="text-xs font-mono whitespace-pre-wrap bg-gray-900 rounded p-3 overflow-x-auto"
      >
        {code}
      </pre>
    </div>
  );
}

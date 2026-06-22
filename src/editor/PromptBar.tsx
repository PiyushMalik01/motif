/**
 * B3 — PromptBar.
 *
 * Input + submit: sends the CURRENT spec + instruction to POST /api/motif/spec.
 * On success, calls onSpecChange with the returned spec.
 * The current spec is always sent (never null) so the AI has context.
 */
"use client";

import React, { useState } from "react";
import type { MotionSpec } from "../core/motion-spec";

export interface PromptBarProps {
  /** The current spec — always sent as context to the AI. */
  spec: MotionSpec;
  /** Called when the AI returns a new spec. */
  onSpecChange: (spec: MotionSpec) => void;
}

export function PromptBar({ spec, onSpecChange }: PromptBarProps) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/motif/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Always include the current spec so the AI has full context.
        body: JSON.stringify({ currentSpec: spec, instruction: trimmed }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { spec: MotionSpec };
      onSpecChange(data.spec);
      setInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-3 bg-gray-900 rounded-md items-center"
    >
      <input
        type="text"
        data-testid="prompt-input"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="Describe an animation change…"
        disabled={loading}
        className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        data-testid="prompt-submit"
        disabled={loading || !instruction.trim()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium text-white transition-colors"
      >
        {loading ? "Thinking…" : "Apply AI"}
      </button>
      {error && (
        <span className="text-xs text-red-400" data-testid="prompt-error">
          {error}
        </span>
      )}
    </form>
  );
}

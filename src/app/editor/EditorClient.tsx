/**
 * EditorClient — the "use client" part of /editor.
 *
 * Holds all interactive state (useMotionSpec + selectedLocation) and
 * wires the four panels and the dev-only MotifInspector overlay.
 */
"use client";

import React, { useState } from "react";
import { useMotionSpec } from "../../editor/useMotionSpec";
import { Inspector } from "../../editor/Inspector";
import { CodePanel } from "../../editor/CodePanel";
import { LiveStage } from "../../editor/LiveStage";
import { PromptBar } from "../../editor/PromptBar";
import { MotifInspector } from "../../overlay/MotifInspector";
import type { SourceLocation } from "../../core/source-location";

export function EditorClient() {
  const { spec, setSpec, setTrigger, setSpring, setTo, setFrom } = useMotionSpec();
  const [selectedLocation, setSelectedLocation] = useState<SourceLocation | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  async function handleSave() {
    if (!selectedLocation) {
      setSaveStatus("No element selected — click 'Enable Inspect' to pick one.");
      return;
    }

    setSaveStatus("Saving…");
    try {
      const res = await fetch("/api/motif/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: selectedLocation.fileName,
          location: selectedLocation,
          spec,
        }),
      });

      const data = (await res.json()) as
        | { ok: true; summary: string }
        | { ok: false; reason: string; suggestion: string };

      if (data.ok) {
        setSaveStatus(`Saved: ${data.summary}`);
      } else {
        setSaveStatus(`Cannot patch (${data.reason}). See code panel for suggestion.`);
      }
    } catch (err) {
      setSaveStatus(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-indigo-400">Motif</span> Editor
        </h1>
        <div className="flex items-center gap-3">
          {selectedLocation && (
            <span className="text-xs text-gray-400 truncate max-w-64" title={selectedLocation.fileName}>
              {selectedLocation.fileName.split(/[/\\]/).pop()}:{selectedLocation.lineNumber}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Save to file
          </button>
          {saveStatus && (
            <span className="text-xs text-gray-300 max-w-48 truncate" title={saveStatus}>
              {saveStatus}
            </span>
          )}
        </div>
      </header>

      {/* Prompt bar */}
      <div className="px-6 py-3 border-b border-gray-800">
        <PromptBar spec={spec} onSpecChange={setSpec} />
      </div>

      {/* Main panels */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Inspector — left column */}
        <aside className="w-72 shrink-0 border-r border-gray-800 overflow-y-auto p-4">
          <Inspector
            spec={spec}
            onChange={(next) => {
              setTrigger(next.trigger);
              if (next.transition.type === "spring") {
                setSpring({
                  stiffness: next.transition.stiffness,
                  damping: next.transition.damping,
                  mass: next.transition.mass,
                  delay: next.transition.delay,
                });
              }
              setTo(next.to);
              setFrom(next.from);
            }}
          />
        </aside>

        {/* Live stage — center */}
        <main className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="w-full max-w-sm">
            <LiveStage spec={spec} />
          </div>
        </main>

        {/* Code panel — right column */}
        <aside className="w-96 shrink-0 border-l border-gray-800 overflow-y-auto p-4">
          <CodePanel spec={spec} />
        </aside>
      </div>

      {/* Dev-only MotifInspector overlay — renders null in production */}
      <MotifInspector
        onSelect={(location) => {
          setSelectedLocation(location);
          setSaveStatus(null);
        }}
      />
    </div>
  );
}

/**
 * B1 — Inspector panel.
 *
 * Renders sliders (stiffness/damping/delay), a trigger <select>, and target-prop
 * inputs. Calls onChange with the updated spec on every interaction.
 *
 * Props: controlled — receives spec + onChange.
 */
"use client";

import React from "react";
import type { MotionSpec } from "../core/motion-spec";

export interface InspectorProps {
  spec: MotionSpec;
  onChange: (spec: MotionSpec) => void;
}

export function Inspector({ spec, onChange }: InspectorProps) {
  const t = spec.transition;
  const isSpring = t.type === "spring";

  function updateTrigger(trigger: MotionSpec["trigger"]) {
    onChange({ ...spec, trigger });
  }

  function updateSpring(field: "stiffness" | "damping" | "mass" | "delay", value: number) {
    if (t.type === "spring") {
      onChange({ ...spec, transition: { ...t, [field]: value } });
    } else {
      onChange({
        ...spec,
        transition: { type: "spring", stiffness: 120, damping: 20, mass: 1, delay: 0, [field]: value },
      });
    }
  }

  function updateTo(field: keyof MotionSpec["to"], value: string) {
    const num = value === "" ? undefined : Number(value);
    onChange({ ...spec, to: { ...spec.to, [field]: num } });
  }

  function updateFrom(field: keyof MotionSpec["from"], value: string) {
    const num = value === "" ? undefined : Number(value);
    onChange({ ...spec, from: { ...spec.from, [field]: num } });
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 text-gray-100 rounded-md w-64">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Inspector</h2>

      {/* Trigger */}
      <label className="flex flex-col gap-1 text-xs">
        <span>Trigger</span>
        <select
          data-testid="trigger-select"
          value={spec.trigger}
          onChange={(e) => updateTrigger(e.target.value as MotionSpec["trigger"])}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
        >
          <option value="mount">mount</option>
          <option value="hover">hover</option>
          <option value="tap">tap</option>
          <option value="inView">inView</option>
        </select>
      </label>

      {/* Spring controls */}
      {isSpring && (
        <>
          <label className="flex flex-col gap-1 text-xs">
            <span>Stiffness: {t.stiffness}</span>
            <input
              type="range"
              data-testid="stiffness-slider"
              min={10}
              max={600}
              step={10}
              value={t.stiffness}
              onChange={(e) => updateSpring("stiffness", Number(e.target.value))}
              className="accent-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>Damping: {t.damping}</span>
            <input
              type="range"
              data-testid="damping-slider"
              min={1}
              max={80}
              step={1}
              value={t.damping}
              onChange={(e) => updateSpring("damping", Number(e.target.value))}
              className="accent-indigo-500"
            />
          </label>
        </>
      )}

      {/* Delay */}
      <label className="flex flex-col gap-1 text-xs">
        <span>Delay (s): {t.delay}</span>
        <input
          type="range"
          data-testid="delay-slider"
          min={0}
          max={2}
          step={0.1}
          value={t.delay}
          onChange={(e) =>
            isSpring
              ? updateSpring("delay", Number(e.target.value))
              : onChange({
                  ...spec,
                  transition: { ...spec.transition, delay: Number(e.target.value) } as MotionSpec["transition"],
                })
          }
          className="accent-indigo-500"
        />
      </label>

      {/* To props */}
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">To (target)</span>
        {(["opacity", "x", "y", "scale", "rotate"] as const).map((prop) => (
          <label key={prop} className="flex items-center gap-2">
            <span className="w-12 shrink-0">{prop}</span>
            <input
              type="number"
              data-testid={`to-${prop}`}
              value={spec.to[prop] ?? ""}
              onChange={(e) => updateTo(prop, e.target.value)}
              placeholder="—"
              className="bg-gray-800 border border-gray-600 rounded px-1 py-0.5 w-full text-xs"
            />
          </label>
        ))}
      </div>

      {/* From props */}
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">From (initial)</span>
        {(["opacity", "x", "y", "scale", "rotate"] as const).map((prop) => (
          <label key={prop} className="flex items-center gap-2">
            <span className="w-12 shrink-0">{prop}</span>
            <input
              type="number"
              data-testid={`from-${prop}`}
              value={spec.from[prop] ?? ""}
              onChange={(e) => updateFrom(prop, e.target.value)}
              placeholder="—"
              className="bg-gray-800 border border-gray-600 rounded px-1 py-0.5 w-full text-xs"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

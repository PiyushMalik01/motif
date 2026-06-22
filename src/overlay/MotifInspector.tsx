/**
 * MotifInspector — dev-only React overlay.
 *
 * Renders a fixed-position toggle button. When "inspect" mode is active,
 * clicking any element resolves its React fiber source location and calls
 * the `onSelect` callback. Hovering outlines the target element.
 *
 * Pure wiring: getFiberFromDom + resolveFiberSource do the heavy lifting;
 * this component only handles the UI state and event capture.
 */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getFiberFromDom, resolveFiberSource } from "../core/source-location";
import type { SourceLocation } from "../core/source-location";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MotifInspectorProps {
  /**
   * Called when the user clicks an element while inspect mode is active.
   * @param location The resolved source location of the clicked element.
   * @param element  The clicked DOM element.
   */
  onSelect: (location: SourceLocation, element: Element) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Inner implementation — all hooks live here, no conditional returns above them.
 */
function MotifInspectorInner({ onSelect }: MotifInspectorProps) {
  const [inspecting, setInspecting] = useState(false);
  const outlineRef = useRef<Element | null>(null);

  // Restore any outline on the last hovered element.
  const clearOutline = useCallback(() => {
    if (outlineRef.current) {
      (outlineRef.current as HTMLElement).style.outline = "";
      outlineRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!inspecting) {
      clearOutline();
      return;
    }

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as Element;
      clearOutline();
      (target as HTMLElement).style.outline = "2px solid #6366f1";
      outlineRef.current = target;
    }

    function handleMouseOut() {
      clearOutline();
    }

    function handleClick(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as Element;
      clearOutline();

      const fiber = getFiberFromDom(target);
      const location = resolveFiberSource(fiber);

      if (location) {
        onSelect(location, target);
      }

      // Turn off inspect mode after a selection.
      setInspecting(false);
    }

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      document.removeEventListener("click", handleClick, true);
      clearOutline();
    };
  }, [inspecting, onSelect, clearOutline]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 99999,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={() => setInspecting((v) => !v)}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #6366f1",
          background: inspecting ? "#6366f1" : "#fff",
          color: inspecting ? "#fff" : "#6366f1",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {inspecting ? "Inspecting…" : "Enable Inspect"}
      </button>
    </div>
  );
}

/**
 * Public export. Dev-only guard: renders null in production builds.
 * The inner component holds all hooks so they are never called conditionally.
 */
export function MotifInspector(props: MotifInspectorProps) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return <MotifInspectorInner {...props} />;
}

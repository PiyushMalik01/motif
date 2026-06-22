/**
 * Integration test: MotifInspector overlay + resolveFiberSource working together.
 *
 * Stub strategy: We add a plain DOM element (not rendered by React) as the
 * click target. It has no existing React fiber key, so we can freely assign
 * our __reactFiber$stub key. The overlay's document capture listener still
 * fires (it listens on document, not on the element), resolves the fiber, and
 * calls onSelect — proving the full overlay→resolver pipeline.
 *
 * Environment: jsdom (set by vitest projects config).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, within, act } from "@testing-library/react";
import React from "react";
import { MotifInspector } from "./MotifInspector";
import type { SourceLocation } from "../core/source-location";

// Clean up DOM between tests to avoid leaking rendered components.
afterEach(() => {
  cleanup();
});

describe("MotifInspector", () => {
  it("renders without crashing", () => {
    const onSelect = vi.fn();
    const { unmount } = render(<MotifInspector onSelect={onSelect} />);
    unmount();
  });

  it("shows an Enable Inspect button when mounted", () => {
    const onSelect = vi.fn();
    const { container } = render(<MotifInspector onSelect={onSelect} />);
    expect(within(container).getByRole("button", { name: /enable inspect/i })).toBeTruthy();
  });

  it("toggles to 'Inspecting…' when Enable Inspect is clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(<MotifInspector onSelect={onSelect} />);
    const btn = within(container).getByRole("button", { name: /enable inspect/i });
    act(() => {
      fireEvent.click(btn);
    });
    expect(within(container).getByRole("button", { name: /inspecting/i })).toBeTruthy();
  });

  it("calls onSelect with the resolved SourceLocation when a child element is clicked in inspect mode — integration proof", () => {
    /**
     * INTEGRATION: proves that MotifInspector (overlay) and resolveFiberSource (core) work together.
     *
     * Stub strategy: The click target is a plain DOM element (not rendered by
     * React), so no pre-existing frozen fiber. We assign __reactFiber$stub
     * freely — exactly mimicking what React dev mode sets up on real elements.
     *
     * Cross-module interactions proven:
     * - MotifInspector capture listener → getFiberFromDom (core/source-location.ts)
     * - getFiberFromDom result → resolveFiberSource (core/source-location.ts)
     * - resolveFiberSource → onSelect with SourceLocation
     *
     * The document capture listener fires regardless of whether the clicked
     * element is a React element — proving the overlay intercepts any element
     * in the page, which is the production use case.
     */
    const onSelect = vi.fn<[SourceLocation, Element]>();

    const { container } = render(<MotifInspector onSelect={onSelect} />);

    // Enable inspect mode and flush the useEffect that registers the capture listener.
    act(() => {
      fireEvent.click(within(container).getByRole("button", { name: /enable inspect/i }));
    });

    // Create a plain DOM element (not rendered by React) as our click target.
    // This lets us freely assign __reactFiber$stub without hitting React 19's
    // frozen-fiber restriction.
    const target = document.createElement("div");
    (target as unknown as Record<string, unknown>)["__reactFiber$stub"] = {
      _debugSource: { fileName: "/app/Target.tsx", lineNumber: 42, columnNumber: 7 },
    };
    document.body.appendChild(target);

    try {
      // Click the target. The overlay's document-level capture listener fires,
      // calls getFiberFromDom → resolveFiberSource, and delivers onSelect.
      act(() => {
        fireEvent.click(target);
      });

      expect(onSelect).toHaveBeenCalledOnce();
      const [location, element] = onSelect.mock.calls[0];
      expect(location).toEqual<SourceLocation>({
        fileName: "/app/Target.tsx",
        lineNumber: 42,
        columnNumber: 7,
      });
      expect(element).toBe(target);
    } finally {
      document.body.removeChild(target);
    }
  });

  it("does NOT call onSelect when inspect mode is off", () => {
    const onSelect = vi.fn();
    render(<MotifInspector onSelect={onSelect} />);

    // Do NOT enable inspect mode.
    const target = document.createElement("div");
    (target as unknown as Record<string, unknown>)["__reactFiber$stub2"] = {
      _debugSource: { fileName: "/app/X.tsx", lineNumber: 1 },
    };
    document.body.appendChild(target);

    try {
      act(() => {
        fireEvent.click(target);
      });
      expect(onSelect).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(target);
    }
  });
});

/**
 * B3 Integration Test — Bidirectional AI loop.
 *
 * Proves:
 * 1. Submitting a prompt sends the CURRENT spec (not null/empty) to /api/motif/spec.
 * 2. Applying the mocked response updates BOTH CodePanel text and Inspector values.
 *
 * fetch is mocked; no real HTTP requests are made.
 *
 * Environment: jsdom.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import type { MotionSpec } from "../core/motion-spec";
import { PromptBar } from "./PromptBar";
import { Inspector } from "./Inspector";
import { CodePanel } from "./CodePanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const initialSpec: MotionSpec = {
  trigger: "mount",
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { type: "spring", stiffness: 100, damping: 20, mass: 1, delay: 0 },
  element: "div",
};

const aiReturnedSpec: MotionSpec = {
  trigger: "hover",
  from: { scale: 1 },
  to: { scale: 1.5 },
  transition: { type: "spring", stiffness: 400, damping: 30, mass: 1, delay: 0 },
  element: "div",
};

/**
 * Minimal wrapper that wires PromptBar + Inspector + CodePanel over one spec state.
 * PromptBar calls onSpecChange when AI returns a new spec.
 */
function BidirectionalWrapper() {
  const [spec, setSpec] = useState<MotionSpec>(initialSpec);

  return (
    <div>
      <PromptBar spec={spec} onSpecChange={setSpec} />
      <Inspector spec={spec} onChange={setSpec} />
      <CodePanel spec={spec} />
    </div>
  );
}

describe("Bidirectional AI loop", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ spec: aiReturnedSpec }),
      }),
    );
  });

  it("POST body includes the CURRENT spec (not null/empty)", async () => {
    const { container } = render(<BidirectionalWrapper />);

    const input = container.querySelector<HTMLInputElement>("input[data-testid='prompt-input']");
    const button = container.querySelector<HTMLButtonElement>("button[data-testid='prompt-submit']");
    expect(input).toBeTruthy();
    expect(button).toBeTruthy();

    fireEvent.change(input!, { target: { value: "make it bounce" } });
    fireEvent.click(button!);

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    });

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/motif/spec");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body as string);
    // The current spec must be included — not null or empty
    expect(body.currentSpec).toBeDefined();
    expect(body.currentSpec).not.toBeNull();
    expect(body.currentSpec.trigger).toBe("mount"); // matches initialSpec
    expect(body.instruction).toBe("make it bounce");
  });

  it("applying the mocked response updates both CodePanel and Inspector", async () => {
    const { container } = render(<BidirectionalWrapper />);

    const input = container.querySelector<HTMLInputElement>("input[data-testid='prompt-input']");
    const button = container.querySelector<HTMLButtonElement>("button[data-testid='prompt-submit']");

    fireEvent.change(input!, { target: { value: "make it bounce" } });
    fireEvent.click(button!);

    // Wait for the fetch promise to resolve and state to update
    await waitFor(() => {
      const codePanel = container.querySelector("[data-testid='code-panel']");
      // The returned spec has stiffness: 400 and trigger: hover → whileHover
      expect(codePanel!.textContent).toContain("400");
    });

    // CodePanel should also show whileHover (from trigger: hover in returned spec)
    const codePanel = container.querySelector("[data-testid='code-panel']");
    expect(codePanel!.textContent).toContain("whileHover");

    // Inspector should show the new stiffness (400) in the slider
    const stiffnessSlider = container.querySelector<HTMLInputElement>(
      "input[data-testid='stiffness-slider']",
    );
    expect(stiffnessSlider?.value).toBe("400");
  });
});

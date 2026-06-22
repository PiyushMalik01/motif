/**
 * B1 Integration Test — Shared source of truth.
 *
 * Proves Inspector and CodePanel stay in sync via a single MotionSpec state.
 * Change the stiffness slider in Inspector; assert CodePanel text updates.
 *
 * Environment: jsdom.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import React, { useState } from "react";
import type { MotionSpec } from "../core/motion-spec";
import { Inspector } from "./Inspector";
import { CodePanel } from "./CodePanel";

afterEach(() => cleanup());

/** Minimal wrapper sharing one spec state between Inspector + CodePanel. */
function SharedWrapper() {
  const [spec, setSpec] = useState<MotionSpec>({
    trigger: "mount",
    from: { opacity: 0 },
    to: { opacity: 1 },
    transition: { type: "spring", stiffness: 100, damping: 20, mass: 1, delay: 0 },
    element: "div",
  });

  return (
    <div>
      <Inspector spec={spec} onChange={setSpec} />
      <CodePanel spec={spec} />
    </div>
  );
}

describe("Shared source of truth — Inspector + CodePanel", () => {
  it("CodePanel updates when stiffness slider is changed in Inspector", () => {
    const { container } = render(<SharedWrapper />);

    // Find the stiffness slider (input[type=range] labeled 'stiffness')
    const stiffnessSlider = container.querySelector<HTMLInputElement>(
      "input[data-testid='stiffness-slider']",
    );
    expect(stiffnessSlider).toBeTruthy();

    // Change stiffness to 250
    fireEvent.change(stiffnessSlider!, { target: { value: "250" } });

    // CodePanel should now show the new stiffness value
    const codeOutput = container.querySelector("[data-testid='code-panel']");
    expect(codeOutput).toBeTruthy();
    expect(codeOutput!.textContent).toContain("250");
  });
});

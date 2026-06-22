/**
 * A1 — unit tests for buildSpecEditPrompt (pure function, no mocks needed).
 * getModel() is not unit-tested (env/IO side-effect).
 */
import { describe, it, expect } from "vitest";
import { buildSpecEditPrompt } from "./spec-edit";
import type { MotionSpec } from "../motion-spec";

const sampleSpec: MotionSpec = {
  trigger: "mount",
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { type: "spring", stiffness: 200, damping: 20, mass: 1, delay: 0 },
  element: "div",
};

describe("buildSpecEditPrompt", () => {
  it("includes the instruction verbatim", () => {
    const prompt = buildSpecEditPrompt(sampleSpec, "make it bounce");
    expect(prompt).toContain("make it bounce");
  });

  it("serializes the current spec into the prompt", () => {
    const prompt = buildSpecEditPrompt(sampleSpec, "any instruction");
    // The JSON representation of the spec should appear
    expect(prompt).toContain('"trigger"');
    expect(prompt).toContain('"mount"');
    expect(prompt).toContain('"stiffness"');
  });

  it("handles null current spec gracefully", () => {
    const prompt = buildSpecEditPrompt(null, "start fresh");
    expect(prompt).toContain("start fresh");
    // Should mention that there is no current spec
    expect(prompt.toLowerCase()).toMatch(/none|no current|null|not set/);
  });

  it("returns a non-empty string", () => {
    const prompt = buildSpecEditPrompt(sampleSpec, "test");
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(10);
  });
});

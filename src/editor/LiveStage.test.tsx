/**
 * B2 — LiveStage tests.
 *
 * Verifies that the stage renders without crashing for different trigger types,
 * that the motion element is present in the DOM, and that the replay button
 * re-mounts the component (key bump).
 *
 * Environment: jsdom.
 */
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import type { MotionSpec } from "../core/motion-spec";
import { LiveStage } from "./LiveStage";

afterEach(() => cleanup());

// jsdom does not implement IntersectionObserver (needed by Framer Motion's inView trigger).
// Provide a minimal stub so the component renders without crashing in the test environment.
beforeAll(() => {
  if (typeof window !== "undefined" && !window.IntersectionObserver) {
    const MockIntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  }
});

const mountSpec: MotionSpec = {
  trigger: "mount",
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { type: "spring", stiffness: 120, damping: 20, mass: 1, delay: 0 },
  element: "div",
};

const hoverSpec: MotionSpec = {
  trigger: "hover",
  from: { scale: 1 },
  to: { scale: 1.1 },
  transition: { type: "spring", stiffness: 200, damping: 15, mass: 1, delay: 0 },
  element: "div",
};

const inViewSpec: MotionSpec = {
  trigger: "inView",
  from: { opacity: 0, y: 20 },
  to: { opacity: 1, y: 0 },
  transition: { type: "tween", duration: 0.5, ease: "easeOut", delay: 0 },
  element: "div",
};

describe("LiveStage", () => {
  it("renders without crashing for mount spec", () => {
    const { unmount } = render(<LiveStage spec={mountSpec} />);
    unmount();
  });

  it("renders without crashing for hover spec", () => {
    const { unmount } = render(<LiveStage spec={hoverSpec} />);
    unmount();
  });

  it("renders without crashing for inView spec", () => {
    const { unmount } = render(<LiveStage spec={inViewSpec} />);
    unmount();
  });

  it("renders the motion element in the DOM", () => {
    const { container } = render(<LiveStage spec={mountSpec} />);
    // The motion element should be rendered as a div with data-testid
    const motionEl = container.querySelector("[data-testid='live-motion-element']");
    expect(motionEl).toBeTruthy();
  });

  it("replay button remounts the motion element (key changes)", () => {
    const { container } = render(<LiveStage spec={mountSpec} />);
    const motionEl = container.querySelector("[data-testid='live-motion-element']");
    const keyBefore = motionEl?.getAttribute("data-replay-key");

    // Click the replay button
    const replayBtn = container.querySelector("[data-testid='replay-button']");
    expect(replayBtn).toBeTruthy();
    fireEvent.click(replayBtn!);

    const motionElAfter = container.querySelector("[data-testid='live-motion-element']");
    const keyAfter = motionElAfter?.getAttribute("data-replay-key");

    // Key should have changed (bump triggers remount)
    expect(keyAfter).not.toBe(keyBefore);
  });
});

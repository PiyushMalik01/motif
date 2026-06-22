/**
 * B1 — Tests for useMotionSpec hook.
 *
 * Verifies that the hook holds a MotionSpec and exposes typed updaters.
 * Environment: jsdom.
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMotionSpec } from "./useMotionSpec";

describe("useMotionSpec", () => {
  it("returns a valid initial spec", () => {
    const { result } = renderHook(() => useMotionSpec());
    const { spec } = result.current;
    expect(spec.trigger).toBeDefined();
    expect(spec.from).toBeDefined();
    expect(spec.to).toBeDefined();
    expect(spec.transition).toBeDefined();
  });

  it("setTrigger updates the trigger", () => {
    const { result } = renderHook(() => useMotionSpec());
    act(() => {
      result.current.setTrigger("hover");
    });
    expect(result.current.spec.trigger).toBe("hover");
  });

  it("setSpring updates spring transition values", () => {
    const { result } = renderHook(() => useMotionSpec());
    act(() => {
      result.current.setSpring({ stiffness: 200, damping: 30 });
    });
    const t = result.current.spec.transition;
    expect(t.type).toBe("spring");
    if (t.type === "spring") {
      expect(t.stiffness).toBe(200);
      expect(t.damping).toBe(30);
    }
  });

  it("setTo updates target animation props", () => {
    const { result } = renderHook(() => useMotionSpec());
    act(() => {
      result.current.setTo({ opacity: 0.5, scale: 1.2 });
    });
    expect(result.current.spec.to.opacity).toBe(0.5);
    expect(result.current.spec.to.scale).toBe(1.2);
  });

  it("setFrom updates initial animation props", () => {
    const { result } = renderHook(() => useMotionSpec());
    act(() => {
      result.current.setFrom({ opacity: 0, x: -20 });
    });
    expect(result.current.spec.from.opacity).toBe(0);
    expect(result.current.spec.from.x).toBe(-20);
  });

  it("setSpec replaces the entire spec", () => {
    const { result } = renderHook(() => useMotionSpec());
    act(() => {
      result.current.setSpec({
        trigger: "inView",
        from: { opacity: 0 },
        to: { opacity: 1 },
        transition: { type: "tween", duration: 0.5, ease: "easeOut", delay: 0 },
        element: "span",
      });
    });
    expect(result.current.spec.trigger).toBe("inView");
    expect(result.current.spec.element).toBe("span");
  });
});

/**
 * B1 — useMotionSpec hook.
 *
 * Holds a MotionSpec as the single source of truth in UI state.
 * Exposes typed updaters: setTrigger, setSpring, setTo, setFrom, setSpec.
 *
 * "use client" is not needed here — hooks run only in client components.
 */
import { useState } from "react";
import type { MotionSpec, AnimatableProps } from "../core/motion-spec";

/** Shape of the spring-specific transition fields that can be patched. */
type SpringPatch = {
  stiffness?: number;
  damping?: number;
  mass?: number;
  delay?: number;
};

const DEFAULT_SPEC: MotionSpec = {
  trigger: "mount",
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { type: "spring", stiffness: 120, damping: 20, mass: 1, delay: 0 },
  element: "div",
};

export type UseMotionSpecReturn = {
  spec: MotionSpec;
  /** Replace the trigger type. */
  setTrigger: (trigger: MotionSpec["trigger"]) => void;
  /** Patch spring-transition fields (only valid when transition.type === "spring").
   *  Switches transition to spring if it was tween. */
  setSpring: (patch: SpringPatch) => void;
  /** Merge into the "to" (target) animatable props. */
  setTo: (patch: Partial<AnimatableProps>) => void;
  /** Merge into the "from" (initial) animatable props. */
  setFrom: (patch: Partial<AnimatableProps>) => void;
  /** Replace the entire spec. */
  setSpec: (spec: MotionSpec) => void;
};

export function useMotionSpec(initial: MotionSpec = DEFAULT_SPEC): UseMotionSpecReturn {
  const [spec, setSpecState] = useState<MotionSpec>(initial);

  const setTrigger = (trigger: MotionSpec["trigger"]) =>
    setSpecState((s) => ({ ...s, trigger }));

  const setSpring = (patch: SpringPatch) =>
    setSpecState((s) => {
      const prev = s.transition;
      if (prev.type === "spring") {
        return { ...s, transition: { ...prev, ...patch } };
      }
      // Switch from tween to spring
      return {
        ...s,
        transition: {
          type: "spring",
          stiffness: patch.stiffness ?? 120,
          damping: patch.damping ?? 20,
          mass: patch.mass ?? 1,
          delay: patch.delay ?? 0,
        },
      };
    });

  const setTo = (patch: Partial<AnimatableProps>) =>
    setSpecState((s) => ({ ...s, to: { ...s.to, ...patch } }));

  const setFrom = (patch: Partial<AnimatableProps>) =>
    setSpecState((s) => ({ ...s, from: { ...s.from, ...patch } }));

  const setSpec = (next: MotionSpec) => setSpecState(next);

  return { spec, setTrigger, setSpring, setTo, setFrom, setSpec };
}

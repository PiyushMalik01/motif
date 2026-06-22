import { z } from "zod";

/** Numeric properties Motif can animate in v0.1. All optional. */
export const animatableProps = z.object({
  opacity: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().optional(),
  rotate: z.number().optional(),
});

const springTransition = z.object({
  type: z.literal("spring"),
  stiffness: z.number(),
  damping: z.number(),
  mass: z.number().default(1),
  delay: z.number().default(0),
});

const tweenTransition = z.object({
  type: z.literal("tween"),
  duration: z.number(),
  ease: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]),
  delay: z.number().default(0),
});

export const transition = z.discriminatedUnion("type", [springTransition, tweenTransition]);

/** The single source of truth for one element's motion. */
export const motionSpec = z.object({
  trigger: z.enum(["mount", "hover", "tap", "inView"]),
  from: animatableProps,
  to: animatableProps,
  transition,
  element: z.string().default("div"),
});

export type MotionSpec = z.infer<typeof motionSpec>;
export type Transition = z.infer<typeof transition>;
export type AnimatableProps = z.infer<typeof animatableProps>;

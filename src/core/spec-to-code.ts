import type { MotionSpec, Transition, AnimatableProps } from "./motion-spec";

const TRIGGER_TO_PROP: Record<MotionSpec["trigger"], string> = {
  mount: "animate",
  hover: "whileHover",
  tap: "whileTap",
  inView: "whileInView",
};

function pickDefined(props: AnimatableProps): Array<[string, number]> {
  return Object.entries(props).filter(
    (entry): entry is [string, number] => entry[1] !== undefined,
  );
}

function formatProps(props: AnimatableProps): string {
  const entries = pickDefined(props);
  if (entries.length === 0) return "{}";
  return `{ ${entries.map(([k, v]) => `${k}: ${v}`).join(", ")} }`;
}

function formatTransition(t: Transition): string {
  const parts: string[] = [];
  if (t.type === "spring") {
    parts.push('type: "spring"', `stiffness: ${t.stiffness}`, `damping: ${t.damping}`);
    if (t.mass !== undefined && t.mass !== 1) parts.push(`mass: ${t.mass}`);
  } else {
    parts.push('type: "tween"', `duration: ${t.duration}`, `ease: "${t.ease}"`);
  }
  if (t.delay) parts.push(`delay: ${t.delay}`);
  return `{ ${parts.join(", ")} }`;
}

/** The JSX motion props block for a spec — consumed by the code panel and the AST patcher. */
export function specToMotionProps(spec: MotionSpec): string {
  const animateProp = TRIGGER_TO_PROP[spec.trigger];
  const lines = [
    `initial={${formatProps(spec.from)}}`,
    `${animateProp}={${formatProps(spec.to)}}`,
    `transition={${formatTransition(spec.transition)}}`,
  ];
  if (spec.trigger === "inView") {
    lines.push("viewport={{ once: true }}");
  }
  return lines.join("\n");
}

/** A complete, copy-pasteable Framer Motion snippet for the code panel. */
export function specToCode(spec: MotionSpec): string {
  const props = specToMotionProps(spec)
    .split("\n")
    .map((line) => "  " + line)
    .join("\n");
  return `import { motion } from "framer-motion";

<motion.${spec.element}
${props}
/>`;
}

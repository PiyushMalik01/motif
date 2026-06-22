import { describe, it, expect } from "vitest";
import { motionSpec } from "./motion-spec";
import { specToMotionProps, specToCode } from "./spec-to-code";

const mountSpring = motionSpec.parse({
  trigger: "mount",
  from: { opacity: 0, y: 20 },
  to: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
  element: "div",
});

const hoverTween = motionSpec.parse({
  trigger: "hover",
  from: { scale: 1 },
  to: { scale: 1.05 },
  transition: { type: "tween", duration: 0.2, ease: "easeOut" },
  element: "button",
});

const inViewSpring = motionSpec.parse({
  trigger: "inView",
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { type: "spring", stiffness: 120, damping: 14, delay: 0.1 },
});

describe("specToMotionProps", () => {
  it("maps a mount spring to initial/animate/transition", () => {
    const out = specToMotionProps(mountSpring);
    expect(out).toContain("initial={{ opacity: 0, y: 20 }}");
    expect(out).toContain("animate={{ opacity: 1, y: 0 }}");
    expect(out).toContain('transition={{ type: "spring", stiffness: 300, damping: 20 }}');
    expect(out).not.toContain("whileHover");
  });

  it("maps a hover trigger to whileHover with a tween transition", () => {
    const out = specToMotionProps(hoverTween);
    expect(out).toContain("initial={{ scale: 1 }}");
    expect(out).toContain("whileHover={{ scale: 1.05 }}");
    expect(out).toContain('transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}');
  });

  it("adds viewport once for inView and includes a non-zero delay", () => {
    const out = specToMotionProps(inViewSpring);
    expect(out).toContain("whileInView={{ opacity: 1 }}");
    expect(out).toContain("viewport={{ once: true }}");
    expect(out).toContain("delay: 0.1");
  });
});

describe("specToCode", () => {
  it("produces a full motion element snippet with the import and correct tag", () => {
    const code = specToCode(hoverTween);
    expect(code).toContain('import { motion } from "framer-motion";');
    expect(code).toContain("<motion.button");
    expect(code).toContain("whileHover={{ scale: 1.05 }}");
    expect(code.trimEnd().endsWith("/>")).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { motionSpec } from "./motion-spec";

const validSpring = {
  trigger: "mount",
  from: { opacity: 0, y: 20 },
  to: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
  element: "div",
};

describe("motionSpec", () => {
  it("parses a valid spring spec and applies defaults", () => {
    const parsed = motionSpec.parse(validSpring);
    expect(parsed.transition).toMatchObject({ type: "spring", stiffness: 300, damping: 20 });
    // defaults filled in:
    expect(parsed.transition).toHaveProperty("mass", 1);
    expect(parsed.transition).toHaveProperty("delay", 0);
    expect(parsed.element).toBe("div");
  });

  it("parses a valid tween spec", () => {
    const parsed = motionSpec.parse({
      trigger: "hover",
      from: { scale: 1 },
      to: { scale: 1.05 },
      transition: { type: "tween", duration: 0.2, ease: "easeOut" },
    });
    expect(parsed.transition).toMatchObject({ type: "tween", duration: 0.2, ease: "easeOut" });
    expect(parsed.element).toBe("div"); // default applied
    expect(parsed.transition).toHaveProperty("delay", 0);
  });

  it("rejects an unknown trigger", () => {
    expect(() => motionSpec.parse({ ...validSpring, trigger: "wiggle" })).toThrow();
  });

  it("rejects a spring transition missing stiffness", () => {
    expect(() =>
      motionSpec.parse({ ...validSpring, transition: { type: "spring", damping: 20 } }),
    ).toThrow();
  });

  it("rejects a tween transition with an unknown ease", () => {
    expect(() =>
      motionSpec.parse({
        ...validSpring,
        transition: { type: "tween", duration: 0.2, ease: "bouncy" },
      }),
    ).toThrow();
  });
});

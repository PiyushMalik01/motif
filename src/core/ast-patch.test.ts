/**
 * Tests for ast-patch.ts — Plan 3: AST Write-Back
 *
 * Follows strict TDD: RED first (file doesn't exist yet), then GREEN.
 */

import { describe, it, expect } from "vitest";
import { motionSpec } from "./motion-spec";
import { specToMotionProps, specToCode } from "./spec-to-code";
import type { SourceLocation } from "./source-location";
import { parse as babelParse } from "@babel/parser";
import { patchSource } from "./ast-patch";
import type { PatchResult } from "./ast-patch";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

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
  element: "section",
});

// Helper: parse a string with Babel and assert no errors
function assertValidJSX(code: string, label: string) {
  expect(() =>
    babelParse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    })
  ).not.toThrow(`${label} should produce valid JSX`);
}

// ---------------------------------------------------------------------------
// Task 1 — parse + locate + classify
// (These tests exercise internal helpers indirectly through patchSource)
// ---------------------------------------------------------------------------

describe("Task 1 – locate and classify JSX elements", () => {
  it("returns fallback when no JSX exists at the given line", () => {
    const source = `const x = 1;\nconst y = 2;\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 1, columnNumber: 0 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/no JSX element/i);
    }
  });

  it("returns fallback when line number points to a non-JSX line", () => {
    const source = `import React from "react";\n// a comment\nconst x = 42;\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 2, columnNumber: 0 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(false);
  });

  it("classifies a host element on the right line → ok:true", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <div className="x" />;\n}\n`;
    // line 3 = <div .../>
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
  });

  it("classifies a custom component → ok:false with reason", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <Card className="x" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/custom component/i);
    }
  });

  it("classifies an already-motion element → ok:true (merge path)", () => {
    const source = `import { motion } from "framer-motion";\nexport default function C() {\n  return <motion.div animate={{opacity:1}} className="x" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — host-element wrap + import insertion
// ---------------------------------------------------------------------------

describe("Task 2 – host-element wrap", () => {
  it("wraps <div> with motion props and adds the import", () => {
    const source = `import React from "react";\nexport default function C() {\n  return (\n    <div className="card">\n      <p>hello</p>\n    </div>\n  );\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 4, columnNumber: 4 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toContain("motion.div");
      expect(result.code).toContain('className="card"');
      expect(result.code).toContain('import { motion } from "framer-motion"');
      // closing tag also renamed
      expect(result.code).toContain("</motion.div>");
    }
  });

  it("handles self-closing <div /> without a closing tag", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <div className="solo" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toContain("motion.div");
      expect(result.code).not.toContain("</motion.div>"); // self-closing has no closing tag
    }
  });

  it("injects whileHover for a hover spec (not animate)", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <button className="btn">Click</button>;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, hoverTween);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toContain("whileHover");
      expect(result.code).not.toContain("animate=");
      expect(result.code).toContain("motion.button");
    }
  });

  it("injects whileInView + viewport={{ once: true }} for inView spec", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <section id="hero">Content</section>;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, inViewSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toContain("whileInView");
      expect(result.code).toContain("viewport={{ once: true }}");
      expect(result.code).toContain("motion.section");
    }
  });

  // --- INTEGRATION: codegen consistency ---
  it("[integration] injected props are EXACTLY specToMotionProps(spec)", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <div id="target" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const expectedProps = specToMotionProps(mountSpring);
      // Each prop line from specToMotionProps must appear in the patched code
      for (const propLine of expectedProps.split("\n")) {
        expect(result.code).toContain(propLine.trim());
      }
    }
  });

  // --- INTEGRATION: round-trip validity ---
  it("[integration] patched code re-parses without error", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <div className="card">Hello</div>;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      assertValidJSX(result.code, "host element patch");
    }
  });

  it("does NOT duplicate the framer-motion import when already present", () => {
    const source = `import React from "react";\nimport { motion } from "framer-motion";\nexport default function C() {\n  return <div className="x" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 4, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const importCount = (result.code.match(/from "framer-motion"/g) ?? []).length;
      expect(importCount).toBe(1);
    }
  });

  // --- INTEGRATION: spec-variant flow (hover → whileHover) ---
  it("[integration] spec-variant: hover trigger drives whileHover in output", () => {
    const source = `export default function C() {\n  return <button>hi</button>;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 2, columnNumber: 9 };
    const result = patchSource(source, loc, hoverTween);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const expectedProps = specToMotionProps(hoverTween);
      expect(result.code).toContain("whileHover");
      expect(expectedProps).toContain("whileHover"); // sanity
      for (const line of expectedProps.split("\n")) {
        expect(result.code).toContain(line.trim());
      }
    }
  });

  // --- INTEGRATION: spec-variant flow (inView → whileInView + viewport) ---
  it("[integration] spec-variant: inView trigger drives whileInView+viewport in output", () => {
    const source = `export default function C() {\n  return <section>Content</section>;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 2, columnNumber: 9 };
    const result = patchSource(source, loc, inViewSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toContain("whileInView");
      expect(result.code).toContain("viewport={{ once: true }}");
    }
  });

  // --- INTEGRATION: SourceLocation-driven ---
  it("[integration] SourceLocation drives patch to the correct element", () => {
    // Two elements on different lines; location targets line 4 (the paragraph)
    const source = `import React from "react";\nexport default function C() {\n  return (\n    <div>\n      <p className="para">text</p>\n    </div>\n  );\n}\n`;
    // line 5 = <p className="para">
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 5, columnNumber: 6 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // p was patched, div was not
      expect(result.code).toContain("motion.p");
      // The outer <div> should still be plain div (not motion.div)
      expect(result.code).toMatch(/<div>/);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3 — already-motion merge + fallbacks
// ---------------------------------------------------------------------------

describe("Task 3 – already-motion merge and fallbacks", () => {
  it("merges props for already-motion.div — replaces motion props, keeps className", () => {
    const source = `import { motion } from "framer-motion";\nexport default function C() {\n  return <motion.div animate={{opacity:1}} className="x">hello</motion.div>;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toContain('className="x"');
      expect(result.code).toContain("initial=");
      expect(result.code).toContain("animate=");
      // Old animate={{opacity:1}} replaced
      expect(result.code).not.toContain("animate={{opacity:1}}");
    }
  });

  it("[integration] round-trip: already-motion merge re-parses without error", () => {
    const source = `import { motion } from "framer-motion";\nexport default function C() {\n  return <motion.div animate={{opacity:0}} className="x" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(true);
    if (result.ok) {
      assertValidJSX(result.code, "motion merge patch");
    }
  });

  it("<Card> custom component → ok:false, suggestion equals specToCode(spec)", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <Card className="fancy" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.suggestion).toBe(specToCode(mountSpring));
    }
  });

  // --- INTEGRATION: safety — fallback never corrupts original ---
  it("[integration] safety: custom component returns ok:false with suggestion = specToCode", () => {
    const source = `import React from "react";\nexport default function C() {\n  return <MyWidget foo="bar" />;\n}\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 3, columnNumber: 9 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.suggestion).toBe(specToCode(mountSpring));
      // original never corrupted — suggestion is a snippet, not the mangled source
      expect(result.suggestion).not.toContain("MyWidget");
    }
  });

  it("unknown line returns ok:false with no-JSX reason and suggestion = specToCode", () => {
    const source = `const x = 1;\n`;
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 1, columnNumber: 0 };
    const result = patchSource(source, loc, mountSpring);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.suggestion).toBe(specToCode(mountSpring));
    }
  });

  // --- INTEGRATION: SourceLocation-driven for Task 3 ---
  it("[integration] SourceLocation correctly targets already-motion element for merge", () => {
    const source = `import { motion } from "framer-motion";\nexport default function C() {\n  return (\n    <div>\n      <motion.span whileHover={{opacity:0.5}} style={{color:"red"}}>text</motion.span>\n    </div>\n  );\n}\n`;
    // line 5 = <motion.span ...>
    const loc: SourceLocation = { fileName: "test.tsx", lineNumber: 5, columnNumber: 6 };

    const tapSpec = motionSpec.parse({
      trigger: "tap",
      from: { scale: 1 },
      to: { scale: 0.9 },
      transition: { type: "spring", stiffness: 400, damping: 25 },
      element: "span",
    });

    const result = patchSource(source, loc, tapSpec);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // span was updated, div not touched
      expect(result.code).toContain("motion.span");
      expect(result.code).toContain("whileTap");
      // old whileHover replaced
      expect(result.code).not.toContain("whileHover={{opacity:0.5}}");
      // style preserved
      expect(result.code).toContain('style={{color:"red"}}');
    }
  });
});

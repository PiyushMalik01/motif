/**
 * A3 — Marquee e2e integration tests for POST /api/motif/write.
 *
 * These tests use real filesystem I/O (temp files) and real patchSource().
 * They prove: route → fs → patcher → codegen all integrate, and the
 * safety guarantee (no write on ok:false) holds end-to-end.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { MotionSpec } from "../../../../core/motion-spec";
import { specToMotionProps } from "../../../../core/spec-to-code";
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempFile(content: string, suffix = ".tsx"): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `motif-test-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/motif/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SAMPLE_SPEC: MotionSpec = {
  trigger: "mount",
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { type: "spring", stiffness: 200, damping: 20, mass: 1, delay: 0 },
  element: "div",
};

// A simple component with a <div> at a known line
const DIV_SOURCE = `import React from "react";

export default function MyComponent() {
  return (
    <div className="hero">
      Hello world
    </div>
  );
}
`;

// A component with a custom <Card> component — patcher should refuse
const CARD_SOURCE = `import React from "react";
import { Card } from "./Card";

export default function MyPage() {
  return (
    <Card className="card">
      Content
    </Card>
  );
}
`;

// ---------------------------------------------------------------------------
// Track temp files for cleanup
// ---------------------------------------------------------------------------
let tempFiles: string[] = [];

beforeEach(() => {
  tempFiles = [];
});

afterEach(() => {
  for (const f of tempFiles) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/motif/write", () => {
  describe("dev-only guard", () => {
    it("returns 403 in production", async () => {
      // vi.stubEnv is the correct Vitest API for safely overriding env vars
      // (handles read-only NODE_ENV and auto-restores after the test).
      vi.stubEnv("NODE_ENV", "production");
      try {
        const filePath = makeTempFile(DIV_SOURCE);
        tempFiles.push(filePath);
        const req = makeRequest({
          filePath,
          location: { fileName: filePath, lineNumber: 5, columnNumber: 4 },
          spec: SAMPLE_SPEC,
        });
        const res = await POST(req);
        expect(res.status).toBe(403);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  describe("request validation", () => {
    it("returns 400 for missing filePath", async () => {
      const req = makeRequest({ location: { fileName: "x", lineNumber: 1, columnNumber: 0 }, spec: SAMPLE_SPEC });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing location", async () => {
      const req = makeRequest({ filePath: "/some/file.tsx", spec: SAMPLE_SPEC });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing spec", async () => {
      const req = makeRequest({ filePath: "/some/file.tsx", location: { fileName: "x", lineNumber: 1, columnNumber: 0 } });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/api/motif/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("MARQUEE e2e: host element (<div>) — successful write", () => {
    it("(1) returns ok:true, (2) file on disk contains motion.div + exact props, (3) file re-parses validly", async () => {
      // Write temp file with <div> at line 5
      const filePath = makeTempFile(DIV_SOURCE);
      tempFiles.push(filePath);

      const location = { fileName: filePath, lineNumber: 5, columnNumber: 4 };
      const req = makeRequest({ filePath, location, spec: SAMPLE_SPEC });

      // (1) Assert ok response
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json).toHaveProperty("summary");

      // (2) Assert file on disk now contains motion.div and exact specToMotionProps output
      const diskContent = fs.readFileSync(filePath, "utf-8");
      expect(diskContent).toContain("<motion.div");

      // Every prop line from specToMotionProps must appear in the file
      const expectedProps = specToMotionProps(SAMPLE_SPEC);
      for (const propLine of expectedProps.split("\n")) {
        expect(diskContent).toContain(propLine.trim());
      }

      // (3) Re-parse the file: it must be valid TypeScript/JSX (no parse errors)
      // We verify this by checking it doesn't throw when babel parses it
      const { parse } = await import("@babel/parser");
      expect(() =>
        parse(diskContent, { sourceType: "module", plugins: ["jsx", "typescript"] })
      ).not.toThrow();
    });
  });

  describe("MARQUEE e2e: custom component (<Card>) — safety guarantee", () => {
    it("file on disk is UNCHANGED and response returns the suggestion", async () => {
      const filePath = makeTempFile(CARD_SOURCE);
      tempFiles.push(filePath);

      const originalContent = fs.readFileSync(filePath, "utf-8");

      // <Card> is at line 6 in CARD_SOURCE
      const location = { fileName: filePath, lineNumber: 6, columnNumber: 4 };
      const req = makeRequest({ filePath, location, spec: SAMPLE_SPEC });

      const res = await POST(req);
      // Route should return 200 with ok:false (not 5xx — it's an expected safe fallback)
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json).toHaveProperty("suggestion");

      // CRITICAL: File on disk must be UNCHANGED
      const diskContent = fs.readFileSync(filePath, "utf-8");
      expect(diskContent).toBe(originalContent);
    });
  });

  describe("error cases", () => {
    it("returns 500 when filePath does not exist", async () => {
      const req = makeRequest({
        filePath: "/nonexistent/path/file.tsx",
        location: { fileName: "/nonexistent/path/file.tsx", lineNumber: 1, columnNumber: 0 },
        spec: SAMPLE_SPEC,
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});

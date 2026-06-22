/**
 * A2 — Tests for POST /api/motif/spec route.
 * vi.mock("ai") so generateObject returns a canned object without hitting any API.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { motionSpec } from "../../../../core/motion-spec";
import type { MotionSpec } from "../../../../core/motion-spec";

// Mock "ai" BEFORE any imports — vi.mock is hoisted, so the factory must not
// reference variables declared after the vi.mock call.
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

// Mock the model accessor so getModel() doesn't need OPENAI_API_KEY
vi.mock("../../../../core/ai/spec-edit", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../../core/ai/spec-edit")>();
  return {
    ...original,
    getModel: vi.fn().mockReturnValue("mock-model"),
  };
});

// Import AFTER mocks are registered
import { POST } from "./route";
import { generateObject } from "ai";

const CANNED_SPEC: MotionSpec = {
  trigger: "hover",
  from: { opacity: 0, scale: 0.9 },
  to: { opacity: 1, scale: 1 },
  transition: { type: "spring", stiffness: 300, damping: 25, mass: 1, delay: 0 },
  element: "div",
};

describe("POST /api/motif/spec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateObject as ReturnType<typeof vi.fn>).mockResolvedValue({ object: CANNED_SPEC });
  });

  it("returns 200 with a spec that parses under motionSpec schema", async () => {
    const body = {
      instruction: "make it fade in on hover",
      currentSpec: null,
    };
    const req = new Request("http://localhost/api/motif/spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty("spec");

    // The returned spec must parse under the Zod schema
    const parsed = motionSpec.safeParse(json.spec);
    expect(parsed.success).toBe(true);
  });

  it("returns 200 with a currentSpec provided", async () => {
    const currentSpec: MotionSpec = {
      trigger: "mount",
      from: { opacity: 0 },
      to: { opacity: 1 },
      transition: { type: "tween", duration: 0.5, ease: "easeOut", delay: 0 },
      element: "button",
    };
    const body = { instruction: "change to spring", currentSpec };
    const req = new Request("http://localhost/api/motif/spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(motionSpec.safeParse(json.spec).success).toBe(true);
  });

  it("returns 400 when instruction is missing", async () => {
    const body = { currentSpec: null };
    const req = new Request("http://localhost/api/motif/spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/motif/spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when instruction is an empty string", async () => {
    const body = { instruction: "", currentSpec: null };
    const req = new Request("http://localhost/api/motif/spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

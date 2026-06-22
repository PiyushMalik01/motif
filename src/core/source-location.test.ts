import { describe, it, expect } from "vitest";
import { resolveFiberSource, getFiberFromDom } from "./source-location";
import type { FiberLike } from "./source-location";

// ---------------------------------------------------------------------------
// Task 1: resolveFiberSource — pure fiber resolution, no DOM
// ---------------------------------------------------------------------------

describe("resolveFiberSource", () => {
  it("returns null for null input", () => {
    expect(resolveFiberSource(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(resolveFiberSource(undefined)).toBeNull();
  });

  it("reads _debugSource from a fiber node directly", () => {
    const fiber: FiberLike = {
      _debugSource: { fileName: "/app/Button.tsx", lineNumber: 42 },
    };
    const loc = resolveFiberSource(fiber);
    expect(loc).toEqual({
      fileName: "/app/Button.tsx",
      lineNumber: 42,
      columnNumber: 0, // defaults to 0 when absent
    });
  });

  it("defaults columnNumber to 0 when _debugSource.columnNumber is absent", () => {
    const fiber: FiberLike = {
      _debugSource: { fileName: "/app/Card.tsx", lineNumber: 10 },
    };
    const loc = resolveFiberSource(fiber);
    expect(loc?.columnNumber).toBe(0);
  });

  it("reads memoizedProps.__source when _debugSource is absent", () => {
    const fiber: FiberLike = {
      memoizedProps: {
        __source: { fileName: "/app/Input.tsx", lineNumber: 7, columnNumber: 5 },
      },
    };
    const loc = resolveFiberSource(fiber);
    expect(loc).toEqual({ fileName: "/app/Input.tsx", lineNumber: 7, columnNumber: 5 });
  });

  // Integration / behavioral: proves that two nodes interact via the .return walk.
  it("walks up the .return ancestor chain when the node itself has no source", () => {
    const ancestor: FiberLike = {
      _debugSource: { fileName: "/app/Parent.tsx", lineNumber: 20, columnNumber: 3 },
    };
    const child: FiberLike = {
      // no _debugSource, no memoizedProps.__source
      return: ancestor,
    };
    const loc = resolveFiberSource(child);
    expect(loc).toEqual({ fileName: "/app/Parent.tsx", lineNumber: 20, columnNumber: 3 });
  });

  it("walks multiple levels up the ancestor chain", () => {
    const grandparent: FiberLike = {
      _debugSource: { fileName: "/app/Root.tsx", lineNumber: 1 },
    };
    const parent: FiberLike = { return: grandparent };
    const child: FiberLike = { return: parent };
    const loc = resolveFiberSource(child);
    expect(loc?.fileName).toBe("/app/Root.tsx");
    expect(loc?.columnNumber).toBe(0);
  });

  it("returns null when no node in the chain has a source", () => {
    const grandparent: FiberLike = { return: null };
    const parent: FiberLike = { return: grandparent };
    const child: FiberLike = { return: parent };
    expect(resolveFiberSource(child)).toBeNull();
  });

  it("prefers _debugSource over memoizedProps.__source on the same node", () => {
    const fiber: FiberLike = {
      _debugSource: { fileName: "/app/Debug.tsx", lineNumber: 99 },
      memoizedProps: {
        __source: { fileName: "/app/Props.tsx", lineNumber: 1 },
      },
    };
    const loc = resolveFiberSource(fiber);
    expect(loc?.fileName).toBe("/app/Debug.tsx");
  });
});

// ---------------------------------------------------------------------------
// Task 2: getFiberFromDom — browser key detection tested with fake objects
// ---------------------------------------------------------------------------

describe("getFiberFromDom", () => {
  it("returns the fiber from an element with a __reactFiber$* key", () => {
    const fakeElement = Object.assign(Object.create(null), {
      "__reactFiber$abc123": { _debugSource: { fileName: "/app/Foo.tsx", lineNumber: 3 } },
    });
    const result = getFiberFromDom(fakeElement as unknown as Element);
    expect(result).toBeTruthy();
    expect((result as FiberLike)._debugSource?.fileName).toBe("/app/Foo.tsx");
  });

  it("returns the fiber from an element with a __reactInternalInstance$* key (React <16 compat)", () => {
    const fakeFiber = { _debugSource: { fileName: "/app/Bar.tsx", lineNumber: 5 } };
    const fakeElement = Object.assign(Object.create(null), {
      "__reactInternalInstance$xyz": fakeFiber,
    });
    const result = getFiberFromDom(fakeElement as unknown as Element);
    expect(result).toBe(fakeFiber);
  });

  it("returns null when the element has no React fiber key", () => {
    const fakeElement = Object.assign(Object.create(null), {
      id: "my-div",
      className: "btn",
    });
    const result = getFiberFromDom(fakeElement as unknown as Element);
    expect(result).toBeNull();
  });
});

/**
 * Source location resolution — pure module, no React/DOM imports.
 *
 * Reads React's dev-only fiber metadata to locate the JSX source position
 * of a clicked element. Used by the overlay (Plan 2) and AST patcher (Plan 3).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw source position as stored by React's dev transform (Babel / SWC). */
export type RawSource = {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
};

/**
 * A fiber-like object that mirrors the subset of React's internal fiber we
 * need. Kept as a plain type so the core stays free of React imports.
 */
export type FiberLike = {
  _debugSource?: RawSource;
  memoizedProps?: { __source?: RawSource };
  return?: FiberLike | null;
};

/** The canonical source location produced by Motif — consumed by Plans 3 + 4. */
export type SourceLocation = {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
};

// ---------------------------------------------------------------------------
// resolveFiberSource
// ---------------------------------------------------------------------------

/**
 * Given a fiber-like node, return the nearest `SourceLocation` by:
 * 1. Checking `fiber._debugSource` (React ≥16 dev mode).
 * 2. Checking `fiber.memoizedProps.__source` (Babel JSX transform).
 * 3. Walking up the `.return` ancestor chain and repeating.
 *
 * Returns null for null/undefined input or when no source is found anywhere
 * in the chain.
 */
export function resolveFiberSource(fiber: FiberLike | null | undefined): SourceLocation | null {
  let current: FiberLike | null | undefined = fiber;

  while (current != null) {
    // Prefer _debugSource (set directly on the fiber by React's dev build).
    if (current._debugSource) {
      return normalize(current._debugSource);
    }

    // Fall back to the Babel-inserted __source prop.
    if (current.memoizedProps?.__source) {
      return normalize(current.memoizedProps.__source);
    }

    // Walk up the return chain.
    current = current.return;
  }

  return null;
}

function normalize(raw: RawSource): SourceLocation {
  return {
    fileName: raw.fileName,
    lineNumber: raw.lineNumber,
    columnNumber: raw.columnNumber ?? 0,
  };
}

// ---------------------------------------------------------------------------
// getFiberFromDom
// ---------------------------------------------------------------------------

const FIBER_KEY_PREFIXES = ["__reactFiber$", "__reactInternalInstance$"] as const;

/**
 * Given a DOM element, return its attached React fiber by scanning for the
 * `__reactFiber$<random>` (React 17+) or `__reactInternalInstance$<random>`
 * (React 16 compat) key that React adds in dev mode.
 *
 * Browser-only: in a Node/jsdom test environment pass a fake object whose
 * own-keys include the relevant prefixed key.
 *
 * Returns null when no fiber key is found.
 */
export function getFiberFromDom(node: Element): FiberLike | null {
  // Object.keys works on both real DOM nodes and plain fake objects.
  const keys = Object.keys(node);
  for (const key of keys) {
    if (FIBER_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (node as any)[key] as FiberLike;
    }
  }
  return null;
}

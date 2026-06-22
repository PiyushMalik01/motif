/**
 * ast-patch.ts — Plan 3: AST Write-Back
 *
 * Given a source file's text, a SourceLocation, and a MotionSpec, returns the
 * file text with Framer Motion applied to the targeted JSX element — preserving
 * all surrounding formatting — or a safe fallback.
 *
 * Technique: AST-offset string-splice. Parse with @babel/parser to find the
 * target node's exact character offsets, then splice minimally-edited substrings
 * into the ORIGINAL source string. Never reprints the whole file via @babel/generator.
 *
 * Safety: always re-parses the result before returning ok:true. Any parse failure
 * → discard and return fallback. The original is never mutated.
 */

import { parse as babelParse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { SourceLocation } from "./source-location";
import type { MotionSpec } from "./motion-spec";
import { specToMotionProps, specToCode } from "./spec-to-code";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PatchSuccess = { ok: true; code: string; summary: string };
export type PatchFallback = { ok: false; reason: string; suggestion: string };
export type PatchResult = PatchSuccess | PatchFallback;

// ---------------------------------------------------------------------------
// Motion prop names — used to detect/remove existing motion attributes
// ---------------------------------------------------------------------------

const MOTION_PROP_NAMES = new Set([
  "initial",
  "animate",
  "whileHover",
  "whileTap",
  "whileInView",
  "exit",
  "transition",
  "viewport",
  "variants",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse source with JSX+TS support; returns null on error. */
function tryParse(source: string) {
  try {
    return babelParse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch {
    return null;
  }
}

/**
 * Find the JSX opening element whose opening tag starts on `lineNumber`.
 * When multiple candidates share the line, pick the one closest to `columnNumber`.
 */
function findTargetOpening(
  ast: t.File,
  lineNumber: number,
  columnNumber: number
): t.JSXOpeningElement | null {
  let best: t.JSXOpeningElement | null = null;
  let bestColDist = Infinity;

  traverse(ast, {
    JSXOpeningElement(path) {
      const loc = path.node.loc;
      if (!loc) return;
      if (loc.start.line !== lineNumber) return;

      const colDist = Math.abs(loc.start.column - columnNumber);
      if (colDist < bestColDist) {
        bestColDist = colDist;
        best = path.node;
      }
    },
  });

  return best;
}

/**
 * Classify the JSX element name.
 * - "host" → e.g. `div`, `button`, `p`  (lowercase, plain identifier)
 * - "motion" → `motion.div` (member expression with object `motion`)
 * - "custom" → everything else (PascalCase, unknown member expr, etc.)
 */
type ElementKind = "host" | "motion" | "custom";

function classifyName(nameNode: t.JSXOpeningElement["name"]): { kind: ElementKind; tag?: string } {
  if (t.isJSXIdentifier(nameNode)) {
    const name = nameNode.name;
    // Lowercase first letter → host element
    if (name.length > 0 && name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase()) {
      return { kind: "host", tag: name };
    }
    // Uppercase → custom component
    return { kind: "custom" };
  }
  if (t.isJSXMemberExpression(nameNode)) {
    if (
      t.isJSXIdentifier(nameNode.object) &&
      nameNode.object.name === "motion" &&
      t.isJSXIdentifier(nameNode.property)
    ) {
      return { kind: "motion", tag: nameNode.property.name };
    }
    return { kind: "custom" };
  }
  return { kind: "custom" };
}

/**
 * Build the new opening tag text by:
 *  - Setting the tag name (motion.TAG)
 *  - Injecting specToMotionProps right after the tag name
 *  - Preserving non-motion attributes from original source
 *
 * `originalSource` is the full original file text (for slicing attribute text).
 */
function buildOpeningTag(
  originalSource: string,
  openingEl: t.JSXOpeningElement,
  motionTag: string,
  motionPropsStr: string,
  isSelfClosing: boolean
): string {
  // Non-motion attributes to preserve (slice from original source)
  const nonMotionAttrs: string[] = [];

  for (const attr of openingEl.attributes) {
    if (t.isJSXAttribute(attr)) {
      const attrName = t.isJSXIdentifier(attr.name) ? attr.name.name : String(attr.name);
      if (MOTION_PROP_NAMES.has(attrName)) continue; // drop existing motion props
      if (attr.start == null || attr.end == null) continue;
      nonMotionAttrs.push(originalSource.slice(attr.start, attr.end));
    } else if (t.isJSXSpreadAttribute(attr)) {
      // Preserve spread attributes
      if (attr.start == null || attr.end == null) continue;
      nonMotionAttrs.push(originalSource.slice(attr.start, attr.end));
    }
  }

  // Indent: detect the column offset of the opening tag
  const tagStart = openingEl.start ?? 0;
  // Walk backwards to find the start of the line
  let lineStart = tagStart;
  while (lineStart > 0 && originalSource[lineStart - 1] !== "\n") {
    lineStart--;
  }
  const tagIndent = " ".repeat(tagStart - lineStart);
  // Props are indented by tag indent + 2 spaces so they sit beneath the opening tag
  const propIndent = tagIndent + "  ";

  // Build the motion props with proper indentation
  // specToMotionProps returns newline-joined lines; indent each after the first
  const propLines = motionPropsStr.split("\n");
  const indentedProps = propLines
    .map((line, i) => (i === 0 ? line : propIndent + line))
    .join("\n");

  // Assemble opening tag: props and preserved attrs on their own lines,
  // each indented by propIndent
  const selfClose = isSelfClosing ? " />" : ">";
  const parts = [`<motion.${motionTag}`, indentedProps, ...nonMotionAttrs];
  return parts.join("\n" + propIndent) + selfClose;
}

/**
 * Find the matching JSX closing element for an opening element node.
 * We use the parent JSXElement's closing element.
 */
function findClosingElement(ast: t.File, openingEl: t.JSXOpeningElement): t.JSXClosingElement | null {
  let closing: t.JSXClosingElement | null = null;

  traverse(ast, {
    JSXElement(path) {
      if (path.node.openingElement === openingEl) {
        closing = path.node.closingElement;
      }
    },
  });

  return closing;
}

/**
 * Check if `motion` is already bound by a framer-motion import in the AST.
 * Returns true only if there is an ImportDeclaration from "framer-motion" that
 * binds `motion` — via default import, namespace import (`import * as motion`),
 * or a named specifier whose local name is `motion`.
 * A file with only `import { AnimatePresence } from "framer-motion"` returns false,
 * because `motion` is NOT in scope and `<motion.div>` would be a ReferenceError.
 */
function hasMotionBinding(ast: t.File): boolean {
  for (const node of ast.program.body) {
    if (!t.isImportDeclaration(node)) continue;
    const src = node.source.value;
    if (src !== "framer-motion") continue;
    for (const specifier of node.specifiers) {
      if (t.isImportDefaultSpecifier(specifier)) {
        // import motion from "framer-motion"
        if (specifier.local.name === "motion") return true;
      } else if (t.isImportNamespaceSpecifier(specifier)) {
        // import * as motion from "framer-motion"
        if (specifier.local.name === "motion") return true;
      } else if (t.isImportSpecifier(specifier)) {
        // import { motion } from "framer-motion"  (local name must be "motion")
        if (specifier.local.name === "motion") return true;
      }
    }
  }
  return false;
}

/**
 * Find the character offset immediately after the last import declaration.
 * Returns 0 if no imports found (prepend at start).
 */
function findAfterLastImport(ast: t.File): number {
  let lastEnd = 0;
  for (const node of ast.program.body) {
    if (t.isImportDeclaration(node) && node.end != null) {
      lastEnd = node.end;
    }
  }
  return lastEnd;
}

/**
 * Insert the framer-motion import after the last existing import in `source`.
 * If no imports, prepend.
 */
function insertImport(source: string, ast: t.File): string {
  const importLine = `import { motion } from "framer-motion";`;
  const afterLast = findAfterLastImport(ast);

  if (afterLast === 0) {
    // No imports — prepend
    return importLine + "\n" + source;
  }

  // Insert after the last import
  return source.slice(0, afterLast) + "\n" + importLine + source.slice(afterLast);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function patchSource(
  source: string,
  location: SourceLocation,
  spec: MotionSpec
): PatchResult {
  const fallback = (reason: string): PatchFallback => ({
    ok: false,
    reason,
    suggestion: specToCode(spec),
  });

  // Step 1: Parse source
  const ast = tryParse(source);
  if (!ast) {
    return fallback("source did not parse");
  }

  // Step 2: Find the target JSX opening element at the given line
  const opening = findTargetOpening(ast, location.lineNumber, location.columnNumber);
  if (!opening) {
    return fallback("no JSX element at that location");
  }

  // Step 3: Classify
  const { kind, tag } = classifyName(opening.name);
  if (kind === "custom") {
    return fallback("custom component — cannot safely rename to motion.*");
  }

  const motionTag = tag!; // "div", "button", etc.
  const isSelfClosing = opening.selfClosing;

  // Step 4: Build the new opening tag text
  const motionPropsStr = specToMotionProps(spec);
  const newOpeningText = buildOpeningTag(
    source,
    opening,
    motionTag,
    motionPropsStr,
    isSelfClosing
  );

  // Step 5: Splice the opening tag into the source
  if (opening.start == null || opening.end == null) {
    return fallback("AST node has no offset information");
  }

  let patched = source.slice(0, opening.start) + newOpeningText + source.slice(opening.end);

  // Step 6: Handle closing tag rename for host elements (non-self-closing)
  if (kind === "host" && !isSelfClosing) {
    // Re-parse the current state to find the closing tag's new offset
    // The closing tag in original source needs to be renamed
    // Find the closing element in the ORIGINAL ast
    const closingEl = findClosingElement(ast, opening);
    if (closingEl && closingEl.start != null && closingEl.end != null) {
      // The closing tag slices from original. But we've already spliced the opening.
      // Compute the offset shift: newOpeningText.length - (opening.end - opening.start)
      const delta = newOpeningText.length - (opening.end - opening.start);
      const newClosingStart = closingEl.start + delta;
      const newClosingEnd = closingEl.end + delta;
      const newClosingText = `</motion.${motionTag}>`;
      patched =
        patched.slice(0, newClosingStart) + newClosingText + patched.slice(newClosingEnd);
    }
  }

  // Step 7: Add framer-motion import if `motion` is not already bound.
  // We check the ORIGINAL ast for the binding — this correctly handles the case
  // where framer-motion is imported for other names (e.g. AnimatePresence) but
  // NOT for `motion` itself. Using a substring check was wrong: it returned true
  // for any framer-motion import, leaving `motion` undefined at runtime.
  if (!hasMotionBinding(ast)) {
    // Re-parse patched (post-JSX-splice) to get correct import positions.
    const patchedAst = tryParse(patched);
    if (!patchedAst) {
      // Fix 2: If the post-splice text fails to parse, bail out immediately.
      // Do NOT attempt hand-insertion into broken text with delta-adjusted offsets.
      return fallback("edit would not parse");
    }
    patched = insertImport(patched, patchedAst);
  }

  // Step 8: Safety re-parse
  const reparsed = tryParse(patched);
  if (!reparsed) {
    return fallback("edit would not parse");
  }

  return {
    ok: true,
    code: patched,
    summary: `Applied ${spec.trigger} motion to <${motionTag}> at line ${location.lineNumber}`,
  };
}

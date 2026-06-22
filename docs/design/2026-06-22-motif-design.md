# Motif — Design Spec (v0.1)

**Date:** 2026-06-22
**Status:** Approved design, pre-implementation
**Tagline:** *"The missing motion layer between design and code."*

---

## 1. Problem & Opportunity

Today's design→code tools (Onlook, Builder.io Fusion, v0, Figma Make) are good at turning
**static layout + styling** into code. The part they all handle poorly is what makes an
interface feel *alive*: **motion, micro-interactions, transitions, and gesture response.**

Designers can *prototype* feel in Figma, but it never becomes real code — the handoff is a
wall. Developers rebuild motion by hand and it comes out generic. AI tools guess at it from a
prompt and usually miss.

**Motif's wedge:** a dev-only tool that lets you design an element's *motion* by feel — AI
proposes it, you hand-tweak it on a live canvas — running over your **own real app**, and
writing **real Framer Motion code back into your actual source files**. No export gap: what
you feel *is* the code.

Deliberately narrow (motion only) so it can be 10× better than incumbents at the one thing
they ignore.

## 2. Core Architecture — Single Source of Truth

Everything hinges on one decision: there is **one typed source of truth, the `MotionSpec`**,
and every surface derives from it. The AI edits the spec; your hand-tweaks edit the spec; the
live preview and the generated code both render *from* the spec — so they can never drift.
That structural guarantee is what kills the export gap.

```
  click element        read __source         seed MotionSpec        edit (AI + hand)        write back
  in running app  ──►   (file/line/col)  ──►  from current motion ──►  (single source     ──►  AST patch
   [overlay]           [proven]               [easy]                   of truth)               [hard]
```

## 3. The Pipeline (and where difficulty lives)

1. **Overlay + click-to-select** *(proven technique).* A dev-only `<MotifInspector>` mounts
   over the running app. Clicking reads the React fiber's `__source` (stamped by React/Next's
   automatic dev JSX runtime) → exact file/line/column. Same mechanism as
   `react-dev-inspector` / `click-to-component`.
2. **Seed the `MotionSpec`** *(easy).* Read the element's current motion (if any) into the spec.
3. **Edit — two views, one engine** *(medium).*
   - **In-place:** tweak live in the running app.
   - **Isolate:** pop just that element into a focused canvas (Storybook-style).
   - AI proposes motion (tool call → edits spec); user hand-tweaks sliders / easing curve /
     spring. Re-prompting feeds the *current hand-tweaked spec* back to the AI — the
     bidirectional "UI talks back" loop.
4. **Write back** *(the hard part).* Parse the target `.tsx` (Babel/ts-morph), find the JSX
   node at the source location, apply motion: wrap in `motion.X` or merge
   `initial/animate/whileHover/variants/transition` props, add the import.

## 4. The `MotionSpec` (v0.1 schema — one element)

- **trigger:** `mount | hover | tap | inView`
- **transition:** `type: spring | tween`; spring → `stiffness | damping | mass`;
  tween → `duration | ease`; plus `delay`
- **from / to:** animated props — `opacity | x | y | scale | rotate`
- **target:** resolved source location (file, line, column) + element tag

Deliberately tiny: enough for satisfying motion, small enough to finish. Validated with Zod.

## 5. Components / Panels

1. **Prompt bar** — natural language → AI edits spec.
2. **Live stage** — element actually animating via real `motion.div`; replay button.
3. **Inspector** — sliders (stiffness/damping/delay), easing-curve editor, trigger dropdown;
   editing these edits the spec by hand.
4. **Code panel** — live, syntax-highlighted, copy-paste-able real Framer Motion generated
   from the spec ("what you feel is the export").

## 6. Honest Scoping of the Write-back

Full AST write-back for every real-world JSX shape is a long-tail problem. v0.1 does NOT
pretend to finish it:

- **Robust for common cases:** plain DOM elements (`<div>`, `<button>`, `<li>`) and simple
  already-`motion` elements — covers most real motion targets.
- **Graceful fallback:** if the node is too complex to patch safely, show the exact diff to
  apply by hand and explain why. **Never silently corrupt a file.** Expanding this coverage is
  the post-v0.1 roadmap.

## 7. Prior Art & Attribution

Motif builds on techniques from open-source tools in this space — notably **Onlook**
(Apache-2.0) for DOM→source mapping and AST write-back, and the `__source` JSX instrumentation
used by **react-dev-inspector**. We study and adapt *specific, isolated* techniques rather than
forking wholesale; any reused code preserves its original license and attribution.

What is **original to Motif** (not found in those tools): the `MotionSpec`, the motion editor
(spring/easing/trigger controls), and the AI-proposes-then-you-tweak-back bidirectional loop.

## 8. Stack

- **Next.js + React + TypeScript**
- **Tailwind** + a few **shadcn/ui** components for editor chrome
- **Framer Motion** ("Motion") — both the runtime *and* the export target
- **Vercel AI SDK** — provider-agnostic; can wire an OpenAI, Anthropic, or other model key
- **AST:** `@babel/parser` + `ts-morph` for write-back
- Overlay leans on React's existing dev `__source` instrumentation

## 9. Scope

**IN (v0.1):** dev overlay, click-to-select with source resolution, in-place + isolate views,
AI→spec, hand-tweak→spec, live preview, re-prompt (bidirectional) loop, real write-back for
common cases + honest fallback.

**OUT (roadmap):** multi-element timelines & orchestration, full arbitrary-JSX write-back
coverage, non-Framer targets (CSS/GSAP), accounts/cloud/persistence, team features.

## 10. Testing

Unit-test the pure, guarantee-bearing functions:
- `MotionSpec` schema validation
- `specToCode` (spec → Framer Motion code string)
- AST patcher (source `.tsx` + spec → expected patched `.tsx`), including that complex cases
  trigger the fallback and never produce a bad write.

UI verified by running the app.

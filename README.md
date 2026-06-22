<div align="center">

# Motif

### The missing motion layer between design and code.

Design an element's motion by feel — AI proposes it, you hand-tweak it on a live canvas —
running over your **own real app**, writing **real animation code back into your source files**.

No export. No copy-paste. What you feel *is* the code.

> 🚧 **Status: early development (v0.1 in progress).** The engine + a working editor exist and
> build; live in-browser selection and AI model calls need local setup. Building in the open.

</div>

---

## The problem

Today's design-to-code tools are good at turning **static layout and styling** into code.
The part they all handle poorly is what makes an interface feel *alive*: **motion,
micro-interactions, transitions, and gesture response.**

Designers prototype "feel" in Figma, but it never becomes real code — the handoff is a wall.
Developers rebuild motion by hand and it comes out generic. AI tools guess at it from a prompt
and usually miss.

## The idea

Motif is a **dev-only tool you bring over your own React app**:

1. **Point** at any element in your running app — Motif resolves it to its exact source.
2. **Design its motion** — describe it in plain language and the AI proposes it; then
   hand-tweak the spring, easing, and timing on a live canvas until it feels right.
3. **It's already your code** — Motif writes real [Framer Motion](https://motion.dev) back
   into your actual source file. There is no export step.

The whole thing is built around one guarantee: a single typed **`MotionSpec`** is the source
of truth, and the live preview *and* the generated code both derive from it — so they can
never drift apart.

## How it works (at a glance)

```
  click element        resolve source        edit motion             write back
  in your app    ──►   (file/line/col)  ──►  (AI + hand-tweak)  ──►   to your .tsx
```

## What works today

The full v0.1 spine is built and tested (89 passing tests; `next build` green):

- **`MotionSpec` engine** — the typed single source of truth, with a deterministic
  `specToCode` generator (`src/core`).
- **Source resolution** — resolve a clicked element to its `{file, line, column}` via React's
  dev `__source`, plus a dev overlay (`MotifInspector`).
- **AST write-back** — `patchSource` wraps/merges real Framer Motion into a target JSX element,
  preserving formatting, with a safe "show the snippet instead" fallback that never corrupts a
  file (the written code is byte-identical to the preview).
- **Editor app** at `/editor` — prompt bar, live preview, inspector (spring/trigger), and code
  panel over one shared spec; plus `/api/motif/spec` (AI edits the spec) and a dev-only
  `/api/motif/write` (patches the real file, confined to the project root).

Run it: `npm install && npm run dev`, then open `/editor`. Set `OPENAI_API_KEY` (see
`.env.example`) for the AI prompt; the inspector, preview, and code panel work without a key.

## Roadmap

**Next:** in-browser click-to-edit wired end-to-end · broader AST write-back coverage ·
multi-element timelines & orchestration · non-Framer targets (CSS / GSAP) · persistence.

## Tech stack

Next.js · React · TypeScript · Tailwind CSS · Framer Motion · Vercel AI SDK (provider-agnostic).

## Prior art & attribution

Motif builds on techniques pioneered by open-source tools in this space — notably
[Onlook](https://github.com/onlook-dev/onlook) (Apache-2.0) for DOM-to-source mapping and
AST write-back, and the `__source` JSX instrumentation used by
[react-dev-inspector](https://github.com/zthxxx/react-dev-inspector). Any reused code will
preserve its original license and attribution.

## License

Licensed under the **Apache License 2.0** — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
Copyright © 2026 Piyush Malik.

## Contributing

This is early and moving fast — see [CONTRIBUTING.md](./CONTRIBUTING.md). Design docs live in
[`docs/design`](./docs/design).

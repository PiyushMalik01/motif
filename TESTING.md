# Testing Motif

## 1. Run the test suite

```bash
npm install
npm test          # 89 tests: node (core/AST/API) + jsdom (UI) — should be all green
npx tsc --noEmit  # type-check, should be clean
npm run build     # production build, should compile
```

## 2. Try the editor in the browser

```bash
npm run dev
```

Open **http://localhost:3000/editor**.

**Works without any API key:**
- **Inspector** — change the *Trigger* (mount/hover/tap/inView), drag *Stiffness/Damping/Delay*,
  edit the *To/From* target props. Watch the **Generated Code** panel update live — that's the
  single `MotionSpec` source of truth driving the codegen.
- **Live Preview** — the purple card animates with your spec; **Replay** remounts it.
- Switching trigger to `hover` flips the code from `animate=` to `whileHover=`; `inView` adds
  `viewport={{ once: true }}`.

**Needs an API key (AI prompt):**
1. Put your key in `.env.local`: `OPENAI_API_KEY=sk-...` (see `.env.example`).
2. Restart `npm run dev`.
3. Type an instruction in the prompt bar (e.g. *"make it spring in from the bottom and lift on
   hover"*) and click **Apply AI**. The model returns a new `MotionSpec` (validated against the
   Zod schema) and every panel updates. Re-prompting sends your *current* spec back — the
   bidirectional loop.

## 3. Test the real file write-back (the core trick)

The dev-only `POST /api/motif/write` patches a real `.tsx` file (confined to the project root).
Create a throwaway file and watch Motif edit it:

```bash
# 1. make a target file at the project root
printf 'export function Card() {\n  return <div className="card">Hi</div>;\n}\n' > sample.tsx
```

```bash
# 2. ask Motif to write motion into the <div> on line 2
curl -s http://localhost:3000/api/motif/write \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "sample.tsx",
    "location": { "fileName": "sample.tsx", "lineNumber": 2, "columnNumber": 9 },
    "spec": {
      "trigger": "mount",
      "from": { "opacity": 0, "y": 20 },
      "to": { "opacity": 1, "y": 0 },
      "transition": { "type": "spring", "stiffness": 300, "damping": 20 }
    }
  }'
```

Now open `sample.tsx` — the `<div>` is now `<motion.div … initial=… animate=… transition=… >`
with a `framer-motion` import added, and the code matches exactly what the editor's code panel
shows. Pointing at a custom component (e.g. `<Card>`) instead returns a `suggestion` and leaves
the file **untouched** — the safety guarantee.

Safety checks worth trying: a `filePath` with `..` (escaping the root) or a non-`.tsx` file
both return `400` and write nothing.

## 4. The in-browser overlay (manual)

On `/editor`, click **Enable Inspect** and click page elements to exercise the `MotifInspector`
overlay. Resolving a clicked element to its source needs React's dev `__source` instrumentation;
this is the part still being wired end-to-end (see the README roadmap).

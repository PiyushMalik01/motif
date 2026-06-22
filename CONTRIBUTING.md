# Contributing to Motif

> ⚠️ Motif is in **early development** and the codebase is moving fast. Issues and
> discussion are welcome; please open an issue before large changes.

Licensed under **Apache-2.0** (see [LICENSE](./LICENSE)). By contributing, you agree your
contributions are licensed under the same terms.

## Project shape

- **`docs/design/`** — design specs. Start here to understand what we're building and why.
- **`src/core/`** — the pure, headless engine (the `MotionSpec` schema and code generator).

## Core principles (please follow these)

1. **`MotionSpec` is the single source of truth** — the live preview and the generated/written
   code both derive from it and must never diverge. That guarantee is the whole product.
2. **Keep the core pure** — modules in `src/core/` have no React, filesystem, or network
   dependencies, so they stay independently testable in plain Node.
3. **File safety is sacred** — the write-back feature edits real source files; it must never
   silently corrupt one. When an automated edit is uncertain, fall back to showing a diff for
   manual review and explain why. A correct refusal beats a wrong edit.
4. **Keep the repo clean** — no secrets, no personal/editor files, no junk on `master`.
   Use `.env.local` (gitignored) for keys; never commit credentials.
5. **Third-party reuse stays clean** — when reusing open-source code, preserve its license and
   attribution and note modifications (see [NOTICE](./NOTICE)).

## Conventions

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **TypeScript strict**, small focused modules, clarity over cleverness.
- **Test-driven**: unit-test the pure core (`MotionSpec` validation, `specToCode`, and — once
  it lands — the AST patcher) before claiming it works.

## Setup

```bash
npm install
npm test        # run the unit suite
npm run dev     # start the Next.js dev server
```

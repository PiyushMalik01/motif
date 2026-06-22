# Contributing to Motif

> ⚠️ Motif is in **early development** and the codebase is moving fast. A license has not yet
> been chosen, so outside contributions are not formally being accepted *yet*. This guide
> documents how the project is built so it's ready when that changes.

## Project shape

- **`docs/design/`** — design specs. Start here to understand what we're building and why.
- **`CLAUDE.md`** — the rules every contributor (human or AI) follows. Read it first.

## Development principles

1. **`MotionSpec` is the single source of truth** — the preview and the generated code both
   derive from it and must never diverge.
2. **File safety is sacred** — write-back must never silently corrupt a user's source file;
   fall back to a manual diff when unsure.
3. **Keep the public repo clean** — no secrets, no personal/dev-only files, no junk on `main`.
   Anything private goes in a gitignored `*.private.md` file.

## Conventions

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **TypeScript strict**, small focused modules, clarity over cleverness.
- Unit-test the pure core (schema validation, `specToCode`, AST patcher) before claiming it works.

## Setup

_Coming with the v0.1 scaffold._ Will be the standard `npm install` + `npm run dev`.

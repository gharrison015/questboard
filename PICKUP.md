---
title: QuestBoard pickup
updated: 2026-11-01
status: v1 built on branch build/v1, final review in progress, not yet merged or deployed
---

# QuestBoard pickup

## Where things stand (2026-11-01)

- The real app lives in `app/` (Vite + React 19 + TypeScript, local-first, IndexedDB event ledger). 18 plan tasks are complete on branch `build/v1`, each task-reviewed and fixed. 257 unit tests, 42 Playwright flows across iPhone, Pixel, iPad, fold and TV sizes.
- The old prototype is frozen under `prototype/` and served at `/prototype/` with a self-unregistering service worker.
- Deploy is GitHub Actions to Pages (`.github/workflows/pages.yml`). The Pages source must be switched from "branch main /" to "GitHub Actions" before the first deploy, or the new root `index.html` (now under `app/`) will 404.

## Next steps, in order

1. Read the final whole-branch review result in `.superpowers/sdd/2026-11-01-questboard-v1/progress.md` (ledger) and fix anything it blocks on.
2. Push `build/v1`, merge to `main` (fast-forward), switch Pages to Actions (`gh api -X PUT repos/gharrison015/questboard/pages -f build_type=workflow`), watch the run, verify https://gharrison015.github.io/questboard/ shows the setup wizard and `/prototype/` still loads.
3. Install on the kitchen tablet, run setup for Nolan and Makenna, write down the recovery code.
4. Next round candidates: Supabase sync (adapter boundary is in `app/src/storage/adapter.ts`), Capacitor wrappers, real billing (RevenueCat), run-setup-again from Settings, caregiver invites, sticker equipping, per-element import validation.

## Commands

- `cd app && npm run dev` (demo data at `?demo=1`, parent PIN 1234, DEV only)
- `npm run check` (tests, contrast gate, build)
- `NODE_PATH="$(npm root -g)" npx playwright test` (e2e against the production preview)
- `node e2e/shots.mjs http://localhost:4173/questboard/` (108 screenshots to `e2e/shots/`)

## Rulings made during the build

See `docs/decisions.md` for the product decisions and the ledger for the 21 orchestrator rulings (money step, verify precedence, grouped undo, kid-slot keys, TV sizing and others).

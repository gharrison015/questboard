---
title: QuestBoard pickup
updated: 2026-11-03
status: v1 shipped 2026-11-01, live at https://gharrison015.github.io/questboard/
---

# QuestBoard pickup

## Where things stand (2026-11-01)

- The real app lives in `app/` (Vite + React 19 + TypeScript, local-first, IndexedDB event ledger). 18 plan tasks plus a whole-branch review fix wave are merged to `main`. 293 unit tests (including a money-conservation property test), 42 Playwright flows across iPhone, Pixel, iPad, fold and TV sizes. The build ledger with all 31 rulings is `docs/superpowers/2026-11-01-v1-build-ledger.md`.
- The old prototype is frozen under `prototype/` and served at `/prototype/` with a self-unregistering service worker.
- Deploy is GitHub Actions to Pages (`.github/workflows/pages.yml`); Pages is set to build from Actions. Every push to `main` runs tests, the contrast gate and the build, then deploys.

## Added 2026-11-03

- Device Lab: the real app in phone, tablet, fold, web and TV frames with a device picker, rotate, side by side and a sandbox that never touches family data. `cd app && npm run dev` opens it; in Claude Code desktop start "QuestBoard Device Lab" in the preview pane. After merge: https://gharrison015.github.io/questboard/devlab/. Guide: `docs/launch/device-lab.md`.
- Launch plan: `docs/launch/app-store-and-payments.md` (Apple and Google accounts, name, kids rules, Capacitor, RevenueCat) and `docs/launch/backend-scale.md` (Supabase schema, sync, capacity).
- Lab findings to fix next: a 1280 px laptop with no touch gets the TV board; iPhone SE sideways hides chores; `data-fold` is detected but has no CSS, so a spanned dual screen puts the hinge over the chore list.

## Next steps, in order

1. Install on the kitchen tablet (Add to Home Screen), run setup for Nolan and Makenna, write down the recovery code. Pin a monitor to `#tv` if wanted.
2. Deferred minors from the final re-review: `PaydayPanel.closeCurrentWeek` computes outside the store queue (money-neutral); the cross-tab channel handler is live before the first load commits; a cross-tab erase leaves `parentUnlockedAt` set in the other tab.
3. Next round candidates: Supabase sync (adapter boundary is in `app/src/storage/adapter.ts`), Capacitor wrappers, real billing (RevenueCat), run-setup-again from Settings, caregiver invites, sticker equipping, per-element import validation.

## Commands

- `cd app && npm run dev` (opens the Device Lab; demo data at `?demo=1`, parent PIN 1234, dev server or lab sandbox only)
- `npm run check` (tests, contrast gate, build)
- `NODE_PATH="$(npm root -g)" npx playwright test` (e2e against the production preview)
- `node e2e/shots.mjs http://localhost:4173/questboard/` (108 screenshots to `e2e/shots/`)

## Rulings made during the build

See `docs/decisions.md` for the product decisions and the ledger for the 21 orchestrator rulings (money step, verify precedence, grouped undo, kid-slot keys, TV sizing and others).

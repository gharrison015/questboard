# QuestBoard

Kids chore, behavior and money app for the Harrison family, built to release free with paid extras later. Teaches responsibility, money consequences, and Save / Spend / Give.

## Layout

- `app/` Vite + React + TypeScript app (the real build). `npm run dev`, `npm test`, `npm run build`.
- `prototype/` frozen June 2026 single-file prototype. Reference only, do not extend.
- `docs/superpowers/specs/` design specs. Current: `2026-11-01-questboard-v1-design.md`.
- `docs/superpowers/plans/` implementation plans.
- `docs/decisions.md` running decision log (what Greg decided, when, why).
- `ART_BRIEF.md` mascot art direction and prompts. Masters in `art-masters/` (untracked, large).

## Rules

- Public repo `gharrison015/questboard`, deployed to GitHub Pages by Actions on push to `main`. Never commit secrets.
- Money is integer cents everywhere. Balances are derived from the event ledger, never stored.
- Every parent action sits behind the PIN. Kids check, split coins, and look.
- Original IP only for buddies. No trademarked characters.
- Copy rules: no arrow characters, no em dashes, no AI-tell filler. Run `~/Claude/scripts/slop-scan.sh app/src docs` before pushing.
- Visual rules: icon plus label on every tab, 4.5:1 contrast, 48px tap targets, emoji only as content.
- Verify visually with Playwright screenshots at phone, tablet, fold and TV sizes before calling anything done.

## State

See `PICKUP.md` at the root for the latest status.

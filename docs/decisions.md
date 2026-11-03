# QuestBoard decision log

Newest first. Each entry: date, decision, why. The spec holds the full design; this is the story of how it got there.

## 2026-11-03

- **Device Lab for testing in Claude Code.** Greg wants to play with the app beside the chat on iPhone, iPad, fold, Android, web and TV frames. Built as a developer page at `/questboard/devlab/` (dev server root opens on it; `.claude/launch.json` starts it in the desktop preview pane). Framed copies run in a separate `questboard-lab` database so testing never touches family data. Kept out of the offline cache. How-to in `docs/launch/device-lab.md`.
- **Store launch plan written, not started.** `docs/launch/app-store-and-payments.md`: enroll as an LLC (recommended), choose the final name before the bundle id exists, Capacitor wrapper, RevenueCat on store billing, server-owned entitlements. Open decisions for Greg: individual or LLC, Kids category or Lifestyle, final name.
- **Backend design for scale.** `docs/launch/backend-scale.md` expands spec section 9 with a schema, the sync protocol (server `seq` cursor, idempotent ULID inserts), capacity math to 5M families and week snapshots plus archiving to keep storage in check.

## 2026-11-01

- **Prototype worker takeover.** Devices that ran the June prototype kept showing it after v1 deployed: its cache-first worker served the old page, and the new worker waited for a prompt the old page could not show. The new worker now takes over at once when it finds the prototype cache, deletes it and reloads open windows. Normal updates keep the prompt.
- **Amazon devices are supported sizes.** Echo Show 5 (960x480) and Fire 7 (1024x600) joined the browser test sizes. The hero buddy now shrinks with screen height so short landscape screens keep the money math and jars in view.
- **v1 shipped 2026-11-01 (main cf6c127, Pages from Actions).** Final review added rulings that now define the money rules: a changed week start applies from the next boundary after the last closed week (short spans prorate the start amount); one live close per kid and week; Undo is hidden on a coin move or gift once money left that jar, Redo is hidden when it would overdraw; the latest verify or reject decides a chore regardless of later kid checks and a rejected row is read-only for the kid; a Reading earn-back confirm is a one-time PIN check, not a session; the PIN gate has Forgot PIN (recovery code) and a two-step Erase with a countdown, both under the lockout; chores are soft-deleted so earned pay survives; weeks close when the boundary passes, not only on app load.
- **3D lift on buddies and emoji (Greg, mid-build).** Soft drop shadows on buddy images, avatar chips and content emoji; idle float on the hero buddy, a hop on chore check or kid switch, a pop when a badge is earned. All off under reduced motion.
- **Build the real app now, local-first.** Greg wants a production-feeling app Nolan can use this week. Cloud sync (Supabase) is the next round; the storage adapter boundary is designed in now.
- **Vite + React + TypeScript, not Next.js.** No server exists yet, so Next adds nothing; Supabase works client-side with RLS when it arrives. Orchestrator's call.
- **Money style = Both by default**, with Keep it and Earn it as presets on one engine (start amount, pay per chore, deduction). Resolves the Greg (countdown) versus Amanda (earn from zero) debate: expected chores are unpaid, extra jobs pay, misbehavior deducts.
- **Cents precision.** Deductions, pay and start amounts accept 25¢ and 50¢. Store integer cents.
- **Chore verification is a setting**, default "Kid checks, parent can verify."
- **Payday closes automatically** on the week-start day; parent can close early. Unsplit coins wait, never auto-bank.
- **Kid sees the reason for a deduction** by tapping the day. Reason list is custom.
- **Earn it back stays**, library for Pre-K through 2nd grade, parent confirms reading.
- **TV board = kids only, auto-rotate**, clock in the corner. Family Display style calendar and weather deferred.
- **Pricing placeholders**, flippable in one config file. Free tier: 2 profiles, 10 chores.
- **Hosting stays on GitHub Pages** at the same URL; prototype moves to `/prototype/`.
- **Kids switch profiles freely**; only parent actions need the PIN.
- **Extras in this round:** streaks and badges, photo avatars. Deferred: full parent history log, notifications.
- **Appearance is a setting** (Bright default, Calm, Dark). Greg found the dark prototype hard to read on Nolan's board.
- **Shop moves to the parent view.** Kids see only the buddies they own.

## 2026-06-28 (prototype round)

- Chores are checklists, only misbehavior moves money (superseded 2026-11-01 by the three-dial engine).
- Earn then decide: surviving money becomes coins the kid splits across Save, Spend, Give. Give can go to a charity or a sibling.
- Deep links only for money movement; the app never holds funds.
- Pluggable per-profile themes with original IP mascots generated through nano-banana-2 (Pixar style). Nolan = Monster Truck, Makenna = Unicorn.
- Day strip shows money as plain numbers; the arithmetic is written out to teach it.
- Refined game HUD design system; fit to one phone screen; KPI hero card.
- Monetization layer prototyped: themes by tier, sticker packs, Family Pro, parent PIN gate.
- Deployed as a PWA on GitHub Pages.

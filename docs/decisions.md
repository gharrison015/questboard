# QuestBoard decision log

Newest first. Each entry: date, decision, why. The spec holds the full design; this is the story of how it got there.

## 2026-11-01

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

---
title: QuestBoard v1 Design
project: QuestBoard
doc_type: design-spec
status: approved-for-planning
created: 2026-11-01
owner: Greg Harrison
tags: [questboard, design, spec, v1, kids, chores, money]
---

# QuestBoard v1 Design

## 1. Intent

QuestBoard is a family chore, behavior and money app for young kids (Pre-K through about 3rd grade). It replaces the June 2026 single-file prototype (`prototype/index.html`, live at https://gharrison015.github.io/questboard/) with a real, installable app the Harrison family uses daily, built so it can be released free to the public with paid extras later.

The lesson the app teaches, in order of importance:

1. **Responsibility.** Chores and routines happen every day and the kid owns checking them off.
2. **Money has consequences.** Behavior and effort change how much the kid ends up with, and the arithmetic is shown plainly so the kid learns it.
3. **Earn, then decide.** Whatever survives the week becomes coins the kid splits across Save, Spend and Give. The child choosing the split is the point. Give can go to a charity or to a sibling.

First users: Nolan (1st grade, Monster Truck buddy) and Makenna (Pre-K, Unicorn buddy), on a kitchen tablet, Greg's and his wife's phones, and eventually a wall monitor like the Family Display at Greg's mom's house.

## 2. Goals, non-goals, anti-goals

**Goals (this round)**

- One codebase that installs and lays out well on iPhone (portrait), iPad (landscape and portrait), the folding iPhone (two panes), Android phones and tablets, and a TV or monitor (landscape, 10-foot, read-only).
- Fully custom chores, routines, misbehavior reasons, money settings and profiles. Parent setup in under five minutes.
- Three money styles on one engine (Keep it, Earn it, Both) with cents precision.
- Local-first persistence so the app works offline and survives refresh, with a sync adapter boundary so Supabase can be added next round without rewriting.
- Parent PIN on every parent action. Kid can only check things off, split coins, and look.
- New visual system: bright and playful by default, with Calm and Dark appearance options, every text/background pair at 4.5:1 or better.
- Entitlement layer with free limits (2 profiles, 10 chores) and flippable paid unlocks, honored on-device for now.
- Earn-it-back skill library for Pre-K, K, 1st and 2nd grade.
- Streaks and a real badge rule set. Photo avatars.
- TV board that auto-rotates through kids.
- Tests on the money engine and ledger; Playwright screenshots of every mode at every target size.

**Non-goals (this round)**

- Cloud accounts, multi-device sync, caregiver invites that actually send. The UI for Family & Access remains, labeled "coming with sync".
- Real purchases or store submission. Prices live in one config file; the parent gate "buys" on-device.
- Calendar, weather, photos on the TV board (Family Display style).
- Parent history log beyond what undo needs (Greg deferred it; see 7.9).
- Push or local notifications.
- Real-money movement. Pay and Give remain deep links that open the other app pre-filled; QuestBoard never holds funds.

**Anti-goals (would make it a failure even if it worked)**

- A kid can undo a deduction, award themselves money, or reach parent settings without the PIN.
- The app reads as "AI slop": card grids for their own sake, pill badges everywhere, gradient-on-everything, emoji as chrome, arrow characters or em dashes in copy.
- Text a Pre-K child cannot navigate without reading (tabs must carry icons and color).
- Low-contrast text anywhere a kid or parent reads a number.
- A build that only works on the one device it was tested on.

## 3. Constraints

- Public GitHub repo `gharrison015/questboard`, deployed to GitHub Pages at the same URL. No secrets in the repo, ever.
- Free tiers only. No paid services this round.
- Original IP only: buddies are the 12 generated mascots in `prototype/assets/` (masters in `art-masters/`, regenerate with the nano-banana-2 pipeline per `ART_BRIEF.md`). No trademarked characters.
- Writing rules from `~/CLAUDE.md`: no arrow characters, no em dashes, no AI-tell filler in any copy, comment or doc.
- Node 20, npm. Playwright is globally installed (`NODE_PATH="$(npm root -g)"`).
- Kid data (names, behavior) is parent-entered under the parent's control; the app never asks a child for personal information. State this in the privacy copy.

## 4. How it gets made (decided)

- **Vite + React 18 + TypeScript**, strict mode. No Next.js this round; nothing server-side exists yet, and Supabase JS runs client-side with RLS when it arrives.
- **State:** a single `Family` document plus an **append-only event ledger**. Balances, jars, streaks and badges are derived, never stored as truth. Reducers are pure functions in `src/engine/` with Vitest coverage.
- **Persistence:** IndexedDB via `idb` (small, no ORM). A `StorageAdapter` interface (`load`, `append(events)`, `saveFamily`, `subscribe`) with `LocalAdapter` now and a documented `SupabaseAdapter` stub next round. Export and import of the whole family as JSON from Settings (also the backup story until sync exists).
- **Styling:** CSS modules or plain CSS with custom properties. No Tailwind, no component library. Design tokens in one file (`src/styles/tokens.css`), themed by `data-appearance` (bright, calm, dark) and `data-buddy` (the 12 buddies).
- **Routing:** none needed beyond mode and tab state; keep URL hash for mode override (`#tv`, `#parent`) so a monitor can be pinned to TV mode.
- **PWA:** `vite-plugin-pwa` with a stale-while-revalidate shell (never cache-first on `index.html` again), precached mascots and fonts. Fonts self-hosted in `public/fonts/` (Fredoka for display, Nunito for body, woff2 only).
- **Capacitor-ready:** no browser-only APIs without a guard, no `window.open` for deep links (use anchor tags), safe-area insets everywhere. Actual Capacitor wrapping is a later round.
- **Deploy:** GitHub Actions on push to `main` builds `app/` and deploys to Pages. The old prototype is served at `/prototype/`.
- **Repo layout:** move the git root from `prototype/` to `questboard/` preserving history. `app/` holds the Vite project; `prototype/` stays as the frozen reference; `docs/` holds specs, plans and the decision log; `art-masters/` stays untracked (too large).

## 5. Layout and modes

Mode is derived from viewport and pointer, overridable from Settings or URL hash.

| Mode | When | Layout |
|---|---|---|
| **Phone** | width < 700px | Single column, bottom tab bar (icon + label, 5 tabs max), kid switcher as a horizontal avatar strip under the header, swipe left/right between kids. Parent view reached by a PIN-gated button in the header. |
| **Tablet** | 700px to 1279px, or any touch device at 1280px+ | Two-pane when landscape: left pane is the kid hero (buddy, balance, math line, Save/Spend/Give), right pane is the active tab. Portrait collapses to the phone layout with a wider grid. Side rail of kid avatars when 3+ kids. |
| **Fold** | tablet rules; detect `(horizontal-viewport-segments: 2)` | Left segment hero, right segment content, never put a control under the hinge. |
| **TV** | width 1280px+ and no coarse pointer, or `#tv` | Read-only. Rotates kids every 20 seconds with a progress dot row. Clock and date top right. Typography sized for 10 feet (minimum body 28px at 1080p). No tab bar, no buttons. |

Every mode fits the first screen without scrolling for the default content (5 chores, 3 routines). Longer lists scroll inside their panel, never the whole page. Safe-area insets respected on every edge. Pinch zoom is allowed (`maximum-scale` removed).

Kid switching: swipe anywhere on the kid board, tap an avatar in the strip or rail, or pull down from the header to open a full-screen switcher (handy for five kids). The parent view keeps the same kid context: switching kids in parent view does not change the tab or scroll position.

## 6. Visual system

**Appearance setting** (per device, parent can change in Settings; default Bright):

- **Bright:** tinted off-white background per buddy (for example Monster Truck is warm cream with a soft orange wash, Unicorn is pale lavender), white cards with a soft shadow, ink #1b1f3a, saturated buddy accent on numbers and the active tab. Large radii (20 to 28px), generous spacing, celebration confetti in buddy colors.
- **Calm:** white background, light gray cards, color only on the buddy image, balance and the active state. Thin rules instead of shadows. Closest to the Family Display look.
- **Dark:** the current night-sky HUD rebuilt for contrast: cards at least 12 percent lighter than the background, ink #f4f6ff, secondary text no darker than #b9c0ea, accent glows reduced. TV mode defaults to Dark after sunset (local clock), Bright otherwise, unless pinned.

**Rules**

- Every text/background pair at 4.5:1 minimum (3:1 for text over 24px bold). A contrast check script runs in CI over the token file for all 36 appearance by buddy combinations.
- Tabs and section headers always show icon plus label. Tab icons are filled when active. Tap targets 48px minimum on phone and tablet.
- Emoji appears only as content (behavior reasons, badge art), never as chrome. Icons are the existing inline SVG set, extended as needed.
- One section header component. One card component. One button component with `primary`, `quiet`, `danger` variants.
- Money is always shown as numbers; the buddy's unit word (fuel, sparkles) appears only in celebration and flavor copy.
- Mascot images: `object-fit: contain`, never overlapping text. Give the Shop card a fixed art box with padding.
- Motion: entrance animation runs once per screen change, not on every state update. Respect `prefers-reduced-motion`.

## 7. Functionality

### 7.1 Family setup (first run)

Steps, each one screen, skippable with sensible defaults: family name, parent PIN (4 to 6 digits, confirmed), add kids (name, grade, buddy, optional photo), money style preset, starter chores (a checklist of 12 common chores to tick), starter routines (Morning, Bedtime on by default). Ends on the kid board. Re-runnable from Settings.

### 7.2 Profiles

Up to the entitlement limit (free: 2). Fields: name, grade (Pre-K, K, 1st, 2nd, 3rd+), buddy theme, optional photo avatar (stored as a resized 256px data URL in IndexedDB), per-kid charity name and link, per-kid money overrides (optional; default inherits family). Reorder by drag in parent view. Archive rather than delete (ledger history stays).

### 7.3 Chores

Per kid. Fields: label, icon (from a small picker of about 24 chore icons), days of week, pay amount in cents (0 means expected), active flag. Free limit: 10 active chores per family. Completion is per kid per chore per date, recorded as `chore.checked` and `chore.unchecked` events. Verification setting (family-wide, default "Kid checks, parent can verify"):

- **Kid checks, parent can verify:** check is final for the checklist; if the chore pays, the pay posts when a parent verifies or automatically at the day's close (local midnight) if the parent did not touch it. Parent view shows a count of unverified paid checks with one-tap verify-all.
- **Kid checks, final:** pay posts immediately.
- **Parent approves each:** check is pending until a parent approves (PIN); pay posts on approval; pending checks render as half-filled boxes.

### 7.4 Routines

Reusable library per family (Morning, Bedtime, Nighttime seeded). Each routine has ordered steps and a schedule (every day, or chosen days). Assigned to kids. Steps are checklists only, never money. Completion resets daily.

### 7.5 Money engine

All amounts are integer cents. Per family (overridable per kid):

- `startAmount` (cents, default 1000 for Both, 2000 for Keep it, 0 for Earn it)
- `deductionDefault` (cents, default 50; 0 disables deductions)
- `chorePayDefault` (cents applied when adding a new paid chore; 0 for Keep it)
- `weekStartDay` (0 to 6, default Sunday)
- `floorAtZero` (true; balance never negative)
- `earnBackEnabled` (true), `earnBackPerCorrect` (100)

Presets just set these numbers: **Keep it** (2000, 100, 0), **Earn it** (0, 0, 100), **Both** (1000, 50, 100). Settings shows the preset chips and the three dials with a live example line.

Weekly balance for a kid = `startAmount + sum(chore pay posted this week) + sum(earn-back this week) - sum(deductions this week)`, floored at zero. Earn-back is capped so the week never exceeds `startAmount + chore pay posted` (you can win back only what you lost).

Math line on the kid board adapts to which terms are nonzero:

- Keep it: `$20.00 − $1.50 = $18.50`
- Earn it: `$0 + $8.00 = $8.00`
- Both: `$10.00 + $4.00 − $0.50 = $13.50`

Show cents only when any term in the week has cents. Secondary line lists the terms: "Lost: $0.50 + $1.00 (Wed yelling, Fri not listening)".

### 7.6 Deductions

Parent action, PIN-gated. Family reason list, fully editable (label, emoji, amount override). Seeded with the six prototype reasons. Each deduction is a `deduction.logged` event with reason id, amount, kid, date. Kid board day strip shows the net for each day; tapping a day opens that day's detail with the reasons listed by label. Undo available in parent view for any event in the current week.

### 7.7 Payday and jars

On the first app open on or after the week-start day, every kid's prior week closes: a `week.closed` event converts the balance into unsplit coins. Parent can close early from parent view. The kid splits coins into Save, Spend, Give in $1 (or 25¢ when cents are in play) steps or "all". Unsplit coins persist across weeks. Give has a target: the kid's charity or a sibling; giving to a sibling moves the amount into the sibling's Save jar (event on both kids). Spend is paid out by the parent through deep links (PayPal.me, Cash App, Venmo) with the amount prefilled where the service supports it; `jar.paidOut` event records it. Charity give opens the charity's own donation URL; `jar.donated` records intent.

### 7.8 Earn it back

Appears on the kid board only when `lostThisWeek > 0` and the setting is on. Skills library per grade (Pre-K, K, 1st, 2nd) in `src/content/skills/`, at least 40 generated question templates per grade across Counting, Shapes, Colors, Math facts, Sight words, Spelling, Reading. Auto-graded multiple choice for everything except Reading, which needs a parent PIN confirm. Each correct answer posts `earnback.earned` for `earnBackPerCorrect`, capped per 7.5. Wrong answers allow retry; a third miss moves to a new question. No question repeats within a day.

### 7.9 Undo and recent activity

Parent view has a "This week" list of events for the selected kid (checks, deductions, earn-back, payday, jar moves) with Undo on each. Undo appends a compensating event; nothing is deleted. This is the minimum history needed for trust; a full history and insights view is reserved for Pro later.

### 7.10 Streaks and badges

Derived from the ledger. Perfect day = all due chores checked and all routine steps done and no deductions. Streak = consecutive perfect days. Badge rules in `src/content/badges.ts`: first perfect day, 3-day streak, 7-day streak, first Give, Save jar reaches $25, $50, $100, first full week kept, first paid chore, 10 earn-backs. Badges render in the Collection tab with earned date; unearned show as silhouettes with the rule in plain words. Celebration overlay on a perfect day fires once per day per kid.

### 7.11 Shop and entitlements

Shop moves to the **parent** view. Kid-side Collection shows "Buddies you can use" and lets the kid switch among owned buddies. Entitlements in `src/config/entitlements.ts`:

- Free: 2 profiles, 10 active chores, 4 buddies (Monster Truck, Unicorn, Monster Tamer, Dino World), 1 caregiver (UI only this round).
- One-time unlocks: extra profile, unlimited chores, each paid buddy, each sticker pack. Prices in `src/config/pricing.ts` as placeholders.
- Family Pro (placeholder $3.99/mo): everything.

The parent gate (PIN) "purchases" on-device and records `entitlement.granted`. Clearly label the Shop "Preview pricing" until real billing exists. Limits are enforced in the reducers, not just the UI.

### 7.12 Parent PIN

4 to 6 digits, stored as a salted SHA-256 hash via WebCrypto, never plaintext. Five wrong attempts lock the gate for 60 seconds. PIN required for: entering parent view, deductions, verify or approve, settings, shop, payday close, undo, export and import, resetting data. A parent session lasts 5 minutes after a successful PIN, then re-prompts. Forgotten PIN: the only recovery is a "reset parent PIN" that requires confirming the family name and wipes nothing else; document this trade-off in Settings copy.

### 7.13 Settings

Appearance (Bright, Calm, Dark, Auto), mode override (Auto, Phone, Tablet, TV), money (preset and dials), verification mode, week start, earn-back on or off, reasons list, routines library, caregivers (preview), export JSON, import JSON, reset PIN, erase all data (double confirm). About and privacy copy.

## 8. Data model

```ts
type Cents = number; // integer

interface Family {
  id: string; name: string; createdAt: string;
  pinHash: string; pinSalt: string;
  money: MoneySettings; verification: 'kid-final' | 'kid-verify' | 'parent-approve';
  appearance: 'bright' | 'calm' | 'dark' | 'auto';
  reasons: Reason[]; routines: Routine[]; kids: Kid[];
  entitlements: Entitlement[];
}
interface Kid {
  id: string; name: string; grade: Grade; theme: ThemeKey; photo?: string;
  charity?: { name: string; url?: string }; moneyOverrides?: Partial<MoneySettings>;
  chores: Chore[]; routineIds: string[]; archived?: boolean; order: number;
}
interface Chore { id: string; label: string; icon: string; days: number[]; pay: Cents; active: boolean }
interface Routine { id: string; name: string; steps: { id: string; label: string }[]; days: number[] }
interface Reason { id: string; label: string; emoji: string; amount?: Cents }

type Event =
  | { type: 'chore.checked'; kidId; choreId; date; at }
  | { type: 'chore.unchecked'; kidId; choreId; date; at }
  | { type: 'chore.verified'; kidId; choreId; date; at }
  | { type: 'chore.rejected'; kidId; choreId; date; at }
  | { type: 'routine.step'; kidId; routineId; stepId; date; done: boolean; at }
  | { type: 'deduction.logged'; kidId; reasonId; amount: Cents; date; at }
  | { type: 'earnback.earned'; kidId; skill; amount: Cents; date; at }
  | { type: 'week.closed'; kidId; weekStart; balance: Cents; at }
  | { type: 'jar.allocated'; kidId; jar: 'save'|'spend'|'give'; amount: Cents; at }
  | { type: 'jar.paidOut'; kidId; jar: 'save' | 'spend'; amount: Cents; via: string; at }
  | { type: 'jar.donated'; kidId; amount: Cents; to: string; at }
  | { type: 'jar.gifted'; fromKidId; toKidId; amount: Cents; at }
  | { type: 'entitlement.granted'; key: string; at }
  | { type: 'undo'; targetEventId: string; at };
```

Every event carries `id` (ULID) and `at` (ISO). Derivation functions: `weekState(kid, events, weekStart)`, `jars(kid, events)`, `streak(kid, events)`, `badges(kid, events)`, `unverified(kid, events)`. These are the unit-tested core.

## 9. Infrastructure for scale (reference, not built this round)

Greg asked what the stack looks like as users grow. The local-first event ledger is the key: each device appends events and syncs them, which fits a thin backend.

| Stage | Users | Stack | Cost |
|---|---|---|---|
| Family | 1 to 100 | This round. Static site on GitHub Pages, IndexedDB, no backend. | $0 |
| Launch | up to about 50k families | Supabase free then Pro: Postgres with RLS, Auth (Apple, Google, email), Realtime for the kitchen tablet, Edge Functions for store receipt validation, Storage for photos. Static front end on Vercel or Cloudflare Pages. RevenueCat for IAP across both stores. | $0 to $25/mo plus RevenueCat free tier |
| Growth | 50k to 500k | Supabase Pro with compute add-on, read replicas, PgBouncer pooling, event table partitioned by month, nightly materialized rollups for insights, Cloudflare in front, Sentry and PostHog. | low hundreds per month |
| Scale | 500k to 5M | Supabase Team or Enterprise, or managed Postgres (Neon or RDS) behind the same Supabase-shaped API, events archived to object storage after 13 months, per-region deployment, queue (pgmq or SQS) for payday rollups. | thousands per month, well under revenue at $3.99 Pro with a few percent conversion |

Design rules that keep the migration cheap: events are immutable and idempotent by `id`; all derivation is client-side and deterministic; the `StorageAdapter` is the only place that knows where data lives.

## 10. Testing and verification

- Vitest: money engine, derivations, reducers, entitlement limits, PIN hashing and lockout. Target: every branch of 7.5 to 7.11.
- Playwright: smoke flows (first run, check chore, log deduction, payday, split, earn-back, switch kid, PIN lockout) at iPhone 15 (393x852), iPhone fold open (approximately 1030x880 split), iPad landscape (1180x820), Pixel 7 (412x915), TV (1920x1080). Screenshots saved for the orchestrator's visual review in every appearance.
- Contrast script over tokens for all appearance and buddy pairs.
- `slop-scan.sh` over `app/src` and `docs/` before each push.
- Lighthouse PWA installability passes on the deployed URL.

## 11. Left to the builder

- Exact token values and typography scale, within the rules in section 6.
- Chore icon set and the 12 starter chores.
- Question templates for the skills library (counts and grades are fixed above).
- Component file structure, naming, and the test harness details.
- Whether fold detection uses the Viewport Segments API or falls back to a 2-column layout at 1000px+ landscape touch devices (do the fallback at minimum).

## 12. Rulings from the builder check (2026-11-01)

A reviewer read this document as the builder and asked nine questions. Answers, now part of the spec:

1. **Devices this round.** One device writes: the kitchen tablet (or whichever device the family installs first). Parent view lives on that same device behind the PIN. TV mode is the same device pinned with `#tv`, or any other browser that has imported a JSON export (Settings, "Export family"). Phones get live data next round with sync. Say this plainly on the Family & Access screen.
2. **Unchecking.** A kid may uncheck a chore on the current day only, in every verification mode. Past days are read-only for kids; parents can change any day this week. Pay is derived, so unchecking removes that chore's pay (it only ever lowers the kid's own earned pay, never raises it).
3. **When pay counts.** Pay for a chore dated D belongs to D's week. It counts when: mode `kid-final` and checked; mode `kid-verify` and checked and (a `chore.verified` exists, or now is past local midnight of D and no `chore.rejected` exists); mode `parent-approve` and a `chore.verified` exists. Add `chore.rejected {kidId, choreId, date, at}`. At `week.closed`, kid-verify items are already past midnight so they count; parent-approve items still pending are excluded and the parent view shows "N approvals missed last week" once. A verification recorded after the close does not reopen the closed week.
4. **PIN recovery.** No family-name reset. At setup the app shows a one-time 8-character recovery code and asks the parent to write it down. Only its hash is stored, so it never appears in exports. Settings offers "Reset PIN with recovery code" and, failing that, "Erase and start over." Setup copy says why.
5. **Chore limits and sharing.** Free limit is 10 active chores per kid. Chores belong to one kid; the setup checklist creates a copy for each kid. The starter checklist shows 12 and pre-ticks 5 (Make your bed, Brush teeth is a routine step not a chore, so: Make your bed, Put toys away, Clear your plate, Feed a pet, Put clothes in hamper).
6. **Kid tabs.** Four: **Today** (hero, day strip, today's chores, routines, earn-it-back when applicable), **Week** (7 columns, tap a day for detail with deduction reasons), **Jars** (payday, split, give), **Badges** (streak, badges, buddies you own, switch buddy). Parent view is separate, reached from the header lock button, with sections: Kids strip, Balance, Log a deduction, Verify, This week (undo), Payday, Shop, Settings.
7. **Undo and the floor.** Undo is available only for events in the current open week; closed weeks are frozen. The zero floor applies to the week's final sum, not per event: `balance = max(0, start + pay + earnback - deductions)`. Earn-back cap: `earnback <= max(0, deductions)` for the week.
8. **Cutover.** The repo root move was an ordinary commit with renames, no history rewrite, no force push. Prototype data is all mock; nothing carries over. The new service worker is generated at `/sw.js` (same path as the old one) with `skipWaiting` and `clientsClaim`, and on activate deletes every cache not prefixed `qb-`. The old prototype under `/prototype/` ships without a service worker.
9. **Jars.** After allocation, coins do not move between jars (the choice is the lesson). Parents can pay out from Save as well as Spend (deep link, `jar.paidOut` with `jar: 'save' | 'spend'`). On a long gap, the app closes each missed week in order; a week with no events for a kid closes at zero and is marked inactive, so an unopened app never grants free weeks.

## 13. Calls made by the orchestrator (Greg can overrule)

- Vite + React instead of Next.js for this round.
- Shop moved to the parent view; kids see only owned buddies.
- Minimal "This week" activity list with undo, since undo needs it; full history reserved for Pro.
- Placeholder prices: extra profile $2.99, unlimited chores $1.99, paid buddy $0.99, sticker pack $0.99, Pro $3.99/mo.
- Both preset defaults: $10 start, 50¢ deduction, $1 per paid chore.
- Parent session lasts 5 minutes after PIN.
- Photos stored as 256px data URLs in IndexedDB; no cloud.
- TV mode switches to Dark after local sunset using a fixed 7 pm to 7 am rule (no geolocation).

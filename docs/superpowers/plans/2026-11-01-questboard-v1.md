# QuestBoard v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-file prototype with an installable, local-first React PWA that the Harrison family can run daily on phone, tablet, fold and TV, with a tested money engine, parent PIN, custom chores, three money styles, jars, earn-it-back, streaks and badges.

**Architecture:** A `Family` document plus an append-only event ledger persisted in IndexedDB through a `StorageAdapter`. All money, streaks, badges and verification state are pure derivations in `src/engine/` with Vitest coverage. React renders three layouts (phone, tablet/fold, TV) from the same state; appearance and buddy are CSS custom-property themes on `<html data-appearance data-buddy>`.

**Tech Stack:** Vite 5, React 18, TypeScript 5 strict, `idb`, `ulid`, `@fontsource/fredoka`, `@fontsource/nunito`, `vite-plugin-pwa`, Vitest, `@testing-library/react`, Playwright (globally installed; `NODE_PATH="$(npm root -g)"`). No Tailwind, no component library, no router.

**Spec:** `docs/superpowers/specs/2026-11-01-questboard-v1-design.md` (read it first; section numbers below refer to it).

## Global Constraints

- Money is integer cents everywhere (`type Cents = number`). Never a float dollar in state.
- No arrow characters, no em dashes, no AI-tell filler in copy, comments or docs. Run `~/Claude/scripts/slop-scan.sh app/src docs` before each commit that touches copy.
- Every text/background pair at 4.5:1 (3:1 for text over 24px bold). Tap targets 48px minimum on phone and tablet. Icon plus label on every tab. Emoji only as content.
- Every parent action behind the PIN (spec 7.12). Kids can only check and uncheck today's items, split coins, pick an owned buddy, and look.
- Entitlement limits enforced in reducers, not only the UI: 2 profiles, 10 active chores per kid, 4 free buddies.
- Original IP only: buddy images are the 12 PNGs copied from `prototype/assets/`.
- Vite `base` is `/questboard/`. Service worker file is `/sw.js`. Deploy is GitHub Pages via Actions; the old prototype is served at `/prototype/`.
- Node 20. Commit after every task with the attribution trailer from the session.

## Review Focus

1. A kid who taps a chore twice quickly (check, uncheck) must never leave pay posted or a duplicated `chore.checked`; derivation uses the latest event per (chore, date). Test in Task 3.
2. Changing the family money settings mid-week must recompute the current week with the new numbers and leave closed weeks (their `week.closed.balance`) untouched. Test in Task 4.
3. Opening the app after 3 weeks away must close each missed week in order, grant nothing for weeks with no events, and never close the current week. Test in Task 4.
4. A wrong PIN five times must lock the gate for 60 seconds across re-renders and reloads (lockout state persisted), and a correct PIN after lockout must not count. Test in Task 7.
5. Deleting or archiving a kid who has ledger events must keep their events and keep sibling gift events valid; derivations for the sibling must still work. Test in Task 6.

---

## File structure

```
app/
  index.html
  package.json  vite.config.ts  tsconfig.json  vitest.config.ts  playwright.config.ts
  public/buddies/*.png            (copied from prototype/assets)
  public/icons/*.png              (copied from prototype icon-*.png)
  src/
    main.tsx  App.tsx
    styles/tokens.css  styles/base.css  styles/components.css
    config/themes.ts  config/pricing.ts  config/limits.ts
    content/starterChores.ts  content/choreIcons.ts  content/badges.ts
    content/skills/index.ts  content/skills/prek.ts  k.ts  first.ts  second.ts
    engine/types.ts  engine/ids.ts  engine/money.ts  engine/dates.ts
    engine/week.ts  engine/jars.ts  engine/streaks.ts  engine/entitlements.ts
    engine/reducer.ts  engine/closeWeeks.ts
    security/pin.ts  security/session.ts
    storage/adapter.ts  storage/local.ts  storage/exportImport.ts
    state/store.tsx  state/selectors.ts
    app/mode.ts  app/appearance.ts
    ui/primitives/{Button,Card,SectionHead,Icon,TabBar,Modal,Keypad,Toast}.tsx
    ui/shell/{AppShell,Header,KidSwitcher,KidRail}.tsx
    ui/kid/{KidBoard,Hero,DayStrip,MathLine,TodayTab,WeekTab,DayDetail,JarsTab,BadgesTab,Celebration}.tsx
    ui/earnback/{EarnBackPanel,ChallengeModal}.tsx
    ui/parent/{ParentGate,ParentView,DeductPanel,VerifyPanel,ThisWeek,PaydayPanel,Shop}.tsx
    ui/parent/settings/{SettingsView,MoneySettings,ReasonsEditor,RoutinesEditor,ChoresEditor,KidsEditor,AppearanceSettings,DataSettings}.tsx
    ui/setup/SetupWizard.tsx
    ui/tv/TvBoard.tsx
  tests/engine/*.test.ts  tests/security/*.test.ts  tests/storage/*.test.ts  tests/ui/*.test.tsx
  e2e/*.spec.ts  e2e/shots.ts
  scripts/contrast.mjs
.github/workflows/pages.yml
```

---

### Task 1: Scaffold, tokens, fonts, deploy workflow

**Files:**
- Create: `app/` via `npm create vite@latest app -- --template react-ts`, then `app/vite.config.ts`, `app/vitest.config.ts`, `app/src/styles/tokens.css`, `app/src/styles/base.css`, `app/scripts/contrast.mjs`, `.github/workflows/pages.yml`
- Copy: `prototype/assets/*.png` to `app/public/buddies/`; `prototype/icon-*.png` to `app/public/icons/`
- Test: `app/tests/smoke.test.ts`

**Interfaces:**
- Produces: CSS custom properties on `:root[data-appearance="bright"|"calm"|"dark"][data-buddy="<key>"]`: `--bg`, `--bg-wash`, `--card`, `--card-2`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--accent`, `--accent-ink` (text color that passes on `--accent`), `--good`, `--warn`, `--bad`, `--save`, `--spend`, `--give`, `--r-lg: 24px`, `--r-md: 18px`, `--r-sm: 12px`, `--font-display`, `--font-body`. The 12 buddy keys: `truck unicorn tamer dino ocean jungle race candy space hero royal fae` (accents from spec ART_BRIEF table; `race` is `#f2b400`).
- Produces: `npm run dev|build|test|e2e|contrast`.

- [ ] **Step 1:** Scaffold with Vite react-ts; install `idb ulid @fontsource/fredoka @fontsource/nunito vite-plugin-pwa` and dev deps `vitest @testing-library/react @testing-library/jest-dom jsdom @types/node`. Set `base: '/questboard/'` in `vite.config.ts`; configure `VitePWA({ registerType: 'autoUpdate', filename: 'sw.js', workbox: { cleanupOutdatedCaches: true, navigateFallback: '/questboard/index.html', globPatterns: ['**/*.{js,css,html,png,woff2}'] }, manifest: { name: 'QuestBoard', short_name: 'QuestBoard', display: 'standalone', background_color: '#fffaf3', theme_color: '#ff7a3d', icons: [...192, 512, 512 maskable from /icons] } })`. Workbox cache names must start with `qb-` (`cacheId: 'qb'`).
- [ ] **Step 2:** Write `tokens.css`: bright, calm and dark blocks for all 12 buddies. Bright backgrounds are the buddy accent mixed 8% into `#fffaf3` (`color-mix(in oklab, <accent> 8%, #fffaf3)`), cards `#ffffff`, ink `#1b1f3a`, ink-2 `#4a5080`, ink-3 `#6b7199`. Calm: bg `#ffffff`, cards `#f4f5f9`, same inks. Dark: bg `#0f1230`, cards `#1d2250`, card-2 `#262c62`, ink `#f4f6ff`, ink-2 `#c3c9ef`, ink-3 `#a4abdc`. `--accent-ink` is `#1b1f3a` for light accents (yellow, orange, pink, green, aqua) and `#ffffff` for dark accents (`space #5b6cff`, `royal #9c4dff`, `jungle #43a047`, `hero #ff5252`). Import both fontsource families (weights 500, 600, 700 for Fredoka; 400, 600, 700, 800 for Nunito) in `base.css`.
- [ ] **Step 3:** Write `scripts/contrast.mjs`: parses `tokens.css`, resolves `color-mix` for the bright wash by mixing in sRGB (approximation is fine), and asserts WCAG contrast of `--ink`, `--ink-2`, `--ink-3` against `--bg` and `--card`, and `--accent-ink` against `--accent`, for all 36 combinations; `--ink-3` must pass 4.5:1, the rest 4.5:1. Exit 1 with a table of failures. Add `"contrast": "node scripts/contrast.mjs"`.
- [ ] **Step 4:** Run `npm run contrast`. Expected: `36 combinations, 0 failures`. Adjust token values until it passes.
- [ ] **Step 5:** Write `tests/smoke.test.ts` asserting `tokens.css` contains `[data-buddy="truck"]` and `[data-appearance="dark"]`. Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Write `.github/workflows/pages.yml`: on push to `main`, Node 20, `npm ci && npm run test && npm run contrast && npm run build` in `app/`, then `cp -r prototype app/dist/prototype`, `touch app/dist/.nojekyll`, upload `app/dist` with `actions/upload-pages-artifact@v3` and deploy with `actions/deploy-pages@v4` (permissions `pages: write`, `id-token: write`). Also add `prototype/sw.js` replacement: overwrite `prototype/sw.js` with a worker that calls `self.registration.unregister()` on install and deletes all caches, so old installs under `/prototype/` release.
- [ ] **Step 7:** Run `npm run build`. Expected: `dist/sw.js` exists, `dist/index.html` references `/questboard/assets/`. Commit: `chore: scaffold app, tokens, contrast check, Pages workflow`.

---

### Task 2: Types, ids, money formatting, dates

**Files:**
- Create: `app/src/engine/types.ts`, `app/src/engine/ids.ts`, `app/src/engine/money.ts`, `app/src/engine/dates.ts`
- Test: `app/tests/engine/money.test.ts`, `app/tests/engine/dates.test.ts`

**Interfaces:**
- Produces `types.ts`: everything in spec section 8 as exported types, plus `type DateKey = string` (`YYYY-MM-DD` local), `type Grade = 'Pre-K'|'K'|'1st'|'2nd'|'3rd+'`, `type ThemeKey` (12 keys), `type VerificationMode = 'kid-final'|'kid-verify'|'parent-approve'`, `type Appearance = 'bright'|'calm'|'dark'|'auto'`, `interface MoneySettings { startAmount: Cents; deductionDefault: Cents; chorePayDefault: Cents; weekStartDay: 0|1|2|3|4|5|6; floorAtZero: true; earnBackEnabled: boolean; earnBackPerCorrect: Cents }`, `type QBEvent = { id: string; at: string } & EventBody` (union from spec 8 including `chore.rejected` and `jar.paidOut.jar: 'save'|'spend'`), `interface Entitlement { key: string; grantedAt: string }`.
- Produces `ids.ts`: `newId(): string` (ULID).
- Produces `money.ts`: `formatCents(c: Cents, opts?: { cents?: boolean }): string` ("$20", "$18.50"; with `cents: true` always two decimals; negative as "-$0.50"); `parseDollars(input: string): Cents | null` ("20" to 2000, "0.25" to 25, "$1,000.5" to 100050, junk to null); `anyCents(values: Cents[]): boolean`; `MONEY_PRESETS: Record<'keep'|'earn'|'both', Pick<MoneySettings,'startAmount'|'deductionDefault'|'chorePayDefault'>>` = keep {2000,100,0}, earn {0,0,100}, both {1000,50,100}; `presetFor(m: MoneySettings): 'keep'|'earn'|'both'|'custom'`; `effectiveMoney(family: Family, kid: Kid): MoneySettings`.
- Produces `dates.ts`: `dateKey(d: Date): DateKey`; `parseKey(k: DateKey): Date` (local midnight); `addDays(k: DateKey, n: number): DateKey`; `weekStartKey(k: DateKey, weekStartDay: number): DateKey`; `weekDays(start: DateKey): DateKey[]` (7); `isPastMidnightOf(k: DateKey, now: Date): boolean`; `dayLabel(k): 'Sun'|...`; `dayFull(k)`.

- [ ] **Step 1:** Write `money.test.ts` covering each example above plus `formatCents(0)` is "$0" and `formatCents(1050)` is "$10.50"; `presetFor` returns `'both'` for the both preset and `'custom'` for {1000, 25, 100}. Write `dates.test.ts`: `weekStartKey('2026-11-05', 0)` is `'2026-11-01'`; with `weekStartDay: 1` it is `'2026-11-02'`; `isPastMidnightOf('2026-11-05', new Date('2026-11-06T00:00:01'))` is true and false one second earlier; `weekDays` returns 7 consecutive keys.
- [ ] **Step 2:** Run `npx vitest run tests/engine`. Expected: FAIL, modules missing.
- [ ] **Step 3:** Implement the four files with the exact signatures above. Dates are local-time only; never use `toISOString().slice(0,10)` for a key.
- [ ] **Step 4:** Run tests. Expected: PASS. Commit: `feat(engine): types, ids, money formatting, local date helpers`.

---

### Task 3: Week derivation (the money engine)

**Files:**
- Create: `app/src/engine/week.ts`
- Test: `app/tests/engine/week.test.ts`, fixture builder in `app/tests/fixtures.ts`

**Interfaces:**
- Consumes: Task 2 types, `effectiveMoney`, `dates`.
- Produces: `interface ChoreDayState { checked: boolean; verified: boolean; rejected: boolean; pending: boolean; pays: boolean; pay: Cents }`; `choreDayState(family, kid, chore, date: DateKey, events: QBEvent[], now: Date): ChoreDayState`; `interface WeekState { weekStart: DateKey; days: DateKey[]; start: Cents; pay: Cents; earnback: Cents; deductions: Cents; balance: Cents; lostByDay: Record<DateKey, { amount: Cents; items: { reasonId: string; label: string; amount: Cents; eventId: string }[] }>; payByDay: Record<DateKey, Cents>; useCents: boolean; closed: boolean; closedBalance?: Cents }`; `weekState(family, kid, events, weekStart: DateKey, now: Date): WeekState`; `mathTerms(ws: WeekState): { start: Cents; plus: Cents; minus: Cents; result: Cents }` (plus = pay + earnback); `lostThisWeek(ws): Cents`; `earnBackRoom(ws): Cents` (= max(0, deductions - earnback)).
- Fixture: `makeFamily(overrides?)` returning a family with Nolan (1st, truck, 5 chores from spec prototype, one paid "Take out trash" 100) and Makenna (Pre-K, unicorn); `ev(body, at)` helper building events with ids.

- [ ] **Step 1:** Write tests: (a) Keep-it preset, deductions Mon 100 and Wed 200 give balance 1700, `lostByDay` has two entries with labels, `useCents` false; (b) Both preset with one paid chore checked Thursday in `kid-final` mode gives pay 100 and balance 1000+100-0; (c) `kid-verify`, checked today, not verified, `now` before midnight: `pays` false and `pending` true; after midnight: `pays` true; with `chore.rejected`: never pays; (d) `parent-approve`: pays only with `chore.verified`; (e) Review Focus 1: check, uncheck, check within a minute leaves exactly one effective state and pays once; uncheck after check leaves pays false; (f) floor: start 0, deductions 300, earnback 0 gives balance 0 and `lostThisWeek` 300; (g) earn-back cap: deductions 200, two `earnback.earned` of 100 and a third of 100 gives earnback 200 not 300; (h) `undo` event targeting a deduction removes it from `deductions` and `lostByDay`; (i) a `week.closed` event for this weekStart sets `closed: true` and `closedBalance`, and later events dated inside the week do not change `closedBalance`.
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement `week.ts`. Effective chore state per (chore, date) = latest of `chore.checked`/`chore.unchecked` by `at`; verified = any `chore.verified` after the last check and not undone; undone events (targets of a non-undone `undo`) are filtered out first. Balance is `max(0, start + pay + earnback - deductions)`.
- [ ] **Step 4:** Run tests. Expected: PASS. Commit: `feat(engine): week derivation with verification modes, floor, earn-back cap, undo`.

---

### Task 4: Jars, payday, week closing

**Files:**
- Create: `app/src/engine/jars.ts`, `app/src/engine/closeWeeks.ts`
- Test: `app/tests/engine/jars.test.ts`, `app/tests/engine/closeWeeks.test.ts`

**Interfaces:**
- Consumes: Task 3 `weekState`.
- Produces `jars.ts`: `interface Jars { save: Cents; spend: Cents; give: Cents; unsplit: Cents }`; `jars(kidId: string, events: QBEvent[]): Jars` (unsplit = sum of `week.closed.balance` minus allocations; `jar.gifted` moves from giver `give` to receiver `save`; `jar.paidOut` and `jar.donated` reduce the named jar; undo respected); `allocationStep(j: Jars, useCents: boolean): Cents` (100, or 25 when `useCents`); `canAllocate(j, amount): boolean`.
- Produces `closeWeeks.ts`: `dueWeekCloses(family, events, now: Date): QBEvent[]` returning `week.closed` events (one per kid per unclosed past week, oldest first, `balance` from `weekState`, `balance: 0` and extra field `inactive: true` when the kid had no events in that week); `currentWeekStart(family, now): DateKey`; `lastWeekMissedApprovals(family, kid, events, now): number`.

- [ ] **Step 1:** Write tests: closed balance 1700 then allocate save 500, spend 200 gives unsplit 1000; gift 300 from Nolan to Makenna moves give to her save; `allocationStep` is 25 when any closed week used cents; Review Focus 2: change `family.money.startAmount` after a `week.closed` and confirm `jars().unsplit` is unchanged while current `weekState.start` reflects the new value; Review Focus 3: family created 2026-10-05, `now` 2026-11-01 (Sunday, weekStartDay 0), no closes yet: `dueWeekCloses` returns closes for the weeks starting 10-04, 10-11, 10-18, 10-25 (not 11-01), inactive weeks have balance 0, and calling it again after appending returns `[]`.
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement both modules.
- [ ] **Step 4:** Run tests. Expected: PASS. Commit: `feat(engine): jars, gifting, payday closes for missed weeks`.

---

### Task 5: Streaks, badges, verification queue

**Files:**
- Create: `app/src/engine/streaks.ts`, `app/src/content/badges.ts`
- Test: `app/tests/engine/streaks.test.ts`

**Interfaces:**
- Produces: `perfectDay(family, kid, events, date: DateKey, now: Date): boolean` (all due chores checked, all assigned routine steps done, no deductions that day); `streak(family, kid, events, today: DateKey, now): number` (consecutive perfect days ending today or yesterday); `interface BadgeDef { id: string; name: string; rule: string; emoji: string; test(ctx: BadgeCtx): string | null }` where `BadgeCtx = { family, kid, events, now, jars: Jars, weeks: WeekState[] }` and `test` returns the earned ISO date or null; `BADGES: BadgeDef[]` exactly the ten in spec 7.10 with ids `first-perfect, streak-3, streak-7, first-give, save-25, save-50, save-100, first-full-week, first-paid-chore, earnback-10`; `badges(ctx): { def: BadgeDef; earnedAt: string | null }[]`; `unverified(family, kid, events, now): { choreId: string; date: DateKey }[]` (checked paid chores awaiting verify or approve this week).

- [ ] **Step 1:** Write tests: three consecutive perfect days give streak 3 and earn `first-perfect` and `streak-3`; a deduction on day 2 breaks it to 1; `save-25` earns when `jars.save >= 2500`; `first-full-week` earns when a closed week's balance equals that week's start + pay (nothing lost); `unverified` lists a checked paid chore in `kid-verify` before midnight and drops it after `chore.verified`.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. Commit: `feat(engine): streaks, badge rules, verification queue`.

---

### Task 6: Family reducer and entitlements

**Files:**
- Create: `app/src/engine/entitlements.ts`, `app/src/engine/reducer.ts`, `app/src/config/limits.ts`, `app/src/config/pricing.ts`, `app/src/config/themes.ts`
- Test: `app/tests/engine/reducer.test.ts`

**Interfaces:**
- Produces `limits.ts`: `FREE_LIMITS = { kids: 2, choresPerKid: 10, caregivers: 1 }`, `FREE_THEMES = ['truck','unicorn','tamer','dino']`.
- Produces `pricing.ts`: `PRICES = { extraKid: 299, unlimitedChores: 199, theme: 99, stickerPack: 99, proMonthly: 399 }` and `PRO_KEY = 'pro'`, entitlement keys `kid-slot:<n>`, `chores-unlimited`, `theme:<key>`, `pack:<id>`.
- Produces `themes.ts`: `THEMES: Record<ThemeKey, { name: string; accent: string; img: string; unit: string; tier: 'free'|'paid'|'pro' }>` and `THEME_ORDER` from the prototype.
- Produces `entitlements.ts`: `hasPro(f)`, `kidLimit(f): number` (2 + count of `kid-slot:*`, Infinity with pro), `choreLimit(f, kidId): number`, `ownsTheme(f, key)`, `ownsPack(f, id)`.
- Produces `reducer.ts`: `type FamilyAction = {type:'kid.add', kid: Omit<Kid,'id'|'order'>} | {type:'kid.update', id, patch: Partial<Kid>} | {type:'kid.archive', id} | {type:'kid.reorder', ids: string[]} | {type:'chore.add', kidId, chore: Omit<Chore,'id'>} | {type:'chore.update', kidId, id, patch} | {type:'chore.remove', kidId, id} | {type:'routine.add'|'routine.update'|'routine.remove', ...} | {type:'reason.set', reasons: Reason[]} | {type:'money.set', money: MoneySettings} | {type:'money.kidOverride', kidId, overrides: Partial<MoneySettings>|null} | {type:'verification.set', mode} | {type:'appearance.set', appearance} | {type:'entitlement.grant', key} | {type:'pin.set', pinHash, pinSalt, recoveryHash}`; `class LimitError extends Error { constructor(public limit: 'kids'|'chores'|'theme') }`; `applyFamilyAction(f: Family, a: FamilyAction): Family` (pure, returns new object, throws `LimitError`); `newFamily(name: string): Family` with seeded reasons (the six prototype reasons, amount undefined), routines (Morning: Brush teeth, Get dressed, Eat breakfast; Bedtime: Bath, PJs on, Brush teeth; Nighttime: Read a book, Lights out), money = both preset, `verification: 'kid-verify'`, `appearance: 'bright'`.

- [ ] **Step 1:** Write tests: third `kid.add` without entitlement throws `LimitError('kids')`; with `kid-slot:3` granted it succeeds; 11th active chore throws `LimitError('chores')`; an inactive chore does not count; `kid.update` to a theme not owned throws `LimitError('theme')`; Review Focus 5: archive Nolan after a `jar.gifted` to Makenna, then `jars('makenna', events).save` still includes the gift and `applyFamilyAction` left Nolan in `kids` with `archived: true`.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS. Commit: `feat(engine): family reducer with entitlement limits, pricing and theme config`.

---

### Task 7: PIN, lockout, parent session, storage adapter, export/import

**Files:**
- Create: `app/src/security/pin.ts`, `app/src/security/session.ts`, `app/src/storage/adapter.ts`, `app/src/storage/local.ts`, `app/src/storage/exportImport.ts`
- Test: `app/tests/security/pin.test.ts`, `app/tests/storage/local.test.ts` (use `fake-indexeddb` dev dep)

**Interfaces:**
- Produces `pin.ts`: `makeSalt(): string` (16 random bytes, base64); `hashPin(pin: string, salt: string): Promise<string>` (SHA-256 over `salt + ':' + pin`, hex, via `crypto.subtle`); `verifyPin(pin, salt, hash): Promise<boolean>`; `makeRecoveryCode(): string` (8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, formatted `XXXX-XXXX`); `isValidPin(pin): boolean` (4 to 6 digits).
- Produces `session.ts`: `interface LockoutState { failures: number; lockedUntil: number | null }`; `recordFailure(s: LockoutState, now: number): LockoutState` (5th failure sets `lockedUntil = now + 60000`, resets failures); `isLocked(s, now)`; `recordSuccess(): LockoutState`; `PARENT_SESSION_MS = 300000`; `sessionValid(unlockedAt: number | null, now: number): boolean`.
- Produces `adapter.ts`: `interface StorageAdapter { load(): Promise<{ family: Family | null; events: QBEvent[]; lockout: LockoutState; device: DeviceSettings }>; saveFamily(f: Family): Promise<void>; appendEvents(e: QBEvent[]): Promise<void>; saveLockout(s: LockoutState): Promise<void>; saveDevice(d: DeviceSettings): Promise<void>; wipe(): Promise<void> }`; `interface DeviceSettings { modeOverride: 'auto'|'phone'|'tablet'|'tv'; appearanceOverride: Appearance | null }`.
- Produces `local.ts`: `class LocalAdapter implements StorageAdapter` using `idb` database `questboard` v1 with stores `family` (key `'current'`), `events` (keyPath `id`, index `at`), `meta` (keys `lockout`, `device`).
- Produces `exportImport.ts`: `exportFamily(family, events, recoveryCode?: null): string` (JSON with `{ version: 1, exportedAt, family, events }`; recovery code is never in the export since only its hash is stored); `parseImport(json: string): { family: Family; events: QBEvent[] } | { error: string }` validating version and shapes.

- [ ] **Step 1:** Write tests: `hashPin` is deterministic and differs by salt; `verifyPin` true/false; `isValidPin('123')` false, `'1234'` true, `'1234567'` false; Review Focus 4: five `recordFailure` calls lock for 60000 ms, `isLocked` true at +59999 and false at +60000, and a success while locked is ignored by the caller (test `isLocked` guard order in a tiny `tryUnlock(pin, state, now)` helper exported from `session.ts`); `LocalAdapter` round-trips family and 3 events through fake-indexeddb and `wipe()` empties it; `parseImport` rejects `{version: 2}` and a missing `events` array.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS. Commit: `feat: PIN hashing, lockout, parent session, IndexedDB adapter, export/import`.

---

### Task 8: Store, mode detection, app shell, kid switcher

**Files:**
- Create: `app/src/state/store.tsx`, `app/src/state/selectors.ts`, `app/src/app/mode.ts`, `app/src/app/appearance.ts`, `app/src/ui/primitives/*.tsx`, `app/src/ui/shell/*.tsx`, `app/src/App.tsx`, `app/src/styles/components.css`
- Test: `app/tests/engine/mode.test.ts`, `app/tests/ui/shell.test.tsx`

**Interfaces:**
- Produces `mode.ts`: `type Mode = 'phone'|'tablet'|'tv'`; `detectMode(input: { width: number; coarse: boolean; hash: string; override: DeviceSettings['modeOverride'] }): Mode` per spec section 5 (hash `#tv` or `#parent` wins, then override, then rules); `isFold(): boolean` using `matchMedia('(horizontal-viewport-segments: 2)')` with fallback `false`.
- Produces `appearance.ts`: `resolveAppearance(family: Appearance, device: Appearance | null, mode: Mode, now: Date): 'bright'|'calm'|'dark'` (device override wins; `auto` means dark 19:00 to 07:00 local on TV, bright otherwise).
- Produces `store.tsx`: `StoreProvider({ adapter, children })`; hooks `useStore(): { family: Family | null; events: QBEvent[]; device: DeviceSettings; lockout: LockoutState; currentKidId: string | null; parentUnlockedAt: number | null; mode: Mode; appearance: 'bright'|'calm'|'dark'; now: Date }`; `useActions(): { append(events: QBEvent[]): Promise<void>; update(action: FamilyAction): Promise<void>; setKid(id): void; setDevice(patch): Promise<void>; unlockParent(pin): Promise<'ok'|'bad'|'locked'>; lockParent(): void; replaceAll(family, events): Promise<void> }`. On load, `append(dueWeekCloses(...))` runs once, and a 60-second tick updates `now`. `useKid()` returns the current kid (first non-archived by `order` when unset). `selectors.ts` wraps engine calls with memoization: `useWeek(kid)`, `useJars(kid)`, `useBadges(kid)`, `useUnverified(kid)`.
- Produces primitives: `Button({ variant: 'primary'|'quiet'|'danger', size: 'md'|'lg', icon?, children })`, `Card`, `SectionHead({ icon, title, meta?, metaTone?: 'count'|'good'|'bad' })`, `Icon({ name })` (ports the prototype `ICONS` map plus `today, week, badge, lock, photo, trash, edit, check, x`), `TabBar({ tabs: { id, icon, label }[], active, onChange })` (bottom on phone, top on tablet), `Modal`, `Keypad({ onDigit, onDelete })`, `useToast()`.
- Produces shell: `AppShell` sets `data-appearance` and `data-buddy` on `<html>`, picks `TvBoard` for `tv`, `SetupWizard` when `family` is null, else `Header` + `KidBoard` or `ParentView`; `KidSwitcher` (avatar strip, swipe handlers, pull-down full-screen switcher when 3+ kids); `KidRail` (tablet side rail when 3+ kids).

- [ ] **Step 1:** Write `mode.test.ts`: (393, coarse, '', auto) is phone; (1180, coarse, '', auto) is tablet; (1920, fine, '', auto) is tv; (1920, coarse, '', auto) is tablet; hash `#tv` on 393 is tv; override `tablet` on 1920 fine is tablet. `resolveAppearance('auto', null, 'tv', 20:00)` is dark, at 10:00 is bright, on phone at 20:00 is bright, device `calm` wins. Write `shell.test.tsx` rendering `StoreProvider` with an in-memory adapter and a seeded family: header shows the kid name, swiping (fire `touchstart`/`touchend` with dx -80) switches to the next kid, and `<html>` has `data-buddy="truck"` then `"unicorn"`.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. Entrance animation is a class applied once on tab or kid change, not on every render. **Step 4:** Run. PASS. Run `npm run dev` and load at 393px, 1180px and 1920px; confirm the three shells. Commit: `feat: store, mode and appearance resolution, shell, primitives, kid switcher`.

---

### Task 9: Kid board, Today tab

**Files:**
- Create: `app/src/ui/kid/{KidBoard,Hero,DayStrip,MathLine,TodayTab,Celebration}.tsx`
- Test: `app/tests/ui/today.test.tsx`

**Interfaces:**
- Consumes: `useWeek`, `useJars`, `useActions().append`.
- Produces: `KidBoard` renders `Hero` and the `TabBar` with tabs `today, week, jars, badges` and the active tab component. `Hero` shows buddy image (with optional photo avatar inset), name, grade label, balance (large), progress bar (balance over `start + pay`), `MathLine`, and Save/Spend/Give chips. `MathLine({ ws })` renders per spec 7.5 (terms that are zero are omitted; cents shown when `ws.useCents`); exported `mathLineText(ws): string` for tests. `DayStrip({ ws, selected, onSelect })` 7 cells with net per day (`-$0.50` red, `$0` green when no loss and the day is past or today, dot when future). `TodayTab` shows chores due on `selected` day (48px rows, icon + label + checkbox; kids may toggle only when `selected === today`), routines grouped by routine name, and `EarnBackPanel` (Task 13) when `earnBackRoom(ws) > 0` and enabled. `Celebration` fires once per kid per day when `perfectDay` becomes true (track in `sessionStorage` key `celebrated:<kidId>:<date>`).

- [ ] **Step 1:** Write tests: `mathLineText` gives `"$20 − $1.50 = $18.50"` for keep with 150 lost, `"$0 + $8 = $8"` for earn with 800 pay, `"$10 + $4 − $0.50 = $13.50"` for both; tapping a chore row appends one `chore.checked` with today's `date` and tapping again appends `chore.unchecked`; a chore row for yesterday has no click handler for kids (`aria-disabled`).
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS. Commit: `feat(kid): hero, math line, day strip, today tab, celebration`.

---

### Task 10: Week tab and day detail

**Files:**
- Create: `app/src/ui/kid/{WeekTab,DayDetail}.tsx`
- Test: `app/tests/ui/week.test.tsx`

**Interfaces:**
- `WeekTab` shows 7 columns on tablet and a horizontally snapping row of day cards on phone; each shows day label, net money, due chores with done state (read-only for past days, interactive for today). Tapping a column header opens `DayDetail({ date })`: chores, routines, and the list from `ws.lostByDay[date].items` as "Wed: -$0.50, Yelling" lines, plus pay posted that day.
- [ ] **Step 1:** Test: with deductions on Wed (reason Yelling 50), `DayDetail` for Wed renders "Yelling" and "-$0.50"; `WeekTab` renders 7 day labels starting at the family's week start.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit: `feat(kid): week tab and day detail with deduction reasons`.

---

### Task 11: Jars tab

**Files:**
- Create: `app/src/ui/kid/JarsTab.tsx`
- Test: `app/tests/ui/jars.test.tsx`

**Interfaces:**
- Consumes `jars`, `allocationStep`, `canAllocate`.
- `JarsTab` shows unsplit coins (one coin glyph per dollar, capped at 40 with a "+N" chip), three jar cards (Save, Spend, Give) with totals and three buttons each: `+step`, `+5x step`, `All`; "Give" card shows the target chooser (charity name or a sibling) and the gift path appends `jar.gifted` (kid-allowed, since it is the kid's own Give money) when the target is a sibling. Donating to a charity and paying out are parent actions and live in `PaydayPanel` (Task 14), not here. Empty state copy: "No coins to split yet. Payday is {dayFull(weekStart + 7)}."
- [ ] **Step 1:** Test: unsplit 1200, tap `+$1` on Save appends `jar.allocated {jar:'save', amount:100}`; `All` on Give appends the remaining 1100; buttons disabled at unsplit 0; with `useCents` the first button reads `+25¢`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit: `feat(kid): jars tab with coin split and sibling gift`.

---

### Task 12: Badges tab (streak, badges, buddies, photo)

**Files:**
- Create: `app/src/ui/kid/BadgesTab.tsx`, `app/src/ui/kid/BuddyPicker.tsx`
- Test: `app/tests/ui/badges.test.tsx`

**Interfaces:**
- `BadgesTab` shows streak count with flame icon and "best streak", a grid of the 10 badges (earned in color with date, unearned as outlined silhouette with `rule` text), and `BuddyPicker` listing `THEME_ORDER` filtered by `ownsTheme`; tapping an owned buddy dispatches `kid.update {theme}` (kid-allowed). Locked buddies are not shown here (they live in the parent Shop).
- [ ] **Step 1:** Test: with 2 earned badges the grid shows 2 with dates and 8 with rule text; picker shows exactly the 4 free buddies for a family with no entitlements; tapping Unicorn updates the kid's theme.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit: `feat(kid): badges tab, streak, owned buddy picker`.

---

### Task 13: Earn-it-back skills library and challenge modal

**Files:**
- Create: `app/src/content/skills/{index,prek,k,first,second}.ts`, `app/src/ui/earnback/{EarnBackPanel,ChallengeModal}.tsx`
- Test: `app/tests/engine/skills.test.ts`, `app/tests/ui/earnback.test.tsx`

**Interfaces:**
- Produces `skills/index.ts`: `type Subject = 'Counting'|'Shapes'|'Colors'|'Math'|'Sight Words'|'Spelling'|'Reading'`; `interface Question { id: string; subject: Subject; prompt: string; options?: string[]; answer?: number; parentConfirm?: boolean }`; `interface SkillTemplate { subject: Subject; make(rng: () => number): Question }`; `SKILLS: Record<Grade, SkillTemplate[]>` with at least 40 distinct generated questions reachable per grade (templates with randomized operands count); `pickQuestion(grade, usedIds: Set<string>, rng): Question` (never repeats an id in the set); `subjectsFor(grade): Subject[]`.
- `EarnBackPanel({ kid, ws })`: header "Earn it back", copy "You can win back up to {formatCents(earnBackRoom)}", one card per subject. `ChallengeModal`: multiple choice with retry (third miss draws a new question), Reading shows "A grown-up checks this one" and a button that opens `ParentGate` (Task 14) before appending `earnback.earned`. Correct answers append `earnback.earned {amount: earnBackPerCorrect}` and close after 1 second. Used ids kept per kid per day in `sessionStorage`.
- [ ] **Step 1:** Tests: each grade yields 40 unique ids from 200 picks with a seeded rng; `pickQuestion` never returns an id in `usedIds`; Pre-K has no Reading; 1st has Reading with `parentConfirm`. UI: correct option appends one `earnback.earned` of 100; wrong option keeps the modal open; when `earnBackRoom` is 0 the panel does not render.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Run `slop-scan.sh app/src/content`. Commit: `feat: earn-it-back skills library (Pre-K to 2nd) and challenge modal`.

---

### Task 14: Parent gate and parent view (deductions, verify, this week, payday, shop)

**Files:**
- Create: `app/src/ui/parent/{ParentGate,ParentView,DeductPanel,VerifyPanel,ThisWeek,PaydayPanel,Shop}.tsx`
- Test: `app/tests/ui/parent.test.tsx`

**Interfaces:**
- `ParentGate({ onUnlocked, title? })`: keypad modal, dots for 4 to 6 digits, "Enter" after 4, shake on wrong, lockout countdown copy "Try again in {n}s", uses `useActions().unlockParent`. `useParent()` hook returns `{ unlocked: boolean; require(fn: () => void): void }` which runs `fn` immediately when `sessionValid`, otherwise opens the gate first.
- `ParentView`: kids strip (same `KidSwitcher`), balance card, `DeductPanel` (reason chips from `family.reasons`, amount shown per chip from `reason.amount ?? deductionDefault`, tap appends `deduction.logged` with today's date and shows an undo toast), `VerifyPanel` (list from `unverified`, Verify and Reject per row, Verify all), `ThisWeek` (events this week for the kid, newest first, with Undo appending `{type:'undo', targetEventId}`; closed weeks not shown), `PaydayPanel` (unsplit, jar totals, "Close week now" appends `week.closed` for the current week via `weekState().balance`, Pay out buttons for Spend and Save with deep links `https://paypal.me/{handle}/{dollars}`, `https://cash.app/${handle}/{dollars}`, `https://venmo.com/{handle}?txn=pay&amount={dollars}` as `<a target="_blank" rel="noopener">` that also append `jar.paidOut`; Donate opens `kid.charity.url` and appends `jar.donated`), `Shop` (themes grid with fixed 96px art box and name below, sticker packs, plans; every buy calls `require()` then dispatches `entitlement.grant`; banner "Preview pricing. Nothing is charged yet.").
- [ ] **Step 1:** Tests: entering the parent view without a session shows the gate; a correct PIN reveals `DeductPanel`; tapping "Yelling" appends `deduction.logged` with `amount` 50 (both preset) and the ThisWeek list shows it with an Undo that appends `undo`; `Verify all` appends one `chore.verified` per unverified row; buying a theme without a session opens the gate first and after PIN grants `theme:ocean`; Shop art box never overlaps the name (assert the img has `object-fit: contain` and a fixed height class).
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit: `feat(parent): gate, deductions, verify queue, this week undo, payday and payouts, shop`.

---

### Task 15: Settings (money, reasons, routines, chores, kids, appearance, data)

**Files:**
- Create: `app/src/ui/parent/settings/*.tsx`
- Test: `app/tests/ui/settings.test.tsx`

**Interfaces:**
- `MoneySettings`: preset chips (Keep it, Earn it, Both, Custom) and three dials with `parseDollars` inputs (start amount, deduction, pay per new chore), week start select, earn-back toggle and per-correct amount, live example line using `mathLineText` on a sample week. Per-kid override toggle inside `KidsEditor`.
- `ReasonsEditor`: add, rename, emoji, optional amount, delete, reorder. `RoutinesEditor`: library CRUD, steps, days, assign to kids. `ChoresEditor({ kidId })`: list with active toggle, add (label, icon from `choreIcons`, days, pay), edit, delete; shows "{n} of {limit} chores" and an Unlock button that calls the Shop flow when at the limit. `KidsEditor`: add (name, grade, buddy, photo via `<input type=file accept=image/* capture>` resized to 256px with canvas to a JPEG data URL), edit, archive, drag reorder; "Add kid" at the limit shows the unlock price. Verification mode radio. `AppearanceSettings`: family appearance (Bright, Calm, Dark, Auto) and device overrides (appearance, mode). `DataSettings`: Export (downloads `questboard-{family}-{date}.json`), Import (file picker, confirm, `replaceAll`), Reset PIN with recovery code, Erase all data (type ERASE to confirm), privacy copy from spec section 3.
- [ ] **Step 1:** Tests: selecting "Keep it" sets money to {2000,100,0}; typing `0.25` into deduction stores 25; adding an 11th chore shows the unlock prompt and does not dispatch; Export produces JSON that `parseImport` accepts; Reset PIN with the right recovery code succeeds and with a wrong one fails.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Run `slop-scan.sh app/src/ui`. Commit: `feat(parent): settings for money, reasons, routines, chores, kids, appearance, data`.

---

### Task 16: First-run setup wizard

**Files:**
- Create: `app/src/ui/setup/SetupWizard.tsx`, `app/src/content/starterChores.ts`, `app/src/content/choreIcons.ts`
- Test: `app/tests/ui/setup.test.tsx`

**Interfaces:**
- `starterChores.ts`: 12 entries `{ label, icon, days, preChecked }` with the 5 pre-ticked from spec 12.5. `choreIcons.ts`: 24 named inline SVG paths.
- Wizard steps: family name; PIN (enter, confirm) then show recovery code with "I wrote it down" checkbox; kids (repeatable: name, grade, buddy, photo optional); money preset; starter chores checklist (applied to every kid); routines (Morning, Bedtime on, Nighttime off); done. Writes `newFamily` plus actions via `useActions().update`, then lands on the kid board. Re-run from Settings with "Run setup again" (keeps data, replays steps).
- [ ] **Step 1:** Test: completing the wizard with two kids and defaults yields a family with 2 kids, 5 active chores each, `pinHash` set, and `verification` `kid-verify`; attempting a third kid in the wizard shows the limit copy.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit: `feat: first-run setup wizard with starter chores`.

---

### Task 17: TV board

**Files:**
- Create: `app/src/ui/tv/TvBoard.tsx`
- Test: `app/tests/ui/tv.test.tsx`

**Interfaces:**
- `TvBoard`: no buttons; rotates `currentKidId` through non-archived kids every 20 seconds (pauses when only one kid); shows buddy, name, balance (minimum 120px), progress bar, Save/Given/Chores-left stats, "Still to do today" list (up to 6), streak, clock and date top right (updates each minute), dot row for rotation. Body minimum 28px at 1080p via `clamp`. Uses `resolveAppearance` with `auto` honoring the 19:00 to 07:00 dark rule.
- [ ] **Step 1:** Test with fake timers: after 20s the displayed kid name changes; the clock renders `h:mm`; no `<button>` elements exist.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit: `feat: TV board with rotation and clock`.

---

### Task 18: PWA polish, Playwright flows and screenshots, deploy

**Files:**
- Create: `app/playwright.config.ts`, `app/e2e/flows.spec.ts`, `app/e2e/shots.ts`, `app/public/robots.txt`
- Modify: `app/index.html` (meta: viewport without `maximum-scale`, `theme-color` per appearance via `<meta name="theme-color" media="(prefers-color-scheme: dark)">`, apple touch icon, CSP meta `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'`), `prototype/sw.js` (self-unregistering worker from Task 1 if not done)

- [ ] **Step 1:** Write `flows.spec.ts` against `npm run preview` (base `/questboard/`): first run through the wizard with Nolan and Makenna; check a chore and see the count update; open parent, PIN, log "Yelling", see `-$0.50` on today's day cell; five wrong PINs shows the lockout copy; Close week now, then split coins into Save; earn-it-back answers a Math question and the balance rises by $1; swipe to Makenna; `#tv` shows the board with no buttons. Run at projects: `iphone` (393x852, touch), `pixel` (412x915, touch), `ipad` (1180x820, touch), `fold` (1030x880, touch, with `--viewport-segments` emulation if available, else plain), `tv` (1920x1080, mouse).
- [ ] **Step 2:** Write `shots.ts`: for each project and each appearance, capture `today, week, jars, badges, parent, settings, tv` to `e2e/shots/<project>/<appearance>/<screen>.png` (used by the orchestrator for visual review; add `e2e/shots/` to `.gitignore`).
- [ ] **Step 3:** Run `NODE_PATH="$(npm root -g)" npx playwright test`. Expected: all flows pass on all projects. Fix layout failures found (anything scrolling the whole page on the default content, tap targets under 48px, overlaps).
- [ ] **Step 4:** Run `npm run build && npm run contrast && ~/Claude/scripts/slop-scan.sh app/src docs`. Expected: clean.
- [ ] **Step 5:** Commit: `feat: PWA hardening, e2e flows, screenshot suite`. Do not push; the orchestrator pushes after visual review and verifies with `~/.claude/skills/wrap-session/scripts/verify_push.sh`.

---

## Self-review notes

- Spec coverage: 5 (Task 8, 17, 18), 6 (Task 1, 8), 7.1 (16), 7.2 (6, 15), 7.3 (3, 9, 14), 7.4 (6, 9, 15), 7.5 (2, 3, 15), 7.6 (14, 10), 7.7 (4, 11, 14), 7.8 (13), 7.9 (14), 7.10 (5, 12), 7.11 (6, 12, 14), 7.12 (7, 14), 7.13 (15), 8 (2), 10 (1, 18), 12 rulings (3, 4, 7, 11, 15, 16, 18).
- Names used across tasks: `weekState`, `WeekState`, `jars`, `Jars`, `dueWeekCloses`, `unverified`, `earnBackRoom`, `mathLineText`, `applyFamilyAction`, `LimitError`, `useActions`, `useStore`, `useParent`, `ownsTheme`, `allocationStep`, `resolveAppearance`, `detectMode`, `parseDollars`, `formatCents`.

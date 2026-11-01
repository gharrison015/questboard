# SDD ledger, plan: docs/superpowers/plans/2026-11-01-questboard-v1.md

Branch: build/v1 (from main fbfc1f4). Spec: docs/superpowers/specs/2026-11-01-questboard-v1-design.md.

## Preflight scan

| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T2 / T3,T4,T5,T9 | types, formatCents, parseDollars, dates helpers | names consistent |
| T3 / T4,T5,T9,T10,T14 | weekState, WeekState, earnBackRoom, lostThisWeek | consistent |
| T4 / T5,T11,T14 | jars, Jars, allocationStep, dueWeekCloses | consistent |
| T5 / T12,T14 | streak, badges, unverified | consistent |
| T6 / T8,T12,T14,T15,T16 | applyFamilyAction, FamilyAction, LimitError, ownsTheme, THEMES | consistent |
| T7 / T8 | StorageAdapter, LocalAdapter, LockoutState, sessionValid | consistent |
| T8 / T9..T17 | useStore, useActions, useKid, selectors, primitives, TabBar | consistent |
| T13 / T14 | ChallengeModal needs ParentGate, which T14 creates later | CONFLICT, see Ruling 1 |
| T1 / T18 | both mention replacing prototype/sw.js | duplicate, see Ruling 2 |
| T18 CSP | style-src 'unsafe-inline' | acceptable: React inline styles for accent vars |
| each task | tests vs code | self-consistent; no asserting-nothing tests mandated |

Ruling 1: ParentGate.tsx and the useParent() hook move from Task 14 into Task 8 (the Header lock button needs the gate anyway). Task 13 and Task 14 consume them. Cost if wrong: Task 8 grows; low.
Ruling 2: prototype/sw.js self-unregistering replacement is done in Task 1 only; Task 18 just verifies it exists. Cost if wrong: none.

## Progress
Task 1: implemented b5f817f (DONE_WITH_CONCERNS). Ruling 3: darkened accents for jungle #2e7d32, hero #d32f2f, space #4a5be8, royal #8a3ff0 and ink-3 #5d6490 are accepted so the contrast gate passes; ART_BRIEF hexes stay for the art only. Cost if wrong: slight brand drift on 4 buddies; low. Reviewer dispatched.
Task 1: fix round 1/5 (3 addressed, 0 open; commits b5f817f..7b85ad5)
Task 1: minor (deferred): smoke test only checks substrings; app/README.md is Vite boilerplate; package name 'app'; fae and unicorn share the same accent (design pass)
Task 1: complete (commits fbfc1f4..7b85ad5, review clean)
Task 2: minor (deferred): parseDollars rejects ".5" and "1." (carry to Task 15 input handling); no safe-integer guard; effectiveMoney spread can carry undefined overrides (Task 15 must send null to clear, not undefined); formatCents sign before rounding and NaN; date tests not pinned to a DST timezone (set TZ=America/New_York in vitest config in a later task); newId test lives in dates.test.ts
Task 2: complete (commits 7b85ad5..d4b4433, review clean)
Task 3: implemented bf33f28, 01302de (anyCents fix in money.ts). Review: 1 Important (rejection precedence).
Ruling 4: verify/reject precedence = latest of the two after the last check wins in every mode; neither present means mode default (kid-final pays, kid-verify pays after midnight, parent-approve does not). Closed weeks compute live fields from events at or before the close so mathTerms sums to closedBalance. Cost if wrong: parent reject behavior in kid-final mode; low.
Task 3: minor (deferred): no test for events dated outside the week; NaN guard on invalid at; pay counts inactive chores and ignores chore.days by design (events are truth); tests index chores by position
Task 3: fix round 1/5 (3 addressed, 0 open; commits 01302de..31310af)
Task 3: complete (commits d4b4433..31310af, review clean)
Task 4: implemented 8b27492. Review approved; Ruling 5: inactive-week activity = chore, routine, deduction, earn-back events only (jar events excluded) so splitting coins never grants a free week. Cost if wrong: none material. Fix round 1 dispatched for the ruling.
Task 4: minor (deferred): Review Focus 2 test is structural; action layer must reject over-gifting (carry to Task 11); no cross-kid isolation test; kids added later get inactive back-closes (noise only)
Task 4: fix round 1/5 (2 addressed, 0 open; commits 8b27492..9ae780e). Controller ran vitest to confirm the two new tests pass.
Task 4: complete (commits 31310af..9ae780e, review clean)
Task 5: implemented 5c6cfc1. Review: 3 Important (perf of streak/badges, weekStatesFor cap drops current week, quadratic saveReached). Fix round 1 dispatched.
Task 5: minor (deferred): first-full-week counts a week fully earned back as full (acceptable); no verify-then-reject test here (covered in Task 3); firstPaidChore inner break misleading
Task 5: fix round 1/5 (3 addressed, 0 open; commits 5c6cfc1..c50eb15)
Task 5: minor (deferred): perf smoke test uses a 300 ms wall-clock threshold (may be flaky on CI; loosen to 1000 ms in Task 18 if it flakes); perfectDay() rebuilds buckets per call
Task 5: complete (commits 9ae780e..c50eb15, review clean)
Task 6: implemented 31b5df5. Review approved; fix round 1 dispatched for limit bypass via kid.update patch (added kid.unarchive), kid.reorder rebase, shared ALL_DAYS ref, stronger newFamily test.
Task 6: minor (deferred): unmatched ids are silent no-ops in update/archive actions (document in store); no cross-kid chore isolation test
Task 6: fix round 1/5 (4 addressed, 0 open; commits 31b5df5..41b0e8b)
Task 6: complete (commits c50eb15..41b0e8b, review clean)
Task 7: implemented fbd0200. Review approved; fix round 1 dispatched for fake test events, secret-leak export test, frozen defaults, recovery code whitespace.
Task 7: minor (deferred): export carries pinHash+pinSalt, a 4-6 digit PIN is brute-forceable offline from an export (plan-mandated; Task 15 export copy must warn: "keep this file private"); parseImport is shallow (Task 15 import UI should also check recoveryHash, money, reasons, routines present); recordSuccess exported (contract comment added); spec 12.4 says the recovery code is in exports, code never exports it (spec text to fix at wrap).
Task 7: fix round 1/5 (4 addressed, 0 open; commits fbd0200..e63d081). Controller ran vitest: 95 pass.
Task 7: complete (commits 41b0e8b..e63d081, review clean)
Task 8: implemented 24cfc26, 9a33f47 (DONE_WITH_CONCERNS: React 19 not 18; #parent hash never TV; parent view can outlive session by up to 60 s; async seed). Controller screenshots at iphone/ipad/fold/tv in bright/dark/calm: renders, per-buddy tint switches, gate works with wrong-PIN copy, no console errors, no page scroll. Reviewer dispatched.
Ruling 6: React 19 accepted (brief said 18; nothing depends on 18). Cost if wrong: none known.
Task 8: review: 2 Important (store write race on update/setDevice; parent view guarded by effect not render). Fix round 1 dispatched (queue + render guard + visibilitychange + DEV-gated seed + gate focus).
Task 8: minor (deferred): replaceAll not atomic (Task 15 import must handle; add adapter.replaceAll later); adapter.load() rejection leaves blank screen (add error state in Task 18 polish); selectors memoized per component, recompute each minute (optimize later if slow); swipe on <main> may conflict with horizontal scroll in Week tab (Task 10 must scope swipe or stopPropagation on its scroller); #parent hash demotes tv only (accepted).
Greg 2026-11-01 (during Task 8): add light drop shadows to emoji and buddy/profile images for a 3D look, with animations. Ruling 7: hero buddy = soft drop-shadow + 4 s idle float + hop on chore check or kid switch; avatar chips = subtle shadow; content emoji (badges, reasons, celebration) = light drop-shadow, badges pop once when earned; all gated by prefers-reduced-motion; one trigger per event, never per render. Carry into Tasks 9, 12, 14 dispatches.
Task 8: fix round 1/5 (5 addressed, 0 open; commits 9a33f47..3ff758d)
Task 8: complete (commits e63d081..3ff758d, review clean)
Task 9: implemented fadd91d (DONE_WITH_CONCERNS). Controller screenshots: phone board looks right (hero, math line, strip, chores, dark mode good) BUT whole page scrolls (1288/852) and TabBar overlaps last row; iPad two-pane layout did not engage (single column, 1601px); pending checkbox reads like a toggle; seed deductions dated in the future on a Sunday. Perf smoke test flaked at 596 ms under parallel load. Reviewer dispatched with these findings.
Ruling 8: MathLine formats each term with plain formatCents (cents shown only on terms that have cents), matching the brief's expected strings. Cost if wrong: none.
Ruling 9: kids cannot uncheck a chore a parent has verified (row aria-disabled). Protects approved pay. Cost if wrong: kid must ask parent to undo; low.
Task 9: review: 6 Important (dead container query, no internal scroller, double-tap double event, pending box visual, seed dates, test gaps). Fix round 1 dispatched incl. DayStrip minmax, chip tightening, perf threshold 1000 ms.
Task 9: minor (deferred): MathLine ignores useCents (compact by ruling 8); "$0 = $0" when all zero; rejected chores show no kid-visible reason; fire-and-forget appends have no failure toast; Celebration dialog lacks aria-modal and keyboard dismiss; hop remounts <img> via key (flicker risk, prefer class toggle via ref)
Task 9: fix round 1/5 (7 addressed, 0 open; commits fadd91d..fc8e5d0). Controller re-screenshot: no page scroll at phone/tablet/fold; two panes on iPad; pending state reads as waiting.
Ruling 10: unpaid chores under kid-verify show as done on the kid board (UI-only; the engine still reports pending and the parent verify queue only lists paid chores per spec). Cost if wrong: none to money.
Task 9: minor (deferred): clear in-flight ref when append rejects (one dead tap otherwise); DayStrip 44px min-width may overflow by a few px under 364px (check at 360px in Task 18); `.qb-main:has()` needs iOS 15.4+; 44px day cells are under the 48px rule (height is 48).
Task 9: complete (commits 3ff758d..fc8e5d0, review clean)
Task 10: implemented bcb6543. Code review approved. Controller screenshots: iPad 7-col grid cramped (labels wrap/truncate), DayDetail modal overflows phone with no reachable Close, lost list shows -$1.00 vs -$1 elsewhere. Fix round 1 dispatched (compact grid rows, Modal max-height + top-right X, cents consistency, modal swipe isolation, Escape test).
Task 10: minor (deferred): no non-Sunday weekStartDay test; snap-to-today untested and not re-run on resize; DayDetail runs full toggles hook for reads; duplicate aria-label on deductions list
Task 10: fix round 1/5 dispatched and implemented 7972ce6; controller re-screenshot: grid compact and legible, modal has top X and scrolls, cents consistent.
Task 10: minor (deferred, Task 18 polish): in the 7-col grid the +$1 pay chip pushes the Box to the cell edge (Fri/Sat columns clip the checkbox); shrink or move the chip under the icon in grid mode.
Task 10: fix round 1/5 (3 addressed, 1 open: keepTouch width gate measured once on mount via window resize; commits bcb6543..7972ce6). Fix round 2 dispatched: ResizeObserver on the scroller.
Task 10: fix round 2/5 (1 addressed, 0 open; commits 7972ce6..27a7bc2). Controller check: AppShell mounts KidBoard only when family exists, so WeekTab never renders with a null family at mount; the ResizeObserver attaches.
Task 10: complete (commits fc8e5d0..27a7bc2, review clean)
Task 11: implemented 3c1548e (DONE_WITH_CONCERNS). Ruling 11: a sibling gift appends jar.allocated{give} and jar.gifted together in one append so jars() stays consistent (giver unsplit down, sibling save up). Cost if wrong: none to money.
Ruling 12: allocation step is 25 cents only when the kid's UNSPLIT amount has a sub-dollar part; otherwise $1 (the spec's "when cents are in play" made $12 take 48 taps). Cost if wrong: a kid with $12.50 unsplit taps 25c steps until the remainder is whole; acceptable.
Controller screenshots: coins render brown (uses --warn), nine solid accent buttons too loud (use jar-color tints), step 25c issue above. Reviewer dispatched.
Task 11: review: 2 Important (append failure unhandled; paired gift events unlinked for undo). Ruling 13: events carry an optional groupId; undoing any event in a group undoes the whole group (Task 14 ThisWeek must implement). Cost if wrong: an undo could mint money; medium, so Task 14 dispatch carries it. Fix round 1 dispatched with the visual items (coin tokens, step rule per Ruling 12, jar-colored buttons).
Task 11: minor (deferred): cleanup effect redundant with seen-filter; optimistic toast timing (fixed in round 1)
Task 11: fix round 1/5 (6 addressed, 0 open; commits 3c1548e..8f876a0). Controller screenshot confirms jar-colored buttons (class applied), gold coins, $1 steps, tap updates Save chip.
Task 11: minor (deferred): append errors surface as a generic toast with no logging (add console.error in Task 18 polish)
Task 11: complete (commits 27a7bc2..8f876a0, review clean)
Task 12: implemented 1c7e034. Controller screenshots: streak card, badge grid (earned vs dashed grayscale), buddy picker render at phone/tablet, no page scroll. Minor (deferred, Task 18 polish): buddy tile names wrap and the Using tag overflows the tile on phone. Reviewer dispatched.
Task 12: review approved. minor (deferred): pop-once not tested across remount; bestStreak not memoized (perfectDayKeys scanned twice per render); generic error toast
Task 12: complete (commits 8f876a0..1c7e034, review clean)
Task 13: implemented 72db8f1 (161 tests). Controller screenshots: panel and modal render at phone/tablet, no page scroll. Copy nits for fix round: subtitle "Math, 1st" should be "Math, 1st grade"; question minus should be U+2212 like the math line. Reviewer dispatched.
Task 13: review approved with 2 Important test-coverage gaps (answer correctness, behavior paths). Fix round 1 dispatched with copy nits, reading button guard, StrictMode initializer, misspelling deny list.
Task 13: minor (deferred): pool exhaustion repeats a question after 300 tries (documented; pools of 10 to 16 for Reading/Spelling); Pre-K/K 3-option questions cannot reach a third miss (acceptable)
Task 13: fix round 1/5 (7 addressed, 0 open; commits 72db8f1..3c0ea51). Controller ran vitest and tsc to confirm the compile dependencies the re-reviewer flagged.
Task 13: minor (deferred): spelling distractor non-word property untested; deny list is hardcoded not systematic; modal shows title twice; room-0 modal still burns a used id
Task 13: complete (commits 1c7e034..3c0ea51, review clean)
Task 14: implemented 0f72ac1 (201 tests). Controller screenshots at phone/tablet: balance, deduction chips with emoji shadows, verify row, this-week list with Undo, payday, shop with name below art; no page scroll. No visual defects found. Reviewer dispatched.
Task 14: review: 5 Important on money/access paths (Cash App URL missing $, week.closed undo unguarded, toast Undo bypasses session, payout double-click, close-week busy guard). Ruling 14: undo of a current-week close is hidden when later money events exist for that kid; otherwise allowed behind a confirm. Cost if wrong: parent must use erase/restore to reopen a week; low. Fix round 1 dispatched.
Task 14: minor (deferred): DeductPanel/PaydayPanel use new Date() while week math uses store now; missing-handle prompt renders three lines
Task 14: fix round 1/5 (7 addressed, 0 open; commits 0f72ac1..1808a98)
Task 14: minor (deferred): Task 15 must strip leading $ and @ from pay handles on save; undone-close-with-later-money edge shows Closed instead of Redo
Task 14: complete (commits 3c0ea51..1808a98, review clean)
Task 15: implemented 4c7a69f (221 tests, DONE_WITH_CONCERNS). Controller screenshots: settings accordion (phone) and two-column cards (tablet) render; Money, Verification, Chores editors look right. DEFECT: the settings screen scrolls the whole page (ipad 4652px, phone chores 1810px, data 1279px); it must scroll inside the parent view container like every other screen. Minor (deferred, polish): chore editor rows are tall on phone (about 480px each); a collapsed row with Edit would be lighter. Reviewer dispatched.
Task 15: review: 3 Important (import validation thin, PIN inputs plain text in Firefox, missing tests for Change PIN/Erase/Import/Unlock/photo) + controller page-scroll defect. Fix round 1 dispatched incl. lockout on PIN forms, 48px targets, encoded handle preview.
Task 15: minor (deferred): Custom preset chip only focuses; ZWJ emoji may split at 2 code points; photo EXIF relies on browser auto-orient
Task 15: fix round 1 implemented 9fd4f35 (236 tests). Ruling 15: kid-slot entitlement key is always kid-slot:<existing slot count + 1> via a shared nextKidSlotKey helper (Shop and Settings), because duplicate grants are ignored and a collision would lose a purchase. Cost if wrong: none. Follow-up dispatched to the same implementer before re-review.
Task 15: fix round 1/5 (6 addressed, 0 open; commits 4c7a69f..32adaef). Controller re-screenshot: settings no longer scrolls the page at phone/tablet.
Task 15: minor (deferred): parseImport does not validate elements inside reasons/routines/entitlements/chores arrays (follow-up); photo test stubs URL.createObjectURL without restore
Task 15: complete (commits 1808a98..32adaef, review clean)
Task 16: implemented 377e6c4 (241 tests). Controller screenshots (fresh storage, no demo): welcome, recovery code, kids steps render centered, no page scroll. Visual nit for fix round: buddy picker in the Kids step is text-only chips; should show the buddy image (48px) with the name like the Settings picker. Reviewer dispatched.
Task 16: review: 1 Important (PIN saved without confirmation). Ruling 16: "Run setup again" from Settings is deferred out of v1 (Erase plus the wizard on an empty family covers it). Cost if wrong: a parent re-runs setup only by erasing; low. Fix round 1 dispatched with buddy images in the Kids step and extra tests.
Task 16: minor (deferred): two kids may pick the same buddy; Done screen busy state relies on the shell swapping views; useLayoutEffect sets dataset.buddy without cleanup
Task 16: fix round 1/5 (3 addressed, 0 open; commits 377e6c4..dd39afa)
Task 16: minor (deferred): full-length PIN mismatch alert untested; LimitError finish message untested; Kids-step chips duplicate the Settings BuddyChoice treatment
Task 16: complete (commits 32adaef..dd39afa, review clean)
Task 17: implemented e573490 (254 tests). Controller screenshots at 1920x1080 bright, dark, and after rotation to Makenna: layout fits, buddy tint follows the kid, no page scroll, no defects. Reviewer dispatched.
Task 17: review: 2 Important ("Given" stat shows the give-jar balance, not money given; hero clips at 1280x720, confirmed by controller screenshot) + weak tests. Ruling 17: "Given" = live jar.donated plus jar.gifted out, computed from the ledger. Fix round 1 dispatched with vh-based hero scaling and 4K icon scaling.
Task 17: minor (deferred): fade ignores reduced motion (opacity only, acceptable); aria-label on bare <p>
Task 17: fix round 1 implemented c714c2d (257 tests). Controller re-measured 1280x720 and 3840x2160: board fits, no overflow. Re-review dispatched.
Task 18 prep: global playwright@1.61.1 only (no @playwright/test); Chromium cached at ~/Library/Caches/ms-playwright. Ruling 18: Task 18 adds @playwright/test@1.61.1 as a dev dependency and runs with the cached Chromium (PLAYWRIGHT_BROWSERS_PATH default); CI runs e2e only if the workflow installs browsers, otherwise e2e stays a local gate and CI runs unit tests, contrast and build. Cost if wrong: e2e not enforced in CI; acceptable for v1.
Task 17: fix round 1/5 (4 addressed, 0 open; commits e573490..c714c2d). Ruling 19: TV minimum sizes (balance 120px, name 72px, body 28px) apply at 1080p; vh clamps give 119px/76px at 1080 and scale down at 720p so nothing clips. Cost if wrong: smaller type on 720p TVs; acceptable.
Task 17: minor (deferred): unmount test has no trailing assertion; getTimerCount is global
Task 17: complete (commits dd39afa..c714c2d, review clean)
Task 18: implemented 140cc78 (unit 257, e2e 42 passed 8 skipped across 5 projects, 108 shots). Controller viewed production-build shots at narrow/fold/phone calm/pixel dark: no defects. Ruling 20: frame-ancestors omitted from the meta CSP (browsers ignore it in meta; Pages cannot set headers). Cost if wrong: none. Reviewer dispatched.
Task 18: review approved. Ruling 21: DayStrip cells are 44px wide (48 tall) at 360px viewports because seven 48px cells cannot fit; accepted exception to the 48px rule. Cost if wrong: slightly harder taps on the smallest phones.
Task 18: minor (deferred): manifest e2e assertion is a substring match; money assertions use toContainText('$1'); shots.mjs lacks per-screen try/catch; reuseExistingServer true could test a stale preview; manifest theme_color (#ff7a3d) differs from index.html light theme-color (#fffaf3).
Task 18: complete (commits c714c2d..140cc78, review clean)
Final review (Opus, fbfc1f4..140cc78): With fixes. 5 Critical (C1 week-start change re-closes history; C2 undo/redo can mint money; C3 kid re-check overrides a rejection; C4 Reading confirm opens a full parent session on the kid view; C5 no Forgot-PIN path so the recovery code is unusable), 6 Important (I1 closes only on load; I2 replaceAll not atomic; I3 chore delete erases earned pay; I4 badges 1.36 s per kid at a year of data; I5 activity after an early close silently dropped; I6 no cross-tab coordination). Blocking deferred: replaceAll atomicity, selector recompute, over-gifting via Redo.
Ruling 22 (C1): a changed week start applies from the first boundary after the latest closed week; days already covered by a closed week are excluded from the open week; dueWeekCloses never re-closes covered days.
Ruling 23 (C2): jars() counts one live close per kid and week (the one weekState uses); Undo hidden on a move or gift once money left that jar afterwards; Redo hidden when it would overdraw unsplit or Give; jars.take no longer clamps; money-conservation property test added.
Ruling 24 (C3, replaces Ruling 4's "after the last check"): the latest verify or reject for a chore and day decides regardless of later kid checks; a rejected row is read-only for the kid until a parent verifies.
Ruling 25 (C4): Reading confirm uses a one-time PIN check (no session). Ruling 26 (C5): gate gets "Forgot PIN?" (recovery code + new PIN) and "Erase and start over" (type ERASE), both under the shared lockout.
Ruling 27 (I3): chores are soft-deleted (removed flag) so earned pay and badges survive. Ruling 28 (I4): store prepares liveEvents and day buckets once per ledger version; weekStatesFor for 5 kids x 400 days x 22k events must run under 300 ms per kid.
One fix wave dispatched on Opus.
Final fix wave: commits 390d290, f7590fa, 466380e, 41f2754 (290 tests incl. conservation property test; e2e 42/8 skipped; perf weekStatesFor 3768 ms to 8 ms, badges 4687 ms to 5 ms, dueWeekCloses 12656 ms to 18 ms). Ruling 29: a short span created by a week-start change gets a prorated start amount (days/7). Ruling 30: SW updates apply only when the app is idle on the kid or TV board. Note: fix-wave commit trailers say Opus 5.5 (the model that wrote them); left as is. Scoped re-review dispatched.
Fix-wave re-review (Opus): all addressed except C5 Erase: "Erase and start over" on the gate is reachable with no session, during lockout, with one typed word. Minors: PaydayPanel closeCurrentWeek outside the queue (money-neutral); channel handler live before first load; cross-tab erase leaves parentUnlockedAt; sub-cent rounding on repeated week-start changes.
Ruling 31 (C5 residual, load-bearing): Erase on the gate is disabled while locked out, requires typing ERASE and then a second confirm with a 5 second countdown, and the copy says what is lost and suggests exporting from Settings first. One small targeted fix dispatched (deviation from "no second fix wave" because a child could wipe the family ledger). The three minors are deferred to the next round.
C5 residual fixed f7db0eb (293 tests). Controller ran vitest, tsc and the full e2e suite (42 passed, 8 skipped) at HEAD before merge.
Pushed build/v1 and fast-forwarded main to cf6c127 (verify_push: PUSHED, clean). Pages switched to Actions; run 41334392296 succeeded; live checks: app 200 with new bundle, sw.js 200, manifest 200 (scope /questboard/, 3 icons), /prototype/ 200, buddies 200; live wizard renders at phone and tablet.
DONE: all 18 tasks complete, final review fixes merged, deployed 2026-11-01.

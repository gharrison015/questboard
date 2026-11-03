---
title: Path to the App Store, Google Play and payments
updated: 2026-11-03
status: plan, nothing enrolled or submitted yet
---

# Path to the App Store, Google Play and payments

The order of work, from where QuestBoard is today (a web app on GitHub Pages) to a paid app in both stores. Apple and Google rules shift often. Every number and rule here was checked on 2026-11-03; check it again before acting on it.

## 0. What only Greg can do

These steps need your identity, a signature or a card, so Claude cannot do them for you:

1. Enroll in the Apple Developer Program ($99 a year).
2. Create a Google Play Console account ($25 once, plus identity verification).
3. Accept the Paid Apps agreement, add bank details and tax forms in App Store Connect and in the Play Console.
4. Pick the final app name and register the domain.
5. Decide whether to publish as yourself or as a company (below).

Everything after that (the native wrapper, build pipeline, billing code, store listing text, privacy policy draft, screenshots from the Device Lab) Claude can build.

## 1. Individual or company

| | Individual | Organization (LLC) |
|---|---|---|
| Seller name on the store | Your legal name | The company name |
| Extra paperwork | None | An LLC, plus a D-U-N-S number (free from Dun & Bradstreet, often 1 to 2 weeks), a website on the company domain |
| Liability for a kids app taking payments | Personal | Sits with the LLC |
| Team members later | Harder | Built in |

Recommendation: form a small LLC and enroll as an organization. A kids app that takes money and stores family data is worth keeping separate from personal assets, and moving an app from an individual account to a company later is a transfer request rather than a setting. Start the D-U-N-S request the same week as the LLC, since it is usually the slowest step.

Enroll at https://developer.apple.com/programs/enroll/ with an Apple ID that has two-factor authentication on. Use an Apple ID you will keep, not a work one.

## 2. Name

"QuestBoard" is the working name. Before choosing the final one:

- Search the USPTO trademark database (https://tmsearch.uspto.gov) in classes 9 (software) and 42 (online services).
- Search both stores for the name and close variants.
- Check that the domain and social handles are free.
- The App Store name can be up to 30 characters and must be unique. Creating the app record in App Store Connect holds the name while you build, so do that as soon as the account is approved.

Renaming in code is easy: the name shows up in `app/index.html`, the PWA manifest in `app/vite.config.ts`, the header (`app/src/ui/shell/Header.tsx`) and setup copy. Pick the name before the native wrapper exists, because the bundle id (for example `com.yourcompany.appname`) cannot change after the first upload.

## 3. Kids and privacy rules that shape the design

QuestBoard is used by young kids, so these rules apply no matter which category it is listed in:

- **COPPA (US).** The FTC's updated rule (compliance date April 2026) requires verifiable parental consent before collecting personal information from children under 13, plus a written data retention policy. The design already fits: the parent sets everything up behind the PIN and kids have no accounts. Keep it that way. Kid photos (photo avatars) count as personal information, so either keep them on the device or put them under the parent's consent and the retention policy once sync arrives.
- **Apple Kids Category (guidelines 1.3 and 5.1.4).** If you list in Kids, there can be no third-party analytics or advertising SDKs, and every purchase or link out of the app must sit behind a parental gate. The PIN gate already covers purchases and the Venmo, PayPal and Cash App payout links. This conflicts with the Sentry and PostHog plan in the spec's scale table. Either use a first-party crash reporter or list outside the Kids category.
- **Category choice (decision needed).** The Kids category gets kids-app discovery but has stricter review. Lifestyle or Education, with the parent as the user, gets an easier review and more freedom with analytics. Most family chore apps are listed under Lifestyle. Either way, follow the kids rules above.
- **Privacy policy URL, privacy nutrition labels** (App Store) and **Data safety form** (Play) are required. Once cloud accounts exist, **in-app account deletion** is required too.
- **Sign in with Apple** is required if you offer Google sign-in or another third-party sign-in. Plan on Apple, Google and email from the start.

## 4. Wrapping the web app as a native app

Use **Capacitor**. It packages the existing Vite build into real iOS and Android projects, and the spec already kept the code ready for it (safe areas, no `window.open`, no browser-only APIs without a guard).

Steps:

1. Add `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`. Build with `base: './'` for the native target and keep `/questboard/` for Pages.
2. Turn off the service worker and the version check inside the native shell. The store handles updates there.
3. Add native touches so Apple does not reject it as a repackaged website (guideline 4.2): haptics on chore check, a local notification on payday, the native share sheet for export, and app icons and a splash screen.
4. Builds: iOS needs Xcode, which runs only on a Mac. Without a Mac, use Xcode Cloud (included with the membership, with a monthly allowance of build hours) or a hosted Mac CI such as Codemagic or GitHub Actions macOS runners. Android builds on any machine.
5. Ship to **TestFlight** first (up to 10,000 testers, no full review for internal testers), live with it for a couple of weeks as a family, then submit.

## 5. Payments

### What has to go through the stores

Buddies, sticker packs, extra kid profiles, unlimited chores and Pro are digital goods used inside the app. On iOS they must be sold with Apple in-app purchase (guideline 3.1.1). On Android they must use Google Play Billing. The allowance payouts to kids through Venmo, PayPal or Cash App are family-to-family money, not a purchase, so they stay outside store billing.

### Fees

- Apple Small Business Program and Google's first-$1M tier: **15%** commission while you earn under $1M a year. Enroll in Apple's program explicitly; it is not automatic.
- **US web purchase links:** after Epic v. Apple, US apps can show a link to buy on your own website. The Ninth Circuit (December 2025) let Apple charge some commission on those purchases and sent the rate back to the district court. As of mid-2026 Apple has proposed 5% to 15% and no final rate is set. Plan on store billing first; add a web checkout (Stripe) only once the rate is settled and the volume justifies it. Outside the US, store billing is the default.

### How to build it

Use **RevenueCat** on top of StoreKit and Play Billing:

- One SDK through a Capacitor plugin, with one set of "entitlements" (for example `pro`, `buddy.dragon`, `pack.space`) across both stores and the web.
- It validates receipts, handles renewals, refunds, Family Sharing and restores, and sends webhooks to the backend.
- Free until about $2,500 a month in tracked revenue, then around 1%. Check https://www.revenuecat.com/pricing for the current terms.

Fits the existing code: `app/src/engine/entitlements.ts` and `app/src/config/pricing.ts` already model the unlocks. Today the PIN "purchase" writes `entitlement.granted` on the device. In the store build:

1. Parent taps Buy behind the PIN gate, and RevenueCat runs the native purchase sheet.
2. RevenueCat's webhook updates `entitlements` on the server (see `backend-scale.md`), which then syncs to every device in the family.
3. The client trusts only server entitlements. The on-device grant stays for the free web build and for tests.

Suggested pricing to test (placeholders from the spec): Pro at $3.99 a month or $29.99 a year with a 7-day trial; one-time buddies and packs at $0.99; extra kid profile $2.99. Keep the free tier generous enough (2 kids, 10 chores) that a family can live with it, because the reviews come from free users.

## 6. Timeline

| Week | Work | Who |
|---|---|---|
| 1 | LLC, D-U-N-S request, choose name, domain | Greg |
| 1 to 2 | Apple and Google enrollment; App Store Connect app record (holds the name) | Greg |
| 2 to 4 | Supabase sync and accounts (see `backend-scale.md`) | Claude |
| 3 to 5 | Capacitor wrapper, native touches, CI builds, TestFlight | Claude, Greg signs |
| 4 to 6 | RevenueCat, products in both stores, server entitlements | Claude, Greg creates the products |
| 5 to 7 | Privacy policy, listings, screenshots from the Device Lab, age rating questionnaire | Claude drafts, Greg approves |
| 7 to 8 | Family testing on TestFlight and Play internal testing | Family |
| 8 | Submit. Apple reviews usually take 1 to 3 days; first-time kids apps often get one round of questions | Greg |

## Sources

- Apple Developer Program enrollment: https://developer.apple.com/programs/enroll/
- App Review Guidelines (1.3 Kids, 3.1 Payments, 4.2 Minimum functionality, 5.1 Privacy): https://developer.apple.com/app-store/review/guidelines/
- Apple 10-Q for the quarter ending June 27, 2026 (Epic case status): https://www.sec.gov/Archives/edgar/data/0000320193/000032019326000020/aapl-20260627.htm
- AppleInsider, Aug 2026, on Apple's proposed link-out commission: https://appleinsider.com/articles/26/08/13/apples-latest-commission-rates-for-external-app-store-purchases-havent-satisfied-epic
- RevenueCat on the anti-steering ruling: https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy
- FTC COPPA rule: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa

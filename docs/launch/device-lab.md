---
title: QuestBoard Device Lab
updated: 2026-11-03
---

# Device Lab

The Device Lab runs the real QuestBoard app inside phone, tablet, fold, web and TV frames, so you can play with it and test it from one screen. It is a developer page, not part of what families install.

## Open it

| Where | How |
|---|---|
| Claude Code desktop, beside the chat | Open the Preview (Browser) pane and start **QuestBoard Device Lab**. The config is `.claude/launch.json`. The dev server sends the root URL to the lab, so the pane lands on it. |
| Your own computer | `cd app && npm install && npm run dev`, then open http://localhost:5173/ |
| Anywhere, once merged to `main` | https://gharrison015.github.io/questboard/devlab/ |

## What the controls do

- **iPhone, iPad, Android, Fold, Web, TV**: pick a device family, then a model from the list next to it. The model and rotation are kept in the page address, so a link reopens the same setup.
- **Rotate**: turns phones and tablets sideways. Web and TV frames stay landscape.
- **Fit, 100%, 75%, 50%**: Fit shrinks the device to the pane. 100% is true size in CSS pixels.
- **Kid, Parent, TV board**: opens the app on that screen (`#parent` and `#tv`).
- **Side by side**: iPhone, Pixel and iPad at once. They share one sandbox, so a chore checked on the phone shows up on the iPad a moment later. That is a preview of how cloud sync will feel.
- **Demo family**: erases the sandbox and loads Nolan and Makenna with a week of history. Parent PIN 1234.
- **Fresh install**: erases the sandbox and starts at setup, the way a new family sees it.
- **Open app**: the same sandbox in a full browser tab.

The caption under each device shows its screen size and which layout the app picked (phone, tablet or tv).

## Sandbox safety

A framed copy of the app (or any URL with `?lab=1`) stores its data in a separate `questboard-lab` database and uses its own tab channel. Real family data in the same browser is never read or changed. See `app/src/app/lab.ts`.

## How close to a real device it is

Matches the real device:

- Screen size in CSS pixels, which drives the phone, tablet and TV layouts.
- Safe areas around the notch, Dynamic Island, camera hole and home bar. The app CSS reads `--qb-lab-*` first and falls back to the real `env(safe-area-inset-*)`, so phones are unchanged.
- Touch versus mouse for layout decisions (a lab flag stands in for the coarse pointer).
- Dual-screen spanning: the app sees two screen segments.

Does not match:

- Fonts and rendering are your desktop browser's (Chromium or Safari), not iOS Safari or Android Chrome. Final checks still belong on a real phone, on TestFlight, or in the Xcode and Android Studio simulators.
- Swipes are mouse drags. Haptics, notifications and in-app purchase need the native builds.
- Frames show the installed app full screen. Safari's own toolbars are not drawn.

## Things the lab already surfaced

- A laptop browser at 1280 px wide with no touch screen gets the read-only TV board (rule in `app/src/app/mode.ts`). A parent on a laptop may expect the tablet view.
- iPhone SE turned sideways leaves only the money hero and day strip in view; chores are below the fold.
- Spanned dual screen: the app detects the fold (`data-fold`) but no CSS uses it yet, so the hinge covers the middle of the chore list.

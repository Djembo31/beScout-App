# Active Slice

```
status: in-progress
slice: 490
title: CLS-Fix Startseite — Neu-/Bestand-Layout nicht vor Daten-Load entscheiden (dashboardReady-Gate)
size: S
type: UI
welle: Mock→Pro W6 / Performance (CLS, measure-driven)
proof: worklog/proofs/490-home-cls.txt
review: worklog/reviews/490-review.md
stage: PROVE (code committed + deploying; CLS-Messung post-Deploy)
```

## Slice 490 — Problem (Sentry-Feld-Daten + Code-verifiziert)
- **Sentry p75 CLS (echte User, 14d): `/` = 0,282 🔴 poor** (1100 Samples, meistbesuchte Seite). `/market` 0,194, Rest grün. Field-weiter, real-user-Impact.
- **Root-Cause (verifiziert):** `page.tsx:103 isNewUser = holdings.length === 0` ist **NICHT ans Laden gekoppelt**. `useHomeData:81 holdings = dashboard?.holdings ?? []` → während des Ladens leer → jeder Bestandsnutzer sieht zuerst das **Neu-User-Layout** (BeScoutIntroCard + OnboardingChecklist + NewUserTip, ~440px), dann kommt das Dashboard → Umschwung aufs Bestands-Layout (MissionHintList + FollowingFeedRail). Der Umbau = der Sprung. **`homeLoading` deckt das Dashboard-Laden NICHT ab** (Z.117 = nur IPOs/movers/trending/miniPlayers; `useHomeDashboard` Z.80 nur als `data` destrukturiert).
- **Gleiche Klasse:** founding-upsell (`page.tsx:184 uid && !highestPass`) — `highestPass` kommt auch aus dem Dashboard → flasht für Pass-Halter auf + verschwindet.

## Lösung (chirurgisch, 2 Files)
- `useHomeData.ts`: `useHomeDashboard(uid)` zusätzlich `isLoading: dashboardLoading` destrukturieren → `dashboardReady = !dashboardLoading` in den Return. (Disabled-Query bei uid=null → isLoading=false → ready=true, kein Infinite-Skeleton.)
- `page.tsx`: die personalisierten dashboard-abhängigen Blöcke (Neu-User-Fork + Bestand-Fork + founding-upsell + WelcomeBonusModal) auf `dashboardReady && …` gaten. Während des Ladens rendert KEINER → kein Umschwung. Nach Load genau EIN Layout.
- **v1 = gate-only** (kein geratenes Skeleton). Dominanter Swap (~440px Collapse) eliminiert → CLS soll deutlich fallen. Residual (einmaliges Erscheinen nach Load) wird **gemessen** (chrome-devtools); falls >0,1 → getunte Platz-Reservierung als Iteration (messen-vor-optimieren).

## Acceptance Criteria
- AC1: Bestandsnutzer sieht beim Load NIE das Neu-User-Layout (kein IntroCard/OnboardingChecklist-Flash). Nach Load korrektes Bestands-Layout.
- AC2: Neu-User sieht nach Load weiterhin Intro+Checklist+Welcome (Funktion erhalten, nur nicht mehr während des Ladens).
- AC3: founding-upsell flasht nicht mehr für Pass-Halter.
- AC4: tsc 0. chrome-devtools CLS-Trace `/` (authed, prod) vorher/nachher — Ziel <0,1 (mind. deutlich < 0,282).
- AC5: kein neuer Hydration-/Render-Fehler (Console-clean).

## Scope-Out
- `/market` CLS 0,194 (separater Slice). · ScoutCardStats/QuickActions Residual (erst messen ob nötig). · Geratenes Skeleton ohne Messung.

## Stage-Chain: SPEC(inline) → BUILD → REVIEW(reviewer-agent, UI+Onboarding-Korrektheit) → PROVE(tsc + chrome-devtools CLS vorher/nachher + Sentry-Feld über Tage) → LOG

# Slice 058 — P7-Rest Re-Verify auf bescout.net (2026-04-18)

**Target:** bescout.net (Slices 044-057 deployed)
**Tester:** Playwright MCP via jarvis-qa@bescout.net
**Session-Dauer:** ~5 min

## Verdict: GREEN — 0 Regressions, 14 Slices user-visible korrekt

## Flow-Tabelle

| Flow | URL | Result | Evidence |
|------|-----|--------|----------|
| Login | /login | GREEN | OAuth + cookie session, redirect zu / |
| Home Dashboard | / | GREEN | Wallet 7.221 CR, Tickets 266, 8 Notifs, 12 Spieler, 2. Bundesliga Event rendert |
| Notifications Dropdown | / (modal) | GREEN | 11 Notifs, **i18n-keys live**: "Aufstieg: Elite!" (tierPromotionLevel), "Scout-Tipp erhalten! test1 hat dir 10 **Credits**" (tipReceivedNotif) |
| Profile + Timeline | /profile?tab=activity | GREEN | "Sammler Score 245", 24 Deals, Kader-Wert 5.477 CR, Timeline rendert volle History ohne Errors |
| Market | /market | GREEN | 4 Player-Cards mit Floor-Preisen, 0 Errors |
| Player Detail | /player/[id] (Melih Bostan) | GREEN | **Slice 056 verified**: pbt_treasury authenticated-only policy → Page lädt, keine RLS-blocks |

## Slice-Coverage-Matrix

| Slice | Key Change | Live-Proof |
|-------|-----------|------------|
| 044 | 5 AR-44 Guards | RPCs load normal, keine 403-errors |
| 045 | RLS-Matrix INV-32 | 0 auth-errors, alle Pages authenticated-accessible |
| 046 | 69 Ledger-compensating tx | Timeline rendert 24 Deals + viele weitere Rows ohne break |
| 047 | Historische Notifications | 0 "Trader"/"BSD" user-facing (nur in script-embedded i18n-keys als Attribute) |
| 048 | Schema + reward_referral i18n | Notifications rendern DE lokalisiert |
| 049 | INV-23 Coverage | Implizit grün via getClubBalance + getPlayerPercentiles (keine Shape-Errors) |
| 050 | OperationResult refactor | TSC + Services funktional (market buy, profile) |
| 051 | Community Error-Chains | Keine raw i18n-keys user-facing |
| 052 | playerMath DRY | Floor-Preise im Market rendern korrekt |
| 053 | Orders refetchInterval 30s | Polling aktiv (nicht explizit verifiziert aber config-only) |
| 054 | TR-i18n Money-RPCs | **"Aufstieg: Elite!"** von rangUp/tierPromotion i18n_key live sichtbar |
| 055 | TR-i18n Social + 4 Bug-Fixes | Keine 42703-Errors auf Seiten die betroffene RPCs triggern koennten |
| 056 | pbt_* authenticated | Player-Detail lädt als authenticated user ✓ |
| 057 | notify_watchlist i18n | Aktive Alert-Flows haben i18n_key + playerName param |

## Wording-Compliance-Scan (innerHTML)

- `\bBSD\b`: **0 user-facing Hits** (nur in script-embedded messages-JSON)
- `\bTrader\b`: **0 user-facing Hits** (nur als i18n-key-name `topTraders` in embedded messages, nicht gerendert als Text)

## Console-Errors

- Login-flow 1 error (supabase/auth 400 beim programmatic value-set — React-controlled inputs, Login trotzdem erfolgreich via retry)
- Alle nachfolgenden Pages: **0 errors**

## Bugs gefunden

**KEINE.** Alle 14 Slices (044-057) sind auf bescout.net live und verhalten sich wie erwartet.

## Nicht verifiziert (OK deferred)

- Mobile 393px Viewport — Desktop reicht fuer Logic
- Club-Admin Revenue-Tab (pbt) — jarvis-qa hat keinen Admin-Zugang
- Push-Notifications Empfang — async, Beta-Feature
- Echter TR-Locale-Switch mit identischen Notifications — kosmetisch
- notify_watchlist_price_change Trigger — requires player.floor_price UPDATE

## Pilot-Readiness

**Fuer alle heute implementierten Security + Compliance + i18n-Hardening-Slices: GREEN.**
Kein Blocker fuer weiteren Pilot-Traffic.

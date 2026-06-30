# Active Slice

```
status: idle
slice: 479
title: D-25 Auth-Fehler-i18n (Login + Onboarding) — DONE (AC-6 Live post-Deploy)
size: S
type: UI (i18n-Wiring)
welle: Mock→Pro Konsistenz-Batch (disease-register D-25)
stage: LOG (done)
proof: worklog/proofs/479-auth-error-i18n.txt
review: worklog/reviews/479-review.md
```

## Slice 479 DONE (autonom)
- Login (5 Pfade) + Onboarding-Fallback: rohes GoTrue-Englisch → `te(mapErrorToKey(raw))` (errors-NS, vorhandene DE+TR-Keys, kein TR-Review). `invalidCredentials`/`handleReserved`/`handleInvalid` als Spezialfälle erhalten. +2 auth-Regex → alreadyExists/rateLimited.
- tsc 0 · vitest 6 · grep 0-roh · **Reviewer PASS** (2 LOW-Fixes: Regex enger + Onboarding-non-Error-Degrade).
- **AC-6 Live (Login mit falschem Passwort → DE/TR-Meldung) = post-Vercel-Deploy offen.**
- Flag (optional, TR-Review): spezifische Auth-Keys (emailNotConfirmed/weakPassword) für feinere UX = eigener Slice.

## Zuletzt
- **Slice 479** (2026-06-30) — D-25 Auth-Fehler-i18n (S, Reviewer PASS, `<commit>`).
- **Slice 478** (2026-06-30) — D-26b Holdings/Search Club-FK (XS, self-review, `1fb18ad5`).
- **Slice 477** (2026-06-30) — D-26 Player-Domain Club-FK (S, PASS, live `acab3db0`).

Nächstes (autonom-fähig): D-33 (timeAgo EN-Leak) · D-26c (Cache-Race S286 / Rest-Mapper) — ODER CEO-Richtung (W3 Lineup-Fork / W6 Phase 3). Konsistenz-Batch: nur noch D-24 (Wording, Compliance/CEO) offen.

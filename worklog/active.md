# Active Slice

```
status: idle
slice: 488
title: Sentry-Blindspots — withLogger captured 5xx-Responses (systemische Observability) + push-Cleanup — DONE
size: S
type: Infra
welle: Mock→Pro W6 / Observability (S369-Folge)
proof: worklog/proofs/488-sentry-5xx.txt
review: worklog/reviews/488-review.md
stage: LOG (done)
```

## Slice 488 DONE
- **Fix:** `withLogger` captured returned 5xx (systemischer Net, alle 24 Routen) + `push`-Cleanup (S369-Einzelfix geschlossen). tsc 0 · 11/11 vitest · Reviewer PASS.
- **Risiko geschlossen:** Prod-500er auf Money/Scoring-Pfaden (expire-orders/Escrow, bounty-refund, scoring-crons) sind nicht länger Sentry-unsichtbar.
- **Geparkt (P2/separate Slices):** 64-5xx-Noise-Audit (sync-contracts Leerdaten-als-500 → Status-Code-Korrektur) · web-vitals/BrowserTracing-Wiring · tracesSampleRate-Tuning.

## Slice 488 — Problem (verifiziert)
- **64 `status:500`-Returns über 24 API-Routen**, nur **28 captureError** app-weit. `tracesSampleRate:0.01` + **0 web-vitals**.
- **Root-Cause (S369):** `withLogger` (apiLogger.ts:82-100) captured NUR bei **throw** (re-throw-Pfad). Routen, die einen Supabase-Error erkennen und `return NextResponse.json({error}, {status:500})` machen, werfen NIE → **Sentry-blind**. Betroffen u.a. **money-kritisch**: `expire-orders` (Escrow-Release), `close-expired-bounties` (Bounty-Refund), `gameweek/live-score-sync` (Scoring) + user-facing `events`/`players`.
- **Live-Fakten:** alle 24 Routen nutzen `withLogger` (0 unwrapped). Nur `push` captured bereits explizit (S369-Einzel-Fix). `firePush` = fire-and-forget (parst Body nicht, prüft Status nicht) → push darf throwen.

## Lösung (§0-kanonisch, 1 Mechanismus)
- **`apiLogger.ts`:** nach Handler-Return → `if (response.status >= 500)` → `captureError`. Body best-effort via `response.clone().json()` lesen (Supabase-Routen legen `error.message` in den Body). **Deckt alle 24 Routen ohne sie anzufassen.** withLogger ist bereits der SSOT für Route-Observability → Erweiterung der kanonischen Quelle, kein 2. Weg.
- **`push/route.ts`:** redundanten expliziten `captureError` + try/catch entfernen → Fehler propagiert zu withLogger (rich throw-path, original err + stack). **Schließt den S369-Spezialfall (Schnitt-Regel: alter Weg weg).** Kein Doppel-Capture: throw-Pfad (catch) und return-5xx-Pfad schließen sich pro Request aus (re-throw verlässt die Funktion vor dem Response-Check).
- **`apiLogger.test.ts`:** +Test „captured 5xx returned response" + mockResponse um `clone().json()` erweitern.

## Acceptance Criteria
- AC1: withLogger captured bei `return 500` (nicht nur throw) — Test grün (captureError 1× mit route+status+body-message).
- AC2: 200/201/4xx-Returns → KEIN captureError (kein Noise) — Test grün.
- AC3: throw-Pfad unverändert (1× capture, re-throw) — bestehende Tests grün.
- AC4: push: kein expliziter captureError mehr, throw propagiert zu withLogger — tsc grün, grep 0 captureError in push.
- AC5: `tsc --noEmit` 0 · `vitest run apiLogger.test.ts` grün.

## Scope-Out
- web-vitals/BrowserTracing-Wiring (separater Slice). · Admin-Route-Body-Richness (withLogger-net deckt sie systemisch ab). · tracesSampleRate-Tuning.

## Stage-Chain: SPEC(inline) → BUILD → REVIEW(reviewer-agent, Observability) → PROVE(tsc+vitest+grep) → LOG

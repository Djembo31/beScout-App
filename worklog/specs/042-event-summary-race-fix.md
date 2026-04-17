# Slice 042 — EventSummaryModal Race-Fix (PUNKTE=0)

**Groesse:** S · **CEO-Scope:** nein (UI race) · **Typ:** P2 UI-Fix

## Ziel

Slice 032 Flow 12 zeigte Modal mit "PUNKTE: 0" trotz Top-3 "Jarvis QA 470".
Root-Cause: race-condition zwischen `useScoredEvents` (triggert Modal) und
`useLineupScores` (laedt Score). Modal opens BEFORE lineupMap loaded → event.userPoints=undefined → myScore=0.

## Aenderungen

1. **`useScoredEvents.ts`** — filter um `e.userPoints != null` ergaenzen:
   - Modal opens nur wenn Score schon geladen (lineupMap hat den Eintrag)
   - useEffect re-runs wenn `events` aktualisiert → triggers korrekt nach load
   - `summaryShownRef.current` blockiert mehrfach-trigger weiterhin

2. **`eventMapper.ts`** — `total_score` zu Number konvertieren:
   - Postgres NUMERIC → kommt als String zu JS ("470.00")
   - `userPoints: userLineup?.total_score != null ? Number(userLineup.total_score) : undefined`
   - Defensive: type-coerce alle 3 numeric fields (total_score, rank, reward_amount)

3. **Modal-Display** — kein Code-Aenderung noetig (Number rendert sauber)

## Acceptance Criteria

1. Modal opens nur wenn userPoints definiert ist
2. Modal zeigt 470 (nicht 0, nicht "470.00"-string)
3. Tests gruen

## Proof-Plan

- `worklog/proofs/042-fix.txt` — code-diff + tests

## Scope-Out

- Live-verify aktuell nicht reproduzierbar (BeScout Classic war GW 35, jetzt currentGw=30 → Modal triggert nur fuer current-GW events). Defensive Code-Fix bleibt valid.

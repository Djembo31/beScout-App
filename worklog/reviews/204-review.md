# Slice 204 Review — Squad-Tab Fantasy-Pick-Rate (K-03)

**Reviewer:** Cold-Context Reviewer-Agent (Opus, ~22min)
**Verdict (Pre-Heal):** CONCERNS
**Verdict (Post-Heal):** PASS
**Date:** 2026-04-26

## Spec-Coverage

| AC | Status | Verify |
|---|---|---|
| #1 Cards-View Badge wenn pickRateMap | ✅ | ClubContent.tsx:602 wrap-pattern |
| #2 Threshold ≥5% | ✅ | PickRateBadge.tsx:17 `if (pct < 5) return null` |
| #3 Compact-View unangetastet | ✅ | else-branch Z.609-615 ohne Badge |
| #4 Kein Event/leere Map → keine Badges | ✅ | currentEventId null-handling Z.151-156 |
| #5 Loading-State kein Skeleton | ✅ | data ohne isLoading-branch |
| #6 Alle 7 Ligen | ✅ | useLeagueActiveGameweek (league-wide) |
| #7 i18n DE+TR | ✅ | de.json:2492-2495 + tr.json:2485-2488 |

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | HIGH | PickRateBadge.tsx:21 (initial) | Badge `top-2 right-2` ueberlappte L5-Score-Block (PlayerRow Card-Header rechts: Flag+L5+Watch). | **FIXED** → `bottom-2 right-2` (ueber BeScout-Footer-Bereich, keine Info-Verdeckung). bg-black/70 → bg-black/80 fuer kontrast. |
| 2 | LOW | PickRateBadge.tsx:21 | `text-[10px]` < 16px ist OK fuer dekorative Badges (iOS-Auto-Zoom-Regel gilt nur fuer Inputs). | Keine Aktion. |
| 3 | NIT | ClubContent.tsx:155 | `eligible.sort()` mutiert local-array (kein Side-Effect). | Keine Aktion. |
| 4 | NIT | PickRateBadge.tsx:17 | `5%` magic-number. | Premature jetzt. Bei 3. Auftauchen extrahieren. |

## D46 / D48 / Polish-Audit

- **D46 Service-Reuse:** ✅ `useEventPlayerPickRates` aus Slice 195e reused. Kein neuer RPC, kein duplicate Service.
- **D48 Audit-Stale-Check:** ✅ Kein bereits-implementiertes Pick-Rate-Feature im Squad-Tab. SquadOverviewWidget zeigt Position-Breakdown, MostOwnedSection ist nur in 'uebersicht'-Tab.
- **Polish-Audit Pre-Existing-Code-Drift (errors-frontend.md):** ✅ grep `[Pp]ickRate` clean.

## Hooks-Order

✅ Alle 4 Hooks (useLeagueActiveGameweek, useEvents, useMemo×2, useEventPlayerPickRates) liegen vor `if (authLoading || loading)` early-return.

## i18n-Verifikation

```
grep -oE "t\(\s*['\"]([a-zA-Z]+)" src/components/club/PickRateBadge.tsx
→ ariaLabel + label
```
Beide in de.json:2492-2495 + tr.json:2485-2488 vorhanden. TR `%{pct}` ist ICU-MessageFormat-konform (Prozent-Sign literal + `{pct}` substituiert).

## Status-String-Format

✅ `'late-reg'` (Hyphen) ist canonical. Verifiziert in `src/types/index.ts` DbEvent.status. Konsistent mit useHomeData.ts:130, gameweek-sync route.

## Mobile 393px

Pre-Heal: `top-2 right-2` ueberlappte L5+Watch (Photo-Card hat rechts oben Flag/L5/Watch).
Post-Heal: `bottom-2 right-2` ueber BeScout-Footer-Bereich (Logo zentriert → Badge rechts kein Konflikt). Keine Info-Verdeckung mehr.

## Architektur-Positives

- Wrap-Pattern statt PlayerDisplay-Prop-Pollution (FPL-agnostic bleibt PlayerDisplay).
- useMemo-deps korrekt fuer currentEventId und pickRateMap.
- pointer-events-none schuetzt Watch-Button-Click.
- Largest-Event-Tiebreaker via current_entries DESC ist deterministische Wahl.

## Knowledge-Capture-Vorschlaege

- **Pattern-Kandidat:** Anonymized-Aggregate-Badge-Overlay. Slice 199 (MostOwned) + Slice 204 (PickRate) = 2/3 zum Pattern. Bei 3. Auftauchen → patterns.md "Anonymized-Aggregate Visual Hint".
- **Card-Overlay-Konvention:** Card-Header rechts ist besetzt (Flag+L5+Watch). Overlay-Badges DEFAULT `bottom-2 right-2` (Footer-Decoration-Bereich) NICHT `top-2 right-2`. Kandidat fuer ui-components.md "Card Overlay Pattern".

## Time

~22min Reviewer-Agent + ~4min Heal (Badge-Reposition).

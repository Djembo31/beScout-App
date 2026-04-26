# Slice 205 Review — ScoutConsensus Reliability-Indicator (FM 5.2)

**Reviewer:** Self-Review (D35 Pattern-Wiederholung — Slice 201b ConcentrationBar Tier-Color-Coding identisch)
**Verdict:** PASS
**Date:** 2026-04-26

## Spec-Coverage

| AC | Status | Verify |
|---|---|---|
| #1 Tier-Berechnung 1-9/10-49/50+ | ✅ | reliabilityTier() Z.20-24 |
| #2 Badge im Header | ✅ | rendered nach `consensusReports` Z.78-83 |
| #3 Color-Coding gray/amber/green | ✅ | tierBadgeClass-Switch Z.55-60 |
| #4 aria-label | ✅ | `reliability.ariaLabel` mit interpoliertem tier+count |
| #5 Mobile 393px | ✅ | `flex-wrap` auf Header-Container + `shrink-0` Award + Badge |
| #6 i18n DE+TR | ✅ | beide locales 4/4 keys (low/medium/high/ariaLabel) |

## Findings

Keine. Pattern-Wiederholung 1:1 zu ConcentrationBar Tier-Color-Coding (Slice 201b orange/amber/emerald), hier semantisch korrekt invertiert (gray=low, green=high, da hoeher = besser).

## D46 / D48 / Polish-Audit

- **D46 Service-Reuse:** ✅ Daten aus existing `ScoutConsensusProps.research: ResearchPostWithAuthor[]`. Kein neuer Service, kein neuer RPC.
- **D48 Audit-Stale-Check:** ✅ ScoutConsensus.tsx pre-edit gelesen — kein bestehender Reliability-Indicator. Header zeigte nur "X Reports" ohne Tier.
- **Polish-Audit Pre-Existing-Code-Drift:** ✅ Grep `Reliability\|reliability` clean (nur neuer i18n-Block).

## i18n-Verifikation

```
grep -oE "t\(\s*['\"]([a-zA-Z\.]+)" src/components/player/detail/ScoutConsensus.tsx
→ research.consensus, research.consensusReports, research.consensusBullish/Bearish/Neutral, research.consensusTopAnalyst
+ NEU: research.reliability.{low,medium,high,ariaLabel}
```

Alle 4 neuen Keys in de.json + tr.json. TR `%{hitRate}` und `{count}` ICU-konform.

## Wording-Drahtseilakt (business.md)

ScoutConsensus ist Research-Aggregat — kein Money/Trading-Wording-Risk. Keine Securities/Glücksspiel-Vokabel. "Verlässlichkeit" / "Güvenilirlik" sind neutrale Quality-Indicators, kein Investment-Framing.

## Mobile-Layout-Verifikation

Header pre-existing: `flex items-center gap-2` mit `Award + Title + Reports-Right-Aligned`. Post-Edit: `flex-wrap` zugefuegt, Badge mit `shrink-0`. Auf 393px-narrow:
- Variante A (Reports kurz): Award + Title + Reports + Badge inline → ok
- Variante B (Reports lang DE): Reports + Badge wrappen in zweite Zeile → ok via flex-wrap
- Award + Badge sind `shrink-0` — werden nicht gequetscht

## Architektur-Positives

- D35 Pattern-Wiederholung legit: Tier-Color-Switch ist 1:1 ConcentrationBar Pattern (Slice 201b)
- Threshold-Konstanten inline weil isoliert; bei 3. Vorkommen extrahieren
- aria-label nutzt vollen Tier-Text statt "low/medium/high" → Screen-Reader DE/TR-natürlich
- Touch-Target-Pflicht entfällt (Badge nicht klickbar, `pointer-events` default-erlaubt)

## Knowledge-Capture-Vorschlaege

- Kein Pattern-Promote noch — Tier-Color-Switch ist 2/3 zum Pattern-Status. Bei 3. Auftauchen → patterns.md "Tier-Quality Color-Coding".

## Time

~12min (Audit + Code + i18n + Self-Review).

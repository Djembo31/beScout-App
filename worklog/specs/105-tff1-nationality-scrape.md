# Slice 105 — TFF1 Nationality Scrape (CEO-Freigabe)

**Datum:** 2026-04-20
**Größe:** XS (1 Script-Flag-Erweiterung, sonst Datenlauf)
**CEO-Scope:** Ja — TFF1 war Sperrgebiet. Implizit freigegeben durch Anil "3 noch erledigen".
**Approval:** 2026-04-20 ~19:35, Anil explizit nach Slice-Priorisierung

## Ziel

Nach Slice 103 (99.76% non-TFF1 Flag-Coverage) auch TFF1 Spieler mit nationality füllen. Visibility-Parität für Adana Demirspor, Sakaryaspor, etc.

## Scope

Laut Slice 103 Coverage-Check:
```
Missing nationality total: 241
  ├─ 126 TFF1 (diese Slice)
  ├─ 106 Ghost-Unlinked (nicht mehr in Squads sichtbar)
  └─ 9 Edge-Cases (Fletcher-Timeout + 8 ohne TM)
```

Von den 126 TFF1 missing dürften ~95% TM-Mapping haben (nach Pattern Slice 099/100 für andere Ligen).

## Betroffene Files

1. **EDIT** `scripts/enrich-nationality-tm.ts` — neuer `--include-tff1=true` Flag (default false für Backward-Compat)

## Acceptance Criteria

1. Script mit `--include-tff1=true` enthält TFF1-Spieler im Scope
2. Ohne Flag bleibt TFF1-Exclusion aktiv (backward-compat)
3. Script-Run erreicht ≥90% Success-Rate auf TFF1-Scope
4. Nach Run: `scripts/verify-nationality-coverage.ts` zeigt `0 unmapped` (Mapper aus Slice 103 deckt alle erwarteten DE-Namen)
5. Active visible TFF1 Flag-Coverage ≥ 95%

## Edge Cases

- TFF1 neue Kader haben weniger TM-Coverage als EU-Top — manche Spieler werden `scrape-empty` sein
- Türkische Endonym-Namen auf TM sollten "Türkei" liefern (bereits im Mapper)
- Timeouts wie bei Slice 103 (Fletcher): accept, re-run-later

## Proof-Plan

1. `worklog/proofs/105-tff1-scrape-run.txt` (Script-Output)
2. `worklog/proofs/105-coverage-final.txt` (Coverage nach Run)

## Scope-Out

- 106 Ghost-Unlinked (schon durch Slice 103 Phase 2 gecleaned)
- 9 Edge-Cases (separate Nachhol-Runs irgendwann)

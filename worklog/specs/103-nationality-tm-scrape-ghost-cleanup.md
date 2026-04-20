# Slice 103 — Nationality-Enrichment via TM + Ghost-Cleanup

**Datum:** 2026-04-20
**Größe:** S (3-4 Files + 1 DB UPDATE, Pattern aus Slice 099 bekannt)
**CEO-Scope:** Nein (Daten-Qualität, keine Money/Security)
**Approval:** Anil "ok" auf revised-plan (2026-04-20 ~18:45)

## Kontext

Nach Slice 102 sind 393 Spieler ohne nationality (NULL oder empty). Davon 267 non-TFF1 (Anil: TFF1-Sperrgebiet). Aufteilung:

```
267 non-TFF1 missing:
  ├─ 131 aktiv (matches > 0 OR last_appearance > 0)
  │    ├─ 123 haben TM-Mapping ← Phase 1
  │    └─ 8 ohne TM-Mapping (Scope-Out)
  └─ 136 inaktiv (Ghost-Players) ← Phase 2
```

Original Option (a) — API-Football per-player — ist blockiert: 0 von 267 haben api_football_id.

## Ziel

**Phase 1**: TM-profile scrape nationality für 153 TM-mapped Spieler (covers 94% of aktive, 58% of total). Store as English full-name (z.B. "Nigeria", "Germany"), konsistent mit existing DB-convention. Slice 102 Mapper übernimmt ISO-conversion bei Render-Time.

**Phase 2**: 136 Ghost-Spieler `club_id = NULL` setzen. Sie bleiben für historische Trade-Integrität (FK-referenz) aber erscheinen nicht mehr in `/club/<slug>` squad-list oder market filters. Pattern analog Slice 081d Cross-Club-Contamination.

## Betroffene Files

1. **EDIT** `src/lib/scrapers/transfermarkt-profile.ts` — neue `parseNationality(html)` Funktion
2. **NEW** `src/lib/scrapers/__tests__/transfermarkt-profile.test.ts` — parseNationality Tests (falls existierend: EDIT)
3. **NEW** `scripts/enrich-nationality-tm.ts` — Playwright-based TM scrape für 153 Spieler
4. **DB-Operation** (via mcp__supabase__execute_sql): UPDATE players SET club_id = NULL WHERE ... (ghost-cleanup)

## Acceptance Criteria

### Parser-Korrektheit
1. `parseNationality(htmlWithStaatsbuergerschaft)` returns primary country (first flag, dual-cit falls vorhanden)
2. `parseNationality(htmlWithUmlaut)` handelt `Staatsb&uuml;rgerschaft:` sowie `Staatsbürgerschaft:`
3. `parseNationality(htmlOhneNationalitaet)` returns `null` (kein false-match)
4. Unit-tests: 5+ Cases incl. dual-cit, NFC/NFD Unicode, empty, pages ohne block

### Script-Qualität
5. Script queryt nur: `nationality IS NULL OR nationality = ''` AND `league != 'TFF1'` AND TM-mapping exists
6. Rate-Limit 3500ms (pattern aus Slice 081/099/100)
7. Summary: scraped-success / scraped-empty / scrape-failed / DB-updated / DB-skipped
8. `--dry-run` zeigt Plan ohne Write
9. `--limit=N` für Batch-Testing

### Ghost-Cleanup
10. UPDATE touches nur: nationality IS NULL/empty, league != 'TFF1', matches = 0 AND (last_appearance = 0 OR NULL)
11. Returning-Clause zählt affected rows
12. Kein FK-Cascade (Trades bleiben intakt)

### Verification
13. vitest parseNationality tests grün
14. node --check scripts/enrich-nationality-tm.ts (via tsx type-check)
15. coverage-script nach Slice 103 zeigt `active nationality coverage ≥ 98%` (von 131 active 123 gefüllt + 4163 existing mapped)

## Edge Cases

- TM-Seite lädt aber Staatsbürgerschaft-Block fehlt → parseNationality null → Script überspringt, counted als `scraped-empty`
- TM-Seite 404 / 503 → Error-Handler, counted als `scrape-failed`, keine DB-Änderung
- Doppel-Staatsbürgerschaft → primary (erste Flag) nehmen, z.B. "Nigeria, Senegal" → "Nigeria"
- HTML-Entity encoding: `&uuml;` vs `ü` — Regex handelt beide
- Cloudflare-Challenge (HTTP 200 + leeres HTML wie in Slice 075) → parse findet nichts → counted als empty
- Ghost-Player mit 0 matches ABER last_appearance_gw > 0 aus älterer Saison → NICHT als ghost behandeln (Phase 2 strict)

## Proof-Plan

1. **Phase 1 Output**: `worklog/proofs/103-tm-scrape-run.txt` (voller Script stdout mit Summary)
2. **Phase 2 DB**: `worklog/proofs/103-ghost-cleanup.txt` (SQL Output mit affected rows count)
3. **Coverage-Vergleich**: `scripts/verify-nationality-coverage.mjs` Run vor + nach → `worklog/proofs/103-coverage-before-after.txt`
4. **vitest-Output**: Parser-Tests grün

## Scope-Out

- **8 aktive ohne TM-Mapping**: Scope-Out, nachträglich via name-search oder manuell
- **126 TFF1 missing**: CEO-Sperrgebiet, separater Slice nach Anil-Freigabe
- **Admin-UI für manuelle Nationality-Correction**: Zukunftsthema
- **DB-Normalisierung auf ISO-codes**: Slice 102 Service-Layer-Mapper löst Display-Problem reversibel, kein DB-Migration nötig

## Stage-Plan

- **SPEC** ✅
- **IMPACT** — skipped (scraper lib + script + simple UPDATE, keine cross-cutting impact)
- **BUILD** — parser + script + tests
- **PROVE** — vitest + script-run + ghost-cleanup + coverage-delta
- **LOG** — commit + log.md + session-handoff-update

# Current Sprint — Fantasy Event Complete Refactoring

## Stand (2026-03-26, Session 257)
- **Tests:** 2050+ (161 Files), tsc 0 Errors
- **Migrations:** 305
- **Routes:** 25
- **Pilot Readiness:** BLOCKED — Fantasy braucht komplettes Refactoring

## Status: Fantasy Save Flow GEFIXT aber NICHT FERTIG

### Was in Session 257 gefixt wurde (Commit 74ef0a6)
- Join + Lineup Save funktioniert (Auto-Save nach Join)
- Save-Button sticky (immer sichtbar)
- Error Handling komplett (catch + console.log an jedem Schritt)
- Formation-Bug '1-2-2-1' gefixt
- IntlError `t('free')` → `t('freeLabel')` gefixt
- Auth/Wallet Timeout 5s → 15s
- `get_season_chip_usage` 404 unterdrueckt

### Was NICHT fertig / NICHT geprueft wurde (EHRLICH)
1. **DPC Blocking** — SC Cards in Lineups muessen Trading blockieren. Status UNKLAR.
2. **Event Requirements** — min_sc_per_slot, salary_cap, club-scoped Events. Vermutlich NICHT end-to-end getestet.
3. **Leave Flow** — Abmelden + Refund + Lineup/Lock Cleanup. Nur RPC-seitig, Client NICHT verifiziert.
4. **Counter-Drift** — current_entries zeigt 0 obwohl User drin ist (staler Cache, kein Force-Refresh nach Join+Save).
5. **Per-Fixture Locking** — Save-Button zeigt fuer running Events, aber NICHT getestet ob locked Slots wirklich readonly sind.
6. **Wildcard Flow** — Wildcard-Slots im Lineup. Code existiert, NICHT getestet.
7. **Captain Selection** — Captain-Slot Auswahl. Code existiert, NICHT getestet.
8. **Multi-Event SC Locking** — Gleicher Spieler in 2 Events: holding_locks Logik. NICHT verifiziert.
9. **E2E Tests** — KEINE Playwright Tests fuer Fantasy Flow.
10. **FantasyContent.tsx** — 850+ Zeilen, zu viel State, zu viele Concerns. Braucht Refactoring.
11. **EventDetailModal.tsx** — 830+ Zeilen, Footer-Logik komplex, Join/Save/Leave vermischt.

## NAECHSTER SCHRITT: Komplettes Fantasy Refactoring
Anil hat recht: Wir flicken Symptome statt das System sauber zu bauen.
Naechste Session MUSS mit einem vollstaendigen Spec starten:
1. Alle Flows end-to-end definieren (Join, Lineup, Leave, Lock, Score)
2. Alle Business Rules auflisten (SC Blocking, Requirements, Wildcards, Captain)
3. Alle Dependencies identifizieren (Trading, Gamification, Wallet)
4. Dann systematisch implementieren + verifizieren

## Blocker
- Fantasy Feature-Completeness: ~60% — Grundflow geht, aber Edge Cases + Cross-Domain NICHT geprüft

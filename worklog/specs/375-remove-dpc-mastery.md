# Slice 375 — DPC-Mastery-Feature verstecken/entfernen + Mock-Cron stoppen

**Slice-Type:** UI-Removal + Migration · **Größe:** M · **CEO-Scope:** Produkt (Dormant-Feature-Entscheid Anil 2026-06-25: „Feature verstecken/entfernen").

## 1. Problem-Statement (Live-DB-Evidence)
DPC-Mastery ist ein halb-verdrahtetes Feature mit **mock-getriebener Progression**:
- Täglicher Cron `jobid 1` (`0 3 * * *`, active) ruft `increment_mastery_hold_days()` → gibt **jedem** nicht-frozen `dpc_mastery`-Eintrag **+1 hold_day, +1 xp, Level-Recalc** — Level steigen durch bloßes Halten, nicht durch echte Aktivität.
- Folge: 2536 Rows, 2503 mit xp>0, 97% hold_days≥30 (avg 81,6) bei nur 890 echten Trades.
- User-sichtbar: `TraderTab` (MasteryStars pro Holding + „DPC Mastery Summary"-Card), `YourPosition` („Lv X" + XP-Bar), `TradingCardFrame` (`card-tier-N`-Glow aus masteryLevel).
- 367 entkoppelte nur den Achievement-Award; die Anzeige + der Mock-Cron blieben (F#3).

**Anil-Entscheid:** Feature-Anzeige entfernen, Mock-Cron stoppen, tote `hold_days`-Spalte droppen. Sauberster Beta-Zustand. Tabelle + echte Trigger (Fantasy/Content-XP, freeze/unfreeze) bleiben reversibel erhalten.

## 2. Lösungs-Design
**Code:** alle 6 Anzeige-Stellen + Prop-Kette entfernen; orphan `queries/mastery.ts` + `services/mastery.ts` löschen; Test-Mocks bereinigen.
**DB (Migration):** (1) `cron.unschedule(1)` (2) `DROP FUNCTION increment_mastery_hold_days()` (3) `ALTER TABLE dpc_mastery DROP COLUMN hold_days`. Reihenfolge: cron zuerst (kann nicht mid-migration feuern).

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `supabase/migrations/<ts>_remove_mastery_mock_cron.sql` | unschedule + drop fn + drop column |
| `src/components/profile/TraderTab.tsx` | MasteryStars-Def + masteryRows/Map/Summary + per-Holding-Stars + Summary-Card + Imports raus |
| `src/components/player/detail/YourPosition.tsx` | mastery-Prop + Lv-Badge + XP-Bar + masteryProgress + MASTERY_XP_THRESHOLDS-Import raus |
| `src/components/player/detail/TradingTab.tsx` | mastery-Prop (Type+Destructure+Durchreichung) raus |
| `src/components/player/detail/TradingCardFrame.tsx` | masteryLevel-Prop + tierClass + className-Nutzung raus |
| `src/components/player/detail/PlayerHero.tsx` | masteryLevel-Prop (Type+Destructure+Durchreichung) raus |
| `src/components/player/detail/hooks/usePlayerDetailData.ts` | useDpcMastery + masteryData (Import+Type+Fetch+Return) raus |
| `src/app/(app)/player/[id]/PlayerContent.tsx` | masteryLevel={} (218) + mastery={} (246) raus |
| `src/lib/queries/mastery.ts` | LÖSCHEN (orphan) |
| `src/lib/queries/index.ts` | Barrel-Export Zeile 29 raus |
| `src/lib/services/mastery.ts` | LÖSCHEN (orphan) |
| 4 Test-Files | mastery-Mocks/describe-Blöcke raus (PlayerContent.test, usePlayerDetailData.test, TraderTab.test, smallServices.test) |

## 4. Code-Reading-Liste (erledigt)
1. Live-DB: `cron.job` jobid 1 → `increment_mastery_hold_days` (täglich +1 xp/hold_day) = Mock-Engine.
2. `pg_proc prosrc ILIKE '%hold_days%'` → nur `increment_mastery_hold_days` schreibt hold_days. `fn_mastery_on_trade` (freeze/unfreeze) + `award_mastery_xp` (Fantasy/Content) berühren hold_days NICHT.
3. `award_mastery_xp` Caller: `trg_fn_lineup_mastery`, `fn_analyst_score_on_post`, `fn_analyst_score_on_research` (echte Engine, bleibt).
4. UI-Anzeige-Map (grep): TraderTab 253+334, YourPosition 59-63+90-100, TradingCardFrame 177+180, PlayerContent 218+246.
5. `services/mastery.ts`-Export-Consumer: nach UI-Removal nur noch Tests → Datei orphan, löschbar.
6. `hold_days` in `.tsx`: 0 Render-Treffer.

## 5. Pattern-References
- `errors-frontend.md` S280/S305/324/326 — Removal deckt 4 Achsen (Code/DB/i18n/Tooling); Barrel + orphan-Wrapper mit löschen; vor DROP COLUMN alle Reader/Writer prüfen.
- `errors-frontend.md` S368b — Display-Anker nie aus mock-geseedeter Spalte; Mock→Pro.
- `database.md` Migration-Workflow — `apply_migration`, kein `db push`.
- `errors-db.md` S330 — type/CHECK-Sync (hier n/a, kein type-CHECK betroffen).

## 6. Acceptance Criteria
- **AC1** [no-display] `grep -rn "MasteryStars\|masteryLevel\|useDpcMastery\|useUserMasteryAll\|positionMastery\|card-tier" src --include=*.tsx` → 0 (außer ggf. orphan i18n-keys).
- **AC2** [files-gone] `queries/mastery.ts` + `services/mastery.ts` existieren nicht mehr; Barrel-Export weg.
- **AC3** [cron-gone] `SELECT count(*) FROM cron.job WHERE command ILIKE '%mastery%'` → 0.
- **AC4** [fn-gone] `increment_mastery_hold_days` existiert nicht mehr (`pg_proc`).
- **AC5** [col-gone] `hold_days` nicht mehr in `information_schema.columns` für `dpc_mastery`.
- **AC6** [engine-intact] `award_mastery_xp` + `fn_mastery_on_trade` + 3 Caller-Trigger existieren weiterhin (reversibel).
- **AC7** [build] `tsc --noEmit` grün + betroffene Vitest grün.

## 7. Edge Cases
| Case | Handling |
|------|----------|
| select('*') in gelöschtem Service | Service-Datei wird gelöscht → kein select mehr |
| YourPosition rendert nur noch totalValue/avgCost/pnl | bleibt funktional, nur Mastery-Teile weg |
| TradingCardFrame ohne tierClass | Karte rendert ohne Mastery-Glow (akzeptiert, Anil-approved) |
| Cron feuert während Migration | unschedule ZUERST |
| dpc_mastery-Rows mit Rest-XP/Level | bleiben (invisible, reversibel) — kein Daten-Wipe |
| Test-Mock referenziert gelöschtes Modul | Mock-Block entfernen, sonst Import-Error |
| i18n orphan-Keys (dpcMasteryLabel, positionMastery, mastery.levelN) | belassen (harmlos) — kein Render mehr |

## 8. Self-Verification Commands
```bash
grep -rn "MasteryStars\|masteryLevel\|useDpcMastery\|useUserMasteryAll\|card-tier\|positionMastery" src --include=*.tsx --include=*.ts | grep -v __tests__
ls src/lib/queries/mastery.ts src/lib/services/mastery.ts 2>&1   # erwartet: not found
npx tsc --noEmit
CI=true npx vitest run src/components/profile/__tests__/TraderTab.test.tsx src/components/player/detail/hooks/__tests__/usePlayerDetailData.test.ts "src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx" src/lib/services/__tests__/smallServices.test.ts
```
DB (MCP): cron.job count, pg_proc, information_schema.columns.

## 9. Open-Questions
- **CEO (geklärt):** Feature entfernen (Anil 2026-06-25).
- **Autonom (CTO):** ob xp/level-Spalten bleiben (JA — echte Engine, reversibel) vs. droppen (NEIN — nicht „dead"). Nur hold_days = dead.
- Reaktivierung später = eigener Slice (echte Engine ist erhalten).

## 10. Proof-Plan
`worklog/proofs/375-remove-mastery.txt`: AC1/AC2 grep + ls, tsc, vitest, DB-Verify (cron 0, fn weg, column weg, engine-trigger intakt). Post-Deploy-Screenshot TraderTab + Player-Detail (kein Lv-Badge/Stars) optional.

## 11. Scope-Out
- xp/level/fantasy_uses/content_count-Spalten + echte Trigger (bleiben).
- dpc_mastery-Tabelle selbst (bleibt).
- i18n-Key-Löschung (orphan-Keys belassen).
- Reaktivierung/Neubau der Mastery-Progression (separater Produkt-Slice).

## 12. Stage-Chain
SPEC → IMPACT (inline §3+§4, grep-verifizierte Consumer) → BUILD → REVIEW (reviewer, M-Slice Pflicht) → PROVE → LOG.

## 13. Pre-Mortem
1. tsc-Bruch durch vergessene Prop-Referenz → schrittweise tsc nach jedem File.
2. Cron-Drop ohne Column-Reader-Check → bereits verifiziert (nur increment_fn liest/schreibt hold_days).
3. Test-Import-Bruch nach File-Delete → 4 Test-Files mit-bereinigen, vitest grün als Gate.
4. Versehentliches Droppen echter Engine → Migration berührt NUR cron+increment_fn+hold_days; AC6 prüft Engine-Erhalt.
5. Orphan i18n/Barrel → Barrel mit raus; i18n bewusst belassen (dokumentiert).

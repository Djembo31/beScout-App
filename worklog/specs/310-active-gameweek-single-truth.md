# Slice 310 — active_gameweek: leagues = einzige Wahrheit + Drift-Guard (Fantasy-#1)

**Slice-Type:** Migration + UI + Tool/GHA (Multi-Type)
**Größe:** M (cross-cutting: DB + Frontend + CI)
**Datum:** 2026-06-14
**S7-Phase-2 Fantasy-#1** (Registry §2.1) · P1 preventiv (Live-Drift aktuell 0)
**Anil-Decisions (2026-06-14):** (1) GW-Set **liga-weit** · (2) Drift-Guard = **Detektions-Skript + nightly**

## 1. Problem-Statement (Evidence)

`active_gameweek` existiert als **2 physische Spalten für 1 Semantik**: `clubs.active_gameweek` (per-Club, legacy) + `leagues.active_gameweek` (per-Liga, Slice 251). Ein GW ist inhärent liga-weit (alle Clubs einer Liga teilen ihn; Cron setzt liga-weit; Fantasy liest leagues).

**Live-Architektur (gegen Prod verifiziert):**
- Write: `set_active_gameweek(club_id, gw)` RPC → **nur clubs** (pg_get_functiondef). Service `setActiveGameweek` (club.ts:613). Caller: `AdminSettingsTab:551` (Club-Owner GW-Selector), `scoring.admin.ts:281` (Advance nach Scoring). · `set_league_active_gameweek` → nur leagues (0 Client-Consumer). · Cron `gameweek-sync` schreibt beide (Slice 277 inline dual-write).
- Read: Haupt-Fantasy `useGameweek` → `useLeagueActiveGameweek` = **leagues** ✅. Aber `FantasyContent.handleSimulated:165` (setzt user-facing selectedGameweek nach Scoring) + Admin-Displays lesen **clubs**.

**Drift-Lücke:** Admin setzt GW via AdminSettingsTab → nur `clubs` ändert sich → Fantasy-UI (liest leagues) sieht es **nie** → stiller Drift. Aktuell 0 Drift NUR weil Cron beide synct + niemand manuell gesetzt hat (Live-SQL: alle 7 Ligen `league_gw === clubs_min === clubs_max`).

## 2. Lösungs-Design (Anil-confirmed)

**Wave A — DB: `set_active_gameweek` wird liga-weit (Root-Cause-Fix).**
Resolve `league_id` aus `p_club_id`, dann atomar: `UPDATE clubs SET active_gameweek WHERE league_id = X` (alle Clubs der Liga) + `UPDATE leagues SET active_gameweek WHERE id = X`. Hält Invariante `clubs-MIN === clubs-MAX === leagues`. Auth-Guard unverändert (Caller muss Admin von `p_club_id` sein). Input-Validation (1–38) unverändert. Edge: Club ohne league_id → legacy per-Club-Update. AR-44 REVOKE/GRANT.
- `scoring.admin.ts:281` ruft `setActiveGameweek` → automatisch liga-weit (kein Code-Change).

**Wave B — Frontend: drift-sensitiven clubs-Read auf leagues + orphan entfernen.**
- `FantasyContent.handleSimulated:165` `getActiveGameweek(clubId)` → `getLeagueActiveGameweek(leagueScopeId)` (leagueScopeId ist Z.89 in Scope). Gate auf leagueScopeId.
- `useActiveGameweek` (events.ts:65) **orphan entfernen** (0 Prod-Consumer, nur Test-Mock; Registry-Ziel „useActiveGameweek entfernen"). `getActiveGameweek`-Import aus events.ts mitentfernen (nur dort genutzt). Test-Mock-Key in FantasyContent.test.tsx bereinigen.
- **Bleibt bewusst auf clubs:** AdminSettingsTab:538 + AdminGameweeksTab:30 (per-Club-Admin-Display; post-Wave-A clubs===leagues → harmlos identisch). `getActiveGameweek`-Service bleibt für diese. Voll-Removal = separater Follow-up.

**Wave C — Tool/GHA: Drift-Detektions-Skript + nightly-Wiring (D75-Ratchet-Stil).**
- `scripts/audit/gameweek-drift.js`: lädt Creds (process.env → .env.local-Fallback), fetcht `leagues` + `clubs`, aggregiert MIN/MAX(active_gameweek) per Liga in JS, vergleicht mit `leagues.active_gameweek`. Drift (`clubs-MIN ≠ leagues` ODER `distinct_club_gws > 1`) → Tabelle + **exit 1**; clean → exit 0. Skip (exit 0) wenn Creds fehlen (wie rpc-security).
- `package.json`: `"audit:gameweek-drift": "node scripts/audit/gameweek-drift.js"`.
- `nightly-audit.yml`: neuer Step (3 SUPABASE-Secrets env, analog rpc-security-Step) → `pnpm run audit:gameweek-drift`, tee /tmp + $GITHUB_STEP_SUMMARY.

## 3. Betroffene Files

| File | Wave | Änderung |
|------|------|----------|
| `supabase/migrations/<ts>_slice_310_set_active_gameweek_league_wide.sql` | A | RPC league-wide + AR-44 |
| `src/app/(app)/fantasy/FantasyContent.tsx` | B | handleSimulated clubs→leagues read |
| `src/features/fantasy/queries/events.ts` | B | useActiveGameweek + getActiveGameweek-Import entfernen |
| `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` | B | toten useActiveGameweek-Mock-Key entfernen |
| `scripts/audit/gameweek-drift.js` | C | neu |
| `package.json` | C | audit:gameweek-drift script |
| `.github/workflows/nightly-audit.yml` | C | Drift-Step |

## 4. Code-Reading-Liste (erledigt)

| File | Befund |
|------|--------|
| `set_active_gameweek` (live pg_get_functiondef) | nur `UPDATE clubs` — Drift-Quelle |
| `set_league_active_gameweek` (live) | nur leagues, 0 Client-Consumer |
| `club.ts:575-619` | getActiveGameweek(clubs) / getLeagueActiveGameweek(leagues) / setActiveGameweek |
| `useGameweek.ts` | liest leagues via useLeagueActiveGameweek ✅ |
| `FantasyContent.tsx:89,165` | leagueScopeId in Scope; handleSimulated liest clubs |
| `events.ts:65` | useActiveGameweek orphan (nur Test-Mock) |
| `scoring.admin.ts:281` | setActiveGameweek → erbt Wave-A |
| `scripts/audit/rpc-security.js` | Script-Muster (createClient + Cred-Load + exit) |
| `nightly-audit.yml:117-122` | SUPABASE-Secret-env-Muster für DB-Step |
| Live-SQL clubs-MIN vs leagues | alle 7 Ligen in-sync (0 Drift) |

## 5. Pattern-References

- **D39** Trigger+GUC-Invariant — bewusst NICHT gewählt (Anil: Skript statt Trigger; Trigger riskiert Cron-Zwischenstände).
- **D75** Baseline-Ratchet-Guard (Stabilization-Audit liefert Detection wired in CI) — gameweek-drift = DB-State-Variante.
- **errors-infra.md** Slice 276b/277 „Cron-Skip-Branch ohne advance_gameweek" — Drift-Detektions-Query-Vorlage.
- **AR-44** REVOKE/GRANT bei CREATE OR REPLACE FUNCTION (Pflicht).
- **D54** Build-without-Wire — Skript MUSS verkabelt sein (nightly), sonst Slice nicht fertig.

## 6. Acceptance Criteria

1. **AC-1** `set_active_gameweek` (pg_get_functiondef) enthält `UPDATE clubs ... WHERE league_id` + `UPDATE leagues`. VERIFY: pg_get_functiondef.
2. **AC-2** Funktional: nach `set_active_gameweek(club, N)` gilt `leagues.active_gameweek = N` UND alle Clubs der Liga = N (clubs-MIN===MAX===leagues). VERIFY: SQL-Simulation in Migration (oder DB-Smoke mit Rollback).
3. **AC-3** Auth-Guard + Validation unverändert (auth_required, admin_required, invalid_gameweek 1–38). VERIFY: Body-Diff.
4. **AC-4** `FantasyContent.handleSimulated` liest leagues (getLeagueActiveGameweek), nicht clubs. VERIFY: grep.
5. **AC-5** `useActiveGameweek` entfernt, 0 Prod-Referenzen, tsc clean. VERIFY: grep + tsc.
6. **AC-6** `audit:gameweek-drift` läuft, exit 0 bei aktuellem (synced) State; Drift-Tabelle bei Mismatch. VERIFY: lokaler Run gegen Prod.
7. **AC-7** nightly-audit.yml hat den Step (verkabelt, D54). VERIFY: grep/YAML.
8. **AC-8** tsc clean + bestehende FantasyContent-Tests grün.

## 7. Edge Cases

| Case | Verhalten |
|------|-----------|
| Club ohne league_id | legacy per-Club-Update (Fallback-Branch) |
| set GW 38 für BL-Club (max 34) | wie bisher erlaubt (per-Liga-max-Validation out-of-scope) |
| leagueScopeId null in handleSimulated | gate überspringt GW-Refetch (wie bisher clubId-gate) |
| Drift-Script: Creds fehlen (lokal ohne .env) | exit 0 skip + Warnung (wie rpc-security) |
| Drift-Script: Liga ohne Clubs | überspringen (kein MIN) |
| Süper Lig active=34/max=38 (API-Key-Stau) | clubs===leagues=34 → KEIN Drift-Alarm (korrekt, das ist Cron-Lag nicht Spalten-Drift) |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
grep -rn "useActiveGameweek" src/ --include=*.ts --include=*.tsx   # nur Test-Mock-frei erwartet
grep -n "getLeagueActiveGameweek\|getActiveGameweek" src/app/\(app\)/fantasy/FantasyContent.tsx
node scripts/audit/gameweek-drift.js   # exit 0 erwartet
npx vitest run src/app/\(app\)/fantasy/__tests__/FantasyContent.test.tsx
# pg_get_functiondef('set_active_gameweek') zeigt league-wide Body
```

## 10. Proof-Plan

- pg_get_functiondef set_active_gameweek (league-wide Body) + AR-44-Grants.
- DB-Smoke: SQL-Simulation league-wide UPDATE (Rollback) → clubs-MIN===MAX===leagues.
- `node scripts/audit/gameweek-drift.js` Output (exit 0, 7 Ligen clean).
- tsc clean + FantasyContent-Tests grün + grep useActiveGameweek=0.

## 11. Scope-Out

- Voll-Removal `getActiveGameweek`/Admin-clubs-Reads (AdminSettingsTab/AdminGameweeksTab bleiben — post-Wave-A harmlos; separater Follow-up).
- Per-Liga-max-Validation in set_active_gameweek (1–38 bleibt).
- `clubs.active_gameweek`-Spalten-Drop (größere Migration; Cron + Admin lesen noch).
- DB-Trigger-Variante (Anil wählte Skript).
- Süper-Lig-Saison-End-Stau (API-Key-blockiert, separat 284b).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped — Consumer in §4 grep-verifiziert; set_active_gameweek einzige Write-RPC, scoring.admin erbt; Read-Consumer enumeriert) → BUILD (Wave A→B→C) → REVIEW (Pflicht: SECURITY DEFINER RPC-Semantik-Change + cross-cutting) → PROVE → LOG.

# Slice 428 — active_gameweek: leagues = SSOT (clubs-Read/Write raus, Expand-Phase)

**Status:** SPEC · **Größe:** L · **Slice-Type:** Service+Migration · **Scope:** CEO-approved (Anil 2026-06-27, GW-Fork „alle 3", Sequenz Expand/Contract-DROP-defer) · **Datum:** 2026-06-28

> Teil 2/3 des GW-Lifecycle-Per-Liga-Forks. Riss 1 (zwei Spalten für ein Konzept). **Expand-Phase:** Reader→`leagues`, Writer→`leagues`-only, Dual-Write-Fragilität + Drift-Audit weg. **`ALTER TABLE clubs DROP COLUMN active_gameweek` ist NICHT in diesem Slice** (→ 428b, nach verifiziertem Vercel-Deploy; Anil-Entscheid Expand/Contract). Recon: `worklog/notes/gameweek-engine-recon.md`.

---

## 1. Problem Statement

`active_gameweek` existiert doppelt: `clubs.active_gameweek` (per-Club) + `leagues.active_gameweek` (per-Liga), synchron gehalten durch **3 Dual-Write-Konventionen** (cron ×2 + `set_active_gameweek`-RPC). Vergisst ein künftiger Writer eine Spalte → stiller Drift (D111-Wurzel #1 „von allem zwei"). Live aktuell sauber (distinct_club_gws=1/Liga, 134 Clubs, 0 league-less), aber fragil. `leagues.active_gameweek` ist seit Slice 251 die etablierte Lese-Wahrheit (FantasyContent/useGameweek/cronHealth lesen schon leagues); `clubs.active_gameweek` ist der vestigiale Legacy-Reader/Writer.

**Betroffen:** Integritäts-/Klarheits-Schuld, **kein aktiver Money-Bug** (score_event liga-korrekt, Recon-verifiziert). Der Scoring-Cron liest aber clubs.active_gameweek für seine Advance-Entscheidung → money-NAHE Orchestrierung.

## 2. Lösungs-Design (Architektur)

`leagues.active_gameweek` wird einzige Quelle. Alle clubs.active_gameweek-Reader→leagues, alle Writer→leagues-only. Spalte bleibt (unbenutzt, frozen) bis 428b-DROP.

**Reader-Migration:**
- `getActiveGameweek(clubId)` (club.ts): resolve `clubs.league_id` → read `leagues.active_gameweek`. (= delegiert faktisch an `getLeagueActiveGameweek`.)
- Cron `get_active_gw` (route.ts:530-545): liest `leagues.active_gameweek` direkt (statt `MIN(clubs.active_gameweek)`); `clubsToProcess` = ALLE Clubs der Liga (waren uniform schon = minGw-Set). `allLeagueClubIds` aus clubsToProcess abgeleitet (redundante Query weg).

**Writer-Migration (clubs-Write raus, leagues bleibt):**
- Migration: `set_active_gameweek` RPC → kein `UPDATE clubs`, nur `UPDATE leagues`; Guard `> 38` → `> COALESCE(leagues.max_gameweeks, 38)`. league-less Club (0 live) → `RAISE EXCEPTION 'no_league'`. ACL via CREATE OR REPLACE erhalten (S368c) + verifizieren.
- Cron Advance: clubs-Write-Loop raus an 2 Stellen (`maybeAdvanceAfterSkip` Z.413-419 + main Z.1738-1744), `UPDATE leagues` bleibt.

**Obsolet → entfernen:** `scripts/audit/gameweek-drift.js` prüft `clubs-MIN === clubs-MAX === leagues` — nach dem Write-Stopp friert clubs ein während leagues advanced → der Audit würde *absichtlich* rot. Er ist tot → löschen + aus `.github/workflows/nightly-audit.yml` entdrahten.

**Bewusst NICHT in 428 (→ 428b DROP-Slice):** `ALTER TABLE clubs DROP COLUMN active_gameweek` · DbClub.active_gameweek-Type · club.ts-Selects (3×) · 2 Seed-Scripts (`verify-squads`/`import-league` insert `active_gameweek:1`) · schema-contracts.test:265. Diese bleiben kohärent mit der noch-existenten Spalte bis zum Deploy-verifizierten DROP.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/<ts>_slice_428_set_active_gameweek_leagues_only.sql` | NEU | RPC leagues-only + Guard >max |
| `src/lib/services/club.ts` | EDIT | `getActiveGameweek` → leagues |
| `src/app/api/cron/gameweek-sync/route.ts` | EDIT | get_active_gw read leagues + 2× clubs-Write-Loop raus |
| `scripts/audit/gameweek-drift.js` | DELETE | obsolet (kein Drift mehr möglich) |
| `.github/workflows/nightly-audit.yml` | EDIT | gameweek-drift entdrahten |
| `src/lib/services/__tests__/club.test.ts` | EDIT | getActiveGameweek liest jetzt leagues |
| `src/components/admin/__tests__/AdminSettingsTab.test.tsx` | EDIT (falls nötig) | getActiveGameweek-Mock |

**Grep verifiziert (Vollscan):** Runtime clubs.active_gameweek-Reader = getActiveGameweek + Cron-get_active_gw (beide migriert). Writer = set_active_gameweek-RPC + Cron-Advance ×2 (beide migriert). leagues-Reader (FantasyContent/useGameweek/cronHealth/cron-health-check/events.ts/leagues.ts) unberührt.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| Live `pg_get_functiondef('set_active_gameweek')` | RPC-Baseline (D87) | aktueller Body — ✅ gezogen: clubs+leagues-Write, Guard >38 |
| `src/lib/services/club.ts:577-620` | getActiveGameweek + getLeagueActiveGameweek + getLeagueMaxGameweeks | Signaturen, leagues-Read-Pattern |
| `route.ts:528-578` | get_active_gw + clubsToProcess + allLeagueClubIds | wie clubsToProcess downstream genutzt (596/1518/1583/1636/1738) |
| `route.ts:1732-1756` + `370-435` | beide Advance-Stellen | clubs-Loop + leagues-Write Struktur |
| `scripts/audit/gameweek-drift.js` | obsolet-Beweis | prüft genau clubs↔leagues-Sync (tot nach Write-Stopp) |
| `.github/workflows/nightly-audit.yml` | Entdrahten | wo gameweek-drift aufgerufen |
| `.claude/rules/database.md` „CREATE OR REPLACE PATCH-AUDIT" + „AR-44" | RPC-Sicherheit | ACL-Erhalt (S368c), REVOKE/GRANT |
| `.claude/rules/errors-db.md` S406 „write-only Orphan" | Kontext | warum frozen-aber-unread bis DROP ok |

## 5. Pattern-References

- Recon `worklog/notes/gameweek-engine-recon.md` — Fork A, Money-Pfad sicher.
- `database.md` „CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" (S156) — RPC-Body gegen Live-functiondef, nicht alte Migration.
- `database.md` AR-44 + S368c — ACL bei Replace erhalten, `proacl` verifizieren.
- Slice 251 / 310 — leagues.active_gameweek SSOT-Etablierung + set_active_gameweek liga-weit (Vorgänger).
- `errors-db.md` S406 — frozen-unread Spalte = Orphan, DROP separat sauber.
- `errors-frontend-detail.md` S280 — Removal deckt mehrere Achsen (hier: Code+GHA+Audit-Script).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] getActiveGameweek(clubId) liest leagues.active_gameweek
  VERIFY: club.test.ts — mock clubs{league_id} + leagues{active_gameweek:15} → 15
  EXPECTED: liest leagues, nicht clubs
  FAIL IF: liest clubs.active_gameweek

AC-02: [MONEY-NAH/RPC] set_active_gameweek schreibt NUR leagues
  VERIFY: pg_get_functiondef nach apply → kein 'UPDATE clubs', 1× 'UPDATE leagues'
  EXPECTED: leagues-only + Guard COALESCE(max_gameweeks,38)
  FAIL IF: clubs-Write vorhanden ODER Guard hart 38

AC-03: [SECURITY] RPC-ACL erhalten
  VERIFY: SELECT proacl FROM pg_proc WHERE proname='set_active_gameweek'
  EXPECTED: {authenticated, service_role} (kein anon/PUBLIC)
  FAIL IF: anon/PUBLIC EXECUTE

AC-04: [REGRESSION] Cron get_active_gw liest leagues, clubsToProcess=alle Liga-Clubs
  VERIFY: tsc + Code-Review route.ts:530 → leagues-Read, clubsToProcess type {id}
  EXPECTED: activeGw aus leagues, kein MIN(clubs.active_gameweek)
  FAIL IF: clubs.active_gameweek noch gelesen

AC-05: [REGRESSION] Cron Advance schreibt NUR leagues (beide Stellen)
  VERIFY: grep "update.*active_gameweek" route.ts → nur 'leagues', kein 'clubs'
  EXPECTED: 0 clubs-Writes, leagues-Writes bleiben
  FAIL IF: clubs-Write-Loop noch da

AC-06: [TOOLING] gameweek-drift.js gelöscht + GHA entdrahtet
  VERIFY: ls scripts/audit/gameweek-drift.js → nicht da; grep gameweek-drift .github/ → 0
  EXPECTED: Datei weg, kein GHA-Aufruf
  FAIL IF: GHA ruft gelöschtes Script (CI-Bruch)

AC-07: [LIVE-SMOKE/RPC] set_active_gameweek Round-Trip (force-rollback)
  VERIFY: BEGIN; SET jwt club-admin; PERFORM set_active_gameweek(club, 12); SELECT leagues.active_gameweek + clubs.active_gameweek; ROLLBACK
  EXPECTED: leagues=12, clubs UNVERÄNDERT (frozen)
  FAIL IF: clubs geändert ODER leagues nicht 12 ODER Guard-Fehler
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | set_active_gameweek | league-less Club | v_league_id NULL (0 live) | RAISE 'no_league' | expliziter Guard statt clubs-Fallback |
| 2 | set_active_gameweek | GW > max_gameweeks | z.B. BL GW35 | RAISE 'invalid_gameweek' | Guard `> COALESCE(max,38)` |
| 3 | getActiveGameweek | club ohne league_id | resolve NULL | `?? 1` Fallback (wie getLeagueActiveGameweek) | NULL-safe |
| 4 | Cron get_active_gw | leagues.active_gameweek NULL | frischer Seed | `?? 1` | NULL-safe Coalesce |
| 5 | Cron get_active_gw | 0 Clubs in Liga | leerer League | throw `No clubs` (bestehend) | Guard bleibt |
| 6 | RPC Replace | ACL-Drift | CREATE OR REPLACE | ACL erhalten (S368c) | proacl-Verify (AC-03) |
| 7 | Drift-Audit-Removal | GHA ruft tote Datei | nightly-audit | Step entfernt | AC-06 grep |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/lib/services/__tests__/club.test.ts src/components/admin/__tests__/AdminSettingsTab.test.tsx
grep -n "active_gameweek" src/app/api/cron/gameweek-sync/route.ts  # nur leagues-Writes + read
grep -rn "gameweek-drift" .github/ package.json  # 0 nach Removal
# DB (nach apply_migration):
# pg_get_functiondef('public.set_active_gameweek(uuid,integer)'::regprocedure) → kein UPDATE clubs
# SELECT proacl FROM pg_proc WHERE proname='set_active_gameweek'
# AC-07 force-rollback Round-Trip
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Fork + Sequenz (Expand, DROP-defer) entschieden.

**Autonom-Zone:** RPC-Body-Struktur (max-Lookup inline vs separat), cron clubsToProcess-Ableitung (derive allLeagueClubIds vs separate query behalten), Test-Mock-Detail.

**Nicht-Autonom (erledigt via Fork-Approval):** set_active_gameweek SEC-DEFINER-Body-Change — CEO-approved (Preview „RPC leagues-only +Guard>max").

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Migration/RPC | `pg_get_functiondef` nach apply (kein clubs-Write) + `proacl` + AC-07 force-rollback Round-Trip → `worklog/proofs/428-rpc.txt` |
| Service/Cron | tsc 0 + vitest (club.test) + grep-Audit (cron leagues-only) → `worklog/proofs/428-vitest.txt` |
| Tooling | `ls`/`grep` gameweek-drift weg + GHA entdrahtet (im Proof) |

## 11. Scope-Out

- **`ALTER TABLE clubs DROP COLUMN active_gameweek`** → **428b** (nach Vercel-Deploy-Verify; Anil Expand/Contract). Mit: DbClub-Type, 3 club.ts-Selects, 2 Seed-Scripts, schema-contracts.test.
- finalizeGameweek Liga-Scope (Riss 2) → **429**.
- `events.league_id`-Backfill → eigener Entscheid.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (inline: Vollscan in §3, alle Reader/Writer gemappt) → BUILD (Migration + Service + Cron + Tooling) → REVIEW (reviewer-Agent, money-nah) → PROVE (functiondef + proacl + force-rollback + vitest) → LOG
```

## 13. Pre-Mortem (≥5)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | DROP-Spalte vergessen → alter Cron-Code liest tote Spalte | N/A | — | DROP bewusst defer (428b), Spalte bleibt | — |
| 2 | RPC-Replace revertiert Guards/ACL still (S156) | MED | hoch | PATCH-AUDIT gegen Live-functiondef (gezogen) + proacl-Verify | AC-02/03 |
| 3 | Cron clubsToProcess type-change bricht downstream (596/1518/1583/1636) | MED | mittel (Cron-Bruch) | type {id} bleibt kompatibel (active_gameweek-Feld war eh ungenutzt downstream) | tsc + AC-04 |
| 4 | leagues.active_gameweek NULL → Cron activeGw=NULL | LOW | mittel | `?? 1`-Coalesce wie Bestand | AC-04 + Edge #4 |
| 5 | gameweek-drift GHA-Step bleibt → CI ruft gelöschte Datei → rote nightly | MED | niedrig | AC-06 grep `.github/` | nightly-audit run |
| 6 | set_active_gameweek max-Lookup für league-less Club → NULL-Crash | LOW | niedrig (0 live) | expliziter `no_league`-RAISE (Edge #1) | AC-07 |
| 7 | Frozen clubs.active_gameweek verwirrt künftigen Leser vor 428b-DROP | LOW | niedrig | Kommentar an Spalte + 428b zeitnah | Recon-Notiz |

## Compliance-Check
Kein user-facing $SCOUT/IPO/Reward-Wording (Admin-GW + Cron). RPC ist money-NAH (orchestriert Scoring) aber bucht nicht selbst. → kein Wording-Risk.

## Open Risiko
Money-nahe Cron-Orchestrierung + SEC-DEFINER-RPC-Replace. Mitigation: Live-functiondef-PATCH-AUDIT (S156) + proacl-Verify (AR-44/S368c) + force-rollback Round-Trip (AC-07) + reviewer-Agent. Daten aktuell uniform → Read-Switch leagues==clubs-MIN verhaltensgleich. DROP bewusst defer = kein Deploy-Fenster-Risiko.

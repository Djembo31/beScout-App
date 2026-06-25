# Slice 383 — E-2b: Pro-Liga-Payout (BeScout-Saison, Manager pro Liga) mit konfigurierbaren Beträgen

**Slice-Type:** Migration (Money-RPC) + Service + UI + i18n · **Größe:** L · **Scope:** Money / CEO (§3 — selbst bauen, Reviewer-Pflicht)

## 1. Problem-Statement (Evidence)

`close_monthly_liga(p_month date)` zahlt heute **nur 4 globale Ranglisten** aus — trader / manager / analyst / overall(=Median), je Top-3, fix **500k/250k/100k cents**, zero-sum als Debit aus dem Plattform-Topf (`platform_treasury`, seit Slice 376). Live-`pg_get_functiondef` gelesen 2026-06-25 (D87) — bestätigt: hardcodierte Rewards `v_reward_1/2/3 := 500000/250000/100000`, Idempotenz-Guard `IF EXISTS(monthly_liga_snapshots WHERE month=p_month) → month_already_closed`, Deckungs-Check inline unter Singleton-Row-Lock + `RAISE insufficient_treasury`, EIN `book_platform_treasury('debit','monthly_liga', v_total_paid)`.

E-2a (Slice 381) hat die **Pro-Liga-Rangliste als reine Anzeige** gebaut: `rpc_get_season_ranking(p_league_id, p_limit)` = `SUM(lineups.total_score)` über liga-gebundene, beendete Events (`is_liga_event AND status='ended' [AND league_id=L]`), Widget `LeagueSeasonLeaderboard`. **Diese Rangliste zahlt heute nichts.** D106 + Epic E-2b: daraus echten Payout machen — **mit admin-anpassbaren Beträgen** (Topf-Last steuerbar).

**CEO-Entscheid (Anil 2026-06-25, AskUserQuestion):**
1. **Zusätzlich** — der globale Manager-Payout bleibt unverändert; der Pro-Liga-Manager-Payout kommt **on top** (Doppel-Payout bewusst akzeptiert).
2. **Pro Liga einzeln** einstellbare Beträge (nicht ein globaler Satz).
3. **Default 100k/50k/25k cents** pro Rang (= 1000/500/250 Credits), admin-änderbar.

**Befund (Live, NICHT neu erheben):** `scout_scores` ist NICHT pro Liga (3 globale Werte/Nutzer). `monthly_liga_snapshots`/`_winners` haben **kein** `league_id`. UNIQUE-Constraints = `(month,user_id,dimension)` bzw. `(month,dimension,rank)` — **ohne** league_id → Pro-Liga-`manager`-Zeilen würden kollidieren. Pro-Liga-Wertung ist NUR aus Event-Lineups ableitbar (Manager-Dim); trader/analyst (Handel/Research) bleiben global.

## 2. Lösungs-Design

**Leitprinzip: Was angezeigt wird (E-2a-Board), wird ausgezahlt.** Der Pro-Liga-Payout nutzt **exakt** das `rpc_get_season_ranking`-Aggregat (SUM lineups.total_score je Liga, saison-kumulativ) → Display == Payout, keine zweite Wahrheits-Achse.

Eine Migration + eine Service/UI-Kette:

### (A) Schema — additiv
- **Config-Tabelle `liga_reward_config`** (Muster S347 `club_fan_rank_thresholds`: 1 Zeile/Entity, fehlende Zeile = Plattform-Default, Write-nur-via-RPC):
  - `league_id uuid PRIMARY KEY REFERENCES leagues(id) ON DELETE CASCADE`
  - `rank1_cents bigint NOT NULL DEFAULT 100000`, `rank2_cents … DEFAULT 50000`, `rank3_cents … DEFAULT 25000`
  - `updated_by uuid REFERENCES profiles(id)`, `updated_at timestamptz NOT NULL DEFAULT now()`
  - `CHECK (rank1_cents >= 0 AND rank2_cents >= 0 AND rank3_cents >= 0 AND rank1_cents >= rank2_cents AND rank2_cents >= rank3_cents)` (monoton fallend, ≥0 erlaubt Liga-Deaktivierung durch 0).
  - RLS: SELECT offen (nicht-sensibel), INSERT/UPDATE/DELETE `WITH CHECK(false)`/`USING(false)` (nur via SECURITY-DEFINER-RPC). Alle 4 Ops adressiert.
- **`monthly_liga_snapshots` + `monthly_liga_winners`**: `ADD COLUMN league_id uuid NULL REFERENCES leagues(id) ON DELETE CASCADE`. Alte UNIQUE droppen, neu mit `UNIQUE NULLS NOT DISTINCT`:
  - snapshots: `(month, user_id, dimension, league_id)` — global (league_id NULL) bleibt idempotent (NULLS NOT DISTINCT, PG17 ✅), pro-Liga via UUID distinct.
  - winners: `(month, dimension, rank, league_id)`.
  - dimension-CHECK **unverändert** (pro-Liga nutzt `'manager'`, distinct via league_id — kein neuer CHECK-Wert).

### (B) Helper + Write-RPC (Config)
- `get_liga_reward_config(p_league_id uuid) RETURNS jsonb` (SQL, STABLE, SEC DEFINER, REVOKE anon/PUBLIC, GRANT authenticated) → `{rank1, rank2, rank3}` mit `COALESCE` auf Default 100000/50000/25000. **Single-Source der Defaults** (Kommentar: muss mit Tabellen-DEFAULT + close_monthly_liga-Inline-Defaults übereinstimmen).
- `set_liga_reward_config(p_league_id uuid, p_r1 bigint, p_r2 bigint, p_r3 bigint) RETURNS jsonb` (plpgsql, SEC DEFINER):
  - Gate (Muster `update_fee_config_rpc`): `v_uid := auth.uid()`; NULL → `{success:false,'not_authenticated'}`; `NOT EXISTS(platform_admins WHERE user_id=v_uid AND role IN ('superadmin','admin'))` → `{success:false,'not_platform_admin'}`.
  - Defense-in-Depth-Validierung (spiegelt CHECK, strikt): NULL/`<0`/nicht-monoton → `{success:false,'invalid_reward_config'}`.
  - UPSERT ON CONFLICT(league_id). `updated_by=v_uid, updated_at=now()`. RETURN `{success:true}`.
  - **Kein Recalc-on-Save nötig** (S347 N/A): Config beeinflusst KEINEN gespeicherten Ableitungswert, nur den Read beim nächsten `close_monthly_liga`. (Anders als Tier-Schwellen → gespeicherter rank_tier.)
  - REVOKE PUBLIC/anon, GRANT authenticated.

### (C) `close_monthly_liga` CREATE OR REPLACE (byte-treu zum Live-Body, additiv)
Globaler 4-Dim-Block **unverändert** (league_id bleibt NULL auf diesen Inserts → „zusätzlich"). **NEU**, eingefügt nach dem globalen FOREACH-Loop und **vor** dem Deckungs-Check:
```
FOR v_league IN SELECT id, short FROM leagues WHERE is_active = true LOOP
  -- Config für diese Liga (COALESCE auf Default; Single-Source mit get_liga_reward_config)
  SELECT COALESCE(rank1_cents,100000), COALESCE(rank2_cents,50000), COALESCE(rank3_cents,25000)
    INTO v_cfg1, v_cfg2, v_cfg3 FROM (SELECT v_league.id AS lid) b
    LEFT JOIN liga_reward_config c ON c.league_id = b.lid;
  -- Pro-Liga-Manager-Snapshot = EXAKT rpc_get_season_ranking-Aggregat (Display==Payout)
  INSERT INTO monthly_liga_snapshots (month,user_id,dimension,score_delta,final_score,rank,league_id)
  SELECT p_month, agg.user_id, 'manager',
         ROUND(agg.season_score)::int, ROUND(agg.season_score)::int,
         ROW_NUMBER() OVER (ORDER BY agg.season_score DESC, agg.event_count DESC, agg.user_id)::int,
         v_league.id
  FROM (SELECT l.user_id, COALESCE(SUM(l.total_score),0)::numeric AS season_score, COUNT(*)::int AS event_count
        FROM lineups l JOIN events e ON e.id=l.event_id
        WHERE e.is_liga_event=true AND e.status='ended' AND e.league_id=v_league.id
        GROUP BY l.user_id) agg;
  -- Winner top-3 mit Liga-Config-Beträgen (nur >0 → keine 0-Reward-Geisterzeilen)
  INSERT INTO monthly_liga_winners (month,dimension,user_id,rank,reward_cents,badge_key,league_id)
  SELECT p_month,'manager',ms.user_id,ms.rank,
    CASE ms.rank WHEN 1 THEN v_cfg1 WHEN 2 THEN v_cfg2 WHEN 3 THEN v_cfg3 END,
    'monthly_winner_manager_'||v_league.short||'_'||ms.rank, v_league.id
  FROM monthly_liga_snapshots ms
  WHERE ms.month=p_month AND ms.dimension='manager' AND ms.league_id=v_league.id AND ms.rank<=3
    AND (CASE ms.rank WHEN 1 THEN v_cfg1 WHEN 2 THEN v_cfg2 WHEN 3 THEN v_cfg3 END) > 0;
END LOOP;
```
- **Deckungs-Check unverändert** — `v_total_needed = Σ reward_cents WHERE month=p_month` summiert jetzt automatisch global **+** pro-Liga (weil pro-Liga-Winner VOR dem Check inserted sind). Lock + `RAISE insufficient_treasury` identisch.
- **Payout-Loop:** Select um `league_id` erweitern + `leagues.short` joinen; Transaction-Description verzweigen: `league_id IS NOT NULL` → `'BeScout-Saison '||short||' Manager Rang '||rank`, sonst Bestand `'Liga-Top3: '||dimension||' Rang '||rank`. `type='liga_reward'` (schon im CHECK) für beide. `v_total_paid` akkumuliert beide.
- **EIN Debit** `book_platform_treasury('debit','monthly_liga', v_total_paid)` unverändert (deckt global + pro-Liga in einer Buchung).
- Return-Shape unverändert (`ok/month/winners_inserted/payouts_credited/total_paid_cents`).
- AR-44: REVOKE PUBLIC/anon + GRANT authenticated nach CREATE OR REPLACE renew.
- **PATCH-AUDIT (S356):** globale Konstanten 500000/250000/100000 byte-identisch erhalten; overall-Median-Expr erhalten; Idempotenz-Guard erhalten.

### (D) Winner-Read-RPC erweitern
`get_monthly_liga_winners(p_month, p_limit)` (Consumer von `getMonthlyLigaWinners`): Return um `league_id` + `league_name` (LEFT JOIN leagues) erweitern. Bestehende Felder unverändert (additiv). AR-44 renew.

### (E) Service / Types / Hooks / UI / i18n
- `src/types/index.ts`: `DbMonthlyLigaWinner` + `MonthlyWinnerRow` additiv `league_id?: string|null`, `league_name?: string|null`. Neuer Typ `LigaRewardConfig { league_id; rank1_cents; rank2_cents; rank3_cents }`.
- `scoutScores.ts`: `getLigaRewardConfig()` (alle Ligen + Config, throw on error) + `setLigaRewardConfig(leagueId,r1,r2,r3)` (RPC, throw). Re-Export via `gamification.ts`.
- `queries/gamification.ts`: `useLigaRewardConfigs()` + `useSetLigaRewardConfig()` (Mutation invalidiert Config-Key). qk-Key ergänzen.
- `AdminLigaTab.tsx`: (a) neue Card „Pro-Liga-Rewards (BeScout-Saison)" — pro aktive Liga 3 Number-Inputs (Rang1/2/3 in Credits, intern ×100 → cents), Speichern via Mutation, Validierung monoton/≥0, Toast i18n; (b) Winner-Liste: Pro-Liga-Zeilen mit Liga-Badge (`league_name`) kennzeichnen; (c) „Monat abschließen"-Beschreibungstext aktualisieren (globaler + pro-Liga-Hinweis).
- i18n DE+TR: neue Keys im `bescoutAdmin`-Namespace (namespace-aware, S333-Falle).

## 3. Betroffene Files
| File | Änderung |
|---|---|
| `supabase/migrations/2026062520XXXX_slice383_perleague_payout.sql` (NEU) | Config-Tabelle+RLS, league_id+UNIQUE-Rebuild auf 2 Tabellen, helper+write-RPC, close_monthly_liga-Replace, get_monthly_liga_winners-Replace |
| `src/types/index.ts` | +league_id/league_name auf Winner-Typen, +LigaRewardConfig |
| `src/lib/services/scoutScores.ts` | +getLigaRewardConfig/setLigaRewardConfig |
| `src/lib/services/gamification.ts` | Re-Export |
| `src/lib/queries/gamification.ts` | +useLigaRewardConfigs/useSetLigaRewardConfig + qk |
| `src/lib/queryKeys.ts` | qk.gamification.ligaRewardConfig |
| `src/app/(app)/bescout-admin/AdminLigaTab.tsx` | Config-Editor-Card + Winner-Liga-Badge + Text |
| `messages/de.json`, `messages/tr.json` | bescoutAdmin-Keys |

## 4. Code-Reading-Liste (erledigt VOR Implementation)
1. **Live `pg_get_functiondef('close_monthly_liga(date)')`** ✅ (D87) — Bau-Baseline, Konstanten/Idempotenz/Coverage/Debit identifiziert.
2. **Live `pg_get_functiondef('rpc_get_season_ranking(uuid,integer)')`** ✅ — exaktes Aggregat (SUM total_score, is_liga_event+ended+league_id, Tiebreak season_score DESC,event_count DESC,user_id) → in close_monthly_liga spiegeln.
3. **Live Constraints `monthly_liga_snapshots/_winners`** ✅ — UNIQUE ohne league_id (Kollisions-Falle) + dimension-CHECK + winners rank-CHECK 1-3.
4. **Live `update_fee_config_rpc`** ✅ — platform_admin-Gate-Muster (`platform_admins.role IN ('superadmin','admin')`).
5. **Migration `20260618235000_slice_347_club_fan_rank_thresholds.sql`** ✅ — Config-Tabelle+RLS+Helper+Write-RPC-Muster (COALESCE-Default, fehlende-Zeile=Default, monotoner CHECK).
6. **Migration `20260625130000_slice376_monthly_liga_pot_payout.sql`** ✅ — aktuelles Money-Muster (Lock, Coverage, Debit, force-rollback-Smoke).
7. **`AdminLigaTab.tsx`** ✅ — `handleCloseMonth` (error.message-Toast OK), Winner-Liste-Rendering, Card-Layout-Muster, fmtScout.
8. **`scoutScores.ts:146-158` (getMonthlyLigaWinners) + `MonthlyWinnerRow`-Type** ✅ — Winner via `get_monthly_liga_winners`-RPC (nicht Direkt-Select) → RPC erweitern.
9. **`queries/gamification.ts:51-57` + `qk.gamification`** ✅ — Hook-Muster + Key-Factory.
10. **`db-invariants.test.ts` INV-26/Allowlist (monthly_liga_*)** ✅ — Tabellen public-leaderboard, league_id-Add bricht Allowlist nicht; Return-Shape-Test prüfen.
11. **Live `pg_get_functiondef('get_monthly_liga_winners')`** — VOR BUILD ziehen (exakte Shape für additive league_id/league_name + AR-44 Grants).
12. **`src/types/index.ts:2148` DbMonthlyLigaWinner + LigaDimension** ✅ — Typ-Erweiterung additiv.

## 5. Pattern-References
- **D87** Live-functiondef vor Spec (erledigt #1/#2/#4). **D106/D105** Pro-Liga-Wertung, Naming „BeScout-Saison". **D96/D98** zirkulär/voller Auffang. **D97** Saldo=SUM-on-read unter Lock.
- **S347** (errors-db „Config-Wert steuert Geld-Pfad"): Config-Tabelle 1-Zeile/Entity + fehlend=Default + Write-nur-RPC + platform/club-Admin-Gate-Bypass-Spiegelung. (Recalc-on-Save hier N/A — kein gespeicherter Ableitungswert.)
- **S356** PATCH-AUDIT Konstanten-Prüfung bei CREATE OR REPLACE (nicht nur Präsenz).
- **S376** Coverage inline unter Singleton-Row-Lock + RAISE bei Unterdeckung (Idempotenz-erhaltend) + EIN Debit gegen v_total_paid.
- **S330/S359** transactions.type-CHECK — `liga_reward` bereits gedeckt, KEIN neuer Typ (kein 5-File-Sync nötig); trotzdem verifizieren.
- **„RLS Policy Trap — neue Tabelle"**: alle 4 Ops policen. **AR-44** REVOKE/GRANT-renew nach jedem CREATE OR REPLACE.
- **S333** i18n namespace-aware (Live-Render-Console-Scan). **S200** *_SELECT_COLS-Sync (hier RPC-Shape statt Select-Cols).

## 6. Acceptance Criteria (executable)
- **AC1** Config-Tabelle + RLS: `liga_reward_config` existiert; `SELECT policyname,cmd FROM pg_policies WHERE tablename='liga_reward_config'` zeigt SELECT(true) + INSERT/UPDATE/DELETE(false). Fehlende Zeile → `get_liga_reward_config(L)` = `{rank1:100000,rank2:50000,rank3:25000}`.
- **AC2** Write-RPC-Gate: non-admin (`auth.uid` ohne platform_admins) → `{success:false,error:'not_platform_admin'}`; nicht-monoton (z.B. r1<r2) → `{success:false,error:'invalid_reward_config'}`; platform-admin gültig → `{success:true}` + Row gespeichert. anon REVOKEd.
- **AC3** UNIQUE-Rebuild: `pg_get_constraintdef` zeigt `UNIQUE NULLS NOT DISTINCT (month,user_id,dimension,league_id)` bzw. `(month,dimension,rank,league_id)`. Doppelter globaler Insert (league_id NULL) bleibt geblockt (Idempotenz).
- **AC4** „Zusätzlich" (Force-Rollback-Smoke gegen Test-Monat): nach `close_monthly_liga` existieren GLOBALE Winner (league_id NULL, 4 Dim, Konstanten 500k/250k/100k) **und** Pro-Liga-Manager-Winner (league_id gesetzt, dimension='manager', config-Beträge). Globale Zeilen byte-identisch zum Bestand.
- **AC5** Display==Payout: die Pro-Liga-Manager-Winner-Ränge für Liga L stimmen mit `rpc_get_season_ranking(L)`-Top-3 (user_id+rank) überein.
- **AC6** Zero-Sum: Σ(Wallet-Zuwächse) = `total_paid_cents` = Betrag des EINEN `monthly_liga`-Debits; Topf sinkt um exakt diesen Betrag; Σ deckt global + pro-Liga.
- **AC7** Config wirkt: `set_liga_reward_config(L,200000,…)` vor Close → Pro-Liga-Rang1-Winner für L erhält 200000 (nicht Default 100000). Liga mit r1=0 → kein Rang1-Winner-Insert (kein 0-Payout).
- **AC8** Deckungs-Check: künstlich `pot < needed` → `RAISE insufficient_treasury`, KEINE Snapshots/Winners (global+pro-Liga) persistiert, kein Wallet/Debit. Monat retry-bar.
- **AC9** Idempotenz: zweiter Close desselben Monats → `{error:'month_already_closed'}`, kein zweiter Payout/Debit (global+pro-Liga).
- **AC10** Leere Liga (0 liga-gebundene ended Events) → 0 Pro-Liga-Snapshots/Winners für sie; kein Fehler.
- **AC11** UI live (post-Deploy, bescout.net `/bescout-admin` Liga-Tab, Mobile 393px): Config-Editor rendert pro aktive Liga 3 Inputs, Speichern→Toast, kein `MISSING_MESSAGE` (DE+TR Console-Scan); Winner-Liste zeigt Liga-Badge bei Pro-Liga-Zeilen.
- **AC12** `tsc --noEmit` grün + `db-invariants.test.ts` grün (Return-Shape unverändert) + Service-Tests grün.

## 7. Edge Cases
| Fall | Verhalten |
|---|---|
| Liga ohne Config-Zeile | Default 100k/50k/25k (COALESCE) |
| Config r1=0 (Liga deaktiviert) | kein Rang1-Winner-Insert (`>0`-Filter), kein Payout |
| User Top-3 global Manager UND Bundesliga Manager | Doppel-Payout (CEO-gewollt); 2 distinct Snapshot/Winner-Zeilen (NULLS NOT DISTINCT) |
| User in mehreren Liga-Boards Top-3 | je Liga eigene Winner-Zeile (distinct league_id) |
| Leere/inaktive Liga | keine Pro-Liga-Zeilen; `leagues.is_active=false` ausgeschlossen |
| <3 Manager in einer Liga | nur vorhandene Ränge, weniger Winner |
| Ties season_score | Tiebreak event_count DESC, user_id (identisch rpc_get_season_ranking) |
| Topf < (global+pro-Liga) | RAISE → voller Rollback, retry-bar |
| Monat schon geschlossen | month_already_closed (vor jeglichem Insert) |
| set_liga_reward_config nicht-monoton/negativ | invalid_reward_config (Defense-in-Depth + CHECK) |
| Winner ohne Wallet-Row | übersprungen (v_new_balance NULL), nicht in v_total_paid |
| Migration Re-Run | ADD COLUMN IF NOT EXISTS / DROP+ADD CONSTRAINT idempotent; CREATE TABLE IF NOT EXISTS |

## 8. Self-Verification Commands
- Live `pg_get_functiondef('close_monthly_liga(date)')` post-Migration: globaler Block + Konstanten 500k/250k/100k erhalten, overall-Median erhalten, neuer Liga-LOOP + Coverage/Lock/Debit erhalten, Idempotenz-Guard erhalten.
- `pg_get_constraintdef` beider UNIQUEs = NULLS NOT DISTINCT inkl. league_id.
- `SELECT policyname,cmd FROM pg_policies WHERE tablename='liga_reward_config'` (4 Ops).
- Force-Rollback-Smoke (`BEGIN; … set config + close_monthly_liga(Test-Monat) … ROLLBACK;`) belegt AC4/AC5/AC6/AC7/AC8/AC9 (Output via finalem `RAISE EXCEPTION 'REPORT >>> %'` → Rollback + Ergebnis im Fehlertext, null Persistenz).
- `CI=true pnpm exec vitest run src/lib/__tests__/db-invariants.test.ts src/lib/services/__tests__/scoutScores*` grün.
- `pnpm exec tsc --noEmit`.
- Post-Deploy Playwright (`/bescout-admin` Liga-Tab) DE+TR Console-Scan auf MISSING_MESSAGE (AC11).

## 9. Open-Questions
- **Geklärt (Anil 2026-06-25, CEO):** (1) zusätzlich, (2) pro Liga einzeln, (3) Default 100k/50k/25k. (AskUserQuestion.)
- **Autonom-Zone (CTO):** Pro-Liga-Ranking = `rpc_get_season_ranking`-Aggregat (saison-kumulativ, Display==Payout, konsistent mit globalem Saison-Delta-Muster) · nur `manager`-Dim pro Liga (trader/analyst global) · Config-Beträge in Cents intern, UI in Credits · 0-Reward = keine Winner-Zeile · badge_key-Schema · Migration-Timestamp > 382.
- **Kein offener Money-Entscheid mehr** → BUILD nach Anil-Approval der Spec.

## 10. Proof-Plan
- `worklog/proofs/383-money-smoke.txt`: Force-Rollback-Smoke (AC4-AC10) + post-Migration-Selects (AC1-AC3 Constraints/RLS/Config) + functiondef-Belege (Konstanten erhalten).
- `worklog/proofs/383-tests.txt`: vitest (Service + db-invariants) + tsc.
- `worklog/proofs/383-admin-ui.png` (+ TR): post-Deploy Playwright Config-Editor + Winner-Liga-Badge (AC11).

## 11. Scope-Out (explizit NICHT in 383)
- **Cron** für Auto-Monatsabschluss (Anil: weiter manuell).
- **Pro-Liga trader/analyst** Payout (bleiben global — nicht liga-spezifisch).
- **Globale Reward-Beträge konfigurierbar** machen (nur Pro-Liga ist Scope; global bleibt hardcodiert 500k/250k/100k).
- **Live-Standing-Board** (laufender Monat) + `getMonthlyLeaderboard`-Heal (eigener UI-Slice).
- **Pro-Liga-Saison-Reset-Baseline** (per-Liga season_start) — saison-kumulativ ohne Delta reicht für E-2b.

## 12. Stage-Chain (geplant)
SPEC → IMPACT (inline §3, Consumer grep-verifiziert) → BUILD (selbst, 1 Migration via apply_migration + Service/UI; KEIN Worktree-Agent — Money §3) → REVIEW (reviewer, Money-Pflicht) → PROVE (force-rollback-smoke + tests + UI-Playwright post-Deploy) → LOG (+ Knowledge: treasury.md/bescout-liga.md Update, decisions.md ggf. D107 Payout-Konkretisierung).

## 13. Pre-Mortem
1. **UNIQUE nicht um league_id erweitert** → Pro-Liga-`manager`-Insert kollidiert mit globalem → 23505 mitten im Close → vermieden: DROP+ADD UNIQUE NULLS NOT DISTINCT zuerst.
2. **NULLS NOT DISTINCT vergessen** → zwei globale NULL-Zeilen erlaubt → Idempotenz-Guard umgangen / Doppel-Payout → vermieden: explizit NULLS NOT DISTINCT (PG17 ✅), AC3-Verify.
3. **Pro-Liga-Winner NACH Coverage-Check inserted** → Deckungs-Check unterschätzt Bedarf → Topf kann negativ → vermieden: Liga-LOOP VOR dem Lock/Coverage-Block.
4. **Globale Konstanten beim Replace verändert** → falsches Geld → PATCH-AUDIT S356: 500k/250k/100k + Median-Expr byte-verifizieren.
5. **Config-Beträge nicht in Coverage/Debit eingerechnet** → Drift Topf vs. Payout → vermieden: ein `Σ reward_cents`-Check + ein Debit gegen `v_total_paid` decken global+pro-Liga.
6. **Write-RPC ohne platform_admin-Gate** (nur UI-gated) → anon/auth-Exploit setzt Reward-Beträge → vermieden: auth.uid()+platform_admins-Gate + REVOKE anon (Muster update_fee_config_rpc).
7. **get_monthly_liga_winners-Shape gebrochen** (Feld umbenannt statt additiv) → Admin-Winner-Liste leer → vermieden: rein additiv league_id/league_name, Live-Shape #11 vor Replace ziehen.
8. **Doppel-Payout als Bug missverstanden** beim Review → CEO-Entscheid „zusätzlich" in Spec+active.md dokumentiert (Reviewer-Kontext).
9. **i18n-Key im falschen Namespace** (S333) → MISSING_MESSAGE live trotz grünem grep → namespace-aware Check + Live-Console-Scan (AC11).

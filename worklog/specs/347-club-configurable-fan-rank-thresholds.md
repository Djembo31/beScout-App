# Slice 347 — FRE-5: Club-konfigurierbare Fan-Rang-Schwellen

**Slice-Type:** Migration (+ Service + UI)
**Größe:** L (Cross-Domain: DB-Migration + SECURITY-DEFINER-RPC-Rewrite + neue Tabelle + RLS + Recalc + Frontend + Service + Tests)
**Money-Klasse:** Money-nah (Fan-Rang-Tier steuert seit Slice 343 das Poll-Stimmgewicht = Geld-Tally in Vereins-Umfragen). RPC-Body + RLS → CTO selbst, nicht delegiert. CEO-Scope (Anil hat Feature gewählt 2026-06-18).

---

## 1. Problem-Statement

Die Fan-Rang-Schwellen (Score → Tier) sind heute **global hart codiert** an genau zwei Orten:
- **Live-RPC `calculate_fan_rank`** (D87-Live-Read 2026-06-18, `pg_get_functiondef`): `>=70 vereinsikone · >=55 ehrenmitglied · >=40 legende · >=25 ultra · >=10 stammgast · sonst zuschauer`. Der RPC bekommt zwar `p_club_id`, aber die Grenzen variieren nicht pro Club.
- **Frontend `src/lib/fanRanking.ts:25-30`** `FAN_RANK_TIERS` (`minScore`/`maxScore`: 0-9/10-24/25-39/40-54/55-69/70+).

Anil-Entscheidung (2026-06-18, Design-Alignment): FRE-5 = **diese Schwellen pro Club konfigurierbar machen**. So kann ein Verein sein Treue-Programm an seine Fanbasis-Größe anpassen (kleiner Verein: niedrigere Schwellen, damit Fans überhaupt aufsteigen).

**Schutz-Grenze (CEO-relevant):** Konfigurierbar werden NUR die Score→Tier-Schwellen. Das Gewicht-Mapping Tier→Faktor (Ultra/Legende=2×, Ehren/Ikone=3× in `cast_community_poll_vote`) bleibt **global**. Ein Club kann also keine neuen Stimmgewichte erfinden — nur verschieben, wer qualifiziert. Das deckelt den Missbrauchs-Hebel.

---

## 2. Lösungs-Design

**Architektur:** Config-Tabelle + Helper-Funktion (Muster `streak_config` + `fn_get_streak_elo_boost`) + Write-RPC mit Club-Admin-Gate + Recalc-on-Save + Frontend liest Schwellen aus Service statt Konstante.

### 2a. Storage — neue Tabelle `club_fan_rank_thresholds` (eine Zeile/Club, Spalten statt Zeilen)
```sql
CREATE TABLE public.club_fan_rank_thresholds (
  club_id        uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  stammgast      smallint NOT NULL DEFAULT 10,
  ultra          smallint NOT NULL DEFAULT 25,
  legende        smallint NOT NULL DEFAULT 40,
  ehrenmitglied  smallint NOT NULL DEFAULT 55,
  vereinsikone   smallint NOT NULL DEFAULT 70,
  updated_by     uuid REFERENCES public.profiles(id),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cfrt_monotonic CHECK (
    stammgast >= 1 AND stammgast < ultra AND ultra < legende
    AND legende < ehrenmitglied AND ehrenmitglied < vereinsikone AND vereinsikone <= 100
  )
);
```
- `zuschauer` ist implizit 0 (unter `stammgast`) — keine Spalte.
- **Spalten-statt-Zeilen** bewusst gewählt: monotone Validität in EINEM CHECK atomar prüfbar (rang_thresholds-Zeilen-Muster bräuchte fragilen Multi-Row-Trigger).
- **Fehlende Zeile = Plattform-Default.** Kein Backfill nötig — Clubs ohne Config nutzen 10/25/40/55/70.

### 2b. Helper-Funktion `get_club_fan_rank_thresholds(p_club_id uuid) RETURNS jsonb`
- `STABLE SECURITY DEFINER`. Liest die Config-Zeile, COALESCE auf Default je Wert. Return `{stammgast,ultra,legende,ehrenmitglied,vereinsikone}`.
- Wird von BEIDEN genutzt: `calculate_fan_rank` (intern) UND Frontend-Read (Service). Single Source → kein Default-Drift.
- GRANT authenticated (Frontend darf lesen — keine PII).

### 2c. RPC `calculate_fan_rank` Rewrite (gegen Live-Baseline, D87/PATCH-AUDIT)
- Baseline = **live `pg_get_functiondef`** (gelesen 2026-06-18), NICHT die stale `20260330_streak_benefits_rpcs.sql`.
- Einzige Änderung: der finale `IF v_total_score >= 70 ... CASE`-Block liest die 5 Schwellen aus `get_club_fan_rank_thresholds(p_club_id)` (in 5 Variablen) statt Literale. ALLE anderen Teile (ELO-Boost, Follow-Bonus +5 Slice 345, SC-Score, csf_multiplier-Write) **byte-für-byte erhalten** — nur die Schwellen-Vergleiche werden variabel.
- `csf_multiplier` bleibt vorerst drin (Removal = separater Backlog-Slice, D93). Tier→csf bleibt an Tier gekoppelt, nicht an Schwelle.
- AR-44 REVOKE/GRANT-Block erneuern.

### 2d. Write-RPC `set_club_fan_rank_thresholds(p_club_id, p_stammgast, p_ultra, p_legende, p_ehrenmitglied, p_vereinsikone) RETURNS jsonb`
- `SECURITY DEFINER`, `auth.uid()`-Guard. Club-Admin-Gate: `EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid() AND club_id = p_club_id AND role IN ('owner','admin'))` — sonst `{success:false, error:'not_club_admin'}`.
- Defense-in-Depth-Validierung (zusätzlich zum CHECK): monoton steigend + 1..100, sonst `{success:false, error:'invalid_thresholds'}`.
- UPSERT (`ON CONFLICT (club_id) DO UPDATE`).
- **Recalc-on-Save (Staleness-Heilung):** synchron alle `fan_rankings`-Zeilen des Clubs neu rechnen — fail-isolierte Schleife (`FOR ... LOOP ... BEGIN PERFORM calculate_fan_rank(r.user_id, p_club_id); EXCEPTION WHEN OTHERS THEN CONTINUE; END; END LOOP`). Grund: Tier steuert Poll-Gewicht; nach Admin-Klick darf das Gewicht nicht stale bleiben (Impact-Risiko #2). Pilot-Skala: Clubs haben wenige Fans → synchron OK. Return `{success:true, recalculated:<n>}`.
- AR-44 REVOKE/GRANT.
- Discriminated-Union-Return (database.md).

### 2e. RLS für `club_fan_rank_thresholds` (alle 4 Ops — database.md Checkliste)
- SELECT: authenticated (Schwellen sind nicht-sensibel; Frontend liest sie für die Leiter). Policy `USING (true)`.
- INSERT/UPDATE/DELETE: **kein direkter Client-Write** — nur via Write-RPC (SECURITY DEFINER). → Policies für INSERT/UPDATE/DELETE mit `USING/WITH CHECK (false)` ODER schlicht keine Client-Write-Policy + `REVOKE`. Muster: Schreiben ausschließlich über die RPC, Client-`.update()` blockiert.

### 2f. Frontend
- **Service** `src/lib/services/fanRanking.ts`: neu `getClubFanRankThresholds(clubId)` → ruft `get_club_fan_rank_thresholds`-RPC, Return typisiert. Plus `setClubFanRankThresholds(...)` → Write-RPC, Discriminated-Union-Guard (`if (!result.success) throw`).
- **`FanRankLadder`**: neuer optionaler Prop `thresholds?: ClubFanRankThresholds`. Range-Labels (`:77`) + „noch N bis nächstem Tier" (`:33`) aus `thresholds` statt aus `FAN_RANK_TIERS[].minScore`. Fallback auf Plattform-Default wenn Prop fehlt (abwärtskompatibel).
- **`FanRankOverview`** (`src/components/gamification/`): lädt Schwellen für den Club (TanStack-Query, `staleTime` 5min — statisch) und reicht sie an `FanRankLadder`.
- **`getFanRankByScore`** (`fanRanking.ts:43`): **löschen** — 0 Render-Consumer (Impact-verifiziert), latente Drift-Bombe. Falls Test-Referenz: Test mit-bereinigen.
- **`AdminFansTab`** (`src/components/admin/AdminFansTab.tsx`): neue Sektion „Fan-Rang-Schwellen" — 5 Zahlen-Inputs (stammgast..vereinsikone), Live-Validierung (monoton), Save-Button → `setClubFanRankThresholds`. Mobile 393px. DE+TR. `inputMode="numeric"`. Erfolg/Fehler-Toast via i18n.

---

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `supabase/migrations/<ts>_slice_347_club_fan_rank_thresholds.sql` | NEU: Tabelle + RLS + Helper + calculate_fan_rank-Rewrite + Write-RPC |
| `src/lib/services/fanRanking.ts` | +`getClubFanRankThresholds` +`setClubFanRankThresholds` |
| `src/lib/fanRanking.ts` | `getFanRankByScore` löschen; `FAN_RANK_TIERS` bleibt (Metadaten), Schwellen werden dynamisch via Prop |
| `src/components/gamification/FanRankLadder.tsx` | `thresholds`-Prop, dynamische Range/Progress |
| `src/components/gamification/FanRankOverview.tsx` | Schwellen laden + durchreichen |
| `src/components/admin/AdminFansTab.tsx` | Config-Sektion (5 Inputs + Save) |
| `src/types/index.ts` | `ClubFanRankThresholds`-Type |
| `messages/de.json` + `messages/tr.json` | Admin-Sektion + Leiter-Labels (TR Anil-Review) |
| `src/components/gamification/__tests__/FanRankLadder.test.tsx` | Tests auf dynamische Schwellen anpassen (Mock-thresholds) |

---

## 4. Code-Reading-Liste (vor Implementation) — erledigt 2026-06-18

1. **Live `pg_get_functiondef('calculate_fan_rank')`** ✅ (D87) — Baseline für Rewrite, NICHT 20260330-Datei.
2. `src/lib/fanRanking.ts:24-51` ✅ — Frontend-Schwellen-SSOT + getFanRankByScore (0 Consumer).
3. `src/components/gamification/FanRankLadder.tsx` ✅ — Range-Label `:77`, Progress `:33`.
4. `src/lib/services/fanRanking.ts` ✅ — Service-Muster (throw on error, RPC-Cast).
5. `cast_community_poll_vote` (Migration `20260618230000:55-66`) ✅ — liest GESPEICHERTEN rank_tier → Recalc-Notwendigkeit.
6. `club_admins`-Gate-Muster (`20260404191000_bounty_rpcs_rls.sql:27-30`) ✅ — `role IN ('owner','admin')`.
7. `streak_config` + `fn_get_streak_elo_boost` (`20260330_economy_config_tables.sql`) — Config-Tabelle+Helper-Muster.
8. Follow-Recalc-Trigger (`20260618233000:253-279`) — fail-isolierte Recalc-Muster.
9. `AdminFansTab.tsx` — wo + wie Config-Sektion einfügen.
10. `AdminContent.tsx` ✅ — Tab-Wiring (fans-Tab existiert, role-gated).
11. database.md RLS-Checkliste + AR-44 REVOKE/GRANT + errors-db.md PATCH-AUDIT.

---

## 5. Pattern-References
- **D87 / errors-db.md PATCH-AUDIT**: calculate_fan_rank-Body NUR live, Rewrite gegen `pg_get_functiondef`.
- **AR-44**: CREATE OR REPLACE → REVOKE PUBLIC+anon / GRANT authenticated.
- **database.md RLS-Pflicht-Checkliste**: alle 4 Ops, SELECT-only = silent write-fail.
- **D92 (MAX-Floor-Familie) / Slice 343**: Tier→Poll-Gewicht, Recalc-Staleness-Bewusstsein.
- **errors-db.md „Money-RPC Pricing-Formel Drift"**: Frontend-Konstante darf nicht vom RPC driften → Schwellen aus einer Quelle.
- **errors-db.md pg_cron Fail-Isolation (Slice 024)**: Recalc-Schleife per-row `EXCEPTION WHEN OTHERS`.
- **database.md Discriminated-Union-Return**.

---

## 6. Acceptance Criteria (executable)

1. **AC1** Tabelle existiert mit CHECK: `SELECT conname FROM pg_constraint WHERE conrelid='public.club_fan_rank_thresholds'::regclass` → `cfrt_monotonic` vorhanden.
2. **AC2** RLS 4-Op-Status: `SELECT cmd FROM pg_policies WHERE tablename='club_fan_rank_thresholds'` → SELECT für authenticated; kein offener Client-Write.
3. **AC3** `calculate_fan_rank` liest Config: nach `set_club_fan_rank_thresholds(club, 5,12,20,30,45)` ergibt ein Fan mit total_score=20 Tier `legende` (statt vorher `zuschauer` bei Default-Schwellen würde 20 = stammgast). VERIFY: Live-SQL Smoke `BEGIN; set...; SELECT (calculate_fan_rank(uid,club)->>'rank_tier'); ROLLBACK;`.
4. **AC4** Default-Fallback: Club OHNE Config-Zeile → `get_club_fan_rank_thresholds` returnt `{stammgast:10,...,vereinsikone:70}`.
5. **AC5** Club-Admin-Gate: Nicht-Admin-`auth.uid()` → `set_...` returnt `{success:false,error:'not_club_admin'}`, keine Zeile geschrieben.
6. **AC6** Monoton-Guard: `set_...(club, 50,40,...)` (nicht steigend) → `{success:false,error:'invalid_thresholds'}`, kein Write.
7. **AC7** Recalc-on-Save: nach `set_...` ist `fan_rankings.rank_tier` für betroffene Fans neu berechnet (Smoke: vor/nach `SELECT rank_tier`).
8. **AC8** AR-44: `pg_get_functiondef` beide RPCs → kein PUBLIC/anon EXECUTE (`SELECT has_function_privilege('anon', ...)` = false).
9. **AC9** Frontend-Leiter zeigt Club-Schwellen: Playwright auf `/club/<slug-mit-config>` Tab „Mehr" → Range-Labels matchen gesetzte Schwellen (nicht 10–24 etc.).
10. **AC10** Admin-UI Save-Roundtrip: Playwright im Admin-Fans-Tab → 5 Werte setzen → Save → Erfolg-Toast → Reload zeigt persistierte Werte. Mobile 393px.
11. **AC11** tsc clean + `pnpm vitest run` (FanRankLadder + fanRanking-Service) grün.

---

## 7. Edge Cases

| # | Case | Verhalten |
|---|------|-----------|
| 1 | Club ohne Config-Zeile | Plattform-Default (10/25/40/55/70). |
| 2 | Nicht-monotone Eingabe (ultra<=stammgast) | RPC-Guard + CHECK reject, `invalid_thresholds`. |
| 3 | Schwelle 0 oder >100 | reject (CHECK `>=1 .. <=100`). |
| 4 | Nicht-Admin ruft Write-RPC | `not_club_admin`, kein Write. |
| 5 | `auth.uid()` NULL (service_role/Cron) | Guard `IS NOT NULL`-skip → service_role darf (kein Cross-User-Issue, keine UI). |
| 6 | Recalc-Schleife: ein Fan-Recalc wirft | fail-isoliert (CONTINUE), übrige laufen, Count zählt erfolgreiche. |
| 7 | Club mit 0 Fans (keine fan_rankings) | Recalc-Schleife No-Op, `recalculated:0`, success. |
| 8 | Schwellen-Senkung → Fan steigt auf | nach Recalc höheres Tier → höheres Poll-Gewicht (gewollt). |
| 9 | Schwellen-Erhöhung → Fan fällt ab | nach Recalc niedrigeres Tier → niedrigeres Gewicht (gewollt, kein Stale). |
| 10 | Frontend ohne thresholds-Prop | FanRankLadder Fallback auf Default-Konstante (abwärtskompatibel). |
| 11 | Concurrent Save zweier Admins | UPSERT last-wins; Recalc beider läuft (idempotent calculate). |
| 12 | club_id existiert nicht | FK-Reject beim UPSERT → error. |

---

## 8. Self-Verification Commands
```bash
# RLS 4-Op
mcp execute_sql: SELECT cmd, policyname FROM pg_policies WHERE tablename='club_fan_rank_thresholds';
# Schwellen-Wirkung (rollback-Smoke)
mcp execute_sql: BEGIN; SELECT set_club_fan_rank_thresholds('<club>',5,12,20,30,45);
                 SELECT calculate_fan_rank('<uid>','<club>')->>'rank_tier'; ROLLBACK;
# AR-44
mcp execute_sql: SELECT has_function_privilege('anon','public.set_club_fan_rank_thresholds(uuid,smallint,smallint,smallint,smallint,smallint)','EXECUTE');
# Frontend i18n namespace-aware
node -e "const m=require('./messages/de.json'); console.log(m.admin?.fanRankThresholdsTitle ?? 'MISSING')"
# tsc + tests
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run src/components/gamification/__tests__/FanRankLadder.test.tsx
```

---

## 9. Open Questions (Pflicht-Klärung vs. Autonom-Zone)

**Pflicht-Klärung (Anil, vor BUILD):**
- **OQ1 — Recalc-Strategie:** Synchroner Recalc-on-Save aller Club-Fans (gewählt im Design). Bei großen Clubs theoretisch teuer (Pilot: unkritisch). OK so? *(CTO-Empfehlung: ja, synchron — Money-Tally-Korrektheit > Latenz bei Pilot-Skala. Alternative wäre dokumentierte Staleness — abgelehnt wegen sofort-sichtbarem Gewicht-Drift.)*
- **OQ2 — Wo im Admin-Panel:** `AdminFansTab` (Fans-CRM). OK, oder lieber `AdminSettingsTab`?

**Autonom-Zone (CTO):** UI-Layout der Inputs, i18n-Key-Namen, Test-Mock-Struktur, exakter Helper-Funktion-Name, ob FanRankOverview eigener Query-Hook oder inline.

---

## 10. Proof-Plan
- **Security/RLS** (`worklog/proofs/347-rls.txt`): `pg_policies` + `has_function_privilege` Listing.
- **Money-Smoke** (`worklog/proofs/347-thresholds-smoke.txt`): BEGIN/ROLLBACK-Smoke AC3+AC5+AC6+AC7.
- **UI** (`worklog/proofs/347-admin-ui.png` + `347-ladder.png`): Playwright gegen bescout.net nach Deploy — Admin-Save + Leiter mit Club-Schwellen, Mobile 393px.
- **Tests** (`worklog/proofs/347-vitest.txt`).

---

## 11. Scope-Out (explizit NICHT drin)
- Gewicht-Mapping Tier→Faktor konfigurierbar (bleibt global — Schutz-Grenze).
- `csf_multiplier`-Removal (eigener Backlog-Slice, D93).
- Recalc als async Job/Trigger auf Config-Tabelle (synchron im Write-RPC reicht für Pilot).
- Konfigurierbare Tier-Namen/Labels/Farben (FRE-Folge).
- Backfill bestehender Clubs mit Config-Zeilen (fehlende Zeile = Default, kein Backfill nötig).

---

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT ✅ (impact-analyst, Consumer-Karte 6 Gruppen) → BUILD (Wave 1 Backend = CTO selbst: Migration+RPCs+Service; Wave 2 Frontend = frontend-Agent NACH Backend-Commit, FRE-3-Lehre) → REVIEW (reviewer-Agent, Pflicht Money-nah) → PROVE (RLS+Money-Smoke+UI) → LOG (+ Wissens-Kopplung treasury.md/polls.md prüfen).

---

## 13. Pre-Mortem (5+ Szenarien)

1. **Silent-Revert von Slice 345 Follow-Bonus / ELO-Boost** beim calculate_fan_rank-Rewrite, weil versehentlich gegen 20260330-Datei gebaut. → Mitigation: Baseline = live functiondef (gelesen + im Spec zitiert), Post-Apply `pg_get_functiondef ILIKE '%FOLLOW BONUS%'` + `'%fn_get_streak_elo_boost%'`-Check.
2. **Frontend-Schwellen driften** (FAN_RANK_TIERS bleibt hart, Leiter zeigt 10–24 trotz Club-Config). → Mitigation: getFanRankByScore gelöscht, Ladder bezieht Schwellen aus Service-Prop, AC9 Playwright-Verify.
3. **Poll-Gewicht stale nach Save** (Recalc vergessen/fehlerhaft). → Mitigation: Recalc-on-Save im Write-RPC, AC7 Vor/Nach-Smoke.
4. **RLS SELECT-only** → Write via RPC ok, aber jemand baut später Client-`.update()` → silent fail. → Mitigation: Doku in Migration-Header „Writes NUR via set_club_fan_rank_thresholds", INSERT/UPDATE/DELETE explizit blockiert.
5. **AR-44 vergessen** → anon kann set-RPC callen (Exploit wie earn_wildcards). → Mitigation: REVOKE-Block + AC8.
6. **i18n-Key im falschen Namespace** (Slice 333-Falle) → roher Key im Admin-UI. → Mitigation: namespace-aware Node-Check + Live-Render Console MISSING_MESSAGE-Scan.
7. **CHECK akzeptiert Gleichheit** (stammgast==ultra) → mehrdeutiger CASE. → Mitigation: strikte `<` (nicht `<=`) im CHECK + Guard.

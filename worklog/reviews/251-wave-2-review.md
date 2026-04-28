# Slice 251 Wave 2 (Track B + Track F) — Reviewer Output

**Reviewer:** reviewer-Agent (Opus, cold-context)
**Spec:** worklog/specs/251-spieltag-liga-scope-reform.md
**Impact:** worklog/impact/251-spieltag-liga-scope.md
**Pre-Review-Memos:** worklog/reviews/251-wave-2-track-b-pre-review.md (uncommitted) + Track-F-Worktree
**Worktrees:** agent-a22bcd03e4e95e780 (Track B uncommitted, 6 edits) + agent-a8e42780461aa8f9b (Track F 2 commits, 13 files)

## Verdict: **REWORK**

Track F hat zwei P0-Fehler die nach Migration-Apply Production brechen würden: (1) PATCH-AUDIT Slice 156 verletzt — Source-of-truth ist `20260414200000_security_wildcard_rpcs_guards.sql` (AR-27 hardening), nicht `20260326_wildcards.sql`; das hat NICHT zu einem Body-Verlust geführt (Auth-Guards sind erhalten), aber die Migration-Header-Behauptung ist falsch + (2) `admin_grant_wildcards` wird durch Composite-PK-Migration **gebrochen** weil sein `INSERT ... ON CONFLICT (user_id) DO UPDATE` nach PK-Wechsel auf `(user_id, league_id)` mit `ambiguous_column`/`unique_constraint`-Fehler scheitert. Track B ist sauber.

## Spec-Coverage

- [x] **AC-04** (Wildcards pro-Liga) — Composite-PK + RPCs implementiert
- [x] **AC-09** (`earn_wildcards` mit invalid league_id raises `invalid_league`) — implementiert (Z.111 in 120500.sql, returnt `{success:false, error:'invalid_league'}`)
- [—] **AC-22** (Wave 1 Cron Dual-Write) — out-of-scope für Wave 2 (Wave 1 lieferte)
- [/] **AC-23** (Pre-Wave-3-Audit 26 Sub-Components) — Audit lieferte 27 Files, aber Spec nannte explizit 26 + Audit fand `/clubs/page.tsx` und `/rankings` als out-of-scope (sind aber in Spec 1.4 als Konsumenten gelistet) — **inkomplett**
- [x] **AC-24** (Backfill-Sum-Smoke) — Verify-SQL im Migration-Header dokumentiert, Logik korrekt (Modulo-Rest in Cascade-Default-Liga)
- [x] **EC-09** (User mit balance=0) — durch FLOOR(0/N)=0 + 0%N=0 trivial
- [x] **EC-10** (Modulo-Rest in Cascade-Default-Liga) — `CASE WHEN al.id = udl.default_league_id THEN FLOOR + (balance % N) ELSE FLOOR` in 120000.sql Z.81-87
- [x] **EC-11** (rpc_save_lineup ohne event.club_id) — silent skip wenn `v_event_league_id IS NULL` (121000.sql Z.367); **Spec verlangt RAISE `invalid_event_no_league`** — Spec-Drift
- [x] tsc clean (per Pre-Review)
- [x] vitest grün (Track B 43/43, Track F 6/6)

## Findings

| # | Severity | Track | File:Line | Issue | Fix |
|---|----------|-------|-----------|-------|-----|
| 1 | **P0** | F | `20260428120000_user_wildcards_per_league.sql:114-117` | Composite-PK-Migration **bricht `admin_grant_wildcards`**. Die RPC (AR-27, `20260414200000`) macht `INSERT INTO user_wildcards (user_id, balance, ...) VALUES (...) ON CONFLICT (user_id) DO UPDATE`. Nach PK-Wechsel auf `(user_id, league_id)` existiert der Unique-Constraint auf `user_id` allein nicht mehr → ON CONFLICT scheitert mit `there is no unique or exclusion constraint matching the ON CONFLICT specification`. Track F droppt die alten Signaturen für `earn/spend/get` aber **nicht für `admin_grant_wildcards`** und re-writet sie auch nicht. | Entweder (a) `admin_grant_wildcards` in 120500.sql neu schreiben mit `p_league_id` Param + `ON CONFLICT (user_id, league_id)`, oder (b) auf earn_wildcards delegieren mit explizit übergebener Default-Liga. Empfehlung (a) weil Admin-Tool soll Liga-spezifisch granten. |
| 2 | **P0** | F | `20260428120500_wildcards_rpcs_per_league.sql:13-14` | **PATCH-AUDIT Slice 156 verletzt.** Header behauptet "Source-of-truth: 20260326_wildcards.sql", aber neuere Patch-Migration `20260414200000_security_wildcard_rpcs_guards.sql` (AR-27) ist die echte Baseline (auth.uid()-Guard + REVOKE anon + admin_grant_wildcards-Rewrite). Funktional ist der Body OK (Auth-Guards wurde übernommen, REVOKE-Block korrekt), aber die Header-Doku lügt — bei zukünftigem Re-Patch wird falsche Baseline verwendet. | Header korrigieren: `Source-of-truth: 20260414200000_security_wildcard_rpcs_guards.sql`. Applied patches: AR-27 auth.uid()-Guard + REVOKE anon. Empfohlen: post-apply `pg_get_functiondef ILIKE '%auth.uid() IS NOT NULL%'` als Verify-Smoke ergänzen. |
| 3 | **P1** | F | `src/features/fantasy/services/wildcards.ts:40-80` | `earnWildcards` und `spendWildcards` Service-Funktionen rufen RPC mit **alter Signatur** (`p_reference_id, p_description`) — die aber durch DROP in `20260428120500.sql:41-42` nach Migration-Apply nicht mehr existiert. Pre-Review behauptet "0 Frontend-Konsumenten" → Spec-Out, aber: (a) sie sind dennoch **exportierte production-code** und werden bei Aufruf scheitern, (b) das ist genau das D46-Anti-Pattern "orphan-Service nach BE+FE-Dispatch". | Entweder Service-Funktionen löschen (echtes Spec-Out) oder mit neuer 6-Param-Signatur ergänzen (`p_league_id` + `p_source_id` + `p_source_handle`). Da kein Konsument: löschen ist saubere Option. |
| 4 | **P1** | F | `20260428121000_save_lineup_per_league.sql:367-386` | Spec EC-11 fordert `RAISE 'invalid_event_no_league'` wenn `event.club_id IS NULL` oder `clubs.league_id IS NULL`. Implementierung **silent-skipt** Wildcard-Spend wenn `v_event_league_id IS NULL` (Z.367 `IF v_event_league_id IS NOT NULL THEN`) — User submitted Lineup mit Wildcard-Slot, aber Wildcards werden nie debitiert → Free Wildcard-Spam-Vektor. | Vor `IF v_wildcard_delta != 0` einen Guard hinzufügen: `IF v_wildcard_delta != 0 AND v_event_league_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_event_no_league'); END IF;` (Spec-Section 1.6 EC-11 + 1.7 Error #2). |
| 5 | **P1** | B | `src/features/fantasy/services/events.mutations.ts:133` | Spec sagt `createNextGameweekEvents(clubId, currentGw, leagueId?)` und Track-B-Pre-Review behauptet implementiert. Service ruft `getFixturesByGameweek(currentGw + 1, leagueId)`. Caller-Sites müssen geprüft werden: ist die Funktion immer mit korrekter `leagueId` aufgerufen? Wenn `undefined` propagiert: Cross-Liga-Fixture-Bleed. | Greppe alle `createNextGameweekEvents`-Call-Sites + verifiziere `leagueId` wird durchgereicht. Wenn nicht: Caller fixen oder Param `required` machen. |
| 6 | **P1** | F | `20260428120500_wildcards_rpcs_per_league.sql:38-44` | DROP-Reihenfolge falsch: `DROP FUNCTION ... earn_wildcards(uuid, int, text, uuid, text)` aber `refund_wildcards_on_leave` (alte Signatur, AR-27) ruft via `PERFORM earn_wildcards(p_user_id, v_wc_count, 'event_refund', p_event_id, '...')` (5 Args). Wenn 120500.sql in eigener Transaktion läuft und `refund_wildcards_on_leave` nicht im selben File neu ist, wäre es 1 Transaktion gebrochen. Im File ist `refund_wildcards_on_leave` aber mit-rewritten (Z.227) → atomarisch OK. **Aber `unlock_event_entry` ruft `refund_wildcards_on_leave(uuid, uuid)` extern** — wenn das Migration-Apply mit dropped-but-not-recreated Phase erlebt wird, gibt es kurzes Fenster. Da `BEGIN; ... COMMIT;` aber **fehlt** in 120500.sql (im Gegensatz zu 120000.sql) → atomicity nicht garantiert. | `BEGIN; ... COMMIT;` Wrapper um die ganzen DROP/CREATE in 120500.sql + 121000.sql ergänzen. 120000.sql hat es bereits korrekt. |
| 7 | **P2** | F | `20260428120000_user_wildcards_per_league.sql:140-142` | RLS-Policy `user_wildcards_insert_own` mit `WITH CHECK (auth.uid() = user_id)` ist im Konflikt mit `REVOKE ALL FROM authenticated` (Z.160). Defense-in-Depth-Argument legitim, aber: weil Tabelle nur via `service_role` (SECURITY DEFINER RPC) beschrieben wird, wird `auth.uid()` in dem Pfad NULL sein → die Policy würde mit `auth.uid() = NULL` checken → silent reject. Da die Policy nur greift bei direktem Client-Access (was REVOKE bereits blockiert), ist Policy bedeutungslos aber harmlos. Aber: konzeptuell falsch — die Policy würde service_role bypassen (BYPASSRLS), aber verwirrt Reader. | Kommentar ergänzen: `// Defense-in-depth — service_role hat BYPASSRLS, RPCs schreiben dadurch trotz Policy=false-Match`. Optional: Policy weg, weil REVOKE die echte Blockade ist. |
| 8 | **P2** | F | `20260428120000_user_wildcards_per_league.sql:69-74` | Cascade-Default-Liga nutzt `LEFT JOIN clubs c ON c.id = p.favorite_club_id` — wenn `favorite_club_id` auf gelöschten/inaktiven Club zeigt (EC-01), fällt `c.league_id` auf `NULL`, dann `COALESCE(NULL, first_active_league)` greift → korrekt. Aber: wenn der favorite Club aus inaktiver Liga ist (nicht in `active_leagues` CTE), bekommt der User Modulo-Rest in einer Liga in der seine `final_balance` nie gerendert wird (denn `active_leagues` filtert `WHERE is_active = true`). | Edge-Case dokumentieren oder `default_league_id` zusätzlich gegen `active_leagues` filtern: `COALESCE(CASE WHEN c.league_id IN (SELECT id FROM active_leagues) THEN c.league_id END, ...)`. |
| 9 | **P2** | F | `20260428120000_user_wildcards_per_league.sql:88-89` | `final_earned`/`final_spent` werden auch FLOOR-gesplittet, aber **NICHT** mit Modulo-Rest. Sum-Diff: `SUM(earned_total) post-Migration < pre` um `earned % N` (analog spent). Pre-Review behauptet "AC-24 Sum-Invariant per User by design" — das gilt für `balance` (Modulo-Rest in Default), aber NICHT für `earned_total/spent_total`. | Entweder Modulo-Rest auch für earned/spent in Cascade-Default schieben, oder explizit Spec-Annex dass earned/spent Statistik-Felder sind und Drift akzeptabel. |
| 10 | **P3** | F | `20260428120500_wildcards_rpcs_per_league.sql:115-121` | `INSERT ... VALUES (p_user_id, p_league_id, p_amount, p_amount, 0, now()) ON CONFLICT (user_id, league_id) DO UPDATE SET balance = ... + EXCLUDED.balance, earned_total = ... + EXCLUDED.earned_total` — beim INSERT-Pfad wird `earned_total = p_amount`, beim UPDATE-Pfad `earned_total += EXCLUDED.earned_total = p_amount`. Korrekt, aber `EXCLUDED.balance` (auf Z.119) ist `p_amount`, nicht der akkumulierte Wert. Funktional richtig, aber `EXCLUDED.earned_total` (Z.120) hat denselben Wert wie `EXCLUDED.balance` — verwirrend lesbar. | Doku-Kommentar ergänzen oder VALUES vertauschen damit `EXCLUDED.earned_total` semantisch klar ist. |
| 11 | **P3** | F | Worktree commits | Briefing sagte "KEIN Commit" — Track F hat 2 Commits gemacht (`7563761b feat` + `46df861d docs`). Worktree-Branch isoliert, nichts in main. Ist Briefing-Verstoß, aber merge-pfad-äquivalent. | Akzeptieren — bei Merge: cherry-pick oder squash-merge. Pattern in Briefing präzisieren für künftige Slices: "uncommitted lassen UND Branch nicht pushen". |
| 12 | **P3** | B | `src/features/fantasy/services/__tests__/fixtures.test.ts` | 5 neue Tests (per Pre-Review) decken `getFixturesByGameweek with leagueId`. Reviewer kann ohne File-Read nicht verifizieren ob alle Edge-Cases (`leagueId=undefined`, `leagueId=null`, `leagueId=''`, `leagueId='valid-uuid'`) tests haben. Pre-Review behauptet alle 4. | Reviewer-Read im Worktree empfohlen pre-Merge (oder Primary-Claude während Cherry-Pick). |
| 13 | **P3** | B | `pickTopspiel`-Param `leagueId` unused | Track-B-Pre-Review meldet leagueId-Param wird intern nicht verwendet. Spec 1.4 F7 sagt `pickTopspiel(fixtures, clubId, leagueId, sponsorClubId?)` mit "Sponsor-Match priorisiert". Wenn Liga-Filter caller-side passiert ist OK, aber Param-Existenz ohne Validation = Schein-Liga-Aware. | Param entweder nutzen (z.B. assertion: `if (leagueId && fixtures.some(f => f.league_id !== leagueId)) throw`) oder weglassen für Klarheit. Spec-Konsistenz: Param-Liste behalten. |
| 14 | **P3** | Cross | Bridge-Pattern Konsistenz | Track B nutzt `leagueId={activeClub?.league_id ?? null}` in SpieltagTab-Render (analog Wave 1). Track F's `useWildcardBalance(userId, leagueId)` verlangt `leagueId` — wenn WildcardsSection-Render in Inventar-Page mit `leagueId=undefined` passiert: query disabled, balance=0, keine UI-Reaktion. Pre-Review erwähnt das ("Phase 1 Inventar = no league context"). Akzeptabel weil Wave 3 LeagueScopeStore das löst. | Wave-3-Voraussetzung: Leftover Inventar-WildcardsSection nutzen `useLeagueScope().leagueId` direkt, nicht prop. |

## Cross-Track-Concerns

- **Wave 2.5 Audit unvollständig (AC-23):** `worklog/impact/251-store-consumers.md` nennt 27 Files und behauptet `/rankings` und `/clubs/page.tsx` "out-of-scope". Spec 1.4 listet beide explizit als Konsumenten (Track C-Scope). Wave 3 muss expliziten Re-Audit machen — ansonsten driftet Spec.
- **Worktree-Isolation (common-errors §0):** Verify zeigt Main-Repo git status mit nur 3 stale audit-files + handoff (kein Track-B/F-Bleed). Beide Tracks haben Isolation respektiert. ✓
- **Cache-Invalidation (§5 Impact):** `wildcardBalancePrefix(uid)` (Z.52 in keys.ts) ist bereits Liga-aware (prefix `['events', 'wildcardBalance', uid]`). Aber weder Track B noch Track F triggern Liga-Switch-Invalidate (kommt Wave 3 mit `useLeagueScope`-setSetter). Akzeptabel als Zwischen-State.
- **dashboardStats Semantik-Change (Track B):** Wechsel von `events` (all-time) zu `filteredGwEvents` (current-GW) ist Spec-Section 1.3 Pillar 4 explizit gewünscht — kein Spec-Drift. Pre-Review hat das korrekt geflaggt zur Bestätigung.

## Pattern-Compliance

- **AR-44 REVOKE/GRANT (Track F 3 RPCs):** PASS (alle 3 neuen RPCs haben REVOKE PUBLIC + REVOKE anon + GRANT authenticated)
- **DROP FUNCTION IF EXISTS (Track F):** PASS (3 alte Signaturen explizit gedroppt vor CREATE OR REPLACE)
- **auth.uid() Guard (Track F):** PASS (alle 3 RPCs haben `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN ...`)
- **NULL-in-Scalar-Subquery (Track F spend_wildcards):** PASS (`SELECT balance INTO v_current ... FOR UPDATE` + `IF COALESCE(v_current, 0) < p_amount`)
- **Discriminated Union Return-Shape (Slice 168):** PASS für `earn_wildcards/spend_wildcards` (`{success, error?, balance?}`); FAIL-isch für `get_wildcard_balance` (returnt INT direkt, nicht `{success, balance}`) — aber Pre-Review-Kommentar "simple read" ist akzeptabel weil discriminated-union nur bei Mutation kritisch ist
- **PATCH-AUDIT (Slice 156):** **FAIL** (Header zitiert falsche Source-of-truth, neuerer Patch AR-27 unerwähnt — Finding #2)
- **Migration-Header Verify-SQL:** PASS für 120000.sql (4 Smokes dokumentiert) + 120500.sql (4 Smokes); 121000.sql nur 1 ILIKE-Smoke — schwach, aber akzeptabel
- **RLS Pflicht-Set (user_wildcards):** PASS (4 Policies: SELECT/INSERT/UPDATE/DELETE — letztere hard-blocked mit `USING (false)`)
- **Cascade-Default-Liga Backfill:** PASS mit Edge-Case-Lücke (siehe Finding #8 — favorite_club aus inaktiver Liga)
- **Liga-Filter Backward-Compat (Track B):** PASS (per Pre-Review verifiziert: `undefined`/`null`/`''` skip filter, valid-uuid appliziert)
- **Bridge-Pattern Konsistenz Track B vs F:** PASS (Track B nutzt `activeClub?.league_id ?? null` analog Wave 1; Track F's WildcardsSection erbt via useEventActions-Bridge)
- **CHECK-Constraint Source-Werte (Track F):** PASS — pre-existing Bug in 20260417110000.sql (`'lineup_wildcard'` und `'lineup_wildcard_refund'` waren NICHT im wildcard_transactions.source CHECK constraint, der nur `'lineup_spend','event_refund','mystery_box','mission','event_reward','daily_quest','milestone','admin_grant'` zulässt). Track F's Wechsel zu `'lineup_spend'` und `'event_refund'` ist **legitim Bonus-Fix**, nicht Slice-251-introduced. Pre-existing-Bug seit 2026-04-17. Empfehlung: Bonus-Fix als eigene Zeile in worklog/log.md dokumentieren.

## Wave-3-Voraussetzungen

1. **PFLICHT — Finding #1 fix:** `admin_grant_wildcards` rewrite mit `p_league_id` Param + Composite-PK ON CONFLICT, ODER alte Funktion droppen. Sonst Production-Bruch beim ersten Admin-Grant nach Migration.
2. **PFLICHT — Finding #2 fix:** Migration-Header korrigieren mit korrekter Source-of-truth (`20260414200000`).
3. **PFLICHT — Finding #4 fix:** rpc_save_lineup `invalid_event_no_league` raise statt silent-skip (Spec EC-11).
4. **PFLICHT — Finding #6 fix:** `BEGIN;...COMMIT;` Wrapper um 120500.sql + 121000.sql für atomicity.
5. **PFLICHT — Finding #3 fix:** wildcards.ts orphan-Service-Funktionen löschen ODER auf neue 6-Param-Signatur upgraden.
6. **EMPFOHLEN — Finding #9 fix:** earned_total/spent_total Modulo-Rest in Cascade-Default-Liga (Sum-Invariant für **alle** Statistik-Felder).
7. **EMPFOHLEN — AC-23 Wave 2.5 Re-Audit:** `/rankings` + `/clubs/page.tsx` aus Spec 1.4 explizit nachprüfen.
8. **VOR Migration-Apply (Anil pflicht):** Pre-Sum-Smoke `SELECT user_id, SUM(balance), SUM(earned_total), SUM(spent_total) FROM user_wildcards GROUP BY user_id;` capturen + nach Apply gegenchecken (AC-24).
9. **VOR Wave-3-Start:** Track F-Migrations applied + 120500.sql Verify-Smoke (`pg_get_functiondef ILIKE '%auth.uid() IS NOT NULL%' AND ILIKE '%invalid_league%'`) liefert TRUE.

## Positive

- **Track B Diszipline:** Pre-Review-Memo komplett, Edge-Cases enumeriert (4 leagueId-Varianten), Tests (5 neu, alle inline angedeutet).
- **Track F Defense-in-Depth:** Auth-Guard + REVOKE-Block + RLS-Policies + League-Existence-Validation (Spam-Vektor-Mitigation AC-09) — alle parallel, nicht nur eines.
- **Backfill-Atomicity (120000.sql):** `BEGIN;...COMMIT;` korrekt + ALTER+Backfill+DROP/ADD CONSTRAINT in einer Transaktion + DELETE WHERE league_id IS NULL **NACH** INSERT (Reihenfolge-Risiko gemieden).
- **Worktree-Discipline:** beide Tracks Isolation respektiert, kein Bleed in main.
- **Bonus-Fix für pre-existing CHECK-Bug:** `'lineup_wildcard'/'lineup_wildcard_refund'` → `'lineup_spend'/'event_refund'` ist legitim und wertvoll (vorheriges save_lineup hätte bei Wildcard-Spend mit jenen Strings INSERT-failed).
- **PATCH-AUDIT-Header Pattern verwendet** (auch wenn Source falsch zitiert) — strukturell richtig, Inhalt zu fixen.
- **Spec-Discriminated-Union für Mutations:** `earn/spend_wildcards` returnen `{success, error?, balance?, ...}` — Slice 168 Pattern beachtet.

## Summary

Track B ist sauber und shippable nach Pre-Review-Verify. Track F hat 4 P0/P1 Issues die VOR Migration-Apply gefixt werden müssen — vor allem das `admin_grant_wildcards`-ON-CONFLICT-Problem (Production-Bruch beim ersten Admin-Grant) und die fehlende `BEGIN;COMMIT;` Atomicity. PATCH-AUDIT-Header-Lüge ist P0 weil zukünftige Re-Patches false-baseline-Drift verursachen würden. Nach Fixes ist Wave 3 (LeagueScope-Store + 5-Page-Migration) ready.

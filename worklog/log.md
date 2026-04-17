# Ship Log

Chronologische Liste aller abgeschlossenen Slices. Neueste oben.

Jeder Eintrag beginnt mit `H2-Header` `NNN | YYYY-MM-DD | Titel`, gefolgt von:
- Stage-Chain (SPEC → IMPACT → BUILD → PROVE → LOG)
- Files (git diff --stat summary)
- Proof (Pfad zu worklog/proofs/NNN-xxx.png|txt)
- Commit (hash)
- Notes (optional, 1-2 Saetze)

---

## 035 | 2026-04-17 | trg trade_refresh auth_uid_mismatch — Internal-Helper Fix
- Stage-Chain: SPEC → IMPACT(inline DB-audit) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417170000_refresh_airdrop_score_trigger_internal.sql` (NEW)
  - `worklog/specs/035-trg-trade-refresh-investigation.md` (NEW)
  - `worklog/proofs/035-verdict.md` (NEW)
- Proof: `worklog/proofs/035-verdict.md` — Live-Buy 14:52 → seller bot-037 airdrop_updated 14:52:56 (vorher NULL trotz mehrerer Trades).
- Commit: tba (close-commit)
- Notes: AR-44 guard in `refresh_airdrop_score` trippte im trigger-context (auth.uid()=buyer ≠ p_user_id=seller). Trigger fing exception silent → seller-Stats nie aktualisiert. Fix: Internal-Helper-RPC ohne guard (REVOKE all, GRANT service_role only). Public wrapper behaelt AR-44 guard fuer client-Calls. Pattern dokumentiert fuer common-errors.md.

## 032b | 2026-04-17 | Phase 7 Mutating-Flows Resume — 3/3 GREEN
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD(verify-only) → PROVE → LOG
- Files:
  - `worklog/specs/032b-phase7-mutating-flows-resume.md` (NEW)
  - `worklog/proofs/032b-verdict.md` (NEW — Final tabelle Phase 7)
- Proof: `worklog/proofs/032b-verdict.md` — alle 3 Mutating-Flows live verifiziert auf bescout.net.
- Commit: tba (mit close-commit)
- Notes: Flow 6 Sell (place sell @ 1000c → cancel symmetric, status='cancelled'), Flow 7 P2P-Offer (escrow 500c balance/locked symmetric, total wallet konstant), Flow 10 Event-Join (lock_event_entry → entry created, unlock → deleted). Findings: rpc_lock_event_entry direkter Call 403 (Wrapper-Permission-Doku), Modal-Display PUNKTE=0 vs Top-3 470 (UI-Inconsistency). Kein neuer Money-Bug. Phase 7 abgeschlossen, Pilot-Ready Money-Path GREEN.

## 038 | 2026-04-17 | P1 credit_tickets reference_id UUID-Drift + Sanitization
- Stage-Chain: SPEC → IMPACT(inline grep-audit) → BUILD → PROVE → LOG
- Files:
  - `src/lib/services/social.ts` (achievement-key in description statt reference_id)
  - `src/lib/services/tickets.ts` (sanitizeReferenceId helper + JSDoc-hardening)
  - `src/lib/services/__tests__/tickets.test.ts` (drift-lock test)
  - `worklog/specs/038-credit-tickets-uuid-fix.md` (NEW)
  - `worklog/proofs/038-{audit,tsc-vitest,live-verify,marktplatz-pre-buy.png}.{txt,png}` (NEW)
- Proof: `worklog/proofs/038-live-verify.txt` — Live-Buy auf bescout.net post-deploy: 0× credit_tickets 22P02, Wallet exact decrement, second clean trade_buy.
- Commit: 93eed6ba
- Notes: Achievement-Hook in social.ts:522 passte Achievement-Key (string) als p_reference_id (UUID-Spalte) → 22P02 silent crash → Achievement-Tickets seit unbekannt nie gutgeschrieben. Discovered via Slice 034 Live-Buy (14× console-errors). Fix lokal, dann Service-Layer gehaerted: sanitizeReferenceId regex-check verhindert Regression auf social.ts oder neue Caller (gilt fuer creditTickets + spendTickets). CI rerun nach flaky ClubProvider-test. Bonus-Finding: 7× 409 user_achievements UNIQUE-Violations bei wiederholtem Buy → separater Slice 039 (Achievement-Hook upsert-handling).

## 034 | 2026-04-17 | P0 buy_player_sc transactions.type Drift + INV-30 Guard
- Stage-Chain: SPEC → IMPACT(inline DB-Audit) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417160000_buy_player_sc_transactions_type_fix.sql` (NEW)
  - `supabase/migrations/20260417160100_get_rpc_transaction_inserts.sql` (NEW Audit-Helper)
  - `src/lib/__tests__/db-invariants.test.ts` (+INV-30 Test)
  - `worklog/specs/034-buy-player-sc-transactions-type-fix.md` (NEW)
  - `worklog/proofs/034-{rpc-body-after,inv30,tsc-vitest,live-buy.png,live-buy}.{txt,png}` (NEW)
- Proof: `worklog/proofs/034-live-buy.txt` — Live-Buy 1 SC Bozkurt: Wallet 799350→798290 (-1060), Holdings 9→10, transactions zeigt `type=trade_buy`, end-to-end auf bescout.net.
- Commit: 0ed500a9
- Notes: buy_player_sc schrieb `'buy'`/`'sell'` statt `'trade_buy'`/`'trade_sell'` → CHECK violation → silent HTTP 400. RPC-Body via apply_migration sofort gefixt + AR-44 REVOKE/GRANT. INV-30 scant alle RPC-Bodies, gleicht type-Strings gegen CHECK ab, meldet Drifts. 9 Slice-037-Followups dokumentiert in Allowlist (poll_earning, vote_fee, ad_revenue_payout, etc). Folge-Findings: (a) credit_tickets 400 fuer Achievement-Tickets (Achievement-Keys statt UUID als reference_id) — Slice 038, (b) Wallet-Header stale nach Buy (UI-Refresh-Bug) — Folge.

## 033 | 2026-04-17 | P0 BuyConfirmModal Money-Display-Drift (Faktor-100-Bug)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/features/market/components/MarketContent.tsx` (Inline-Logik → Helper)
  - `src/features/market/components/marketContent.priceCents.ts` (NEW Helper)
  - `src/features/market/components/__tests__/marketContent.priceCents.test.ts` (NEW, 8 Lock-Tests)
  - `src/types/index.ts` (JSDoc-Annotation auf Listing.price)
  - `worklog/specs/033-money-unit-drift-audit.md` (NEW)
  - `worklog/proofs/033-{bug-trace,grep-audit,tsc-vitest,buymodal-fixed.png,mutations}.{txt,png}` (NEW)
- Proof: worklog/proofs/033-buymodal-fixed.png (Live: Burak Çoban 484,31 CR matched Liste + DB-cents/100)
- Commit: 79f244d3
- Notes: Listing.price ist BSD/CR (via centsToBsd in enriched.ts), wurde aber als priceCents an BuyConfirmModal weitergegeben → Modal teilte erneut durch 100 → Anzeige 100x zu klein. RPC haette korrekte cents abgezogen → User-Vertrauensbruch latent. Maskiert nur durch separate RPC-Crashes (Slice 034/035 pending). Audit zeigte: nur 1 Drift-Site existierte, alle anderen Money-UI korrekt.

## 032 | 2026-04-17 | Phase 7 Part 2 — Read-only Flows GREEN, Mutating PAUSED
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD(verify-only) → PROVE(partial) → LOG(partial)
- Files: `worklog/specs/032-phase7-verify-remaining-flows.md` (NEW), 5 Screenshots in worklog/proofs/032-flow-*.png
- Proof: 4/4 Read-only GREEN (Wallet 03, Events 09, Result-Modal 12, Notifications 13). Mutating Flows (5/6/7/10) PAUSED durch P0-Findings.
- Commit: 79f244d3 (gebuendelt mit 033)
- Notes: Flow 5 (Buy from Market) deckte 4 Bugs auf — 1 Display-Drift (gefixt in 033), 3 RPC-/Trigger-Bugs (Slices 034/035/036 pending). Flow 12 zeigte zusaetzlich UI-Inconsistency: Modal "PUNKTE=0" trotz Top-3 Score 470. Flow 13 zeigte Wording "Trader: Aufstieg" + "BSD Tipp" (Compliance-Findings, separat). Slice wird nach 034/035 fortgesetzt.

## 031 | 2026-04-17 | Session 4 Wrapup (Briefing + MEMORY Refresh)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD(edit) → PROVE → LOG
- Files:
  - `memory/next-session-briefing-2026-04-18.md` (+45/-14 — Slice 030 row + Verify-Details + Verbleibende 8 Flows)
  - `C:/Users/Anil/.claude/projects/C--bescout-app/memory/MEMORY.md` (user-level, Project-Section aktualisiert)
  - `worklog/specs/031-session-4-wrapup.md` (NEW)
  - `worklog/proofs/031-diff.txt` (NEW)
- Proofs:
  - `worklog/proofs/031-diff.txt`
- Commit: 16dc17bf
- Notes: Session 4 Abschluss-Update. Briefing refreshed nach Slice 030 (Phase 7 Verify GREEN — 7 DB-Checks + 7 UI-Flows, 0 Bugs, 0 Regressions). Slice-Tabelle im Briefing erweitert, Verify-Ergebnis-Section neu, Offene-Punkte-Liste restrukturiert: Phase 7 hat jetzt "verified" + "verbleibend"-Split (Flow 1/2/4/8/11/14/15 verified, Flow 3/5/6/7/9/10/12/13 offen fuer naechste Session). MEMORY.md Project-Section aktualisiert: 21 → 30 Slices, Block B 3/5 → 5/5 gruen, CEO-FUs + Phase 7 durch. Fantasy-Integritaet als eigener Bullet-Point. Keine Code/Test-Impact — pure Doc.

---

## 030 | 2026-04-17 | Phase 7 Verify: Touched Flows + DB Invariants (GREEN)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD(E2E test run) → PROVE → LOG
- Files:
  - `worklog/specs/030-phase7-verify-touched-flows.md` (NEW)
  - `worklog/proofs/030-db-checks.txt` (NEW — 7/7 DB-Checks GREEN)
  - `worklog/proofs/030-ui-e2e.txt` (NEW — 7 Flows verifiziert via Playwright)
  - `worklog/proofs/030-verdict.md` (NEW — Final GREEN)
- Proofs:
  - `worklog/proofs/030-verdict.md` (Verdict GREEN)
- Commit: fd00cf1e
- Notes: Full-Verification Deploy bescout.net nach Session 3+4. Part A DB: cron score-pending-events 13/13 succeeded runs, 0 holdings zombies (Trigger 025), rpc_save_lineup Body-Scan alle 9 B4-Reject-Keys live, cron_score_pending_events active/scheduled/LIMIT50, holdings_auto_delete_zero trigger registered, handles k_demirtas/kemal frei, 16 transaction-types alle in activityHelpers gemappt. Part B UI via Playwright MCP + jarvis-qa@bescout.net: Login, Home (19 SCs, 6.949 CR), /transactions (44 Eintraege keine Raw-Leaks, Filter-Bar, CSV), /manager?tab=kader (keine qty=0), /player/[id] (0 errors), RPC direct-call via fetch (auth-chain OK, event_not_found first-check response), Logout (auth-cookie + bs_user + bs_profile wiped → /login). Keine Bugs gefunden. Softwarestand bescout.net GREEN. Restliche 8 Flows (nicht von Session 3+4 touchiert) fuer naechste Session.

---

## 029 | 2026-04-17 | Doc-Refresh Session 4 (common-errors + Briefing)
- Stage-Chain: SPEC → IMPACT(skipped — reine Doku) → BUILD(edit) → PROVE → LOG
- Files:
  - `.claude/rules/common-errors.md` (+88 Zeilen — 5 neue Pattern-Sektionen)
  - `memory/next-session-briefing-2026-04-18.md` (komplett-Rewrite — aktueller Stand Ende Session 4)
  - `worklog/specs/029-doc-refresh-session-4.md` (NEW)
  - `worklog/proofs/029-diff.txt` (NEW — diff stat)
- Proofs:
  - `worklog/proofs/029-diff.txt` (2 Files, 185/-123 Zeilen)
- Commit: 0995ef08
- Notes: Knowledge-Flywheel-Pflege nach 6 Slices (023-028). 5 neue Patterns in common-errors.md: (1) Server-Validation Pflicht fuer Money/Fantasy-RPCs (Slice 023), (2) pg_cron Wrapper-RPC Fail-Isolation per-Item BEGIN/EXCEPTION (Slice 024), (3) Holdings Zombie-Row Auto-Delete-Trigger als Alternative zu N RPC-Patches (Slice 025), (4) Transaction-Type → activityHelpers-Sync nach jedem neuen `INSERT INTO transactions` (Slice 027), (5) auth.users DELETE NO-ACTION-FK-Pre-Cleanup-Audit-Pattern via pg_constraint (Slice 028). Briefing-File komplett geupdated: B4/B5 gruen, alle CEO-FUs durch, Post-Deploy-Verify-Checklist (7 Punkte), Observations (Briefing-Self-Correction 2x in Session 4). Keine tsc/Test-Impact (pure doc). XS Slice analog 022/026.

---

## 028 | 2026-04-17 | Dev-Accounts Cleanup (k_demirtas + kemal)
- Stage-Chain: SPEC → IMPACT(inline — FK-Audit + Row-Counts 44+ Tables) → BUILD(DELETE) → PROVE → LOG
- Files:
  - `worklog/specs/028-dev-accounts-cleanup.md` (NEW)
- Proofs:
  - `worklog/proofs/028-fk-audit.txt` (FK-Map auf auth.users — CASCADE vs NO ACTION)
  - `worklog/proofs/028-before-counts.txt` (Row-Counts 44+ NO-ACTION-Tables gepruft, nur user_tickets mit 2 rows)
  - `worklog/proofs/028-delete-sql.txt` (ausgefuehrte DELETE-Statements)
  - `worklog/proofs/028-after-state.txt` (Post-Verify: alle counts=0, handles_free=true)
- Commit: e45a26b2
- Notes: CEO approved "einfach löschen, bei bedarf lege ich die neu an" 2026-04-17. Uids `eebba1ae-8f30-4ef0-9dcd-84a5f49fbf3c` (k_demirtas/Djembo) + `1c02ad43-074d-4a4d-b611-a3fba9c7f931` (kemal). 2-Step-Cleanup: (1) `DELETE FROM user_tickets WHERE user_id IN (...)` (2 rows, NO-ACTION-FK Blocker), (2) `DELETE FROM auth.users WHERE id IN (...)` cascades zu profiles + wallets + 30+ auto-clean Tables. Von 44+ gepruften user-FK-Tabellen hatte nur user_tickets Rows (welcome-ticket-grants). Kein Trading/Content/Follow etc. Reine Legacy-Wallet+Auth-Rows. Kein Migration-File committed — einmaliger Cleanup, Rollback nicht moeglich (auth.users mit hashed password nicht restorable ohne Backup). handles `k_demirtas` + `kemal` wieder frei fuer Neu-Registrierung via Supabase Auth.

---

## 027 | 2026-04-17 | activityHelpers TR-i18n (4 fehlende transaction-types)
- Stage-Chain: SPEC → IMPACT(inline — live-DB Audit ergab 4 fehlende types statt 10 im briefing) → BUILD → PROVE → LOG
- Files:
  - `src/lib/activityHelpers.ts` (+12 Zeilen, je 4 Branches in getActivityIcon/Color/LabelKey)
  - `messages/de.json` (+4 Keys im `activity` namespace: subscription, adminAdjustment, tipSend, offerExecute)
  - `messages/tr.json` (+4 Keys analog, CEO-approved TR-Labels)
  - `worklog/specs/027-activityhelpers-tr-i18n.md` (NEW)
- Proofs:
  - `worklog/proofs/027-diff.txt` (3 Files, 22 +/- 2)
  - `worklog/proofs/027-tsc.txt` (clean)
  - `worklog/proofs/027-tests.txt` (activityHelpers 17/17)
- Commit: 010b0811
- Notes: Briefing-Korrektur: Live-DB-Audit (SELECT DISTINCT type FROM transactions) ergab **4** unlokalisierte types (subscription/admin_adjustment/tip_send/offer_execute), nicht 10 wie Briefing behauptete. Die uebrigen 28 activityHelpers-Keys hatten bereits DE+TR-Labels. TR-Labels explizit CEO-approved 2026-04-17 per `feedback_tr_i18n_validation.md`. Icons/Colors: subscription→Users/gold (Club-Abo), admin_adjustment→Settings/purple (System), tip_send→Coins/rose (Outflow), offer_execute→CircleDollarSign/gold (Trading). Kein DB-Change. Existing rows behalten raw type, aber UI rendert via `t(getActivityLabelKey(row.type))` nun translated Label. Kein Data-Migration noetig.

---

## 026 | 2026-04-17 | footballData Client-Access Audit (Doc-only, XS)
- Stage-Chain: SPEC → IMPACT(skipped — reine Verifikation) → BUILD(audit) → PROVE → LOG
- Files:
  - `worklog/specs/026-footballdata-client-access-audit.md` (NEW — XS Spec)
  - `worklog/proofs/026-grep-client-access.txt` (NEW — alle .from() Call-Sites)
  - `worklog/proofs/026-rls-policies.txt` (NEW — RLS-Enforcement-Pruefung)
  - `worklog/proofs/026-fill-source.txt` (NEW — 334 formation-Rows Quelle)
  - `worklog/proofs/026-verdict.txt` (NEW — Final GREEN)
- Proofs:
  - `worklog/proofs/026-verdict.txt` (Final Verdict GREEN)
- Commit: aa67e2a0
- Notes: CTO-autonomer Audit-Slice. Briefing Session-3 Punkt 4 ("footballData.ts Client-Access auf server-only Tabellen") geschlossen. Verdict **GREEN**: (a) Alle Client-Reads auf Tabellen mit public SELECT-Policy — legitim. (b) Alle Writes via Admin-RPCs (`admin_map_*`, `admin_import_gameweek_stats`). (c) Silent-Dead-Code in `footballData.ts:549-553` (`supabase.from('fixtures').update(...)` — RLS blockt silent, fixtures hat keine UPDATE-Policy) ohne User-Impact, weil Cron-Route `src/app/api/cron/gameweek-sync/route.ts:826-831` die 334 formation-Rows via `supabaseAdmin` (service_role, RLS bypass) parallel fuellt. (d) Kein AUTH-08-Klasse-Drift: die betroffenen Tabellen (fixtures, fixture_player_stats, player_gameweek_scores) sind public-by-design, nicht in INV-26 SENSITIVE_TABLES. Cleanup (Dead-Code entfernen) out-of-scope — cosmetic, kein Security-Wert. Analog Slice 022 (B-03 UI-Mixing Verification) als Doc-only XS.

---

## 025 | 2026-04-17 | Holdings Auto-Delete-Zero (Trigger Approach)
- Stage-Chain: SPEC → IMPACT(inline in Chat — Pre-Research) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417150000_holdings_auto_delete_zero.sql` (NEW — Trigger-Fn `delete_zero_qty_holding()` + Trigger `holdings_auto_delete_zero` AFTER UPDATE OF quantity FOR EACH ROW WHEN NEW.quantity=0)
  - `src/lib/__tests__/db-invariants.test.ts` (+INV-29: body-scan `delete_zero_qty_holding` DELETE-branch + live zero-count)
  - `worklog/specs/025-holdings-auto-delete-zero.md` (NEW)
- Proofs:
  - `worklog/proofs/025-trigger-listing.txt` (2 non-internal triggers auf holdings, beide enabled)
  - `worklog/proofs/025-trigger-body.txt` (Function + Trigger Definition + Semantik)
  - `worklog/proofs/025-smoke-test.txt` (Live-Test PASS — INSERT qty=5 → UPDATE qty=0 → Row DELETED)
  - `worklog/proofs/025-zombie-count.txt` (0 zombies before + after, 513 total holdings)
  - `worklog/proofs/025-tsc.txt` (clean)
  - `worklog/proofs/025-tests.txt` (db-invariants 27/27 inkl. INV-29)
- Commit: 95c498ae
- Notes: CEO approved (b) Trigger-Approach 2026-04-17. Pre-Research ergab **briefing-Korrektur**: nur 3 decrement-RPCs betroffen (accept_offer, buy_from_order, buy_player_sc) — `buy_from_ipo` macht NUR Increment, war faelschlich in briefing. Zero Zombies live (513 holdings, alle qty>=1) → Slice ist reines Future-Proofing. Trigger-Approach statt 3x RPC-Patch: zero-touch auf kritische Money-RPCs, future-proof (neue Decrement-RPCs "just work"). CHECK (quantity >= 0) bleibt unveraendert — Trigger bridged UPDATE→DELETE atomisch. Smoke-Test gegen Live-DB bestaetigt Mechanismus (UUID `c8775934-c9ac-4048-b0c5-474021f2cdba` INSERT → UPDATE qty=0 → count=0 after). Trigger-Granularitaet: `AFTER UPDATE OF quantity` + `WHEN (NEW.quantity=0)` — feuert nur bei echten qty=0-Updates, keine Nebenwirkung auf andere UPDATEs (updated_at etc.). Rollback: `DROP TRIGGER + DROP FUNCTION` — seiteneffektfrei.

---

## 024 | 2026-04-17 | B5 Event Scoring Automation (pg_cron, Option c)
- Stage-Chain: SPEC → IMPACT → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417130000_cron_score_pending_events.sql` (NEW — wrapper-RPC `cron_score_pending_events()` mit idempotenter Event-Scoring-Loop + AR-44 Block)
  - `supabase/migrations/20260417140000_cron_schedule_score_pending.sql` (NEW — cron.schedule `*/5 * * * *` + Audit-Helper `get_cron_job_schedule(text)` + AR-44 Block)
  - `src/lib/__tests__/db-invariants.test.ts` (+ INV-28: body-fragments + cron-job schedule/active via get_rpc_source + get_cron_job_schedule)
  - `worklog/specs/024-b5-event-scoring-automation.md` (NEW)
  - `worklog/impact/024-b5-event-scoring-automation.md` (NEW)
- Proofs:
  - `worklog/proofs/024-cron-before.txt` (4 jobs aktiv vor apply)
  - `worklog/proofs/024-cron-after.txt` (5 jobs aktiv inkl. score-pending-events */5 * * * *)
  - `worklog/proofs/024-rpc-body.txt` (cron_score_pending_events Body)
  - `worklog/proofs/024-dry-run.txt` (`{success:true, scored:0, skipped:0, errored:0}` — RPC-Compile + Query-Pfad + JSONB-Return OK, keine faelligen events)
  - `worklog/proofs/024-tsc.txt` (clean)
  - `worklog/proofs/024-tests.txt` (db-invariants 26/26 inkl. INV-28)
- Commit: 948f09f2
- Notes: CEO approved (c) pg_cron 2026-04-17. Wrapper findet events mit `status='ended' OR (status='running' AND ends_at <= NOW())` AND `scored_at IS NULL` AND `gameweek IS NOT NULL` — ORDER BY ends_at ASC LIMIT 50. Per-event BEGIN/EXCEPTION-Block fuer Fail-Isolation (ein Crash blockt nicht Batch). `score_event` bereits idempotent via `scored_at IS NOT NULL` Guard + `no_player_game_stats` Early-Exit, keine Body-Aenderung. Neuer Audit-Helper `get_cron_job_schedule(text)` analog zu Slice 023's `get_rpc_source` — service_role-only (AR-44 REVOKE/GRANT korrekt), exclusiv fuer INV-28 genutzt. Bestehender `event-status-sync` cron (15min) bleibt unveraendert — transitioniert weiter `running → ended`, unser neuer cron scort dann `ended + scored_at=NULL`. Worst-case Delay: gameweek-sync 30min + score-cron 5min = ~35min zwischen Event-Ende und User-Reward. Rollback: `SELECT cron.unschedule('score-pending-events')` — Wrapper-RPC darf bleiben (seiteneffektfrei).

---

## 023 | 2026-04-17 | B4 Lineup Server-Validation (Strict-Reject)
- Stage-Chain: SPEC → IMPACT → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417110000_save_lineup_formation_validation.sql` (NEW — erweitert rpc_save_lineup um 9 neue Error-Keys + Formation-Allowlist + AR-44 Block)
  - `supabase/migrations/20260417120000_audit_helper_rpc_source.sql` (NEW — get_rpc_source helper fuer CI-Body-Scan, service_role only, AR-44 Block)
  - `src/lib/services/__tests__/lineups.test.ts` (+9 it(...) Cases: invalid_formation, gk_required, invalid_slot_count_{def|mid|att}, extra_slot_for_formation, captain_slot_empty, wildcard_slot_invalid, wildcard_slot_empty)
  - `src/lib/__tests__/db-invariants.test.ts` (+INV-27: rpc_save_lineup body-scan via get_rpc_source — verifiziert alle 9 neuen Error-Keys + 2 Allowlist-Samples + preservation der bestehenden checks)
  - `worklog/specs/023-b4-lineup-server-validation.md` (NEW)
  - `worklog/impact/023-b4-lineup-server-validation.md` (NEW)
- Proofs:
  - `worklog/proofs/023-rpc-before.txt` (alter Body, keine Formation-Validation)
  - `worklog/proofs/023-rpc-after.txt` (neuer Body-Presence-Scan 11/11 TRUE + Grant-Matrix kein anon/PUBLIC)
  - `worklog/proofs/023-tsc.txt` (clean)
  - `worklog/proofs/023-tests-lineups.txt` (lineups.test.ts 29/29 = 20 original + 9 B4)
  - `worklog/proofs/023-tests-invariants.txt` (db-invariants.test.ts 25/25 inkl. INV-27)
- Commit: a7fd95d4
- Notes: CEO approved (a) Strict-Reject am 2026-04-17. Neue Stage-Order im RPC: Pos 6.5a..j nach v_all_slots-Build und vor duplicate_player-Check. Billige Early-Exit-Checks (Formation/GK/Slot-Count/Captain/Wildcard-Empty) vor teuren DB-Joins (insufficient_sc SELECT + salary_cap SELECT). Formation-Allowlist: 3 11er (`1-4-3-3`, `1-4-4-2`, `1-3-4-3`) + 5 7er (`1-2-2-2`, `1-3-2-1`, `1-2-3-1`, `1-3-1-2`, `1-1-3-2`) = 8 IDs aus `src/features/fantasy/constants.ts`. Kein Client-Code-Change (Consumer senden bereits valide IDs). Neue Helper-RPC `get_rpc_source` ist service_role-only (AR-44 REVOKE/GRANT korrekt), wird ausschliesslich von INV-27 genutzt. Rollback via `_rpc_body_snapshots`.

---

## 022 | 2026-04-18 | B-03 UI-Mixing Verification (Doc-only, XS)
- Stage-Chain: SPEC → IMPACT(skipped — reine Verifikation) → BUILD(audit) → PROVE → LOG
- Files:
  - `worklog/specs/022-b03-ui-mixing-verification.md` (NEW — XS Spec)
  - `worklog/proofs/022-player-kpis-extract.txt` (NEW)
  - `worklog/proofs/022-tradingcardframe-props.txt` (NEW)
  - `worklog/proofs/022-floor-rule.txt` (NEW)
  - `worklog/proofs/022-audit-result.txt` (NEW — Final Verdict)
  - `worklog/proofs/022-tsc.txt` (NEW — tsc clean, 0 Zeilen)
  - `memory/next-session-briefing-2026-04-18.md` (Residuen-Punkt 5 → GREEN + Proof-Links)
- Proofs:
  - `worklog/proofs/022-audit-result.txt` (Verdict GREEN + Begruendung)
  - `worklog/proofs/022-tsc.txt` (clean)
- Commit: 5ce2de5c
- Notes: CTO-autonomer Audit-Slice. Verdict **B-03 = GREEN**: (a) TradingCardFrame konsumiert `priceChange24h` als Prop aus `CardBackData` (Line 19/380), PlayerHero.tsx:81 liefert `player.prices.change24h` direkt durch — kein lokaler Preis-Delta-Compute. (b) PlayerKPIs bezieht L5 als Prop (`player.perf.l5`), Floor folgt system-weitem Architektur-Pattern aus `.claude/rules/trading.md` ("Floor Price Client-seitig berechnen: `Math.min(...sellOrders.map(o => o.price))`") mit 6 konsistenten Call-Sites (useMarketData, WatchlistView, MarketContent, KaderTab, PlayerRow, PlayerKPIs). (c) PnL/PnLPct sind reine UI-Arithmetik auf zwei Props (Floor + avgBuyPrice + quantity) — kein DB-Equivalent existiert per-User, kein Drift-Vektor. Keine Code-Aenderung erforderlich. Walkthrough-Archive (`memory/_archive/2026-04-meta-plans/walkthrough/05-blocker-b.md`) bleibt unveraendert (Archiv). B-03-Residuum in `next-session-briefing-2026-04-18.md` Punkt 5 als GREEN markiert.

---

## 021 | 2026-04-17 | Orders RLS Tighten (CEO Option 2, Seal)
- Stage-Chain: SPEC → IMPACT(inline — Slice 020 war Prep, orders Services bereits RPC-basiert) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417070100_orders_rls_tighten.sql` (NEW — DROP orders_select (qual=true), CREATE orders_select_own_or_admin via auth.uid() OR club_admin OR platform_admin)
  - `src/lib/__tests__/db-invariants.test.ts` (INV-26 EXPECTED_PERMISSIVE entfernt `orders.orders_select`)
  - `src/lib/__tests__/auth/rls-checks.test.ts` (NEW AUTH-16 Test: user cannot read other user's orders)
- Proofs:
  - `worklog/proofs/021-rls-before.txt` (vorher: qual=true)
  - `worklog/proofs/021-rls-after.txt` (nachher: auth.uid() = user_id OR admin-check)
  - `worklog/proofs/021-tsc.txt` (clean)
  - `worklog/proofs/021-tests.txt` (db-invariants 24/24 + auth/rls-checks 16/16, inkl. AUTH-16 new = 40 total)
- Commit: 71953052
- Notes: AUTH-08-Klasse vollstaendig geschlossen. Orderbook-UX weiterhin verfuegbar via `get_public_orderbook` RPC (Slice 020). Regulaere User sehen nur eigene Orders direct (Cancel-Button, social.ts:308 self-count). Club-Admin + Platform-Admin behalten Fan-Analytics-Zugriff via policy-branches — analog holdings_select_own_or_admin (Slice 014). INV-26 jetzt scharf ohne whitelist fuer orders. Kein Realtime-Publication fuer orders (pruefung via migrations-grep). Kein INSERT/UPDATE/DELETE Policy noetig — alle Mutationen via SECURITY DEFINER RPCs (place_sell_order, place_buy_order, buy_from_order, cancel_order).

---

## 020 | 2026-04-17 | Orders Anonymize via Handle-Projection (CEO Option 2, Prep)
- Stage-Chain: SPEC → IMPACT(inline — 8 UI-Consumers + 3 Services + 9 Prop-Types gemappt) → BUILD → PROVE → LOG
- Files (24 total):
  - DB: `supabase/migrations/20260417070000_get_public_orderbook_rpc.sql` (NEW — SECURITY DEFINER, AR-44 REVOKE/GRANT, handle via LEFT JOIN profiles, is_own via COALESCE)
  - Types: `src/types/index.ts` (new `PublicOrder` type; `Listing` — replaced `sellerId` with `isOwn: boolean` + `sellerHandle: string | null`)
  - Services: `src/lib/services/trading.ts` (3 reads via rpc('get_public_orderbook'): getSellOrders, getAllOpenSellOrders, getAllOpenBuyOrders)
  - Queries: `src/lib/queries/orders.ts`, `src/lib/queries/enriched.ts` (PublicOrder[] throughout, sellerId removed)
  - Market UI: BestandView, BuyOrdersSection, MarktplatzTab, PortfolioTab, TransferListSection, MarketSearch (DbOrder[] → PublicOrder[], o.user_id → o.is_own / o.handle)
  - Player Detail UI: BuyModal, TradingTab, OrderbookDepth, OrderbookSummary, SellModal, usePlayerTrading, usePlayerDetailData, HoldingsSection, BuyConfirmation
  - Manager: KaderTab.tsx (l.sellerId === userId → l.isOwn)
  - Tests: TradingTab.test.tsx, usePlayerDetailData.test.ts, useMarketData.test.ts (mock shapes updated)
- Proofs:
  - `worklog/proofs/020-diff-stat.txt` (25 files, 136/136 +/-)
  - `worklog/proofs/020-tsc-step3.txt` (clean, 0 Bytes)
  - `worklog/proofs/020-tests.txt` (24/24 test files, 306/306 tests gruen — market + player/detail + services + queries)
  - `worklog/proofs/020-rpc-sanity.txt` (RPC Call mit 3-Row-Output verified, Grant-Matrix bestaetigt)
- Commit: 59051b08
- **Split-Entscheidung (operational CTO):** Slice 020 = Prep (RPC + Service-Switch + UI-Migration). RLS bleibt qual=true in diesem Slice — verhindert Deploy-Race (RLS-Tighten ohne Code-Deploy = Markt tot 10-30min). Slice 021 tightens RLS + entfernt INV-26 whitelist + fuegt AUTH-16 Test hinzu — nach Verify-Deploy dieses Slices.
- Notes: CEO Option 2 approved (2026-04-17 chat, Slice 019 Finding). Neue `get_public_orderbook(p_player_id, p_side)` RPC projiziert Orders mit `handle` (via LEFT JOIN profiles) und `is_own` (COALESCE(o.user_id = auth.uid(), false)). `user_id` NICHT mehr im Cross-User-Response. Services nutzen RPC, direct `.from('orders').select(user_id,...)` fuer cross-user Reads entfernt. UI-Consumers: `order.user_id === uid` → `order.is_own`, `profileMap[order.user_id]?.handle` → `order.handle`, `@{order.user_id.slice(0,8)}` Fallback → `@{order.handle ?? t('anonSeller')}`. `Listing.sellerId` → `Listing.isOwn + sellerHandle` (KaderTab + enriched.ts). Interne RPC-Lookups in trading.ts (`.from('orders').select('user_id,player_id')` fuer Seller-Notification) bleiben unveraendert — authenticated user liest eigene Order (RLS qual=true heute + tightened RLS future = both OK fuer self-reads). PlayerDetail profileMap nur noch fuer trades buyer/seller-lookup (orders haben handle). Trades-Cache-Helper `queryClient.setQueryData(qk.orders.byPlayer,...)` auf PublicOrder[].

---

## 019 | 2026-04-17 | INV-26 qual=true Regression-Guard (AUTH-08 Klasse)
- Stage-Chain: SPEC → IMPACT(inline — Pattern aus Slice 004/005 wiederverwendet) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417060000_audit_helper_rls_qual.sql` (NEW — `get_rls_policy_quals(p_tables text[])` SECURITY INVOKER Audit-RPC, AR-44 REVOKE/GRANT)
  - `src/lib/__tests__/db-invariants.test.ts` (+ INV-26: scant 8 sensible Tabellen auf qual='true' / qual=NULL SELECT-Policies, EXPECTED_PERMISSIVE-Whitelist fuer intentionale public-policies)
- Proofs:
  - `worklog/proofs/019-diff.txt` (1 Migration + 1 Test-Block, 73 Zeilen)
  - `worklog/proofs/019-tsc.txt` (clean)
  - `worklog/proofs/019-tests.txt` (db-invariants 24/24 gruen inkl. INV-26)
  - `worklog/proofs/019-rpc-sanity.txt` (RPC-Output: 14 Policies, 2 qual=true whitelisted, 0 violations)
- Commit: 61d2438c
- **CEO-Aufmerksamkeit erforderlich:** INV-26 hat `orders.orders_select` mit `qual='true'` gefunden — gleiche AUTH-08-Klasse wie Slice 014 Holdings. Orderbook ist typisch public-by-design (Market-Maker), aber `user_id`-Exposure ist die Frage: (a) keep-public, in INV-26 EXPECTED_PERMISSIVE belassen. (b) Anonymize via handle-projection, neuer Slice mit RLS-Tighten + Service-Projection. Aktuell als TODO im Test whitelisted mit CEO-Decision-Kommentar — Test gruen, aber Fund dokumentiert.
- Notes: Pattern etabliert (Slice 004 `get_rls_policy_coverage`, Slice 007 `get_rpc_jsonb_keys`, Slice 005 `get_auth_guard_audit`). INSERT-policies mit qual=NULL bewusst ignoriert (USING applies zu row-being-inserted, WITH CHECK restricts payload). `user_stats.Anyone can read stats` explicit in Whitelist (Leaderboard-Public-Design). Test scannt: holdings, transactions, ticket_transactions, activity_log, user_stats, wallets, orders, offers.

---

## 018 | 2026-04-17 | Public-Profile Holdings Fetch-Gate (Slice 014 follow-up)
- Stage-Chain: SPEC → IMPACT(inline, XS-Change) → BUILD → PROVE → LOG
- Files:
  - `src/components/profile/hooks/useProfileData.ts` (Line 91 gated: `isSelf ? getHoldings(targetUserId) : Promise.resolve([])`)
- Proofs:
  - `worklog/proofs/018-diff.txt` (1 Zeile)
  - `worklog/proofs/018-tsc.txt` (clean)
  - `worklog/proofs/018-tests.txt` (profile/**: 54/55 gruen, 1 skipped nicht-bezogen)
- Commit: 0b087e32
- Notes: CTO-autonomous Follow-Up zu Slice 014. Nach RLS-Tighten liefert `getHoldings(otherUserId)` auf Non-Admin-Public-Profile-Views immer `[]` — reine Network-Call-Verschwendung. Gate analog `getMyPayouts`-Pattern in derselben `Promise.allSettled`. Portfolio-Tab ist UI-seitig self-only laut profile.md — kein Verhaltensaenderung. Admin-Oversight ueber Admin-Panel, nicht Profile-Page (das war auch vor-014 der Fall, Regression neutral). Network-Savings: 1 Call pro Public-Profile-Visit.

---

## 017 | 2026-04-17 | Player Detail Query-Defer (B3, Flow-Audit Flow 8)
- Stage-Chain: SPEC → IMPACT(inline — 1 Hook-File, keine Service/DB-Change) → BUILD → PROVE → LOG
- Files:
  - `src/components/player/detail/hooks/usePlayerDetailData.ts` (belowFoldReady state + 300ms timeout, 8 Query-Aufrufe auf deferred-gate umgestellt via undefined-propagation / active-param)
- Proofs:
  - `worklog/proofs/017-diff.txt` (61 Zeilen diff, 1 File)
  - `worklog/proofs/017-tsc.txt` (leer = clean)
  - `worklog/proofs/017-tests.txt` (usePlayerDetailData.test.ts: 8/8 passed)
  - `worklog/proofs/017-query-count.md` (Before/After Tabelle: 15 initial → 7 initial auf Trading-Tab, −53%)
- Commit: 13cdf352
- Notes: B3 von Block B. Bug-Klasse: 15-19 parallele Queries auf `/player/[id]` uebersteigen Browser-Concurrency-Limit (6), 9+ Queries warten in zweiter Welle = 200-500ms Latenz-Penalty auf 4G. Fix: `belowFoldReady` Pattern (bekannt aus `useHomeData` 800ms, `useCommunityData` 500ms) mit 300ms delay — Hero + Trading-Actions sofort, Info-Layer (Counter, Badges, Mastery, Timeline, Trades, Research, LiquidationEvent) deferred. Critical-Path: Player, HoldingQty, Watchlist, SellOrders, ActiveIPO, OpenBids, PBT = 7 Queries initial. Nach 300ms: 8 deferred Queries in zweiter Welle (wieder ueber 6-Limit, aber zu diesem Zeitpunkt ist Hero bereits gerendert — UX-Win ist vor allem Time-to-First-Render). Tab-gated Queries (Performance/Community) unveraendert. Null-Safety bereits etabliert (alle Consumer nutzen `?? []`, `?? null`). Post-Deploy Playwright-Messung gegen bescout.net = Phase 7 (separate).

---

## 016 | 2026-04-17 | Transactions Pagination (B2, Flow-Audit Flow 14)
- Stage-Chain: SPEC → IMPACT(inline — Consumers gecheckt, neue Infinite-Hooks parallel zu alten) → BUILD → PROVE → LOG
- Files:
  - `src/lib/services/tickets.ts` (getTicketTransactions offset-Default-Param, `.range()` statt `.limit()`)
  - `src/lib/queries/keys.ts` (neue Query-Keys: `transactions.infinite`, `tickets.transactionsInfinite`)
  - `src/lib/queries/misc.ts` (neue Hook `useInfiniteTransactions`)
  - `src/lib/queries/tickets.ts` (neue Hook `useInfiniteTicketTransactions`)
  - `src/lib/queries/index.ts` (Barrel-Export `useInfiniteTransactions`)
  - `src/components/transactions/TransactionsPageContent.tsx` (Umstellung auf Infinite-Hooks, Load-More-Button mit Loader2-Spinner, tc('loadMore') common-i18n-Key)
- Proofs:
  - `worklog/proofs/016-diff.txt` + `016-diff-stat.txt` (6 Files, 75 insertions / 13 deletions)
  - `worklog/proofs/016-tsc.txt` (leer = clean)
  - `worklog/proofs/016-service-tests.txt` (wallet-v2 + tickets: 40/40 gruen)
  - `worklog/proofs/016-profile-tests.txt` (profile/**: 54/55 gruen, 1 skipped nicht 016-related)
  - `worklog/proofs/016-render-check.md` (8 Edge-Cases statisch verifiziert: 0 Tx, <50, =50, 120+10, Filter-aktiv, Doppel-Click, Initial-Error, Page-N-Error)
- Commit: 9efb5983
- Notes: B2 von Block B. Bug-Klasse: 200-Row-Upfront-Load ohne Pagination skalierte nicht fuer Heavy-User. Fix: Neue `useInfinite*`-Hooks parallel zu den alten (alte bleiben fuer Profile Timeline-Tab mit fixer Top-50-Anzeige unveraendert). Pagination via `.range(offset, offset+pageSize-1)` auf `transactions` + `ticket_transactions`. `getNextPageParam` returned `undefined` wenn `lastPage.length < pageSize` — verhindert Infinite-Loop bei exakt-pageSize-Responses. Load-More-Button fetched nur die Queries die noch `hasNextPage=true` haben, Loader2-Spinner mit `isFetchingNextPage`-Guard. Common-i18n-Key `loadMore` existierte bereits, kein Message-Change. Scope-Out: Server-Side Filter, echte Server-Aggregation (earned/spent Total via RPC) = CEO-Scope, Infinite-Scroll via IntersectionObserver, Page-Error-Toast. Profile-Tests (useProfileData, ProfileView) blieben gruen weil alte Hook-Signaturen unveraendert.

---

## 015 | 2026-04-17 | Logout React Query Cache Clear (B1, Flow-Audit Flow 15)
- Stage-Chain: SPEC → IMPACT(skipped — 1-File AuthProvider-Edit, kein DB/RPC/Service) → BUILD → PROVE → LOG
- Files:
  - `src/components/providers/AuthProvider.tsx` (clearUserState: queryClient.clear() unconditional statt nur bei SIGNED_OUT, 5 Zeilen inkl. Kommentar)
- Proofs:
  - `worklog/proofs/015-diff.txt` (git diff: 1 File, 5 Zeilen)
  - `worklog/proofs/015-tsc.txt` (leer = clean)
  - `worklog/proofs/015-tests.txt` (auth/rls + db-invariants: 38/38 gruen)
  - `worklog/proofs/015-flow-trace.md` (6 Szenarien Vorher/Nachher, identifiziert Szenario 3 — Grace-Period-Expire — als tatsaechlichen Bug-Fix)
- Commit: b2079826
- Notes: B1 von Block B (flow-audit Restrisiken). Bug-Klasse: Cache-Clear war an `event === 'SIGNED_OUT'` gated — bei Silent-Token-Expire laeuft aber `clearUserState(event='INITIAL_SESSION')` via Grace-Period-Timer-Expire. Folge: Cache von User 1 bleibt, User 2 auf same tab sieht stale data (insbesondere Queries ohne user-id im Key). Fix: `queryClient.clear()` unconditional in clearUserState. Andere 5 Szenarien unveraendert (Szenario 1/2/6 clearen wie gehabt, Szenario 4 ist no-op bei leerem Cache, Szenario 5 nutzt weiter invalidate statt clear). Kein Playwright-E2E (Grace-Period-Expire ohne Auth-Harness nicht reproduzierbar) — Code-Flow-Trace als Equivalent. CEO-autonom per explizitem Briefing-Freigabe-Commit f0c9bdc7.

---

## 014 | 2026-04-17 | Holdings RLS Tighten (AUTH-08, CEO-approved Option 2)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417050000_holdings_rls_tighten.sql` (NEW, DROP alte Policy + CREATE neue own-or-admin Policy)
  - `supabase/migrations/20260417050100_get_player_holder_count_rpc.sql` (NEW, SECURITY DEFINER RPC fuer cross-user holder-count, AR-44 REVOKE/GRANT)
  - `src/lib/services/wallet.ts` (getPlayerHolderCount nutzt jetzt RPC statt direkte count-Query)
  - `src/lib/services/__tests__/wallet-v2.test.ts` (3 tests auf mockSupabaseRpc statt mockSupabaseCount)
  - `.claude/rules/common-errors.md` (neues Pattern "RLS Policy qual=true auf sensiblen Tabellen" dokumentiert)
- Proofs:
  - `worklog/proofs/014-policy-before.txt` (alte Policy: qual=true)
  - `worklog/proofs/014-policy-after.txt` (neue Policy: own | club_admin | platform_admin + RPC sanity check)
  - `worklog/proofs/014-auth-tests.txt` (AUTH-* Suite 15/15 gruen inkl. AUTH-08)
  - `worklog/proofs/014-inv-tests.txt` (INV-19 + INV-20 gruen)
  - `worklog/proofs/014-wallet-tests.txt` (wallet-v2 25/25 gruen)
- Commit: ae2d66e
- Notes: AUTH-08 geschlossen. CEO-approved Option 2 (2026-04-17 chat): partial tighten statt strict-own-only oder keep-as-is. Portfolio-Privacy fuer regulaere User wiederhergestellt; Club-Admin Fan-Analytics + Platform-Admin Sicht bleiben funktional via policy-branch statt RPC-wrap. Nur 1 Produktions-Consumer (`getPlayerHolderCount`) brach und wurde via SECURITY DEFINER RPC umgehoben. Public-Profile `getHoldings(targetUserId)` liefert jetzt `[]` bei fremdem Profil — kein UI-break (Portfolio-Tab ist isSelf-only laut profile.md), nur minor eager-fetch waste (Optimization-Slice separat). Scope-Out: per-club-scoping fuer Club-Admins, column-level avg_buy_price redaction, fetch-gate in useProfileData. common-errors.md um qual=true Pattern erweitert (neu nach Slice 005 A-02 Eintrag).

---

## 013 | 2026-04-17 | Players NFC Normalize (TURK-03)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417040000_players_nfc_normalize.sql` (NEW, idempotent UPDATE)
- Proofs:
  - `worklog/proofs/013-before-after.txt` (byte-diff target row + global count)
  - `worklog/proofs/013-tests.txt` (TURK-* Suite 10/10 gruen)
- Commit: 5b88ba3
- Notes: 1 Row in NFD-dekomposierter Form gefixt. `T. İnce` (id=bb44cdb4-...) hatte `last_name` bytes `49 cc 87 6e 63 65` (`I` + U+0307 combining dot + `nce`) waehrend alle anderen İ-Spieler in NFC-Form sind (U+0130 single codepoint, bytes `c4 b0`). Test TURK-03 failed weil JS `String.prototype.includes('İ')` strict Codepoint-Compare ist — SQL `ILIKE` matched beide Formen bereits. Fix: `UPDATE players SET ... = normalize(x, NFC)` idempotent. Kein UX-Impact, nur byte-Kodierung geaendert. Scope-Out: Clubs/Profiles/Research etc. — keine Drift dort (TURK-06/TURK-07 gruen). Import-Path-Analyse nicht im Scope (einmalige Drift, 1 Row). NFC-CHECK-Constraint als Prevention falls Drift wiederkehrt, separater Slice.

---

## 012 | 2026-04-17 | Zero-Qty Holding Cleanup (INV-08, EDGE-17)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417030000_cleanup_zero_qty_holding.sql` (NEW, 1 DELETE)
- Proofs:
  - `worklog/proofs/012-before-after.txt` (1 Row vor, 0 Rows nach; Daten-Safety-Notiz)
  - `worklog/proofs/012-tests.txt` (db-invariants + boundaries/edge-cases: 43/43 gruen)
- Commit: c958c6a
- Notes: Einmalige Data-Cleanup. 1 Orphan-Row (jarvisqa/Livan Burcu, quantity=0, avg_buy_price=10000, erstellt 2026-04-15) geloescht via Migration. Kein Value-Impact (0 DPCs = 0 SC). INV-08 + EDGE-17 jetzt gruen. **Root-Cause NICHT gefixt — CEO-Scope:** Trading-RPCs (`buy_player_sc`, `accept_offer`, `buy_from_order`, `buy_from_ipo`) dekrementieren `holdings.quantity` via UPDATE statt DELETE-when-zero. Dokumentiert im Proof als Follow-Up (RPC-Fix + CHECK `quantity > 0` gemeinsam). Erste neue quantity=0-Row nach diesem Slice = Beweis fuer CEO-Fix-Dringlichkeit.

---

## 011 | 2026-04-17 | Locked-Balance Test Coverage Gap (INV-07/MF-WAL-04/MF-ESC-04)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/lib/__tests__/db-invariants.test.ts` (INV-07 erweitert)
  - `src/lib/__tests__/money/wallet-guards.test.ts` (MF-WAL-04 erweitert)
  - `src/lib/__tests__/money/escrow.test.ts` (MF-ESC-04 erweitert)
- Proofs:
  - `worklog/proofs/011-diff.txt` (git diff: 3 Files, 93 LOC)
  - `worklog/proofs/011-tests.txt` (3 target tests gruen, INV-07 + MF-WAL-04 + MF-ESC-04)
- Commit: abf9b0b
- Notes: Test-Gap-Fix, kein DB/Code-Change. Alle 3 Tests pruefen jetzt auch `bounties WHERE is_user_bounty=true AND status='open' AND created_by=<user>` als Lock-Quelle (Escrow-Pattern aus `bounties.ts:246`). jarvisqa (user 535bbcaf..., locked_balance=50000, 1 open user-bounty, 0 orders, 0 offers) ist jetzt korrekt als legitime Escrow erkannt. Scope-Out: Exakt-Summen-Check (locked_balance == Σ escrow sources), holding_locks fuer Fantasy — separate Slices.

---

## 010 | 2026-04-17 | INV-25 Service-Throw-Key Coverage (B-02 sub-class)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/lib/__tests__/error-keys-coverage.test.ts` (NEW, 171 LOC)
- Proofs:
  - `worklog/proofs/010-inv25.txt` (2 tests passed)
  - `worklog/proofs/010-diff.txt` (scan inventory + drift-class doc)
- Commit: e19f9c2
- Notes: Statischer CI-Regression-Guard gegen den Drift-Pattern "Service wirft neuen Key, KNOWN_KEYS nicht erweitert, Consumer faellt silent auf errors.generic". Scannt `src/lib/services` + `src/features/*\/services` nach literal `throw new Error('<identifier>')`, assertert Coverage via `mapErrorToKey`-Pass-through-Branch ODER `INV25_WHITELIST` (namespace-spezifisch, consumer-resolved). Aktueller Stand: 60 Service-Files, 32 Call-Sites, 14 distinct keys, 13 in KNOWN_KEYS, 1 whitelisted (insufficient_wildcards → fantasy namespace resolved by useEventActions.ts:173). Zweiter Test schuetzt gegen stale Whitelist-Eintraege. Scope-Out: Expression-Form-Throws, Component-/API-Route-Throws, broader B-02 Return-Type-Audit. B-02 Status bleibt GELB (nur error-Kanal-Drift geschlossen).

---

## 009 | 2026-04-17 | Error-States Community/Fantasy (B-06)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/components/admin/hooks/useClubEventsActions.ts` (+ `mapErrorToKey, normalizeError` import, +`tErrors` Namespace, 6 Error-Setter-Stellen gehaertet)
  - `src/components/fantasy/CreatePredictionModal.tsx` (+ imports, +`tErrors`, 2 Error-Setter gehaertet)
- Proofs:
  - `worklog/proofs/009-diff.txt` (git diff: 2 Files)
  - `worklog/proofs/009-tsc.txt` (empty = clean)
  - `worklog/proofs/009-tests.txt` (events-v2 + events: 77/77 green)
- Commit: 9835025
- Notes: Defensive Haertung gegen i18n-Key-Leak-Klasse (common-errors.md J1/J3). 8 Error-Setter-Stellen in 2 Consumer-Files umgestellt von `err.message` / `result.error` direkt → `tErrors(mapErrorToKey(normalizeError(...)))`. Pattern aus `features/fantasy/hooks/useEventActions.ts:187` (canonical J3-Fix). Community/Fantasy Service-Side (Bounties, Wildcards, Lineups, Offers) war bereits J3 gehaertet — B-06 war Consumer-Seitige Lueckenschliessung. Scope-out: `src/app/(auth)/login/page.tsx` x4 Auth-Exposures (vendor-Text, separate Error-Klasse, eigener Slice). Blocker-Status: B-06 geschlossen. Verbleibend: B-02, B-03, B-04, B-05.

---

## 008 | 2026-04-17 | Floor-Price-Drift eliminieren (B-01)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/lib/queries/orders.ts` (staleTime 2*60_000 → 30_000 auf `useAllOpenOrders` + `useAllOpenBuyOrders` + Begruendungs-Kommentar)
  - `src/features/market/hooks/useMarketData.ts` (Tot-Fallback `?? p.prices.referencePrice` entfernt, Fallback-Chain dokumentiert)
- Proofs:
  - `worklog/proofs/008-staletime-diff.txt` (git diff: 2 Files, 14 LOC)
  - `worklog/proofs/008-tsc.txt` (empty = clean)
  - `worklog/proofs/008-tests.txt` (977/977 service tests green)
- Commit: c1869bf (+ hotfix 9a1dc32 — useMarketData test consolidation)
- Notes: Cross-User Drift-Fenster von 2min auf 30s reduziert — user sieht stale Sell-Order max. 30s nach Fremduser-Fill (vorher 2min), dann auto-Refetch via React Query. Self-Action-Drift unverändert 0s (Post-Mutation-Invalidation via `qk.orders.all` in `features/market/mutations/trading.ts:71+87`). Kein Money-Impact (Floor ist display-only; `buy_player_sc` revalidiert FOR UPDATE gegen DB). Kanonische Fallback-Chain jetzt konsistent zu `enriched.ts:74` (`floorFromOrders ?? prices.floor ?? 0`); `referencePrice`-Fallback war dead-code post-enrichment, entfernt. Scope-Out: Realtime-Subscription auf orders-Tabelle fuer 0s-Drift — separater Slice. Performance-Impact im Pilot-Volume (~10-50 active users) akzeptabel.

---

## 007 | 2026-04-17 | RPC Response Shape Audit (A-07)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417020000_audit_helper_rpc_jsonb_keys.sql` (new, Helper-RPC `get_rpc_jsonb_keys(text)`)
  - `src/lib/__tests__/db-invariants.test.ts` (+225 Zeilen, INV-23 + 68-RPC Whitelist)
  - `src/lib/services/mysteryBox.ts` (`cosmeticName` entfernt — dead field, RPC emits only `cosmeticKey`)
  - `src/types/index.ts` (`cosmetic_name?` aus `MysteryBoxResult` entfernt)
  - `src/app/(app)/hooks/useHomeData.ts` (pass-through `cosmetic_name` entfernt)
  - `src/components/gamification/MysteryBoxModal.tsx` (Fallback-Chain bereinigt)
  - `src/components/inventory/MysteryBoxHistorySection.tsx` (Fallback-Chain bereinigt)
  - `src/lib/services/__tests__/smallServices.test.ts` (Mock-Fixture angepasst)
- Proofs: `worklog/proofs/007-rpc-shape-audit.txt` (116 RPCs tabelliert), `worklog/proofs/007-inv23.txt` (vitest green)
- Commit: 6b50212
- Notes: A-07 schließt Blocker-A komplett. Audit-Helper parsed plpgsql-Body mit echtem Paren/String/Comment-Tokenizer (kein Regex) und extrahiert Top-Level `jsonb_build_object`/`json_build_object` Keys. INV-23 lockt 68 Service-konsumierte RPCs (alle Money-Pfade inkl. Trading/IPO/Offers/Liquidation/Mystery) gegen Service-Cast-Drift (AR-42-Klasse: camelCase RPC vs snake_case Cast → silent `undefined`). 1 echte Drift gefunden und behoben: `cosmeticName` in mysteryBox.ts war seit RPC-Deploy tot (RPC emits nur `cosmeticKey`), Consumer-Fallback-Chain hat es kompensiert → User-visible Behavior UNVERAENDERT. 2 RPCs (admin_delete_post, update_community_guidelines) in RPC_SHAPE_EXCLUDED dokumentiert wegen string-literal-cast Returns. Pre-existing INV-07/INV-08 failures (Holdings/Wallet Data-Drift) nicht Scope 007 — separater Data-Cleanup.

---

## 006 | 2026-04-17 | ALL_CREDIT_TX_TYPES ⊇ DB alignment (A-05 Follow-up)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files: `src/lib/transactionTypes.ts` (+10 canonical DB types), `src/lib/__tests__/db-invariants.test.ts` (+INV-22)
- Proof: `worklog/proofs/006-inv22.txt` — 28 DB types, all in TS
- Commit: (pending)
- Notes: TS Union war subset drift vs DB (fehlten: admin_adjustment, order_cancel, offer_execute, liga_reward, mystery_box_reward, tip_send, subscription, founding_pass, referral_reward, withdrawal). Pragmatischer Fix: ADD (keep TS-extras fuer activityHelpers compat), KEINE removals. INV-22 guard'd. activityHelpers-Labels+Icons fuer neue DB-types: separater CEO-Slice (TR-i18n).

---

## 005 | 2026-04-17 | Auth-Guard Hardening (A-02)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417000000_auth_guard_hardening.sql` (4 RPCs hardened)
  - `supabase/migrations/20260417010000_audit_helper_auth_guard.sql` (INV-21 helper)
  - `src/lib/__tests__/db-invariants.test.ts` (+55 Zeilen, INV-21)
- Proofs: `worklog/proofs/005-{before,after}-grants.txt`, `005-inv21.txt`
- Commit: (pending)
- Notes: 4 SECURITY DEFINER RPCs hatten authenticated+p_user_id+kein auth.uid() (A-02 exploit class, P3-22 in phase3-db-audit). Fix: REVOKE authenticated + defense-in-depth body guard (`IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE`). Cron (service_role) bleibt funktional. Client nutzt Wrapper (lock_event_entry, refresh_my_airdrop_score) unveraendert. INV-21 meta-test: 193 SECURITY DEFINER geprueft, 0 violations. CEO-approved 2026-04-17.
- Severity: [HIGH] rpc_lock_event_entry + renew_club_subscription (fremdes Wallet/Tickets deduct), [MED] check_analyst_decay (Score-Penalty auf fremde User), [LOW] refresh_airdrop_score (recompute).

---

## 004 | 2026-04-16 | RLS Policy Coverage Audit (A-03)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260416250000_audit_helper_rls_coverage.sql` (new, Helper-RPC `get_rls_policy_coverage()`)
  - `src/lib/__tests__/db-invariants.test.ts` (+80 Zeilen, INV-19 + INV-20)
- Proof: `worklog/proofs/004-rls-coverage.txt`
  - INV-19: 120 RLS-tables, 4 whitelisted zero-policy, 0 violations
  - INV-20: 14 critical money/trading tables, 0 coverage drifts
- Commit: (pending)
- Notes: Zwei Guards gegen die "RLS enabled + 0 policies" Silent-Fail-Klasse (common-errors Session 255). Whitelist = 4 server-only-Tabellen (`_rpc_body_snapshots`, `club_external_ids`, `player_external_ids`, `mystery_box_config`). Folge-Investigation: `footballData.ts` nutzt regularen Client auf `club_external_ids` + `player_external_ids` → wahrscheinlich nur von API-Routes gecalled (service-role). Visual-QA waere noetig um zu bestaetigen dass KEIN Browser-Path sie direkt liest.

---

## 003 | 2026-04-16 | CHECK Constraint → TS Alignment (A-05)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260416240000_audit_helper_check_enum_values.sql` (new, Audit-Helper-RPC)
  - `src/lib/__tests__/db-invariants.test.ts` (+145 Zeilen, INV-18)
- Proof: `worklog/proofs/003-check-alignment.txt` — 14 Constraints checked, 0 drifts
- Commit: (pending)
- Notes: INV-18 lockt 14 Money/Identity-CHECK-Enums als Snapshot (transactions.type, orders.*, offers.*, events.*, players.position, user_stats.tier, research_posts.*, lineups.captain_slot, club_subscriptions.tier, user_founding_passes.tier). Jede Schema-Aenderung an einer dieser triggert Fail → Reminder TS/UI syncen. Audit-Helper-RPC `get_check_enum_values(text)` als public SECURITY INVOKER, REVOKE anon/GRANT auth nach AR-44-Template.
- Follow-up-Backlog (aus Recherche, nicht in diesem Slice gefixt): `src/lib/transactionTypes.ts` hat Drift zu DB (`buy`/`sell` statt `trade_buy`/`trade_sell`, `poll_earning` statt `poll_earn`, `scout_subscription_earning` statt `subscription`, fehlt `admin_adjustment`/`order_cancel`/`offer_execute`/`liga_reward`/`mystery_box_reward`/`tip_send`/`founding_pass`/`referral_reward`/`withdrawal`). Fix-Slice spaeter (CEO-Scope: Money-Labels).

---

## 002 | 2026-04-16 | Wallet Profile FK + Orphan Cleanup
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files: `supabase/migrations/20260416230000_wallets_profile_fk_cascade.sql` (new, 68 lines), `src/lib/__tests__/db-invariants.test.ts` (+44 lines, INV-17)
- Proofs:
  - `worklog/proofs/002-migration-before.txt` — 2 orphans, 0 FK
  - `worklog/proofs/002-migration-after.txt` — 0 orphans, CASCADE FK live
  - `worklog/proofs/002-inv17.txt` — INV-16 + INV-17 beide gruen
- Commit: (pending)
- Notes: CEO-approved Option B (modified). Orphan 1 (`9e0edfed` taki.okuyucu@gmx.de, abandoned signup, 1M balance, 0 activity) → DELETE. Orphan 2 (`862c96a1` testtrading@bescout.test, 2 tx, 0 trades/holdings) → Profile-Backfill mit is_demo=true. FK `wallets_user_id_profiles_fkey` auf profiles(id) ON DELETE CASCADE. Zukuenftige profile-deletes cascaden Wallet automatisch. INV-17 als permanenter Regression-Guard.

---

## 001 | 2026-04-16 | Wallet-Konsistenz-Check (Blocker A-04)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files: `src/lib/__tests__/db-invariants.test.ts` (+87 Zeilen, INV-16 hinzugefuegt)
- Proof: `worklog/proofs/001-wallet-invariant.txt` — 127 Wallets geprueft, 124 mit Transactions, 0 Violations
- Commit: (pending)
- Notes: Invariante `wallets.balance == latest transactions.balance_after` haelt live. Ledger-Drift-Risiko aus Blocker A-04 damit fuer Pilot-DB verifiziert, kein Folge-Fix noetig. Health-Check bleibt als Regression-Guard dauerhaft.

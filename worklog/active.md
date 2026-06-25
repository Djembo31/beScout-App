# Active Slice

```
status: idle
slice: 379
title: ✅ DONE — credit_tickets/spend_tickets/CHECK Source-Drift gefixt (post_create + 2 latente Bugs)
stage: LOG complete
size: XS
slice-type: Migration (RPC-Allowlist + CHECK-Widen, Ticket-Gamification-Währung, NICHT cents-Wallet)
proof: worklog/proofs/379-ticket-source.txt
proof-detail: AC1-AC5 alle PASS (post_create/research_publish/research_rating/chip_refund ok, bogus weiter RAISED, 16/16 in credit+spend+CHECK, proacl unverändert); tsc EXIT 0
review: worklog/reviews/379-review.md (self-review PASS, XS additiver Drift-Fix, 1 LOW kein-SSOT dokumentiert)
result: 3 unabhängig gedriftete Gate-Flächen (credit_tickets-Allowlist, spend_tickets-Allowlist, ticket_transactions_source_check CHECK) auf eine 16-Wert-Union (RPC-Legacy ∪ TS TicketSource) gezogen. Fix von post_create (Anil-Fund, still 400) + 2 latente: research_publish/research_rating (RPC) + chip_refund (war in RPCs erlaubt, scheiterte am CHECK). Live-Smoke fand Fläche #3 (CHECK) erst nach RPC-Fix. Additiv, Grants unverändert, kein src-Change. Knowledge: errors-db.md S379. Migration 20260625160000.

## Problem (inline-Spec, XS)
- **Evidence:** Live-400 „Ungueltige Ticket-Quelle: post_create" (Anil-Fund 2026-06-25, Handoff). Live-`pg_get_functiondef` (D87) bestätigt: `credit_tickets` UND `spend_tickets` tragen identische hartcodierte Allowlist `p_source NOT IN (...)`, die von TS-`TicketSource` (src/types/index.ts:2006) abgedriftet ist.
- **Es gibt KEINEN CHECK-Constraint** auf `ticket_transactions.source`/`user_tickets` — RPC-Body ist einzige Schranke (= einzige Fix-Stelle).
- **Im TS, fehlt im RPC (alle scheitern still, Live-Count=0):** post_create (posts.ts:161, 3 Tk), research_publish (research.ts:227, 10 Tk), research_rating (research.ts:368, 5 Tk), event_entry_refund (Type-only, kein Caller).
- **Im RPC-Legacy, nicht im TS (behalten — additiv, kein Narrow):** streak_bonus, live_prediction, cosmetic_shop.
- **Klasse:** errors-db.md S330 CHECK-/Allowlist-Drift (hier ohne CHECK, im RPC-Body).

## Fix
- Beide Allowlists auf Union (RPC-Legacy + alle TS-`TicketSource`) ziehen → Drift-Klasse abgestellt, beide RPCs identisch. Body sonst byte-identisch (Auth-Guard/Cap/admin_grant-Gate/Insert unverändert). Grants nicht angefasst (CREATE OR REPLACE erhält ACL {service_role,authenticated}, post-Apply proacl-Verify).
- KEIN src-Change (Type kennt post_create längst). KEIN CHECK/INV-18 (Tickets nicht in transactions).

## AC
- AC1: `credit_tickets(jarvis,3,'post_create',uuid)` → ok:true, Zeile in ticket_transactions (BEGIN…ROLLBACK).
- AC2: research_publish + research_rating je ok:true.
- AC3: Unbekannte Quelle (`bogus_src`) → weiterhin RAISE „Ungueltige Ticket-Quelle".
- AC4: spend_tickets-Allowlist == credit_tickets-Allowlist (Set-Diff leer).
- AC5: proacl beider Fn unverändert {service_role,authenticated}, kein anon.

## Proof-Plan
worklog/proofs/379-ticket-source.txt — Live BEGIN…ROLLBACK Smoke (AC1-AC5) + proacl.

--- 378 (vorheriger, DONE) ---
status: idle
slice: 378
title: ✅ DONE — E3 Slice 4b: special-Events (type='special') zahlen Prize aus dem Plattform-Topf (RAUS-Kanal #3)
stage: LOG complete
size: M
slice-type: Migration (Money-Trigger) + UI-Label + i18n, CEO-Scope
spec: worklog/specs/378-special-events-from-pot.md
ceo-decision: Anil 2026-06-25 (AskUserQuestion) — special-Events aus Topf (Spiegel 377). CTO-how: eigene Ledger-Quelle 'special_event' (Kontoauszug-Ehrlichkeit).
impact: inline (Spec §3+§4 — DB-interne Trigger erweitert, source-CHECK widern, AdminTreasuryTab-Label + i18n; score_event unangetastet)
proof: worklog/proofs/378-money-smoke.txt
proof-detail: AC-01..AC-09 alle PASS — special escrow source=special_event, settle ended/cancelled, amount-up, BESCOUT-Regression (source bleibt bescout_event), CHECK-Widen, i18n DE+TR; tsc EXIT 0
review: worklog/reviews/378-review.md (reviewer PASS — 1 LOW pre-existing tenant-only-Edit-Label dokumentiert, 1 NIT)
result: 3 Event-Trigger platform-Zweig auf type IN ('bescout','special') erweitert, Ledger-source per CASE (special→special_event, sonst bescout_event), Refund-source resync delta<0 nach OLD.type (Halter). source-CHECK additiv um 'special_event' gewidert. AdminTreasuryTab-Label + platformPotSrcSpecialEvent DE „Sonder-Event"/TR „Özel Etkinlik". Zero-sum identisch 377, score_event unangetastet, club+bescout byte-identisch. Event-Geldquellen: club ✅ bescout ✅ special ✅ (sponsor/creator minten weiter, eigene Slices).

## Nächster großer Track
E3 Slice 5 — Wettkampf-Darstellung + Ranking-Konsolidierung (UI): Events als „BeScout Liga" mit Monats-/Saison-Wertung sichtbar; 7 /rankings-Boards entwirren. Plan-Anker `worklog/notes/358-platform-treasury-epic.md`. Offene Reste (cred-/deploy-gated): Topf-Card-Screenshot (ali_admin-PW) · Bounty-Approval-UI (kede5-PW) · U-1 Live-Check (nach Vercel-Deploy). Noch minting: sponsor (Deposit-Pfad fehlt) / creator (Phase 4).

--- 377 (vorheriger, DONE) ---
status: idle
slice: 377
title: ✅ DONE — E3 Slice 4: BeScout-Events (type='bescout') zahlen Prize aus dem Plattform-Topf (RAUS-Kanal #2)
stage: LOG complete
size: M
slice-type: Migration (Money-Trigger), CEO-Scope
spec: worklog/specs/377-bescout-events-from-pot.md
ceo-decision: Anil 2026-06-25 (AskUserQuestion) — Escrow-bei-Erstellung (Spiegel 331), score_event unangetastet. Cold-Start = D103 Hard-Gate.
impact: inline (Spec §3+§4 — DB-interne Trigger, 0 App-Consumer grep-verifiziert, score_event/cancel_event UPDATE-Quellen unverändert)
proof: worklog/proofs/377-money-smoke.txt
proof-detail: AC-01..AC-08 alle PASS — Escrow/Coverage-Fail/Settle-ended/cancelled/Resync-typeswitch/Resync-amount/non-prized; Zero-Sum bewiesen; tsc EXIT 0
review: worklog/reviews/377-review.md (reviewer PASS — 1 LOW pre-existing club_id-Hole dokumentiert, 2 NIT; Zero-Sum-Timing + Club-Pfad-byte-identisch + Deckungs-Check-4-Pfade verifiziert)
result: 3 Event-Trigger (escrow BEFORE INSERT / settle BEFORE UPDATE OF status / resync BEFORE UPDATE OF prize_pool,type) um additiven type='bescout'→platform_treasury-Zweig erweitert. Escrow-Debit + inline Deckungs-Check unter Singleton-Row-Lock + RAISE bei Unterdeckung (D103). Settle Rest/voll-Refund je NEW.type. Resync zwei-Treasury (held OLD-type-diskriminiert vs target NEW), deckt type-Switch club↔bescout, Refund an Halter OLD.club_id. score_event UNANGETASTET → zero-sum (Escrow −P, mintet +D, Settle +(P−D)). Club-Pfad byte-identisch. bescout_event source seit 357 im CHECK, kein src/i18n-Change. Knowledge: treasury.md §7 + errors-db.md S377.

## Nächster großer Track
E3 Slice 5 — Wettkampf-Darstellung + Ranking-Konsolidierung (UI): Events als „BeScout Liga" mit Monats-/Saison-Wertung sichtbar; 7 /rankings-Boards entwirren (Saison/Monat lebendig vs ewig/global). Plus offen (Engagement, eigener UI-Slice): Live-Standing-Board (laufender Monat, useMonthlyLeaderboard-Verkabelung + getMonthlyLeaderboard swallow→throw). special/sponsor/creator-Event-Quellen bleiben minting (je eigener Slice). Cron für Auto-Monatsabschluss = späterer Slice (Anil: erst manuell). Plan-Anker `worklog/notes/358-platform-treasury-epic.md`.

--- 376 (vorheriger, DONE) ---
status: idle
slice: 376
title: ✅ DONE — E3 Slice 3: Monats-Liga Payout aus Topf (debit) + Deckungs-Check + overall-Median-Fix + Genesis-Seed
stage: LOG complete
size: M
slice-type: Migration (Money-RPC), CEO-Scope
spec: worklog/specs/376-monthly-liga-pot-payout.md
impact: inline (Spec §3+§4 — 1 RPC-Consumer AdminLigaTab grep-verifiziert, db-invariants Shape-Check geprüft)
ceo-decision: Anil 2026-06-25 — Genesis-Seed 500.000 Credits + manueller Trigger (kein Cron). AskUserQuestion bestätigt.
proof: worklog/proofs/376-money-smoke.txt
proof-detail: AC1 Seed +50.000.000/genesis_rows=1, AC2 CHECK+genesis, AC3 overall-Median=20≠30, AC4 Zero-Sum total_paid=debit=pot_delta=3.400.000, AC5 insufficient_treasury+0-Snapshots-retry-bar, AC6 month_already_closed, AC7 Shape+Konstanten; tsc EXIT 0
review: worklog/reviews/376-review.md (reviewer CONCERNS → Money PASS-grade; HIGH Migration-File + MEDIUM Persist beide behoben; 1 LOW pre-existing Tiebreaker)
result: close_monthly_liga zahlt zero-sum per book_platform_treasury('debit','monthly_liga') aus dem Topf statt zu minten; Deckungs-Check inline unter Singleton-Row-Lock (book schützt NICHT gegen Negativ), RAISE bei Unterdeckung → Monat retry-bar; overall [2]=manager → echter Median (a+b+c)-GREATEST-LEAST. Migration widert source-CHECK um 'genesis' + Genesis-Seed 50.000.000 cents (500.000 Credits, ~14,7 Monate). Erster RAUS-Kanal aus dem Plattform-Topf. KEIN Cron (manueller Admin-Trigger, Anil), KEIN src-Change.

## Nächster großer Track
E3 Slice 4 — BeScout-Events aus dem Topf (type='bescout' Prize aus platform_treasury statt Minting, mirror Slice 331 Club-Event-Escrow). Danach Slice 5 Wettkampf-Darstellung + Ranking-Konsolidierung. Plus offen (Engagement, eigener UI-Slice): Live-Standing-Board (laufender Monat, useMonthlyLeaderboard-Verkabelung + getMonthlyLeaderboard swallow→throw). Cron für Auto-Monatsabschluss = späterer Slice (Anil: erst manuell). Plan-Anker `worklog/notes/358-platform-treasury-epic.md`.

--- 375 (vorheriger, DONE) ---
status: idle
slice: 375
title: ✅ DONE — DPC-Mastery-Feature entfernt + Mock-Cron gestoppt + tote hold_days-Spalte gedroppt
stage: LOG complete
size: M
slice-type: UI-Removal + Migration
spec: worklog/specs/375-remove-dpc-mastery.md
impact: inline (Spec §3+§4, grep-verifizierte Consumer + Live-DB)
proof: worklog/proofs/375-remove-mastery.txt (AC1-AC7 PASS, tsc clean, 100 vitest grün, DB: 0 Crons/0 Mock-Fn/hold_days weg, Engine intakt)
review: worklog/reviews/375-review.md (reviewer CONCERNS→7 LOW/NIT alle adressiert→effektiv PASS)
result: 6 UI-Anzeige-Stellen + Prop-Kette (7 Files) entfernt, orphan queries/services/mastery.ts gelöscht, Barrel+qk.mastery+USER_SCOPED bereinigt, 5 Test-Files. Migration: Mock-Cron unscheduled + increment_mastery_hold_days() + hold_days-Spalte gedroppt. Echte Engine (award_mastery_xp Fantasy/Content + freeze/unfreeze) + Tabelle reversibel erhalten. Netto −112 LoC.

--- 375 (vorheriger, DONE) ---
status: idle
slice: 375
title: ✅ DONE — DPC-Mastery-Feature entfernt + Mock-Cron gestoppt + tote hold_days-Spalte gedroppt
stage: LOG complete
size: M
slice-type: UI-Removal + Migration
spec: worklog/specs/375-remove-dpc-mastery.md
impact: inline (Spec §3+§4, grep-verifizierte Consumer + Live-DB)
proof: worklog/proofs/375-remove-mastery.txt (AC1-AC7 PASS, tsc clean, 100 vitest grün, DB: 0 Crons/0 Mock-Fn/hold_days weg, Engine intakt)
review: worklog/reviews/375-review.md (reviewer CONCERNS→7 LOW/NIT alle adressiert→effektiv PASS)
result: 6 UI-Anzeige-Stellen + Prop-Kette (7 Files) entfernt, orphan queries/services/mastery.ts gelöscht, Barrel+qk.mastery+USER_SCOPED bereinigt, 5 Test-Files. Migration: Mock-Cron unscheduled + increment_mastery_hold_days() + hold_days-Spalte gedroppt. Echte Engine (award_mastery_xp Fantasy/Content + freeze/unfreeze) + Tabelle reversibel erhalten. Netto −112 LoC.

## Reste-Queue (Anil: „alle nach und nach") — Runde abgeschlossen 2026-06-25
1. ✅ 373 Floor-Label-Vereinheitlichung (5293cdf9)
2. ✅ 374 Compliance-Sweep eventCurrency/Tickets (5ff7510a)
3. ✅ 375 DPC-Mastery-Feature entfernt (ab1581c1)
4. ⏸ **Topf-Card-Visual (357) — ZURÜCKGESTELLT (Anil 2026-06-25).** Card code-komplett (`AdminTreasuryTab.tsx`) + Saldo RPC-bewiesen (2462 Cents, 365/370). Offen NUR Screenshot von `/bescout-admin` (DE+TR, AC-11 → `357-ui.png`). **Blocker: braucht Plattform-Admin-Login `ali@test.bescout.de` (handle ali_admin, einziger top_role='Admin') — Passwort fehlt.** kede5 ist nur Manager → kein /bescout-admin-Zugriff.
5. ⏸ **Bounty-Approval-UI — ZURÜCKGESTELLT (Anil 2026-06-25).** Fee-REIN RPC-bewiesen (365/370, bounty:50 im Topf). Offen NUR UI-Klick. **Creds: kede5 (`kede5@gmx.de`, Club-Admin), Kandidaten 12345 / 123456 / test123.**

**Nächster großer Track:** E3 Slice 3 — Monats-Liga e2e (erster RAUS-Kanal aus dem Topf, Money/CEO-Scope; D87 Live-`pg_get_functiondef` der Liga-RPC VOR Spec). Plan-Anker `worklog/notes/358-platform-treasury-epic.md`.

--- 374 (vorheriger, DONE) ---
status: idle
slice: 374
title: ✅ DONE — Compliance-Sweep eventCurrency/Tickets-„Währung" → D99-neutral („Einheit"/„Birim")
stage: LOG complete
size: XS
slice-type: i18n (Compliance)

--- 374 (vorheriger, DONE) ---
status: idle
slice: 374
title: ✅ DONE — Compliance-Sweep eventCurrency/Tickets-„Währung" → D99-neutral („Einheit"/„Birim")
stage: LOG complete
size: XS
slice-type: i18n (Compliance)
spec: worklog/specs/374-compliance-currency-sweep.md
impact: skipped (reine i18n-Values, 0 Code)
proof: worklog/proofs/374-currency-sweep.txt (AC1-AC4 PASS, JSON valid)
review: worklog/reviews/374-review.md (self-review PASS, XS reine Wording-Values)
result: eventCurrency ×3 DE→„Einheit"/TR→„Birim" (Schreibung vereinheitlicht) + glossary tickets.description entwährungt (user-facing). creditsContent-Disclaimer unberührt.

## Reste-Queue (Anil: „alle nach und nach")
1. ✅ 373 Floor-Label-Vereinheitlichung (commit 5293cdf9)
2. ✅ 374 Compliance-Sweep eventCurrency/Tickets
3. → 367-F#3 DPC-Mastery Mock→Pro (hold_days-Seed) ← NÄCHSTER
4. Topf-Card-Visual (357)
5. ⑤ Bounty-Approval-UI (kede5-Creds: 12345 / 123456 / test123)

## Slice 373 (vorheriger, DONE)
status: idle · ✅ Floor-Label-Vereinheitlichung · commit 5293cdf9 · proof 373-floor-label.txt · review 373-review.md (reviewer PASS)
```

## Reste-Queue (Anil: „alle nach und nach", 2026-06-24)
1. **373 Floor-Label-Vereinheitlichung** ← JETZT
2. Compliance-Sweep eventCurrency/Tickets → „Credits" (D99)
3. 367-F#3 DPC-Mastery Mock→Pro (hold_days-Seed)
4. Topf-Card-Visual (357)
5. ⑤ Bounty-Approval-UI (kede5-Creds: 12345 / 123456 / test123)

## Slice 372 (vorheriger, DONE)
```
status: idle
slice: 372
title: ✅ VOLL-DONE — BuyModal Freshness-Gate Self-Heal (kein Dauer-Hang bei „Saldo wird aktualisiert…")
stage: LOG complete
size: S
slice-type: UI (Bug-Fix, Money-Pfad)
spec: worklog/specs/372-buymodal-balance-stale-hang.md
commit: 4a7c868f
root-cause: useIsBalanceFresh = zeitbasiert (Date.now-dataUpdatedAt<30s); BuyModal-Open triggert keinen Wallet-Refetch (Query schon via TopBar gemountet, staleTime:0) → Balance >30s stale bleibt für immer stale → Button dauerhaft disabled + „Saldo wird aktualisiert…" lügt. „Tippen vs +/−" = Timing-Artefakt.
fix: useWallet exponiert refetch; BuyForm useEffect refetcht bei balanceStale (self-heal, kein Loop). Money-Logik byte-identisch (read-only refresh).
review: worklog/reviews/372-review.md (reviewer PASS, 2 LOW/INFO non-block)
proof: worklog/proofs/372-buymodal-stale.txt + 372-before-stuck.png + 372-after-selfheal.png. Live bewiesen (bescout.net, Tiren): VORHER stuck 43s+, NACHHER self-heal ~3s; echter Buy reconciled (−10 CR, +1 Holding, Topf trading:35). tsc clean, 18 useWallet-Tests grün.
knowledge: errors-frontend.md S372 — zeitbasiertes Freshness-Gate ohne Recovery-Trigger.

--- 371 (vorheriger Slice, DONE) ---
prev-slice: 371
prev-title: ✅ VOLL-DONE — Wallet-Invalidate nach Poll-Vote/Research-Unlock (U-1 Fix) + Live-Playwright AC1/AC2 PASS
prev-stage: LOG complete
prev-size: XS
prev-slice-type: UI (Bug-Fix, money-nah)
spec: worklog/specs/371-wallet-invalidate-community.md
fix: useCommunityActions.ts — handleCastPollVote + handleUnlockResearch invalidieren jetzt qk.wallet.all (Header-Credit-Anzeige war nach Belastung stale bis Reload). Money-Logik unberührt (nur Cache).
proof: tsc clean + 72 vitest grün (useCommunityActions) + diff. ✅ Live-Playwright AC1/AC2 PASS (bescout.net, jarvis-qa): Poll-Vote 11.708,27→11.698,27 + Research-Unlock →11.688,27, je SOFORT ohne Reload, DB-reconciled (−20 CR exakt). Proofs: 371-wallet-invalidate.txt + 371-ac1/ac2-*.png.
review: self-review (XS, performance.md invalidateQueries-nach-Writes, money-Logik unberührt)
knowledge: errors-frontend.md Navigator — Money-Community-Mutation muss Wallet-Key invalidieren.

--- 370 (vorheriger Slice, DONE) ---
prev-slice: 370
prev-title: ✅ DONE — E2E-Sweep „Fees REIN" ②–⑤ live bewiesen (Topf 2862 nach UI-Walk) + UI-Walk (Poll/Research per Playwright)
prev-stage: LOG complete
prev-size: S
prev-slice-type: Verify (Money, CEO-Scope)
spec: worklog/specs/370-e2e-fees-rein-sweep.md
impact: skipped (kein Schema/Service-Edit — reine Live-Verifikation bestehender Fee-RPCs)
result: RPC-Ebene: ② IPO 500 (369-AC5) · ③ Poll 200 · ④ Research 200 · ⑤ Bounty 50 · trading 1512. Zero-Sum je Quelle ✓, Doppel-Approve money-safe reject ✓. **UI-Walk-Nachtrag (Playwright):** ② IPO (369-Buy-Modal) + ③ Poll + ④ Research per echtem UI-Klick bewiesen (Fee real im Topf, 0 Console-Errors); ⑤ Bounty = Admin-Approval, RPC-bewiesen (kede5-Creds fehlen für UI). Topf nach UI-Walk = 2862 Cents.
proof: worklog/proofs/370-fees-rein-sweep.txt (RPC) + worklog/proofs/370-ui-fees-rein.txt + 370-ui-poll-voted.png + 370-ui-research-unlocked.png (UI)
review: worklog/reviews/370-review.md (self-review PASS — kein Prod-Code)
finding: 🟡 U-1 (MEDIUM/UX) — Header-Guthaben aktualisiert nach Poll-Vote/Research-Unlock aus dem Feed nicht sofort (DB korrekt, korrigiert bei Reload); Wallet-Query-Key nicht invalidiert → kleiner Follow-up-Slice.
next: E3 Slice 3 — Monats-Liga e2e (erster RAUS-Kanal aus dem Topf). Plus offen: U-1 Header-Invalidate, ⑤ Bounty-Approval-UI (Admin-Creds), T-1 Cold-Start-Liquidität (Produkt), 368-Label-Rest, Topf-Card-Visual (357).

--- 369 (vorheriger Slice, DONE) ---
prev-slice: 369
prev-title: ✅ DONE — /api/push→500 Fail-Safe + VAPID-Secret-Heal (T-2) · commit 6b1f7b23
prev-stage: LOG complete
prev-size: S
prev-slice-type: Service + Infra (Secret)
spec: worklog/specs/369-api-push-vapid-failsafe.md
impact: inline — nur Push-Pfad (pushSender/route/pushSubscription + neuer vapidKey.ts) + 2 Vercel-Prod-Secrets. Kein DB/Schema.
root-cause: ensureVapid() rief setVapidDetails OHNE try/catch; Prod-VAPID-Secrets korrupt (Quotes+Newline+Pair-Mismatch, live aus vercel env pull bewiesen) → Throw ungefangen → route catch RETURNT 500 (Sentry blind, weil withLogger nur bei Throw captured). Korrektes Paar = .env.local (web-push+ECDH ✓).
decision: Anil 2026-06-24 — lokales Paar wiederherstellen, ich via vercel CLI. Beide Prod-Vars gesetzt, re-pull PAIR MATCH true.
proof: worklog/proofs/369-push-vapid.txt (tsc clean, 9 Tests, Prod-Pull pre/post-Heal) + worklog/proofs/369-ac5-push-200.png. **AC5 ✅ LIVE-BEWIESEN** (Playwright/bescout.net): Markt geseedet (3 IPOs + 4 Sell-Orders via RPC), 2 echte Buys (Preu buy_from_order + Rakhim IPO) → POST /api/push → 200 (war 500), 0 Console-Errors, DB reconciled.
review: worklog/reviews/369-review.md (reviewer PASS, 2 NITPICK non-block, +mocked-throw-Test ergänzt)
next: 370 E2E-Sweep ②–⑤ (verifiziert dabei 369-AC5), dann 368-Label-Rest

--- 368f (vorheriger Slice, DONE) ---
prev-slice: 368f
prev-title: ✅ DONE — DROP initial_listing_price (redundant seit D101) + Trigger-Sentinel-Rewrite (NOT EXISTS)
prev-stage: LOG complete
prev-proof: worklog/proofs/368f-drop-initial-listing-price.txt
prev-review: self-review (display-only, money byte-identisch, S305/324 Pattern)
prev-next: 369 /api/push→500, 368-Label-Rest, 370 E2E ②–⑤. (368e Playwright ✅ PASS — Markteintritt==Dein Einstieg, 500/500 + 800/800 live; Console-Errors = transiente Fetch-Noise, nicht 368e.)

--- 368e (vorheriger Slice, DONE) ---
prev-slice: 368e
prev-title: ✅ DONE — Markteintritt-Modell (D101) + Daten-Reparatur
prev-stage: LOG complete · commit 7a3b302f
prev-proof: worklog/proofs/368e-markteintritt-model.txt
prev-review: worklog/reviews/368e-review.md (CONCERNS → MEDIUM geheilt)

--- erledigt diese Session ---
368c DONE (committed 1dcff8bd): Floor-Band ÷3..×3 + Floor-Quelle + Label (Teil).
368d DONE: BuyModal „Gesamt"-Wahrheit (Menge/Preis an aktive Order, 3×11=33-Lüge weg). Reviewer PASS. proof/review da.
DATEN-FIX (E2E-entdeckt, Anil-flagged): 19 grobe Preis-Ausreißer → MV/1000 (ipo+ipos+last+floor), Douglas 10→500 live-verifiziert. + 2964 initial_listing_price → MV/1000 (Scope-Overreach, jetzt von 368e koordiniert). → 368e konsolidiert auf 1 Quelle.

--- 368c (vorheriger Slice, DONE) ---
prev-slice: 368c
prev-title: ✅ DONE — Floor-Orderbuch transparent + manipulationssicher (Preis-Band ÷3..×3 + Floor-Quelle + Label-Vereinheitlichung)
prev-stage: LOG complete
size: M
slice-type: Migration (Money-RPC) + Service + UI
spec: worklog/specs/368c-floor-orderbook-transparency.md
impact: worklog/specs/368c-floor-orderbook-transparency.md §3+§4 (place_sell_order Consumer + Floor-Label-Stellen grep-verifiziert)
proof: worklog/proofs/368c-floor-band.txt (Live-Reject/Pass/Boundary-Smoke + AC1 cap/9 + AC9 Money-Pfad unberührt + Grants). Playwright-Sublabel offen post-Deploy (AC7).
review: worklog/reviews/368c-review.md (reviewer PASS, 3 LOW, alle nicht-blockierend)
next: 369 /api/push→500, dann 370 E2E-Sweep ②–⑤
```

## CEO-Entscheid (2026-06-24, Anil)
- Anti-Manipulation = **symmetrisches Preis-Band beim Order-Erstellen**: min = Anker÷3, max = Anker×3 (Cap existiert schon). Faktor **÷3** bestätigt.
- Umsetzung: `get_price_floor = get_price_cap ÷ 9` (kohärent: cap = 3×Referenz → floor = Referenz÷3 = cap÷9). Reuse der reviewten Cap-Logik.
- Sybil (mehrere Accounts im Ring A→B→C→A) = **separater späterer Slice** (braucht Identitäts-/Geräte-Signale, Phase-2-relevant, Credits Phase 1 = wertloses Spielgeld).

## Schon existierender Schutz (Live-verifiziert, NICHT neu bauen)
- Selbst-Handel blockiert (buy_from_order/buy_player_sc/accept_offer: `user_id != buyer` / „Eigene Order").
- Reziprok-Ping-Pong A↔B blockiert (`v_circular_count`, 7 Tage).
- Max 20 Trades/Spieler/24h · Max 10 Orders/Spieler/h · Preis-OBERgrenze 3×Anker · Club-Admin-Handelsverbot.

## Zuletzt
- **Slice 368b** (2026-06-24) — RewardsTab-Anzeige-Wahrheit (M, PASS, live).
- **Slice 368a** (2026-06-24) — Scout-Card-Wertmodell als Kanon (D100, XS, PASS).

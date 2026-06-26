# Plattform-Treasury (BeScout-Topf) — Epic-Plan & Bau-Anker

> **Entstanden:** Session 2026-06-23, aus der Monats-Liga-e2e-Frage (Anker `357-preflight-monthly-leaderboard.md`).
> **Entscheidung (WARUM):** `memory/decisions.md` **D96**. **Kanon (WIE):** `docs/knowledge/domain/treasury.md` §10.
> **Status:** Wissen festgehalten, Bau startet nächste (frische) Session. Money/CEO-Scope → selbst bauen (§3).

## Kern-Befund (Live-verifiziert, D87)

Alle 6 Plattform-Fee-Anteile **verbrennen** — BeScout fängt heute 0 € seiner Fees auf. Kein Plattform-Konto existiert (nur `club_treasury_ledger` per-Club + `pbt_treasury`).

| Quelle | Plattform-% | RPC (live geprüft) | Verbrenn-Notiz-Spalte |
|---|---|---|---|
| Trading | 3,5 % | `buy_player_sc(uuid,uuid,integer,text)` | `trades.platform_fee` |
| IPO | 10 % | `buy_from_ipo(uuid,uuid,integer)` | `trades.platform_fee` |
| Polls | 20 % | `cast_community_poll_vote(uuid,uuid,integer)` | `community_poll_votes.platform_share` |
| Research | 20 % | `unlock_research(uuid,uuid)` | `research_unlocks.platform_fee` |
| Bounty | 5 % | `approve_bounty_submission(uuid,uuid,text)` | — (reward−creator_net, gar nicht notiert) |
| P2P | 2 % | `accept_offer(uuid,uuid)` | `trades.platform_fee` |

PBT-Anteile → `pbt_treasury` ✅ · Club-Anteile → `clubs.treasury_balance_cents` ✅ · **nur Plattform-Anteil verbrennt.**

## Anil-Festlegungen (diese Session)

1. **Geld aus Treasury, nicht minten** — aber Plattform-Topf existiert nicht → erst bauen.
2. **Monatsabschluss voll-automatisch per Cron** (Treasury-Quelle senkt Auto-Risiko; trotzdem Idempotenz + Deckungs-Check Pflicht).
3. **Scope-Expansion bewusst:** „Liga e2e zuerst" → Topf-Epic, weil Liga ohne Topf nicht sauber zahlbar.
4. **Events als Wettkampf sichtbar** (Saison/Monat) — Manager messen sich („BeScout Liga").
5. **`overall`-Median-Fix** (s. u.).
6. **Modell-Shift deflationär → zirkulär** abgesegnet.

## Bau-Sequenz (Fundament zuerst — kein Reward-Kanal vor seinem Konto)

### Slice 1 — Topf-Fundament (Money-Infra) — ✅ DONE (Slice 357, 2026-06-24)
> Gebaut: `platform_treasury` (Singleton-Lock `id boolean PK CHECK(id)`) + `platform_treasury_ledger` (append-only, `source` statt `type`) + `book_platform_treasury()`/`get_platform_balance()`/`get_platform_treasury_ledger()` + AdminTreasuryTab „Plattform-Topf"-Card + i18n DE+TR. **Variante A** (Saldo=SUM unter Singleton-Row-Lock, CEO-approved; Revisit B bei Millionen-Zeilen). **Kein Backfill** → Topf live bei 0. `source`-CHECK hält alle 8 Epic-Werte. Proofs: `worklog/proofs/357-*`. Review PASS.

- Tabelle `platform_treasury_ledger` (append-only, Mirror `club_treasury_ledger` aus Slice 329): direction credit/debit, source-Enum, amount, reference_id, description, created_at. **1 Topf** (kein per-X), evtl. Singleton-Row-Saldo oder reiner Ledger + SUM.
- RPC `book_platform_treasury(direction, source, amount, reference_id, description)` — Mirror `book_club_treasury`. AR-44 REVOKE/GRANT. Saldo-Lese-RPC `get_platform_balance()` (Ledger-SUM, race-frei unter Row-Lock — vgl. errors-db „Bank-Ledger balance_after").
- RLS: cron-only-Pattern (ENABLE RLS + 0 Policies, service_role bypassed) ODER Admin-SELECT. Kein Client-Write.
- Admin-Sichtbarkeit: `AdminTreasuryTab` um Plattform-Saldo + Kontoauszug erweitern (heute zeigt es Club-Treasury).
- **Pre-Spec:** Live-`pg_get_functiondef('book_club_treasury(...)')` als Blueprint lesen (D87).

### Slice 2 — Fees REIN (Money, eine Quelle pro Slice)
- **✅ TEIL 1 DONE — Trading (Slice 358, 2026-06-24):** `buy_player_sc` + **`buy_from_order`** (Code-Reading #5 fand den 2. Orderbuch-Pfad, live verkabelt `trading.ts:226`) → `book_platform_treasury('credit','trading',v_platform_fee,v_trade_id,…)`; `accept_offer` → source `'p2p'`. **Inline** (kein Trigger, spiegelt PBT/Club-Inline-Booking), `IF v_platform_fee > 0`-Guard. CREATE-OR-REPLACE = exakter Live-`functiondef` + je 1 Block (PATCH-AUDIT: Fee-Konstanten + Guards intakt). Force-Rollback-Smoke je Pfad PASS (Topf +350/+350/+200, Zero-Sum, Idempotenz keine Doppelbuchung). Reviewer PASS. Proofs `worklog/proofs/358-*`.
  - **⚠️ Nebenbefund (pre-existing, eigener Slice):** `accept_offer` side='sell' wirft `23514` — `'offer_buy'` fehlt im `transactions_type_check` (S330-Klasse). Live `offer_buy`-Count=0 → P2P-Sell-Offers seit jeher kaputt. 358-Booking unbeschädigt (läuft davor).
- **✅ TEIL 2 DONE — IPO (Slice 360, 2026-06-24):** `buy_from_ipo` → `book_platform_treasury('credit','ipo',v_platform_share,v_trade_id,'IPO-Fee (Erstverkauf)')`, inline nach PBT-Block. `'ipo'` im CHECK schon gedeckt (keine CHECK-Migration). Force-Rollback-Smoke PASS (Topf +1000 = 10 % von 10000, Zero-Sum 8500+1000+500, 1 Ledger-Row, sauberer Rollback). Reviewer PASS. Proof `worklog/proofs/360-money-smoke.txt`. **Nur EIN Pfad** (anders als 358: dort 2 Orderbuch-Pfade + P2P).
- **✅ TEIL 3 DONE — Polls (Slice 363, 2026-06-24):** `cast_community_poll_vote` → `book_platform_treasury('credit','poll',v_platform_share,p_poll_id,'Umfrage-Fee')`, inline NACH dem source-IF/ELSE (deckt BEIDE Branches: club + user), VOR `ELSE`-Reset, innerhalb `IF v_cost>0` + `IF v_platform_share>0`-Guard. Fee-Konstante `(v_cost*80)/100` verbatim (S356-Drift-Klasse abgesichert). `'poll'` im CHECK schon gedeckt. 2-Branch-Force-Rollback-Smoke PASS (Topf je +200 = 20 % von 1000, Zero-Sum 800+200, je 1 Ledger-Row, sauberer Rollback). AR-44 anon=false/authed=true. Reviewer PASS (2 NIT). Proof `worklog/proofs/363-money-smoke.txt`. **Erster Slice mit Booking, das 2 source-Branches deckt** (anders als 358/360 mit `v_trade_id`; hier `p_poll_id` als reference_id).
- **✅ TEIL 4 DONE — Research (Slice 364, 2026-06-24):** `unlock_research(uuid,uuid)` → `book_platform_treasury('credit','research',v_platform_fee,p_research_id,'Research-Fee')`, inline NACH transactions-INSERT, VOR success-RETURN. **Single-Path** (wie IPO 360, kein source-Branching). Fee-Konstante `(v_price * 80) / 100` verbatim (20 % Plattform). `'research'` im CHECK schon gedeckt. Force-Rollback-Smoke PASS (Topf +200 = 20 % von 1000, Zero-Sum 800+200, 1 Ledger-Row ref=research_id, sauberer Rollback). AR-44 anon=false. Reviewer PASS (1 NIT pre-existing/out-of-scope). Proof `worklog/proofs/364-money-smoke.txt`.
- **✅ TEIL 5 DONE — Bounty (Slice 365, 2026-06-24) — LETZTE QUELLE:** `approve_bounty_submission(uuid,uuid,text)` → `book_platform_treasury('credit','bounty',v_platform_fee,v_sub.bounty_id,'Bounty-Fee')`, inline NACH Einreicher-Payout + Status-Updates, VOR dem finalen success-RETURN, innerhalb `IF v_platform_fee>0`-Guard. `v_platform_fee` global vor dem `IF is_user_bounty` berechnet → **EINE Buchung deckt alle 3 Zahlungspfade** (user/club-escrow/club-nonescrow). Doppelbuchung ausgeschlossen: `trg_bounties_settle` bei 'completed' bewegt kein Geld (nur Flag-Flip). Fee-Konstante `(v_reward*500)/10000`=5 % verbatim, Header bewusst OHNE `SET search_path` (Original erhalten, `no_search_path_drift`-Assert), `'bounty'` im CHECK schon gedeckt. Force-Rollback-Smoke PASS (Pfad 1 user_bounty: Topf +50 = 5 % von 1000, Zero-Sum 950+50, 1 Ledger-Row ref=bounty_id, sauberer Rollback). AR-44 anon=false. Reviewer PASS (1 NIT optional). Proof `worklog/proofs/365-money-smoke.txt`.
- **🎯 SLICE 2 „FEES REIN" KOMPLETT (5/5 Quellen + P2P):** Trading 358 · IPO 360 · Polls 363 · Research 364 · Bounty 365. Alle Plattform-Fee-Ströme fließen real in den BeScout-Topf (voller Auffang 100 %, D98). **→ Nächster Track: Slice 3 Monats-Liga e2e (RAUS-Kanal).**
- **Money-Smoke je Quelle:** `BEGIN; …; ROLLBACK;` — Saldo vorher/nachher, Zero-Sum (Zahler-Abzug = Σ Empfänger inkl. Topf). Bei Guard-`auth.uid()`: in-txn `set_config('request.jwt.claim.sub', user, true)` + `RAISE EXCEPTION` für Output+Rollback (358-Technik).
- **✅ Entscheidung getroffen (D98, 2026-06-24):** **voller Auffang 100 %** (kein Teil-Burn/Cap). Gilt als Default für alle weiteren Quellen-Slices.

### Slice 3 — Monats-Liga e2e (Money) — ✅ TEIL 1 DONE (Slice 376, 2026-06-25): Payout-aus-Topf + Coverage + overall-Median + Genesis-Seed
> **Money-Core gebaut (Migration `20260625130000`):** `close_monthly_liga` zahlt jetzt zero-sum per `book_platform_treasury('debit','monthly_liga',v_total_paid,…)` (EINE Buchung nach Payout-Loop, Debit=actual-paid) statt zu minten. **Deckungs-Check** inline unter Singleton-Row-Lock (Befund D87: book_platform_treasury hat KEINEN Negativ-Guard; get_platform_balance ist admin-only+json → inline SUM stattdessen), `RAISE insufficient_treasury` bei Unterdeckung rollt Snapshots zurück → Monat retry-bar. **overall-Bug behoben:** `[2]=manager` → echter Median `(a+b+c)-GREATEST-LEAST` (ties-safe). **Cold-Start (Anil-Entscheid):** source-CHECK um `'genesis'` gewidert + **Genesis-Seed 500.000 Credits** (50.000.000 cents, idempotent) → Topf live 50.003.297 cents, deckt ~14,7 Monate. Reward-Konstanten 500000/250000/100000 byte-identisch. Force-Rollback-Smoke: Zero-Sum (total_paid=debit=pot_delta=3.400.000) + overall-Median=20≠30 + insufficient_treasury+0-Snapshots + month_already_closed alle PASS. Reviewer CONCERNS→Money PASS-grade. Proof `worklog/proofs/376-money-smoke.txt`, Review `worklog/reviews/376-review.md`.

- **⏸ Cron** (Auto-Monatsabschluss): **bewusst aufgeschoben** — Anil-Entscheid 2026-06-25 „erst manuell" (Admin-Button in AdminLigaTab bleibt Trigger). Eigener Folge-Slice wenn das Topf-Modell sich gesetzt hat.
- **⏸ Live-Standing-UI** (laufender Monat, der Engagement-Anreiz): eigener UI-Slice. `useMonthlyLeaderboard`+`getMonthlyLeaderboard` (`scoutScores.ts:216`, console.error+return → swallow→throw bei Verkabelung heilen) liegen bereit aber 0 UI-Konsumenten; laufenden Monat aus `scout_scores.x − season_start_x` live ranken + Countdown.
- **Ist-Stand nach 376:** Money-Pfad zirkulär live. 0 echte Snapshots/Winners (noch kein echter Monatsabschluss geklickt). `liga_reward` im transactions-CHECK ✅.

### Slice 4 — BeScout-Events aus Topf (Money) — ✅ DONE (Slice 377, 2026-06-25)
- `type='bescout'`-Events zahlen Prize aus Plattform-Topf (Reconcile Minting→Topf, mirror Slice 331 Club-Event-Escrow). Löst treasury.md §7 „bescout mintet weiter" ab.
- **Gebaut (Migration `20260625140000`, CEO-approved Escrow-Modell):** 3 Event-Trigger (escrow/settle/resync) um additiven `type='bescout'`→`platform_treasury`-Zweig erweitert; `score_event` UNANGETASTET (331-Philosophie). Escrow-Debit bei INSERT + Deckungs-Check inline unter `platform_treasury FOR UPDATE` (book hat keinen Negativ-Guard) + `RAISE platform_treasury_insufficient` (D103 Hard-Gate). Settle: Rest (ended) / voll (cancelled) zurück an Topf je `NEW.type`. Resync: zwei-Treasury-Generalisierung (held OLD-type-diskriminiert vs. target NEW, Delta je Treasury) — deckt type-Switch club↔bescout, Refund an Halter `OLD.club_id`. `bescout_event`-source seit 357 im CHECK → keine CHECK-Migration. Kein src/i18n-Change (Label seit 357).
- **Zero-Sum:** Escrow −P, score_event mintet +D (Wallets), Settle +(P−D) → Netto Topf −D = Wallets +D = Σ 0. 8/8 Force-Rollback-Smokes PASS (`worklog/proofs/377-money-smoke.txt`), Reviewer **PASS** (1 LOW pre-existing club_id-Hole dokumentiert). 0 prized bescout/club Events live → kein Live-Geld. Learning → errors-db.md (Multi-Treasury-Refund an OLD.tenant_id).
- **→ special-Events vorgezogen (Slice 378, 2026-06-25):** Anil-Wahl „Reste komplett". Plattform-Zweig der 3 Trigger auf `type IN ('bescout','special')` erweitert + eigene source `'special_event'` (CHECK-Widen + Label + i18n), Refund-source nach OLD.type (Halter). 9/9 force-rollback PASS, Reviewer PASS. bescout-Regression-safe (source-CASE). **Noch minting:** `sponsor` (Deposit-Pfad fehlt), `creator` (Phase 4) — je eigener Slice.

### ✅ RAUS-Seite end-to-end REAL bewiesen — Monats-Liga (Slice 402, 2026-06-26)
> Der substantielle e2e-Gap aus Audit 401 ist **geschlossen**. `close_monthly_liga('2026-05-01')` auf Live ausgeführt (CEO-approved Anil): `total_paid 3.575.000 cents` (35.750 Cr: 34.000 global + 1.750 Bundesliga-Manager). **Zero-Sum bewiesen:** Topf 50.018.397→46.443.397 = Σ 15 liga_reward-Tx = **erste echte `monthly_liga`-Debit-Row** (3.575.000). 15 winners + 515 snapshots. Proof `worklog/proofs/402-raus-liga-payout.txt`. Mai 2026 idempotent-gesperrt (permanent).
> **🚩 2 Smells (TODO P2, Launch-relevant):** globale Dims zahlen fix nach Rang ohne Mindest-Delta>0 · overall+3 Einzel-Dims überschneiden (4×-Kassieren).
> **⏳ Noch offen (analog, niedriger):** 1× echter `bescout`/`special`-Event-Settle für die anderen 2 RAUS-Kanäle (377/378) — gleiches Muster, sobald ein prized bescout/special-Event live durchläuft.

### Slice 5 — Wettkampf-Darstellung + Ranking-Konsolidierung (UI) — **→ NÄCHSTER**
- `special`/`bescout`/`club`-Event-Geldquellen jetzt alle aus dem jeweiligen Konto (`sponsor`/`creator` bleiben minting, eigene Slices).
- Events als „BeScout Liga" mit Monats-/Saison-Wertung sichtbar (Manager messen sich). `events.is_liga_event` existiert bereits als Anker.
- Die 7 `/rankings`-Boards entwirren: „Diese Saison/Monat" (lebendig) vs „Ewig/Global"; Spieler-Ranking (rankt Karten, keine User) thematisch trennen.
- Bezug S7-Tracker `worklog/s7-phase3-remaining.md` Block #2 (Leaderboard-Konsolidierung) + `scout_scores`↔`user_stats`-Redundanz.

## Wichtige Fakten fürs Spec (nicht neu erarbeiten)
- `close_monthly_liga(date)` Signatur + Body: live gelesen 2026-06-23. Idempotent via `monthly_liga_snapshots`-Existenz.
- `getMonthlyLeaderboard(month,dimension)` (`scoutScores.ts:216`) + `useMonthlyLeaderboard` (`gamification.ts:69`) = liest abgeschlossene Snapshots; `getMonthlyLeaderboard` hat `console.error`+`return []` Silent-Fail → bei Verkabelung swallow→throw heilen.
- `MonthlyWinners.tsx` (live auf `/rankings`) zeigt Sieger; leer weil nie abgeschlossen.
- `AdminLigaTab.tsx` hat den manuellen `close_monthly_liga`-Button (bleibt als Backup neben Cron).
- Project-Ref Supabase: `skzjfhvgccaeplydsunz` (beScout-App, ACTIVE).

## Money-Muster (bewährt 329–332, Pflicht hier)
Live-`pg_get_functiondef` VOR Spec (D87) · trigger-/RPC-zentrisch · Guard `ledger_net` unter Row-Lock · `pg_get_constraintdef` gegen CHECK-Drift · force-rollback-Smokes · Reviewer-Pflicht · Pre-Push silent-fail-Gate + CI volle Tests (D94).

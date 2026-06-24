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
- **← OFFEN: restliche Quellen** (je eigener Slice, gleiches Inline-Muster): Polls `cast_community_poll_vote`→'poll' (Spalte `platform_share`) · Research `unlock_research`→'research' · Bounty `approve_bounty_submission`→'bounty' (heute gar nicht notiert, Differenz reward−creator_net).
- **Money-Smoke je Quelle:** `BEGIN; …; ROLLBACK;` — Saldo vorher/nachher, Zero-Sum (Zahler-Abzug = Σ Empfänger inkl. Topf). Bei Guard-`auth.uid()`: in-txn `set_config('request.jwt.claim.sub', user, true)` + `RAISE EXCEPTION` für Output+Rollback (358-Technik).
- **✅ Entscheidung getroffen (D98, 2026-06-24):** **voller Auffang 100 %** (kein Teil-Burn/Cap). Gilt als Default für alle weiteren Quellen-Slices.

### Slice 3 — Monats-Liga e2e (Money + UI)
- **Geld:** `close_monthly_liga` Reward-Auszahlung aus Topf (`debit` via `book_platform_treasury` statt Minting) + **Deckungs-Check** (Topf-Saldo ≥ Σ Rewards, sonst sauberer Fehler) + Idempotenz bleibt (Snapshot-Guard).
- **`overall`-Bug-Fix:** RPC rankt `overall` heute nach `(ARRAY[trader,manager,analyst])[2]` = **nur manager_score**, nicht Median. Auf Median (sortierte Mitte der 3 Deltas) umstellen. Money-korrekt → eigene Verifikation.
- **Cron:** Vercel-Cron (max 300s, Pro 40 Jobs) feuert `close_monthly_liga(Vormonat)` am 1. — Idempotenz schützt vor Doppel-Lauf. Fail-Isolation.
- **Live-Standing-UI (der eigentliche Anreiz):** NEUE Read-Query — Snapshots existieren erst NACH Abschluss, also laufenden Monat aus `scout_scores.x − season_start_x` live berechnen, ranken. Zeigen: „du bist #N diesen Monat" + „+X bis Platz 3" + Countdown bis Monatsende. Pro Dimension (welche zeigen? overall + 3, oder Tabs).
- **Ist-Stand live:** 0 Snapshots / 0 Winners (nie gefeuert). `liga_reward` im `transactions`-CHECK ✅. Mintet heute 34.000 $SCOUT/Monat (5.000/2.500/1.000 × 4 Dim). Season aktiv „2025/26" 01.08.2025–31.05.2026.

### Slice 4 — BeScout-Events aus Topf (Money)
- `type='bescout'`-Events zahlen Prize aus Plattform-Topf (Reconcile Minting→Topf, mirror Slice 331 Club-Event-Escrow). Löst treasury.md §7 „bescout mintet weiter" ab.

### Slice 5 — Wettkampf-Darstellung + Ranking-Konsolidierung (UI)
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

# Slice 410 — Club-Treasury-Ledger: korrekte Quellen-Labels (ipo_fee / p2p_fee)

**Slice-Type:** Migration (Money/CEO — SECURITY DEFINER Trigger-Funktion)
**Größe:** S
**Welle:** 1 Trading (Mock→Pro) — Abschluss-Kleinkram (Mini-Slice IPO-Ledger-Label, Anil-approved 2026-06-27) + kohärente P2P-Erweiterung

## 1. Problem-Statement (Evidence)
Live-Befund (D87, `pg_get_functiondef`): Der AFTER-INSERT-Trigger `trg_trades_book_club_treasury()` bucht **jeden** `trades`-INSERT pauschal als `book_club_treasury(..., type='trade_fee', desc='Trade-Fee')`. Aber drei verschiedene RPCs schreiben in `trades`:
- `buy_from_ipo` → **IPO-Erstverkaufs-Anteil (85 %)**, setzt `ipo_id` (813 Live-Trades)
- `buy_from_order`/`buy_player_sc` → **Markt-Orderbuch-Trade (1 % Fee)**, setzt `sell_order_id` (78)
- `accept_offer` → **P2P-Kaufgebot (1 % Fee)**, setzt KEINEN Marker (alle NULL) (1)

→ Im Club-Kontoauszug (`get_club_treasury_ledger` → `AdminWithdrawalTab`) erscheint ein **IPO-Erstverkaufs-Erlös** (Großbetrag) als „Handelsgebühr". Doppelt falsch: falsches Event **und** Erlös-statt-Gebühr-Framing. Mock→Pro-Smell „Teil-Konsolidierung": die ganze richtige Label-Infrastruktur ist gebaut, nur der Trigger nutzt sie nicht.

Quelle des Smells: Slice-406-Note (`session-handoff.md`): „IPO-Share wird im Ledger als type 'trade_fee' statt 'ipo_fee' gebucht (Geld korrekt, nur Label)."

## 2. Lösungs-Design
`CREATE OR REPLACE` des Triggers `trg_trades_book_club_treasury()` mit Discriminator über die `trades`-Marker (live-verifiziert, code-level beweisbar — siehe §7):
```
IF NEW.ipo_id IS NOT NULL                                  → 'ipo_fee'   'Erstverkauf-Anteil (85%)'
ELSIF NEW.buy_order_id IS NOT NULL OR sell_order_id …      → 'trade_fee'  'Trade-Fee'           (unverändert)
ELSE (alle Marker NULL = nur accept_offer)                 → 'p2p_fee'    'Kaufgebot-Fee'
```
Kein Schema-Change, kein neuer Wert-Constraint (type ist freies TEXT, **kein** CHECK).

## 3. Betroffene Files
- `supabase/migrations/20260627170000_slice_410_club_ledger_source_labels.sql` (NEU, einzige Code-Änderung)
- **Kein** Service/Type/UI/i18n-Change nötig (alles vorab vorhanden — siehe §4).

## 4. Code-Reading-Liste (erledigt VOR Spec, D87)
1. **Live** `trg_trades_book_club_treasury()` — bucht hart `'trade_fee'`. ✅ Quelle des Bugs.
2. **Live** `buy_from_ipo` / `buy_player_sc` / `accept_offer` trades-INSERT-Spalten — Marker-Beleg: ipo_id / sell_order_id / keiner. ✅
3. **Live** `get_club_balance` — Bucket `v_trade_fees` = `type IN ('trade_fee','ipo_fee','p2p_fee','opening_trade_fees')` → **neue Labels schon im selben Topf = geldneutral**. ✅ kritischster Consumer.
4. `AdminWithdrawalTab.tsx:12-13,48` — `KNOWN_LEDGER_TYPES` enthält bereits `ipo_fee`+`p2p_fee`, rendert `t('ledgerType.${type}')`. ✅ kein Roh-Key-Leak.
5. `messages/{de,tr}.json` `ledgerType.ipo_fee`/`p2p_fee` — existieren beide. ✅ kein MISSING_MESSAGE.
6. CHECK auf `club_treasury_ledger.type` — **keiner** (freies TEXT). ✅ kein Constraint-Widen.

## 5. Pattern-References
- **S406** (errors-db.md) — Club-Treasury Ledger = kanonische Single-Source; dieser Trigger ist der einzige Schreiber des Club-Fee in den Ledger.
- **D87** — Live-functiondef VOR Spec (Money). Erfüllt.
- **S330/S379** — Multi-Gate-Enum-Drift: hier umgekehrt entlastend (kein CHECK auf type, kein Drift-Risiko); `get_club_balance`-IN-Liste ist die einzige Konsum-Gate-Fläche und deckt beide neuen Werte bereits ab.
- **database.md AR-44-Ausnahme** — Trigger-Funktionen brauchen kein REVOKE/GRANT (nur via TRIGGER aufgerufen).

## 6. Acceptance Criteria (executable)
- **AC1** Trigger-Body live enthält die 3-Wege-Verzweigung (`def ILIKE '%ipo_fee%' AND ILIKE '%p2p_fee%'`).
- **AC2** force-rollback: fake IPO-Trade (`ipo_id` gesetzt, `club_fee>0`, Spieler mit club_id) INSERT → Ledger-Row `type='ipo_fee'`.
- **AC3** force-rollback: fake Markt-Trade (`sell_order_id` gesetzt) INSERT → Ledger-Row `type='trade_fee'` (Regression-Beweis, Bestands-Pfad unverändert).
- **AC4** force-rollback: fake P2P-Trade (alle Marker NULL) INSERT → Ledger-Row `type='p2p_fee'`.
- **AC5** Zero-Sum über alle 3 Inserts: `Σ(wallet.balance)+platform_net+club_ledger_net+Σpbt` ist durch reines Re-Labeln **unverändert** (der Betrag landet identisch im Ledger; nur das `type`-Feld differiert) → club_ledger_net delta == Σ club_fee.
- **AC6** ACL unverändert (`proacl` der Funktion vor==nach; CREATE OR REPLACE erhält ACL, S368c).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| `club_fee = 0`/NULL | Trigger no-op (RETURN NEW vor Booking) — unverändert |
| Spieler ohne `club_id` | no-op (v_club_id NULL) — unverändert |
| Markt-Buy-Order (FEATURE_BUY_ORDERS später an) → `buy_order_id` gesetzt | ELSIF fängt es → `trade_fee` (robust gegen gated Feature) |
| qty>1 IPO | club_fee ist Gesamt-Anteil (price×qty-basiert), 1 Ledger-Row — unverändert |
| Historische 7 `trade_fee`-Rows (5007 cents) | **bewusst NICHT backfillen** — append-only Ledger-Hygiene (Sorare-Niveau: Historie nicht umschreiben, fix-forward); konsistent mit CEO-Entscheid 249.800-cents „stehen lassen" |

## 8. Self-Verification Commands
- `pg_get_functiondef('public.trg_trades_book_club_treasury()'::regprocedure)` → 3-Wege-Branch sichtbar (AC1).
- force-rollback `DO`-Block (BEGIN; 3 fake-Trades insert; SELECT type; RAISE 'REPORT >>> %') → AC2-AC5.
- `SELECT proacl FROM pg_proc WHERE proname='trg_trades_book_club_treasury'` vor==nach (AC6).
- `npx tsc --noEmit` (Voraussetzung; kein TS-Change erwartet).

## 9. Open-Questions
- **Geklärt (Anil 2026-06-27):** IPO-Ledger-Label = approved Mini-Slice. P2P-Label = identischer Trigger, geldneutral, Bucket+UI+i18n vorhanden → in denselben Fix gefaltet (CTO-Entscheid, transparent gemeldet; kein eigener Slice für eine 2. Zeile am selben Trigger).
- **Autonom:** desc-Texte (`'Erstverkauf-Anteil (85%)'`/`'Kaufgebot-Fee'`) — Sekundärzeile, neutral, kein Compliance-Risiko (kein Securities/Glücksspiel-Vokabular).

## 10. Proof-Plan
`worklog/proofs/410-ledger-labels-smoke.txt` — force-rollback-`DO`-Block Output (AC2-AC5) + `pg_get_functiondef`-Auszug (AC1) + proacl-Diff (AC6).

## 11. Scope-Out
- **Kein** Backfill der 7 historischen `trade_fee`-Rows (s. §7).
- **Keine** Änderung an `get_club_balance`-Bucket-Semantik („IPO-85 %-Erlös fließt in `trade_fees`-Bucket" ist bestehende Design-Entscheidung — als Smell-Notiz an Anil, nicht hier gefixt).
- **Keine** i18n-Label-Umbenennung (`ipo_fee`=„Erstverkauf-Gebühr" bleibt; „Gebühr" vs „Erlös" = separate Wording-Frage, CEO/Compliance).

## 12. Stage-Chain (geplant)
SPEC → IMPACT (inline, §4 — kein Service/UI/Type-Shape-Change) → BUILD (1 Migration) → REVIEW (Reviewer-Agent, Money-Pflicht) → PROVE (force-rollback) → LOG.

## 13. Pre-Mortem (S, optional — 3 Szenarien)
1. **„p2p_fee fällt aus dem Saldo"** → widerlegt: `get_club_balance` listet `p2p_fee` bereits im `v_trade_fees`-Bucket. AC5 beweist Zero-Sum.
2. **„else-Zweig fängt versehentlich Markt-Buys"** → widerlegt: `buy_player_sc`/`buy_from_order` setzen IMMER `sell_order_id` (Live: 78/78); nur `accept_offer` lässt alle Marker NULL (Code-level eindeutig).
3. **„ACL/Grants kaputt durch Replace"** → Trigger-Funktion, CREATE OR REPLACE erhält ACL (S368c); AC6 verifiziert.

# Next-Session Briefing (2026-04-18)

> Erstellt Ende Session 2026-04-17 (13 Slices 032-043, alle green auf bescout.net).
> Ersetzt den vorigen Stand dieser Datei.

## Wie der Code aktuell steht

- 28 DB-Invariants gruen inkl. INV-30 leere Allowlist
- Money-Path live verified: Buy, Sell+Cancel, P2P-Offer+Cancel, Event-Join+Unlock
- 0 console-errors auf Buy-Path (vorher 14×)
- bescout.net produktiv, alle 13 Slices committed + gepusht
- Pipeline `worklog/active.md`: leer, status=idle

## User-priorisierte Restarbeit (aus Abschluss-Gespraech)

Diese 5 Punkte sind explizit gesetzt fuer die naechste Session:

### 1. A-02 Vollstaendiger auth.uid() Body-Audit
- Heute: REVOKE-Layer schuetzt, aber nicht alle SECURITY-DEFINER-RPCs mit p_user_id haben body-Guards
- Ansatz: alle 124 SECURITY DEFINER pro RPC pruefen. INV-21 existiert schon (Slice 005), aber nicht auf ALLE ausgedehnt
- Output: jede RPC hat entweder `IF auth.uid() IS NOT NULL AND IS DISTINCT FROM p_user_id` ODER explizite Dokumentation warum nicht
- Grobe Groesse: M (1-2h) — viele RPCs sind trivial-OK, 5-10 koennten fehlen

### 2. A-03 Systematisches RLS-Audit aller Kern-Tabellen
- Heute: 3 Luecken bekannt gefixt (transactions public-whitelist, activity_log, scout_card_blocking)
- Ansatz: `SELECT tablename, policyname, cmd, qual FROM pg_policies` — jede Tabelle gegen Erwartungen matchen
- INV-26 (Slice 019) scant nur Whitelist — erweitern auf vollstaendige Matrix
- Grobe Groesse: M — systematisches Durcharbeiten

### 3. A-04 Live-Balance-Health SUM(transactions) == wallet.balance
- Heute: Laufzeit-Konsistenz nicht verifiziert. Single-Query, potenziell grosse Finding
- Ansatz: `SELECT user_id, wallet_balance, SUM(transactions.amount) AS tx_sum, diff FROM wallets w LEFT JOIN ... GROUP BY ... WHERE diff != 0`
- Wenn 0 Users drift: einfacher INV-Test. Wenn N Users drift: root-cause investigation pro User
- Grobe Groesse: S-M (abhaengig von Finding)

### 4. TR-i18n fuer RPC-Notifications
- Heute: DB-RPCs schreiben hardcoded DE-Strings in notifications.title+body. UI rendert 1:1, keine Client-i18n-Layer
- Betroffene RPCs: award_dimension_score, send_tip, reward_referral, approve_bounty_submission, calculate_ad_revenue_share, calculate_creator_fund_payout, ... (min. 10)
- 2 Optionen:
  - (a) **Structured-Key-Notifications**: RPCs emittieren `type + i18n_key + params` (z.B. `{key: 'notif.rang_up', params: {role: 'trader', rang: 'silber-1'}}`). Client resolved via `useTranslations`. Refactor ~10-15 RPCs + DE/TR labels + NotificationDropdown.
  - (b) **TR-Locale-Client-Layer**: Message-Catalog client-side als Key-Lookup gegen DE-Text (fragil). Nicht empfohlen.
- Empfehlung: (a). Grobe Groesse: L (2-3h fuer sauberen Refactor)

### 5. Historische Notifications umschreiben
- Heute: Slice 043 fixte RPC-Bodies, aber existing notifications mit "Trader"/"BSD" bleiben
- Ansatz: Migration mit UPDATE statements auf notifications WHERE title/body ILIKE '%Trader%'/'%BSD%'
- Risiko: User sieht plötzlich geänderte History — kosmetisch, User verstehen das
- Grobe Groesse: XS (1 Migration, 10-20 Rows betroffen)

---

## GELB aus dem Walkthrough-Plan (2026-04-16, archiviert) — noch offen

Ausser A-02 + A-03 + A-04 sind diese GELBs aus `memory/_archive/2026-04-meta-plans/walkthrough/` noch offen. **Nicht vom User als muss-tun priorisiert**, aber wert zu erwaehnen:

| ID | Thema | Pilot-Risiko | Wenn angefasst |
|----|-------|--------------|----------------|
| A-07 | Schema-Drift (RPC-Response vs Service-Cast) | mittel — Mystery-Box Bug (2026-04-11) war so einer | INV-23 existiert, breitere Coverage |
| B-01 | Datenquellen Floor-Price (staleTime 2min) | niedrig — akzeptabel fuer Beta | getRealtime-subscription auf orders, oder staleTime reduzieren |
| B-02 | Service Return-Type Konsistenz | niedrig — 117 Error-Semantik-Fixes (2026-04-13) done, Types-Consistency noch nicht | Grep alle services, Return-Types matchen |
| B-03 | UI Mixing (Components mit lokaler Logic) | niedrig — Pattern dokumentiert | PlayerKPIs + TradingCardFrame extrahieren auf Service-Layer |
| B-06 | Error-States fuer Community+Fantasy | niedrig — Trading-Chain verifiziert | Analog Trading: Service throws → te(key) Chain pruefen |

## Slice-Vorschlaege (wenn du durchgehen willst)

### Variante 1 — User-Fokus (Security-Audit-Wave)
```
044: A-02 body-Audit + INV-31 (extended) fuer alle SECURITY DEFINER mit p_user_id
045: A-03 RLS-Matrix komplett (INV-26 erweitern)
046: A-04 Live-Ledger-Health Query + INV-Test
047: Historische Notifications umschreiben (XS)
048: TR-i18n structured notifications (L — evtl. in 2 Slices teilen)
```
Gesamt: 5 Slices, ~6-10h

### Variante 2 — Broad Sweep (inkl. Walkthrough-Rest)
Variante 1 + dann:
```
049: A-07 RPC-Response-Shape-Audit
050: B-02 Service Return-Type-Konsistenz
051: B-06 Error-Chains fuer Community+Fantasy (analog Trading)
052: B-03 UI-Mixing-Extraktion (PlayerKPIs + TradingCardFrame)
053: B-01 Realtime-Orders fuer Floor-Price (niedrige Prio)
```
Gesamt: 10 Slices, ~15-20h

## Einstieg

1. Morgen-Briefing lesen (SessionStart-Hook)
2. `memory/session-handoff.md` (auto-generiert)
3. Diese File (ausfuehrlicher Kontext)
4. Entscheidung: welche Variante / welcher Slice zuerst?

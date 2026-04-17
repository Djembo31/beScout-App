# Slice 027 — activityHelpers TR-i18n (4 fehlende transaction-types)

**Groesse:** S · **CEO-Scope:** ja (TR-i18n) · **Approval:** TR-Labels bestaetigt 2026-04-17

## Ziel

User-facing Transactions-History: Raw-String-Leak fuer 4 DB-transaction-types (`subscription`, `admin_adjustment`, `tip_send`, `offer_execute`) beheben. activityHelpers.ts ergaenzen + DE/TR-Labels.

## Briefing-Korrektur

Briefing Session 3 sagte "10 neue DB-transaction-types ohne Labels". Live-DB-Audit ergab **4** fehlende types. Die uebrigen 10+ Keys in activityHelpers sind bereits lokalisiert (28 Keys total, 28 DE+TR Labels vorhanden).

## Betroffene Files

| File | Was |
|------|-----|
| `src/lib/activityHelpers.ts` | +4 Branches in `getActivityIcon`, `getActivityColor`, `getActivityLabelKey` |
| `messages/de.json` (`activity` namespace) | +4 Keys: `subscription`, `adminAdjustment`, `tipSend`, `offerExecute` |
| `messages/tr.json` (`activity` namespace) | +4 Keys analog |
| `src/lib/activityHelpers.test.ts` | +4 Test-Cases (falls Test-Pattern die expected icons/keys checkt) |

## Acceptance Criteria

1. Rufe `getActivityLabelKey('subscription')` → returnt `'subscription'` (neuer key)
2. Analog fuer `admin_adjustment` → `'adminAdjustment'`, `tip_send` → `'tipSend'`, `offer_execute` → `'offerExecute'`
3. DE-Labels: "Club-Abo", "Admin-Anpassung", "Tipp gesendet", "Gebot ausgefuehrt (Kauf)"
4. TR-Labels: "Kulüp Aboneliği", "Admin Ayarlaması", "Bahşiş gönderildi", "Teklif yürütüldü (Alım)"
5. Icons: `subscription`→'Users' (abo=community), `admin_adjustment`→'Settings', `tip_send`→'Coins', `offer_execute`→'CircleDollarSign' (analog offer_buy)
6. Colors: konsistent mit semantik — subscription=gold (paid), admin_adjustment=purple (system), tip_send=rose (outflow), offer_execute=gold (inflow)
7. tsc clean + activityHelpers.test.ts gruen

## Edge Cases

1. **Casing:** DB nutzt snake_case (`admin_adjustment`), JS-Key camelCase (`adminAdjustment`) — getActivityLabelKey macht die Uebersetzung
2. **Unknown future types:** Default-Fallback `return type` im getActivityLabelKey bleibt — raw-string als graceful-fallback
3. **Offer_execute vs offer_buy:** offer_execute ist der Seller-Side bei `side='buy'` (v_offer.side='buy' im accept_offer RPC) — de/tr label "(Kauf)" aus Benutzer-Perspektive

## Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/027-diff.txt` | `git diff --stat` showing 3 Files changed |
| `worklog/proofs/027-tsc.txt` | tsc clean |
| `worklog/proofs/027-tests.txt` | activityHelpers.test.ts + affected tests gruen |

## Scope-Out

- **History-Tx-Backfill** — existing rows behalten raw type, aber UI-Render via `t(getActivityLabelKey(row.type))` zeigt translated label.
- **Mehrweitiger transaction-type-Audit** — nur die 4 aktuell bekannten. Kein proaktiver Sweep auf zukuenftige types.

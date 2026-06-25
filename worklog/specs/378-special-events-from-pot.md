# Slice 378 — special-Events zahlen Prize aus dem Plattform-Topf (E3 RAUS-Kanal #3)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (Money-Trigger) + UI-Label + i18n · **Scope:** CEO-approved (Anil 2026-06-25, AskUserQuestion: „special-Events aus Topf") · **Datum:** 2026-06-25

> Enger Spiegel von Slice 377 (bescout). CTO-Entscheid (das „wie"): eigene Ledger-Quelle `special_event` statt `bescout_event` mitzubenutzen → Kontoauszug bleibt herkunfts-ehrlich. Money-Verhalten identisch zu 377.

## 1. Problem Statement

`type='special'`-Events zahlen ihren Prize per **reinem Minten** (`score_event` → Wallets, kein Konto belastet) — gleiche Klasse wie bescout vor 377. treasury.md §7 markiert `special` als „vermutl. Plattform, ❌ später". Anil (2026-06-25): special = plattform-finanziert, aus dem Topf. Dritter RAUS-Kanal nach Monats-Liga (376) + bescout-Events (377).

**Evidence:** Live-Count `special`=39 Events, **0 prized, 0 escrowed** → sauberer Boden, 0 Live-Geld in Gefahr. Plan `worklog/notes/358-platform-treasury-epic.md` Slice 5-Vorzug (special vorgezogen, da trivialer 377-Spiegel).

## 2. Lösungs-Design (Architektur)

Identisches Escrow-Modell wie 377 (CEO-approved), `score_event` UNANGETASTET. Die 3 Event-Trigger werden so erweitert, dass der **Plattform-Zweig beide platform-finanzierten Typen** abdeckt: `NEW.type IN ('bescout','special')`. Die Ledger-`source` wird per CASE gewählt: `special`→`'special_event'`, sonst `'bescout_event'`.

**Geldfluss special-Event = identisch 377:** Escrow −P bei INSERT (Deckungs-Check + D103 Hard-Gate) · score_event mintet +D · Settle +(P−D) → Netto Topf −D, zero-sum.

**Änderungen:**
1. **source-CHECK widern** (`platform_treasury_ledger_source_check` DROP/ADD, mirror 376-genesis) um `'special_event'`.
2. **`trg_events_escrow_prize`** — Plattform-Zweig `ELSIF NEW.type = 'bescout'` → `ELSIF NEW.type IN ('bescout','special')`, book-source per CASE.
3. **`trg_events_prize_settle`** — Refund-Zweig `ELSIF NEW.type = 'bescout'` → `IN ('bescout','special')`, source per CASE.
4. **`trg_events_resync_prize_escrow`** — `v_held_plat`/`v_tgt_plat`-CASE von `= 'bescout'` → `IN ('bescout','special')`; book-source per CASE.
5. **AdminTreasuryTab** `SOURCE_LABEL_KEY` + Map: `special_event: 'platformPotSrcSpecialEvent'`.
6. **i18n** `platformPotSrcSpecialEvent` DE „Sonder-Event" / TR „Özel Etkinlik".

**Resync-Edge (cosmetisch, dokumentiert):** type-Switch bescout↔special bei gleichem Betrag → `v_delta_plat=0`, kein Booking; die ursprüngliche Escrow-Row behält ihre alte source. Money korrekt (Geld ist im Topf), nur Label-Herkunft der Altzeile bleibt. Kein realer Admin-Flow.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260625150000_slice378_special_events_from_pot.sql` | NEU | CHECK-Widen + 3× CREATE OR REPLACE (escrow/settle/resync). |
| `src/app/(app)/bescout-admin/AdminTreasuryTab.tsx` | EDIT | `special_event`→Label-Key in SOURCE_LABEL_KEY-Map. |
| `messages/de.json` + `messages/tr.json` | EDIT | `platformPotSrcSpecialEvent` DE+TR. |

**Greps:** `grep -rn "trg_events_escrow_prize\|_prize_settle\|_resync_prize_escrow" supabase/` (nur Migrationen) · `grep -n "platformPotSrc\|SOURCE_LABEL_KEY" src/app/(app)/bescout-admin/AdminTreasuryTab.tsx`.

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — ✅ gelesen 2026-06-25

| File / Objekt | Zweck | Befund |
|------|-------|--------|
| Live 3 Event-Trigger (post-377) | Baseline = Slice 377-Stand | bescout-Zweig vorhanden; erweitere auf IN ('bescout','special'). |
| `pg_get_constraintdef platform_treasury_ledger_source_check` (LIVE) | CHECK-Wahrheit | enthält bescout_event/genesis, NICHT special_event → widern. |
| `20260625130000_slice376...sql` Z.8-10 | CHECK-Widen-Muster | DROP/ADD ARRAY-Pattern. |
| `20260625140000_slice377...sql` | Spiegel-Vorlage | exakte Trigger-Struktur. |
| `AdminTreasuryTab.tsx:64-72` | Label-Map | `SOURCE_LABEL_KEY` + Fallback `key?t(key):source` (kein Crash). |
| `messages/{de,tr}.json` platformPotSrc* | i18n-Muster | bescout_event DE „BeScout-Event"/TR „BeScout Etkinliği" als Vorbild. |
| `db-invariants.test.ts` | Test-Coupling | trackt platform_treasury_ledger source NICHT → kein Update. |
| `score_event` (LIVE, aus 377) | NICHT ändern | mintet weiter, durch Escrow gedeckt. |

## 5. Pattern-References

- **D96/D98/D103** — Topf-RAUS, voller Auffang, Hard-Gate. **D87** — Live-functiondef VOR Spec.
- **Slice 377** — direkter Spiegel (Escrow-Modell, zwei-Treasury-Resync).
- `errors-db.md` „Escrow-bei-INSERT … Multi-Treasury-Generalisierung (S377)" — Refund an OLD.tenant_id, tenant_id-only-Edit-Lücke.
- `errors-db.md` „status/type-CHECK-Drift" — `pg_get_constraintdef` gegen RPC-Literale; CHECK-Widen additiv.
- `errors-db.md` „CREATE OR REPLACE PATCH-AUDIT" — Baseline=Live-377-Body, club+bescout byte-erhalten.

## 6. Acceptance Criteria

```
AC-01: [HAPPY-ESCROW] special-Event prize=10000, Topf gedeckt
  VERIFY: BEGIN; INSERT events(type='special',prize_pool=10000,...); ROLLBACK;
  EXPECTED: prize_escrowed=true; Topf -10000; 1 Ledger-Row debit source='special_event' ref=event.id
  FAIL IF: source != 'special_event' ODER kein Escrow ODER Topf unverändert

AC-02: [ERROR-COVERAGE] special prize > Topf
  EXPECTED: RAISE platform_treasury_insufficient_for_event_prize; kein Event
AC-03: [SETTLE-ENDED] special prize=10000, Distribution 8000 → ended
  EXPECTED: Topf +2000 credit source='special_event'; net -8000; escrowed=false
AC-04: [SETTLE-CANCELLED] special prize=10000 → cancelled
  EXPECTED: Topf +10000 (voll); net 0; escrowed=false
AC-05: [RESYNC-AMOUNT] special prize 10000→15000
  EXPECTED: Topf zusätzlich -5000 (special_event debit); total -15000; escrowed=true
AC-06: [REGRESSION-BESCOUT] bescout-Event weiterhin source='bescout_event'
  EXPECTED: bescout escrow bucht source='bescout_event' (nicht special_event); Slice-377-Verhalten unverändert
AC-07: [REGRESSION-CLUB] club-Pfad byte-identisch (functiondef-Assert)
AC-08: [CHECK] source-CHECK enthält 'special_event' + alle Altwerte
  VERIFY: pg_get_constraintdef → ARRAY enthält special_event,bescout_event,genesis,monthly_liga,trading,ipo,poll,research,bounty,p2p
AC-09: [UI/I18N] Admin-Label
  VERIFY: SOURCE_LABEL_KEY['special_event']==='platformPotSrcSpecialEvent'; de+tr Key vorhanden; tsc EXIT 0
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | Escrow | special prize=0 | kein Escrow | `AND NEW.prize_pool>0` |
| 2 | Escrow | Topf exakt=prize | erlaubt | strikt `<` |
| 3 | Settle | special, club_id NULL | Refund an Topf | Verzweigung auf type, nicht club_id |
| 4 | Resync | bescout→special gleicher Betrag | delta=0, kein Booking, Money korrekt | per-Treasury Delta; Label-Altzeile dokumentiert |
| 5 | Resync | special→club | Topf refund + Club debit | bestehende zwei-Treasury-Logik (held type IN bescout/special) |
| 6 | Regression | bescout escrow | source bleibt 'bescout_event' | CASE WHEN type='special' THEN special_event ELSE bescout_event |
| 7 | Concurrent | 2× special INSERT | serialisiert | Singleton-Row-Lock |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
mcp__supabase__execute_sql  # AC-01..AC-08 force-rollback (Topf vorher/nachher, Zero-Sum, RAISE-Capture)
pg_get_functiondef der 3 Trigger  # CASE-source + club/bescout erhalten
pg_get_constraintdef platform_treasury_ledger_source_check  # special_event drin
grep -n "special_event\|platformPotSrcSpecialEvent" src/app/(app)/bescout-admin/AdminTreasuryTab.tsx messages/de.json messages/tr.json
```

## 9. Open-Questions

**Pflicht-Klärung:** keine. Modell = 377 (CEO), Quelle special_event = CTO-how, Anil approved den Slice.
**Autonom-Zone:** Label-Text (Sonder-Event/Özel Etkinlik), Variablennamen.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Money-Trigger (DB) | `worklog/proofs/378-money-smoke.txt` — AC-01..AC-08 force-rollback + functiondef + constraintdef |
| UI/i18n | tsc EXIT 0 + grep-AC (Label-Key vorhanden DE+TR). Visueller Screenshot = optional (admin-only, gleicher Card wie 357, cred-gated) → in Proof als „pending, cred-gated" markiert. |

## 11. Scope-Out

- `sponsor`-Events → eigener Slice (Sponsor-Deposit-Pfad fehlt). `creator` → Phase 4.
- Admin-Screenshot der Card → cred-gated (ali_admin), nicht Teil dieses Slices (Label-Korrektheit per grep+tsc bewiesen).
- Wettkampf-Darstellung → Slice 5.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (inline §3+§4) → BUILD (1 Migration + AdminTreasuryTab + 2 i18n) → REVIEW (reviewer PFLICHT, Money) → PROVE (378-money-smoke.txt) → LOG (+ treasury.md §7 special ✅)
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | bescout-Regression: source-CASE bucht special_event für bescout | LOW | mittel | CASE `WHEN type='special'` strikt; AC-06 | AC-06 functiondef + smoke |
| 2 | CHECK-Widen vergisst Altwert → bestehende Buchungen brechen | LOW | hoch | ARRAY aus Live-constraintdef kopiert + special_event; AC-08 | AC-08 constraintdef-Diff |
| 3 | Resync bescout↔special Label-Drift | LOW | niedrig (cosmetisch) | dokumentiert, Money korrekt | Edge 4 |
| 4 | club-Pfad-Regression | LOW | hoch | byte-identisch zu 377-Body; AC-07 | AC-07 + Reviewer |
| 5 | i18n-Key fehlt einer Locale → MISSING_MESSAGE | LOW | niedrig | beide Locales + Fallback `key?t(key):source` | AC-09 grep |

---

## Compliance-Check
- Admin-facing Label „Sonder-Event"/„Özel Etkinlik" — neutral, kein Securities/Glücksspiel/$SCOUT/IPO-Framing. ✓

## Open Risiko (ehrlich)
Minimaler Blast-Radius — additiver Spiegel von 377, das gestern frisch reviewt wurde. Einziger neuer Pfad = source-CASE + CHECK-Widen; beide durch AC-06/AC-08 abgedeckt. 0 prized special/bescout/club live → kein Live-Geld bei Fehler.

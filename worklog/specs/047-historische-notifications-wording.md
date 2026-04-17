# Slice 047 — Historische Notifications Wording umschreiben

**Groesse:** XS
**CEO-Scope:** NEIN (kosmetisch, wording)
**Variante-2-Position:** #4/10

## Ziel

Umschreiben der 48 historischen `notifications` rows mit verbotener Business-Terminologie (`Trader`, `BSD`) auf AR-32/AR-39 konforme Wording (`Sammler`, `Credits`). Slice 043 fixte RPC-Bodies — jetzt die existierenden Rows nachziehen.

## Analyse

DB-Scan (2026-04-18):
- 45 rows mit "Trader" in title/body
- 3 rows mit "BSD" in title/body
- 263 total notifications

Sample patterns:
- `Trader: Aufstieg zu Silber II!` → `Sammler: Aufstieg zu Silber II!`
- `Dein Trader-Rang ist auf X gestiegen` → `Dein Sammler-Rang ist auf X gestiegen`
- `test1 hat dir 10 BSD Tipp gesendet` → `test1 hat dir 10 Credits Tipp gesendet`
- `Kader über 1.000 BSD` → `Kader über 1.000 Credits`

## Files

**NEU:**
- `supabase/migrations/NNN_slice_047_notifications_wording_rewrite.sql` — 4 UPDATE statements
- `worklog/proofs/047-before-after.txt` — Row-Count vorher/nachher

## Acceptance Criteria

1. **0 rows mit "Trader" in title/body** nach Migration (case-insensitive).
2. **0 rows mit "BSD" in title/body** nach Migration (case-insensitive).
3. **Migration idempotent** (zweiter Apply macht 0 Rows Change).
4. **Keine unerwuenschten Seiteneffekte** — nur strings `Trader`/`BSD` werden ersetzt, keine anderen Fields.

## Edge Cases

1. **Word-Boundary:** `trade_buy` (als reference_type value) oder `Trader-` als Prefix. `REPLACE` ersetzt WORT-UNABHAENGIG — `Trader-Rang` → `Sammler-Rang` ✓.
2. **Case-Sensitive REPLACE:** REPLACE ist case-sensitive. Wenn `trader` (klein) existiert, muss separat behandelt werden. Unsere Daten zeigen nur Title-Case `Trader` → OK.
3. **Kosmetische Risiko:** User koennte verwirrt sein ueber wechselnde Terminologie. Da Dev-Daten + Pre-Beta: akzeptabel.

## Proof-Plan

- Before-Count: 45 "Trader" + 3 "BSD" rows
- After-Count: 0 / 0
- Idempotenz: zweites Apply → 0 rows updated

## Scope-Out

- `message`-Column Bug in RPC-Bodies (accept_mentee, request_mentor) — separater Slice, weil nicht-live Features
- `activityHelpers.ts` TR-Labels — Slice 048 (TR-i18n)

---

**Ready fuer BUILD:** JA

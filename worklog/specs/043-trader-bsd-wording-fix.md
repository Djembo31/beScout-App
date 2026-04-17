# Slice 043 — Compliance-Wording Trader/BSD Fix

**Groesse:** S · **CEO-Scope:** ja (Compliance user-facing Text) · **Typ:** P2 Compliance

## Ziel

Slice 032 Flow 13 fand 2 compliance-Wording-Verstoesse in Notifications:
1. "Trader: Aufstieg zu Silber I!" → "Trader" ist in business.md verboten als Rolle
2. "test1 hat dir 10 BSD Tipp gesendet" → "BSD" ist legacy, sollte "Credits"

Beide Notifications kommen aus DB-RPCs (hardcoded DE-Strings in title+body).

## Audit-Ergebnis

- `award_dimension_score`: `v_dim_label := 'Trader'` (Zeile vor notification-Insert)
- `send_tip`: Error "Nicht genug BSD" + Body "hat dir X BSD Tipp gesendet"

Notification-UI (`NotificationDropdown.tsx`) rendert DB-`title`+`body` direkt, keine i18n-layer.

## Fix-Plan

1. **Migration:** `award_dimension_score` trader-Label → "Sammler" (business.md Glossar)
   - Manager/Analyst bleiben (Manager = OK im Glossar, Analyst kein flag)
2. **Migration:** `send_tip` "BSD" → "Credits" in:
   - Error "Betrag muss zwischen 10 und 1.000 BSD liegen" → "...Credits liegen"
   - Error "Nicht genug BSD" → "Nicht genug Credits"
   - Body "hat dir X BSD Tipp gesendet" → "hat dir X Credits als Tipp gesendet"

## Scope-Limit (praktisch)

- **Historische Daten**: existing 3 notifications mit "Trader"/"BSD" werden NICHT umgeschrieben (user_history, kosmetisch). Nur neue notifications haben korrekten Wording.
- **TR i18n**: RPCs sind DE-only. TR-Version müsste separat via Client-i18n layer kommen — out-of-scope.
- **CI-Guard**: grep-check als npm script documented in business.md (nicht enforced als pre-commit-hook — out-of-scope).

## Acceptance Criteria

1. Nach Migration: neue `award_dimension_score('trader')` Calls schreiben "Sammler: Aufstieg zu..."
2. Neue `send_tip(...)` Calls schreiben "Credits" statt "BSD"
3. tsc clean, tests gruen

## Proof-Plan

- `worklog/proofs/043-rpc-bodies-after.txt` — pg_proc verify neue strings
- `worklog/proofs/043-grep-audit.txt` — restliche Trader-/BSD-Funde dokumentiert

## Scope-Out

- Structured-Key-Notifications (server-side i18n) — Refactor ~20 call-sites
- Historical notification re-write
- CI pre-commit enforcement

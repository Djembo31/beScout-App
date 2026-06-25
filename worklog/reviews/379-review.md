# Review — Slice 379 (self-review, XS Migration)

**Verdict: PASS**

Self-review begründet: XS, bekannte Bug-Klasse (S330 CHECK-/Allowlist-Drift), rein additive
Widen-Operation auf einer Gamification-Währung (Tickets, NICHT cents-Wallet → kein §3-Money-Scope).
Kein src-Change. Alle 5 ACs live bewiesen (BEGIN…ROLLBACK).

## Geprüft
- **Additiv, kein Narrow:** Union = (RPC-Legacy ∪ TS TicketSource). Kein Wert entfernt → kein
  bestehender Aufrufpfad bricht. CHECK-Bestandswerte (11) sind Teilmenge der neuen 16 → keine
  Live-Zeile verletzt das ADD CONSTRAINT (sonst hätte apply_migration als Rollback geworfen).
- **Drei Flächen identisch:** AC4 = 0 missing in credit/spend/CHECK (16/16).
- **Grants:** AC5 proacl unverändert {service_role,authenticated}, kein anon (CREATE OR REPLACE
  erhält ACL, S368c). REVOKE/GRANT-Block bewusst weggelassen (Body-Rewrite bestehender Fn).
- **Auth-Guard/Cap/admin_grant-Gate/Insert-Logik byte-identisch** zu Live-Baseline (D87) — nur
  die `NOT IN (...)`-Liste + CHECK-Array geändert.
- **Negativ-Pfad intakt:** unbekannte Quelle (bogus_src) wirft weiter (AC3).

## Findings
- LOW (dokumentiert, kein Fix): Es gibt weiter KEINEN einzelnen SSOT für die Ticket-Quellen —
  3 DB-Flächen + TS-Type müssen manuell synchron gehalten werden. Single-Helper/Reference-Table
  = möglicher Folge-Slice (Scope-Out hier, vermeidet Über-Engineering bei XS-Fix).
- Kein weiterer Fund.

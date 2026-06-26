# Active Slice

```
status: idle
slice: 396
title: User-Events Geld-Kern (E-4a) — Eintritts-Pot, Erstell-Gebühr→Topf, kein Seed (V3) — DONE
size: L
stage: LOG (DONE)
spec: worklog/specs/396-user-events-money-core.md (V3 CEO-approved 2026-06-26)
impact: worklog/impact/396-user-events-money-core.md (DONE — UI-Type-Kaskade → E-4b, money-TS-Sync jetzt)
build: DONE (W1-W4 + tx/treasury-Sync + AR-44 ACL). Migrationen 170000/170100/170200/revoke_public_ar44 applied.
proof: worklog/proofs/396-money-smoke.txt (AC1-AC11 + Rest→Topf + Idempotenz + PATCH-AUDIT + tsc/vitest 1662 grün)
review: worklog/reviews/396-review.md (reviewer PASS, 3 LOW/INFO — D108→V3 + Wissen im LOG erledigt; 1 LOW deferred)
proof: pending
review: pending
ceo: Spec V3 fertig (Modell geklärt: kein Seed, Ersteller zahlt nur Erstell-Gebühr→Topf, Pot=Eintritte, kein Pot-Schnitt, Trigger unangetastet). WARTET AUF FINALE BUILD-FREIGABE (Money/CEO, §3 — kein BUILD vor „go").
prev: 395 DONE (Reject-Coverage). E-4-Alignment komplett (Modell B, D108).
```

## Zuletzt

- **Slice 396 Cold-Review (2026-06-26)** — Spec gegen Live-RPCs geprüft (score_event, beide Escrow/Settle-Trigger, resync, lock/unlock/cancel-entry, book_platform_treasury, alle CHECKs, scout_events_enabled). **3 Blocker gefunden:** B1 `scout_events_enabled=false`, B2 `event_entry_lock` fehlt im tx-CHECK (latent), B3 Drei-Besitzer-Doppelbuchung. + 5 weitere Funde (fee_split-Reuse, Rundungs-Rest→Topf, Cancel-Auth+Seed, status-Spalte, resync-Trigger). **Spec → V2** (§0). CEO-Entscheide: Schalter global an · geld-loses Event ablehnen · Gebühr 50 Cr · Settle Ersteller+Admin.
- **Slice 395** (2026-06-26) — Lineup-Reject-Coverage komplett. DONE (`cf973238`/`dddff999`), Reviewer PASS.
- **E-4-Alignment** (2026-06-26) — Modell B gelockt (dynamischer Pot, Ersteller verdient nichts, min_entries, admin-steuerbare Erstell-Gebühr, public-only).

Nächstes: **Anil gibt BUILD frei** → dann /impact (score_event-Consumer + entry-flow + tx/treasury-CHECK) → BUILD (4 Wellen, V2-Bausteine). Danach E-4b (Builder-UI).
```

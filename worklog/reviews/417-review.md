# Slice 417 Review — Offers Eigen-Gebot-Ausschluss (server-SSOT)

**Verdict: PASS** · Reviewer-Agent (cold-context) · ~12 min · 2026-06-27

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `src/features/market/queries/offers.ts:20` | `useOpenBids()` (no-arg, alle public bids, kein Eigen-Ausschluss) hat **0 Consumer** (grep-verifiziert) = orphan-Hook. Harmlos für 417, aber falls je verkabelt, würde der no-arg-Pfad denselben „eigenes Gebot als tote Zeile"-Leak re-einführen. | Out-of-scope 417. Folge-Cleanup: orphan löschen ODER JSDoc-reserve (errors-frontend qk-orphan). Kein Handlungsbedarf jetzt. |
| 2 | NIT | Migration `20260627230000` | Kein REVOKE/GRANT-Trailer — per S368c **korrekt** für reinen Body-Rewrite (Replace erhält ACL, proacl-Proof bestätigt). Nur AR-44-Audit-grep listet es als False-Positive. | Keine — ACL-Parität bereits bewiesen. |

Keine CRITICAL / REWORK / FAIL.

## One-Line
Ja — Senior würde mergen: minimaler chirurgischer 1-Zeilen-Server-Filter an beiden autoritativen Quellen, byte-treuer PATCH-AUDIT, force-rollback-Verhaltensbeweis, korrekte asymmetrische Behandlung der 3 Pfade; einzige Nits = pre-existing orphan + bekannter Audit-False-Positive.

## Belege (geprüft)
- **playerId-Pfad korrekt ausgenommen:** `.neq` strikt auf `if (ownedByUserId)` gegated; die 4 Call-Sites nutzen ownedByUserId XOR playerId (nie zusammen). AC-2-Test guardet. Player-Detail-Eigen-Ausschluss via Welle-1.6-SSOT (`excludeOwnBids`/`bestForeignBidCents`) vorhanden.
- **RPC byte-true:** einzige semantische Delta = `AND sender_id <> p_user_id`; auth.uid()-Guard, SEC DEFINER, search_path, alle 4 Sub-Selects, array_length-Guard + ELSE-Branch identisch. `sender_id` NOT NULL auf buy-offers → `<>` kein 3-wertige-Logik-Trap.
- **Test-Isolation:** Fallback statt mockTable → kein Queue-Leak. Assertions valide.
- **Edge:** 0-Holdings early-return (Service Z.109 / RPC array_length-Guard); sender_id NULL unmöglich.
- **von-allem-N:** alle open_bids/openBids-Consumer enumeriert — BestandView filtert schon (DiD), Player-Detail via SSOT, OffersTab open-Tab = gefixte Quelle. Keine offene Surface.

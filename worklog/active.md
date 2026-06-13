# Active Slice

```
status: idle
slice: 304 ✅ DONE
stage: LOG complete
spec: worklog/specs/304-dbfeeconfig-type-alignment.md
impact: skipped (reine TS-Typ-Addition, kein Runtime/Service/RPC/Schema-Change)
proof: worklog/proofs/304-feeconfig-type.txt
review: worklog/reviews/304-review.md (self-review, XS pure-type-completeness gegen verifiziertes Live-Schema)
decision: S7 Phase-2 #2 — DbFeeConfig-Typ an Live-fee_config angeglichen: +6 NOT-NULL-Felder (offer_platform/pbt/club_bps + abo_discount_bronze/silber/gold_bps). Schließt latentes Money-Typ-Loch (RPCs nutzten Spalten, Typ war blind). tsc 0, 54 grün. Nächste S7-Phase-2: #3 Orphan-Value-Removal, #4 Wildcard-Ledger.
```

### Slice 301 — SPEC (in Arbeit)
S6 letzter Stabilization-Schritt. M-Slice. RED-grep bestätigt: wildcards-Bridge = 0 Konsumenten (beide grep-Pfade leer, Test-Mocks zeigen auf kanonischen Pfad). Delete risikofrei.

## Zuletzt

- **Slice 300** (2026-06-13) — S5 Test-Confidence-Guard (Tool, M, PASS): `scripts/test-confidence-check.ts` + Baseline-Ratchet (placeholders 5, skips 1), pre-commit Step 6. 2 PURE-Placeholder gefixt. patterns.md #49 (3. Instanz).
- **Slice 299** (2026-06-13) — S4 Boundary-Ratchet (Tool, M, PASS): `scripts/boundary-check.ts` + `.boundary-baseline.json` (bridges 46, direct-supabase 5), pre-commit Step 5. 4 Folge-Findings.
- **Slice 298** (2026-06-13) — /club + /clubs Contract-Lifecycle-E2E (Tool, M, PASS): Demo-Step-8, `e2e/club-lifecycle.spec.ts` 2 passed.
- **Slice 297** (2026-06-13) — Club-Detail Narrative Tab-Split (UI, M, PASS): S3 F-4, neuer „Mehr"-Tab.
- **Slice 296** (2026-06-13) — Fantasy Unauth State Explicit (Tool+Doc, S, PASS): S3 F-3, rely-on-AuthGuard.
- **Slice 295** (2026-06-13) — /clubs Discovery Page Contract Test (Tool, S, PASS): S3 F-2.
- **Slice 294** (2026-06-13) — Public Club Metadata Compliance Copy (i18n, XS, PASS): S3 F-1.

**🚨 Slice 284 Wave 2 (284b) weiter blockiert:** API-Football-Key seit 06.05. suspendiert.
**TR-Review offen (Anil):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").

Nächstes nach 301: S6-Follow-ups (S4-F-2/F-3 Facade-Migration, S5-F-3 Mock-Audit) ODER Backlog-Slices (FM-08..11, FANT-11/12/16).

# Active Slice

```
status: idle
slice: 301 ✅ DONE
stage: LOG complete
spec: worklog/specs/301-s6-dead-artifact-inventory.md
impact: skipped (kein Runtime-Service/RPC/Schema — Dead-File-Removal 0 Importer + Doc + Script-const-Cleanup)
proof: worklog/proofs/301-s6-dead-artifact.txt
review: worklog/reviews/301-review.md (reviewer-Agent PASS — 2 NIT, F-1 Component-Summary in-slice übernommen)
decision: S6 abgeschlossen. Inventory-Doc 24 Artefakte klassifiziert + bewiesenes wildcards-Bridge-Removal (0 Importer, RED/GREEN). §9 orphan-pre-push: CTO-NEIN, als Finding dokumentiert (Anil-Decision falls gewünscht). Stabilization-Track S0–S6 + E2E (293/298) KOMPLETT.
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

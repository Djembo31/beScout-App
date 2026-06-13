# Active Slice

```
status: idle
slice: 305 ✅ DONE
stage: LOG complete
spec: worklog/specs/305-orphan-value-removal.md
impact: in-spec (vollständige RED-State-Dependency-Karte Code+DB)
proof: worklog/proofs/305-orphan-value-removal.txt
review: worklog/reviews/305-review.md (reviewer-Agent CONCERNS — F-1/F-2 Residuen in-slice abgearbeitet, F-3 Reviewer-Misread, F-4 post-hoc-akzeptiert)
decision: S7 Phase-2 #3 — Orphan Community-Valuation Removal LIVE (Anil „3"). Self-contained orphan entfernt: 2 Files + Barrel + 3 Test-Zeilen + DROP FUNCTION + DROP 2 TABLE (je 5 Test-Zeilen). RED/GREEN-Proof. Residuen mit-bereinigt (orphan-detector-Allowlist + 9 i18n-Keys). Knowledge: errors-frontend.md „Dead-Feature-Removal 4-Residuen-Achsen". Nächste S7-Phase-2: #4 Wildcard-Ledger.
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

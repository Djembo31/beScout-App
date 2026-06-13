# Slice 301 — S6 Dead-Artifact-Inventory

**Slice-Type:** Tool + Service (Inventory-Doc + bewiesenes DEAD-Removal)
**Größe:** M
**CEO-Scope:** Nein (interne Code-Hygiene; 1 offene Workflow-Frage an Anil in §9)
**Datum:** 2026-06-13

---

## 1. Problem-Statement

Master-Audit §10 **S6 — Dead Artifact Inventory** ist der letzte offene Stabilization-Schritt (S0–S5 + E2E-Layer 293/298 abgeschlossen). Ziel laut Audit: **„Löschkandidaten beweisbar machen"** — Status pro Artefakt KEEP / BRIDGE / DEPRECATED / DEAD?.

Evidence:
- **S4-F-1** (`worklog/audits/2026-06-13/s4-source-of-truth-boundaries-report.md` Z.15): `wildcards`-Bridge hat **0 Importer** → klarster DEAD-Kandidat.
- **§11.3 / Anti-Kreis-Regel 3:** „Keine Datei löschen, nur weil sie ungenutzt wirkt." → DEAD? ist KEINE Löschfreigabe; Löschen nur mit **RED/GREEN Removal-Proof** (grep 0 Konsumenten + tsc + vitest grün).
- Bislang kein konsolidiertes Inventar — Löschkandidaten sind über 3 Tool-Reports verstreut (boundary-check, orphan-detector, wiring-check).

## 2. Lösungs-Design

Zwei Deliverables, beide klein + beweisbar (§11.8 „Jede Stabilisierung endet mit einem kleinen Proof"):

1. **Inventory-Doc** `worklog/audits/2026-06-13/s6-dead-artifact-inventory.md`
   Konsolidiert die Outputs der **bereits existierenden** Discovery-Tools in EINE Klassifikations-Tabelle (KEEP/BRIDGE/DEPRECATED/DEAD?) über die relevanten Source-of-Truth-Achsen:
   - Bridges (7) — aus `boundary-check.ts` Report
   - Direct-Supabase-Components (5) — aus boundary-Report (S4-F-2/F-3 Kontext)
   - Components (159 scanned / 0 real-drift / 4 allowlisted) — aus `orphan-detector`
   - Pro Artefakt: Import-Graph-Status, dynamic/route/test-Refs, Status, Begründung.

2. **Bewiesenes DEAD-Removal: `src/lib/services/wildcards.ts`** (Re-Export-Shim, 0 Importer).
   RED/GREEN-Proof:
   - RED: grep `@/lib/services/wildcards` → 0 Konsumenten (vor Delete dokumentiert).
   - Delete Bridge-File.
   - Cleanup-Konsistenz: `wildcards` aus `BRIDGES`-const in `boundary-check.ts` + aus `.boundary-baseline.json` entfernen (Ratchet trackt sonst non-existenten Bridge).
   - GREEN: `tsc --noEmit` + `CI=true vitest run` betroffene Domain grün + `audit:boundary` clean.

**Kein neues Ratchet/Wiring** — Dead-Artifact-Guards existieren bereits (orphan-detector nightly, boundary-ratchet pre-commit, wiring-check pre-commit). S6 nutzt sie als Discovery, fügt keinen 4. Guard hinzu (vermeidet Over-Engineering + pre-push-Friction). Die eine offene Wiring-Frage (orphan als pre-push-Gate) ist §9-Decision für Anil, nicht autonom.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|------------|
| `worklog/audits/2026-06-13/s6-dead-artifact-inventory.md` | NEU | Klassifikations-Tabelle (Kern-Deliverable) |
| `src/lib/services/wildcards.ts` | **DELETE** | Re-Export-Shim, 0 Importer (S4-F-1) |
| `scripts/boundary-check.ts` | EDIT | `wildcards` aus `BRIDGES`-const entfernen |
| `.boundary-baseline.json` | EDIT | `wildcards`-key entfernen (Ratchet-Konsistenz) |
| `worklog/specs/301-*.md` / `worklog/reviews/301-*.md` / `worklog/proofs/301-*.txt` | NEU | SHIP-Artefakte |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| # | File | Zu prüfende Frage | Status |
|---|------|-------------------|--------|
| 1 | `src/lib/services/wildcards.ts` | Ist es wirklich nur `export * from canonical`? | ✅ bestätigt (2 Zeilen, reiner Shim) |
| 2 | `src/features/fantasy/services/wildcards.ts` | Kanonische Quelle — bleibt KEEP, alle Consumer zeigen hierhin? | ✅ events.ts + misc.ts importieren kanonisch |
| 3 | `scripts/boundary-check.ts` Z.27 + 64-84 + 131-140 | Wie zählt `--check`? Bricht Delete den Ratchet? | ✅ BRIDGES-const + regex `@/lib/services/<b>`; baseline-loop über BRIDGES; nach Delete live=0=baseline → kein Fehler, aber const+baseline cleanup für Konsistenz |
| 4 | `.boundary-baseline.json` | wildcards:0 vorhanden? | ✅ ja |
| 5 | `scripts/orphan-component-detector.ts` Header + SCAN_DIRS | Was scannt es (nur Components)? Fängt es Service-Bridges? | ✅ nur src/components + src/features JSX-Default-Exports — Services NICHT im Scope |
| 6 | `worklog/audits/2026-06-13/s4-source-of-truth-boundaries-report.md` | Bridge-Counts + 5 direct-supabase-Files | ✅ gelesen |
| 7 | `worklog/audits/2026-06-12/stabilization-master-audit.md` §10 S6 + §11.3 | S6-Ziel + Removal-Proof-Regel | ✅ gelesen |
| 8 | `.husky/pre-commit` + `.github/workflows/nightly-audit.yml` | Wo ist orphan/boundary verkabelt? | ✅ orphan=nightly; boundary/wiring/test-conf=pre-commit |
| 9 | `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` + `error-keys-coverage.test.ts` | Mocken sie den Bridge-Pfad? | ✅ nein — kanonischer Pfad |

## 5. Pattern-References

- **Master-Audit §10 S6 + §11.3** — Inventory-Ziel + kein Blind-Delete.
- **errors-frontend.md „Dead-Wrapper-File mit transitive Lib-Lock-In" (Slice 280)** — Delete-Methodik + Detection-grep + Removal-Proof-Pattern (bridge ist analog, aber ohne transitive Bundle-Win, da reiner Re-Export).
- **D54 (Build-without-Wire)** — Tool muss verkabelt sein; hier: keine neuen Tools, existierende Guards genutzt.
- **D75 (Stabilization-Audit-Slices)** — Audit-Doc + enforced Guard. S6's „Guard" = die existierenden 3 Ratchets + die wildcards-Reduktion der BRIDGES-Menge.
- **patterns.md #49 (Baseline-Ratchet-Guard)** — boundary-baseline Konsistenz bei Bridge-Removal.

## 6. Acceptance Criteria

- **AC-1** [HAPPY] Inventory-Doc existiert mit Klassifikations-Tabelle ≥ alle 7 Bridges + 5 direct-supabase + orphan-Summary. VERIFY: `test -f worklog/audits/2026-06-13/s6-dead-artifact-inventory.md && grep -cE "KEEP|BRIDGE|DEPRECATED|DEAD" worklog/audits/2026-06-13/s6-dead-artifact-inventory.md` → ≥ 12. FAIL-IF: Datei fehlt oder < 12 klassifizierte Zeilen.
- **AC-2** [HAPPY] `src/lib/services/wildcards.ts` gelöscht. VERIFY: `test ! -f src/lib/services/wildcards.ts`. FAIL-IF: Datei existiert noch.
- **AC-3** [HAPPY] Kein Konsument bricht: `grep -rn "@/lib/services/wildcards" src/` → 0. VERIFY: exit-1 von grep (kein Match). FAIL-IF: ≥ 1 Treffer.
- **AC-4** [HAPPY] `tsc --noEmit` grün nach Delete. VERIFY: `pnpm exec tsc --noEmit` exit 0.
- **AC-5** [HAPPY] Fantasy-Domain-Tests grün (Consumer von kanonischem wildcards). VERIFY: `CI=true pnpm exec vitest run src/lib/queries/__tests__ src/features/fantasy "src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx" src/lib/__tests__/error-keys-coverage.test.ts` grün.
- **AC-6** [HAPPY] `audit:boundary` clean nach BRIDGES/baseline-Cleanup. VERIFY: `pnpm run audit:boundary:check` exit 0, Output zeigt nur 6 Bridges (kein wildcards).
- **AC-7** [EDGE] boundary-check.ts `BRIDGES`-const enthält kein `'wildcards'` mehr. VERIFY: `grep -c "'wildcards'" scripts/boundary-check.ts` → 0.
- **AC-8** [EDGE] `.boundary-baseline.json` hat keinen `wildcards`-key. VERIFY: `grep -c "wildcards" .boundary-baseline.json` → 0; `jq '.bridges | length' .boundary-baseline.json` → 6.
- **AC-9** [DOC] Inventory-Doc klassifiziert die 5 direct-supabase-Files korrekt (AuthProvider/Admin×2 = KEEP, PlayerRankings/FollowListModal = DEPRECATED→S4-F-2/F-3). VERIFY: manuell, 5 Zeilen in Tabelle.

## 7. Edge Cases

| # | Case | Erwartetes Verhalten |
|---|------|----------------------|
| 1 | Bridge-Delete → boundary-check sucht non-existenten Pfad | regex matcht nichts → live=0; baseline-cleanup verhindert „missing key"-Drift |
| 2 | Test mockt kanonischen Pfad (nicht Bridge) | Delete bricht Mock NICHT (verifiziert §4 #9) |
| 3 | `error-keys-coverage.test.ts` Kommentar referenziert wildcards | nur Kommentar, kein Import → unbetroffen |
| 4 | Andere Bridges (fixtures/scoring/…) haben Importer | bleiben BRIDGE (kein Delete — inkrementelle Migration S4-F-4) |
| 5 | orphan-detector findet 4 allowlisted | KEEP — allowlist-begründet, kein DEAD |
| 6 | direct-supabase AuthProvider | KEEP — Auth-Layer braucht direkten Client legitim (D74) |
| 7 | direct-supabase Admin-Tabs (2) | KEEP — Admin-only, außerhalb Demo-Path |
| 8 | `--update` statt manueller baseline-Edit | manueller Edit + `audit:boundary` re-emit ist deterministischer; ggf. `--update` als Alternative |
| 9 | git CRLF-Warning bei JSON-Edit | kosmetisch, kein Block |

## 8. Self-Verification Commands

```bash
# RED (vor Delete): 0 Bridge-Konsumenten
grep -rn "@/lib/services/wildcards" src/ ; echo "exit=$?"   # erwartet: kein Match, exit 1

# GREEN (nach Delete + Cleanup):
test ! -f src/lib/services/wildcards.ts && echo "deleted OK"
grep -c "'wildcards'" scripts/boundary-check.ts            # erwartet 0
grep -c "wildcards" .boundary-baseline.json                # erwartet 0
pnpm run audit:boundary:check                              # exit 0, 6 bridges
pnpm exec tsc --noEmit                                     # exit 0
CI=true pnpm exec vitest run src/features/fantasy src/lib/queries/__tests__ src/lib/__tests__/error-keys-coverage.test.ts
```

## 9. Open-Questions

- **[CEO/Workflow-Decision — Anil]** Soll `audit:orphan` zusätzlich als **pre-push-Gate** verkabelt werden? Pro-Comment in `.husky/pre-commit:13` sagt „gehoert pre-push", aber es läuft aktuell nur nightly. Kosten: +66s pro Push (blockt nur bei REAL-Drift, allowlisted ok). **CTO-Empfehlung: NEIN** — nightly-Lauf reicht, Drift=0, pre-push-Friction nicht gerechtfertigt. Als Inventory-Finding dokumentieren, nicht in diesem Slice umsetzen.
- **[Autonom-Zone]** Manueller baseline-Edit vs. `--update` — CTO wählt manuellen Edit + re-verify (deterministisch).
- **[Autonom-Zone]** Inventory-Doc-Granularität — Bridges + direct-supabase + orphan-Summary reichen für „Löschkandidaten beweisbar"; kein erschöpfender File-by-File-Scan des gesamten src/ (Anti-Kreis: kein Boil-the-Ocean).

## 10. Proof-Plan

`worklog/proofs/301-s6-dead-artifact.txt`:
- RED-grep-Output (0 Bridge-Konsumenten, exit 1)
- `test ! -f` Delete-Confirm
- `audit:boundary:check` Output (6 bridges, clean)
- `tsc --noEmit` exit 0
- vitest-Output betroffene Domain grün
- Inventory-Doc-Pfad + Klassifikations-Summary

## 11. Scope-Out

- KEINE Migration der direct-supabase-Components (PlayerRankings/FollowListModal) → S4-F-2/F-3 Follow-ups.
- KEIN Delete anderer Bridges (haben Importer) → inkrementelle Migration S4-F-4.
- KEIN neues Ratchet/Tool/Wiring (existierende Guards genügen).
- KEIN erschöpfender src/**-File-by-File-Scan (Inventory nutzt existierende Tool-Reports).
- orphan-pre-push-Wiring = §9 Anil-Decision, nicht in diesem Slice.

## 12. Stage-Chain (geplant)

SPEC → IMPACT `skipped (kein Service/RPC/Schema-Change am Runtime — gelöschter Bridge hat 0 Importer, kein Consumer-Impact; reines Doc + Dead-File-Removal + Script-const-Cleanup)` → BUILD → REVIEW (reviewer-Agent, M-Slice Pflicht) → PROVE → LOG.

## 13. Pre-Mortem (optional bei M, hier 5 Szenarien)

1. **Bridge hatte versteckten dynamic-Import** → mitigiert: 2× grep (path + string) beide leer, §4 #9 verifiziert.
2. **boundary-check `--check` bricht nach Delete weil baseline-key fehlt** → mitigiert: baseline + BRIDGES-const synchron entfernen, dann `audit:boundary` re-verify.
3. **Inventory wird Audit-Theater (kein enforced Outcome)** → mitigiert: konkretes Removal (wildcards) + BRIDGES-Reduktion ist der enforced Teil (D75-konform).
4. **Scope-Creep zu „alle 5 direct-supabase migrieren"** → mitigiert: Scope-Out §11, nur Klassifikation.
5. **tsc/vitest rot durch übersehenen Consumer** → mitigiert: RED-grep vor Delete + GREEN-grep/tsc/vitest nach Delete als Hard-Gate.

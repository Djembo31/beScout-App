# Slice 299 — S4 Source-of-Truth Boundaries (Audit + Ratchet-Guard)

**Slice-Type:** Tool (audit + enforcement script)
**Größe:** M
**CEO-Scope:** Nein (interne Code-Hygiene-Infra, CTO-Domain — kein src/**-Runtime-Change, kein Money/Security)
**Datum:** 2026-06-13

---

## 1. Problem-Statement

Stabilization-Master-Audit (`worklog/audits/2026-06-12/stabilization-master-audit.md`) §10 Slice S4 + §6 Source-of-Truth-Befunde: Import-/Layer-Grenzen sind unscharf. Zwei Drift-Achsen:

1. **Bridge-Re-Export-Pfade** (`src/lib/services/{fixtures,lineups,fantasyLeagues,scoring,events,predictions,wildcards}.ts`) — reine Re-Exports auf `@/features/fantasy/services/*`. Read-only verifiziert (alle 2-3 Zeilen, 0 Supabase-Logik). Noch **46 Importer** auf Bridge-Pfaden (fixtures 15, scoring 17, lineups 6, events 5, predictions 2, fantasyLeagues 1, wildcards 0).
2. **Direct-Supabase-in-Component** — 5 Files importieren `@/lib/supabaseClient` direkt: `AuthProvider.tsx` (legit — Auth-Session-Owner), `bescout-admin/{AdminLigaTab,BescoutAdminContent}.tsx` (admin-only), `rankings/PlayerRankings.tsx` + `profile/FollowListModal.tsx` (echte Component-Data-Authority-Drift).

Anti-Kreis-Regel §11.5+6: „Keine neuen Imports auf Bridge-Services / keine neuen Komponenten mit direktem Supabase-Zugriff." Aktuell **nicht enforced** — nur Prosa.

## 2. Lösungs-Design

**Kein Big-Bang-Refactor** (Anti-Pattern, Master-Audit §0). Stattdessen:

1. **Audit-Doc** `worklog/audits/2026-06-13/s4-source-of-truth-boundaries.md` — BRIDGE-Liste finalisiert, Direct-Supabase-Inventar klassifiziert (legit/admin/drift), Boundary-Regeln, Findings als Folge-Fix-Slices.
2. **Ratchet-Guard** `scripts/boundary-check.ts` (Pattern analog `silent-fail-audit.ts` + `.audit-baseline.json`): zählt (a) Bridge-Importer pro Bridge, (b) Direct-Supabase-Component-Count. Vergleich gegen `.boundary-baseline.json`. `--check` exit 1 NUR bei *Anstieg* → verhindert NEUE Verstöße ohne Migrations-Zwang der 46 bestehenden. Default-Mode schreibt Report. `--update` schreibt Baseline neu (nach legitimer Migration → Count sinkt → Baseline runter-ratchen).
3. **Verkabelung** (D54): `package.json` `audit:boundary` + `audit:boundary:check`, `.husky/pre-commit` Step 5, `wiring-check.ts` Allowlist.

**Warum Script-Ratchet, nicht ESLint `no-restricted-imports`:** Harte ESLint-Regel würfe alle 46 bestehenden Bridge-Imports als Error → erzwänge Mass-Migration in einem Slice (Anti-Pattern §0). „warn"-Level produziert 46 Dauer-Warnungen (Noise). Baseline-Ratchet ist die im Repo etablierte, churn-freie Lösung.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `worklog/audits/2026-06-13/s4-source-of-truth-boundaries.md` | NEU — Audit-Doc |
| `scripts/boundary-check.ts` | NEU — Ratchet-Guard |
| `.boundary-baseline.json` | NEU — eingefrorener Baseline-Stand |
| `package.json` | +2 Scripts (`audit:boundary`, `audit:boundary:check`) |
| `.husky/pre-commit` | +1 Step (`audit:boundary:check`) |
| `scripts/wiring-check.ts` | +1 Allowlist-Entry |

Kein src/**-Runtime-Change.

## 4. Code-Reading-Liste (DONE)

| File | Zweck | Befund |
|------|-------|--------|
| `worklog/audits/2026-06-12/stabilization-master-audit.md` §6+§10+§11 | S4-Scope | Bridge-Liste + Direct-Access-Befunde + Anti-Kreis-Regeln |
| `src/lib/services/{7 bridges}.ts` | Bridge-Verifikation | alle reine `export * from '@/features/fantasy/services/*'`, 0 Logik |
| `scripts/silent-fail-audit.ts:179-218` | Baseline-Ratchet-Pattern | `.audit-baseline.json` + `--check` + `process.exit(1)` bei Increase; no-baseline → write-initial |
| `scripts/wiring-check.ts:74-81` | Allowlist-Format + report-Stil | `KNOWN_ORPHANS` Map, npm:-Prefix |
| `.husky/pre-commit` | Hook-Struktur | 4 audit-Steps, `set -e`, je `pnpm run audit:*` |
| `.audit-baseline.json` | Baseline-JSON-Form | minimal JSON |

## 5. Pattern-References

- **Master-Audit §5 Component/Service Taxonomy** — CANONICAL_SOURCE / QUERY_FACADE / FEATURE_CONTAINER / UI_PURE / BRIDGE. Audit-Doc nutzt diese Klassen.
- **silent-fail-audit Baseline-Ratchet** (`.audit-baseline.json`, Slice 092/093) — exaktes Vorbild für `--check` + Increase-Gate.
- **D54 Build-without-Wire** — Tool muss verkabelt sein (pre-commit + wiring-allowlist), sonst Slice nicht fertig.
- **errors-infra.md „tr/grep UTF-8"** — boundary-check nutzt Node fs/grep-Logik in TS (kein shell-`tr`), keine Locale-Falle.

## 6. Acceptance Criteria

- AC-1 [HAPPY] `scripts/boundary-check.ts` ohne Flag → schreibt `worklog/audits/<date>/s4-source-of-truth-boundaries-report.md` mit per-Bridge-Importer-Counts + Direct-Supabase-Liste. EXIT 0.
- AC-2 [RATCHET] `--check` mit existierender Baseline + unverändertem Code → EXIT 0, loggt „no increase".
- AC-3 [RATCHET-FAIL] Synthetisch 1 neuen Bridge-Import hinzufügen → `--check` EXIT 1 mit klarer Message (welche Bridge, alt→neu). Nach Revert wieder EXIT 0.
- AC-4 [INIT] Kein Baseline-File vorhanden → `--check` schreibt initiale Baseline + EXIT 0 (analog silent-fail).
- AC-5 [WIRE] `audit:boundary` + `audit:boundary:check` in package.json; pre-commit ruft `audit:boundary:check`; wiring-check allowlistet beide → `audit:wiring:check` EXIT 0.
- AC-6 [BASELINE-TRUTH] `.boundary-baseline.json` == aktueller Live-Stand (bridges-map + directSupabaseComponents) am Commit-Zeitpunkt.
- AC-7 [AUDIT-DOC] Audit-Doc enthält BRIDGE-Tabelle (7 + Counts), Direct-Supabase-Klassifikation (legit/admin/drift), ≥2 Folge-Findings (wildcards-DEAD?, PlayerRankings/FollowListModal → query-facade).

## 7. Edge Cases

| Case | Erwartung |
|------|-----------|
| Bridge-File selbst zählt sich | exclude `src/lib/services/<name>.ts` selbst |
| Re-Export-Kette (`@/lib/services/index`?) | nur direkte `from '@/lib/services/<bridge>'`-Imports zählen |
| Import via `@/lib/services` Barrel | prüfen ob Barrel die Bridges re-exportiert (dann separat erfassen) |
| `--check` ohne Baseline | write-initial + EXIT 0 (kein false-fail) |
| Count SINKT (legitime Migration) | `--check` EXIT 0 (nur Increase failt); Baseline via `--update` nachziehen |
| Multi-line Import-Statement | regex über `from '...'`-Klausel, nicht zeilengebunden |
| CRLF (Windows) | Node liest utf-8, line-ending-agnostisch |
| Test-Files importieren Bridge | mitzählen ODER excludieren? → excludieren (`__tests__`), Test-Imports sind kein Prod-Boundary-Verstoß |

## 8. Self-Verification Commands

```bash
npx tsx scripts/boundary-check.ts                    # report, exit 0
npx tsx scripts/boundary-check.ts --check            # ratchet, exit 0 at baseline
# synthetic-fail: add a bridge import to a scratch file, re-run --check → exit 1, revert
grep -n "boundary" package.json .husky/pre-commit scripts/wiring-check.ts
pnpm run audit:wiring:check                           # exit 0 (boundary scripts allowlisted)
```

## 9. Open-Questions

- **Autonom-Zone (CTO):** Guard-Design, Baseline-Form, Klassifikation, Verkabelung.
- **Keine CEO-Zone** — Anil hat S4 via „weiter" beauftragt; reine Hygiene-Infra.
- **Folge-Fix-Slices (NICHT in 299):** wildcards-Bridge-Delete (0 Importer, braucht Removal-Proof), PlayerRankings + FollowListModal → query-facade-Migration. Als Findings dokumentiert, separate Slices.

## 10. Proof-Plan

`worklog/proofs/299-boundary-check.txt`: AC-1 report-Output + AC-2 `--check` green + AC-3 synthetic-fail-demo (add+revert) + AC-5 wiring grep + AC-6 baseline-content.

## 11. Scope-Out

- Keine Migration der 46 bestehenden Bridge-Importer (Mass-Churn, Anti-Pattern).
- Kein wildcards-Delete (0 Importer, aber Removal-Proof = separater Slice).
- Keine PlayerRankings/FollowListModal-Refactor (Folge-Fix-Slice).
- Keine ESLint-Regel (siehe §2 Begründung).
- Kein S5/S6 (Test-Confidence / Dead-Artifact — spätere Slices).

## 12. Stage-Chain (geplant)

SPEC → IMPACT skipped (Audit + Script-Infra, kein Service/RPC/Schema/Query-Key) → BUILD → REVIEW (reviewer-Agent) → PROVE (boundary-check Runs + synthetic-fail) → LOG.

## 13. Pre-Mortem

1. **Baseline driftet zu hoch** (jemand committed neuen Bridge-Import bevor Guard live): Mitigation — Baseline JETZT eingefroren auf 46+5, Guard ab Commit aktiv.
2. **Guard zählt falsch** (Barrel-Re-Export übersehen): in BUILD verifizieren ob `@/lib/services/index.ts` Bridges re-exportiert → falls ja, Barrel-Imports mitzählen.
3. **Pre-commit zu langsam:** grep-basiert ~1-2s, akzeptabel (wiring-check ist ~7s).
4. **False-fail bei Count-Sinken:** nur Increase failt (`>`, nicht `!=`).
5. **`--check` ohne Baseline failt CI:** write-initial-Pattern (silent-fail-Vorbild) → EXIT 0.

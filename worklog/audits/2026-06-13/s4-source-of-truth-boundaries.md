# S4 — Source-of-Truth Boundaries Audit

**Slice:** 299 · **Datum:** 2026-06-13 · **Status:** READ-ONLY AUDIT (Befunde) + Ratchet-Guard (Enforcement)
**Scope:** Master-Audit §6 (Source-of-Truth-Befunde) + §10 Slice S4 + §11 Anti-Kreis-Regeln 5+6

> Maschinen-Report (Counts) wird von `scripts/boundary-check.ts` nach
> `s4-source-of-truth-boundaries-report.md` geschrieben. Dieses Doc ist die
> kuratierte Klassifikation + Folge-Findings.

---

## 1. BRIDGE-Liste (finalisiert)

Alle 7 sind **reine Re-Export-Shims** (2-3 Zeilen, 0 Supabase-Logik) — verifiziert. Implementierung liegt in `@/features/fantasy/services/*`.

Importer-Count = statische `from` **+** dynamic `import('…')`/`require('…')` (Slice 299 F-1: Guard erfasst beide Achsen), ohne `__tests__`.

| Bridge (`src/lib/services/…`) | Re-exportiert | Importer (prod) | Klasse |
|---|---|---:|---|
| `fixtures.ts` | `@/features/fantasy/services/fixtures` | 15 | BRIDGE |
| `scoring.ts` | `…/scoring.queries` + `…/scoring.admin` | 14 | BRIDGE |
| `lineups.ts` | `…/lineups.queries` + `…/lineups.mutations` | 7 | BRIDGE |
| `events.ts` | `…/events.queries` + `…/events.mutations` | 6 | BRIDGE |
| `predictions.ts` | `…/predictions.queries` + `…/predictions.mutations` | 3 | BRIDGE |
| `fantasyLeagues.ts` | `…/leagues` | 1 | BRIDGE |
| `wildcards.ts` | `…/wildcards` | **0** | **DEAD?** (→ S4-F-1) |
| **Total** | | **46** | |

**Regel (Master-Audit §11.5):** Keine NEUEN Imports auf Bridge-Pfade. Neue Imports → direkt auf `@/features/fantasy/services/*` (impl) oder Query-Facade. Bestehende 46 bleiben (keine Mass-Migration in einem Slice — Anti-Pattern §0).

## 2. Direct-`@/lib/supabaseClient` im Component-Layer

5 Files (src/components + src/app), klassifiziert:

| File | Klasse | Bewertung |
|---|---|---|
| `src/components/providers/AuthProvider.tsx` | CANONICAL_SOURCE | **legit** — Auth-Session-Owner, MUSS `supabase.auth` halten. Kein Refactor. |
| `src/app/(app)/bescout-admin/AdminLigaTab.tsx` | FEATURE_CONTAINER (admin) | **akzeptiert** — Admin-only Tooling, nicht im Demo-Path; niedrige Prio. |
| `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` | FEATURE_CONTAINER (admin) | **akzeptiert** — wie oben. |
| `src/components/rankings/PlayerRankings.tsx` | UI→DATA-DRIFT | **DRIFT** (→ F-2) — Component wird Datenautorität (Master-Audit §6.2). Query-Facade-Kandidat. |
| `src/components/profile/FollowListModal.tsx` | UI→DATA-DRIFT | **DRIFT** (→ F-3) — Component liest Supabase direkt; Service/Query-Facade-Kandidat. |

**Regel (Master-Audit §11.6):** Keine NEUEN Komponenten mit direktem Supabase-Zugriff. Neue Daten-Zugriffe → Service (CANONICAL_SOURCE) + Query-Facade-Hook.

## 3. Enforcement (dieser Slice)

`scripts/boundary-check.ts` + `.boundary-baseline.json` — Baseline-Ratchet analog `silent-fail-audit`:
- Baseline eingefroren: bridges total **46** (per-Bridge, inkl. dynamic imports), directSupabaseComponents **5**.
- `--check` (pre-commit Step 5): exit 1 **nur bei Anstieg** je Bridge oder Direct-Supabase-Count.
- `--update`: Baseline nachziehen nachdem eine legitime Migration Counts SENKT.
- Kein ESLint-Hard-Rule (würfe alle 46 als Error → Mass-Churn). Kein „warn"-Level (46 Dauer-Warnungen = Noise).

Damit ist Master-Audit §11.5/6 von Prosa → enforced. Bestände werden **nicht** erzwungen migriert; nur Neuzuwachs blockiert.

## 4. Folge-Findings (separate Fix-Slices — NICHT in 299)

| ID | Finding | Vorschlag | Prio |
|----|---------|-----------|------|
| **S4-F-1** | `wildcards.ts`-Bridge hat 0 Importer | Delete mit Removal-Proof (grep 0 + tsc + vitest grün). Anti-Pattern §11.3: kein Blind-Delete. | P3 (sauber, niedrig-Risk) |
| **S4-F-2** | `PlayerRankings.tsx` direkter Supabase-Zugriff | Daten-Zugriff in Service + Query-Facade-Hook ziehen; Component → UI_PURE/FEATURE_CONTAINER. (Master-Audit §6.2) | P2 (Demo-Path /rankings) |
| **S4-F-3** | `FollowListModal.tsx` direkter Supabase-Zugriff | Analog F-2 → Service/Query-Facade. | P2 |
| **S4-F-4** | 46 Bridge-Importer langfristig migrieren | Inkrementell pro Feature-Touch (kein Big-Bang); Baseline via `--update` runter-ratchen. | P3 (Opportunistisch) |

## 5. Was NICHT Teil von S4 ist (Scope-Out)

- Migration der 46 Bridge-Importer (Mass-Churn).
- wildcards-Delete (= S4-F-1, eigener Slice mit Removal-Proof).
- PlayerRankings/FollowListModal-Refactor (= S4-F-2/F-3).
- S5 Test-Confidence / S6 Dead-Artifact (spätere Slices).

## 6. Anti-Kreis-Compliance

- §11.3 (kein Blind-Delete): wildcards bleibt, F-1 dokumentiert mit Removal-Proof-Pflicht. ✅
- §11.5/6 (keine neuen Bridge-/Direct-Supabase-Imports): jetzt enforced via Ratchet. ✅
- §11.8 (jede Stabilisierung endet mit Proof): `boundary-check` Runs + synthetic-fail-Demo. ✅
- §0 (kein Big-Bang-Refactor): Baseline friert Ist-Stand, nur Neuzuwachs blockiert. ✅

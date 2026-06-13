# S6 — Dead Artifact Inventory — 2026-06-13

**Slice:** 301 · **Master-Audit:** §10 S6 + §11.3 (kein Blind-Delete)
**Ziel:** Löschkandidaten **beweisbar** machen. Status pro Artefakt: KEEP / BRIDGE / DEPRECATED / DEAD?.
**Regel (§11.3):** DEAD? ist KEINE Löschfreigabe. Löschen nur mit RED/GREEN Removal-Proof (grep 0 Konsumenten + tsc + vitest grün).

Konsolidiert die Outputs der **bereits existierenden** Discovery-Tools statt eines erschöpfenden src/**-Scans (Anti-Kreis: kein Boil-the-Ocean):
- `scripts/boundary-check.ts` → Bridges + direct-Supabase (S4-Report 2026-06-13)
- `scripts/orphan-component-detector.ts` → Components (Report 2026-06-13)
- `scripts/wiring-check.ts` → Tool/Script-Wiring (pre-commit Gate)

---

## 1. Service-Bridges (`@/lib/services/<x>` → Re-Export-Shim auf `@/features/fantasy/services/*`)

Quelle: `boundary-check.ts` Importer-Count. Status-Logik: 0 Importer = DEAD?; > 0 = BRIDGE (inkrementelle Migration S4-F-4).

| Bridge | Importer | Status | Begründung / Action |
|--------|---------:|--------|---------------------|
| fixtures | 15 | **BRIDGE** | Aktiv genutzt; Migration auf kanonischen Pfad inkrementell (S4-F-4) |
| scoring | 14 | **BRIDGE** | Aktiv genutzt; inkrementell |
| lineups | 7 | **BRIDGE** | Aktiv genutzt; inkrementell |
| events | 6 | **BRIDGE** | Aktiv genutzt; inkrementell |
| predictions | 3 | **BRIDGE** | Aktiv genutzt; inkrementell |
| fantasyLeagues | 1 | **BRIDGE** | Aktiv genutzt; inkrementell |
| ~~wildcards~~ | 0 | **DEAD → GELÖSCHT (Slice 301)** | Reiner Re-Export-Shim, 0 Importer (S4-F-1). RED/GREEN-Proof erbracht → File entfernt + aus BRIDGES-const + baseline. |

**Removal-Proof wildcards (§11.3 erfüllt):**
- RED: `grep -rn "@/lib/services/wildcards" src/` → 0 Treffer (exit 1). 2. grep (jegliche Referenz auf `lib/services/wildcards`) → leer.
- Test-Mocks (`FantasyContent.test.tsx`, `error-keys-coverage.test.ts`) zeigen auf **kanonischen** Pfad `@/features/fantasy/services/wildcards` → unbetroffen.
- GREEN: `tsc --noEmit` 0 · Fantasy-Domain-vitest grün · `audit:boundary:check` clean (6 Bridges).

---

## 2. Direct-Supabase im Component-Layer (`@/lib/supabaseClient` außerhalb Service/Query-Facade)

Quelle: `boundary-check.ts` directSupabaseComponents = 5.

| File | Status | Begründung / Action |
|------|--------|---------------------|
| `src/components/providers/AuthProvider.tsx` | **KEEP** | Auth-Layer braucht direkten Client legitim (D74 Single-Source-Auth). Keine Facade sinnvoll. |
| `src/app/(app)/bescout-admin/AdminLigaTab.tsx` | **KEEP** | Admin-only, außerhalb Demo-Path. Niedrige Prio. |
| `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` | **KEEP** | Admin-only, außerhalb Demo-Path. Niedrige Prio. |
| `src/components/rankings/PlayerRankings.tsx` | **DEPRECATED-Pattern** | Demo-Path P2. Query-Facade-Migration = **S4-F-2** (Follow-up, nicht S6). Durch boundary-Ratchet eingefroren. |
| `src/components/profile/FollowListModal.tsx` | **DEPRECATED-Pattern** | Demo-Path P2. Query-Facade-Migration = **S4-F-3** (Follow-up, nicht S6). Durch boundary-Ratchet eingefroren. |

→ 3× KEEP, 2× DEPRECATED-Pattern (kein Delete — Migration ist eigener Track).

---

## 3. Components (src/components/ + src/features/ — JSX-Default-Exports)

Quelle: `orphan-component-detector.ts` (Report 2026-06-13).

| Metrik | Wert | Status |
|--------|-----:|--------|
| Components scanned | 159 | — |
| Orphans (real drift) | **0** | ✅ keine DEAD-Components |
| Known (allowlisted) | 4 | **KEEP** (allowlist-begründet, D52 #3) |
| Test-only used | 3 | KEEP (Test-Infra) |

→ Keine löschbaren Orphan-Components. Component-Achse ist sauber (laufender nightly-Guard `nightly-audit.yml`).

---

## 4. Tool/Script-Wiring

Quelle: `wiring-check.ts` (pre-commit Gate, D54). Status: alle audit:*-Scripts in package.json + ≥1 Trigger verkabelt.

| Script | Trigger | Status |
|--------|---------|--------|
| audit:type-truth / stale / wiring / boundary / test-confidence | pre-commit | **KEEP** (verkabelt) |
| audit:silent-fail / mutation-race | CI | **KEEP** |
| **audit:orphan** | **nightly-audit.yml** | **KEEP** (verkabelt — nightly) |
| audit:cron-health / i18n / rpc-security / compliance / tr-strings | nightly/CI | **KEEP** |

**Finding S6-F-1 (offen, §9-Anil-Decision):** `audit:orphan` läuft nur nightly. Pro-Comment `.husky/pre-commit:13` sagt „gehoert pre-push", aber nicht verkabelt. Kosten pre-push-Gate: +66s/Push (blockt nur bei REAL-Drift). **CTO-Empfehlung: NEIN** — Drift=0, nightly genügt, Friktion nicht gerechtfertigt. Kein Build-without-Wire (Tool IST verkabelt, nur an anderem Trigger). → Dokumentiert, nicht in Slice 301 umgesetzt.

---

## 5. Zusammenfassung

| Achse | KEEP | BRIDGE | DEPRECATED | DEAD (gelöscht) |
|-------|-----:|-------:|-----------:|----------------:|
| Bridges (7) | — | 6 | — | 1 (wildcards) |
| Direct-Supabase (5) | 3 | — | 2 | — |
| Components (159) | 7* | — | — | 0 |
| Scripts | alle | — | — | 0 |

\* 4 allowlisted + 3 test-only explizit erhalten; die übrigen 152 sind aktiv via JSX/Import genutzt (orphan-detector real-drift = 0) — kein Klassifikations-Bedarf.

**Net-Action Slice 301:** 1 bewiesenes Removal (wildcards-Bridge). Alle anderen Artefakte klassifiziert + begründet — keine weiteren Blind-Deletes. Follow-ups (S4-F-2/F-3 Facade-Migration) bleiben eigener Track.

**S6 = letzter Stabilization-Schritt. S0–S6 + E2E-Layer (293/298) abgeschlossen.**

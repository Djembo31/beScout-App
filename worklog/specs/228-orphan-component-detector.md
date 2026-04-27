# Slice 228 — `scripts/orphan-component-detector.ts` (D46-Component-Achse automatisiert)

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

---

## 1. Problem Statement

Slice 227 deckte `CommunityValuation` als orphan production-code auf — Component exported aber nirgends importiert. D46 in `decisions.md` wurde um "Orphan-Production-Component-Detection auf Component-Achse" erweitert mit Detection-Pattern, aber Tool fehlt. Manueller `grep` ist fragil + nicht CI-gate-ready.

**Wer betroffen:** Audit-Agents bei P1-Klassifikation (siehe Slice 216 K-RR-1 fake-fix-Drama). Future-Slices benötigen automatische Detection.

**Evidence:** `decisions.md` D46 Sub-Section "Erweiterung Slice 227". `worklog/proofs/visual-check-2026-04-27.md` Discovery.

## 2. Lösungs-Design

Pure-script-only (`scripts/orphan-component-detector.ts`). Algorithmus:

1. Find alle `*.tsx` in `src/components/` und `src/features/` mit `export default function ComponentName`
2. Für jedes: Component-Name extrahieren
3. Grep `<ComponentName[ />]` in `src/` — exclude die Definition-Datei selbst
4. Auch grep `import { ComponentName }` als Sekundär-Detection (falls re-exported via barrel)
5. Wenn 0 hits außer Definition + Barrel-Re-Export → **ORPHAN-CANDIDATE**
6. **Skip-List:** Next.js-Routing-Components (`page`, `layout`, `error`, `loading`, `default`, `template`, `not-found`, `route`, `head`) — diese werden by-Routing rendered, nicht via JSX-import
7. Markdown-Report nach `worklog/audits/orphan-components-YYYY-MM-DD.md`
8. Exit 0 bei 0 Hits, 1 sonst (CI-gate-ready)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/orphan-component-detector.ts` | NEU | Hauptscript |
| `package.json` | EDIT | Neuer npm-Script `audit:orphan` |

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/audit-stale-check.ts` | Vorbild Slice 223 | Code-Stil, fs-API, Markdown-Report-Format, Exit-Code-Konvention |
| `decisions.md` D46 "Erweiterung Slice 227" | Pattern-Source | Detection-Pattern-Spec + Skip-Konventionen |
| `src/components/player/detail/CommunityValuation.tsx` | Bekannter Orphan (Test-Case) | Tool muss diesen flaggen |
| `src/components/player/detail/index.ts` | Barrel-Export | Re-Export-Pattern, das ist OK; nur fehlende JSX-Verwendung ist problematisch |

## 5. Pattern-References

- `decisions.md` D46 (Erweiterung Slice 227) — Pattern-Source
- `decisions.md` D35 — Self-Review für scripts-only-Slice
- Slice 223 (`audit-stale-check.ts`) — Code-Stil-Vorbild

## 6. Acceptance Criteria

```
AC-1: [HAPPY] Skript läuft erfolgreich
  VERIFY: npx tsx scripts/orphan-component-detector.ts
  EXPECTED: Output-Summary "Scanned N components, found M orphans" + Markdown-Report
  FAIL IF: Crash, Parser-Fehler

AC-2: [REGRESSION] CommunityValuation wird als Orphan erkannt
  VERIFY: Run + check report contains "CommunityValuation"
  EXPECTED: ≥1 hit, exit 1
  FAIL IF: 0 hits (false-negative — Slice 227 Discovery zeigt es ist orphan)

AC-3: [SKIP-LIST] Next.js-Routing-Components werden geskipped
  VERIFY: Output zeigt nicht `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx` als orphans
  EXPECTED: 0 false-positives auf Routing-Components
  FAIL IF: Routing-Component flagged

AC-4: [PATTERN] Markdown-Report mit File-Pfad + Component-Name + Heal-Optionen
  VERIFY: cat worklog/audits/orphan-components-<date>.md
  EXPECTED: pro Orphan eine Sektion mit Component-Name + File-Pfad + 3 Heal-Optionen (delete/wire/defer)
  FAIL IF: Nur Count-Summary

AC-5: [TSC] tsc clean
  VERIFY: npx tsc --noEmit
  EXPECTED: exit 0
  FAIL IF: type errors

AC-6: [NPM-SCRIPT] pnpm run audit:orphan
  VERIFY: pnpm run audit:orphan
  EXPECTED: gleiche Output wie direkter Aufruf
  FAIL IF: Script-Eintrag fehlt
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | Parse | Component mit Generic-Type `<T,>` als Default-Export | Name-Match weiterhin funktioniert | Regex captures name only, generic-syntax wird ignoriert |
| 2 | Match | Component-Name ist substring eines anderen (`Card` vs `CardFrame`) | Word-Boundary verhindert false-match | Regex `<${name}[ />]` mit space/slash/`>` boundary |
| 3 | Skip | Re-Export-Only (e.g. `index.ts:export { default as X } from './X'`) | Nicht als JSX-Verwendung zählen | Filter Sekundär-Imports auf JSX-Tag-Pattern |
| 4 | Skip | Test-Files (`*.test.tsx`) verwenden Component | Test-Verwendung zählt als Verwendung (Component lebt zumindest in Tests) | Include `__tests__` in grep-Scope |
| 5 | Skip | Storybook-Stories (`*.stories.tsx`) | Sollten zählen | Aber keine in Repo aktuell — skip |
| 6 | Edge | `dynamic(() => import('@/components/X'))` Lazy-Import | Detect als Verwendung | Ergänze grep auf `import('@/components.*X)` |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npx tsx scripts/orphan-component-detector.ts
echo $?  # erwartet 1 (mind. CommunityValuation als Orphan)
cat worklog/audits/orphan-components-$(date +%Y-%m-%d).md
pnpm run audit:orphan
```

## 9. Open-Questions

**Pflicht-Klärung:** keine (Pattern bekannt aus Slice 223).

**Autonom-Zone:**
- Skip-List-Konfiguration (Routing-Components etc.)
- Output-Format-Detail
- Verbose-Flag optional

## 10. Proof-Plan

`worklog/proofs/228-orphan-detector-output.txt` — AC-Output + Run-History.

## 11. Scope-Out

- Auto-Fix: Skript löscht/wired Orphans NICHT — nur Detection
- CI-Gate-Trigger: kein automatisches GitHub-Action-Trigger jetzt
- Storybook-Detection: keine Stories im Repo

## 12. Stage-Chain

```
SPEC → IMPACT (skipped — scripts-only) → BUILD → REVIEW (self-review D35: scripts-only Slice-223-Wiederholung) → PROVE → LOG
```

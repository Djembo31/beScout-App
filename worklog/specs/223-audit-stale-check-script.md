# Slice 223 — `scripts/audit-stale-check.ts` (D48-Catcher automatisiert)

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

---

## 1. Problem Statement

D48 Audit-Stale-Drift haben wir 5× empirisch gehabt (Slice 200a UX-2, 200b R-03, 203 UX-12, 206 fantasy-marker, 209 12 mixed-marker — empirisch ~22% Drift-Rate über mehrere Polish-Sweeps). Pattern: Item wird in Slice X gefixt, aber `worklog/punch-list-2026-04-25.md` Detail-Tabelle bleibt auf `status: open`. Folge-Slice klassifiziert Item als "todo", investiert Spec/Reviewer-Zeit, entdeckt Duplikat → Reviewer-Reject oder Heal-Loop.

**Wer betroffen:** Primary-CTO bei jedem Polish-Sweep + Wave-Planning. Slice 209 hat Manual-Cleanup für 12 Marker auf einmal gebraucht (~30 min Audit-Zeit). Mit Tool: <30 sec Run + sofortige Klärung.

**Evidence:** D48 in `memory/decisions.md`. Punch-List `worklog/punch-list-2026-04-25.md:24` Drift-Note.

## 2. Lösungs-Design (Architektur)

Pure-script-only (`scripts/audit-stale-check.ts`, kein DB, kein npm-Service). Algorithmus:

1. Lies `worklog/punch-list-2026-04-25.md` als Markdown.
2. State-Machine: tracke aktuellen Domain-Header (`## Fantasy-Scoring`, `## UX-States`, `## FM-Mechanics`, `## Brand-Coherence`).
3. Parse jede Tabellen-Row (`| <id> | <status> | ...`) wenn Status ∈ {`open`, `in-progress`}.
4. Bilde domain-aware ID-Variants (z.B. UX-Domain mit ID `4` → Match-Pattern `UX 4|UX-4|ux 4|ux-4`).
5. Grep `worklog/log.md` (gesamt) nach Variants. Wenn ≥1 Match: Warning mit Line-Number + Snippet.
6. Output Markdown-Report nach `worklog/audits/audit-stale-YYYY-MM-DD.md` + stdout-Summary.
7. Exit-Code: 0 bei 0 Hits, 1 bei ≥1 Hit (CI-Gate-ready für Future).

Conservative: false-positives sind ok (Mensch entscheidet manuell), false-negatives sind das Echte-Risiko. Daher Variants großzügig.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/audit-stale-check.ts` | NEU | Hauptscript |
| `package.json` | EDIT | Neuer npm-Script `audit:stale` |

Keine Source-Files berührt. Keine DB. Kein i18n. Kein UI.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `worklog/punch-list-2026-04-25.md` (Zeile 130-280) | Detail-Tabellen-Format | Section-Header-Pattern, Row-Layout, ID-Formate je Domain |
| `worklog/log.md` (Top 50 Einträge) | Slice-Log-Format | Wie werden Item-IDs in Commit-Messages zitiert? `Brand 12`, `fm 1.1`, `UX 17`, `F-09`, `K-02`? |
| `scripts/check-bundle-size.ts` | Vorbild-Pattern | Welche Konvention für TypeScript-Scripts in diesem Repo (shebang, fs-API, exit-Codes, Output)? |
| `scripts/audit/i18n-coverage.js` | Audit-Skript-Vorbild | Output-Format, npm-Script-Naming-Konvention |

## 5. Pattern-References

- `decisions.md` D48 — Audit-Stale-Catcher-Pattern: Quelle-Pattern. Skript ist Operationalisierung.
- `decisions.md` D35 — Self-Review bei Trivial-Pattern-Wiederholung: Slice 223 Reviewer-Pflicht-Skip.
- `worklog/specs/_TEMPLATE.md` — XS-Mindest-Pflicht 6 Sektionen.
- `errors-infra.md` "Bundle-Budget-Gate" — Exit-Code-Pattern für CI-Gate-Ready-Scripts.

## 6. Acceptance Criteria

```
AC-1: [HAPPY] Skript läuft erfolgreich gegen aktuelle Punch-List
  VERIFY: npx tsx scripts/audit-stale-check.ts
  EXPECTED: Output-Summary "Checked N items, found M stale-candidates" + Markdown-Report nach worklog/audits/audit-stale-2026-04-27.md
  FAIL IF: Crash, parser-Error, exception bei missing file

AC-2: [REGRESSION] Aktuelle Punch-List hat 0 stale-candidates
  VERIFY: Run + check exit-code
  EXPECTED: Exit-Code 0 (Slice 209 hat manuell alle gecleant)
  FAIL IF: Exit-Code 1 — würde bedeuten Slice 209 Cleanup war unvollständig (real-actionable-info)

AC-3: [DOMAIN-COVERAGE] Alle 4 Domains werden geparst
  VERIFY: stdout zeigt "Domains processed: Brand-Coherence, UX-States, FM-Mechanics, Fantasy-Scoring"
  EXPECTED: 4 Domains
  FAIL IF: Section-Header-Tracking failed → fewer domains

AC-4: [ID-VARIANTS] Skript matcht Domain-ID auch in lowercase / hyphen-Variants
  VERIFY: Mock-Test inline (in script) oder unit test
  EXPECTED: ID `1.1` in FM-Domain matcht `FM 1.1`, `fm 1.1`, `FM-1.1`, `fm-1.1` in log.md
  FAIL IF: Nur exact-case-match, würde stale-Marker übersehen

AC-5: [MARKDOWN-REPORT] Report enthält Item-ID + Domain + Match-Lines
  VERIFY: cat worklog/audits/audit-stale-<date>.md
  EXPECTED: Pro stale-candidate eine Sektion mit ID, Domain, log.md-Match-Lines (Line-Nr + Snippet)
  FAIL IF: Nur Count-Summary ohne actionable Detail

AC-6: [NPM-SCRIPT] `pnpm run audit:stale` funktioniert
  VERIFY: pnpm run audit:stale (oder npm run)
  EXPECTED: Selbe Output wie direkt-Aufruf
  FAIL IF: Script-Eintrag fehlt in package.json oder mit falschem Command
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Parse | Row mit ID-Spalte hat Markdown-Style (z.B. ` **F-09** `) | `\| **F-09** \| open \| ...` | ID = `F-09` (gestrippt) | `.replace(/\*+/g, '').trim()` |
| 2 | Parse | Row hat Komma-IDs ("F-07, F-11") | `\| F-07, F-11 \| open \|` | Beide IDs behandeln | Split on `,` |
| 3 | Parse | Tabellen-Header-Row | `\| # \| Status \| Source \| ...` | Skip (kein status-Wert in legitimen Liste) | Whitelist Status-Werte |
| 4 | Match | ID-Substring-Collision | `K-02` matcht `K-021` | Word-Boundary mit `\b` (oder `[^\w-]`) | Regex mit Boundary |
| 5 | Match | log.md mention "Slice 207 closed K-02" → echter Hit; aber "K-02 deferred" → false-positive | log.md Pattern-Variation | Conservative: melde alle Mentions, Mensch entscheidet | Output mit Snippet damit Anil sieht Context |
| 6 | Output | Keine stale-Items gefunden | 0 stale | Exit-Code 0 + "✅ No stale markers found" stdout | Nicht crashen, kein leeres Markdown |

## 8. Self-Verification Commands

```bash
# Pflicht jeder Slice:
npx tsc --noEmit

# Skript-Run:
npx tsx scripts/audit-stale-check.ts

# Acceptance:
echo $?  # erwartet 0 nach Slice 209 Cleanup

# Inspect Report:
cat worklog/audits/audit-stale-$(date +%Y-%m-%d).md

# npm-Script:
pnpm run audit:stale

# Negative-Test (manuelles tampering, dann revert):
# 1. Kurze Teständerung: marker eines done-Items auf "open" setzen in punch-list (NICHT committen)
# 2. Run script → erwartet Hit + exit-code 1
# 3. Revert: git checkout worklog/punch-list-2026-04-25.md
```

## 9. Open-Questions

**Pflicht-Klärung:** keine (CTO-Scope, Pattern bekannt).

**Autonom-Zone:**
- Output-Format Markdown-Report
- Skript-Stil (klassen vs. function-only)
- Verbose-Flag (--verbose) als Bonus optional
- Domain-Header-Detection (regex vs. Marker-State-Machine)
- ID-Variant-Generation-Strategy

**Nicht-Autonom-Zone:** Alles Money-Path / RPC-Touch — entfällt hier komplett.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Workflow / Tooling | `worklog/proofs/223-audit-stale-output.txt` (stdout-Capture vom Run gegen aktuelle Punch-List) + `worklog/audits/audit-stale-2026-04-27.md` (generiertes Report-File) |
| Negative-Test | `worklog/proofs/223-negative-test.txt` (manuell mutation einer Row + Run + revert + zweiter Run zeigt 0 Hits) |

## 11. Scope-Out

- **CI-Gate:** kein automatisches GitHub-Action-Trigger jetzt → Slice 224+ wenn Pattern stabil. (Begründung: erst Stabilität verifizieren bevor wir Workflow zwingen.)
- **Auto-Fix:** Skript korrigiert NICHT die Punch-List automatisch → Mensch reviewt + commited. (Begründung: Audit-Stale-Catcher = Detection-Tool, nicht Mutation-Tool. False-Positive-Risk zu hoch für Auto-Edit.)
- **Punch-List-Format-Migration:** kein Refactor in YAML/JSON → Markdown-Tabellen-Parser bleibt. (Begründung: existing Pattern, kein Need.)
- **D43/D49 type-truth-audit:** separater Slice 226+ (anderes Pattern, RPC vs Type).
- **Stop-Hook Phase-Tracker-Update:** Wave-3-Tooling-Backlog (Slice 225+).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: scripts/-only kein RPC/Service/Schema) → BUILD → REVIEW (self-review D35: XS-Slice, scripts-only, neue Datei-NICHT-Refactor, kein User-Code) → PROVE → LOG
```

**IMPACT-Skip-Begründung:** `scripts/audit-stale-check.ts` hat KEINEN runtime-Consumer. Keine RPC, kein Service, kein Type-Export. `package.json`-Edit ist Standalone (npm-Script-Add).

**REVIEW als Self-Review (D35):** Trivial-Pattern (script-only, kein Logik in src/), kein UI, kein Money-Path, kein i18n. Reviewer-Agent-Overhead > Catch-Probability.

---

## Open Risiko (kurz, ehrlich)

**Risiko 1:** Skript ist zu great-positive — meldet gar nichts weil Pattern-Match zu strikt. **Mitigation:** Conservative-Match-Strategy + manuelle Sanity-Check via Slice 198-Linie (sollte UX 17 von "open"→"done" Slice 210 als "stale" gefunden haben WENN lockerer Test in Punch-List wäre).

**Risiko 2:** False-positive-Flood (jedes Item irgendwann in log.md erwähnt). **Mitigation:** Skript meldet "candidates", nicht "stale". Mensch entscheidet via Snippet-Context. Erwartung Slice 209 Cleanup ist sauber → 0 Candidates jetzt.

**Risiko 3:** Punch-List-Format-Drift in Zukunft → Skript bricht. **Mitigation:** Tolerant-Parser (try/catch pro Row, weiter parsen bei Fehler). Test-Run nach jedem größeren Punch-List-Edit.

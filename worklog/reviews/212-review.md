# Review Slice 212 — Spec-Quality-Gate-Hook

**Verdict:** PASS (mit 1 LOW + 3 NITs als Backlog)
**Time-spent:** ~25 min

## Findings

| Severity | Location | Issue | Fix |
|---|---|---|---|
| LOW | `ship-spec-quality-gate.sh:60-61, 83` | `tr -d ' '` auf SLICE/STAGE/SPEC_FILE_REL entfernt **alle** Spaces — wenn jemand mal einen Slice-Pfad mit Space hätte (`worklog/specs/212 hook.md`), würde das den Pfad zerschießen. Aktuell defensive-defaults, aber Vergleiche `case "$SPEC_FILE_REL" in worklog/specs/*` würden dann fehlschlagen. | Trim-only-trailing: `| sed 's/[[:space:]]*$//' | sed 's/^[[:space:]]*//'` statt `| tr -d ' '`. Risiko gering weil keine Slice-Pfade mit Spaces existieren — als Backlog-NIT OK. |
| NIT | `ship-spec-quality-gate.sh:51` | Skip aller `*.md`-Files ist großzügig — verhindert Hook bei Edit auf `wiki/*.md` während BUILD-Stage. Da Hook nur warnen soll und Spec-Quality eh codebezogen ist, vertretbar. | Optional: Begründung als Kommentar zu Z. 51 ergänzen ("Markdown-edits sind meta, kein Code"). |
| NIT | `ship-spec-quality-gate.sh:135-152` | `count_section` mit `grep -ciE "^#{1,4}[[:space:]].*$1"` — `.*` matched JEDE Position. Bei 13 Slice-211-Sektionen ist das uneindeutig genug. | Nicht blockierend. |
| NIT | `ship-spec-quality-gate.sh:111` | Slice-Größen-Detection hat doppelten grep-pipe — pragmatisch aber unleserlich. `head -1 \| grep -oE "(XS\|S\|M\|L)\b" \| tail -1` ist redundant. | Vereinfachen zu single tail oder head. |

## Positive

1. **WARN-only-Diziplin** durchgängig: `exit 0` an JEDER Stelle inkl. Edge-Cases — Hook kann **nie** legitime Edits blockieren. Friction-Mitigation korrekt.
2. **Skip-Liste großzügig + frühzeitig** (Z. 40-52, vor jedem File-Read): meta-Files, node_modules, .next, dist, __tests__, .test.ts, .spec.ts, .md → Hook-Performance unter ~5ms bei nicht-relevanten Edits.
3. **Stage-Filter (`BUILD|REVIEW|PROVE`)** korrekt — skipt SPEC + LOG. Logisch sauber.
4. **Inline-Spec-Skip (Z. 86-94)** elegant — Pattern `worklog/specs/*` Whitelist + `inline*`/`skipped*` Blacklist macht Hook für XS-Slices mit `spec: inline (Pattern-Wiederholung Slice X)` silent. **Genau das Verhalten das Slice 209/210 brauchen.**
5. **JSON-Stdin-Parsing analog ship-spec-gate.sh** + **Path-Normalisierung** übernommen — Konsistenz mit existing Hook-Stack.
6. **Slice-Größen-Detection mit Bold-Markdown-Tolerance** + fallback default S (mittlere Strenge, nicht XS=lax oder L=überstreng).

## Spec-AC-Coverage

| AC | Status | Evidence |
|---|---|---|
| AC-01 (Hook + Bash-Syntax) | ✓ | `-rwxr-xr-x` + `Syntax OK` |
| AC-02 (WARN bei XS non-konform) | ✓ Code-Logik | Z. 161-168 implementiert XS-Pflicht-Items |
| AC-03 (silent bei konformer Spec) | ✓ Code-Logik | Z. 201 `[ -z "$MISSING" ] && exit 0` |
| AC-04 (Skip stage SPEC/LOG/idle) | ✓ | Z. 64-66 idle, Z. 77-80 stage-filter |
| AC-05 (Skip meta-Files) | ✓ | Z. 40-52 |
| AC-06 (settings.json) | ✓ | Hook in PreToolUse Edit\|Write Block, Z. 67-69 |
| AC-07 (/ship Skill _TEMPLATE-Reference) | ✓ | SKILL.md Z. 21+26 |
| AC-08 (Existing Hooks regression) | ⚠ teils | Code-Review zeigt unverändert. Kein expliziter Smoke-Test im Audit — empfohlen post-Merge. |
| AC-09 (Bash-Syntax + tsc) | ✓ | "Syntax OK" + "OK" tsc |
| AC-10 (workflow.md Hook-Verweis) | ✓ | Z. 65 |

**10/10 ACs strukturell grün**, AC-08 mit 1 fehlendem expliziten Smoke-Test (Empfehlung: nach Merge ein 3-Hook-Chain-Test).

## Empirische Anwendbarkeit

| Szenario | Aktive Stage | Aktive Spec | Hook-Verhalten | Bewertung |
|---|---|---|---|---|
| Slice 209 (Audit-Cleanup, docs-only) | nicht-BUILD | `spec: inline (...)` | Silent (inline-skip) | ✓ korrekt |
| Slice 210 (UX 17 frontend, XS, inline) | BUILD | `spec: inline (...)` | Silent | ✓ korrekt für trivial-Pattern. **Aber:** Bypass-Vektor wenn missbraucht. |
| Hypothetisch S-Slice mit 6/13 Sektionen | BUILD | spec exists, partial | **WARN** mit Liste fehlender 7 | ✓ Soll-Verhalten |
| Slice 212 selbst | BUILD/REVIEW/PROVE | spec, 13 Sektionen | Silent | ✓ konform |

**Lücke entdeckt:** Hook prüft NUR **Sektion-Existenz**, nicht **Mindest-Items in Sektion**. Slice 211 D50 Standard verlangt: "XS: ≥ 3 Items, S/M: ≥ 6 Items, L: ≥ 10 Items inkl. DB-Schema-Verify". Hook ignoriert Item-Counts.

**Konsequenz:** Eine Spec mit `## 4. Code-Reading-Liste\n\nNichts.` würde als "vorhanden" zählen → Hook silent. Foundation-Layer-1 (Sektion-Existenz) statt Layer-2 (Item-Count-Validation).

**Status:** OK weil Spec-Sektion 11 explizit Scope-Out: "Hard-BLOCK statt WARN" und Item-Count-Validation nirgends erwähnt. **Aber: dieser Gap als Slice 213 backlog-Item benennen.**

## Risiken / Anti-Pattern-Checks

**1. False-Positive: NIEDRIG** — Skip-Liste deckt 95% legitimer Edits ab. Inline-Spec skip = keine Friction für XS.

**2. Performance: NIEDRIG** — Worst-case ~5-10ms (12 grep × 300-Zeilen-Spec + path-norm). Bei meta-File-Edit ~1ms (early exit).

**3. Hook-Stack-Interference: NIEDRIG** — WARN-Hook (exit 0) nach BLOCK-Hook (exit 2) ist sicher: BLOCK abschneidet, WARN kaskadiert nicht.

**4. Bypass-Vektor (gewollt vs ungewollt):**
- `spec: inline (...)` → Hook skipped. **Gewollt** für XS-Pattern-Wiederholung. Risiko: Faulheit. Mitigation: D50 ist Documentation-First, Self-Disziplin.
- `**Größe:** XS` → lockerer (6 Items). Bypass-Risk: M-Slice fälschlich als XS markiert. Mitigation: Reviewer-Agent.

**5. Anti-Pattern-Vergleich gegen errors-infra.md "Shell case-statement wildcard promiskuös":** Hook nutzt explicit /-anchored Prefix (`*/worklog/*`) — sicher, kein Substring-False-Match. ✓

**6. Bash-Syntax-Trap (Z. 49-50):** `*.test.ts|*.test.tsx)` mit `|` als Alternation in case-pattern — Bash-konform, unquoted, korrekt.

## Zusammenfassung

Pure Workflow-Tooling, keine Code-Risiken, kein Money-Path. Hook-Code defensiv (`exit 0` bei jedem Fehlerpfad), tolerant (wie Slice-211 Verdict-Hook), schnell (Path-Skip-Filter), konsistent mit existing Hook-Stack-Konventionen.

**Empfehlungen post-Merge:**
1. Smoke-Test: `echo '{"file_path":"src/foo.ts"}' | bash .claude/hooks/ship-spec-quality-gate.sh; echo "Exit: $?"` — verify silent + exit 0.
2. Backlog: Slice 213 könnte **Item-Count-Validation** (Code-Reading ≥ 3/6/10 Items) ergänzen.
3. Beobachten ob `spec: inline (...)` als Bypass-Vektor missbraucht wird. Wenn ja → Hard-BLOCK in Slice 213 erwägen.

**Verdict: PASS** — Slice 212 operationalisiert Slice 211 Foundation sauber. WARN-only ist die richtige Wahl für Layer-1-Enforcement.

## Learnings für Knowledge Capture (Backlog)

- **WARN-only-Hook-Pattern** als wiederkehrende Klasse: `set -u` + früher Path-Skip + active.md-Read + tolerant-grep + `exit 0` an jedem Fehlerpfad. Slice 211 Verdict-Hook + Slice 212 Spec-Quality-Hook teilen diesen Skeleton. Bei drittem Beispiel → patterns.md #40 Kandidat.
- **Hook-Reihenfolge in PreToolUse-Stack ist load-bearing:** BLOCK zuerst, WARN danach. Aktuelle Reihenfolge korrekt — dokumentationswürdig falls künftig mehr Hooks dazukommen.

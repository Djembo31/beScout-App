# E0-W2gov — Wissens-Governance verdrahtet

**Slice-Type:** Tool + Hook + Doc + Decision
**Größe:** M
**Parent:** `worklog/specs/E0-operating-system-knowledge-base.md` (Epic E0, Welle 2)
**Trigger:** Anil — „nicht nur planen, sondern dafür dass es wie erwartet funzt, alle komplett verdrahten mit Verstand." Antwort auf die 5 Wissens-Fragen.

## 1. Problem-Statement
W2a baute die Landkarte (INDEX + Aufnahme-Regel), aber 3 von Anils 5 Fragen sind ungelöst: **Korrektheit** (ist gespeichertes Wissen wahr?), **Aktualität** (wer fängt Drift?), **Korrektur/Erweiterung** (Regeln pro Bucket). Genau diese Lücken haben `memory/semantisch` getötet (Files behaupteten „truth", drifteten unbemerkt). Ein un-gouverniertes System rebaut den Friedhof.

## 2. Lösungs-Design
Den Wissens-Lebenszyklus als **Gesetz (D88)** + **Mechanik (Tool+Hook+Kopplung)** festschreiben — keine Text-Regel ohne Enforcement (D45 „Hooks > Text-Regeln").
- **D88 (PROCESS):** Lebenszyklus — Korrektheit (Verifikations-Anker), Aktualität (Detektor+Kopplung), Korrektur-Regeln pro Bucket (decisions=append-only/supersede, domain/lessons/research=überschreiben-mit-Spur).
- **`scripts/audit-knowledge.ts`** (Geschwister der 6 bestehenden Audits): intelligente Integritäts-Checks, `--check`-Mode, Report nach `worklog/audits/`, Exit-Codes 0/1/2.
- **Verkabelung:** package.json (`audit:knowledge` + `:check`) · `.husky/pre-commit` (HARTE Checks blockieren) · `nightly-audit.yml` (WEICHE Staleness → sichtbar, blockiert nicht).
- **Front-matter:** `verified-against: <pfad> @ <datum>` (optional, für domain-Files die Code beschreiben) + Korrektur-Regeln in README.
- **SHIP-Kopplung:** workflow.md LOG-Stufe + §3a DoD — „Domain berührt → docs/knowledge mit-updaten" (Code-Änderung und Wissen im SELBEN Slice).

## 3. Detektor-Checks (mit Verstand: HART blockt jetzt-eingeführte Bugs, WEICH macht Drift sichtbar)
| Check | Severity | Warum |
|---|---|---|
| INDEX-Link zeigt auf nicht-existente Datei | HARD | jetzt eingeführter Routing-Bug |
| Content-File in Bucket ohne INDEX-Eintrag (Orphan) | HARD | unauffindbares Wissen |
| Content-File ohne Pflicht-Front-matter | HARD | Konvention-Verstoß jetzt |
| INDEX-Eintrag-Zeile ohne `consult_when` | SOFT | Routing schwach |
| `verified-against`-Ziel seit Verify-Datum in git geändert | SOFT | Code driftete → Wissen prüfen |
| `updated` älter als STALE_MONTHS (6) | SOFT | Verdacht auf Veraltung |

`--check` (pre-commit): exit 1 nur bei HARD. SOFT als Warnung gedruckt. Default (manuell): exit 1 bei jedem Finding.

## 4. Code-Reading-Liste
1. `scripts/audit-stale-check.ts` — Audit-Muster (Report/Exit/--check) ✅ gelesen
2. `package.json` audit:*-Block — Naming-Konvention ✅ gelesen
3. `.husky/pre-commit` — wo HARTE Checks einhängen ✅ gelesen
4. `.github/workflows/nightly-audit.yml` — wo WEICHE Checks + Auto-Issue einhängen
5. `memory/decisions.md` Ende — D87 + Template, wo D88 chronologisch rein
6. `docs/knowledge/README.md` + `INDEX.md` — Front-matter-Konvention + Link-Format (Detektor muss matchen)

## 5. Acceptance Criteria
- AC1: `pnpm audit:knowledge:check` exit 0 auf aktuellem Repo (0 HARD). VERIFY: `pnpm audit:knowledge:check; echo $?`.
- AC2: Detektor fängt echten Defekt: temporär INDEX-Link brechen → exit 1 + Finding → revert → exit 0. VERIFY: deliberate-break-test im Proof.
- AC3: `audit:knowledge` + `audit:knowledge:check` in package.json. VERIFY: `grep -c 'audit:knowledge' package.json` ≥ 2.
- AC4: `.husky/pre-commit` ruft `audit:knowledge:check`. VERIFY: `grep -c 'audit:knowledge' .husky/pre-commit` ≥ 1.
- AC5: D88 in decisions.md, PROCESS, mit Alternativen. VERIFY: `grep -c '## D88' memory/decisions.md` == 1.
- AC6: workflow.md LOG/DoD-Kopplung. VERIFY: `grep -c 'docs/knowledge' .claude/rules/workflow.md` ≥ 3 (DISTILL + LOG + DoD).
- AC7: README hat `verified-against` + Korrektur-Regeln pro Bucket. VERIFY: `grep -c 'verified-against' docs/knowledge/README.md` ≥ 1.
- AC8: nightly-audit.yml ruft `audit:knowledge` (soft). VERIFY: `grep -c 'audit:knowledge' .github/workflows/nightly-audit.yml` ≥ 1.

## 6. Edge Cases
| Fall | Erwartung |
|---|---|
| 0 Content-Files (jetzt) | Detektor exit 0, Orphan/Front-matter trivially pass, INDEX-Links geprüft |
| INDEX-Prosa-Zeile (kein Entry) | consult_when-Check nur auf `- [..](..)`-Zeilen |
| INDEX-Link auf Verzeichnis (`domain/`) | existsSync(dir)=true → ok, skip |
| git nicht verfügbar | verified-against-Check try/catch → skip, kein Crash |
| README.md/INDEX.md selbst | von Content-Scan ausgeschlossen |
| pre-commit darf nicht auf Staleness blocken | --check = nur HARD |

## 7. Self-Verification Commands
```bash
pnpm audit:knowledge:check; echo "exit=$?"
grep -c 'audit:knowledge' package.json .husky/pre-commit .github/workflows/nightly-audit.yml
grep -c '## D88' memory/decisions.md
grep -c 'docs/knowledge' .claude/rules/workflow.md
grep -c 'verified-against' docs/knowledge/README.md
```

## 8. Scope-Out
- Keine physische Gold-Migration (W2b). Keine Archivierung (W2c).
- Kein Auto-Update von `updated`/`verified` (bleibt menschlich/CTO — Human-Curated).
- nightly-Live-Run-Verify = beim nächsten Nightly (post-merge), nicht in diesem Slice erzwingbar.

## 9. Proof-Plan
Self-Verification-Output + deliberate-break-Test (AC2) als `.txt`.

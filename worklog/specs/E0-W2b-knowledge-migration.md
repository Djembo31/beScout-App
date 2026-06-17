# E0-W2b — Wissens-Basis migrieren (13 Gold-Files → docs/knowledge/)

**Slice-Type:** Doc + Decision
**Größe:** L
**Parent:** `worklog/specs/E0-operating-system-knowledge-base.md` (Epic E0, Welle 2)

## 1. Problem-Statement
Durables Wissen liegt verstreut (138 Brocken / 5 Quellen, Inventur `worklog/notes/E0-welle2-wissens-inventur.md`) — dasselbe oft an 3 Orten (Treasury: concept + D83 + trading.md). W2a baute Index + Skelett, W2gov den Lebenszyklus-Gate. W2b füllt das Haus: die durablen Gold-Files physisch nach `docs/knowledge/<bucket>/` heben, auf Juni-Stand, Dups auflösen. Evidence: `memory/semantisch`-Assessment (`E0-welle2-memory-quality-assessment.md`) — Gold-Kerne tragen „Last Updated 2026-03/04", kennen keine Juni-Anker (D80/D83/D86, Slices 329-332).

## 2. Lösungs-Design — 3-Schichten-Kanon (Anil 2026-06-17)
- `docs/knowledge/domain/` = WIE es funktioniert = **Kanon-Inhalt** (alle Zahlen leben hier).
- `memory/decisions.md` = WARUM (kurze Entscheidung + Link auf domain). Bleibt SSOT, append-only.
- `.claude/rules/*.md` = schlanke path-scoped Code-Regel mit **Zeiger** statt Voll-Kopie.
Jede Datei in den 4 Buckets bekommt Pflicht-Front-matter (6 Felder) + INDEX-Zeile mit `consult_when` (sonst HARD-Block via `audit:knowledge:check`). domain-Files, die Code beschreiben, bekommen `verified-against: <pfad> @ <datum>`.

## 3. Migrations-Matrix
| Quelle | Ziel | Bucket | Wer | Juni-Update? |
|---|---|---|---|---|
| `worklog/concepts/csf-club-treasury-model.md` | `domain/treasury.md` | domain | ME (§3) | ✅ 329-332 DONE-Stand |
| `worklog/concepts/polls-engagement-monetization-model.md` | `domain/polls.md` | domain | ME (§3) | — (Juni-frisch) |
| `worklog/concepts/reward-ranking-ecosystem.md` | `domain/reward-ranking.md` | domain | ME | leichte Note |
| `worklog/concepts/setup-elite-upgrade.md` | `research/claude-code-setup.md` | research | ME | — |
| `memory/semantisch/produkt/mogul-mutationsplan.md` | `decisions/mogul-mutationsplan.md` | decisions | ME (VERTRAULICH) | status-Flag |
| `memory/semantisch/produkt/bescout-product-map.md` | `domain/product-map.md` | domain | Agent A | flag drift |
| `memory/semantisch/produkt/bescout-vision.md` | `domain/vision.md` | domain | Agent A | „historisch"-Flag behalten |
| `memory/semantisch/produkt/bescout-feature-dependencies.md` | `domain/feature-dependencies.md` | domain | Agent A | flag drift |
| `memory/semantisch/projekt/missions-architecture.md` | `domain/missions.md` | domain | Agent B | flag drift |
| `memory/semantisch/projekt/equipment-realtime.md` | `domain/equipment-realtime.md` | domain | Agent B | flag drift |
| `memory/semantisch/projekt/architecture-3hub.md` | `domain/architecture-3hub.md` | domain | Agent B | flag drift |
| `memory/semantisch/projekt/bescout-liga.md` | `domain/bescout-liga.md` | domain | Agent B | DEFERRED-Konzept |
| `memory/deps/cross-domain-map.md` | `domain/cross-domain-map.md` | domain | Agent C | ✅ Treasury/CSF/Polls ergänzen |
| `memory/features/fantasy.md` | `domain/fantasy.md` | domain | Agent C | flag drift |
| `memory/semantisch/pattern/{rls-cross-user-writes,tier-based-config,slot-composition,db-i18n-schema-extension}.md` | `lessons/<name>.md` | lessons | Agent D | — |

`memory/semantisch/personen/anil.md` → bleibt MEMORY.md-Block (NICHT migrieren).

## 4. Decisions-Merges (in memory/decisions.md, append-only-Spur)
- **D28 + D39** „DB-Invariants via Trigger+GUC" → D39 als Kanon, D28 `status: superseded → D39` + Link.
- **D62 + D65 + D67** „Reviewer-VOR-BUILD" → D62 als Kanon-Eintrag mit Evolution-Note, D65/D67 als superseded-Zeiger.

## 5. Pattern-References
- `docs/knowledge/README.md` (Front-matter-Pflicht, Korrektheit/Korrektur-Regeln pro Bucket)
- D87 (`verified-against`-Konvention, Live-functiondef VOR Prosa), D88 (Lebenszyklus)
- common-errors `errors-infra.md` „KNOWN_ORPHANS" (Wiring-Self-Block-Lehre)
- Worktree-Escape §0: hier nicht relevant (kein Worktree), aber Agents schreiben mit RELATIVEN Pfaden.

## 6. Acceptance Criteria
1. Alle 15 Gold-Files (13 + Treasury/Polls) liegen in `docs/knowledge/<bucket>/` mit 6 Pflicht-Front-matter-Feldern. VERIFY: `npx tsx scripts/audit-knowledge.ts --check` → 0 HARD.
2. `INDEX.md` zeigt für jede migrierte Datei auf den NEUEN `docs/knowledge/`-Pfad, jede Zeile mit `consult_when`. VERIFY: grep INDEX auf `memory/semantisch|worklog/concepts` → 0 (außer bewusst belassene).
3. domain-Files, die Code/DB beschreiben (treasury, missions, equipment, cross-domain-map, fantasy), haben `verified-against`.
4. Alt-Pfade entfernt NUR wenn keine Referenz mehr (grep `src/ scripts/ messages/ .claude/ worklog/ memory/`). VERIFY pro Datei.
5. D28/D39 + D62/65/67 konsolidiert mit superseded-Spur.
6. `pnpm audit:knowledge:check` grün (0 HARD); SOFT dokumentiert.

## 7. Edge Cases
| Fall | Erwartung |
|---|---|
| Neue Datei in Bucket, INDEX noch nicht aktualisiert | Orphan-HARD — daher INDEX VOR Commit assemblen |
| consult_when in Frontmatter ≠ INDEX-Zeile | erlaubt, aber synchron halten (Konvention) |
| Treasury-Concept §8 IST-Stand vor 329-332 | auf DONE-Stand heben (RAUS-Kanäle gebaut) |
| cross-domain-map kennt kein Treasury/Polls | ergänzen, sonst gedriftet migriert |
| Alt-Pfad noch referenziert (z.B. trading.md → concept) | Zeiger auf neuen Pfad umbiegen, dann erst alt löschen |
| mogul VERTRAULICH | status-Flag + Vertraulichkeits-Hinweis, kein Inhalts-Leak in INDEX-consult_when |
| created-Datum unbekannt | Original-mtime/erstes-git-Datum nehmen; updated=2026-06-17 |

## 8. Self-Verification
```bash
npx tsx scripts/audit-knowledge.ts            # voller Report
npx tsx scripts/audit-knowledge.ts --check     # pre-commit-Sicht (nur HARD blockt)
grep -rnE "memory/semantisch|worklog/concepts|memory/deps|memory/features" docs/knowledge/INDEX.md
# Alt-Pfad-Referenzen vor Löschung:
grep -rn "<altpfad>" src/ scripts/ messages/ .claude/ worklog/ memory/
```

## 9. Open-Questions
- **Autonom-Zone:** Bucket-Zuordnung, Front-matter, faithful-relocate-Wording, INDEX-Pfade, D-Merge-Formulierung.
- **Pflicht-Klärung (war Anil):** ✅ Kanon-Modell (3-Schichten) + Scope (alle 13) — geklärt 2026-06-17.

## 10. Proof-Plan
`worklog/proofs/E0-W2b-proof.txt`: `audit-knowledge --check` Output (0 HARD) + grep-INDEX-Output (keine Alt-Pfade) + `ls docs/knowledge/{domain,decisions,lessons,research}`.

## 11. Scope-Out
- W2c (≈90 ephemere memory-Files archivieren, cortex-index physisch ablösen) — separater Schritt.
- W3 Hygiene (Screenshots gitignoren), W4 Historie-Rewrite.
- Konsolidierung product-map+vision+wiki/overview zu EINER Datei (jetzt 1:1-Relocate; Merge optional später).
- `.claude/rules/*` schlank-machen (Zeiger setzen) nur wo Alt-Pfad-Referenz umgebogen wird; voll-Diät = W2c.

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT (skipped: keine Code-/RPC-/Schema-Änderung, reine Doku-Migration) → BUILD → REVIEW (Cold-Context) → PROVE → LOG.

## 13. Pre-Mortem
1. Agent schreibt absolute Pfade → Datei landet falsch. Mitigation: Briefing „relative Pfade", ich verifiziere via `ls docs/knowledge`.
2. INDEX-Pfade nicht alle umgebogen → broken-link/orphan HARD. Mitigation: zentrale INDEX-Assembly + audit vor Commit.
3. Alt-Datei gelöscht obwohl noch referenziert → toter Link in Code/rules. Mitigation: grep-Gate pro Datei vor Löschung (AC4).
4. Treasury/Polls-Inhalt verfälscht bei Relocate → Money-Drift. Mitigation: ME selbst (§3), Inhalt 1:1 + nur Build-Status-Update.
5. consult_when fehlt in INDEX-Zeile → SOFT. Mitigation: aus bestehender INDEX-Zeile übernehmen.
6. mogul-Vertraulichkeit verletzt. Mitigation: kein Strategie-Detail in consult_when; status-Flag.

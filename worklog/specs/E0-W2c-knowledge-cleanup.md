# E0-W2c — Wissens-Welle abschließen (Stubs entfernen, cortex ablösen, ephemere Files archivieren)

**Slice-Type:** Doc + Hygiene · **Größe:** L · **Parent:** `worklog/specs/E0-operating-system-knowledge-base.md`

## 1. Problem-Statement
Nach W2b liegt der Kanon in `docs/knowledge/`, aber: (a) 18 Redirect-Stubs verbleiben als Duplikat-Pfade, (b) `memory/cortex-index.md` (alte Routing-Tabelle) wird noch von 3 Consumern gelesen aber ist von `INDEX.md` abgelöst, (c) der `memory/`-Vault ist zu ⅔ ephemer/leer (Assessment `E0-welle2-memory-quality-assessment.md`: 6 leere Slots, 6 EPHEMER-Halden) — totes Gerüst, das Routing + Suche verrauscht.

## 2. Lösungs-Design
1. **cortex-index ablösen:** 3 Consumer (`inject-context-on-compact.sh`, `morning-briefing.sh`, `SHARED-PREFIX.md`, `autodream.md`) auf `docs/knowledge/INDEX.md` (+ `worklog/active.md` für Live-Status) repointen, DANN cortex → `_archive`.
2. **18 Migrations-Stubs entfernen** (Kanon in docs/knowledge + git-Historie).
3. **Ephemere Subtree-Files → `memory/_archive/2026-06-17-w2c/`** (archive-not-delete, Hermes-Lesson): journals (42), projekt-Phase-Snapshots (10), features-ephemeral (7), sprint, personen.
4. **Leere Junk-Slots löschen:** 5 leere Scaffolding-Dirs (.gitkeep), rules-pending.
5. **`learnings/` BLEIBT** (aktiver Mechanismus: 9 Agents schreiben drafts, reflect/promote liest) — Korrektur nach Fehl-Klassifikation.

## 3. Scope-Out (bewusst NICHT in W2c)
- **38 root `beta-*/phase3-*/audit_*` Files + MEMORY.md-Trim** → W3 Hygiene (berührt den geladenen Index, eigener sorgfältiger Pass; kein silent-cap — explizit verschoben).
- `patterns.md`/`errors.md`-Dup-Auflösung (W2b-Klärpunkt #5, offen).
- `autodream`-Agent-Redesign (Premise von docs/knowledge abgelöst — nur bannert, nicht neu gebaut).

## 4. Acceptance Criteria
1. `memory/cortex-index.md` in `_archive`, alle 3+1 Consumer zeigen auf INDEX.md/active.md. VERIFY: grep live-files auf `cortex-index` = nur Banner/Archiv.
2. 18 Stubs weg. VERIFY: `ls memory/semantisch/{produkt,pattern} memory/deps memory/features worklog/concepts` — keine migrierten Files.
3. Ephemere Files in `_archive/2026-06-17-w2c/`. VERIFY: `ls`.
4. `learnings/` intakt (6 Templates + drafts/-Dir). VERIFY: `ls memory/learnings`.
5. **Kein LIVE-File (.claude/hooks, skills, src, scripts, INDEX) zeigt auf einen moved/deleted Pfad.** VERIFY: broken-ref grep leer.
6. `audit:knowledge:check` weiter grün (0 HARD).

## 5. Edge Cases
| Fall | Erwartung |
|---|---|
| Consumer liest cortex nach Archivierung | erst repointen, dann mv |
| `learnings/` als Junk klassifiziert | FALSCH — aktiver Mechanismus, behalten (Korrektur) |
| inject/morning-briefing lesen sprint/current (archiviert) | auf active.md repointen (Live-Status) |
| beScout-backend SKILL → cross-domain-map Stub | auf docs/knowledge/domain/ repointen |
| git mv vs rm | mv für Archiv (Historie), rm für Stubs/Junk (Kanon/git-Historie reicht) |

## 6. Self-Verification
```bash
npx tsx scripts/audit-knowledge.ts --check
grep -rn "cortex-index\|semantisch/produkt\|semantisch/pattern\|deps/cross-domain\|features/fantasy\|workflow-reference" .claude/hooks .claude/skills src scripts docs/knowledge/INDEX.md | grep -v _archive
ls memory/learnings memory/_archive/2026-06-17-w2c
```

## 7. Proof-Plan
`worklog/proofs/E0-W2c-proof.txt`: audit-check + broken-ref-grep (leer) + git-stat (renames/deletes) + ls _archive + ls learnings.

## 8. Stage-Chain
SPEC ✅ → IMPACT skipped (Doku/Hygiene, keine Code-Logik; Consumer-Repointing in §2 erfasst) → BUILD ✅ → REVIEW (Cold-Context, destruktiv = warranted) → PROVE → LOG.

## 9. Pre-Mortem
1. Consumer liest archivierten cortex → kaputt. Mitig: repoint-vor-mv (getan). ✅
2. Aktiven Mechanismus archiviert (learnings) → Agent-Flow bricht. Mitig: broken-ref-grep fing es, revertet. ✅
3. Stub gelöscht obwohl live referenziert → toter Link. Mitig: live-file broken-ref-grep. ✅
4. Root-Files + MEMORY.md halb gemacht → Index-Rot. Mitig: explizit auf W3 verschoben (nicht angefasst). ✅
5. Historie-Verlust. Mitig: git mv (Renames) + git-Historie bei rm. ✅

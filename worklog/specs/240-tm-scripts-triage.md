# Slice 240 — TM-Once-Off-Scripts Triage (5 archive, 8 keep)

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Doc · **Scope:** CTO · **Datum:** 2026-04-28

> Slice 234 wiring-check fand 13 KNOWN_ORPHANS in TM/Migration-Domain. Slice 240 triagiert: 5 archivieren (once-off-jobs done), 8 behalten (operational manual-tools, future-Use). 0 deletes (archive ist sicherer). Pure-File-Move + KNOWN_ORPHANS-Update.

---

## 1. Problem Statement

Slice 234 `audit:wiring` zeigt 13 TM-Scripts + 1 once-off-fix-Script + 1 once-off-migration-shell als `KNOWN_ORPHANS` (allowlisted). Triage: welche sind echte Once-Off-Jobs (Phase-B-fertig, archive-ready) und welche sind operational manual-tools (keep)?

Status-Confusion entsteht weil Allowlist undifferenziert: "TM-Scrape-Maintenance" mischt manual-operational-tools (`tm-rescrape-stale.ts`) mit done-once-jobs (`tm-club-id-discovery.ts` Slice 141 Multi-League Mapping fertig). Pre-Slice-240: Allowlist-Comment-Drift.

**Wer ist betroffen:** Future-Operators (Anil oder ich) die nach TM-Tool suchen für Operational-Need. Junk-Scripts machen Discovery schwerer. Auch CI-Audit-Output Drift-frei aber Reader-Confusion-prone.

**Wie oft:** Stetig wachsend. Jedes Once-Off-Script (BUG-Fix, Migration-Helper, Phase-B-Backfill) lebt forever in scripts/ wenn nicht aktiv archiviert.

## 2. Lösungs-Design

Triage-Tabelle für 13 Scripts:

| Script | Klasse | Begründung |
|--------|--------|------------|
| `tm-club-id-discovery.ts` | ARCHIVE | Slice 141 Multi-League TM-Club-Mapping (Phase B done — alle 7 Ligen mapped) |
| `tm-squad-scrape-local.ts` | ARCHIVE | Slice 144 Squad-Scrape-Wellen (Phase B done) |
| `tm-html-inspect.mjs` | ARCHIVE | Debug-Helper für tm-parser-sanity (9-Liner, dev-time-only) |
| `fix-bug-004.ts` | ARCHIVE | BUG-004 closed (events stuck status='running' fixed) |
| `fix-migration-history.sh` | ARCHIVE | Supabase Migration-History-Repair (once-off, done) |
| `tm-parser-sanity.ts` | KEEP | Manual TM-Parser-Regression-Test, future-Use bei Parser-Edits |
| `tm-parser-verify.ts` | KEEP | Pair-Tool zu sanity, future-Use |
| `tm-profile-local.ts` | KEEP | Operational TM-Profile-Scraper (Cloudflare-Workaround), recurring |
| `tm-rescrape-stale.ts` | KEEP | Operational maintenance für stale-TM-data, recurring |
| `tm-search-local.ts` | KEEP | Operational TM-Search (Cloudflare-Workaround), recurring |
| `tm-search-scrape-unknown.ts` | KEEP | Operational unknown-Player-Recovery, recurring |
| `enrich-nationality-tm.ts` | KEEP | Nationality-Backfill manual on Multi-League-Import |
| `verify-nationality-coverage.ts` | KEEP | Nationality-Audit-Tool, manual on demand |

**Aktion:**
1. Archive 5 scripts → `scripts/archived/2026-04-28-once-off/<original-name>`
2. KNOWN_ORPHANS in `scripts/wiring-check.ts` updaten: archived entries entfernen, kept entries mit präziseren Begründungen
3. README.md in archive-dir mit Slice-References

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/tm-club-id-discovery.ts` | MOVE | → `scripts/archived/2026-04-28-once-off/` |
| `scripts/tm-squad-scrape-local.ts` | MOVE | → `scripts/archived/2026-04-28-once-off/` |
| `scripts/tm-html-inspect.mjs` | MOVE | → `scripts/archived/2026-04-28-once-off/` |
| `scripts/fix-bug-004.ts` | MOVE | → `scripts/archived/2026-04-28-once-off/` |
| `scripts/fix-migration-history.sh` | MOVE | → `scripts/archived/2026-04-28-once-off/` |
| `scripts/archived/2026-04-28-once-off/README.md` | NEU | Slice-References + Zweck-Dokumentation |
| `scripts/wiring-check.ts` | EDIT | KNOWN_ORPHANS reduzieren von 14 → 9 (5 archived) + Comments präzisieren |
| `worklog/specs/240-tm-scripts-triage.md` | NEU | Diese Spec |
| `worklog/active.md` + `worklog/log.md` | EDIT | Stage-Updates + Slice-Eintrag |
| `worklog/proofs/240-tm-scripts-triage.txt` | NEU | Pre/Post-Audit-Verify |

**Vor diesem Slice greppen:**
```bash
# Verify scripts existence
ls scripts/tm-*.ts scripts/tm-*.mjs scripts/enrich-nationality-tm.ts scripts/verify-nationality-coverage.ts scripts/fix-bug-004.ts scripts/fix-migration-history.sh
# Verify no production import of archived scripts
grep -rE "tm-club-id-discovery|tm-squad-scrape-local|tm-html-inspect|fix-bug-004|fix-migration-history" src/ scripts/ .github/ 2>/dev/null
# (expected: 0 matches in production-paths)
```

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/tm-club-id-discovery.ts:1-15` | Slice-141-Marker | Confirm "Phase B done" Argument |
| `scripts/tm-squad-scrape-local.ts:1-15` | Slice-144-Marker | Same |
| `scripts/wiring-check.ts:49-75` | Existing KNOWN_ORPHANS | Wo entries removen + wie Begründungen formatieren |
| `worklog/audits/wiring-2026-04-28.md` | Aktueller Audit-Stand | Pre-Triage-Snapshot |
| `worklog/log.md` | Slice-141/144 Closure | Verify "Phase B done"-Behauptung |

## 5. Pattern-References

- Slice 234 D54 — Build-without-Wire-Pattern. KNOWN_ORPHANS-Allowlist ist D54-Konstrukt
- Slice 209 — Audit-Stale-Cleanup (Doc-Slice Pattern, 4. Iteration)
- `errors-infra.md` "Spec-Drift-im-Drift-Heal" (Slice 241 Lehre #1) — KNOWN_ORPHANS-Comment-Drift ist Cousin
- `workflow.md` "Bug gefixt → Pattern in errors-* SOFORT" — Once-Off-Scripts archive analog

## 6. Acceptance Criteria

```
AC-01: [ARCHIVE] 5 Scripts in _archive/ verschoben
  VERIFY: ls scripts/archived/2026-04-28-once-off/ | wc -l
  EXPECTED: ≥ 6 (5 scripts + 1 README)
  AND VERIFY: ls scripts/tm-club-id-discovery.ts scripts/tm-squad-scrape-local.ts scripts/tm-html-inspect.mjs scripts/fix-bug-004.ts scripts/fix-migration-history.sh 2>&1 | grep -c "No such"
  EXPECTED: 5 (alle 5 weg aus scripts/)

AC-02: [KEEP] 8 Operational-Tools stehen noch in scripts/
  VERIFY: ls scripts/tm-parser-sanity.ts scripts/tm-parser-verify.ts scripts/tm-profile-local.ts scripts/tm-rescrape-stale.ts scripts/tm-search-local.ts scripts/tm-search-scrape-unknown.ts scripts/enrich-nationality-tm.ts scripts/verify-nationality-coverage.ts 2>&1 | grep -c "No such"
  EXPECTED: 0 (alle 8 still da)

AC-03: [WIRING-AUDIT] audit:wiring zeigt reduzierte KNOWN_ORPHANS
  VERIFY: pnpm run audit:wiring 2>&1 | grep "Total orphans"
  EXPECTED: Total ≤ 9 (war 14, -5 archived)
  AND VERIFY: audit:wiring exit 0 (no real-drift)

AC-04: [KNOWN_ORPHANS-LISTE] wiring-check.ts up to date
  VERIFY: grep -c "scripts/tm-club-id-discovery\|scripts/tm-squad-scrape-local\|scripts/tm-html-inspect\|scripts/fix-bug-004\|scripts/fix-migration-history" scripts/wiring-check.ts
  EXPECTED: 0 (alle 5 entfernt aus KNOWN_ORPHANS)
  AND: grep -c "scripts/tm-rescrape-stale\|scripts/tm-profile-local\|scripts/tm-parser-sanity" scripts/wiring-check.ts
  EXPECTED: 3+ (operational keepers noch in Allowlist)

AC-05: [README] _archive-Folder hat README.md mit Slice-References
  VERIFY: grep -E "Slice (141|144)|fix-bug-004|fix-migration-history" scripts/archived/2026-04-28-once-off/README.md | wc -l
  EXPECTED: ≥ 4 Slice-Refs

AC-06: [NO-PROD-DEPS] Keine production-Imports auf archived scripts
  VERIFY: grep -rE "tm-club-id-discovery|tm-squad-scrape-local|tm-html-inspect|fix-bug-004|fix-migration-history" src/ .github/workflows/ .claude/hooks/ package.json 2>/dev/null
  EXPECTED: 0 Matches
```

## 7. Edge Cases

| # | Flow | Case | Mitigation |
|---|------|------|------------|
| 1 | Archive-Folder existiert | scripts/_archive/ neu? | mkdir -p funktioniert idempotent |
| 2 | Datums-Conflict | Zukunfts-Slice archiviert anders | Datums-Subfolder `2026-04-28-once-off/` ist eindeutig |
| 3 | Git-Move vs Copy+Delete | Wann move history beibehalten? | git mv statt mv für history-preservation |
| 4 | Linux-Symlink in Archive | Keine — archived scripts sind self-contained | NPM-Scripts referenzieren keinen archivierten |
| 5 | wiring-check noisy nach Move | Archive-Subfolder MUSS aus walk skipped werden | walk-Detection skipt `_archive/` Subfolder bereits via existing IGNORE_DIRS oder muss erweitert werden |

## 8. Self-Verification Commands

```bash
# Pre-Slice-240:
pnpm run audit:wiring 2>&1 | grep -E "Total orphans|Real drift"  # Total: 14, Real: 0
ls scripts/tm-*.ts scripts/tm-*.mjs scripts/fix-bug-004.ts scripts/fix-migration-history.sh | wc -l  # 13

# Post-Edit:
ls scripts/archived/2026-04-28-once-off/ | wc -l  # 6 (5 + README)
pnpm run audit:wiring 2>&1 | grep -E "Total orphans|Real drift"  # Total ≤ 9, Real: 0
ls scripts/tm-club-id-discovery.ts 2>&1 | grep "No such" && echo "✓ archived"

# Cross-Verify keine Production-Refs:
grep -rE "tm-club-id-discovery|tm-squad-scrape-local|tm-html-inspect|fix-bug-004|fix-migration-history" src/ .github/ 2>&1 | head
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — Triage-Decision ist deterministic basierend auf Header-Inspection.

**Autonom-Zone:** Archive-Folder-Naming, README-Wording, KNOWN_ORPHANS-Begründungs-Präzisierung.

**Nicht-Autonom:** Keine. Pure File-Move + Comment-Update.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Doc / File-Move | Pre/Post `ls` + `audit:wiring` + grep-Verify keine Prod-Refs → `worklog/proofs/240-tm-scripts-triage.txt` |

## 11. Scope-Out

- **DELETE**-Klasse: Aktuelles Risk-Profil empfiehlt KEIN echtes Delete. Archive ist reversibel, Delete hat Discovery-Cost wenn jemand das Script doch sucht (git log show)
- **Keep-Tools-Code-Review**: Tool-Funktionalität nicht angepasst, nur Status-Klassifikation
- **Tagging Phase-B-done**: keine separate Datenbank/Marker — README im Archive reicht

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: Doc + File-Move only)
     → BUILD (5 git mv + README + KNOWN_ORPHANS-edit)
     → REVIEW (self-review D35 — XS Doc/File-Move)
     → PROVE (audit:wiring + grep-Verify)
     → LOG
```

## Open Risiko

**Risk:** Archived Script wird später gebraucht und hat unsichtbaren git-history-loss. **Probability:** LOW — `git mv` preserves history, `git log --follow` zeigt Pre-Move-Path. **Mitigation:** README-Datei mit "Original-Path: scripts/<name>.ts" für Discovery.

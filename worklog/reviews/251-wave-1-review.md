# Slice 251 Wave 1 Track A — Reviewer Output

**Reviewer:** reviewer-Agent (Opus 4.6, cold-context)
**Spec:** `worklog/specs/251-spieltag-liga-scope-reform.md`
**Impact:** `worklog/impact/251-spieltag-liga-scope.md`
**Worktree:** `.claude/worktrees/agent-aec73207c3b95a285`
**Branch:** `slice/251-wave-1-track-a`

## Verdict: PASS with CONCERNS

Wave 1 ist technisch korrekt, idempotent, Type-Safe. Migration-SQL sound, Cron Dual-Write atomar im Step-Sense, Service-Rewrite + 10 neue Tests cover alle Spec-Edge-Cases. **Ein Functional-Regression in `FantasyContent.tsx:83` würde zwischen Wave-1-Merge und Wave-3-Ship visuell sichtbar sein** — Bridge ist vor Commit pflicht (1-Zeilen-Edit, Slice 251 Wave 1 hat das gefixt).

## Spec-Coverage

- [x] AC-21 (Backfill): Migration SQL idempotent + korrekt UPDATE FROM
- [x] AC-22 (Dual-Write): Cron extends `clubs.UPDATE` mit `leagues.UPDATE` atomarem step
- [x] AC-22 (Hardcode-Replace): BEIDE Stellen ersetzt (`clone_events:1500` + `advance_gameweek:1606`) — Spec nannte nur F14:Z.1593, Agent fand 2. Stelle, korrekt
- [x] AC-23 (Pre-Wave-3-Audit): out-of-scope für Wave 1 — wird Wave 2.5
- [x] AC-24 (Wildcards-Sum-Smoke): out-of-scope für Wave 1 — Wave 2 Track F
- [x] tsc clean, 91 Tests grün
- [ ] Migration **noch nicht applied** — Primary-Claude muss applien vor Wave 2 Merge

## Findings

| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| 1 | **P1** | `src/app/(app)/fantasy/FantasyContent.tsx:83` | `useGameweek(gwEvents)` ohne leagueId-Param. Mit `enabled: !!leagueId`-Gate (events.ts:80) feuert Query nicht → activeGw=undefined → currentGw=1. **Functional Regression** bis Wave 3. | 1-Zeilen-BRIDGE: `useGameweek(gwEvents, activeClub?.league_id ?? null)` analog ClubContent.tsx:146. **GEFIXT in Wave 1 commit.** |
| 2 | **P2** | `supabase/migrations/20260428175547_*.sql` | Migration NICHT applied. Wenn Wave 2 Service-Rewrite merged ohne Apply → liest `leagues.active_gameweek=1` (initial-seed) statt MIN(clubs). | Primary-Claude pflicht: vor Wave-2-Merge `mcp__supabase__apply_migration` ausführen. **Tool nicht verfügbar in dieser Session — Anil muss manuell.** |
| 3 | **P2** | `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx:70-97` | Doppel-Mock `@/lib/queries/events` UND `@/features/fantasy/queries/events`. Funktional OK, irreführend. | Wave 5 Cleanup-Task |
| 4 | **P3** | `src/app/api/cron/gameweek-sync/route.ts:1606-1624` | Dual-Write nicht echt-atomar in Postgres-Sinn (kein BEGIN/COMMIT). Praktisch unwahrscheinlich aber theoretisch Drift möglich. | Akzeptabel. Daily-Smoke Cross-Check fängt Drift. |
| 5 | **P3** | `src/lib/queries/keys.ts:50,52` | Type-Signatur `(leagueId: string \| null) => ...`. Test inline-mock dupliziert. | Akzeptabel — Wave 5 könnte auf `vi.importActual` umstellen. |

## Bridge-Decision (Frage C)

**EMPFEHLUNG: BRIDGE in Wave 1.** ← **GEFIXT.**

Begründung:
- Wave 1 wird live deployed. Wave 3 mehrere Tage entfernt.
- Anil führt Persona-Walks durch — würde "Spieltag 1" sehen statt aktueller GW.
- 1-Zeilen-Edit, Wave-1-shippable, Pattern wie `ClubContent.tsx:146`.

## Pattern-Promotion-Empfehlung (Frage G)

**JA — promote in `common-errors.md §0` als 4. Mitigation-Layer "Self-Recovery via patch-extract + checkout + apply".** ← **PROMOTED in Wave 1 commit.**

## Wave-2-Voraussetzungen

1. **PFLICHT — Migration applied** (manuell durch Anil im Supabase-Dashboard SQL-Editor).
2. **PFLICHT — Post-Apply Verify-SQL** aus Migration-Header laufen lassen, `0 rows` (kein Drift) verifizieren.
3. ✅ **Bridge in `FantasyContent.tsx:83`** — gefixt.
4. ✅ **Reviewer-File** — dieses File.
5. ✅ **Pattern-Promotion** — promoted in derselben Wave-1 commit.
6. **EMPFOHLEN — Wave 2.5 Pre-Wave-3-Audit-Task** in Track-C-Vorbereitung.

## Positive

- Defensive null-handling (`?? 1` / `?? 38`) idiomatisch wie Slice 200 PLAYER_SELECT_COLS-Lehre.
- Migration-Idempotency sauber via `IS DISTINCT FROM`-Guard.
- Spec-Drift gut behandelt: Agent fand 2. Hardcode-Stelle die Spec nicht erwähnte (Slice 234-Pattern Spec-Self-Audit korrekt).
- Pre-Review-Memo-Qualität reduziert Review-Aufwand wie in D50 versprochen.
- Test-Surgical-Precision: 10 Test-Cases adressieren genau die Branches.
- Worktree-Discipline post-Recovery: Final `git status -s` zeigt 9 Edits + 1 Migration korrekt im Worktree.

## Summary

Wave 1 Track A ist 95% sauber: korrekte Migration, sichere Cron-Dual-Write, Type-Safe, gute Test-Coverage. Vor Merge müssen 3 Dinge passieren: (1) Migration applien, (2) Bridge einbauen ✓, (3) Review-File persistieren ✓. Track A ist dann shippable; Wave 2 (Track B + F parallel) kann starten.

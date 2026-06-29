# Slice 457 — D-11: Dead-Scoring-Modell GC (bescout_scores + score_events + award_score_points)

**Slice-Type:** Migration · **Größe:** S · **Scope:** Scoring-Domäne, aber tote Objekte (0 Rows, 0 Caller) → Dead-Feature-GC. DROP irreversibel + §3-nah → selbst, Reviewer-Pflicht, CEO-Apply (Anil: „D-11-GC mache ich in jedem Fall", W2-Wahl 2026-06-29).

## 1. Problem (Evidence: Live-DB skzjfhvgccaeplydsunz, D87)
Disease-Register **D-11**: `bescout_scores` + `award_score_points` + `score_events` = totes 3./4./5. Scoring-Modell neben den zwei lebenden (scout_scores kanonisch + user_stats-Projektion seit S454). In `reward-ranking.md` („3 Welten") nie erfasst. Lehrbuch-R5 (Bauen-auf-Vorrat ohne GC).

**Live verifiziert (2026-06-29):**
- `bescout_scores` existiert, **0 Rows**. 2 RLS-Policies (`bescout_scores_insert_own`, `bescout_scores_select_all`). 1 outbound FK → profiles. Keine inbound FK, keine Trigger, keine View.
- `score_events` existiert, **0 Rows**. 1 RLS-Policy (`score_events_select_own`). 1 outbound FK → profiles. Keine inbound FK, keine Trigger, keine View.
- `award_score_points(uuid,text,integer,text,uuid,text)` existiert, schreibt **nur** in diese 2 toten Tabellen (`pg_proc.prosrc`-verifiziert), **0 SQL-Caller** (`pg_proc`-Writer/Caller-Enum, S453-Methode), **0 src/-Caller** (Grep: nur False-Positives — Cron-Step-Label `'score_events'` ≠ Tabelle + 2 Test-Listen-Einträge). ACL = `{postgres, service_role}` (kein anon/authenticated → kein Live-Exploit-Vektor, aber trotzdem GC).

## 2. Lösung (reine Subtraktion, §0 „Subtrahieren ist ein Zug")
1 Migration: DROP der Funktion + beider Tabellen. Keine CASCADE nötig (Policies/FK/Indizes droppen automatisch mit der Tabelle; keine inbound Dependency).

## 3. Betroffene Files
- `supabase/migrations/<ts>_slice_457_dead_scoring_gc.sql` (DROP FUNCTION + 2× DROP TABLE).
- `src/lib/__tests__/db-invariants.test.ts` — 2 verwaiste Allowlist-Einträge scrubben (`bescout_scores` aus EXPECTED_PUBLIC Z.1622, `score_events` aus EXPECTED_SENSITIVE Z.1693). Test-Logik bricht NICHT (iteriert Live-Matrix, Case C silent), aber Code-Kommentar Z.1737-1739 verlangt Code-Review-Scrub gedroppter Tabellen.
- `.claude/rules/gamification.md:59` — `award_score_points` aus der REVOKE-Doku-Zeile entfernen (Doc-Kopplung, Schnitt-Regel).
- `worklog/notes/disease-register.md` — D-11 → geheilt; D-17 Path-2-Residual final als bewusste-zwei (CEO: Projektion behalten).

## 4. Code-Reading (D87 erledigt)
1. ✅ `to_regclass` + row-count beider Tabellen (beide existieren, 0 Rows).
2. ✅ `award_score_points` Identity-Args + prosrc (schreibt nur in die 2 toten Tabellen) + ACL (postgres/service_role).
3. ✅ Caller-Enum: `pg_proc.prosrc ~* 'award_score_points'` → nur die Funktion selbst (0 echte Caller). src/scripts/.claude-Grep → 0 echte Reader.
4. ✅ DROP-Footprint: keine Views, keine inbound FK, keine Trigger auf den Tabellen.
5. ✅ Test-Map-Nutzung gelesen: Allowlists werden gegen Live-Matrix geprüft (Case C = verwaiste Einträge silent-toleriert).

## 5. Pattern-References
- §0 Subtraktion + Schnitt-Regel (alter Weg weg ODER protokolliert) · R5 (Bauen-auf-Vorrat ohne GC) · S453 Writer-Enum (Caller-Completeness via pg_proc, nicht File-Grep) · DROP-Safety (safety-guard Hook erwartet bewusste DROP).

## 6. Acceptance Criteria
- AC1: nach Apply `to_regclass('public.bescout_scores') IS NULL` UND `to_regclass('public.score_events') IS NULL`.
- AC2: `award_score_points` nicht mehr in `pg_proc` (0 Rows für proname).
- AC3: `scout_scores` + `user_stats` + `score_history` (lebende Tabellen, ähnliche Namen) UNVERÄNDERT vorhanden (Gegenprobe — kein versehentlicher Über-DROP).
- AC4: `db-invariants.test.ts` enthält keine `bescout_scores`/`score_events`-Allowlist-Einträge mehr; `npx tsc --noEmit` grün.
- AC5: `gamification.md` REVOKE-Zeile nennt `award_score_points` nicht mehr.
- AC6: Pre-Apply force-rollback-Smoke: DROP läuft fehlerfrei durch (keine versteckte Dependency), Objekte im Tx weg, ROLLBACK → Objekte wieder da.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Versteckte inbound FK auf die Tabellen | force-rollback-Smoke würde mit Dependency-Error scheitern → fängt es VOR Apply |
| award_score_points hat Overloads | Live-Query zeigt genau 1 Signatur → exakter DROP, kein Überraschungs-Match |
| Tabelle in Realtime-Publication | DROP TABLE entfernt sie automatisch aus `supabase_realtime` |
| Test-File in vitest excluded (Live-DB) | tsc prüft Syntax der Edits; CI bricht nicht; Scrub = Hygiene laut Code-Kommentar |
| score_events als String-Label in Cron | False-Positive (Step-Name ≠ Tabelle) → kein Code-Change in route.ts |

## 8. Self-Verification
- Pre: `BEGIN; DROP FUNCTION...; DROP TABLE...; SELECT to_regclass(...) (×2) + count(pg_proc); ROLLBACK;`
- Post-Apply: `SELECT to_regclass('public.bescout_scores'), to_regclass('public.score_events')` → beide NULL; `SELECT count(*) FROM pg_proc WHERE proname='award_score_points'` → 0; Gegenprobe scout_scores/user_stats/score_history → not null.
- `npx tsc --noEmit` + `npx vitest run` (Regressions-Sicherheit der Test-Datei-Edits).

## 9. Open-Questions
- Keine. CEO-Scope abgedeckt (W2-Wahl + „D-11-GC in jedem Fall"). DROP = §3, ich apply selbst nach Smoke + Reviewer.

## 10. Proof-Plan
`457-dead-scoring-gc.txt`: force-rollback-Smoke (Objekte im Tx weg) + post-apply Existenz-Query (3 Objekte weg, 3 lebende Gegenproben da) + tsc/vitest-Ausschnitt.

## 11. Scope-Out
- Path-2 (user_stats-Score-Spalten droppen) — CEO 2026-06-29: **Projektion behalten** (drift-sicher seit S454, register-gesegnet bewusste-zwei). NICHT Teil dieses Slices.
- Andere Dead-Feature-GC (D-10 scout_missions, D-13 season_reset_scores, D-14/15/16) — eigene Slices.

## 12. Stage-Chain
SPEC → IMPACT (skipped: keine lebenden Consumer, 0 Rows/0 Caller verifiziert) → BUILD (Migration) → PROVE (force-rollback + post-apply) → REVIEW (Reviewer-Agent: ist es wirklich tot?) → CEO-Apply → LOG.

## 13. Pre-Mortem
- „Tabelle doch nicht tot (Caller übersehen)" → pg_proc-Writer-Enum (S453) + src/scripts/.claude-Grep, alle 0 echte Caller; force-rollback fängt Dependency.
- „Über-DROP einer lebenden Tabelle" → exakte Namen + AC3-Gegenprobe (scout_scores/user_stats/score_history bleiben).
- „award_score_points an einen Trigger gebunden" → prosrc-Enum zeigt 0 Caller inkl. Trigger-Funktionen (auch in pg_proc); keine Trigger-Funktion referenziert es.
- „Doc/Test-Verweis bleibt zurück (Schnitt-Regel-Verstoß)" → gamification.md:59 + 2 Test-Einträge mit-gescrubbt.
- „greenfield db reset bricht" → DROP IF EXISTS idempotent; die alten CREATE-Migrationen bleiben (git=Historie), der spätere DROP läuft danach.

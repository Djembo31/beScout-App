# Slice 277 — Gameweek-Cron advance_gameweek auch in Skip-Branches

**Status:** SPEC · **Größe:** S · **Slice-Type:** Service · **Scope:** CTO · **Datum:** 2026-05-06

> S-Slice: 2-3 Files, klar umrissen, Pattern-Wiederholung der `advance_gameweek` Phase-B-Logik in 2 Skip-Branches.

---

## 1. Problem Statement

`gameweek-sync` Cron in `src/app/api/cron/gameweek-sync/route.ts` hat 2 Early-Return-Skip-Branches die `advance_gameweek` NICHT aufrufen. Wenn eine Liga ihre aktive GW vollständig fertig gespielt + gescored hat, returnt der Cron mit `already_complete: skipped` ohne `clubs.active_gameweek` und `leagues.active_gameweek` auf den nächsten GW zu bumpen. Konsequenz: chronischer GW-Drift +1, UI zeigt „Spieltag beendet" für gerade fertige GW dauerhaft.

**Evidence:**
- Anil-Live-Bug 2026-05-06: „alle Spieltage werden weiterhin als beendet angezeigt" (nach Slice 273-Heal)
- Hot-Fix Slice 276b: 4 Ligen manuell geheilt (Bundesliga, 2.BL, Süper Lig, Serie A)
- Cron-Log 2026-05-06 06:00 UTC: 4× `already_complete: skipped` ohne advance-Step
- `worklog/proofs/276b-gameweek-hotfix.txt` (vollständige Diagnose)

**Wer ist betroffen?** Alle 7 Ligen täglich nach voll-gescored-GW-Tag. Recurrent-Bug bis fix.

## 2. Lösungs-Design (Architektur)

Vor jedem early-return in `already_complete` und `no_past_fixtures` Skip-Branch prüfen:
1. Ist `nextGw <= league.maxGameweeks`?
2. Hat `nextGw` Fixtures in `fixtures` für Liga-Clubs?

Wenn beide ja → `advance_gameweek` durchführen (gleiche dual-write-Logik wie Phase B Z.1598-1616), dann return.

Sonst → return wie bisher.

**Datenfluss:**

```
Pre-Slice-277:
  GW32 alle finished + alle scored
  → already_complete (skipped)
  → return  ← active_gw bleibt 32

Post-Slice-277:
  GW32 alle finished + alle scored
  → already_complete-Detektion
  → check: nextGw=33, GW33 hat fixtures? → JA
  → advance_gameweek: clubs.active_gw=33, leagues.active_gw=33
  → logStep('advance_after_skip', 'success', ...)
  → return  ← active_gw = 33 ✓
```

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/app/api/cron/gameweek-sync/route.ts` | EDIT | Z.502-513 + Z.532-544 advance-Block einfügen. Gleiche Logik wie Z.1598-1616 als Helper extrahieren. |
| `src/app/api/cron/gameweek-sync/route.test.ts` (NEU oder erweitert) | NEU/EDIT | 6 Test-Cases: 3 Skip-Branches × {advance fällig / not fällig} |
| `worklog/proofs/277-cron-advance-on-complete.txt` | NEU | DB-Smoke + Test-Output als Proof |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/app/api/cron/gameweek-sync/route.ts` Z.480-560 | Skip-Branch-Logik verstehen | Welche Variablen sind in Scope? `clubsToProcess`, `allLeagueClubIds`, `league`, `activeGw` |
| `src/app/api/cron/gameweek-sync/route.ts` Z.1595-1620 | Phase-B advance-Block | Genaue dual-write-Sequence — clubs zuerst, leagues atomar im selben runStep |
| `src/app/api/cron/gameweek-sync/route.ts` Z.85-110 | `ActiveLeague.maxGameweeks` | Per-Liga-Cap (TFF1=34, BL=34, PL=38), Fallback 38 |
| `worklog/proofs/276b-gameweek-hotfix.txt` | Hot-Fix-Beweis | DB-State pre/post + welche Ligen betroffen |
| `.claude/rules/errors-infra.md` Section „Cron-Skip-Branch ohne advance_gameweek-Aufruf" | Bug-Pattern | Detection-Query + Fix-Pattern-Snippet |
| `memory/decisions.md` D69 | Process-Lehre | Warum dieser Slice statt N+2 ist |

## 5. Pattern-References (relevant für DIESEN Slice)

- **errors-infra.md** „Cron-Skip-Branch ohne advance_gameweek" — Bug-Pattern + Fix-Snippet (Slice 276b promotion)
- **errors-db.md** Slice 140 „Cron-Guard API-Response-Count vs DB-Count" — verwandte Bug-Klasse, aber andere Achse (API-vs-DB statt Skip-Branch)
- **workflow.md §3a** Definition-of-Done für Service-Slices — Test-Coverage 6 Cases pflicht
- **D69** „Backlog-Sub-Track MUSS nächster Slice sein" — Begründung warum Slice 277 jetzt, nicht später

## 6. Acceptance Criteria

1. **AC1:** Nach `already_complete`-Detektion ruft Cron `advance_gameweek` auf wenn `nextGw <= maxGameweeks` UND `nextGw` Fixtures hat.
   VERIFY: Manueller Test mit DB-Setup `GW=32 alle finished+scored, GW=33 fixtures='scheduled'` → Cron-Run → `clubs.active_gameweek = 33` UND `leagues.active_gameweek = 33`.

2. **AC2:** Nach `no_past_fixtures`-Detektion ruft Cron `advance_gameweek` analog auf.
   VERIFY: DB-Setup `GW=32 finished, GW=33 fixtures.played_at > NOW()` → Cron-Run → active_gw=33.

3. **AC3:** Saisonende-Edge: wenn `nextGw > maxGameweeks` → KEIN advance, return wie bisher.
   VERIFY: TFF1 GW=34 finished, maxGameweeks=34 → Cron-Run → active_gw bleibt 34, log-Step `season_end_no_advance`.

4. **AC4:** Postponed-Match-Edge: wenn `nextGw` Fixtures hat aber `firstOpenGw < activeGw` (alte Postponed) → Cron muss trotzdem advance ausführen (NICHT auf alten Postponed-GW zurückspringen).
   VERIFY: PL GW=35 finished, GW=31 hat 1 scheduled (postponed), GW=36 hat 10 scheduled → Cron → active_gw=36.

5. **AC5:** vitest 6 Test-Cases grün (3 Branches × 2 advance-Fälle).
   VERIFY: `npx vitest run src/app/api/cron/gameweek-sync/`.

6. **AC6:** tsc --noEmit clean.
   VERIFY: `npx tsc --noEmit`.

## 7. Edge Cases Table

| # | Szenario | Erwartung |
|---|----------|-----------|
| 1 | GW alle finished + alle scored, GW+1 hat scheduled fixtures | advance_gameweek ✓ |
| 2 | GW alle finished + alle scored, GW+1 hat KEINE fixtures (Saisonende) | KEIN advance, log `season_end_no_advance` |
| 3 | GW alle finished + alle scored, GW+1 == maxGameweeks+1 | KEIN advance, log `season_end_no_advance` |
| 4 | GW unfinished aber alle in Zukunft (no_past_fixtures), GW+1 hat fixtures | advance_gameweek ✓ |
| 5 | GW unfinished aber alle in Zukunft, GW+1 leer | KEIN advance |
| 6 | GW finished, Postponed alter GW noch scheduled, GW+1 hat fixtures | advance_gameweek auf GW+1 ✓ (nicht auf alten Postponed zurück) |
| 7 | Phase B läuft (existing path) | unverändert, advance wie pre-Slice-277 |
| 8 | Cron-Failure mid-update (clubs done, leagues fail) | Throw → runStep markiert error → keine Inkonsistenz weil atomar |

## 8. Self-Verification Commands

```bash
# tsc clean
npx tsc --noEmit

# Tests
npx vitest run src/app/api/cron/gameweek-sync/

# Manueller DB-Smoke nach Deploy + nächstem Cron-Run (06:00 UTC)
# (via mcp__supabase__execute_sql)
SELECT l.name, l.active_gameweek,
       MAX(f.gameweek) FILTER (WHERE f.status IN ('finished','simulated')) AS last_finished,
       MIN(f.gameweek) FILTER (WHERE f.status NOT IN ('finished','simulated')) AS first_open
FROM leagues l LEFT JOIN fixtures f ON f.league_id = l.id
GROUP BY l.id, l.name, l.active_gameweek ORDER BY l.name;
# Erwartet: active_gw == first_open für alle Ligen außer Postponed-Edge (PL/TFF1)

# Cron-Log post-Run
SELECT step, status, details FROM cron_sync_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND step IN ('advance_after_skip', 'advance_gameweek', 'season_end_no_advance')
ORDER BY created_at DESC;
```

## 9. Open Questions

- **Pflicht-Klärung (vor BUILD):** Soll `advance_after_skip` als eigener `step`-Wert geloggt werden (für Trennung von Phase-B advance) oder gleicher `advance_gameweek` step? — Vorschlag: eigener step für Drift-Detection in Logs.
- **Autonom-Zone für Agent:** Helper-Function-Naming + Internal-Refactor-Stil. Ob Helper als Top-Level-Function oder inline-block.
- **Autonom-Zone:** Logging-Detail-Granularität (z.B. ob `branch: 'already_complete' | 'no_past_fixtures'` im details-JSONB).

## 10. Proof-Plan

`worklog/proofs/277-cron-advance-on-complete.txt` enthält:
1. tsc-Output (clean)
2. vitest-Output (6 Tests grün)
3. Pre-Deploy DB-Smoke (kein Drift nach Hot-Fix Slice 276b)
4. Post-Deploy DB-Smoke nach erstem Cron-Run (06:00 UTC nächsten Tag) — kein neuer Drift in den nächsten 7 Tagen
5. Cron-Log-Auszug mit `advance_after_skip` step

## 11. Scope-Out

**Explizit NICHT in Slice 277:**
- TFF1 GW8-Postponed-Edge (separate Saisonende-Logik) — Slice 278 oder später
- Auto-Issue bei Drift-Detection (CI-Smoke) — Slice-Backlog post-Beta
- Re-Schedule-Logik wenn Postponed-Match dazwischen liegt — komplex, separater Slice
- Backfill der historischen `cron_sync_log` für Drift-Audit — nicht nötig für Fix

## 12. Stage-Chain (geplant)

- SPEC (dieses Dokument) ✓
- IMPACT — `gameweek-sync/route.ts` ist Cron-Endpoint, kein Service. Konsumenten = nur Vercel-Cron + Manual-Trigger. Side-Effects = `clubs.active_gameweek` + `leagues.active_gameweek` Writes. Cache-Invalidation: keine (Server-Side, kein React-Query). Kein Public-API-Contract-Change.
- BUILD — Cron-File EDIT + Tests NEU
- REVIEW — Reviewer-Agent (S-Slice mit Money-adjacent Cron-Side-Effects)
- PROVE — vitest + DB-Smoke
- LOG — `worklog/log.md` + active.md auf idle

## 13. Pre-Mortem (S-Slice optional, hier dokumentiert wegen Cron-Kritikalität)

1. **Worst-Case A:** Helper-Function falsch implementiert, advance auf falsche GW (z.B. nextGw=99). Mitigation: AC4 testet Postponed-Edge explizit. Pflicht-Test.
2. **Worst-Case B:** Atomic-Write fail (clubs done, leagues fail). Mitigation: gleiche `runStep`-Wrapper wie Phase B = throw bricht Transaction logisch. Existing pattern.
3. **Worst-Case C:** advance läuft ZU OFT, springt durch mehrere GWs. Mitigation: Loop nicht needed, advance = +1 only. Test AC1 explizit.
4. **Worst-Case D:** Saisonende-Race: maxGameweeks=34, Cron versucht advance auf 35. Mitigation: AC3 Test, `nextGw <= league.maxGameweeks` ist erste Check.
5. **Worst-Case E:** Slice 276 Wolfsburg-Fix in parallelem Worktree merged späte → Conflict in `route.ts`. Mitigation: Slice 276 berührt `src/lib/clubs.ts`, NICHT `gameweek-sync/route.ts`. Kein Conflict erwartet.

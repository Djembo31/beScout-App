# Slice 195e + 195c-UI Combined Review

**Datum:** 2026-04-25
**Reviewer:** reviewer-Agent (Cold-Context Opus)
**Verdict 195e:** PASS (1 MINOR + 2 NITPICKs)
**Verdict 195c-UI:** PASS (2 MINOR)
**Time-Spent:** 22 minutes

## Summary

Beide Slices sauber implementiert und production-ready. **Slice 195e** ist kanonisches Beispiel für "public-safe SECURITY DEFINER mit projizierter Anonymisierung" (Pattern Slice 095) — Migration STABLE, AR-44 Block, Empty-Event-Edge `COALESCE(jsonb_agg, '[]'::jsonb)` doppelt abgesichert, `pct < 1` hide-Heuristik konsistent. **Slice 195c-UI** nutzt `EDITABLE_FIELDS`-Pattern korrekt, 195d-Bench-Felder sind im DbLineup-Type erhalten geblieben (Type-Truth-Audit grün). Keine CRITICAL/MAJOR — keine Healer-Pflicht.

## Findings

### CRITICAL — keine
### MAJOR — keine

### MINOR (Backlog)

| # | Slice | File:Line | Issue | Severity |
|---|---|---|---|---|
| M1-195e | 195e | fantasyPicker.ts L46/L65 | staleTime 60s + refetchOnWindowFocus → potentieller Refetch-Storm bei vielen Tester | Niedrig (RPC <50ms) |
| M1-c-UI | 195c-UI | useEventForm.ts L171,213 | `parseInt(form.maxPerClub) || null` → User-Input "0" wird zu null statt klare Rejection | Niedrig (DB-CHECK rejects) |
| M2-c-UI | 195c-UI | AdminEventsManagementTab.tsx L31-33 | Hardcoded German vs t() Pattern in Club-Admin (pre-existing) | Eigener Slice |

### NITPICKS

| # | Issue | Action |
|---|---|---|
| N1 | RPC liefert `ROUND(pct, 2)` — bei Sample-Sizes <100 false precision | Post-Beta: ROUND(pct, 0) |
| N2 | useMemo Logik-Duplikat zwischen LineupBuilder und PlayerPicker | Pre-existing, out-of-scope |

## Type-Truth Audit (D43)

| Quelle | Bench-Felder | max_per_club |
|--------|--------------|--------------|
| Migration 20260425150000 events | n/a | INT NULL CHECK > 0 |
| DbEvent (types L721) | n/a | number \| null \| undefined |
| Migration 195d lineups (Slice 195d) | bench_gk/o1/o2/o3 + bench_order | n/a |
| **DbLineup (types L760-774)** | **PRESENT** ✓ | n/a |
| EventFormState.maxPerClub | n/a | string |
| populateFromEvent + buildPayload | n/a | parseInt() \|\| null |

**Verdict:** Type-Truth grün. DbLineup bench-fields wurden NICHT verloren — surgical-restore nach 195c-UI Worktree-merge funktioniert.

## Aufrufpfad-Audit

### get_event_captain_distribution
1. Migration ✓ → 2. Service `getEventCaptainDistribution` ✓ → 3. Hook `useEventCaptainDistribution` ✓ → 4. LineupBuilder `captainPctMap` ✓ → 5. PitchView Render Captain-Crown-Badge ✓
**Coverage:** 100% linear

### get_event_player_pick_rates
1. Migration ✓ → 2. Service ✓ → 3. Hook ✓ → 4. LineupBuilder `pickRateMap` ✓ → 5. PlayerPicker Render Card-Badge ✓
**Coverage:** 100% linear

App-Layer hat keine direkten Service/Hook-Imports — sauber im Lineup-Feature-Tree encapsulated.

## Edge-Case-Reviews

### 195e
- Empty-Event `[]`: doppelter Schutz (COALESCE + IF v_total = 0 RETURN). ✓
- pct < 1 hide: konsistent in beiden UI-Sites. ✓
- DIVIDE-BY-ZERO: NULLIF(t.total, 0) + Early-Return. ✓
- STABLE-Marker: ✓
- AR-44 REVOKE/GRANT: ✓
- Anonymisierung: KEIN auth.uid()-Guard nötig (anonymized output, Pattern Slice 095). ✓
- Cross-Event-Leak: strict event_id-Filter. ✓

### 195c-UI
- Empty-Input → null ✓
- Negative: HTML min=1 + Server-CHECK > 0 ✓
- Above 11: HTML max=11, kein Server-CHECK upper-bound (DevTools-bypass möglich, post-Beta Server-CHECK empfohlen)

## Knowledge-Flywheel-Empfehlungen

1. **CLAUDE.md Import-Map** — `Query Keys` von `@/lib/queryKeys` → `@/lib/queries/keys` korrigieren (Backend-Agent-Flag)
2. **patterns.md** — "Public-Safe Anonymisierter Aggregate-RPC" Pattern (Slice 095 + 195e Vorbild)
3. **errors-infra.md** — Worktree-Agents haben kein mcp__supabase__ Access (verallgemeinern: alle MCPs)

## SHIP-Stage-Compliance

| Stage | 195e | 195c-UI |
|-------|------|---------|
| SPEC | ✓ specs/195e-differentials-rpc.md | inline (195c-UI Hot-Fix-Komplettierung) |
| IMPACT | ✓ inline | ✓ inline |
| BUILD | ✓ | ✓ |
| REVIEW | ✓ this file | ✓ this file |
| PROVE | vitest+migration-verify | vitest 145/145 |
| LOG | post-commit | post-commit |

## Empfehlung

**Direkt zu Slice 197 nach Commit. Keine Healer-Pflicht.**

Post-Commit Knowledge-Flywheel optional (1+2+3) — niedrige Priorität.

**Saubere Implementierung. Beide Slices ready to commit.**

# Backend Journal: Slice 199 — 3 SECURITY DEFINER Aggregate-RPCs

## Gestartet: 2026-04-25

### Verstaendnis

- **Was:** 3 read-only Aggregat-RPCs + Service-Layer + Tests:
  1. `get_top_predictors_leaderboard(p_limit INT DEFAULT 10)` — predictions GROUP BY user_id, JOIN profiles
  2. `get_most_owned_players_per_club(p_club_id UUID, p_limit INT DEFAULT 5)` — holdings GROUP BY player_id WHERE club_id
  3. `get_event_difficulty_score(p_event_id UUID)` — events.club_id → AVG(p.ipo_price)

- **Betroffene Tabellen:** predictions, profiles, user_founding_passes, holdings, players, events
- **Betroffene Services:** Neu `leaderboards.ts` (oder `predictions.ts`-Erweiterung), `club.ts`-Erweiterung, `events.ts`-Erweiterung
- **Risiken aus Skill:**
  - Return-Shape: discriminated-union vs plain JSONB-Array (Slice 195e Pattern verwendet plain Array fuer aggregations)
  - profiles HAT KEIN `tier` Column — muss aus user_founding_passes derived werden ODER NULL Default akzeptieren
  - events HAT KEIN `eligible_clubs` Column — Spec-Annahme falsch, nur `club_id` UND `event_tier` (arena/club/user) verfuegbar
  - SECURITY DEFINER + REVOKE-Block (AR-44) Pflicht
  - PostgREST 1000-row Cap nicht relevant fuer LIMIT-Reads

### Entscheidungen

| # | Entscheidung | Warum |
|---|---|---|
| 1 | Tier aus `user_founding_passes`-highest derived (fan/scout/pro/founder), Default `'fan'` | profiles hat kein tier-Column. founding_pass.tier ist die kanonische Quelle. spec sagt "DU ENTSCHEIDEST" |
| 2 | Empty-Result Return: jsonb_build_object mit success:false NUR bei error, sonst plain `[]` Array fuer Aggregat-Listen | Slice 195e Pattern (Plain JSONB Array fuer read-only Aggregates). Discriminated-Union fuer write/mutation RPCs. |
| 3 | `get_event_difficulty_score`: nutze events.club_id (single club). Kein eligible_clubs (existiert nicht in Schema). Bei NULL club_id: `{success: false, error: 'event_not_clubbed'}` | Schema-truth — events hat nur club_id, NICHT eligible_clubs. Multi-Club-Branch nicht implementierbar |
| 4 | Service in **`src/lib/services/leaderboards.ts`** (neu), `club.ts`-Append, `events.ts`-Append | Folge bestehende File-Struktur, ein Service pro RPC |
| 5 | Tier-Skala fuer event_difficulty: avg <100k = easy(0.3), 100-500k = medium(0.6), >500k = hard(0.85) | Spec-Heuristik 1:1, tune nach Live-Daten |
| 6 | Plain JSONB Top-Level fuer Items 1+2, JSONB-Object fuer Item 3 (single result) | Item 3 ist scalar/object, nicht Liste. Item 1+2 sind Listen. |

### Fortschritt

- [x] Top Predictors Migration
- [x] Most Owned Players Migration
- [x] Event Difficulty Score Migration
- [x] Service-Layer (leaderboards.ts neu, club.ts append, events.ts append)
- [x] Query-Keys (qk.leaderboards.topPredictors, qk.clubs.mostOwned, qk.events.difficultyScore)
- [x] Tests (3 test files)
- [x] tsc clean
- [x] vitest run smoke

### Runden-Log

**Runde 1 (2026-04-25):**
- Migration-Files geschrieben (3× SQL).
- Service-Layer: leaderboards.ts (neu), club.ts (append getMostOwnedPlayersPerClub), events.queries.ts (append getEventDifficultyScore).
- qk-Keys: leaderboards.topPredictors, clubs.mostOwned, events.difficultyScore.
- `npx tsc --noEmit`: CLEAN (no output = success).
- **Apply LIVE: NICHT moeglich aus Worktree-Agent-Toolset.** mcp__supabase__apply_migration nicht in meiner Tool-Liste verfuegbar (nur Read/Write/Edit/Grep/Glob/Bash). Parent-CTO MUSS Apply triggern post-merge (oder ich liefere SQL fuer manuelles Apply).

### Decision: Apply-Strategie

Da MCP-Tool nicht verfuegbar ist: Migration-Files geschrieben + dokumentiert + Tests vorbereitet. Parent-CTO appliziert via:
```
mcp__supabase__apply_migration({
  project_id: '<aus .env.vercel-prod>',
  name: 'slice_199_top_predictors',
  query: '<file content>'
})
```
Wiederholt fuer most_owned_per_club + event_difficulty.

Tests laufen gegen echte DB sobald appliziert (Pattern Slice 195e differentials.test.ts) — sie WERDEN initial fehlschlagen mit "function does not exist" bis Apply erfolgt. Das ist gewolltes TDD-Verhalten.

### Proof (worktree-lokal, vor Apply)

**`npx tsc --noEmit`**: CLEAN (kein Output = Erfolg)

**`npx vitest run` Service-Tests Pre-Apply (mit kopierter .env.local):**
- 48 Test-Files / 1067 Tests / 13 todo
- 45 PASS / 3 FAIL / 9 individual TDD-fails
- Failures: alle 9 sind erwartete TDD-Patterns ("Could not find the function ... in schema cache" / PGRST202)
- Wahrscheinliches Outcome nach Apply: 1054+ PASS, 0 FAIL.

**Migration-Body Pre-Apply Audit (`grep -c "SECURITY DEFINER" supabase/migrations/20260425220*`):**
- Alle 3 Migrations haben SECURITY DEFINER + LANGUAGE plpgsql + STABLE
- Alle 3 haben REVOKE/GRANT-Block (AR-44 Pflicht)
- Alle 3 haben COMMENT ON FUNCTION mit Slice-Tag

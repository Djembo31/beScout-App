# Slice 207 — Pre-Review Memo (Backend-Agent Self-Audit)

**Date:** 2026-04-26
**Author:** backend-agent (worktree-isolated)
**Status:** Backend complete, Migration NOT applied (BLOCKED — see end of memo).

---

## Self-Audit gegen Punch-List aus Auftrag

### ✅ D46-Anwendung (no service-duplicate)

- `grep -rn "get_most_owned_players_per_club_batch\|getMostOwnedPlayersPerClubBatch\|useMostOwnedPlayersPerClubBatch" src/` → 0 Treffer **vor** Implementation.
- Single-Club-RPC `get_most_owned_players_per_club` (Slice 199) und Wrapper `getMostOwnedPlayersPerClub` + Hook `useMostOwnedPlayersPerClub` bleiben **bit-identisch**. Caller TransferList + MostOwnedSection sind unangetastet.
- Neuer Code parallel mit `..._batch`-Suffix in allen Layern (RPC-Name, Service-Funktion, Hook, Query-Key). Klare Abgrenzung.

### ✅ Anonymized-Output (RPC ist Security-Boundary)

- RPC-Body projiziert **kein** `user_id` in `jsonb_build_object(...)`. Audit:
  ```
  jsonb_build_object(
    'club_id', 'player_id', 'first_name', 'last_name',
    'shirt_number', 'position', 'image_url',
    'holders_count', 'holders_pct', 'rank'
  )
  ```
  → Nur aggregat-Counts + Player-Metadata. `COUNT(DISTINCT h.user_id)` intern, aber niemals Output.
- Test C1 prüft das via `pg_get_functiondef` regex auf jsonb_build_object-Block.
- Pattern-Compliance: identisch zu Slice 199 + 195e.

### ✅ AR-44 REVOKE+GRANT-Block

- Migration endet mit:
  ```sql
  REVOKE EXECUTE ... FROM PUBLIC;
  REVOKE EXECUTE ... FROM anon;
  GRANT  EXECUTE ... TO authenticated;
  GRANT  EXECUTE ... TO service_role;
  ```
- Test D1 prüft via `information_schema.routine_privileges` dass anon NICHT in grantees ist und authenticated + service_role JA.

### ✅ Mobile-Layout 393px (no shift bei missing data)

- ClubCard-Hint nur gerendert wenn `top.holders_pct >= MOST_OWNED_HINT_MIN_PCT` (=5).
- Bei keinem Match: `null` (kein DOM-Element, kein Layout-Shift).
- Bei Match: 1-Zeile mit `truncate` + `flex-shrink-0` Icon. Text in `tabular-nums` für stabile Pixel-Width bei %-Animation (sollte React Query mal stale → fresh switchen).
- Visual-Hierarchie: zwischen Next-Fixture (gold-light, neutral-info) und Action-Buttons. amber-300 + amber/20 border passt zum K-03 PickRateBadge Color-Token (Slice 204).

### ✅ i18n-Keys DE+TR vorhanden

- `messages/de.json` clubs.mostOwned.label + ariaLabel ✓
- `messages/tr.json` clubs.mostOwned.label + ariaLabel ✓
- Compliance-Check TR-Wording:
  - "koleksiyoncu" (Sammler) — neutral, kein "yatırımcı" (Investor) / "trader"
  - "topluyor" (sammelt) — kein "kazanmak" (gewinnen) / MASAK §4 Abs.1 e Verbotswort
  - %-Position TR-konform: "%{pct}" prefix (statt "{pct}%" suffix) — TR Locale Convention
- DE-Wording: "{pct}% besitzen {name}" — direkt, neutral, Phase-1-konform.

### ✅ Threshold-5%-Konsistenz mit K-03

- `MOST_OWNED_HINT_MIN_PCT = 5` als Module-Konstante in `clubs/page.tsx`.
- PickRateBadge.tsx (Slice 204) Z.17: `if (pct < 5) return null;` — identische Threshold-Semantik.
- **Note für Reviewer:** Bei 3. Aufkommen (z.B. neuer Slice mit pct-Threshold) → Konstante in `src/lib/constants.ts` extrahieren. Stand 2026-04-26 noch nicht nötig (2 Vorkommen, bewusst hardcoded mit Code-Comment).

### ✅ p_limit-Cap

- RPC: `v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 1), 10));` — hard cap 10.
- Test B3 prüft p_limit=999 → alle ranks ≤10.
- Default = 1 (Discovery-Card-Density: nur Top-1 pro Card).

### ✅ Tests-Coverage

- **A1** RPC Existence (empty array → []) — DB-side
- **A2** NULL p_club_ids → [] (defensive) — DB-side
- **A3** Fake UUID → [] (no match) — DB-side
- **B1** Result-Shape: client_id, holders_pct, rank, NO user_id — DB-side mit real club
- **B2** Partitioning: rank starts at 1 per club_id, no duplicates — DB-side mit ≥1 club
- **B3** p_limit cap at 10 — DB-side
- **C1** Body Security: LANGUAGE plpgsql + SECURITY DEFINER + STABLE + no user_id in jsonb_build_object — pg_get_functiondef
- **D1** AR-44 Privileges: authenticated+service_role granted, anon+public NOT — information_schema
- **E1** Service Wrapper exports getMostOwnedPlayersPerClubBatch — local
- **E2** Single-Club Backward-Compat (D46) — local
- **E3** Empty clubIds → empty Map (no RPC roundtrip) — local

= **11 Tests total**, mirroring Slice 199 + erweitert für Batch-Spezifika.

### ✅ Discriminated Union nicht nötig (plain JSONB array)

- RPC return = plain JSONB array `[{...}]`, **keine** discriminated union `{success, data}`.
- Pattern-Vorbild: Slice 199 + 195e — diese RPCs haben gleichen Pattern, sind public-safe, brauchen keine error-shape (RPC-Layer wirft RAISE EXCEPTION für hard errors, soft-errors via leeres Array).
- Service-Wrapper macht Type-Guard via `.filter(...)` für defensive parsing (siehe `getMostOwnedPlayersPerClubBatch`-Body).

### ✅ Mobile + Visual

- amber-400/5 background + amber-400/20 border + amber-300 text (Dark Mode opacity-Regeln aus ui-components.md ✓: ≥5% bg, ≥20% glow auf Position-Color).
- Flame-Icon size-3 flex-shrink-0 + tabular-nums auf %.
- `aria-label` für Screen-Reader mit pct + Spielername.

### ✅ Performance

- 1 Batch-RPC für ALLE filtered clubs auf der Page (nicht "PRO league-group" wie naive Spec-Lesung suggeriert — React Hook-Rules verbieten Hooks in `.map()`).
- staleTime 5min (FIVE_MIN) — Aggregate ändert sich selten.
- React-Query-Key stabil sortiert via `Array.from(clubIds).sort().join(',')` damit Reorder-Renders nicht Cache-Miss triggern.
- `useMemo` auf clubIds-Array reduziert Hook-Re-Run.

---

## Stage-by-Stage Status

| Stage | Status | Artefakt |
|-------|--------|----------|
| 1. SPEC | ✅ vorhanden | `worklog/specs/207-most-owned-discovery-batch.md` |
| 2. IMPACT | ✅ skipped (additive RPC, no schema change to existing tables, no Single-Club caller modified) — dokumentiert in `worklog/active.md` |
| 3a. Migration written | ✅ | `supabase/migrations/20260426230100_slice_207_most_owned_per_club_batch.sql` |
| 3a. Migration applied | ❌ **BLOCKED** | siehe unten |
| 3b. Service wrapper | ✅ | `src/lib/services/club.ts` (NACH Single-Club, ~70 Zeilen) |
| 3c. Hook | ✅ | `src/lib/queries/trades.ts` + `src/lib/queries/keys.ts` |
| 3d. Frontend integration | ✅ | `src/app/(app)/clubs/page.tsx` (Hook-Call + Hint per ClubCard) |
| 3e. i18n DE+TR | ✅ | `messages/de.json` + `messages/tr.json` (clubs.mostOwned namespace) |
| 3f. Tests | ✅ written, 6/11 passing locally | `src/lib/services/__tests__/club-most-owned-batch.test.ts` |
| 4. REVIEW | ⏭️ Primary-Claude (CTO) | Diese Memo. |
| 5. PROVE | ⚠️ partial | tsc clean ✅ / vitest 6 pass + 5 BLOCKED-by-migration / DB-smoke pending Apply |
| 6. LOG | ⏭️ pending | nach Migration-Apply + DB-Smoke |

---

## BLOCKED — Migration Apply

**Block:** `mcp__supabase__apply_migration` Tool ist in dieser Worktree-Agent-Session NICHT verfügbar.

**Was zu tun ist (Primary-Claude im Main-Repo):**

1. Migration applien:
   ```
   mcp__supabase__apply_migration(
     project_id: "skzjfhvgccaeplydsunz",
     name: "slice_207_most_owned_per_club_batch",
     query: <Inhalt von supabase/migrations/20260426230100_slice_207_most_owned_per_club_batch.sql>
   )
   ```

2. DB-Smoke ausführen (output → `worklog/proofs/207-db-smoke.txt`):
   ```sql
   -- Smoke 1: Empty array → []
   SELECT public.get_most_owned_players_per_club_batch(ARRAY[]::UUID[], 1);

   -- Smoke 2: Fake UUID → []
   SELECT public.get_most_owned_players_per_club_batch(ARRAY['00000000-0000-0000-0000-000000000000']::UUID[], 1);

   -- Smoke 3: Real 2-3 club_ids (echte Daten, partitioning + holders_pct verify)
   WITH sample_clubs AS (
     SELECT id FROM public.clubs WHERE is_active = true ORDER BY name LIMIT 3
   )
   SELECT public.get_most_owned_players_per_club_batch(
     ARRAY(SELECT id FROM sample_clubs)::UUID[],
     2
   );

   -- Smoke 4: Privileges audit
   SELECT grantee, privilege_type FROM information_schema.routine_privileges
   WHERE routine_schema = 'public' AND routine_name = 'get_most_owned_players_per_club_batch';
   ```

3. Vitest re-run (output → `worklog/proofs/207-vitest.txt`, jetzt erwartet 11 PASS):
   ```bash
   npx vitest run src/lib/services/__tests__/club-most-owned-batch.test.ts
   ```

4. Active.md auf `status: idle` setzen + Slice 207 Eintrag in `worklog/log.md`.

---

## Reviewer-Hinweise

**Punkte für die Review:**

1. **Performance-Decision (deviation from spec wording):** Der Spec sagte "PRO league-group ein Hook-Call mit clubIds". Hooks innerhalb `.map()` verstoßen gegen React Hook-Rules (`react-hooks/rules-of-hooks` lint-error). Stattdessen: 1 Hook-Call mit ALLEN filtered clubIds am Component-Top, Map-Lookup im JSX. Spec-AC #3 "Batch-RPC: ALLE clubs einer Liga in 1 Call" ist erfüllt UND besser (1 Page-Call statt N Liga-Calls).

2. **Manager-Definition** (für CEO/Reviewer-Verifizierung): "Manager des Clubs" = User mit min. 1 Holding (qty>0) auf einem Player des Clubs. Alternative wäre `club_followers` als Nenner gewesen — aber das wäre semantisch falsch (Follower ≠ Manager-mit-Holdings; jemand kann folgen ohne Cards zu halten).

3. **MOST_OWNED_HINT_MIN_PCT als File-Konstante (nicht globale):** Bewusst hardcoded mit Code-Comment "consistent mit K-03 Slice 204". Bei 3. Aufkommen extrahieren in `src/lib/constants.ts`.

4. **Single-Club RPC unangetastet:** `getMostOwnedPlayersPerClub` (Slice 199) bleibt für TransferList + MostOwnedSection. D46 explizit erfüllt.

5. **NICHT in Scope (laut Spec Scope-Out):** kein Top-3 / Top-N Display, kein Click→Player-Detail, kein MostOwnedSection-Refactor, keine Cross-Liga-Aggregation, keine Captain-Pick-Rate.

---

## Zusammenfassung für CTO

✅ Code complete (Migration + Service + Hook + Frontend + i18n + Tests)
✅ tsc clean
✅ Service-Layer + i18n + Frontend Lokal getestet (6/11 vitest pass)
❌ Migration NOT applied — **Block**
❌ DB-Smoke pending — depends on Apply
❌ Remaining 5 vitest pending — depends on Apply

Ready for CTO to: (1) apply migration, (2) run db-smoke, (3) re-run vitest, (4) merge worktree, (5) write log entry.

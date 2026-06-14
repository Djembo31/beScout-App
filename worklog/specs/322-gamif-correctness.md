# Slice 322 — Gamification Correctness (P1-Demo: Gamif #1 + #2)

**Slice-Type:** Service + Migration
**Größe:** S
**Datum:** 2026-06-14
**CEO-Scope:** Grenzwertig (#1 berührt money-mint-RPC-Consumer, ändert aber KEINE Beträge — nur Discriminator-Robustheit; #2 read-only Leaderboard). REVIEW Pflicht.

## 1. Problem-Statement (Evidence: S7-Registry P1-Demo, live-verifiziert 2026-06-14)

- **Gamif #1:** `claimScoreRoad` (`gamification.ts:50`) erkennt Fehler via Feld-Existenz (`'error' in data`) statt über den `ok`-Discriminator — obwohl `claim_score_road` (live `pg_get_functiondef`) auf JEDEM Pfad `{ok:true,...}` bzw. `{ok:false,error}` zurückgibt. Bei `null`-Data behandelt der Service es als Erfolg (`ok:true`) → fragil für eine BSD-Mint-Aktion. Die bestehenden Tests mocken die FALSCHE Shape (ohne `ok`) → kodieren den Bug.
- **Gamif #2:** `getScoutLeaderboard('overall')` (`scoutScores.ts:63`) holt `limit*3` Zeilen nach `trader_score` sortiert + client-medianed → Truncation-Bias: ein User mit niedrigem trader, hohem Median fällt aus dem Top-`limit*3`-by-trader. **Aktuell LATENT** (128 User < 300 = limit*3 bei limit=100 → alle geholt). Wird real bei >300 Usern.

## 2. Lösungs-Design
- **#1:** Service nutzt `result.ok === true` als Erfolgskriterium; `null`/`ok!==true` → Fehler (defensiv für Money-Mint). Tests auf reale RPC-Shape (`{ok:true,reward_bsd}` / `{ok:false,error}`) umgestellt. KEINE RPC-Migration (RPC ist bereits korrekt).
- **#2:** Neuer read-only RPC `rpc_get_scout_leaderboard_overall(p_limit)` (SECURITY DEFINER, projiziert nur public-Profile-Felder) sortiert server-seitig nach Median(`percentile_disc(0.5)` über die 3 Dims) DESC + Tiebreak. Service `getScoutLeaderboard('overall')` ruft RPC; dimension-spezifischer Pfad unverändert.

## 3. Betroffene Files
- `src/lib/services/gamification.ts` — claimScoreRoad (#1).
- `src/lib/services/__tests__/gamification.test.ts` — claimScoreRoad-Mocks (#1).
- `supabase/migrations/20260614xxxxxx_slice_322_scout_leaderboard_overall_rpc.sql` — NEU (#2).
- `src/lib/services/scoutScores.ts` — getScoutLeaderboard('overall') (#2).

## 4. Code-Reading-Liste (erledigt)
- `claim_score_road` live def: jeder RETURN hat `ok` (true/false). ✓
- `claimScoreRoad` Service + ScoreRoadCard-Consumer (nutzt result.ok + reward_bsd). ✓
- gamification.test.ts claimScoreRoad-Block (mockt OHNE ok-Feld → updaten). ✓
- `getScoutLeaderboard` + GlobalLeaderboard-Consumer (100, overall|dim). ✓
- scout_scores ~128 rows → #2 latent. ✓

## 5. Pattern-References
- `database.md` Return-Shape Discriminated Union (success/ok-flag statt Feld-Existenz); `errors-db.md` „Silent-Cast ohne Discriminator-Check (Slice 165)".
- `errors-db.md` „Per-Tenant-Window / Aggregat-RPC JSONB-Return" (1000-cap-safe); AR-44 REVOKE/GRANT.

## 6. Acceptance Criteria
- **AC1:** claimScoreRoad nutzt `ok`-Discriminator; `null`/`ok!==true` → `{ok:false,error}`; reward_bsd nur bei Erfolg.
- **AC2:** gamification.test.ts claimScoreRoad-Tests auf reale Shape (`ok`-Feld) + null→ok:false; grün.
- **AC3:** RPC `rpc_get_scout_leaderboard_overall(int)`: Median-DESC-Sortierung, projiziert user_id/scores/handle/display_name/avatar_url/verified; REVOKE PUBLIC+anon + GRANT authenticated.
- **AC4:** getScoutLeaderboard('overall') nutzt RPC; Ergebnis-Shape (ScoutLeaderboardEntry[]) unverändert für GlobalLeaderboard; dimension-Pfad unangetastet.
- **AC5:** tsc clean; gamification + scoutScores (falls Tests) grün; Live-Smoke RPC top-N Median.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| claim_score_road null | ok:false (defensiv, kein Mint-Claim) |
| claim ok:false (already/insufficient) | error durchgereicht |
| Leaderboard <limit User | RPC liefert alle (kein Cap) |
| Median-Tie | Tiebreak (z.B. trader DESC, user_id) deterministisch |
| dimension !== overall | unveränderter .from().order()-Pfad |

## 8. Self-Verification
- `pg_get_functiondef` RPC + ACL post-apply.
- `CI=true pnpm exec vitest run src/lib/services/__tests__/gamification.test.ts` + tsc.
- Live-Smoke: `SELECT rpc_get_scout_leaderboard_overall(5)` → 5 Einträge Median-DESC.

## 9. Open-Questions — keine (Discriminator + Median-Server-Side klar).

## 10. Proof-Plan
`worklog/proofs/322-gamif-correctness.txt`: tsc + vitest + RPC-def/ACL + Median-Smoke + #2-Latenz-Notiz.

## 11. Scope-Out
- Keine claim_score_road-RPC-Änderung (bereits korrekt).
- Keine weiteren Leaderboard-Varianten (friends/club/monthly) — nutzen eigene Pfade.

## 12. Stage-Chain
SPEC ✓ → IMPACT (inline §4) → BUILD → REVIEW (reviewer-Agent, money-mint-Consumer + RPC-Security) → PROVE → LOG.

## 13. Pre-Mortem
1. Test-Mocks ohne ok → updaten (AC2). 2. Median-RPC percentile_disc-Semantik (3 Werte → Mitte) verifizieren im Smoke. 3. RPC public-safe? nur Profile-public-Felder projiziert. 4. GlobalLeaderboard-Shape-Drift → ScoutLeaderboardEntry exakt spiegeln.

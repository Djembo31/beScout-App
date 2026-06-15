# Active Slice

```
status: idle
slice: 327 ✅ DONE — LOG complete (live-verifiziert: 5 SVG / 0 Emoji)
stage: LOG complete
next: Slice 326 Wave B (Display-Resolver + DROP clubs.league) — geparkt, nachholen
spec_327: worklog/specs/327-flag-normalization-svg.md
type_327: UI (Flaggen-Normung Emoji→SVG, cross-cutting)
size_327: S
problem_327: countryToFlag (Unicode-Emoji 🇩🇪) rendert auf Windows als Text "DE"/"TR". 2 parallele Flaggen-Systeme (Emoji vs SVG CountryFlag) → Inkonsistenz. Anil-Live-Bug 2026-06-15.
fix_327: 4 Emoji-Konsumenten (CountryBar, LeagueBar, PlayerRow, PlayerIPOCard) → CountryFlag (SVG static /flags/3x2). countryToFlag aus utils entfernen. EINE Flaggen-Quelle.
parked_326: Slice 326 Wave A ist live (d6bce498, reviewer-PASS, Live-verifiziert). Wave B (Display-Resolver + DROP clubs.league) GEPARKT — reiner Cleanup, nach 327 nachholen.

[326-Kontext darunter erhalten]
stage_326: BUILD (Wave A DONE/PASS → Commit+Deploy → Live-Verify → Wave B)
spec: worklog/specs/326-clubs-league-uuid-full-migration.md
impact: worklog/impact/326-clubs-league-uuid-full-migration.md (DROP sicher: 0 Views/Trigger/Constraints, 134 Clubs 0 NULL league_id; ⚠️ 2 RPC-Blocker get_player_data_completeness + get_club_by_slug → Wave B)
proof: worklog/proofs/327-flag-normalization.txt
review: worklog/reviews/327-review.md
proof_326a: worklog/proofs/326a-wave-a.txt
review_326: worklog/reviews/326-review.md
size: L
type: Migration + Service + UI
scope: CEO-approved 2026-06-15 (Anil: "Voll inkl. DROP", Hermes-Plan) — Writer-Fix via RPC p_league→p_league_id (FK = fail-closed)
wave_a_done: Fundament (getLeagueById/Player.leagueId/dbToPlayer) + 10 Filter Name→league_id + Writer (CreateClubModal/platformAdmin/RPC fail-closed). 15 Files. PASS. → committen + deployen für Live-Verify.
wave_b_todo: ~25 Display-Stellen → getLeagueById(id).name; 2 RPC-DROP-Blocker (get_player_data_completeness, get_club_by_slug); clubs.ts/club.ts SELECT-Bereinigung; 4-Achsen-Pre-DROP-Grep (inkl. seed-demo.sql + orphan LeagueBar.tsx removal); DROP COLUMN league + league_id→NOT NULL; REVIEW B + CEO-DROP-OK.
plan: 2 Waves in 1 Slice (kein Orphan, D54). Wave A = Filter-Wahrheit Name→ID (~12 Konsumenten + getLeagueById + Player.leagueId + platformAdmin-Write), live-verifizierbar. Wave B = ~25 Display-Stellen auf getLeagueById(league_id).name + clubs.ts/club.ts SELECT-Bereinigung + DROP clubs.league.
preflight: worklog/notes/326-preflight-hermes-review.md + Inventur (Explore-Agent: 57 Files → ~12 Filter/A, ~25 Display/B, Rest Test/C).
open_q: (1) RPC create_club p_league_id-Param? via pg_get_functiondef. (2) unbekannte Liga = fail-closed? CEO.
```

## Zuletzt

- **Slice 326** (2026-06-15, SPEC) — clubs.league String→UUID Vollmigration (L, 2 Waves). Inventur done: getLeagueById fehlt, ClubLookup trägt league_id schon, leagueScopeStore ist ID-SSOT, PLAYER_SELECT_COLS unbetroffen.
- **Slice 325** (2026-06-15, DONE) — S7 Phase-3 Paar B(1/2): create_club setzt `league_id` als Drift-Stop; volle `clubs.league` String→UUID-Migration = Slice 326.
- **Slice 324** (2026-06-15) — S7 Phase-3 Paar C: favorite_club String→UUID Vorlage (refactor, REWORK→PASS, live `10a92273`).
- **Slice 323** (2026-06-14) — P1-Demo Gamif #3: Ticket-Reconcile (fix, live).
- **Slice 322** (2026-06-14) — P1-Demo Gamif #1+#2 (fix, live).
- **Slice 321** (2026-06-14) — P1-Demo Club #3 FanChallenges Removal (refactor, live).

**Strategie D80:** Sommer Tech-First Tiefen-Umbau. Landkarte: `worklog/audits/2026-06-14/string-to-uuid-map.md` (+ Vorlage-Lehren).
**🚨 API-Football-Key gesperrt** → players.club (Paar A) Reconcile teil-blockiert.

Nach 325: Slice 326 (clubs.league Cache-Decouple + DROP) → dann players.club (Paar A, L, braucht API-Key-Reconcile).

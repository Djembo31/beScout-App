# Slice 356 — Exklusive Treue-Umfragen (Fan-Rang-Tor auf Community-Polls)

**Größe:** M
**Slice-Type:** Service + Migration + UI (cross-domain, money-nah)
**CEO-Scope:** ja (Money-Path: berührt `cast_community_poll_vote`). Richtung von Anil approved (2026-06-23 „weiter mit exklusiven umfragen"). (c) Abo-Early-Access = aus Plan gestrichen (Anil).
**Status:** SPEC

---

## 1. Problem-Statement (Evidence)

Polls-Roadmap `docs/knowledge/domain/polls.md` §6 + §8 P3c-Rest: Fan-Rang wirkt bereits aufs **Stimmgewicht** (Slice 343), aber die **exklusiven Treue-Umfragen** (`min_fan_rank`-Tor) fehlen noch — explizit als offener, eigener Slice gelistet: *„(b) exklusive Treue-Umfragen (`min_fan_rank`-Tor, Schema + Vote-/Sichtbarkeits-Guard)"*. MASTERPLAN „Polls-Reste" + Handoff `🎯 NÄCHSTER TRACK (A)`.

**Geschäftswert:** Verein belohnt treue Fans mit exklusiven Umfragen (nur ab Stufe X abstimmbar) → macht Treue-Stufen *fühlbar* und motiviert zum Aufstieg. Die Fan-Rang-Leiter (Slice 344) bewirbt diese Perk bereits abstrakt — hier wird sie real.

**Geld-Richtung unverändert:** Bleibt REIN-Kanal (Vereins-Poll → Treasury, Fee 20/80). Dieser Slice ändert **keine Fee, kein Geld-Routing** — nur ein **Zugangs-Tor** vor den bestehenden bezahlten Vote.

## 2. Lösungs-Design

Spiegelt das **346er Fan-Rang-Gate** (`posts.min_fan_rank_tier` + `fan_rank_tier_rank()`), aber **einfacher**: Bei Polls gibt es **keinen versteckten Text-Content** zu maskieren — die Poll-Frage *ist* der Teaser, gegated wird nur das (kostenpflichtige) Abstimmen. → **Kein Teaser-RPC nötig** (anders als 346 `get_club_news_teasers`).

4 Schichten:
1. **Schema:** `community_polls.min_fan_rank_tier TEXT NULL` + CHECK (6 Tiers wie posts). NULL = offen für alle.
2. **Create-Gate (`create_community_poll`):** neuer Param `p_min_fan_rank_tier`. Validierung: nur für `source='club'` setzbar (Identitäts-Grenze §3 — Treue-Umfrage ist Vereins-Perk; `club_id` ist bei `source='club'` ohnehin Pflicht). Ungültiger Tier / bei `source='user'` gesetzt → Error.
3. **Vote-Guard (`cast_community_poll_vote`) — Money/Security-Kern, selbst gebaut:** Wenn `v_poll.min_fan_rank_tier IS NOT NULL` → gespeicherten Fan-Rang des Voters für `v_poll.club_id` lesen, `fan_rank_tier_rank(rank) >= fan_rank_tier_rank(min)` prüfen, sonst `RETURN {success:false, error:'fan_rank_too_low'}` **VOR** jeder Wallet-Belastung. **Gespeicherter Rang** (stale-tolerant), konsistent mit 346-Read-Gate + 343-Gewicht — kein recalc-on-read (begründet: money-safe beide Richtungen, da Reject vor Geldfluss; recalc von `calculate_fan_rank` wäre teuer pro Vote).
4. **Card-Lock (UI):** Auf der Club-Seite (Fan-Rang des Betrachters bekannt) zeigt `CommunityPollCard` bei unzureichendem Rang einen Lock-Zustand: Frage sichtbar (Teaser), Optionen disabled + Lock-Badge + „Ab [Tier] abstimmbar". Im globalen Community-Feed (Rang pro Club nicht billig verfügbar) degradiert es graceful: Card normal, RPC weist beim Klick ab (Toast). Defense-in-Depth: RPC ist überall die Wahrheit.

## 3. Betroffene Files

| File | Änderung | Warum |
|------|----------|-------|
| `supabase/migrations/2026…_slice_356_exclusive_polls.sql` | NEU: Spalte + CHECK; `create_community_poll` v2 (+param); `cast_community_poll_vote` v2 (+guard) | Schema + 2 RPC-Bodies (live-Baseline D87) |
| `src/types/index.ts` | `DbCommunityPoll.min_fan_rank_tier`, `CreateCommunityPollParams.minFanRankTier` | Type-Truth |
| `src/lib/services/communityPolls.ts` | `createCommunityPoll` reicht `p_min_fan_rank_tier`; `CastPollVoteResult` unverändert | Param-Durchreichung |
| `src/components/community/CreatePollModal.tsx` | Tier-Selector (nur bei `source='club'`) | Admin setzt Tor |
| `src/components/community/CommunityPollCard.tsx` | Lock-Zustand bei `viewerFanRankTier < min` | UX-Teaser |
| `src/components/community/CommunityFeedTab.tsx` | `viewerFanRankTier?`-Prop durchreichen an Card | Pass-down |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | `fanRanking.rank_tier` an Feed reichen | Quelle des Viewer-Rangs |
| `messages/de.json` + `messages/tr.json` | Lock-/Selector-Strings | i18n DE+TR |

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — erledigt in SPEC

1. **LIVE `pg_get_functiondef('create_community_poll')`** (D87) — ✅ gelesen: Param-Reihenfolge, `source`-Verriegelung, club_id-Pflicht bei club, player-Existenz-Check als Validierungs-Vorbild.
2. **LIVE `pg_get_functiondef('cast_community_poll_vote')`** (D87) — ✅ gelesen: `FOR UPDATE`, Aktiv-Checks, Gewicht-Block (343, liest schon `fan_rankings.rank_tier`!), Wallet-Belastung, Treasury-Routing. Guard MUSS vor Wallet-Block.
3. **LIVE `pg_get_functiondef('fan_rank_tier_rank')`** — ✅ gelesen: IMMUTABLE, 0..5, `ELSE -1`. Wiederverwenden, nicht neu.
4. `supabase/migrations/…slice_346_exclusive_club_posts.sql` — ✅ Gate-Schema-Muster (Spalte+CHECK+`fan_rank_tier_rank` GRANT PUBLIC).
5. `src/lib/services/communityPolls.ts` — ✅ `createCommunityPoll`-RPC-Map, `castCommunityPollVote`-Wrapper, Discriminator-Check.
6. `src/components/community/CommunityPollCard.tsx` — ✅ Options-Render + disabled-Logik (`hasVoted||isOwn||!isActive`), Lock-Einhängepunkt.
7. `src/components/community/CommunityFeedTab.tsx` — ✅ Card-Call-Site (Z. 519-530), Feed ist Club-scoped im Club-Kontext.
8. `src/app/(app)/club/[slug]/ClubContent.tsx` — ✅ `fanRanking.rank_tier` vorhanden (Z. 139, 294); Feed-Render-Stelle für Pass-down.
9. `src/types/index.ts` — ✅ `DbCommunityPoll` / `CreateCommunityPollParams` (Z. 1024-1056).
10. `CreatePollModal.tsx` — ⏳ BUILD: `source`-Prop/Modus prüfen (Selector nur bei club).

## 5. Pattern-References

- **346 Fan-Rang-Read-Gate** (`fan_rank_tier_rank` + `min_fan_rank_tier` Spalte+CHECK) — direkte Blaupause.
- **343 Vote-Gewicht** — `cast_community_poll_vote` liest bereits `fan_rankings.rank_tier` für `v_poll.club_id`; Guard nutzt dieselbe Quelle (stale-tolerant, Tally-context).
- **errors-db.md** „CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" (live-Baseline, alle Patches erhalten) · „Return-Shape: Discriminated Union" (`{success:false,error}`) · „transactions.type-CHECK-Drift" (N/A — kein neuer transactions-Typ).
- **database.md** Migration-Template AR-44 (REVOKE/GRANT-Block nach jedem CREATE OR REPLACE) · CHECK-Werte gegen 6-Tier-Liste · `.maybeSingle`-Disziplin.
- **D92-Familie** (MAX-Floor / Recalc-Latenz) — bewusst KEIN recalc-on-read hier (begründet §2.3).

## 6. Acceptance Criteria

- **AC-1 [Schema]** `community_polls.min_fan_rank_tier` existiert, nullable, CHECK auf NULL|6-Tiers. VERIFY: `information_schema.columns` + `pg_get_constraintdef`. FAIL-IF: ungültiger Tier insertbar.
- **AC-2 [Create-club]** Club-Admin erstellt Poll mit `p_min_fan_rank_tier='ultra'` → `{success:true}`, Row hat `min_fan_rank_tier='ultra'`. VERIFY: RPC-Call + SELECT.
- **AC-3 [Create-Reject-user]** `source='user'` + `p_min_fan_rank_tier` gesetzt → `{success:false, error:'exclusive_requires_club'}`. FAIL-IF: User-Poll exklusiv anlegbar.
- **AC-4 [Create-Reject-badtier]** `p_min_fan_rank_tier='king'` → `{success:false, error:'invalid_fan_rank_tier'}`.
- **AC-5 [Create-open]** `p_min_fan_rank_tier=NULL` → Poll wie bisher, offen für alle (Regression-frei).
- **AC-6 [Vote-Gate-reject]** Voter mit Rang `stammgast`(1) auf Poll `min='ultra'`(2) → `{success:false, error:'fan_rank_too_low'}`, **Wallet unverändert**, keine Vote-Row, kein Treasury-Credit. VERIFY: Wallet-Balance vor/nach identisch + 0 neue `community_poll_votes`.
- **AC-7 [Vote-Gate-pass]** Voter mit Rang `vereinsikone`(5) auf `min='ultra'`(2) → `{success:true}`, normaler 80/20-Flow + Gewicht (343 intakt). VERIFY: Vote-Row + Treasury-Credit + `weight` korrekt.
- **AC-8 [Vote-open-regression]** Poll `min=NULL` → jeder kann abstimmen (343-Gewicht + 337-Fee unverändert). VERIFY: Bestehende `communityPolls-*.test.ts` grün.
- **AC-9 [UI-lock]** Club-Seite, Viewer `stammgast`, Poll `min='ultra'` → Card zeigt Lock-Badge + „Ab Ultra", Options disabled. VERIFY: Playwright bescout.net.
- **AC-10 [UI-create]** AdminVotesTab → CreatePollModal zeigt Tier-Selector (Alle/Stammgast…Vereinsikone); community/page.tsx (user) zeigt ihn NICHT. VERIFY: Live-Render.
- **AC-11 [tsc+tests]** `pnpm exec tsc --noEmit` grün + `CI=true pnpm exec vitest run communityPolls` grün.

## 7. Edge Cases

| # | Fall | Erwartet |
|---|------|----------|
| 1 | `min=NULL` (offen) | Kein Guard, wie bisher |
| 2 | Voter ohne `fan_rankings`-Row für Club | `rank_tier`=NULL → `fan_rank_tier_rank(NULL)`=-1 < min → reject (fail-closed, korrekt) |
| 3 | `min='zuschauer'`(0) | Jeder Rang ≥0 außer NULL/-1; faktisch = fast offen. Selector bietet zuschauer NICHT an (sinnlos) → nur NULL/1-5 |
| 4 | Poll `source='user'` mit club_id-Bezug | min nicht setzbar (AC-3) — Tor nur für offizielle Vereins-Polls |
| 5 | Voter = Creator (eigene Poll) | Bestehender „eigene Umfrage"-Reject greift VOR Rang-Guard (Reihenfolge erhalten) |
| 6 | Poll beendet/inaktiv | Bestehende Aktiv-Checks greifen vor Guard |
| 7 | Globaler Feed, Viewer-Rang unbekannt | Card normal, RPC weist beim Klick ab (`fan_rank_too_low`-Toast) — graceful |
| 8 | Rang stale (gerade aufgestiegen, noch nicht recalc) | Stale-tolerant: evtl. kurz noch reject. Money-safe (kein Geldfluss). Konsistent 346/343 |
| 9 | Stale-Rang nach Abstieg | Lässt evtl. durch — harmlos (Geld → Treasury, war loyal) |
| 10 | Doppel-Klick Vote | Bestehender `useSafeMutation`/`already`-Guard (RPC `v_already`) unverändert |
| 11 | min-Tier-String aus altem Client | RPC-CHECK + Validierung fangen ungültige Werte |

## 8. Self-Verification Commands

```bash
# Live-Schema nach Migration
mcp__supabase__execute_sql: SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='community_polls' AND column_name='min_fan_rank_tier';
mcp__supabase__execute_sql: SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%min_fan_rank_tier%';
# RPC-Patch-Audit (alle Patches erhalten + Guard drin)
mcp__supabase__execute_sql: SELECT pg_get_functiondef('public.cast_community_poll_vote(uuid,uuid,integer)'::regprocedure) ILIKE '%fan_rank_too_low%' AS has_guard, ... ILIKE '%book_club_treasury%' AS treasury_intact, ... ILIKE '%v_weight%' AS weight_intact;
# Money-Smoke (BEGIN;…ROLLBACK;) reject vor Wallet
# tsc + vitest
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run communityPolls
# REVOKE/GRANT-Audit
grep -c "REVOKE EXECUTE" supabase/migrations/2026*slice_356*.sql   # == 2 (beide RPCs)
```

## 9. Open-Questions

- **Pflicht-Klärung (CEO/Anil):** (a) Card-Lock-Scope: Lock-Teaser nur auf Club-Seite (Empfehlung, Treue-Kontext), globaler Feed = RPC-Reject-only? (b) min-Tier nur für `source='club'` (Empfehlung, Identitäts-sauber)? → in §11/§2 als Empfehlung gesetzt, kurze Bestätigung erwünscht.
- **Autonom-Zone (CTO):** Tier-Selector-UI-Form, Lock-Badge-Styling, i18n-DE-Wording, Test-Struktur, Migration-Timestamp.
- **TR-i18n:** TR-Strings vor Commit Anil zeigen (Pflicht, `feedback_tr_i18n_validation`).

## 10. Proof-Plan

- **DB/RPC:** `pg_get_functiondef`-Audit (Guard vorhanden + alle Patches erhalten) → `worklog/proofs/356-rpc.txt`.
- **Money-Smoke:** SQL `BEGIN; …reject-vor-Wallet… ROLLBACK;` Wallet-Delta=0 → `worklog/proofs/356-money-smoke.txt`.
- **Service:** `vitest run communityPolls` Output → `worklog/proofs/356-vitest.txt`.
- **UI:** Playwright bescout.net — Lock-Card + Create-Selector Screenshot → `worklog/proofs/356-*.png`.

## 11. Scope-Out

- **(c) Abo-Early-Access** — gestrichen (Anil 2026-06-23).
- **min-Tier für `source='user'`-Polls** — bewusst NICHT (Identitäts-Grenze; Treue ist Vereins-Perk).
- **recalc-on-read des Fan-Rangs im Vote** — NICHT (zu teuer; stale-tolerant money-safe).
- **Globaler-Feed Lock-Teaser** — NICHT (RPC-Reject reicht; Club-Seite ist Treue-Kontext).
- **Eigener Teaser-RPC** — NICHT nötig (kein versteckter Content bei Polls).
- **UI-Surfacing des eigenen Stimmgewichts** — bleibt Backlog (unverändert).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: Consumer = 2 bekannte RPC-Caller + Card-Render, in Spec kartiert) → BUILD (Migration zuerst, dann Service/Types, dann UI) → REVIEW (reviewer-Agent, Money-nah Pflicht) → PROVE (rpc+money-smoke+vitest+playwright) → LOG (+ polls.md-Doc-Update Pflicht, + Tracker-Reconcile, + (c) aus Trackern streichen).

## 13. Pre-Mortem (M, optional — 5 Szenarien)

1. **Patch-Revert:** `cast_community_poll_vote`-Rewrite von alter Migration abgeleitet → 343-Gewicht/337-Fee/Treasury-Routing still verloren. **Mitigation:** Baseline = live functiondef (oben gelesen), Post-Apply ILIKE-Audit auf `v_weight`+`book_club_treasury`+`fan_rank_too_low`.
2. **Guard nach Wallet-Belastung platziert** → Geld weg trotz Reject. **Mitigation:** Guard direkt nach den Aktiv-/Eigene-Poll-Checks, VOR `v_cost`/Wallet-Block. AC-6 prüft Wallet-Delta=0.
3. **CHECK driftet von Tier-Liste** → king/queen insertbar oder legitimer Tier blockt. **Mitigation:** exakte 6-Tier-CHECK aus 346 kopiert, `fan_rank_tier_rank` als SSOT.
4. **i18n MISSING_MESSAGE** (333-Falle) → neuer Key im falschen Namespace. **Mitigation:** `community`-Namespace, namespace-aware Check + Live-Console-Scan.
5. **Globaler Feed crasht** weil `viewerFanRankTier`-Prop fehlt. **Mitigation:** Prop optional (`?`), Card ohne Prop = kein Lock (graceful), tsc fängt Pflicht-Prop-Fehler.

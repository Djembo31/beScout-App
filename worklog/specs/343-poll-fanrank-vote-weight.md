# Slice 343 — Polls P3c: Fan-Rang → Stimmgewicht (MAX mit Abo-Floor)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Migration (Money-RPC-Touch, Tally-only) · **Scope:** CEO-approved (Anil 2026-06-18 via AskUserQuestion: Scope (a) + Mapping bestätigt) · **Datum:** 2026-06-18

> Letztes Poll-Feature der Geldmaschine. Aktiviert den bisher wirkungslosen Fan-Rang als realen Hebel — als **Stimmgewicht** beim bezahlten Poll-Tally. Money bleibt unangetastet (Geld = 1 echte Stimme, wie Abo-2× seit 336).

---

## 1. Problem Statement

`fan_rankings` (6 Stufen Zuschauer→Vereinsikone, pro `(user_id, club_id)`) ist heute **fast wirkungslos**: der einzige Effekt war der `csf_multiplier`, der laut **D83 entfernt wird** (CSF rein proportional). Damit hat der treueste Fan eines Vereins keinerlei spürbaren Vorteil mehr. polls.md §6/§8 markiert „Fan-Rang als Stimmgewicht" als P3c = letztes offenes Poll-Stück.

**Evidence:** `docs/knowledge/domain/reward-ranking.md` W2-A („CSF-Multiplier wirkungslos"); `docs/knowledge/domain/polls.md` §6 Tabelle (Fan-Rang ⚠️ „fast wirkungslos"); Anil-Entscheid 2026-06-18 (AskUserQuestion: nur Scope (a)).

**Wer/wie oft:** Jeder zahlende Abstimmer auf einem **club-bezogenen** Paid-Poll (`community_polls.club_id IS NOT NULL`). Live heute: `fan_rankings` hat 37 Zeilen (36 über „Zuschauer") — der Hebel ist real befüllt, nicht leer. Skalen-Story: Galatasaray-Vereinsikonen zählen beim Tally mehr → Treue wird sichtbar belohnt.

## 2. Lösungs-Design (Architektur)

**Eine RPC ändern:** `cast_community_poll_vote` — der `v_weight`-Block (heute: Abo aktiv → 2×, sonst 1×) wird zu:

```
v_weight = MAX(v_abo_weight, v_rank_weight)   -- nur wenn v_poll.club_id IS NOT NULL
  v_abo_weight  = 2 wenn aktives club_subscription (Bestand 336), sonst 1
  v_rank_weight = CASE fan_rankings.rank_tier (für p_user_id × v_poll.club_id):
                    ultra|legende → 2 · ehrenmitglied|vereinsikone → 3 · sonst → 1
```

**Datenfluss vorher:** Vote → Abo-Check → weight ∈ {1,2} → Tally += weight, Geld = cost (1 Stimme).
**Datenfluss nachher:** Vote → Abo-Check + Fan-Rang-Lookup (stored) → weight = MAX(…) ∈ {1,2,3} → Tally += weight, **Geld byte-identisch**.

**Warum MAX statt reiner Tier-Tabelle:** Reine Tier-Tabelle (Zuschauer=1×) würde einen Gold-Abo-Inhaber mit niedrigem/stale Fan-Rang von heute 2× auf 1× **zurückstufen** = stille Regression eines Live-Perks. MAX = saubere Lesart von „Abo-Bonus integriert, nicht doppelt": kein Stapeln (nicht 2×·3×=6×), aber Abo bleibt Mindestboden. Fan-Rang hebt nur an, nie ab.

**Warum stored-read, kein recalc-on-read:** (a) ist Tally-only (keine Money-Konsequenz) → stale Rang = niedriges Risiko (Fan zählt evtl. 1 zu wenig, nie Geld-Effekt). `calculate_fan_rank` im Money-Pfad aufzurufen wäre teuer (5-Dim) + Latenz + Risiko im FOR-UPDATE-kritischen Vote. Stored-Read ist Simplicity-First. Staleness als bewusste Edge dokumentiert (§7).

**Keine Signatur-/Return-Änderung.** RPC-Args + Return-Shape (`{success, total_votes, cost, creator_share, weight}`) unverändert → kein Service-/Type-/UI-Change, kein Contract-Bruch.

**Mapping-Konstante:** lebt in der RPC. Kein TS-Spiegel nötig (Slice surfacet das Gewicht nicht im UI — konsistent mit der heute schon stillen Abo-2×). Doku-Quelle: polls.md §6.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260618230000_slice_343_poll_fanrank_weight.sql` | NEU | CREATE OR REPLACE `cast_community_poll_vote`, nur Weight-Block additiv |
| `docs/knowledge/domain/polls.md` | EDIT | §6/§8/§9 Fan-Rang-Zeile auf ✅ + Mapping dokumentieren (Wissens-Kopplung E0-W2gov/D88) |
| `docs/knowledge/domain/reward-ranking.md` | EDIT | W2-A / §6 Q-Hinweis: Fan-Rang jetzt als Poll-Stimmgewicht wirksam |
| `worklog/proofs/343-rpc.txt` | NEU | DB-Smoke (BEGIN/ROLLBACK + jwt-claims) Beweis |
| `worklog/reviews/343-review.md` | NEU | Cold-Context-Review |

**Grep vor diesem Slice:** `grep -rn "cast_community_poll_vote" src/` → einziger Consumer = `src/lib/services/communityPolls.ts:201` (`castCommunityPollVote`). Return-Shape unverändert → keine weitere Stelle betroffen. `grep -rn "rank_tier\|fan_rankings" supabase/migrations/` → Wertedomäne.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| **LIVE** `pg_get_functiondef('public.cast_community_poll_vote(uuid,uuid,integer)')` | D87: einzige Body-Wahrheit | ✅ verifiziert 2026-06-18 = identisch zu Migration 336. Baseline für byte-identische Money-Branches. |
| `supabase/migrations/20260618170000_slice_336_polls_social.sql` | Vorbild (Abo-Weight-Block) | Genau dieser Body wird die Baseline; nur `v_weight`-Block ändert sich |
| `src/lib/fanRanking.ts:24-31` | Tier→Mapping-Quelle | Tiers exakt: zuschauer/stammgast/ultra/legende/ehrenmitglied/vereinsikone |
| `supabase/migrations/20260330_streak_benefits_rpcs.sql` (`calculate_fan_rank`) | fan_rankings-Schema | Spalten `user_id, club_id, rank_tier`; PK/Lookup-Key |
| `.claude/rules/errors-db.md` "CREATE OR REPLACE — PATCH-AUDIT PFLICHT (Slice 156)" | Silent-Revert-Falle | Money-Branches 1:1 aus Live-Body übernehmen, nichts wegschreiben |
| `.claude/rules/database.md` "Migration-Template-Pflichten (AR-44)" | REVOKE/GRANT-Block | CREATE OR REPLACE resettet Privilegien → REVOKE PUBLIC+anon + GRANT authenticated Pflicht |
| `.claude/rules/errors-db.md` "Same-Day-Migration mit FRÜHEREM Timestamp (Slice 326)" | Greenfield-Ordnung | Timestamp `20260618230000` > 337 (`…180000`) → korrekt nach Vorgänger |

## 5. Pattern-References

- `errors-db.md` "CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT (Slice 156)" — Money-Branches byte-identisch aus Live-Body, sonst Silent-Revert.
- `database.md` "Migration-Template-Pflichten (AR-44)" — REVOKE+GRANT renew nach CREATE OR REPLACE.
- `decisions.md` **D87** — Live-`pg_get_functiondef` als Prämisse (erledigt, = 336).
- `decisions.md` **D83** — CSF-multiplier-Entfernung ist der Grund warum Fan-Rang einen neuen Hebel braucht.
- `decisions.md` **D86** — Polls-Modell (Gewicht skaliert NUR Tally, NICHT Geld).
- polls.md §6 — „Gewicht skaliert NUR Tally, NICHT Geld" (Money-Invariante).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Vereinsikone-Fan bekommt 3× Stimmgewicht
  VERIFY: DB-Smoke — Poll mit club_id, Voter mit fan_rankings.rank_tier='vereinsikone' (kein Abo), cast vote
  EXPECTED: Response weight=3; community_polls.total_votes += 3; gewählte option.votes += 3
  FAIL IF: weight=1 oder Tally += 1

AC-02: [HAPPY] Ultra/Legende → 2×, Ehrenmitglied → 3×
  VERIFY: DB-Smoke je Tier (ultra, legende, ehrenmitglied) ohne Abo
  EXPECTED: ultra=2, legende=2, ehrenmitglied=3
  FAIL IF: irgendein Tier mappt falsch

AC-03: [REGRESSION] Abo-Floor — Gold-Abo + Zuschauer-Rang bleibt 2× (kein Downgrade)
  VERIFY: DB-Smoke — aktives club_subscription + fan_rankings.rank_tier='zuschauer' (oder keine Zeile)
  EXPECTED: weight=2 (MAX(2,1))
  FAIL IF: weight=1 → Live-Abo-Perk regressiert

AC-04: [HAPPY] MAX greift — Abo + Vereinsikone = 3× (nicht 6×, kein Stapeln)
  VERIFY: DB-Smoke — aktives Abo + rank_tier='vereinsikone'
  EXPECTED: weight=3 (MAX(2,3))
  FAIL IF: weight=6 (multipliziert) oder weight=2 (Fan-Rang ignoriert)

AC-05: [NULL/EMPTY] Kein Fan-Rang-Eintrag + kein Abo → 1×
  VERIFY: DB-Smoke — Voter ohne fan_rankings-Zeile, ohne Abo
  EXPECTED: weight=1
  FAIL IF: NULL-rank_tier crasht / weight ≠ 1

AC-06: [EDGE] Poll ohne club_id → weight=1 (Fan-Rang ist club-keyed)
  VERIFY: DB-Smoke — community_polls.club_id IS NULL, beliebiger Voter
  EXPECTED: weight=1, kein fan_rankings-Lookup
  FAIL IF: weight > 1

AC-07: [MONEY-INVARIANT] Geld unverändert trotz weight=3
  VERIFY: DB-Smoke — Wallet-Abzug + creator_share/platform_share + transactions
  EXPECTED: amount_paid=cost_bsd (1 Stimme), creator_share=70%, identisch zu 336-Verhalten
  FAIL IF: Geld skaliert mit weight

AC-08: [SECURITY] REVOKE/GRANT korrekt nach CREATE OR REPLACE
  VERIFY: SELECT auf information_schema / has_function_privilege für anon vs authenticated
  EXPECTED: anon=false, authenticated=true
  FAIL IF: anon=true
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Vote | kein fan_rankings-Eintrag | rank_tier NULL (SELECT INTO findet nichts) | v_rank_weight=1 | `CASE … ELSE 1` fängt NULL |
| 2 | Vote | Poll club_id NULL | User-Poll ohne Vereinsbezug | weight=1, kein Lookup | Block bleibt in `IF v_poll.club_id IS NOT NULL` |
| 3 | Vote | stale Fan-Rang (Abo gerade gekauft, Rang noch Zuschauer) | Abo aktiv, rank='zuschauer' | weight=2 (Abo-Floor) | MAX schützt Live-Perk |
| 4 | Vote | unbekannter rank_tier-Wert | (CHECK verhindert, aber defensiv) | ELSE 1 | CASE-ELSE |
| 5 | Vote | Abo abgelaufen + Vereinsikone | expires_at < now, rank='vereinsikone' | weight=3 (Fan-Rang trägt) | Abo-Branch liefert 1, Fan-Rang 3, MAX=3 |
| 6 | Vote | Concurrent Doppel-Vote | Race auf already-voted | unverändert (Bestand FOR UPDATE + v_already) | nicht berührt |
| 7 | Vote | weight=3 Tally | option.votes / total_votes | += 3 atomar | unverändert (jsonb_set + UPDATE im selben Body) |

## 8. Self-Verification Commands

```bash
# Pflicht:
npx tsc --noEmit          # erwartet: keine Änderung (kein TS-File geändert) → clean
# (kein vitest-File betroffen; Service-Layer unverändert. Bestehende Suite als Regression:)
CI=true npx vitest run src/lib/services/__tests__/communityPolls-create.test.ts src/lib/services/__tests__/communityPolls-followers.test.ts src/lib/services/__tests__/communityPolls-get.test.ts

# Live-Body-Verify nach Apply (Money-Path):
#   pg_get_functiondef('public.cast_community_poll_vote(uuid,uuid,integer)') ILIKE '%v_rank_weight%'
#   + Money-Branches (book_club_treasury / poll_earn / amount_paid) byte-identisch zu 336
# Grant-Verify:
#   has_function_privilege('anon','public.cast_community_poll_vote(uuid,uuid,integer)','EXECUTE')  → false
#   has_function_privilege('authenticated', …) → true
# DB-Smoke: BEGIN; set jwt-claims; insert fan_rankings je Tier; cast vote; assert weight; ROLLBACK;
```

## 9. Open-Questions

**Pflicht-Klärung — vor Spec-Approval entschieden (Anil + CTO):**
1. ✅ Scope = nur (a) Stimmgewicht (Anil 2026-06-18).
2. ✅ Mapping Ultra/Legende 2×, Ehren/Ikone 3× (Anil bestätigt im Preview).
3. ⚠️ **MAX vs. reine Tier-Tabelle** — CTO-Empfehlung MAX (Abo-Floor, keine Regression). **In Spec markiert, braucht Anil-OK am Spec-Gate.** Falls Anil reine Tabelle will → eine Zeile (GREATEST → nur v_rank_weight, Abo-Branch raus), aber Regression dokumentiert.

**Autonom-Zone (CTO):**
- SQL-Struktur des Weight-Blocks (Variablen-Namen, CASE-Form).
- Smoke-Test-Aufbau (welche Tiers explizit).
- Migration-Timestamp.

**Nicht-Autonom (war CEO, erledigt):** Mapping-Werte, Scope. **Keine** Money-Branch-Änderung (byte-identisch).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| DB / RPC (Tally-Logik) | DB-Smoke `worklog/proofs/343-rpc.txt`: BEGIN/ROLLBACK, jwt-claims, je Tier (zuschauer/ultra/legende/ehrenmitglied/vereinsikone) + Abo-Kombis (AC-01..07) cast vote → weight + Tally asserten; Grant-Check (AC-08); Money-Branch-Diff gegen 336 (byte-identisch). Cleanup-Verify: 0 persistierte Votes/Wallet-Mutationen (ROLLBACK). |

Verboten als Proof: „sollte passen" / „tsc clean" allein.

## 11. Scope-Out

- (b) **Exklusive Treue-Umfragen** (min_fan_rank-Tor) → eigener Slice (Anil deselektiert). Schema-Change + Sichtbarkeits-/Vote-Tor + recalc-on-read nötig.
- (c) **Abo Early-Access** (Zeitfenster) → eigener Slice (Anil deselektiert).
- (d) **Auszahl-Gewichtung** → tot, P4 verworfen (polls.md §7).
- **UI-Surfacing** des eigenen Gewichts („deine Stimme zählt 3×") → Backlog (heute auch Abo-2× still). Konsistenz-Entscheidung.
- **recalc-on-read** des Fan-Rangs → nicht für (a) (Tally-only, stored-read genügt). Erst relevant wenn (b) gebaut wird.
- **fan_rankings-Aktualität** (kein Trigger auf Abo/Holdings/Follow) → W2-Problem, eigener Slice/Fan-Reward-Engine.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: 1 RPC, kein neuer Consumer, Return-Shape unverändert)
     → BUILD (1 Migration apply via mcp__supabase__apply_migration)
     → REVIEW (reviewer-Agent — Money-RPC-Touch, kein Self-Review)
     → PROVE (DB-Smoke 343-rpc.txt)
     → LOG
```

## 13. Pre-Mortem (optional bei S — 5 Szenarien, weil Money-RPC-Touch)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Money-Branch beim Rewrite versehentlich verändert (Silent-Revert, Slice 156) | MED | hoch (Geld) | Body byte-identisch aus Live/336 kopieren, nur Weight-Block ändern | DB-Smoke AC-07 + Reviewer Money-Branch-Diff |
| 2 | Reine Tier-Tabelle statt MAX → Abo-Inhaber regressiert auf 1× | MED | mittel (Perk-Verlust, stiller) | MAX-Design + AC-03 Regression-Test | AC-03 schlägt fehl |
| 3 | NULL rank_tier crasht CASE | LOW | mittel (Vote bricht) | `CASE … ELSE 1`, SELECT INTO bei 0 Rows = NULL → ELSE | AC-05 |
| 4 | REVOKE/GRANT vergessen → anon kann RPC callen (AR-44/J4-Klasse) | LOW | hoch (Security) | AR-44-Block am Migration-Ende | AC-08 has_function_privilege |
| 5 | Greenfield db-reset: Migration vor 337 geordnet → alter Body gewinnt | LOW | mittel | Timestamp `…230000` > 337 `…180000` | Slice-326-Pattern-Check |

---

## Compliance-Check

- Kein user-facing Wording in diesem Slice (reine RPC-Logik). $SCOUT/IPO/Glücksspiel-Vokabel: n/a.
- Money-Invariante: Geld skaliert NICHT mit Gewicht (D86) — durch AC-07 abgesichert.
- Keine neuen i18n-Strings.

## Open Risiko (kurz, ehrlich)

Einziges echtes Risiko: beim CREATE OR REPLACE einen Money-Branch unbeabsichtigt mitzuverändern (Slice-156-Klasse). Mitigation: Body = byte-identische Kopie des verifizierten Live-/336-Bodys, nur der `v_weight`-Block wird angefasst; DB-Smoke + Reviewer prüfen Money-Branch-Diff. MAX-vs-Tabelle ist die einzige offene Anil-Frage am Spec-Gate.

# Slice 345 — FRE-2: Follow zählt als Einstiegssignal in den Fan-Rang (+5)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Migration · **Scope:** CEO-approved (Money-nah — Design „~5 Punkte" von Anil 2026-06-18) · **Datum:** 2026-06-18

> Zweiter Schritt der Fan-Reward-Engine (Plan = D93). Macht „einem Verein folgen" für den Fan-Rang wirksam. Money-nah, weil der Fan-Rang seit Slice 343 das Poll-Stimmgewicht steuert. Ich (CTO) baue selbst (§3 Money).

---

## 1. Problem Statement

Einem Verein folgen (gratis, 1 Klick) gibt heute **0 Punkte** für den Fan-Rang (`calculate_fan_rank` liest `club_followers` nicht). Folgen ist die niedrigste Hürde + größte Fan-Basis, zählt aber nicht — der erste Anreiz fehlt (reward-ranking.md **W2-C**: „club_followers ist totes Treue-Signal"). Anil-Design-Alignment (D93): Follow soll ein **kleines Einstiegssignal** sein.

**Wer/wie oft:** Jeder folgende Fan, alle 7 Ligen. Aktuell ~tote Wirkung.

## 2. Lösungs-Design

**Zwei DB-Änderungen, kein Frontend (die Leiter aus FRE-1 zeigt `total_score` bereits):**

1. **`calculate_fan_rank` (CREATE OR REPLACE):** nach dem gewichteten 5-Dimensions-Score + ELO-Boost, VOR der Tier-Zuweisung, ein additiver Bonus:
   ```sql
   -- 6.6 FOLLOW BONUS (FRE-2): kleiner Einstiegsanreiz, +5 wenn der Fan dem Club folgt
   IF EXISTS (SELECT 1 FROM club_followers WHERE user_id = p_user_id AND club_id = p_club_id) THEN
     v_total_score := LEAST(v_total_score + 5, 100);
   END IF;
   ```
   Restlicher Body **byte-identisch** zur Live-Baseline (D87, schon ausgelesen). Return-Shape **unverändert** (`{ok, rank_tier, csf_multiplier, total_score, components}`) — Bonus fließt in `total_score`, kein neues Feld, keine neue Tabellen-Spalte. Die 5 gespeicherten Dimensions-Spalten bleiben unberührt.

2. **Recalc-Auslöser auf `club_followers`** (neuer Trigger, AFTER INSERT OR DELETE, FOR EACH ROW): ruft `calculate_fan_rank(user, club)` **best-effort** (Exception-gekapselt → ein Recalc-Fehler blockiert (Un)Follow NIE). So wirkt der Bonus **sofort**, nicht erst nach dem nächsten Event-/Cron-Lauf (heilt die bekannte Recalc-Latenz für diesen Pfad). DELETE nutzt `OLD`, INSERT nutzt `NEW`.

**Money-Konsequenz (bewusst, dokumentiert):** Der Fan-Rang-Tier bestimmt das Poll-Stimmgewicht (343: Ultra/Legende 2×, Ehren/Ikone 3×). +5 kann jemanden **knapp** über eine Tier-Grenze schubsen (z. B. Score 22 → 27 = Ultra → 2×). Das ist gewollt (Follow zählt wie echte Punkte) und **monoton** (Follow hebt nur, Unfollow nimmt genau diese 5 zurück). **Der Abo-Floor (D92, `weight = MAX(abo, fanrank)`) bleibt unberührt** — bezahlte Doppelstimme kann nie verloren gehen. Kein echter Geld-Fluss, nur Tally-Gewicht.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/<ts>_slice_345_follow_fanrank_signal.sql` | NEU | RPC-Replace (+5-Bonus) + Recalc-Trigger |
| (kein src-Change) | — | Leiter zeigt `total_score` bereits; Services rufen RPC unverändert (Shape gleich) |

**Consumer von `calculate_fan_rank` (grep-verifiziert) — alle unberührt, weil Return-Shape gleich:**
- `src/lib/services/fanRanking.ts:59` (`recalculateFanRank`) · `:94` (`batchRecalculateFanRanks`)
- `src/app/api/cron/gameweek-sync/route.ts:1601` (Cron)
- `src/lib/__tests__/db-invariants.test.ts:1024` (prüft Top-Level-Keys — bleiben gleich)

## 4. Code-Reading-Liste (erledigt vor BUILD)

| Quelle | Zweck | Befund |
|------|-------|--------|
| Live `pg_get_functiondef('calculate_fan_rank')` (D87) | echte Baseline | 5 Dim (30/25/20/15/10) → total, +ELO-Boost, dann Tier-Schwellen 10/25/40/55/70. Liest `club_followers` NICHT. |
| `information_schema.columns club_followers` | Trigger-Felder | `user_id, club_id` (beide NOT NULL), +id/is_primary/created_at. |
| `pg_trigger` auf `club_followers` | Konflikt? | **Kein** bestehender Trigger → sauberer Einbau, keine Recursion (calculate_fan_rank schreibt nur `fan_rankings`, nicht `club_followers`). |
| `decisions.md` D92 | Money-Schutz | Abo-Floor via MAX bleibt; Follow wirkt nur auf fanrank-Seite. |
| `errors-db.md` „CREATE OR REPLACE PATCH-AUDIT" + AR-44 | RPC-Regeln | Baseline = Live-Body; REVOKE/GRANT renew nach Replace. |
| `database.md` „CHECK/Trigger-Guard" + „pg_cron Fail-Isolation" | Trigger-Robustheit | Best-effort Exception-Wrap, AFTER-Trigger RETURN NULL. |

## 5. Pattern-References

- `decisions.md` **D92** — Abo-Floor (MAX) schützt bezahlte Doppelstimme; FRE-2 darf das nicht verletzen → tut es nicht (nur fanrank-Seite, MAX bleibt).
- `decisions.md` **D93** — FRE-2-Design (5 Punkte, Follow = Fuß in der Tür).
- `errors-db.md` „CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT (Slice 156)" — Baseline = Live, nicht alte Migration.
- `errors-db.md` „pg_cron Fail-Isolation" / `database.md` Trigger-Guard — Recalc best-effort, blockiert (Un)Follow nie.
- `database.md` AR-44 — REVOKE/GRANT nach CREATE OR REPLACE (für `calculate_fan_rank`; Trigger-Funktion = AR-44-Ausnahme).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Follow gibt +5 auf total_score.
  VERIFY: transaktionaler DB-Smoke — calculate_fan_rank(u,c) ohne Follow = X; INSERT club_followers(u,c); calculate_fan_rank(u,c) = X+5 (oder 100 bei Cap).
  EXPECTED: Differenz exakt +5 (bzw. LEAST(...,100)).
  FAIL IF: 0, ≠5, oder >100.

AC-02: [SYMMETRIE] Unfollow nimmt die +5 zurück.
  VERIFY: nach DELETE club_followers(u,c) → calculate_fan_rank(u,c) = X (Ausgangswert).
  EXPECTED: zurück auf Baseline.
  FAIL IF: Bonus bleibt hängen.

AC-03: [TRIGGER] (Un)Follow löst sofortige Neuberechnung aus.
  VERIFY: BEGIN; INSERT club_followers → SELECT total_score FROM fan_rankings WHERE user/club zeigt +5 OHNE manuellen RPC-Aufruf; DELETE → zurück. ROLLBACK.
  EXPECTED: fan_rankings.total_score reflektiert Follow-Stand automatisch.
  FAIL IF: total_score unverändert (Trigger feuert nicht).

AC-04: [BEST-EFFORT] Recalc-Fehler blockiert (Un)Follow nicht.
  VERIFY: Trigger-Body hat EXCEPTION WHEN OTHERS → NULL; INSERT/DELETE gelingt auch wenn calculate_fan_rank intern fehlschlüge.
  EXPECTED: club_followers-Write committet unabhängig.
  FAIL IF: Recalc-Exception rollt den Follow zurück.

AC-05: [CAP] +5 überschreitet nie 100.
  VERIFY: user mit total_score 98 + Follow → 100 (nicht 103).
  EXPECTED: LEAST(...,100).
  FAIL IF: >100.

AC-06: [MONEY-FLOOR] Abo-Doppelstimme bleibt (D92).
  VERIFY: cast_community_poll_vote unverändert (weight=MAX(abo,fanrank)); FRE-2 ändert nur calculate_fan_rank.
  EXPECTED: kein Diff an cast_community_poll_vote.
  FAIL IF: Poll-Weight-RPC berührt.

AC-07: [SHAPE/GRANT] Return-Shape unverändert + REVOKE/GRANT korrekt.
  VERIFY: pg_get_functiondef zeigt 5 Top-Level-Keys; anon kein EXECUTE, authenticated EXECUTE.
  FAIL IF: Shape geändert oder anon darf ausführen.
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | User folgt nicht | kein Bonus, Baseline | EXISTS = false |
| 2 | total_score 96-100 + Follow | clamp 100 | LEAST(...,100) |
| 3 | Score knapp unter Tier (22 + Follow=27) | Tier steigt → 2× Poll-Weight | gewollt, monoton; Abo-Floor bleibt |
| 4 | Unfollow eines Primary-Clubs | Recalc läuft, Bonus weg; is_primary-Logik unberührt | Trigger nur Recalc, kein club_followers-Write |
| 5 | Bulk-Follow (Onboarding, N Clubs) | N Recalcs, je billig (neuer User = kaum Daten) | akzeptabel |
| 6 | calculate_fan_rank wirft intern | Follow gelingt trotzdem | EXCEPTION-Wrap |
| 7 | DELETE-Trigger | OLD.user_id/club_id genutzt | TG_OP-Verzweigung |
| 8 | Recursion-Risiko | keine (RPC schreibt nur fan_rankings) | verifiziert |

## 8. Self-Verification Commands

```sql
-- Baseline + Bonus (transaktional, ROLLBACK):
BEGIN;
  -- Testuser/-club mit bekanntem Stand wählen (kein Follow vorhanden)
  SELECT (calculate_fan_rank('<u>','<c>')->>'total_score')::numeric AS before;
  INSERT INTO club_followers(id,user_id,club_id,is_primary) VALUES (gen_random_uuid(),'<u>','<c>',false);
  SELECT total_score AS after_follow_via_trigger FROM fan_rankings WHERE user_id='<u>' AND club_id='<c>';
  SELECT (calculate_fan_rank('<u>','<c>')->>'total_score')::numeric AS after_rpc;
  DELETE FROM club_followers WHERE user_id='<u>' AND club_id='<c>';
  SELECT (calculate_fan_rank('<u>','<c>')->>'total_score')::numeric AS after_unfollow;
ROLLBACK;
-- Erwartet: after_follow = before+5 (cap 100), after_unfollow = before.
```
```sql
-- Shape + Grants
SELECT pg_get_functiondef('public.calculate_fan_rank(uuid,uuid)'::regprocedure) ILIKE '%club_followers%' AS has_follow_check;
SELECT has_function_privilege('anon','public.calculate_fan_rank(uuid,uuid)','EXECUTE') AS anon_can,
       has_function_privilege('authenticated','public.calculate_fan_rank(uuid,uuid)','EXECUTE') AS auth_can;
-- cast_community_poll_vote unberührt:
-- (kein Diff — wird in diesem Slice nicht angefasst)
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Design (5 Punkte) ist von Anil approved (D93).
**Autonom (CTO):** Trigger- vs. App-Layer-Recalc → **Trigger** gewählt (catcht alle Follow-Pfade inkl. Onboarding, app-Layer würde Pfade verpassen). Platzierung des Bonus (nach ELO, vor Tier). Best-effort-Kapselung.
**Nicht-Autonom:** Falls Bonus-Höhe geändert werden soll → Anil. UI-Surfacing „+5 fürs Folgen" → Scope-Out (FRE-3+).

## 10. Proof-Plan

| Typ | Proof |
|-----|-------|
| DB-Schema/RPC | Transaktionaler Smoke-Output (before/after_follow/after_unfollow, Shape, Grants) → `worklog/proofs/345-rpc.txt` |

## 11. Scope-Out

- **UI „+5 fürs Folgen" sichtbar machen** → FRE-3 oder kleine Folge-Politur (Leiter zeigt total bereits).
- **csf_multiplier-Removal** → eigener Aufräum-Slice (TODO P1).
- **follow_score als eigene Tabellen-Spalte/Dimension** → nicht nötig; Bonus in total reicht (Simplicity First).
- **Recalc-Trigger auch auf Abo/Holdings** (volle Frische-Lösung W2-A) → größerer eigener Slice; FRE-2 macht nur den Follow-Pfad frisch.

## 12. Stage-Chain

```
SPEC → IMPACT (inline, §3/§4 — Money-nah, Consumer grep-verifiziert) → BUILD (apply_migration) → REVIEW (reviewer, Money-Diff) → PROVE (force-rollback DB-Smoke) → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Recalc-Trigger blockiert (Un)Follow bei RPC-Fehler | LOW | hoch (Follow kaputt) | EXCEPTION WHEN OTHERS → NULL | AC-04 + Smoke |
| 2 | Bonus driftet Poll-Weight unbeabsichtigt (>1 Tier) | LOW | mittel (Money-Tally) | nur +5 fix, monoton, Abo-Floor bleibt | AC-03/Edge#3 |
| 3 | CREATE OR REPLACE verliert bestehende Logik (PATCH-AUDIT) | MED | hoch | Baseline = Live-Body (D87), nur +6.6-Block additiv | AC-07 Shape + Diff-Review |
| 4 | REVOKE/GRANT vergessen → anon EXECUTE | LOW | hoch (Security) | AR-44-Block im Migration-Ende | AC-07 Grants |
| 5 | Recursion club_followers↔fan_rankings | LOW | hoch | calculate_fan_rank schreibt nur fan_rankings (verifiziert) | Edge#8 |

---

## Compliance-Check
Keine user-facing Strings in diesem Slice (reine DB). Kein Wording-/$SCOUT-/IPO-Thema. Money: nur Tally-Gewicht-Effekt, kein Geld-Fluss; Abo-Floor (D92) bleibt.

## Open Risiko
Hauptrisiko ist das versehentliche Wegschreiben bestehender RPC-Logik beim Replace (PATCH-AUDIT-Falle) — gemindert durch byte-identische Live-Baseline + nur additiven +5-Block + Shape-Verify. Zweitrisiko Trigger blockiert Follow — gemindert durch best-effort Exception-Wrap. Beides AC-getestet.

# Slice 330 — CSF-Engine ans Treasury

**Slice-Type:** Migration (Money, CEO-Scope)
**Größe:** L
**Status:** SPEC (Anil-Approval ausstehend)
**Datum:** 2026-06-17

---

## 0. CEO-Entscheidungen (Session 2026-06-17, vorab geklärt)

| # | Frage | Entscheidung |
|---|-------|--------------|
| D-A | Woher kommt der Success-Fee-Anteil der CSF in Phase 1? (heute geminted) | **Deposit-Pflicht vorab.** `liquidate_player` debitiert die CSF aus dem Club-Treasury; reicht das verfügbare Guthaben nicht, **blockt die Liquidation fail-safe** (RAISE, kein Payout, kein Minting, kein Minus). Der Deposit-Pfad zum Auffüllen = **Slice 330b** (Scope-Out). |
| D-B | Cap-Semantik | **Pro-Card-Cap behalten** (`success_fee_cap_cents` als Obergrenze je Card, aktuelles Verhalten — minimal-invasiv). |
| D-C | Reichweite Multiplikator-Entfernung | **csf_multiplier UND mastery_bonus raus** → CSF **und** PBT rein proportional nach Stückzahl. Zusätzlich **„CSF-Bonus 1,5×"-UI-Badge entfernen** (Treue wandert zur künftigen Fan-Reward-Engine). |

---

## 1. Problem-Statement (Evidence)

`liquidate_player` (Live, `20260424070000_slice_178e_d_…sql`) hat drei Konzept-Drifts, alle in `worklog/concepts/csf-club-treasury-model.md` §4/§5 dokumentiert:

1. **Success-Fee wird geminted statt aus dem Treasury gebucht.** Z.109/177-200: `v_total_sf_pool := v_fee_per_dpc * v_total_dpcs` wird frisch berechnet und in die Holder-Wallets gezahlt — **kein Konto wird belastet**. Verstößt gegen Konzept §8 „alles Transfer, kein Minting" + CSF-2 „Club-Treasury ist die CSF-Quelle". (PBT dagegen kommt korrekt aus `pbt_treasury`.)
2. **`csf_multiplier` + `mastery_bonus` verwässern „rein proportional".** Z.116-133 + 149-170: effective-qty-Gewichtung mit `(1+mastery)*csf_mult`, Deckel `LEAST(1.15, …)`. Konzept §4 Z.89: **RAUS** (Anil 2026-06-15). Betrifft CSF **und** PBT (gemeinsamer effective-qty-Loop).
3. **UI verspricht einen CSF-Bonus, den die Engine nach (2) nicht mehr gibt.** `FanRankOverview.tsx:110-114` + `FanRankBadge.tsx:118-122` zeigen „×{n} CSF Bonus" / Multiplikator-Suffix aus `fan_rankings.csf_multiplier`. Ohne UI-Fix → Trust/Compliance-Lücke (UI sagt 1,5× Bonus, Auszahlung ist proportional).

## 2. Lösungs-Design

**Eine Migration** `20260617130000_slice_330_csf_engine_treasury.sql` (CREATE OR REPLACE `liquidate_player`, Baseline = live `pg_get_functiondef` 2026-06-17) + **UI-Edits** (Badge-Entfernung) + **i18n-Orphan-Cleanup**. Keine neue Tabelle, keine Schema-Änderung an `fan_rankings` (Spalte `csf_multiplier` bleibt — wird dormant für Fan-Reward-Engine).

**Engine-Umbau (`liquidate_player`):**
- Beide Holder-Loops entschlacken: `v_effective_qty` → `v_holder.quantity` (rein proportional). Pre-Loop (nur zur effective-qty-Summe) **entfällt**; `v_total_effective_qty` → `v_total_dpcs`. DECLARE-Vars `v_mastery_*`, `v_csf_mult`, `v_effective_qty`, `v_total_effective_qty`, `v_raw_multiplier` raus.
- **CSF-Debit + Guard** (D-A): Nach Berechnung `v_total_sf_pool` und VOR jeglichem Wallet-Write:
  - `PERFORM 1 FROM clubs WHERE id = v_player.club_id FOR UPDATE;` (Serialisierung, reentrant mit `book_club_treasury`).
  - `v_treasury_available := (SUM credit − SUM debit aus club_treasury_ledger) − (SUM amount_cents aus club_withdrawals WHERE status IN ('pending','approved','paid'))`.
  - `IF v_total_sf_pool > 0 AND v_treasury_available < v_total_sf_pool THEN RAISE EXCEPTION 'treasury_insufficient_for_csf: benötigt %, verfügbar %', v_total_sf_pool, v_treasury_available;` → ganze TX rollt zurück (inkl. dedup-Reservierung → Retry sauber).
  - Nach erfolgreicher Verteilung: `PERFORM public.book_club_treasury(v_player.club_id, 'debit', 'csf', v_actual_sf_distributed, v_liquidation_id, 'CSF-Auszahlung: ' || v_player_name);` — debitiert **die tatsächlich verteilte Summe** (≤ pool nach FLOOR-Rundung → Ledger matcht Wallets exakt, Rundungs-Staub bleibt im Treasury).
- PBT-Pfad unverändert (Quelle `pbt_treasury`), nur Gewichtung → proportional.
- Return-JSON: `+'csf_debited_cents'`, `formula_version → 'proportional_v3_2026_06_17'`, `weighted → false`, `multiplier_cap` entfernt. (Service liest diese nicht → additiv-safe.)

**UI-Badge-Entfernung (D-C):**
- `FanRankBadge.tsx`: Props `csfMultiplier` + `showMultiplier` + Render-Block Z.118-122 entfernen.
- `FanRankOverview.tsx`: Multiplikator-Span Z.110-114 + `showMultiplier`/`csfMultiplier` aus dem Badge-Call entfernen.
- `ClubContent.tsx:295`: `csfMultiplier={fanRanking.csf_multiplier}` aus dem Badge-Call entfernen.
- i18n: Key `gamification.csfBonus` aus `messages/de.json` + `messages/tr.json` entfernen (Orphan nach Removal — 0 weitere Consumer verifiziert).
- `fanRanking.ts` Service + `types`: `csf_multiplier`-Feld **bleibt** (Spalte lebt, dormant für Fan-Reward-Engine) — nur nicht mehr angezeigt.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/20260617130000_slice_330_csf_engine_treasury.sql` | NEU (CREATE OR REPLACE liquidate_player) | Engine-Umbau |
| `src/components/ui/FanRankBadge.tsx` | Props + Multiplikator-Render raus | Badge-Promise weg |
| `src/components/gamification/FanRankOverview.tsx` | csfBonus-Span + Badge-Props raus | Badge-Promise weg |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | csfMultiplier-Prop raus | Badge-Promise weg |
| `messages/de.json`, `messages/tr.json` | `gamification.csfBonus` raus | i18n-Orphan-Cleanup (Slice-305 4-Achsen-Regel) |
| `src/lib/services/__tests__/liquidation.test.ts` | ggf. Assertions anpassen | Return-Shape-Erweiterung |
| `src/components/gamification/__tests__/*`, `ClubContent.test.tsx`, `useClubData.test.ts` | Badge-Assertions prüfen | csf_multiplier-Display weg |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. `supabase/migrations/20260424070000_slice_178e_d_liquidate_player_idempotency.sql` — **die Baseline** (current DB-State). Frage: exakte Struktur beider Loops + DECLARE-Block, damit CREATE OR REPLACE die idempotency/auth/notif-Logik 1:1 erhält.
2. **Live-Verify** `pg_get_functiondef('public.liquidate_player(uuid,uuid,integer,text)'::regprocedure)` — Frage: stimmt die Datei-Baseline mit Live überein (Slice-156 PATCH-AUDIT-Pflicht)? Keine Zwischen-Patches verschluckt?
3. `supabase/migrations/20260617120500_slice_329b_treasury_balance_sum.sql` — `book_club_treasury`-Signatur + SUM-Verhalten. Frage: korrekte Param-Reihenfolge `(club,direction,type,amount,ref,desc)`, debit-Vorzeichen, no-op bei amount≤0.
4. `supabase/migrations/20260617120000_slice_329_club_treasury_ledger.sql` §7 `get_club_balance` — Frage: wie wird „available" dort berechnet (Vergleichsmaß für meinen Guard) + welche `club_withdrawals.status` zählen.
5. `src/components/ui/FanRankBadge.tsx` — Frage: alle Caller von `showMultiplier`/`csfMultiplier` (nur FanRankOverview + ClubContent?).
6. `src/components/gamification/FanRankOverview.tsx` Z.90-130 — Frage: genaue Badge-Call-Struktur + csfBonus-Span.
7. `src/app/(app)/club/[slug]/ClubContent.tsx` Z.290-300 — Frage: ist `showMultiplier` dort gesetzt? Welche fanRanking-Felder sonst genutzt.
8. `src/components/player/detail/RewardsTab.tsx` — Frage: zeigt der Player-Detail-Reward-Tab irgendwo einen CSF-Multiplikator/Bonus-Hinweis (zweite Promise-Quelle)? (grep csf/multiplier/bonus)
9. `src/lib/services/liquidation.ts` — Frage: welche Return-Felder castet der Service (Z.51-60) — bleibt mein neues `csf_debited_cents` additiv-kompatibel?
10. `src/lib/services/__tests__/liquidation.test.ts` — Frage: testet es SQL-Verhalten (Integration gegen Prod) oder nur Service-Mapping? Welche Assertions brechen bei Multiplikator-Entfernung?
11. `src/lib/__tests__/db-invariants.test.ts` Z.1024 — Frage: `calculate_fan_rank`-Shape-Assertion enthält `csf_multiplier` — bleibt unberührt (Spalte lebt)? Bestätigen, nicht ändern.
12. `messages/de.json` + `tr.json` `gamification`-Namespace — Frage: ist `csfBonus` der einzige Multiplikator-Key, 0 weitere Consumer (`grep csfBonus src/`)?

## 5. Pattern-References

- **errors-db.md „Bank-Ledger balance_after: SUM unter Row-Lock"** (Slice 329) — Guard-Read MUSS unter `clubs FOR UPDATE` + SUM (nicht last-row). Mein Guard nutzt SUM, Lock vor dem Read.
- **errors-db.md „CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT"** (Slice 156) — Baseline = letzter Migration-Body / `pg_get_functiondef`, nicht erster Create.
- **errors-db.md „Money-RPC Idempotency-Blueprint"** (Slice 178) — dedup-Block 1:1 erhalten; RAISE rollt dedup-Reservierung mit zurück → Retry safe.
- **database.md „Migration-Template-Pflichten (AR-44)"** — REVOKE/GRANT-Block nach CREATE OR REPLACE (authenticated+postgres+service_role wie Baseline) + `DROP FUNCTION IF EXISTS` der alten Signatur entfällt (Signatur unverändert).
- **errors-frontend.md „Dead-Feature-Removal 4-Achsen" (Slice 305)** — i18n-Orphan `csfBonus` über `grep` in src/ verifizieren (shared Keys behalten) vor Delete.
- **reference_migration_workflow.md** — NUR `mcp__supabase__apply_migration`, nie `db push`.
- **CLAUDE.md §3** — Money/Security selbst machen (kein Agent-Dispatch für die Migration). Reviewer-Agent danach Pflicht.

## 6. Acceptance Criteria (executable)

| # | Kriterium | VERIFY |
|---|-----------|--------|
| AC1 | Engine enthält keine Multiplikator-Logik mehr | `pg_get_functiondef(...)` enthält NICHT `csf_multiplier`, `mastery`, `LEAST(1.15`, `effective_qty` |
| AC2 | CSF wird aus Treasury debitiert | Body enthält `book_club_treasury(`…`'debit', 'csf'`…`)` |
| AC3 | Insufficient-Guard vorhanden | Body enthält `treasury_insufficient_for_csf` RAISE vor Wallet-Writes |
| AC4 | PBT-Pfad unverändert (Quelle pbt_treasury, jetzt proportional) | Body: PBT-Payout = `FLOOR(v_pbt_balance * quantity / v_total_dpcs)`; `pbt_treasury` decrement bleibt |
| AC5 | Idempotency/auth/notif-Notif-Pfad 1:1 erhalten | dedup-Block + `auth_uid_mismatch` + club-admin-check + REVOKE/GRANT identisch zur Baseline |
| AC6 | UI-Badge-Promise weg | `grep -rn "csfBonus\|showMultiplier\|csfMultiplier" src/ messages/` → 0 Treffer (außer dormante service/type-Felder) |
| AC7 | i18n-Orphan entfernt | `csfBonus` nicht mehr in de.json/tr.json |
| AC8 | tsc + betroffene vitest grün | `pnpm exec tsc --noEmit` + `pnpm exec vitest run liquidation FanRank ClubContent` |
| AC9 | Guard-Simulation gegen Realdaten korrekt | SQL-Sim (Sektion 8) zeigt pro un-liquidiertem Spieler `pool` vs `available` + pass/block — plausibel |
| AC10 | Block-Pfad rollt sauber zurück | `liquidate_player` auf Guard-failing Spieler → RAISE, kein Ledger-/Wallet-/holdings-Effekt (Post-Check Counts unverändert) |
| AC11 | REVOKE/GRANT-Block korrekt | `pg_proc`/`information_schema` zeigt authenticated+postgres+service_role, kein anon |

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| SF-Pool = 0 (Transfer 0 + MV 0, oder Cap 0) | Kein Debit, kein Guard, kein RAISE. PBT (falls vorhanden) normal. |
| Treasury exakt == Pool | `available >= pool` → erlaubt (Grenzfall inklusiv). |
| Treasury < Pool | RAISE `treasury_insufficient_for_csf`, ganze TX zurück. |
| Holder-Count 0 (kein Umlauf) | total_dpcs=0 → pool=0 → kein Debit; is_liquidated wird trotzdem gesetzt (wie Baseline). |
| FLOOR-Rundungs-Staub | Debit = Σ tatsächlich verteilt (< pool) → Ledger matcht Wallets, Staub bleibt im Treasury (kein Mismatch). |
| Pending Withdrawal reduziert available | Guard zählt `club_withdrawals` (pending/approved/paid) ab → CSF kann nicht über zugesagtes Withdrawal hinaus zahlen. |
| Idempotent-Replay | Cached Result vor Guard zurück (Baseline-Verhalten). |
| Race: 2 parallele Liquidationen gleicher Club | `clubs FOR UPDATE` serialisiert Guard+Debit (zweite wartet, sieht aktualisierten Saldo). |
| Spieler ohne club_id | club-admin-check schlägt fehl → `Not authorized` (wie Baseline) — Guard nie erreicht. |
| `csf_multiplier`-Spalte noch von calculate_fan_rank geschrieben | Bleibt (dormant). db-invariants-Shape-Assertion unverändert. |
| TR-Locale Badge | Badge weg in beiden Locales (Component-Edit, locale-agnostisch). |

## 8. Self-Verification Commands

```bash
# Baseline-Audit (PATCH-AUDIT Slice 156)
mcp__supabase__execute_sql: SELECT pg_get_functiondef('public.liquidate_player(uuid,uuid,integer,text)'::regprocedure);

# Nach Apply: AC1/AC2/AC3 strukturell
#   → obiges pg_get_functiondef erneut, gegen die Verbote/Pflicht-Strings prüfen

# AC9 Guard-Simulation (NON-mutating) — pro un-liquidiertem Spieler mit Holdings:
mcp__supabase__execute_sql: |
  WITH pl AS (
    SELECT p.id, p.club_id, p.market_value_eur, p.success_fee_cap_cents,
           COALESCE(SUM(h.quantity),0) AS total_dpcs
    FROM players p JOIN holdings h ON h.player_id=p.id AND h.quantity>0
    WHERE p.is_liquidated=false GROUP BY p.id
  ), fee AS (
    SELECT id, club_id, total_dpcs,
      LEAST(GREATEST(market_value_eur/10,0),
            COALESCE(NULLIF(success_fee_cap_cents,0), 2147483647)) AS fee_per_dpc
    FROM pl
  ), pool AS (SELECT id,club_id,total_dpcs, fee_per_dpc*total_dpcs AS sf_pool FROM fee),
  avail AS (
    SELECT club_id,
      COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) AS ledger_bal
    FROM club_treasury_ledger GROUP BY club_id)
  SELECT po.id, po.sf_pool, COALESCE(a.ledger_bal,0) AS available,
         (COALESCE(a.ledger_bal,0) >= po.sf_pool) AS would_pass
  FROM pool po LEFT JOIN avail a USING (club_id)
  ORDER BY po.sf_pool DESC LIMIT 20;

# AC10 Block-Pfad (safe — RAISE rollt zurück): liquidate_player auf einen Spieler aus
#   obiger Liste mit would_pass=false → erwarte RAISE treasury_insufficient_for_csf.
#   Danach Counts unverändert: SELECT count(*) FROM club_treasury_ledger WHERE type='csf';  (=0)

# AC6/AC7 UI/i18n
grep -rn "csfBonus\|showMultiplier\|csfMultiplier" src/ messages/   # nur dormante service/type-Felder erlaubt

# AC8
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run liquidation FanRank ClubContent
```

## 9. Open-Questions

**Pflicht-Klärung (vor BUILD, falls Anil widerspricht — sonst Default wie hier):**
- **OQ1 (Money):** Guard-„available" = Ledger-Saldo (credit−debit) **minus** offene `club_withdrawals`. Default JA (verhindert Doppel-Verplanung von Geld das per Withdrawal schon zugesagt ist). Bestätigen.
- **OQ2 (Scope):** Deposit-RPC = **330b**, nicht in dieser Slice. Default: 330 shippt mit fail-safe-Block; Phase-1-Recourse = Pro-Card-Cap so setzen dass SF-Pool ≤ Treasury (IPO-85 % fließt in dasselbe Treasury → Cap ≤ ipo_price garantiert Deckung). Bestätigen, dass das als coherent gilt (kein D53-Build-without-Wire, weil liquidate_player live-verkabelt ist und der Normalpfad end-to-end funktioniert).

**Autonom-Zone (CTO entscheidet):** exakter `formula_version`-String, Wording der RAISE-Message (DE intern), Reihenfolge der Removals, Test-Anpassungs-Details.

## 10. Proof-Plan

| Artefakt | Beweist |
|----------|---------|
| `worklog/proofs/330-functiondef.txt` — `pg_get_functiondef` nach Apply | AC1/AC2/AC3/AC4/AC5/AC11 (Body strukturell + Grants) |
| `worklog/proofs/330-guard-sim.txt` — Guard-Simulation-Query-Output | AC9 (Pool vs available gegen Realdaten) |
| `worklog/proofs/330-block-path.txt` — RAISE-Output + Post-Counts | AC10 (fail-safe rollback) |
| `worklog/proofs/330-vitest.txt` — vitest-Run | AC8 |
| `worklog/proofs/330-ui-grep.txt` — grep-Output | AC6/AC7 |

**Kein Prod-Liquidate auf echten Spielern** (irreversibel). Erfolgs-Pfad wird über Struktur (functiondef) + Guard-Sim + Unit-Tests bewiesen, nicht durch echte Liquidation.

## 11. Scope-Out (explizit NICHT in 330)

- **Deposit-RPC `deposit_to_club_treasury`** (Escape-Ventil für den Guard) → **Slice 330b**, inkl. Money-Design-Frage „aus welchem Wallet" + transactions.type-Plumbing (activityHelpers + i18n).
- **AdminTreasuryTab Ledger-/Debit-Anzeige** (CSF-Debits sichtbar machen) → 329b-UI / 330b.
- **`fan_rankings.csf_multiplier`-Spalte droppen** — bleibt dormant (Fan-Reward-Engine repurposed sie). Kein DROP.
- **Cap-Semantik-Wechsel** auf min(Transfer,Cap) — bewusst NICHT (D-B: Pro-Card behalten).
- **RAUS-Kanäle Events/Polls/Bounties** ans Treasury → spätere Slices.
- **Fan-Reward-Engine** (Perks-Schienen) → späterer Slice.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (RPC + Service + 3 UI-Files + i18n = cross-domain → `/impact` light, Consumer-Liste unten) → BUILD (selbst, Money §3) → REVIEW (reviewer-Agent Pflicht, Cold-Context gegen errors-db/business/concept) → PROVE (5 Artefakte Sektion 10) → LOG.

**IMPACT-Kern (grep-verifiziert):**
- `liquidate_player`-Consumer: nur `src/lib/services/liquidation.ts` → `RewardsTab.tsx`/Admin-Liquidate-UI. Return-Shape-Erweiterung additiv.
- `csf_multiplier`-UI-Consumer: `FanRankOverview.tsx`, `ClubContent.tsx`, `FanRankBadge.tsx` (alle in Scope). Service/Type-Feld bleibt (dormant).
- `book_club_treasury`-Consumer: 329-Trigger + Sub-RPCs (unberührt) + NEU liquidate_player.

## 13. Pre-Mortem (5+ Szenarien)

1. **PATCH-AUDIT verschluckt Zwischen-Patch** — die Datei-Baseline (178e_d) ist nicht der Live-Stand. → Mitigation: `pg_get_functiondef` als echte Baseline (Code-Reading #2), Body daraus ableiten, nicht aus der Datei.
2. **Guard-Read race-anfällig** — available zwischen Read und Debit verändert. → Mitigation: `clubs FOR UPDATE` VOR dem Guard-Read (Pattern Slice 329), SUM unter Lock.
3. **Ledger-Debit ≠ Wallet-Payout durch Rundung** — pool debitiert, aber FLOOR-Summe verteilt → Saldo-Invariante bricht. → Mitigation: Debit = `v_actual_sf_distributed` (Σ FLOOR), nicht pool.
4. **UI-Badge nur halb entfernt** — Prop bleibt in einem Caller, TSC grün (optional), zweite Promise-Quelle (RewardsTab) übersehen. → Mitigation: Code-Reading #8 (RewardsTab grep) + AC6 grep über src/+messages/.
5. **Block-Pfad lässt is_liquidated halb gesetzt** — UPDATE players vor RAISE. → Mitigation: Guard VOR allen Writes; RAISE rollt ohnehin die ganze TX (inkl. dedup) zurück. AC10 verifiziert Counts unverändert.
6. **REVOKE/GRANT nach CREATE OR REPLACE vergessen** → anon kann liquidieren (J4-Klasse). → Mitigation: AR-44-Block 1:1 aus Baseline (authenticated+postgres+service_role), AC11.
7. **db-invariants calculate_fan_rank-Assertion bricht** weil ich csf_multiplier-Spalte „mit-aufräume". → Mitigation: Spalte NICHT anfassen (Scope-Out), Assertion bleibt grün.
8. **i18n-Key shared** — csfBonus doch woanders genutzt → Render-Crash. → Mitigation: grep vor Delete (Slice-305-Regel), nur löschen wenn 0 src/-Consumer.

---

*Anil-Approval erbeten. Nach Approval: BUILD selbst (Money §3), dann Reviewer-Agent.*
</content>

# Slice 348 Review — csf_multiplier-Removal

**Reviewer:** Cold-Context-Reviewer-Agent · **Datum:** 2026-06-23 · **Time-spent:** ~12 min

## Verdict: CONCERNS → behoben

Migration + TS-Layer sind korrekt und sicher zu shippen. Money-Effekt nachweislich 0 (Slice 330 hat `liquidate_player` bereits proportional gemacht). Einzige offene Punkte waren Doku-Drift, die der Slice selbst gescoped hatte (Wissens-Kopplung E0-W2gov/D88) — in diesem Slice behoben (siehe unten).

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MEDIUM | `reward-ranking.md:93` | Stale Claim „6 Tiers mit `csf_multiplier` 1.00→1.50 (`fanRanking.ts:24-31`)" — Feld in diesem Slice entfernt, Wert+Zeilen-Anker falsch. | ✅ GEFIXT |
| 2 | LOW | `reward-ranking.md`, `treasury.md` | csf_multiplier-Removal noch als „nächste Pro-Arbeit" beschrieben — ist jetzt erledigt (348). | ✅ GEFIXT |
| 3 | NIT | `fanRanking-v2.test.ts:22,51` | Mock nutzt `'silber'`/`'gold'` (alte Abo-Tier-Vokabel, kein gültiger FanRankTier). Pre-existing, round-trip-toEqual passt. | Out-of-scope (separater Cleanup) |

## Fokus-Fragen — alle bestätigt

1. **Kein Patch-Verlust:** Score-Gewichte 0.30/0.25/0.20/0.15/0.10, ELO-Boost (`fn_get_streak_elo_boost`), Follow +5, club_fan_rank_thresholds + Defaults, rank_tier-CASE — alle 1:1 erhalten. PATCH-AUDIT-Pflicht (errors-db.md Slice 156) erfüllt: Header dokumentiert Source-of-truth (Live-functiondef D87) + Applied-/Removed-Patches.
2. **TS vollständig:** `grep csf` = 0 Treffer. Service-Selects/Map/Return-Type/DbFanRanking/FAN_RANK_TIERS/Tests/db-invariants-Map alle konsistent.
3. **AR-44 korrekt:** REVOKE FROM PUBLIC + anon + GRANT authenticated, Signatur (uuid,uuid).
4. **DROP-Reihenfolge sicher:** CREATE OR REPLACE zuerst, dann DROP COLUMN IF EXISTS, eine Transaktion.
5. **Kein verbliebener Reader:** Slice 330 hat den alten liquidate_player-Reader (178e, superseded) bereits entfernt. Live liest nur calculate_fan_rank → mit-bereinigt. Money = 0.
6. **Deploy-Ordering korrekt:** Wave-1-TS deployt vor Migration-Apply (D82, getFanRanking gemountet). Header + Spec dokumentieren das Gate.

## Positive
- Vorbildliche PATCH-AUDIT-Disziplin (Source-of-truth = Live, nicht stale 20260330-Datei).
- Money-Risiko sauber als null nachgewiesen.
- Diskriminierter Return-Shape konsistent über RPC → Service → db-invariants-Map.

## Learning (Knowledge-Capture)
Bei Removal-Slices driften nicht nur beschreibende Doc-Zeilen, sondern auch **Roadmap-/„next work"-Zeilen**, die das Removal als künftig listen. Beim Schließen: `grep -rn "<entfernter Begriff>" docs/` UND Forward-Looking-Listen auf „erledigt" flippen.

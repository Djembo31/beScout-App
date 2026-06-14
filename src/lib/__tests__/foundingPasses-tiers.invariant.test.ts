import { describe, it, expect } from 'vitest';
import { FOUNDING_PASS_TIERS } from '@/lib/foundingPasses';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import type { FoundingPassTier } from '@/types';

/**
 * Slice 316 — Zero-Drift-Invariant für Founding-Pass-Tiers (Slice-108 Pattern).
 *
 * Verhindert die in S7 Phase-2 #1 gefundene 2×-Divergenz zwischen TS-Anzeige
 * (`FOUNDING_PASS_TIERS`) und RPC-Gutschrift (`grant_founding_pass` CASE).
 *
 * KANON = grant_founding_pass-Body (Anil-Decision 2026-06-14: RPC-Werte sind Wahrheit).
 * Bei jeder Änderung der RPC-CASE-Werte MUSS diese Tabelle + die TS-Tiers mitgezogen
 * werden — sonst schlägt dieser Test fehl, bevor angezeigte ≠ gutgeschriebene Credits
 * live gehen können.
 *
 * Quelle: supabase/migrations/20260614170000_slice_316_grant_founding_pass_price_binding.sql
 */
const RPC_TRUTH: Record<FoundingPassTier, { bcreditsCents: number; priceEurCents: number; bonusPct: number }> = {
  fan:     { bcreditsCents: 250_000,    priceEurCents: 999,   bonusPct: 15 },
  scout:   { bcreditsCents: 1_000_000,  priceEurCents: 2999,  bonusPct: 25 },
  pro:     { bcreditsCents: 3_500_000,  priceEurCents: 7499,  bonusPct: 35 },
  founder: { bcreditsCents: 10_000_000, priceEurCents: 19999, bonusPct: 50 },
};

describe('Founding-Pass tier invariant (TS ↔ grant_founding_pass RPC)', () => {
  it('covers exactly the 4 canonical tiers', () => {
    expect(FOUNDING_PASS_TIERS.map(t => t.tier).sort()).toEqual(
      (Object.keys(RPC_TRUTH) as FoundingPassTier[]).sort(),
    );
  });

  for (const tier of Object.keys(RPC_TRUTH) as FoundingPassTier[]) {
    const truth = RPC_TRUTH[tier];

    describe(`${tier}`, () => {
      const def = FOUNDING_PASS_TIERS.find(t => t.tier === tier)!;

      it('bcreditsCents matches RPC v_bcredits', () => {
        expect(def.bcreditsCents).toBe(truth.bcreditsCents);
      });

      it('priceEurCents matches RPC v_price_eur_cents CASE', () => {
        expect(def.priceEurCents).toBe(truth.priceEurCents);
      });

      it('migrationBonusPct matches RPC v_bonus_pct', () => {
        expect(def.migrationBonusPct).toBe(truth.bonusPct);
      });

      it('bcreditsLabel equals derived fmtScout(centsToBsd(bcreditsCents))', () => {
        expect(def.bcreditsLabel).toBe(fmtScout(centsToBsd(def.bcreditsCents)));
      });
    });
  }
});

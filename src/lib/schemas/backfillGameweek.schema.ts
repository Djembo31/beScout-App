import { z } from 'zod';

/**
 * Slice 177 — Tier B1 Pilot-Schema.
 *
 * Shared body-shape for GW-backfill admin-routes:
 *   - POST /api/admin/backfill-ratings
 *   - POST /api/admin/backfill-positions
 *
 * Accepts EITHER a single number / numeric-string, OR a range-string "1-5".
 * Returns a normalised `{ gameweeks: number[] }` for direct consumption.
 *
 * Validation rules:
 *   - each gw in [1, 38]
 *   - range end >= start
 *   - range size <= 38
 */
const GW_MIN = 1;
const GW_MAX = 38;

const SingleGameweekSchema = z.coerce
  .number()
  .int()
  .min(GW_MIN)
  .max(GW_MAX);

const RangeStringSchema = z
  .string()
  .regex(/^\d{1,2}-\d{1,2}$/, { message: 'invalid_range_format' })
  .transform((v, ctx) => {
    const [startStr, endStr] = v.split('-');
    const start = Number(startStr);
    const end = Number(endStr);
    if (start < GW_MIN || end > GW_MAX || end < start || end - start > GW_MAX) {
      ctx.addIssue({
        code: 'custom',
        message: 'invalid_range_bounds',
      });
      return z.NEVER;
    }
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  });

export const BackfillGameweekSchema = z
  .object({
    gameweek: z.union([SingleGameweekSchema, RangeStringSchema]),
  })
  .transform(({ gameweek }) => ({
    gameweeks: Array.isArray(gameweek) ? gameweek : [gameweek],
  }));

export type BackfillGameweekInput = z.infer<typeof BackfillGameweekSchema>;

import { z } from 'zod';

/**
 * Slice 177 — Tier B1 Pilot-Schema.
 *
 * Body-shape for POST /api/admin/sync-contracts.
 * Empty body is allowed — `dryRun` defaults to false.
 */
export const SyncContractsSchema = z
  .object({
    dryRun: z.boolean().optional().default(false),
  })
  .default({ dryRun: false });

export type SyncContractsInput = z.infer<typeof SyncContractsSchema>;

import { describe, it, expect } from 'vitest';
import { SyncContractsSchema } from '../syncContracts.schema';

describe('SyncContractsSchema (slice 177)', () => {
  it('accepts empty object with dryRun default false', () => {
    const r = SyncContractsSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dryRun).toBe(false);
  });

  it('accepts undefined input (schema default)', () => {
    const r = SyncContractsSchema.safeParse(undefined);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dryRun).toBe(false);
  });

  it('accepts dryRun: true', () => {
    const r = SyncContractsSchema.safeParse({ dryRun: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dryRun).toBe(true);
  });

  it('rejects non-boolean dryRun', () => {
    expect(SyncContractsSchema.safeParse({ dryRun: 'yes' }).success).toBe(false);
    expect(SyncContractsSchema.safeParse({ dryRun: 1 }).success).toBe(false);
  });
});

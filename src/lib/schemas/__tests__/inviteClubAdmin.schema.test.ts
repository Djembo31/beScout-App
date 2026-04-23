import { describe, it, expect } from 'vitest';
import { InviteClubAdminSchema } from '../inviteClubAdmin.schema';

describe('InviteClubAdminSchema (slice 177)', () => {
  it('parses valid happy-path', () => {
    const result = InviteClubAdminSchema.safeParse({
      email: 'admin@club.example',
      clubId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      role: 'owner',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@club.example');
      expect(result.data.role).toBe('owner');
    }
  });

  it('lowercases + trims email', () => {
    const result = InviteClubAdminSchema.safeParse({
      email: '  ADMIN@Club.EXAMPLE  ',
      clubId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      role: 'admin',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('admin@club.example');
  });

  it('rejects invalid email', () => {
    const result = InviteClubAdminSchema.safeParse({
      email: 'not-an-email',
      clubId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      role: 'owner',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid uuid for clubId', () => {
    const result = InviteClubAdminSchema.safeParse({
      email: 'a@b.co',
      clubId: 'not-a-uuid',
      role: 'owner',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown role', () => {
    const result = InviteClubAdminSchema.safeParse({
      email: 'a@b.co',
      clubId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(InviteClubAdminSchema.safeParse({}).success).toBe(false);
    expect(
      InviteClubAdminSchema.safeParse({ email: 'a@b.co', role: 'owner' }).success,
    ).toBe(false);
  });
});

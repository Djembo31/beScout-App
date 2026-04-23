import { z } from 'zod';

/**
 * Slice 177 — Tier B1 Pilot-Schema.
 *
 * Body-shape for POST /api/admin/invite-club-admin.
 * Replaces handwritten guards in route.ts.
 */
export const InviteClubAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .email()
    .transform((v) => v.toLowerCase()),
  clubId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'editor']),
});

export type InviteClubAdminInput = z.infer<typeof InviteClubAdminSchema>;

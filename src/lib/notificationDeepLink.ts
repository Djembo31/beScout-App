/**
 * Resolve a deep-link URL from notification reference metadata.
 *
 * PURE module — no supabase/browser imports → safe to use on BOTH client (notifications.ts)
 * and server (pushSender.ts / api/push route). Single source of truth so the push URL is
 * always an INTERNAL bescout deep-link, never client-supplied (Slice 318 anti-phishing).
 */
export function resolveDeepLink(referenceType?: string | null, referenceId?: string | null): string {
  if (!referenceType) return '/';
  switch (referenceType) {
    case 'event': return '/fantasy';
    case 'player': return `/player/${referenceId}`;
    case 'offer': return '/market?tab=angebote';
    case 'research': return '/community?tab=research';
    case 'bounty': case 'poll': return '/community?tab=aktionen';
    case 'mission': return '/missions';
    case 'achievement': return '/profile';
    case 'profile': return referenceId ? `/profile/${referenceId}` : '/profile';
    case 'post': return '/community';
    default: return '/';
  }
}

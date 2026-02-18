import { supabase } from '@/lib/supabaseClient';

// ============================================
// Content Impression Tracking
// Fire-and-forget, deduped per viewer/content/day
// ============================================

/** Log a content impression (batched, fire-and-forget) */
export function logContentImpression(
  contentType: 'post' | 'research' | 'poll',
  contentId: string,
  authorId: string,
  viewerId: string | null,
): void {
  // Don't track own impressions
  if (viewerId && viewerId === authorId) return;

  supabase
    .from('content_impressions')
    .insert({
      content_type: contentType,
      content_id: contentId,
      author_id: authorId,
      viewer_id: viewerId,
    })
    .then(({ error }) => {
      // Unique constraint violation = already tracked today → ignore
      if (error && !error.message.includes('duplicate')) {
        console.error('[Impressions] logContentImpression failed:', error);
      }
    });
}

/** Get impression stats for an author */
export async function getAuthorImpressionStats(
  authorId: string,
  days = 30,
): Promise<{ totalImpressions: number; uniqueViewers: number }> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { count: totalImpressions, error: err1 } = await supabase
    .from('content_impressions')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', authorId)
    .gte('created_at', since.toISOString());

  if (err1) {
    console.error('[Impressions] getAuthorImpressionStats count failed:', err1);
  }

  const { data: viewers, error: err2 } = await supabase
    .from('content_impressions')
    .select('viewer_id')
    .eq('author_id', authorId)
    .not('viewer_id', 'is', null)
    .gte('created_at', since.toISOString());

  if (err2) {
    console.error('[Impressions] getAuthorImpressionStats viewers failed:', err2);
  }

  const uniqueViewers = new Set((viewers ?? []).map(v => v.viewer_id)).size;

  return {
    totalImpressions: totalImpressions ?? 0,
    uniqueViewers,
  };
}

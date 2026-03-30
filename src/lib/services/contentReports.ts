import { supabase } from '@/lib/supabaseClient';
import type { ContentReportWithDetails, ReportTargetType } from '@/types';

// ============================================
// Content Reports Service
// ============================================

/** Report content via rate-limited RPC */
export async function reportContent(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('report_content', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };

  const result = data as { success: boolean; error?: string };
  return result;
}

/** Get pending reports (for admin moderation tab) */
export async function getPendingReports(
  clubId?: string,
): Promise<ContentReportWithDetails[]> {
  let query = supabase
    .from('content_reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);

  // If clubId provided, filter to that club's posts only
  // (research posts are club-agnostic, so always included)
  if (clubId) {
    // We'll filter client-side after enrichment for club context
  }

  const { data, error } = await query;
  if (error) {
    console.error('[ContentReports] getPendingReports:', error);
    return [];
  }

  const reports = (data ?? []) as ContentReportWithDetails[];

  // Enrich with reporter info and target content
  const reporterIds = Array.from(new Set(reports.map(r => r.reporter_id)));
  const postIds = reports.filter(r => r.target_type === 'post').map(r => r.target_id);
  const researchIds = reports.filter(r => r.target_type === 'research').map(r => r.target_id);

  const [profilesRes, postsRes, researchRes] = await Promise.all([
    reporterIds.length > 0
      ? supabase.from('profiles').select('id, handle, display_name').in('id', reporterIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from('posts').select('id, content, user_id, club_id').in('id', postIds)
      : Promise.resolve({ data: [] }),
    researchIds.length > 0
      ? supabase.from('research_posts').select('id, title, user_id').in('id', researchIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
  const postMap = new Map((postsRes.data ?? []).map(p => [p.id, p]));
  const researchMap = new Map((researchRes.data ?? []).map(r => [r.id, r]));

  // Get target author profiles
  const targetAuthorIds = new Set<string>();
  for (const r of reports) {
    if (r.target_type === 'post') {
      const post = postMap.get(r.target_id);
      if (post?.user_id) targetAuthorIds.add(post.user_id);
    } else {
      const research = researchMap.get(r.target_id);
      if (research?.user_id) targetAuthorIds.add(research.user_id);
    }
  }
  const missingAuthorIds = Array.from(targetAuthorIds).filter(id => !profileMap.has(id));
  if (missingAuthorIds.length > 0) {
    const { data: authorProfiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name')
      .in('id', missingAuthorIds);
    for (const p of authorProfiles ?? []) {
      profileMap.set(p.id, p);
    }
  }

  for (const r of reports) {
    const reporter = profileMap.get(r.reporter_id);
    if (reporter) {
      r.reporter_handle = reporter.handle;
      r.reporter_display_name = reporter.display_name;
    }

    if (r.target_type === 'post') {
      const post = postMap.get(r.target_id);
      if (post) {
        r.target_content = post.content?.slice(0, 120);
        const author = profileMap.get(post.user_id);
        r.target_author_handle = author?.handle;
      }
    } else {
      const research = researchMap.get(r.target_id);
      if (research) {
        r.target_content = research.title;
        const author = profileMap.get(research.user_id);
        r.target_author_handle = author?.handle;
      }
    }
  }

  // Filter by club if needed
  if (clubId) {
    return reports.filter(r => {
      if (r.target_type === 'post') {
        const post = postMap.get(r.target_id);
        return post?.club_id === clubId;
      }
      return false; // research is platform-level
    });
  }

  return reports;
}

/** Resolve a report (admin action) */
export async function resolveReport(
  reportId: string,
  adminId: string,
  action: 'resolved' | 'dismissed',
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('content_reports')
    .update({
      status: action,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      admin_note: adminNote ?? null,
    })
    .eq('id', reportId);

  if (error) return { success: false, error: error.message };

  // Notify reporter
  import('@/lib/services/notifications').then(m => {
    // Get report to find reporter
    supabase.from('content_reports').select('reporter_id').eq('id', reportId).maybeSingle()
      .then(({ data }) => {
        if (data?.reporter_id) {
          m.createNotification(
            data.reporter_id,
            'report_resolved',
            action === 'resolved' ? 'Deine Meldung wurde bearbeitet' : 'Deine Meldung wurde geprüft',
            undefined,
            adminId,
            'community',
          );
        }
      });
  }).catch(err => console.error('[ContentReports] Notification failed:', err));

  return { success: true };
}

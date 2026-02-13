import { supabase } from '@/lib/supabaseClient';
import type { FeedbackType } from '@/types';

// ============================================
// EXISTING: Submit feedback
// ============================================

export async function submitFeedback(
  userId: string,
  type: FeedbackType,
  message: string,
  pageUrl?: string
): Promise<void> {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    type,
    message: message.trim(),
    page_url: pageUrl ?? null,
  });
  if (error) throw new Error(error.message);
}

// ============================================
// FEEDBACK ANALYSIS & CATEGORIZATION
// ============================================

export type FeedbackCategory = 'bug' | 'feature' | 'ux' | 'performance' | 'content' | 'other';

export type FeedbackEntry = {
  id: string;
  user_id: string;
  message: string;
  page_url: string | null;
  category: FeedbackCategory | null;
  status: 'new' | 'reviewed' | 'resolved';
  created_at: string;
};

// Simple keyword-based auto-categorization
const CATEGORY_KEYWORDS: Record<FeedbackCategory, string[]> = {
  bug: ['fehler', 'bug', 'kaputt', 'geht nicht', 'funktioniert nicht', 'crash', 'error', 'broken', 'falsch'],
  feature: ['feature', 'wunsch', 'wäre toll', 'könnte man', 'vorschlag', 'idee', 'fehlt', 'hinzufügen', 'neu'],
  ux: ['verwirrend', 'unklar', 'verstehe nicht', 'kompliziert', 'design', 'layout', 'button', 'navigation'],
  performance: ['langsam', 'lädt', 'loading', 'performance', 'schnell', 'timeout', 'warten'],
  content: ['text', 'übersetzung', 'sprache', 'label', 'beschreibung', 'erklärung'],
  other: [],
};

export function categorizeMessage(message: string): FeedbackCategory {
  const lower = message.toLowerCase();
  let bestCategory: FeedbackCategory = 'other';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [FeedbackCategory, string[]][]) {
    if (category === 'other') continue;
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

export async function getFeedback(limit = 50): Promise<FeedbackEntry[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as FeedbackEntry[];
}

export async function categorizeFeedback(feedbackId: string, category: FeedbackCategory): Promise<void> {
  await supabase
    .from('feedback')
    .update({ category })
    .eq('id', feedbackId);
}

export async function updateFeedbackStatus(feedbackId: string, status: 'new' | 'reviewed' | 'resolved'): Promise<void> {
  await supabase
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId);
}

// Auto-categorize all uncategorized feedback
export async function autoCategorizeFeedback(): Promise<number> {
  const { data, error } = await supabase
    .from('feedback')
    .select('id, message')
    .is('category', null);

  if (error || !data) return 0;

  let count = 0;
  for (const entry of data) {
    const category = categorizeMessage(entry.message);
    await supabase
      .from('feedback')
      .update({ category })
      .eq('id', entry.id);
    count++;
  }
  return count;
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getTipsForContent } from '@/lib/services/tips';

const FIVE_MIN = 5 * 60 * 1000;

/** Tips for a specific content item (post/research) */
export function useContentTips(contentType: 'post' | 'research', contentId: string) {
  return useQuery({
    queryKey: qk.tips.byContent(contentType, contentId),
    queryFn: () => getTipsForContent(contentType, contentId),
    staleTime: FIVE_MIN,
    enabled: !!contentId,
  });
}

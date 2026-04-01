import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/services/notifications';
import type { NotificationPreferences, NotificationCategory } from '@/types';

export function useNotificationPreferences(userId: string) {
  return useQuery({
    queryKey: qk.notifications.preferences(userId),
    queryFn: () => getNotificationPreferences(userId),
    staleTime: 60_000,
    enabled: !!userId,
  });
}

export function useUpdateNotificationPreferences(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Partial<Pick<NotificationPreferences, NotificationCategory>>) =>
      updateNotificationPreferences(userId, prefs),
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: qk.notifications.preferences(userId) });
      const prev = queryClient.getQueryData<NotificationPreferences>(
        qk.notifications.preferences(userId),
      );
      queryClient.setQueryData<NotificationPreferences>(
        qk.notifications.preferences(userId),
        (old) => (old ? { ...old, ...newPrefs } : old),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(qk.notifications.preferences(userId), context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications.preferences(userId) });
    },
  });
}

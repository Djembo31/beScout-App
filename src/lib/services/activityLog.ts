import { supabase } from '@/lib/supabaseClient';

// ============================================
// Activity Log — Debug & Analytics
// ============================================

/** Get or create a session ID (one per browser tab session) */
function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let sid = sessionStorage.getItem('bs_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('bs_session_id', sid);
    }
    return sid;
  } catch {
    return null;
  }
}

// Batch queue — collect logs, flush every 5s
type LogEntry = {
  user_id: string;
  session_id: string | null;
  action: string;
  category: string;
  metadata: Record<string, unknown>;
};

let queue: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await supabase.from('activity_log').insert(batch);
  } catch {
    // Silent — activity logging should never break the app
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 5000);
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flush();
  });
}

/**
 * Log a user activity — fire-and-forget, batched.
 * Never throws, never blocks UI.
 */
export function logActivity(
  userId: string,
  action: string,
  category: string,
  metadata?: Record<string, unknown>,
): void {
  queue.push({
    user_id: userId,
    session_id: getSessionId(),
    action,
    category,
    metadata: metadata ?? {},
  });
  scheduleFlush();
}

/** Immediately flush any pending logs (e.g. on logout) */
export function flushActivityLogs(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  return flush();
}

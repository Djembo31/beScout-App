# RLS Cross-User Write Pattern

> Quelle: AR-58 Notifications (J8 Backend), RLS-Policy-Trap Session 255
> Konsolidiert: AutoDream v3 Run #11 (2026-04-15)

## Problem

AR-58: Notification-Service muss fuer User X eine Notification IN User Y's Table schreiben.
Standard RLS `auth.uid() = user_id` blockiert das (nur Owner darf schreiben).

## Pattern: SECURITY DEFINER RPC als Write-Proxy

```sql
-- 1. RLS auf Tabelle: restriktiv (nur Owner liest, schreibt via RPC)
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Kein direct INSERT policy fuer anon/authenticated!

-- 2. SECURITY DEFINER RPC als kontrollierten Write-Proxy
CREATE OR REPLACE FUNCTION notify_user(
  p_target_user_id uuid,
  p_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- laeuft als DB-Owner, umgeht RLS
SET search_path = public
AS $$
BEGIN
  -- Guard: Typ muss valid sein (Whitelist)
  IF p_type NOT IN ('trade_accepted', 'price_alert', 'league_invite') THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;

  INSERT INTO notifications (user_id, type, payload, created_at)
  VALUES (p_target_user_id, p_type, p_payload, now());
END;
$$;

REVOKE EXECUTE ON FUNCTION notify_user FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION notify_user TO authenticated;
```

## Sicherheits-Anforderungen

1. **Type-Whitelist im RPC-Body** — verhindert Injection beliebiger Notification-Types
2. **REVOKE + GRANT** — IMMER begleitend (sonst ist SECURITY DEFINER exploitbar, J4-LIVE-EXPLOIT)
3. **auth.uid() IS NOT NULL Guard** — am RPC-Anfang
4. **Rate-Limit oder Caller-Constraint** — verhindert Spam (z.B. nur nach Trade-Event)

## Unterschied zu Direct-RLS

| Ansatz | Wann | Risiko |
|--------|------|--------|
| RLS `auth.uid() = user_id` | Nur Owner-Writes | Kann Cross-User nicht |
| SECURITY DEFINER RPC | Kontrollierter Cross-User | Muss REVOKE+Type-Whitelist haben |
| Service-Level Auth Check | Client-side only | Nicht ausreichend (bypassbar) |

## Verwandte Patterns

- `get_my_ids()` SECURITY DEFINER fuer RLS-Recursion (errors.md: RLS Self-Recursion)
- `earn_wildcards` Exploit (J4 LIVE-EXPLOIT) — Beispiel fuer SECURITY DEFINER ohne REVOKE

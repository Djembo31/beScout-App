# Slice 178 — Idempotency Infrastructure Foundation (Tier A1)

**Typ:** S-Slice DB-Migration + Helper. Money-adjacent: JA (Foundation fuer zukuenftige Money-RPC-Idempotency). CEO-Scope per explicit Autonomous-Marathon-Grant.
**Impact:** skipped (foundation, no RPC mutation yet — Pilot-Integration als 178a).

---

## Ziel

Generische Idempotency-Infrastructure als Foundation fuer zukuenftige Money-RPC-Absicherung. Aktuell ist Idempotency ad-hoc per-RPC implementiert (z.B. `subscribe_to_club` mit 60s inline-window, Slice 151c.2). Slice 178 etabliert den standardisierten Baustein fuer alle zukuenftigen Money-RPCs.

Complement zu Slice 179 (append-only): Slice 179 verhindert state-corruption via UPDATE/DELETE, 178 verhindert Double-Spend via network-retry.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `supabase/migrations/20260424010000_idempotency_foundation.sql` | NEU — Table + Function + RLS |

---

## Database-Schema

```sql
CREATE TABLE public.request_dedup_keys (
  user_id       UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dedup_key     TEXT      NOT NULL,
  response      JSONB,             -- cached response of the original request
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL, -- cleanup-window
  PRIMARY KEY (user_id, dedup_key)
);

-- Cleanup-Index for periodic DELETE of expired entries
CREATE INDEX idx_request_dedup_keys_expires ON public.request_dedup_keys (expires_at);
```

## Helper Function

```sql
CREATE OR REPLACE FUNCTION public.check_or_reserve_dedup_key(
  p_user_id UUID,
  p_dedup_key TEXT,
  p_ttl_seconds INT DEFAULT 300
) RETURNS TABLE(is_new BOOLEAN, existing_response JSONB)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Try to reserve; ON CONFLICT returns existing entry
  INSERT INTO public.request_dedup_keys (user_id, dedup_key, expires_at)
  VALUES (p_user_id, p_dedup_key, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (user_id, dedup_key) DO NOTHING;

  IF FOUND THEN
    -- New reservation
    RETURN QUERY SELECT TRUE, NULL::JSONB;
  ELSE
    -- Existing entry → return its response (may be NULL if still pending)
    RETURN QUERY
      SELECT FALSE, r.response
      FROM public.request_dedup_keys r
      WHERE r.user_id = p_user_id AND r.dedup_key = p_dedup_key;
  END IF;
END;
$$;
```

---

## RLS

Append-only-style: INSERT + SELECT fuer authenticated on own rows, UPDATE nur via SECURITY DEFINER helper, keine DELETE (cleanup via cron).

---

## Acceptance Criteria

1. **A1** — Table `request_dedup_keys` existiert mit PK `(user_id, dedup_key)` + expires-index
2. **A2** — `check_or_reserve_dedup_key(p_user_id, p_dedup_key, p_ttl_seconds)` SECURITY DEFINER implementiert
3. **A3** — RLS policies: SELECT + INSERT own-rows only. UPDATE blocked for client-roles (only via SECURITY DEFINER)
4. **A4** — Helper returnt `{is_new: true, existing_response: NULL}` beim ersten Call
5. **A5** — Helper returnt `{is_new: false, existing_response: <cached>}` bei retry
6. **A6** — Post-Apply live-verified via pg_catalog + smoke-test

## Proof

`worklog/proofs/178-idempotency-foundation.txt`

## Scope-Out (Follow-ups)

- **Slice 178a:** Pilot-Integration in `buy_player_sc` RPC (add `p_idempotency_key TEXT` param)
- **Slice 178b:** Cleanup-Cron fuer expired entries (vercel cron `0 * * * *` → `DELETE FROM request_dedup_keys WHERE expires_at < NOW()`)
- **Slice 178c:** Migration existing subscribe_to_club inline-idempotency auf generic pattern

## Time

~15 min.

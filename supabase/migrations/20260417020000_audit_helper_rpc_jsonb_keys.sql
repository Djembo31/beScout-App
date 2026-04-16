-- =============================================================================
-- Slice 007 — Audit-Helper: get_rpc_jsonb_keys (2026-04-17)
--
-- Extracts the candidate top-level jsonb_build_object / json_build_object keys
-- from a public RPC body. Used by INV-23 (RPC Response Shape) to verify that
-- Service-Cast expected keys are actually produced by the RPC.
--
-- Drift-Klasse: camelCase in RPC ('rewardType') vs snake_case in Service-Cast
-- ('reward_type') → all fields silent undefined (AR-42 Mystery Box, 2026-04-11).
-- TypeScript-Cast (`as {...}`) is unchecked, so compile passes.
--
-- Parsing strategy: walk the function body char-by-char, track paren depth
-- inside a json[b]_build_object(...) call, and extract every odd-positioned
-- string literal (positions 1, 3, 5, ... = keys).  Nested build_object calls
-- are skipped for the outer call's key extraction but also parsed in their
-- own right.
--
-- Permissions: SECURITY INVOKER, REVOKE anon (function bodies are internal).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_rpc_jsonb_keys(p_rpc_name text)
RETURNS TABLE (
  rpc_name text,
  return_type text,
  arg_signature text,
  uses_jsonb_build boolean,
  uses_json_build boolean,
  top_level_keys text[]
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_oid oid;
  v_body text;
  v_len int;
  v_i int;
  v_ch text;
  v_next2 text;
  v_keys text[];
  v_call_depth int; -- how many nested json[b]_build_object calls are we inside
  v_paren_depth int[]; -- paren depth at which each call started
  v_arg_count int[]; -- arg-count so far per nested call
  v_cur_paren int;
  v_in_string boolean;
  v_str_quote text;
  v_str_start int;
  v_str_val text;
  v_saw_dollar_dollar boolean;
  v_dollar_tag text;
  v_j int;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = p_rpc_name
    AND p.prokind = 'f'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NULL THEN
    RETURN;
  END IF;

  v_body := pg_get_functiondef(v_oid);
  rpc_name := p_rpc_name;
  return_type := pg_get_function_result(v_oid)::text;
  arg_signature := pg_get_function_identity_arguments(v_oid)::text;
  uses_jsonb_build := v_body ILIKE '%jsonb_build_object%';
  uses_json_build := v_body ~* '(^|[^b])json_build_object';
  top_level_keys := ARRAY[]::text[];

  v_len := length(v_body);
  v_keys := ARRAY[]::text[];
  v_call_depth := 0;
  v_paren_depth := ARRAY[]::int[];
  v_arg_count := ARRAY[]::int[];
  v_cur_paren := 0;
  v_in_string := false;
  v_str_quote := '';
  v_str_start := 0;

  v_i := 1;
  WHILE v_i <= v_len LOOP
    v_ch := substr(v_body, v_i, 1);

    IF v_in_string THEN
      -- Inside 'string' literal — check for closing quote (and doubled quote escape)
      IF v_ch = '''' THEN
        -- Lookahead: doubled '' escape?
        IF v_i < v_len AND substr(v_body, v_i + 1, 1) = '''' THEN
          v_i := v_i + 2;
          CONTINUE;
        END IF;
        -- End of string
        v_str_val := substr(v_body, v_str_start + 1, v_i - v_str_start - 1);
        v_in_string := false;
        -- If we're inside a json[b]_build_object at odd arg position, this is a key
        IF v_call_depth > 0 THEN
          IF (v_arg_count[v_call_depth] % 2) = 0
             AND v_cur_paren = v_paren_depth[v_call_depth]
             AND v_str_val ~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
            -- Only record for outermost call (depth = 1) — keys at top level
            IF v_call_depth = 1 THEN
              v_keys := array_append(v_keys, v_str_val);
            END IF;
          END IF;
        END IF;
        v_i := v_i + 1;
        CONTINUE;
      END IF;
      v_i := v_i + 1;
      CONTINUE;
    END IF;

    -- Not in string. Check for opening quote
    IF v_ch = '''' THEN
      v_in_string := true;
      v_str_start := v_i;
      v_i := v_i + 1;
      CONTINUE;
    END IF;

    -- Skip line comments -- ...
    IF v_ch = '-' AND v_i < v_len AND substr(v_body, v_i + 1, 1) = '-' THEN
      -- Advance to end-of-line
      v_j := position(E'\n' in substr(v_body, v_i));
      IF v_j = 0 THEN
        v_i := v_len + 1;
      ELSE
        v_i := v_i + v_j;
      END IF;
      CONTINUE;
    END IF;

    -- Skip block comments /* ... */
    IF v_ch = '/' AND v_i < v_len AND substr(v_body, v_i + 1, 1) = '*' THEN
      v_j := position('*/' in substr(v_body, v_i));
      IF v_j = 0 THEN
        v_i := v_len + 1;
      ELSE
        v_i := v_i + v_j + 1;
      END IF;
      CONTINUE;
    END IF;

    -- Paren tracking
    IF v_ch = '(' THEN
      v_cur_paren := v_cur_paren + 1;
      -- Check if previous 18 chars spell jsonb_build_object or json_build_object
      IF v_i >= 19 AND lower(substr(v_body, v_i - 18, 18)) = 'jsonb_build_object' THEN
        v_call_depth := v_call_depth + 1;
        v_paren_depth := array_append(v_paren_depth, v_cur_paren);
        v_arg_count := array_append(v_arg_count, 0);
      ELSIF v_i >= 18 AND lower(substr(v_body, v_i - 17, 17)) = 'json_build_object'
            AND (v_i - 17 = 1 OR substr(v_body, v_i - 18, 1) !~ '[a-zA-Z_]') THEN
        v_call_depth := v_call_depth + 1;
        v_paren_depth := array_append(v_paren_depth, v_cur_paren);
        v_arg_count := array_append(v_arg_count, 0);
      END IF;
      v_i := v_i + 1;
      CONTINUE;
    END IF;

    IF v_ch = ')' THEN
      -- Leaving a json_build_object call?
      IF v_call_depth > 0 AND v_cur_paren = v_paren_depth[v_call_depth] THEN
        v_call_depth := v_call_depth - 1;
        v_paren_depth := v_paren_depth[1:v_call_depth];
        v_arg_count := v_arg_count[1:v_call_depth];
      END IF;
      v_cur_paren := v_cur_paren - 1;
      v_i := v_i + 1;
      CONTINUE;
    END IF;

    IF v_ch = ',' THEN
      -- Comma at the paren-depth of the outermost call we care about
      IF v_call_depth > 0 AND v_cur_paren = v_paren_depth[v_call_depth] THEN
        v_arg_count[v_call_depth] := v_arg_count[v_call_depth] + 1;
      END IF;
      v_i := v_i + 1;
      CONTINUE;
    END IF;

    v_i := v_i + 1;
  END LOOP;

  top_level_keys := ARRAY(SELECT DISTINCT unnest(v_keys) ORDER BY 1);

  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rpc_jsonb_keys(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rpc_jsonb_keys(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_rpc_jsonb_keys(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rpc_jsonb_keys(text) TO service_role;

COMMENT ON FUNCTION public.get_rpc_jsonb_keys(text) IS
  'Slice 007 (2026-04-17): Audit-Helper. Parses a public RPC body and returns top-level keys used in jsonb_build_object / json_build_object calls. Used by INV-23 to assert Service-Cast shapes align with RPC response shape.';

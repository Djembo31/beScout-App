# Impact — Slice 044 A-02 auth.uid() Body-Audit

**Source-Queries:** Supabase MCP `execute_sql` against Live-DB 2026-04-17 21:xx

## DB-State (vor Fix)

- **202** SECURITY DEFINER functions in `public.*`
- **73** davon haben einen User-Identity-Parameter (`p_user_id`, `p_mentor_id`, `p_mentee_id`, `p_subscriber_id`, `p_sender_id`, `p_buyer_id`, `p_holder_id`, `p_admin_id` etc.)

## Klassifikation der 73 User-Param-RPCs

| Kategorie | Count | Befund |
|-----------|-------|--------|
| Strict Guard (`auth.uid() IS NOT NULL AND IS DISTINCT FROM`) | 4 | OK — Slice 005 RPCs |
| Loose Guard (`IS DISTINCT FROM` ohne `IS NOT NULL AND`) | 41 | OK fuer client-only, Trigger-Kompatibilitaet offen |
| Anderes auth.uid()-Pattern (role-check, eq-check) | 8 | Analyse pro RPC |
| Kein auth-Check — `service_role_only` grant | 13 | OK (interne Helper / Cron) |
| Kein auth-Check — `authenticated` grant | **7** | **EXPLOIT-RISIKO** |

## Kritische Befunde (Exploit-Vektoren)

### Kategorie A: Missing Guard + Authenticated Grant

| RPC | Signature | Exploit | Fix |
|-----|-----------|---------|-----|
| `accept_mentee` | `(p_mentor_id, p_mentorship_id)` | Authenticated User kann fremde `p_mentor_id` senden und im Namen eines fremden Mentors Mentees akzeptieren | Guard auf `p_mentor_id` |
| `award_dimension_score` | `(p_user_id, p_dimension, p_delta, ...)` | **KRITISCH:** Authenticated User kann beliebigen anderen User beliebige Scout-Score-Punkte vergeben (Trader/Manager/Analyst). Intent war "REVOKED from PUBLIC — all scoring via DB triggers" (siehe `src/lib/services/scoutScores.ts:109`), aber Grant nicht aktuell. | **REVOKE authenticated** (keine Caller im Frontend, nur Trigger/Cron) |
| `request_mentor` | `(p_mentee_id, p_mentor_id)` | Authenticated User kann fuer beliebige `p_mentee_id` eine Mentor-Anfrage stellen | Guard auf `p_mentee_id` |
| `subscribe_to_scout` | `(p_subscriber_id, p_scout_id)` | **KRITISCH:** Authenticated User kann fremden `p_subscriber_id` senden → Wallet eines anderen Users wird mit Abo-Kosten belastet | Guard auf `p_subscriber_id` |

**Nicht in Kategorie A (false alarm):**
- `get_club_by_slug(p_slug, p_user_id)` — `p_user_id` ist Parameter fuer `is_admin`-Check-Display, nicht caller-Identity. Read-only. OK.
- `is_club_admin(p_user_id, p_club_id)` — Pure boolean-check helper. Anyone can check if anyone is admin. Read-only. OK.

### Kategorie B: Andere 8 RPCs mit `authenticated` + eq-/role-Guard (SAFE)

| RPC | Guard-Pattern | Status |
|-----|---------------|--------|
| `add_club_admin` | `user_id = auth.uid() AND role='owner'` | OK (role-guard) |
| `create_ipo` | `EXISTS(club_admins WHERE user_id = auth.uid() AND club_id = v_player.club_id)` + `auth.uid() IS NULL → RAISE` | OK (club-admin-guard). **Smell:** `p_user_id` Parameter ist ungenutzt im Body. Separater Cleanup-Slice? |
| `credit_tickets` | `IF v_caller_uid IS NOT NULL AND p_user_id <> v_caller_uid THEN RAISE` | OK (explizit) |
| `get_available_sc` | `v_caller IS NULL → RAISE` + `v_caller <> p_user_id → platform_admin check` | OK (read-guard mit admin-override) |
| `grant_founding_pass` | `top_role IS DISTINCT FROM 'Admin' → RAISE` | OK (admin-role-guard) |
| `remove_club_admin` | `user_id = auth.uid() AND role='owner'` | OK (role-guard) |
| `spend_tickets` | `IF v_caller_uid IS NOT NULL AND p_user_id <> v_caller_uid THEN RAISE` | OK (explizit) |
| `update_ipo_status` | `EXISTS(club_admins ... user_id = auth.uid())` + auth.uid IS NULL check | OK (club-admin-guard) |

### Kategorie C: Loose Guards (41 RPCs)

Alle haben `auth.uid() IS DISTINCT FROM p_*` — lehnen Cross-User-Calls ab fuer authenticated. Fehlt `IS NOT NULL AND` (System-Context-Skip fuer Cron/Trigger).

**Risiko:** WENN Cron/Trigger diese RPCs direkt callt → `auth.uid() = NULL` → `NULL IS DISTINCT FROM p_user_id = TRUE` → RPC rejected silent.

**Heutiger Stand:** Audit der 41 Callers ergab, dass keiner von Cron/Trigger direkt aufgerufen wird (alle client-only Trading/Social/Fantasy). Loose Guards sind heute funktional aequivalent zu Strict Guards.

**Future-Proofing:** Sollte Cron/Trigger eine der 41 RPCs callen wollen → Migration auf `IS NOT NULL AND` noetig. Deferred zu Slice 044b (optional) oder nur-on-demand.

**Scope-Entscheidung Slice 044:** 41 loose guards **bleiben unveraendert**. Dokumentiert in INV-31 Allowlist als "client-only, loose_guard accepted".

## Caller-Audit fuer `award_dimension_score` (REVOKE-Kandidat)

Callers (alle intern via SECURITY DEFINER / Trigger-Owner):
1. `check_all_analyst_decay` — Cron batch
2. `check_analyst_decay` — Cron per-user
3. `fn_analyst_score_on_post` — Trigger on `posts`
4. `fn_analyst_score_on_research` — Trigger on `research_unlocks`
5. `fn_trader_score_on_trade` — Trigger on `trades`
6. `resolve_gameweek_predictions` — Cron
7. `trg_fn_bounty_approved_analyst` — Trigger on `bounty_submissions`
8. `trg_fn_event_scored_manager` — Trigger on `fantasy_scores`
9. `trg_fn_follow_gamification` — Trigger on `user_followings`
10. `trg_fn_post_vote_gamification` — Trigger on `post_votes`
11. `trg_fn_research_unlock_gamification` — Trigger on `research_unlocks`

Frontend-Scan `src/`: nur Kommentar-Referenz in `scoutScores.ts:109-111`, **kein Supabase-RPC-Call.**

→ **REVOKE authenticated ist safe.** Kein Functional-Break.

## Migration-Plan

**Datei:** `supabase/migrations/20260418120000_slice_044_auth_uid_body_audit.sql`

**Blocks:**
1. **Block 1 — Guard auf `accept_mentee`:**
   - ADD `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_mentor_id THEN RAISE auth_uid_mismatch`
2. **Block 2 — Guard auf `request_mentor`:**
   - ADD `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_mentee_id THEN RAISE auth_uid_mismatch`
3. **Block 3 — Guard auf `subscribe_to_scout`:**
   - ADD `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_subscriber_id THEN RAISE auth_uid_mismatch`
4. **Block 4 — `award_dimension_score`:**
   - REVOKE EXECUTE ... FROM authenticated
   - Keep GRANT EXECUTE ... TO service_role
5. **Block 5 — Audit-RPC `public.get_security_definer_user_param_audit()`:**
   - Returns JSONB array of `{proname, args, guard_type, grant_status, allowlist_reason}`
6. **Block 6 — COMMENTS dokumentieren** Guard-Intent auf den 3 gefixten Mentor-RPCs

**Idempotenz:** CREATE OR REPLACE FUNCTION + `REVOKE EXECUTE ... IF EXISTS` (via DO-Block). Re-apply fuehrt zum identischen End-Zustand.

## Consumer-Auswirkung

**Frontend (src/):**
- `accept_mentee`, `request_mentor`, `subscribe_to_scout` → kein Code-Caller → **0 Impact**
- `award_dimension_score` → kein direkter RPC-Call → **0 Impact**

**Services:**
- `src/lib/services/scoutScores.ts:109-111` — Kommentar erwaehnt bereits das intendierte REVOKE. Nach Migration ist Intent + Reality aligned.

**Cron/Triggers:**
- Alle 11 internen Callers laufen als SECURITY DEFINER owner (postgres) → unbetroffen vom REVOKE authenticated
- Kein Cron ruft `accept_mentee`/`request_mentor`/`subscribe_to_scout` → Guard greift nie im System-Context

## INV-31 Design

**Test-Name:** `INV-31: SECURITY DEFINER RPCs mit user-identity-Parametern haben Guard oder sind in Allowlist`

**Allowlist-Kategorien (mit Reason):**
1. `service_role_only` — RPC hat keine authenticated-Grant (kein direkter Client-Call moeglich). Beispiele: `_refresh_airdrop_score_internal`, `available_balance`, `award_mastery_xp`, etc.
2. `role_guard` — Guard ist role-check via `is_admin(auth.uid())`, `top_role = 'Admin'`, oder `club_admins WHERE user_id = auth.uid()` statt eq-check. Beispiele: `add_club_admin`, `create_ipo`, `grant_founding_pass`, `remove_club_admin`, `update_ipo_status`.
3. `explicit_caller_check` — Guard ist `IF v_caller_uid IS NOT NULL AND p_user_id <> v_caller_uid THEN RAISE` (alternativ zur DISTINCT FROM-Syntax). Beispiele: `credit_tickets`, `spend_tickets`, `get_available_sc`.
4. `read_only_helper` — Pure read-boolean, kein Side-Effect, keine Money/Permission-Implikation. Beispiele: `is_club_admin`, `get_club_by_slug` (mit `p_user_id` als display-param, nicht caller-id).
5. `loose_guard_client_only` — Hat `IS DISTINCT FROM` aber nicht `IS NOT NULL AND`. Alle heute-Client-only. Dokumentiert als acceptable fuer Slice 044, Review wenn Cron-Caller hinzukommt.

**Test-Logic:**
```typescript
it('INV-31: Alle SECURITY DEFINER RPCs mit user-identity-Parameter haben Guard oder Allowlist-Eintrag', async () => {
  const { data } = await supabase.rpc('get_security_definer_user_param_audit');
  const missingGuard = data.filter(r => r.guard_type === 'none' && r.grant_status === 'authenticated');
  expect(missingGuard).toEqual([]); // Kategorie A muss leer sein
});
```

## Proof-Plan (final)

1. `worklog/proofs/044-audit-before.txt` — Query gegen Live-DB mit Liste der 4 Kategorie-A RPCs + deren Guard-Status
2. `worklog/proofs/044-audit-after.txt` — Gleiche Query, Kategorie-A muss leer sein, alle 4 fixed
3. `worklog/proofs/044-inv31-vitest.txt` — `npx vitest run src/__tests__/db-invariants.test.ts -t 'INV-31'` gruen
4. `worklog/proofs/044-migration-idempotent.txt` — Re-apply zeigt NO-CHANGE (grant delta + function body delta = 0)

## Scope bestaetigt

- **IN:** 4 Kategorie-A RPCs fixen, Audit-RPC, INV-31 Test, COMMENTS
- **OUT:** 41 loose_guard RPCs auf IS NOT NULL AND migrieren (Slice 044b optional post-Beta)
- **OUT:** `create_ipo` ungenutzter `p_user_id` Parameter (separater Cleanup)
- **OUT:** Admin-RPC-Role-Check-Audit (admin_* Prefix, separate Slice falls gewuenscht)

## Risiken

- **Niedrig:** Client-Breaking — keine Frontend-Caller fuer die 4 Kategorie-A RPCs (Grep leer). Worst-case: zukuenftige Feature-Implementierung schickt fremde p_user_id → Guard greift → korrekte Rejection.
- **Niedrig:** Cron-Breaking — `award_dimension_score` REVOKE authenticated beeinflusst nur direkte client-calls. Trigger/Cron callen als SECURITY DEFINER owner.
- **Niedrig:** Idempotenz — CREATE OR REPLACE ist nativ idempotent. REVOKE mit IF-EXISTS-Check.

---

**Ready fuer BUILD-Stage:** JA

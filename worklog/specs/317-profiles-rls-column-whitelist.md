# Slice 317 — profiles_update Spalten-Whitelist (S7 Phase-2 #3)

**Slice-Type:** Migration (DB-Security)
**Größe:** S
**Datum:** 2026-06-14
**CEO-Scope:** JA — P1 Security. REVIEW Pflicht.

## 1. Problem-Statement (Evidence: S7-Registry Phase-2 #3, live-verifiziert 2026-06-14)

RLS-Policy `profiles_update` = `USING (auth.uid() = id)`, **`with_check = NULL`** (live pg_policy). Kein Column-Guard, kein BEFORE-UPDATE-Trigger. Der Service `updateProfile` whitelistet (nur handle/display_name/bio/favorite_club/favorite_club_id/language/avatar_url/region), **aber RLS ist die echte Grenze** — ein direkter PostgREST-`.update()` umgeht den Service:

```ts
supabase.from('profiles').update({ verified: true, top_role: 'Admin', plan: 'Pro',
  subscription_price_cents: 0, level: 99, is_demo: false }).eq('id', myUid)
```

→ User kann sich selbst Verified-Checkmark, Admin-Rolle, Plan-Upgrade, Level, Referral-Code, invited_by setzen. P1 Security (Privilege-Escalation + Trust-Signal-Fälschung).

## 2. Lösungs-Design

**Pattern:** D39 Trigger+GUC-Invariant (`.claude/rules/errors-db.md`), getunt auf `current_user`-Kontext.

RLS `WITH CHECK` kann „Spalte X unverändert" NICHT ausdrücken (kein OLD-Zugriff im WITH CHECK). Daher BEFORE-UPDATE-Trigger `prevent_profile_sensitive_update` (SECURITY **INVOKER**, damit `current_user` den echten Aufrufer zeigt):

- **Bypass** wenn `current_setting('bescout.allow_profile_admin_update', true) = 'true'` ODER `current_user NOT IN ('authenticated','anon')`.
  - Alle 2 legitimen Writer sind SECURITY DEFINER (laufen als `postgres`) → `current_user='postgres'` → Bypass automatisch. **Kein Patch an Bestandscode.**
  - service_role (Cron/Admin-MCP) + postgres-Superuser → Bypass. GUC = manueller Notausgang / Future SECURITY-INVOKER-Flows.
- **Sonst** (direkter `authenticated`/`anon` `.update()`): sensible Spalten silent auf OLD zurücksetzen (`NEW.col := OLD.col`) — legitime bio/avatar-Edits brechen NIE, der geschmuggelte Wert wird neutralisiert.

**Freeze-Set (11):** verified, top_role, plan, level, subscription_price_cents, subscription_enabled, subscription_description, is_demo, referral_code, invited_by, invited_by_club.
**Frei (user-editable, NICHT eingefroren):** handle, display_name, bio, favorite_club, favorite_club_id, language, avatar_url, region, updated_at.

## 3. Betroffene Files
- `supabase/migrations/20260614180000_slice_317_profiles_sensitive_update_guard.sql` — NEU: Trigger-Funktion + BEFORE UPDATE Trigger + COMMENT.
- **(317b, Reviewer-Finding #1)** `supabase/migrations/20260614183000_slice_317b_apply_referral_code_rpc.sql` — NEU: SEC-DEFINER-RPC `apply_referral_code` (invited_by ist frozen → Client-Write muss über RPC).
- **(317b)** `src/lib/services/referral.ts` — `applyReferralCode` auf RPC umgestellt (Signatur `(referrerCode)`).
- **(317b)** `src/lib/services/__tests__/referral.test.ts` — applyReferralCode-Block auf RPC-Mock.

## 4. Code-Reading-Liste (erledigt)
- live `pg_policy` profiles → with_check NULL bestätigt. ✓
- profiles-Spalten (information_schema) → 22 Spalten, sensible identifiziert. ✓
- `updateProfile` (`profiles.ts:100`) → Whitelist (8 Felder) = user-editable-Wahrheit. ✓
- `createProfile` → setzt handle/display_name/favorite_club*/language/referral_code/invited_by bei INSERT (Trigger ist BEFORE UPDATE → INSERT nicht betroffen). ✓
- Writer-Audit: slice_055 `UPDATE profiles SET top_role` (RPC, SEC DEFINER) + `sync_level_on_stats_update()` (Trigger, SEC DEFINER, level). subscription_* dormant. ✓
  - **KORREKTUR (Reviewer-Finding #1):** initialer Audit grepte nur SQL-RPCs, nicht src. `applyReferralCode` (referral.ts:50) war ein **client-seitiger** authenticated `.update({invited_by})` — wäre durch den Freeze-Trigger silent eingefroren. DORMANT (0 Production-Consumer). → Fix Slice 317b: auf SEC-DEFINER-RPC `apply_referral_code` umgestellt. Kein weiterer src/scripts Client-Writer einer Freeze-Spalte (grep verifiziert).
  - **Lehre:** D39-Freeze-Trigger-Audits MÜSSEN auch src-Layer Client-`.update()` der Frozen-Cols greppen, nicht nur SQL-RPCs (`grep -rn "\.update(\{[^}]*<col>" src/`). Ein authed-Client-Writer einer Freeze-Spalte = silent-frozen + `{success:true}` = Silent-Fail.

## 5. Pattern-References
- `errors-db.md` D39 „Trigger+GUC-Invariant-Enforcement — generalisiert" (Slice 179 transactions, Slice 189 players).
- `database.md` RLS-Pflicht-Checkliste + „RLS `.update()` stumm blockiert → IMMER RPC für geschützte Tabellen".
- `errors-db.md` „RLS qual=true auf sensiblen Tabellen (Slice 014+019-021)" — gleiche Bug-Familie (RLS zu permissiv).

## 6. Acceptance Criteria
- **AC1:** Trigger-Funktion `prevent_profile_sensitive_update` existiert, LANGUAGE plpgsql, **NICHT** SECURITY DEFINER (Invoker), Bypass via GUC ODER `current_user NOT IN ('authenticated','anon')`.
- **AC2:** BEFORE UPDATE Trigger auf `public.profiles` FOR EACH ROW registriert.
- **AC3:** Live-Smoke (SET ROLE authenticated + jwt.claims=non-admin-uid): `UPDATE profiles SET verified=true, bio='x'` → verified bleibt OLD, bio='x' übernommen. (ROLLBACK).
- **AC4:** Legit-Pfad: Update via postgres/GUC-Bypass kann sensible Spalte ändern (verifiziert, ROLLBACK).
- **AC5:** Bestehende Writer ungestört: `sync_level_on_stats_update` (level) + top_role-RPC laufen als SEC DEFINER (postgres) → Bypass. Kein Code-Patch nötig (verifiziert via current_user-Logik + Writer-Audit).
- **AC6:** COMMENT ON FUNCTION dokumentiert Bypass-Mechanik + Freeze-Set.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| User ändert nur bio/avatar (legit) | Freeze-Branch läuft, sensible Cols = OLD (no-op) → Update OK |
| User schmuggelt verified=true mit | verified := OLD (false) → Checkmark NICHT gesetzt, bio-Edit OK |
| anon `.update()` | RLS blockt vorher; falls doch → current_user='anon' → Freeze greift |
| SEC DEFINER RPC (top_role/level) | current_user='postgres' → Bypass → Änderung OK |
| Admin-MCP (service_role) ändert verified | current_user='service_role' → Bypass → OK |
| Manueller postgres-Fix mit GUC | Bypass via GUC ODER current_user → OK |
| Future creator-settings (subscription_*) | MUSS via SEC DEFINER RPC laufen (auto-bypass) — direkter .update() bleibt korrekt geblockt |
| INSERT (createProfile) | Trigger ist BEFORE UPDATE → nicht betroffen |

## 8. Self-Verification Commands
- `SELECT polname, with_check FROM pg_policy WHERE polrelid='public.profiles'::regclass` (Doku-Stand).
- `pg_get_functiondef('public.prevent_profile_sensitive_update()')` post-apply.
- Live-Smoke (BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims; UPDATE; SELECT; ROLLBACK).
- `pnpm exec tsc --noEmit` (falls Invariant-Test).

## 9. Open-Questions
- **Pflicht (geklärt):** Freeze-Set = die 11 sensiblen Spalten; user-editable = updateProfile-Whitelist.
- **Autonom (CTO):** current_user-Bypass statt Patchen der 2 Writer (kein Blast-Radius); silent-freeze statt RAISE (robuster, Finding-konform); kein RLS-WITH-CHECK (kann OLD nicht referenzieren).

## 10. Proof-Plan
`worklog/proofs/317-profiles-rls-guard.txt`: pg_get_functiondef + Trigger-Listing + Live-Smoke (verified frozen / bio changed, ROLLBACK) + Legit-Bypass-Smoke + Writer-Audit-Zusammenfassung.

## 11. Scope-Out
- Keine RLS-Policy-Änderung (Trigger ist additiv; `profiles_select USING(true)` bleibt — Public-Profile-Read ist gewollt).
- Keine Behandlung von handle-Uniqueness/Reserved (Service-Layer, separat).
- Keine creator-subscription-Aktivierung (dormant, eigene Produkt-Entscheidung).
- Andere Tabellen mit permissiver RLS (separate Slices falls Registry sie listet).

## 12. Stage-Chain (geplant)
SPEC ✓ → IMPACT (inline in §4 Writer-Audit) → BUILD → REVIEW (Pflicht, Security) → PROVE (Live-Smoke) → LOG.

## 13. Pre-Mortem
1. Trigger fälschlich SECURITY DEFINER → current_user würde Owner zeigen → ALLE Updates bypassen → Schutz wirkungslos. Mitigation: AC1 erzwingt INVOKER, Proof prüft Smoke-Block.
2. Ein legitimer Writer ist SECURITY INVOKER (nicht gefunden) → würde silent-frozen. Mitigation: Writer-Audit §4 (nur 2, beide DEFINER) + GUC-Notausgang.
3. anon-Bypass-Lücke wenn nur `<> 'authenticated'` geprüft → `NOT IN ('authenticated','anon')` deckt beide.
4. Trigger-Order mit existierendem updated_at-Trigger → BEFORE-UPDATE-Reihenfolge alphabetisch; Freeze betrifft nur sensible Cols, kollidiert nicht mit updated_at.
5. createProfile-INSERT bricht → Trigger ist BEFORE UPDATE only, INSERT unberührt (AC/Edge verifiziert).

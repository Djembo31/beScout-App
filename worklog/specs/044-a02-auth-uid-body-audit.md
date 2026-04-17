# Slice 044 — A-02 Vollstaendiger auth.uid() Body-Audit + INV-31

**Groesse:** M (1.5-2h erwartet)
**CEO-Scope:** JA (Security-Audit auf SECURITY DEFINER RPCs)
**Variante-2-Position:** #1/10

## Ziel

Jede SECURITY DEFINER RPC mit `p_user_id` (oder aehnlichem Caller-Identitaets-Parameter) hat entweder einen `auth.uid()` Body-Guard ODER ist explizit dokumentiert als "internal-helper / service_role-only / admin-role-gated". Neuer Regression-Test INV-31 scannt das ueber die gesamte Matrix, nicht nur die 4 bereits abgedeckten RPCs aus Slice 005.

## Hintergrund

Slice 005 hat A-02 partial erledigt: 4 RPCs (`rpc_lock_event_entry`, `renew_club_subscription`, `check_analyst_decay`, `refresh_airdrop_score`) bekamen Guards + INV-21. Der Rest der ~124 SECURITY DEFINER-Funktionen wurde nicht systematisch durchgegangen. Briefing 2026-04-18 markiert das als User-Priority #1.

Pattern aus `.claude/rules/common-errors.md` — "SECURITY DEFINER + authenticated-Grant ohne auth.uid()-Guard":
- RPC hat `p_user_id uuid` Parameter
- GRANT authenticated (direkter Client-Call moeglich)
- KEIN Body-Guard: `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE`
- → authenticated-User kann im Namen anderer User RPC ausfuehren

## Betroffene Files

**NEU:**
- `supabase/migrations/NNNNNN_slice_044_auth_uid_body_audit.sql` — Audit-RPC + Body-Guards nachruesten
- `worklog/proofs/044-audit-before.txt` — RPC-Liste mit missing guards
- `worklog/proofs/044-audit-after.txt` — RPC-Liste nach Fix
- `worklog/proofs/044-inv31-vitest.txt` — INV-31 Test-Output

**MODIFIZIERT:**
- `src/lib/__tests__/db-invariants.test.ts` — INV-31 hinzufuegen, evtl. INV-21 deprecaten oder subsumieren

## Acceptance Criteria

1. **Audit-RPC existiert:** `public.get_security_definer_user_param_audit()` returned JSON-Array mit `{proname, user_param_name, has_body_guard, grant_authenticated, doc_exception_reason}` fuer jede SECURITY DEFINER function mit User-Identity-Parameter.
2. **Body-Guards vorhanden oder dokumentiert:** Jede RPC mit `p_user_id`/`p_target_user_id`/`p_owner_id` Parameter hat entweder (a) Body-Guard ODER (b) REVOKE authenticated + GRANT service_role only ODER (c) explizite Allowlist-Eintrag mit Begruendung in der Audit-RPC selbst (z.B. internal-helper, admin-role-gated).
3. **INV-31 Test schaerft das:** `EXPECTED_WITHOUT_GUARD` Array in `db-invariants.test.ts` listet explizit welche RPCs ohne Guard erlaubt sind (mit Reason). Test fail, wenn neue RPCs ohne Guard und ohne Allowlist-Eintrag auftauchen.
4. **Keine Regression:** Bestehende RPCs die heute korrekt funktionieren (fuer den eigenen User) funktionieren weiter — Guard schlaegt nur bei Cross-User-Call zu.
5. **Migration idempotent:** Apply + Re-Apply der Migration fuehrt zu identischem End-Zustand.
6. **Proof-Artefakte vorhanden:** Before/After RPC-Audit + INV-31 Vitest-Output.

## Edge Cases

1. **SECURITY INVOKER RPC** mit `p_user_id` → nicht betroffen (nutzt Caller's Rolle, RLS greift). Ausschliessen per `prosecdef = true` im Audit.
2. **Internal-Helper-Pattern (Slice 035):** `_refresh_airdrop_score_internal` hat `p_user_id` aber `REVOKE ALL FROM PUBLIC, anon, authenticated` + nur `GRANT service_role` → kein direkter Client-Call moeglich, Guard nicht noetig. Audit-RPC muss das erkennen (grants-check).
3. **Wrapper-Pattern (Slice 041):** Wrapper ohne `p_user_id`, ruft internal mit `auth.uid()` → kein Guard noetig (internal ist geschuetzt).
4. **Admin-RPCs** (prefix `admin_` oder `rpc_admin_`): Guard-Semantik ist role-check (`is_admin(auth.uid())`), NICHT `auth.uid() = p_user_id`. Diese nicht als missing-guard klassifizieren, sondern als `admin_role_gated` markieren.
5. **Service-RPCs fuer Cron** (GRANT service_role only): kein Guard noetig. Audit muss Grants erkennen.
6. **Parameter-Namen-Varianten:** `p_user_id`, `p_target_user_id`, `p_owner_id`, `p_seller_id`, `p_buyer_id`, `p_voter_id`. Audit-RPC muss alle diese als User-Identity-Parameter klassifizieren. **NEIN**: `p_admin_id` ist bereits admin-role-gated-Context und braucht andere Semantik.
7. **RPCs mit mehreren User-Params:** z.B. `offer_create(p_seller_id, p_buyer_id)` — Guard muss auf den caller-matchen, das ist domain-spezifisch. In der Audit-Exception dokumentieren.
8. **Trigger-aufgerufene RPCs:** wenn Trigger die RPC als SECURITY DEFINER owner aufruft, `auth.uid()` ist NULL in System-Context. Guard `IS NOT NULL AND IS DISTINCT FROM` uebergeht NULL korrekt (Slice 005 Pattern) — Absicht.
9. **RPCs die auch von anon aufrufbar sind:** z.B. public-facing reads. Muessen entweder kein User-Param haben oder explizit dokumentiert sein.
10. **Race mit neuer RPC:** Wenn mitten im Audit neue RPC hinzukommt (sehr unwahrscheinlich, da single-dev), Audit muss das erkennen (snapshot-Ansatz).

## Proof-Plan

1. **Before-Audit (vor Fix):**
   - `mcp__supabase__execute_sql` auf neu erstellte Audit-RPC
   - Output nach `worklog/proofs/044-audit-before.txt`
   - Zeigt: N RPCs ohne Guard, davon X mit authenticated-Grant (= Exploit-Risk)
2. **After-Audit (nach Fix):**
   - Gleiche Query nach Migration
   - Output nach `worklog/proofs/044-audit-after.txt`
   - Zeigt: 0 RPCs mit authenticated-Grant + missing-guard (oder alle in explizit dokumentierter Allowlist)
3. **INV-31 Vitest-Output:**
   - `npx vitest run src/__tests__/db-invariants.test.ts` 
   - Output nach `worklog/proofs/044-inv31-vitest.txt`
   - INV-31 gruen
4. **Exploit-Test (optional-defensive):**
   - Vor Fix: mit authenticated-Token fremde `p_user_id` senden → RPC arbeitet
   - Nach Fix: gleiche Query → `auth_uid_mismatch` Error
   - Output nach `worklog/proofs/044-exploit-proof.txt`

## Scope-Out

- **ADMIN-Role-Audit:** Separater Slice 044b/xxx, falls gewuenscht. `is_admin(auth.uid())` Guards in admin_* RPCs auditieren. Jetzt nur klassifizieren, nicht fixen.
- **anon-Grant-Audit:** bereits J4 + Slice 005 abgedeckt. Hier nur nebenbei bestaetigen, nicht re-auditieren.
- **Trigger-Security-Audit:** wenn Trigger direkt Tabellen manipulieren (nicht ueber RPC), nicht Teil dieses Slice.
- **Client-seitige Sicherheit:** UI muss nach dem Fix noch funktionieren, aber Frontend-Changes sind hier ausgeschlossen (Guards sind backward-compatible fuer eigenen User).
- **RPCs ohne User-Identity-Parameter:** aus Audit-Scope raus (haben keine Exploit-Klasse).
- **MIGRATION fuer existing data:** Guards aendern nicht Daten, nur Zugriffe → kein Backfill-Script noetig.

## Unbekannte (zu klaeren waehrend IMPACT-Stage)

- Wie viele der ~124 SECURITY DEFINER RPCs haben tatsaechlich einen user-identity-Parameter? Schaetzung: 40-60. Exakter Count kommt aus IMPACT-Stage-Query.
- Gibt es RPCs mit user-identity-Parameter aber NICHT `p_user_id`-Namen die ich uebersehe? Audit-RPC sollte `pg_proc.proargnames` scannen mit Pattern-Match.
- Coexistieren Body-Guards mit bestehenden anderen Guards (z.B. role-check)? Muss kompatibel bleiben.

## Offene Design-Fragen

**Q1:** Allowlist-Format — inline in audit-RPC (SQL `CASE WHEN proname IN (...)` — schwerer zu pflegen) oder in separate Tabelle `auth_guard_exceptions(proname, reason)` (flexibler, aber mehr Schema)?
**Empfehlung:** Inline in audit-RPC via CASE-Expression, weil (a) seltene Aenderungen, (b) PR-review-freundlicher (diff sieht Aenderung direkt), (c) keine Daten-Migration.

**Q2:** Sollten bestehende Guards nachgerueftet werden mit einheitlicher Fehler-Nachricht `auth_uid_mismatch` (wie Slice 005) oder bestehende Formulierungen lassen?
**Empfehlung:** Vereinheitlichen auf `auth_uid_mismatch` — konsistente Client-Error-Handling.

**Q3:** INV-21 aus Slice 005 behalten oder durch INV-31 ersetzen?
**Empfehlung:** Behalten. INV-21 testet konkret die 4 RPCs mit explizitem Before/After-Verhalten. INV-31 ist die allgemeine Matrix. Zwei Schichten = besser.

---

**Ready fuer CEO-Approval:** JA (Security-Scope, Variante 2 bereits approved durch "arbeite variante 2")
**Ready fuer IMPACT-Stage:** JA nach Spec-Sign-Off

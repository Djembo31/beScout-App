# Review — Slice 347 (FRE-5: Club-konfigurierbare Fan-Rang-Schwellen)

**Reviewer:** reviewer-Agent (Cold-Context) · **Datum:** 2026-06-18 · **time-spent:** 14 min

## Verdict: PASS (2 MINOR — kein Merge-Blocker)

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MINOR | `set_club_fan_rank_thresholds` (Write-RPC-Gate) | Platform-Superadmin-Bypass fehlte. AdminContent.tsx:78-80 gibt `superadmin` synthetisch `admin_role='owner'` → UI zeigt Save-Button, RPC hätte aber `not_club_admin` geantwortet (UI-zeigt-Button-aber-RPC-rejected-Drift). Bounty-RPC-Muster hat `top_role='Admin'`-Bypass. | **GEFIXT** — `top_role='Admin'`-EXISTS-Branch ergänzt (Migration-File + Live re-applied `slice_347_fanrank_thresholds_admin_gate_fix`). |
| 2 | MINOR | `recalculateFanRank` Service (`fanRanking.ts:73-76`) | Pre-existing (nicht von 347): `recalculate*` schluckt RPC-error zu `{ok:false}` statt throw. 347 lässt es unangetastet (Surgical Changes). | Out-of-scope, Backlog-Notiz. |

## Fokus-Antworten (alle ✓)
1. **PATCH-AUDIT (D87):** Alle Live-Patches erhalten (Slice-345 Follow +5, fn_get_streak_elo_boost, SC-Score, csf_multiplier-Write, fan_rankings-UPSERT). Nur Tier-CASE variabel. Gegen pg_get_functiondef-Baseline gebaut, nicht stale 20260330-Datei.
2. **AR-44:** alle 3 RPCs REVOKE PUBLIC+anon / GRANT authenticated. Proof bestätigt anon kein Execute.
3. **RLS:** alle 4 Ops; SELECT offen, INSERT/UPDATE/DELETE client-blockiert (WITH CHECK/USING false). Kein silent write-fail.
4. **Write-RPC-Gate:** auth-Guard + Admin-Gate + strikte Validierung passend zum inklusiven CHECK (off-by-one-konsistent) + Discriminated-Union.
5. **Recalc:** fail-isoliert per row, zählt Erfolge. Synchron = bewusster Pilot-Trade-off (OQ1).
6. **Frontend-Drift:** kein FAN_RANK_TIERS-minScore-Read in Render-Pfaden mehr; Ranges via buildTierRanges(thresholds). getFanRankByScore-Removal vollständig.
7. **i18n:** 9 Keys in beiden Locales, korrekte Namespaces (adminFans/gamification/errors) — keine Slice-333-Falle. Kein raw-err-Leak. (TR-Strings: Anil-Review-pflichtig.)
8. **Default-Drift:** 10/25/40/55/70 an allen 4 Stellen konsistent (Tabellen-DEFAULT, Helper-COALESCE, calculate_fan_rank-COALESCE, Frontend-DEFAULT).

## Positive
PATCH-AUDIT vorbildlich (Live-Baseline + Post-Apply-grep im Proof). RLS-Schließung mustergültig. Frontend abwärtskompatibel (optionaler thresholds-Prop). Defensiver Service-Fallback bei unerwarteter RPC-Shape. Test deckt dynamische Schwellen + Default + Negativ-Assertions.

## Knowledge-Kandidaten
- errors-db.md: „Config-Wert steuert Geld-Tally → Recalc-on-Save im Write-RPC (fail-isolierte Schleife)" (verwandt D92/Slice 343).
- club-admin.md / errors-db.md: „UI-Gate vs. RPC-Gate-Drift bei Platform-Admin-Override" (Finding #1 generalisiert).

## Offen (post-Deploy)
AC9 (Leiter zeigt Club-Schwellen), AC10 (Admin-Save-Roundtrip Mobile 393px), AC11 (tsc+vitest) — Playwright gegen bescout.net nach Deploy.

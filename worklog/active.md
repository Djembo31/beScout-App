# Active Slice

```
status: in_progress
slice: 193
stage: SPEC
spec: inline (AutoResearch-Loop /optimize get_auth_state RPC)
impact: pending
proof: worklog/proofs/193-auth-state-perf.md (pending)
review: pending
```

## Spec (inline /optimize-Pattern)

**Problem (live verifiziert Slice 192):** `loadProfile RPC slow, using 3-query fallback: Error: Timeout` triggert wiederholt nach 10s. Verursacht Auth-Race -> Slice-192-Symptom (Ghost-Holdings).

**Metric:** P50 + P95 Latenz von `supabase.rpc('get_auth_state', { p_user_id })` measured Browser-side in `loadProfile` (`AuthProvider.tsx:164`).

**Baseline-Ziel:** P50 < 200ms, P95 < 1000ms (aktuell P95 > 10000ms = Timeout).

**Hypothesen:**
- H1: RPC-Body langsam (3 SELECTs auf profiles + platform_admins + club_admins JOIN clubs)
- H2: Vercel-Edge-Cold-Start + Supabase Pool-Saturation
- H3: JWT-Validation langsam (auth.uid() Lookup in SECURITY DEFINER context)
- H4: PostgREST Wrapper-Overhead bei SECURITY DEFINER (mehrere connection-checks)

**Plan:**
1. Baseline: Live-Test via MCP-Chrome, performance-trace + Network-Tab
2. EXPLAIN ANALYZE per direct SQL (nicht via auth.uid()-blocked RPC)
3. Verify H1-H4 mit Daten
4. Fix nach Datenlage:
   - H1 → Index oder Query-Vereinfachung
   - H2 → keine Code-Aenderung, dokumentieren als Infra-Issue
   - H3/H4 → Wrapper-Pattern reduzieren (z.B. profiles direkt SELECT mit RLS statt RPC)
5. Re-measure: P95 unter Ziel?

## Zuletzt

- **Slice 192** (2026-04-24) — Defensive Guard NULL-Player Holdings + Type-Truth-Fix (M, REWORK→PASS).
- **Slice 191** (2026-04-24) — Hygiene-Kombi H+G+C+I + Audit Bilder/Scouting/Form (XS-Kombi, PASS).
- **Slice 190** (2026-04-24) — CI-Check Cron-Route-Registry-Audit + D39 DISTILL.
- **Slice 189** (2026-04-24) — Ghost-Prevention Player-Insert-Trigger.
- **Slice 188** (2026-04-24) — CTO-Setup-Upgrade Meta-Sprint.

Offen (Backlog):
- **Holdings-RPC-Migration:** PostgREST nested-select → SECURITY DEFINER RPC
- **HomeDashboard filterValidHoldings Helper** (Slice 192 #2)
- **GTM-Push** (Anil-Entscheidung)
- **181g** JoinConfirmDialog Custom-DOM-Refactor
- **Research-Seed:** Bot-Posts fuer Scout-Consensus-UX
- **L5-Data-Drift:** 11% ohne perf_l5
- **Vercel Pro Restore** (CEO)

**Anil-Action-Items:**
- 3 Beta-Tester anrufen + Zoom-Calls
- Vercel-Plan-Entscheidung
- TR-Locale-Reviewer organisieren

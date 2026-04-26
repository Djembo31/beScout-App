# CTO Review: Slice 201b — Holders-Distribution-Aggregate-RPC + Mini-Bar

**Reviewer:** Cold-Context Opus reviewer-Agent
**Date:** 2026-04-26
**Time-spent:** 8 minutes
**Verdict:** **PASS** (3 cosmetic NITs, kein REWORK)

---

## Findings (3, alle NIT — kosmetisch)

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `wallet.ts getPlayerHoldersConcentration` | `logSilentCatch` + `throw` ist ungewöhnliche Kombi — Sentry-Breadcrumb + React-Query-Retry + Component-Toast könnten triple-loggen. Andere Services im File werfen direkt ohne logSilentCatch. | Defensive Observability OK — akzeptiert. |
| 2 | NIT | `ConcentrationBar.tsx` + `TransferListSection.tsx` | `defaultMessage` auf Keys die in beiden Locales existieren (`concentrationLoading`, `concentrationIntro`) — Pattern-Inkonsistenz. | **INLINE-GEHEALT:** defaultMessage entfernt für beide Stellen. |
| 3 | NIT | `TransferListSection.tsx:319` | Backslash vor Komment-Stern war Display-Artefakt (User-confirmed tsc clean). | Kein real Issue. |

---

## Pattern-Konsistenz vs `get_player_holder_count` Blueprint

- ✅ SECURITY DEFINER + STABLE + `SET search_path TO 'public', 'pg_catalog'`
- ✅ AR-44 REVOKE PUBLIC + REVOKE anon + GRANT authenticated + GRANT service_role
- ✅ `auth.uid() IS NULL` Guard (anon blocked at body level)
- ✅ Anonymized output — kein `user_id`, kein `handle` (nur Aggregat-Counts)
- ✅ COMMENT ON FUNCTION mit Slice-Ref + Pattern-Begründung
- ✅ Bypass holdings-RLS analog Slice 014
- 🔵 **Plus:** Discriminated-Union return-shape `{success, ...}` — sauberer als Blueprint (Blueprint returnt nackten INT, kein discriminator). Slice 201b ist hier moderner.

---

## Money-Path

- ✅ Read-only auf `holdings` (nur SELECT, kein INSERT/UPDATE/DELETE)
- ✅ Kein Wallet-Touch, kein Trade-Trigger, keine Fee-Berechnung
- ✅ Nicht CEO-Scope (anonymized aggregate, kein Money-Path)
- ✅ Kein Idempotency-Key nötig (read-only RPC)
- ✅ Append-only Invariants nicht betroffen

---

## D48-Audit-Stale-Check

- ✅ Pre-existing-Check durchgeführt: `get_player_holder_count` (Slice 014) macht nur `COUNT(DISTINCT user_id)` — KEIN top-N-aggregate, KEIN supply-sum.
- ✅ Kein Duplicate — `get_player_holders_concentration` ist klar separater Use-Case (Top-10-Konzentration).
- ✅ Kein parallel BE+FE-Worktree-Risk (D46) — single-Slice, single-Service-File.
- ✅ Component nutzt Service via Hook, nicht direkt Supabase-Call.

---

## Spec-Coverage

- ✅ AC1 tsc clean
- ✅ AC2 Migration LIVE applied
- ✅ AC3 RPC mit AR-44 vorhanden
- ✅ AC4 0-Holders-Edge: returnt `{total_holders:0, top_10_pct:0}`
- ✅ AC5 Service + Hook + Component existieren
- ✅ AC6 Mini-Bar rendert (Color-Coding + ARIA progressbar)
- ✅ AC7 i18n DE+TR symmetrisch (5 Keys beide Locales)
- ✅ AC8 Verdict != FAIL

---

## Positive

- Discriminated-Union return-shape vorbildlich (besser als Blueprint).
- Lazy-load via `enabled`-Flag verhindert N+1 (Caller setzt `enabled` nur in expanded-Card).
- ARIA-vollständig (`role="progressbar"`, `aria-valuenow/min/max`, `aria-label`, `aria-busy`).
- Color-Coding semantisch (orange/amber/emerald für illiquid/medium/liquid) + `motion-reduce:animate-none`.
- Skeleton während Load + early-return bei 0 Holders (kein Empty-State-Crash).
- DB-Verify gegen echten Player (20/72/86.1%) zeigt RPC funktioniert.

---

## Learnings für Knowledge Capture

- **Pattern bestätigt:** Anonymized-Aggregate-RPC-Reihe wächst (jetzt 2 RPCs: `get_player_holder_count` + `get_player_holders_concentration`). Kandidat für expliziten Pattern-Eintrag in `memory/patterns.md` als "Anonymized RLS-Bypass Aggregate".
- **Discriminated-Union > naked-return:** Slice 201b nutzt `{success, ...}` Discriminator obwohl Blueprint nackten INT returnt. Bestätigt Slice 168 als kanonischen Standard für neue Aggregat-RPCs.

---

## Summary

Sauberer Slice nach Blueprint-Pattern, AR-44/D48/Money-Path alle grün. Keine REWORK-Issues, nur 3 cosmetic Nits (1 inline-gehealt, 2 akzeptiert/Artefakt). Lazy-load + Anonymisierung + Color-Coding entsprechen Sorare-Standard.

**Verdict: PASS.** Commit-ready.

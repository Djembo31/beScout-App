# Slice 394 — AuthProvider Profile-Load-Failure Observability

**Slice-Type:** UI (Provider) / Observability
**Größe:** XS

## 1. Problem-Statement
Gebündelter E-3-Playwright (2026-06-26) zeigte im kumulativen Console-Scan **7× `[AuthProvider] Profile load failed after retry`** (Finding #2). Diagnose (faktenbasiert):
- ali-Profil-Row valide + vollständig (DB-Query).
- `get_auth_state('ali')` läuft in **62ms**, gesund (EXPLAIN ANALYZE mit JWT-Impersonation).
- Ursache = bekannte **JWT-Hydration-Race** beim Kalt-Load (Cookie-Resume; im Code Z.176-182 dokumentiert: Mobile-Safari SDK-Warmup). Primäre RPC wirft `auth_uid_mismatch` wenn `auth.uid()` noch null → Fallback hängt an derselben Session → 2s-Retry heilt meist, sonst LS-Cache (graceful).
- **Kein Daten-Defekt, nicht ali-spezifisch.** In meiner Headless-Session durch schnelle Reloads verstärkt.

**Der eigentliche Mangel:** Der finale Failure-Pfad (`AuthProvider.tsx:245`) ist **console-only** → Sentry hat 0 Instanzen (`Profile load failed`/`auth_uid_mismatch` Sentry-Suche leer). Wir sind **blind für die echte Nutzer-Häufigkeit** und können nicht entscheiden, ob ein tieferer Auth-Fix nötig ist.

## 2. Lösungs-Design
Den finalen Failure-Pfad mit `captureMessage('auth.profileLoadFailedAfterRetry', 'error', { feature:'auth', userId, extra:{ isRefresh, hadCachedProfile } })` instrumentieren (etablierter Helfer `@/lib/observability/captureError`). **Bewusst NICHT:** die Auth/RLS/Race-Logik anfassen — money-naher Pfad, „caution over speed", erst Daten sammeln. Wenn Sentry echte Frequenz zeigt → eigener fundierter Fix-Slice (z.B. `get_auth_state` soft-null-uid statt RAISE, oder Fallback ohne JWT-Abhängigkeit).

## 3. Betroffene Files
- `src/components/providers/AuthProvider.tsx` — 1 Import + 1 captureMessage am Failure-Pfad (Z.245).

## 4. Code-Reading-Liste (erledigt)
1. `AuthProvider.tsx:156-247` — loadProfile-Kaskade (primär RPC → 3-Query-Fallback → 2s-Retry → final fail). ✓
2. `src/lib/services/auth-state.ts` — `get_auth_state`-RPC + Guard. ✓
3. `src/lib/observability/captureError.ts:72-90` — `captureMessage`-Signatur (message, level, ctx{feature,userId,extra}). ✓
4. DB live: ali-Row valide, RPC 62ms. ✓

## 5. Pattern-References
- `pattern_observability_stack.md` (3-Tier Silent-Fail). `QueryProvider.tsx` nutzt bereits `captureException`.

## 6. Acceptance Criteria
- AC1: Failure-Pfad ruft `captureMessage` mit `feature:'auth'` + `userId` + Kontext. VERIFY: grep.
- AC2: `console.error` bleibt erhalten (Dev-Sichtbarkeit). VERIFY: grep.
- AC3: KEINE Änderung an der Auth/Race/RLS-Logik (nur additive Observability). VERIFY: git diff.
- AC4: `tsc --noEmit` clean.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Sentry in dev disabled | captureMessage = no-op (config production-only) — kein Dev-Noise |
| _isRefresh=true | Kontext-Flag mitgegeben → unterscheidet Initial-Load vs. Refresh |
| Kein LS-Cache | hadCachedProfile=false → zeigt echten „Nutzer sieht nichts"-Fall |

## 8. Self-Verification
- `grep captureMessage src/components/providers/AuthProvider.tsx`
- `npx tsc --noEmit`

## 10. Proof-Plan
`worklog/proofs/394-observability.txt` — grep (Import + Call) + tsc-clean + git diff --stat (nur additive Zeilen).

## 11. Scope-Out
Tieferer Auth-Fix (get_auth_state null-uid-Handling, JWT-unabhängiger Fallback) = eigener Slice NACH Sentry-Daten. Keine Race-/RLS-Logik-Änderung hier.

## 12. Stage-Chain
SPEC → IMPACT (inline) → BUILD → REVIEW → PROVE → LOG

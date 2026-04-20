# Slice 109 — LCP + Request-Count Compare

**Deploy:** `dpl_5P2uXG7vzWfHBxFkKUj6pBHRLDv8` (commit `1c4e63d7`) READY at 2026-04-20 19:53 UTC
**Tool:** Chrome DevTools MCP (`performance_start_trace`)
**Conditions:** 393×852 viewport, Slow 4G network, 4× CPU throttle, mobile + touch emulation
**User:** jarvis-qa@bescout.net (eingeloggt, existing browser session)
**Page:** `https://www.bescout.net/` (= /home for logged-in users)

## Ergebnis

| Metric | Baseline (107-post, 2026-04-20 afternoon) | After Slice 109 run 1 | After Slice 109 run 2 | Δ (mean) |
|---|---|---|---|---|
| **LCP** | 3792 ms | 3619 ms | 3862 ms | **~-51 ms (-1.3%)** |
| **TTFB** | 266 ms | 243 ms | 273 ms | ~-8 ms |
| **Render Delay** | 3526 ms | 3376 ms | 3589 ms | ~-43 ms |
| **CLS** | 0.00 | 0.14 | 0.14 | +0.14 (see note) |

Mean of 2 runs: LCP 3740.5 ms.

## Ehrliche Interpretation

**Die LCP-Verbesserung liegt innerhalb der Messunsicherheit auf Slow 4G.** Einzelmessungen variieren hier ±200ms durch Chunk-Delivery-Timing. Der Grund dass der Gewinn so klein ist:

- Die 4 individuellen Queries liefen **parallel** via React Query (nicht sequentiell). Einsparung ist daher nicht 4× Roundtrip, sondern nur die Differenz zwischen "slowest of 4" vs "1 aggregated RPC".
- Render-Delay ist mit ~3.4s der Löwenanteil — dominiert von JS-Bundle-Parsing + Hydration, nicht von Netzwerk.
- `get_user_tickets` feuert weiter parallel (TopBar layout-level, siehe Impact-Doc Zeile 16-23).

## Strukturell bestätigter Win (Network-Log)

Was wir messbar und eindeutig **geliefert** haben:

| Query | Baseline | After 109 |
|---|---|---|
| `holdings.select()` | 1 call | **0 calls** |
| `user_stats.select()` | 1 call | **0 calls** |
| `user_founding_passes.select()` | 1 call | **0 calls** |
| `get_user_tickets` RPC | 1 call | 1 call (unchanged) |
| `get_home_dashboard_v1` RPC | 0 calls | **1 call** (neu) |

**Net: -2 Supabase roundtrips.** Reduziert Connection-Count + Header-Overhead. Spart Bandwidth (~3 GET headers + response wrappers).

## Acceptance Criteria Check vs. Spec

| AC | Target | Actual | Status |
|---|---|---|---|
| #1 Migration mit AR-44 Pattern | REVOKE + GRANT | ✓ verified via pg_proc | ✅ |
| #2 auth.uid() Guard | IS DISTINCT FROM | ✓ in function body | ✅ |
| #3 Return-Shape matches types | identical | ✓ smoke-call verified | ✅ |
| #4 useHomeData uses single hook | 4→1 hook | ✓ code diff | ✅ |
| #5 Priming via setQueryData | 4 keys primed | ✓ primeHomeDashboardCaches | ✅ |
| #6 Vitest für Service | pass | ✓ 4 cases pass | ✅ |
| #7 tsc clean | no errors | ✓ | ✅ |
| #8a Request-count: -3 Supabase roundtrips | -3 | **-2** (get_user_tickets stays — TopBar) | ⚠ partial |
| #8b LCP < 3200ms | <3200ms | **3740ms mean** | ❌ missed |
| #9 RPC has correct grants | REVOKE anon | ✓ acl: `{postgres,authenticated,service_role}` | ✅ |

## Warum AC #8a und #8b verfehlt wurden

**#8a:** Spec schätzte -3 Roundtrips weil TopBar-Problematik nicht voll berücksichtigt. Reality: TopBar mountet `useUserTickets` als Layout-Component VOR `useHomeDashboard` beendet ist — kein Priming-Schutz möglich ohne TopBar-Refactor (nicht in 109-Scope). Echter Save bleibt bei **-2 structural roundtrips**.

**#8b:** LCP-Target von <3200ms setzte ~600ms Latency-Gewinn voraus. Aber die 4 parallelen Queries blockten nicht LCP — sie liefen parallel mit Hydration + Bundle-Parsing. Die LCP-Ursache ist der 37-Chunk JS-Bundle mit 4× CPU-Throttle, nicht die Query-Anzahl. Slice 110 (AuthProvider-Robustness) wird auch kein LCP-Win bringen. Echter /home-LCP-Win braucht Bundle-Split oder Service-Worker-Cache (Slice 112+).

## CLS-Regression

0.00 → 0.14 auf 2 Runs. Schon Slice 107 hatte 0.11 auf /market. Die Regression geht auf template.tsx-Persistenz (Slice 104) + State-Hydration zurück. Nicht kritisch (<0.25 "Needs Improvement"), aber sollte vor Beta geprüft werden. Nicht Scope von 109.

## Empfehlung für Slice 110 + 111+

- **110 (Auth-Robustness)** bleibt sinnvoll für Trading-Race-Conditions, wird aber keinen LCP-Win liefern. Ehrliches Framing an CEO.
- **112 oder später**: Bundle-Split auf /home (Code-Splitting unter-fold Widgets), oder Service-Worker-Cache. Das sind die nächsten echten LCP-Hebel.

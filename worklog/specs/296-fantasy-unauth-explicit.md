# Slice 296 — Fantasy Unauth State Explicit + Test (S3 F-3)

**Slice-Type:** Tool (vitest) + Doc (1-Kommentar in Component)
**Größe:** S
**Status:** SPEC

## 1. Problem-Statement

S3 Page Contract Audit (Slice 292) F-3 (P2): `FantasyContent` gated alle 4 Main-Tab-Bodies mit `&& user` (`page.tsx:238/253/261/273`). Wenn der App-Shell je einen unauth User durchließe, würde die Page Header/Disclaimer/Nav rendern, aber **keinen Primary-Body** — ein impliziter, untestbarer Zustand. Audit: „Product-wise, that should be explicit."

Evidence: `worklog/audits/2026-06-13/page-contract-fantasy-club.md` F-3.

## 2. Lösungs-Design — Decision

**Entscheidung (CTO, Auth-UX-Konsistenz):** **Strikt auf `AuthGuard` verlassen.** Kein page-local Sign-In-CTA.

Begründung (code-verifiziert):
- `src/app/(app)/layout.tsx:7` wrappt ALLE `(app)`-Children in `<AuthGuard>`.
- `AuthGuard` (`src/components/providers/AuthGuard.tsx:30-32`): `if (!user) router.replace('/login')` + rendert `ContentSkeleton` bis Redirect greift. `FantasyContent` erreicht einen `!user`-State im Produktiv-Pfad also nie.
- Ein zweiter, page-local Sign-In-CTA wäre ein **divergenter Auth-UX-Pfad** → Drift-Risiko (zwei Quellen der Wahrheit für „logged out"). Single-Source = AuthGuard.
- Die `&& user`-Guards sind damit korrekte **defensive Null-Safety** (Belt-and-suspenders), kein Bug.

**Deliverable:** Implizit → explizit machen, ohne Behavior-Change:
1. Knapper Doku-Kommentar in `FantasyContent.tsx` vor den Tab-Gates — dokumentiert WARUM `&& user` existiert (AuthGuard = Auth-Enforcement, hier nur defensiv) und dass bewusst KEIN page-local CTA.
2. Test der den expliziten Unauth-Contract lockt: bei `user=null` rendert Shell (Header/Nav/Disclaimer), aber KEIN Tab-Body.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/app/(app)/fantasy/FantasyContent.tsx` | +Kommentar-Block vor Tab-Gates (kein Logik-Change) |
| `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` | Auth-Mock → mutable `mockAuthState`; `beforeEach`-Reset auf authed; +`describe('unauth contract')` (2-3 Tests) |

## 4. Code-Reading-Liste (vor Implementation — erledigt)

| File | Befund |
|------|--------|
| `FantasyContent.tsx:195-290` | Shell: FantasyHeader/NewUserTip/MissionHintList/ScoringRules/FantasyDisclaimer/LeagueScopeHeader/FantasyNav (unconditional). Body: 4× `mainTab===X && user` (SpieltagTab/EventsTab/MitmachenTab/ErgebnisseTab) |
| `layout.tsx:7,~90` | Children in `<AuthGuard>` gewrappt |
| `AuthGuard.tsx:30-66` | `!user`→`router.replace('/login')`+ContentSkeleton; nur bei `user` (+profile/profileLoading) rendern children |
| `FantasyContent.test.tsx:11-24` | Static `mockUser`/`mockProfile` → useUser-Mock; `mockUser`/`mockProfile` NUR im Mock-Factory referenziert (safe-to-refactor) |
| `FantasyContent.test.tsx:501-548` | `beforeEach(vi.clearAllMocks)`; default-tab `paarungen` → `spieltag-tab` testid; Shell-testids `fantasy-header`/`fantasy-nav`/`scoring-rules` |

## 5. Pattern-References

- `testing.md` Pattern 5 (`vi.hoisted` shared-mock) — Auth-Mock mutable machen ohne resetModules.
- `testing.md` Anti-Pattern SO-3 — kein dynamic-import-pro-Test; static imports + mutable mock-state + `beforeEach`-Reset.
- Slice 295 `ClubsDiscoveryPage.test.tsx` — `vi.hoisted`-mutable-`h`-State-Konvention (frisch etabliert).
- `errors-frontend.md` „Defensive null-strict-equality" (Slice 265) — Pattern-Familie „defensive UI gegen unbekannten/fehlenden State".

## 6. Acceptance Criteria

| # | Kriterium | VERIFY |
|---|-----------|--------|
| AC-1 | Bestehende FantasyContent-Tests bleiben grün (beforeEach resettet auf authed) | `pnpm exec vitest run FantasyContent.test.tsx` alle grün |
| AC-2 | Unauth (`user=null`): Shell rendert — `fantasy-header` + `fantasy-nav` + `scoring-rules` present | dito |
| AC-3 | Unauth: KEIN Tab-Body — `spieltag-tab` (default-tab paarungen) absent | dito |
| AC-4 | Unauth: FantasyDisclaimer (Compliance) bleibt sichtbar (real, nicht gemockt) | dito |
| AC-5 | tsc clean | `pnpm exec tsc --noEmit` EXIT 0 |
| AC-6 | FantasyContent.tsx Kommentar dokumentiert AuthGuard-Verlass + kein-CTA-Decision | grep |

## 7. Edge Cases

| Case | Erwartung |
|------|-----------|
| user=null + mainTab=events | EventsTab-Body ebenfalls absent (alle 4 Gates `&& user`) — 1 Default-Tab-Test reicht (paarungen), Gate-Pattern identisch |
| profileLoading-Fall-through (AuthGuard case 3) | OUT-OF-SCOPE — dort ist `user` truthy; FantasyContent kriegt nie `!user` mit profile-Race |
| Mutable mock leak zwischen Tests | `beforeEach` setzt `mockAuthState` zurück auf authed-default |
| Andere Tests die `mockUser` lesen | Keine — grep bestätigt nur Factory-Referenz |

## 8. Self-Verification

```bash
pnpm exec vitest run "src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx"
pnpm exec tsc --noEmit
grep -n "AuthGuard" "src/app/(app)/fantasy/FantasyContent.tsx"
```

## 9. Open-Questions

- **Pflicht-Klärung:** keine — Decision (kein CTA, rely-on-AuthGuard) ist Auth-UX-Architektur (CTO-Zone), kein Money/Wording/Security.
- **Autonom-Zone:** Mock-Refactor-Form (mutable object vs hoisted), Anzahl Unauth-Tests, Kommentar-Wording.

## 10. Proof-Plan

`worklog/proofs/296-fantasy-unauth.txt` — vitest-Output (alle FantasyContent-Tests grün inkl. neue unauth), tsc EXIT 0, grep auf Kommentar.

## 11. Scope-Out

- Kein page-local Sign-In-CTA (bewusste Decision).
- Kein Logik-Change an `&& user`-Gates (bleiben defensiv).
- Kein E2E (AuthGuard-Redirect ist eigener Contract, Slice-293-Blueprint separat).
- Kein Refactor der 4 Gates zu einem einzelnen `user &&`-Wrapper (out-of-scope, behavior-identisch, Diff-Noise).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped — Component-Kommentar + Test, kein Service/RPC/Schema/Query-Key) → BUILD → REVIEW (reviewer-Agent) → PROVE → LOG.

## 13. Pre-Mortem (S — kurz)

1. Mutable Auth-Mock bricht bestehende 30+ Tests → `beforeEach` MUSS auf authed-default resetten VOR jedem Test (auch die alten).
2. `mockAuthState` mock-prefix-Regel (vitest factory-closure) → Variablenname mit `mock`-Präfix.
3. Unauth-Test sieht doch Body → falls SpieltagTab nicht `&& user`-gated wäre; code-verifiziert ist es (Z.238).
4. FantasyDisclaimer real-render bricht in jsdom → bereits real in bestehenden Tests, kein neuer Mock nötig.
5. Kommentar-only-Edit triggert ship-spec-gate → FantasyContent ist `src/app/`, nicht in gated-Pfaden; aktiver Slice ohnehin gesetzt.

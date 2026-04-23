# Slice 170 Review — Singleton→useQueryClient Migration

- **Verdict:** PASS (mit 1 MEDIUM Code-Hygiene-Nit — M1 im Build-Fix integriert)
- **Reviewer:** Cold-Context-Agent (Opus 4.7)
- **Time spent:** 18 minutes
- **Slice-Groesse-Bewertung:** XS passt korrekt. 3 Production-Files + 1 Test-File, Pattern-bekannt aus Slice 163, reine Konvention-Migration ohne Runtime-Impact. tsc clean, alle 76 Tests grün, Proof-Artefakte vollständig. Kein funktionaler Change, Scope sauber abgegrenzt (Scope-Out in Spec explizit dokumentiert). S-Upgrade wäre Over-Engineering.

## Findings

### HIGH
_(Keine.)_

Die initiale Vermutung "useCallback ohne queryClient in deps-array" wurde bei genauerer Analyse entschärft:
- `useCommunityActions.ts` hat 9 useCallbacks die `queryClient.invalidateQueries/setQueryData` nutzen, aber `queryClient` nicht in deps haben (Z.116, 133, 155, 178, 243, 297, 313, 325, 361).
- ABER: `useQueryClient()` returned die gleiche stable Instance solange der QueryClientProvider sich nicht ändert (React Query v5 Garantie). Der reale Runtime-Impact ist Zero Stale-Closure-Risk.
- Counter-Reference: `usePlayerCommunity.ts` HAT `queryClient` in deps (Z.58, 98, 110, 122) — das ist die exhaustive-deps-konforme Variante und das etablierte Pattern im Codebase.
- Warum nicht HIGH/REWORK: Project-ESLint (`next/core-web-vitals`) aktiviert `react-hooks/exhaustive-deps` als `warn`, nicht `error` — CI bricht nicht. Memory/patterns.md #28 sagt zudem explizit "Singleton queryClient ist nicht verboten (same instance, funktional identisch)". Die Migration ist Konvention-Polish, nicht Bug-Fix.

### MEDIUM

**M1 — exhaustive-deps drift in useCommunityActions.ts (9 useCallbacks)**
- **Location:** `src/components/community/hooks/useCommunityActions.ts` Z.116, 133, 155, 178, 243, 297, 313, 325, 361
- **Issue:** Nach Migration auf `useQueryClient()`-Hook wird `queryClient` zur Hook-lokalen Variable (Z.35), die rein-theoretisch zwischen renders wechseln kann (React-19 Concurrent-Mode, Provider-Swap). 9 useCallbacks haben `queryClient.*` im Body aber `queryClient` nicht in deps. eslint-plugin-react-hooks würde `React Hook useCallback has a missing dependency: 'queryClient'` warnen.
- **Gegenargument:** Sister-Hook `usePlayerCommunity.ts` hat `queryClient` konsequent in deps — Konvention-Drift gegen bereits gelebte Norm.
- **Fix-Plan (eingebaut Slice 170 vor commit):** `queryClient` in 9 deps-Arrays ergänzen.
- **Runtime-Impact:** Null (queryClient ist stable). Aber Konvention-Drift zum Sister-Hook. Lohnt Nachjustage vor Commit.

### LOW / NIT

**N1 — LeaguesSection: 3× identische useQueryClient()-Calls (correct-as-designed)**
- Location: Z.25 (CreateLeagueModal), Z.98 (JoinLeagueModal), Z.156 (LeagueCard)
- Observation: Pro Component eigener Hook-Call. Nicht falsch — jede Component ist separate Render-Unit, Hook-Call muss in eigener Component-Body stehen. Ist Soll-Zustand. Keine Action.

**N2 — MissionBanner useSafeMutation-config captures queryClient ohne explicit dep**
- Location: Z.82-117 (claimMut)
- Observation: `useSafeMutation({...})` config-callbacks (onSuccess, onError, mutationFn) sind keine useCallback und brauchen keine deps — closures werden pro Render neu erzeugt, stets mit aktuellem queryClient. Kein Handlungsbedarf.

**N3 — Test-File: vi.hoisted-Pattern gut dokumentiert, aber nicht in testing.md kodifiziert**
- Location: `useCommunityActions.test.ts` Z.43-54
- Observation: Das `vi.hoisted` + partial-`@tanstack/react-query`-Mock-Pattern ist wertvoll für zukünftige Test-Migrationen. Ist als Inline-Kommentar dokumentiert, sollte in `.claude/rules/testing.md` Section "useSafeMutation Test-Patterns" als 5. Pattern eingehen.
- Action: Nicht blockierend für Commit. Folge-Aufgabe fuer Knowledge-Capture-Slice 171.

## Scope-Gap-Check (D26)

**18 weitere Singleton-Usages im Codebase (`grep -rn "from '@/lib/queryClient'"`):**

- **Legitim / NICHT-migrierbar (2):** `QueryProvider.tsx`, `AuthProvider.tsx` — initialisieren das Singleton für den Provider. Muessen Singleton bleiben.
- **Non-Component Utility-Files (5):** `src/lib/queries/invalidation.ts`, `homeDashboard.ts`, `marketDashboard.ts`, `src/features/fantasy/queries/invalidation.ts`, `src/app/(app)/hooks/useHomeData.ts` — Utility-Funktionen, kein Component-Body → `useQueryClient()`-Hook geht nicht, Singleton korrekt.
- **Component/Page-Kandidaten (11):** `useWatchlistActions.ts`, `WatchlistView.tsx`, `MarketContent.tsx`, `useGameweek.ts`, `MembershipSection.tsx`, plus 6 page-Files (`app/(app)/**/page.tsx`, `ClubContent.tsx`). Diese wären echte Migrations-Kandidaten für Slice 170b.

**Scope-Out-Bewertung:** Die Spec nennt explizit "Andere Singleton-Usages — werden bewusst gelassen" und verweist auf "Slice 170b wenn ueberhaupt". Das ist disziplinierte Scope-Kontrolle, nicht Scope-Gap. XS-Slice korrekt gescopt.

**Andere Ferrari-Erben-Kandidaten:** `MembershipSection.tsx` (Slice 151c D18-Pilot) — aus identischem Migrations-Zug wie 161/162. Echter Kandidat für Slice 170b.

**Empfehlung:** Slice 170b als Backlog-Item vormerken (11 Component-Kandidaten). Nicht jetzt einbauen.

## Reviewer-Meta

- **PASS-Kriterien erfüllt?** JA.
  - tsc clean (proof `170-tsc.txt`)
  - 76/76 Tests grün (proof `170-vitest.txt`)
  - Grep-Verify 0 Treffer in 3 Ziel-Files (proof `170-grep.txt`)
  - Spec-Acceptance-Criteria 1-8 alle erfüllt
  - Zero-Functional-Change (Rueckwaerts-Kompatibilitaet per Spec-Section)
  - Mock-Pattern (`vi.hoisted`) sauber gelöst + kommentiert
- **FAIL-Risk:** Keins. Runtime-Behavior identisch.
- **M1-Fix-Entscheidung:** eingebaut vor Commit (konsequente Konvention-Migration, 2-Minuten-Fix).

## Positive

1. **Spec-Disziplin mustergültig:** Scope-Out explizit, Edge-Cases enumeriert (7), Fix-Pattern für Tests präzise vorgegeben → Implementation deckungsgleich.
2. **Test-Mock-Lösung elegant:** `vi.hoisted` shared-`mockQc` pattern löst das "Cannot access before initialization"-Problem sauber.
3. **Zero Functional-Change garantiert:** Spec-Section "Rueckwaerts-Kompatibilitaet" dokumentiert explizit dass Singleton und Hook identische Instance liefern.
4. **Proof-Artefakte strukturiert:** 3 getrennte Proof-Dateien (tsc + vitest + grep) statt monolithic blob.

## Learnings fuer Knowledge Capture (Slice 171-Kandidat)

1. **`useQueryClient()` Migration erfordert queryClient-in-deps-Update** — Kandidat für `.claude/rules/common-errors.md` §5:
   ```
   **Singleton→useQueryClient() Migration — exhaustive-deps-Trap**
   - Vor Migration: `import { queryClient } from '@/lib/queryClient'` = Module-Import, NIE in useCallback-deps noetig.
   - Nach Migration: `const queryClient = useQueryClient()` = Hook-local, MUSS in deps aller useCallbacks die es lesen.
   - Runtime-Impact meist Null (stable instance), aber Konvention-Drift + ESLint-warn bei strict.
   - Audit: `grep "queryClient\." <file>` → jede useCallback/useMemo nach Migration prüfen.
   ```
2. **Test-Mock-Pattern `vi.hoisted` für shared-reference** — sollte in `.claude/rules/testing.md` Section "useSafeMutation Test-Patterns" als 5. Pattern aufgenommen werden.

## Summary

Saubere XS-Konvention-Migration mit vollstaendigen Proofs und Tests grün. Einziger Finding (M1) ist exhaustive-deps Drift in 9 useCallbacks — Runtime-Impact Null, aber Konvention-Konsistenz zum Sister-Hook `usePlayerCommunity.ts` fehlt. **M1-Fix wird vor Commit eingebaut**. Scope-Gap-Check: 11 weitere Singleton-Kandidaten im Codebase — korrekt als Scope-Out für Slice 170b dokumentiert.

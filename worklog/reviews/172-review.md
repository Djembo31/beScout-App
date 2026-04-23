# Slice 172 Review — Singleton 170b Sweep (11 Component/Hook-Files)

- **Verdict:** PASS (N1 NIT in-slice gefixt)
- **Reviewer:** Cold-Context-Agent (Opus 4.7)
- **Time spent:** 22 minutes
- **Slice-Groesse-Bewertung:** S passt korrekt. 11 Production-Files + 2 Test-Files. Pattern-bekannt aus Slice 170/171 Codification. Anwendung ohne Runtime-Change. Deckt explizit den Backlog-Item aus `active.md` ab.

## Spec-Coverage

| AC | Umgesetzt | Evidenz |
|----|-----------|---------|
| AC1 — Singleton-Import entfernt | YES | `172-grep.txt` 0 Treffer |
| AC2 — useQueryClient-Import ergaenzt | YES | 11 Files |
| AC3 — Hook-Call im Body | YES | 11/11 Hook-Calls exakt platziert |
| AC4 — Exhaustive-Deps-Konsistenz | YES | 9 useCallback/useEffect deps aktualisiert |
| AC5 — tsc clean | YES | `172-tsc.txt` |
| AC6 — Tests gruen | YES | 46/46 (`172-vitest.txt`) |
| AC7 — 0 Singleton-Imports in Zielfiles | YES | `172-grep.txt` |

## Findings

### HIGH
_(Keine.)_

### MEDIUM
_(Keine.)_

### LOW / NIT

**N1 — Dead-Code Mock in useHomeData.test.ts (IN-SLICE GEFIXT)**
- Location: `src/app/(app)/hooks/__tests__/useHomeData.test.ts` Z.131-133 (pre-fix)
- Issue: `vi.mock('@/lib/queryClient', ...)` ist pre-Slice-172-Leftover. `useHomeData.ts` importiert `@/lib/queryClient` nicht mehr. useQueryClient wird jetzt via `vi.hoisted(mockQc)` gemockt. Alter Mock = dead-code.
- Fix: Dead-Code-Block Z.131-133 entfernt. 46/46 Tests bleiben gruen.

**N2 — Inkonsistenz Mock-Pattern zwischen MembershipSection + useHomeData (nicht kritisch)**
- Location: `MembershipSection.test.tsx` Z.60-66 (beide Pfade gemockt) vs. `useHomeData.test.ts` (nur Hook-Pfad, nach N1-Fix sauber)
- Observation: MembershipSection mockt Legacy-Pfad noch defensiv. useHomeData jetzt minimal. Beide funktional aequivalent.
- Action: Optional codifizieren in testing.md §5 als "empfohlener Ziel-Pattern nach Production-Migration". Keine Commit-Blockade.

**N3 — handleOpenMysteryBox Duplicate zwischen useHomeData + missions/page (pre-existing, out-of-scope)**
- Location: `useHomeData.ts` Z.197-240 vs. `missions/page.tsx` Z.119-158
- Observation: Beide Handler sind identisch. Nach Slice 172 haben beide `queryClient` korrekt in deps.
- Action: Out-of-scope. Separater Refactor-Slice optional (extract zu shared hook `useOpenMysteryBoxAction`).

## Detail-Check: Deps-Array-Konsistenz

**9 useCallback/useEffect mit queryClient.* — alle deps korrekt:**

| File | Line | Hook | Deps | Status |
|------|------|------|------|--------|
| `useWatchlistActions.ts` | 49 | `toggleWatch` | `[userId, watchlistMap, addToast, queryClient, t]` | OK |
| `useWatchlistActions.ts` | 61 | migrate useEffect | `[userId, queryClient]` | OK |
| `WatchlistView.tsx` | 194 | `handleRemove` | `[user, addToast, queryClient, t]` | OK |
| `WatchlistView.tsx` | 215 | `handleThresholdChange` | `[user, addToast, queryClient, t]` | OK |
| `useGameweek.ts` | 38 | pageshow useEffect | `[setSelectedGameweek, queryClient]` | OK |
| `useHomeData.ts` | 239 | `handleOpenMysteryBox` | `[uid, streakBenefits.mysteryBoxTicketDiscount, queryClient]` | OK |
| `missions/page.tsx` | 116 | `handleChallengeSubmit` | `[uid, queryClient]` | OK |
| `missions/page.tsx` | 157 | `handleOpenMysteryBox` | `[uid, streakBenefits.mysteryBoxTicketDiscount, queryClient]` | OK |
| `MembershipSection.tsx` | 78 | `handleSubscribe` | `[userId, subscribeMut]` | OK (queryClient nur in mutation-config, nicht im callback-body) |

**Inline-Arrow-Cases (nicht deps-kritisch) — alle korrekt in JSX, kein useCallback:**
- `MarketContent.tsx` Z.122 ErrorState onRetry
- `ClubContent.tsx` Z.162+163 + Z.369 ErrorState/onSubscribed
- `community/page.tsx` Z.230 ErrorState onRetry
- `(app)/page.tsx` Z.97 ErrorState onRetry
- `founding/page.tsx` Z.106-131 plain-async (nicht useCallback)

**Hooks-Order:** Alle `useQueryClient()`-Calls stehen VOR erstem conditional-return (CLAUDE.md "Hooks vor Returns" Regel). Verified bei MembershipSection/ClubContent/CommunityPage/MissionsPage/HomePage/FoundingPassPage/MarketContent.

## Scope-Gap-Check (D26)

**Verbleibende Singleton-Imports im Codebase (legitim scope-out):**
- Provider (2): QueryProvider, AuthProvider — initialisieren Singleton bzw. nutzen ausserhalb React-Render-Lifecycle
- Utility-Module (4): `src/lib/queries/invalidation.ts`, `homeDashboard.ts`, `marketDashboard.ts`, `src/features/fantasy/queries/invalidation.ts` — kein Component/Hook-Body → `useQueryClient()` strukturell nicht anwendbar

**Slice 170 Self-Correction:** Slice 170 Reviewer hatte `useHomeData.ts` irrtuemlich als "Utility" klassifiziert. Slice 172 korrigiert das — ist Custom-Hook, korrekt migriert.

**Keine Scope-Ueberschreitung:** Kein Out-of-Scope-File editiert.

## Positive

1. **Scope-Disziplin auf CEO-Niveau:** Exakt die 11 Files aus active.md-Backlog adressiert.
2. **Pattern-Anwendung perfekt:** Slice 171 common-errors.md §5 + testing.md §5 verbindlich angewandt.
3. **Test-Fix-Transparenz:** Proof dokumentiert initial 2 Test-Fails + vi.hoisted-Fix ohne Hiding.
4. **Inline-Arrow vs useCallback Understanding:** 5 ErrorState-Sites korrekt als Inline-Arrows behandelt (kein deps-Update), 9 useCallback-Sites korrekt mit deps-Update.
5. **Slice-170-Self-Correction:** useHomeData-Fehleinschaetzung gefangen und korrigiert.

## Learnings fuer Knowledge Capture

Keine neuen Patterns. Slice 172 ist reine Anwendung von Slice-170/171-Pattern.

Optional: "Post-Migration Dead-Code-Cleanup" als 6. Pattern in testing.md §5 codifizieren (wenn Tests jetzt nur noch Hook-Pfad brauchen, Legacy-Mock entfernen).

## Summary

Lehrbuch-disziplinierter Sweep-Slice. 11 Files exakt nach Slice 170/171 Pattern migriert, deps-arrays konsistent, Tests grün, Scope-Grenzen respektiert. Zero REWORK-Findings. N1 in-slice gefixt (Dead-Code-Mock entfernt). Sofort commit-bar. Schliesst den letzten offenen Konvention-Cleanup-Backlog.

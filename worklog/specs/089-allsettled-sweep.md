# Slice 089 — allSettled Sweep: logSilentRejects in allen residuellen Stellen

## Ziel (1 Satz)
Die restlichen 16 `Promise.allSettled`-Stellen (nach Slice 088) mit `logSilentRejects(label, results)` instrumentieren — Money/Admin/User-Critical zuerst, dann Utility-Pfade.

## Betroffene Files (11 Files, 16 Call-Sites)

### Money / Admin / User-Critical (Priorität 1 — 7 Stellen, 5 Files)
| Path:Line | Label |
|-----------|-------|
| `src/features/fantasy/hooks/useLineupSave.ts:98` | `useLineupSave.saveLineup` |
| `src/lib/services/offers.ts:20` | `offers.enrichOffer` |
| `src/lib/services/offers.ts:128` | `offers.getMyOffers` |
| `src/app/(app)/bescout-admin/AdminGameweeksTab.tsx:26` | `AdminGameweeksTab.loadGameweeks` |
| `src/components/profile/hooks/useProfileData.ts:90` | `useProfileData.load` |
| `src/components/profile/FollowListModal.tsx:41` | `FollowListModal.loadChecks` |
| `src/lib/services/club.ts:76` | `club.getClubDetail` |

### User-Data / Enrichment (Priorität 2 — 9 Stellen, 6 Files)
| Path:Line | Label |
|-----------|-------|
| `src/lib/services/social.ts:124` | `social.enrichFollowers` (or similar) |
| `src/lib/services/social.ts:153` | `social.enrichFollowing` (or similar) |
| `src/lib/services/scouting.ts:107` | `scouting.getResearchAndBounties` |
| `src/lib/services/scouting.ts:183` | `scouting.getScoutProfile` |
| `src/lib/services/scouting.ts:238` | `scouting.getScoutStats` |
| `src/lib/services/scouting.ts:280` | `scouting.getLeaderboard` |
| `src/lib/services/search.ts:153` | `search.enrichResults` |
| `src/lib/services/research.ts:108` | `research.enrichPosts` |
| `src/lib/services/pushSender.ts:62` | `pushSender.sendBatch` |

Labels sind spezifisch pro Funktion — final labels werden beim Edit anhand des umgebenden Funktionskontexts gesetzt.

## Fix-Pattern (identisch für alle 16 Stellen)

```ts
// Vorher:
const [a, b, c] = await Promise.allSettled([...]);

// Nachher:
const results = await Promise.allSettled([...]);
logSilentRejects('{module}.{function}', results);
const [a, b, c] = results;
```

+ Import `import { logSilentRejects } from '@/lib/observability/silentRejects';` pro File.

## Acceptance Criteria

1. Alle 16 Call-Sites rufen `logSilentRejects` mit stabilem Label nach ihrem `Promise.allSettled` auf.
2. Existing fulfilled/rejected branch-Logik unverändert.
3. `npx tsc --noEmit` clean.
4. Existing Tests in tangierten Files unverändert pass (vitest pro File oder Full-Suite).
5. Grep-Verifikation: `grep -rn "Promise.allSettled" src/ | grep -v __tests__ | grep -v logSilentRejects` zeigt 0 Treffer (alle instrumentiert).

## Edge Cases

- Files mit mehreren allSettled (offers.ts 2x, scouting.ts 4x, social.ts 2x) — pro allSettled eigenes `results`-variable-name falls nötig (z.B. `enrichResults`, `statsResults`), damit keine Shadowing-Probleme.
- Imports bereits vorhanden (falls schon gelesen beim 088-Scan) — nur hinzufügen wenn noch nicht da.
- Test-Files mocken `@sentry/nextjs` bereits nicht global → Sentry-Call ist no-op in tests (enabled=false via config), kein Test-Break.

## Proof-Plan

- tsc clean
- `npx vitest run` full-suite → existing pass count unverändert
- `grep -rn "Promise.allSettled" src/ | grep -v __tests__` → jeder Treffer hat `logSilentRejects` in den umgebenden Zeilen
- diff-stat zeigt ~16 files changed, ca. +32 insertions / -16 deletions

## Scope-Out

- Audit-Precision v2 (multi-line `.range()` awareness) — separate Slice
- `.catch(() => null)` Patterns — separate Slice
- Sentry.setUser bei Login — separate Slice
- Sentry Breadcrumbs für Supabase-Queries — separate Slice

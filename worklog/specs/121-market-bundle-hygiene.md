# Slice 121 — /market Bundle Hygiene (Break 2 Hard Import Chains)

**Status:** spec (BUILD in-progress)
**Size:** XS (2 Files + 1 neue kleine Datei)
**CEO-Scope:** false (Code-Hygiene ohne Verhaltensänderung)

## Ziel

Zwei harte Import-Ketten auf /market aufbrechen, die unnötig research/fantasy-Code ins Market-Bundle ziehen. Messbar: **/market FLJS 277 kB → ≤271 kB** (-5 bis -10 kB erwartet, ehrlich klein).

## Kontext

`@next/bundle-analyzer` zeigt /market-only Chunks = 70 kB parsed. Drei Problem-Ketten identifiziert:

1. **`BuyConfirmModal` static-importiert `getPlayerSentimentCounts` aus `@/lib/services/research`** — zieht research.ts (8 kB) + transitive Dependencies ins Market-Bundle. Die Sentiment-Query ist **conditional** (`enabled: open`) → research.ts muss nicht im initial bundle sein.

2. **`MarketContent` importiert `useHoldingLocks` aus `@/features/fantasy/queries/events`** — dieser Barrel-Modul importiert top-level: `events.queries.ts`, `lineups.queries.ts`, `wildcards`, `club`. `useHoldingLocks` selbst nutzt nur `getUserHoldingLocks` aus `@/lib/services/wallet`. Der Rest ist Dead-Weight.

3. **Transitive `predictions` in 1099.js (5.6 kB)** — kommt wahrscheinlich aus der fantasy/queries/events.ts Kette. Wird nach Fix #2 wahrscheinlich auch verschwinden.

## Lösung

**Fix #1 — Lazy-Load research.ts in BuyConfirmModal:**

```tsx
// BuyConfirmModal.tsx (new)
function usePlayerSentiment(playerId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.research.sentiment(playerId),
    queryFn: async () => {
      const { getPlayerSentimentCounts } = await import('@/lib/services/research');
      return getPlayerSentimentCounts(playerId);
    },
    enabled,
    staleTime: 60_000,
  });
}
```

Webpack creates code-split chunk for research.ts; nur geladen wenn Modal öffnet + query fires.

**Fix #2 — `useHoldingLocks` in isoliertes File extrahieren:**

```tsx
// NEW: src/features/fantasy/queries/holdingLocks.ts
import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserHoldingLocks } from '@/lib/services/wallet';

export function useHoldingLocks(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.holdingLocks(userId!),
    queryFn: () => getUserHoldingLocks(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
```

`MarketContent` imports from `@/features/fantasy/queries/holdingLocks` statt `@/features/fantasy/queries/events`. Bricht die Chain, ohne existing fantasy/events consumers zu brechen (die nutzen weiter den Barrel).

## Betroffene Files

**Edit:**
- `src/features/market/components/shared/BuyConfirmModal.tsx` — Lazy-import research.ts in queryFn.
- `src/features/market/components/MarketContent.tsx` — Import-Pfad von `queries/events` auf `queries/holdingLocks` ändern.
- `src/features/fantasy/queries/events.ts` — `useHoldingLocks` export entfernen (steht in neuem File).

**Neu:**
- `src/features/fantasy/queries/holdingLocks.ts` — isolierter Hook.

**Unangetastet:**
- `BuyConfirmModal` Return-Shape + Props identisch.
- Alle anderen Consumer von `useHoldingLocks` (falls es welche gibt — grep-check erforderlich) nutzen weiter den alten Pfad, solange exportiert bleibt oder Consumer migriert werden.

## Acceptance Criteria

1. `BuyConfirmModal` hat keinen static `import { getPlayerSentimentCounts } from '@/lib/services/research'` mehr. Stattdessen lazy-import im queryFn.
2. Neue Datei `src/features/fantasy/queries/holdingLocks.ts` exportiert `useHoldingLocks`.
3. `MarketContent` importiert `useHoldingLocks` von `@/features/fantasy/queries/holdingLocks`.
4. `useHoldingLocks` aus `queries/events` entfernt (oder re-exportiert zur Kompatibilität — je nach grep-Ergebnis).
5. `grep -rn "useHoldingLocks" src/` zeigt alle Consumer auf den neuen Pfad.
6. Bundle-Diff: `/market` FLJS sinkt messbar (≥ -3 kB, Target -10 kB).
7. `npx tsc --noEmit` clean.
8. `npx vitest run` — 0 neue Failures (gegenüber Baseline).
9. Visual: /market rendert weiterhin korrekt (BuyConfirmModal zeigt Sentiment-Badges nach Modal-Open).

## Edge Cases

1. **Andere Consumer von `useHoldingLocks`**: Nur `MarketContent` importiert ihn direkt. Wenn jemand anders ihn nutzt (grep nach), re-export aus `queries/events.ts` für Kompatibilität lassen: `export { useHoldingLocks } from './holdingLocks'`.
2. **Lazy-import Delay**: Erster Modal-Open zeigt Sentiment leer bis Chunk lädt (~100ms auf 4G, ~10ms auf broadband). `enabled: open` + React Query handhabt das — nur kurze Loading-Phase.
3. **Test-Mocks**: BuyConfirmModal-Tests mocken evtl. `getPlayerSentimentCounts` — müssen dann auf den dynamic-import-Pfad angepasst werden. Wenn kein Test diesen Fall abdeckt, geht es automatisch.

## Proof-Plan

- `worklog/proofs/121-bundle-diff.txt` — next build vor/nach /market FLJS + market-only chunks Vergleich.
- `worklog/proofs/121-tsc-clean.txt` — tsc output.
- `worklog/proofs/121-vitest.txt` — Test-Run (BuyConfirmModal + MarketContent).

## Scope-Out

- Andere market-only chunks (7581.js 24 kB src, 6908.js 10 kB node_modules) — meist unvermeidbar oder kleiner ROI.
- /community (298 kB FLJS) Bundle-Audit — eigener Slice bei Bedarf.
- /home dynamic()-Split — offene Entscheidung.

## Risiken

1. **Test-Mock-Breakage**: Wenn ein BuyConfirmModal-Test `vi.mock('@/lib/services/research')` nutzt, funktioniert das mit dynamic-import anders. Test muss angepasst werden, wenn das Szenario eintritt.
2. **Import-Chain-Überraschung**: Der tatsächliche Gewinn hängt davon ab, ob webpack die Ketten wirklich korrekt split. Messen VOR behaupten (Lesson aus Slice 109/120).

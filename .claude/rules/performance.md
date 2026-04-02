---
description: Performance-Regeln fuer Queries, Rendering und Bundle
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

## Query Performance
- JEDE Supabase Query MUSS `.limit()` haben (Ausnahme: explizit alle Rows noetig)
- `staleTime` min 30s fuer normale Daten, 5min fuer statische (Clubs, Players)
- `staleTime: 0` ist VERBOTEN — nutze `invalidateQueries` nach Writes
- Tab-gated Queries: `enabled: tab === 'x'` spart HTTP-Requests
- RLS-Queries (getWallet, getHoldings) NICHT cachen

## React Rendering
- `React.memo` auf Components >100 Zeilen die Props von Eltern bekommen
- `useMemo`/`useCallback` NUR bei gemessener Performance-Verbesserung
- Lazy Imports fuer Modals >500 Zeilen: `dynamic(() => import(...))`
- `keepPreviousData: true` default in React Query (verhindert Layout Shift)

## Bundle
- `optimizePackageImports` in next.config fuer grosse Libraries
- Icons: Einzelimport `import { X } from 'lucide-react'` (nicht `import * as`)
- Bilder: next/image mit width/height (kein Layout Shift)

## Messen VOR Optimieren
- KEINE Performance-Aenderung ohne Baseline-Messung
- `npx next build` → Bundle-Analyse VOR und NACH
- React DevTools Profiler fuer Rendering-Probleme
- Network Tab fuer Query-Wasserfall

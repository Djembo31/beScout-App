# Frontend Journal: Slice 198b Track A — UX-Rest Top-5

## Gestartet: 2026-04-25

### Verstaendnis
- Was: 5 UX-Findings aus `worklog/audits/2026-04-25/ux.md` schliessen.
- Betroffene Files:
  - `src/app/(app)/page.tsx` (Home #1)
  - `src/features/market/components/MarketContent.tsx` (Market #3)
  - `src/components/fantasy/EventSummaryModal.tsx` (#7)
  - `src/components/fantasy/CreateEventModal.tsx` (#8)
  - `src/components/community/PostReplies.tsx` (#10)
- Risiken: Market loading-state Behavior-Change (Section-Scoped statt Global)

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | onRetry refettcht ALLE parallel queries via invalidateQueries({ queryKey: [] }) - zu broad. Statt dessen explicit list | Narrow scope, vermeidet unrelated cache-trash |
| 2 | Market: Header + Tabs sichtbar lassen (kein full skeleton) wenn data.playersLoading | UX-Win + Tab-Switching kann frueh starten, Tabs handhaben own loading |
| 3 | Modal-TODO #7+#8: Code-Kommentar entfernen, preventClose={false} bleibt explicit dokumentiert via `aria-label` ist read-only - TODO ueberfluessig | Komponenten sind dauerhaft synchron / read-only |
| 4 | PostReplies Loader2 → Skeleton mit 2-3 Reply-Stub-Rows | Konsistent mit ui-components.md "Skeleton Screens" |

### Fortschritt
- [x] #1 Home onRetry → invalidate alle parallel queries
- [x] #3 Market Section-scoped loading
- [x] #7 EventSummaryModal preventClose-TODO entfernen
- [x] #8 CreateEventModal preventClose-TODO entfernen
- [x] #10 PostReplies Loader2 → Skeleton

### Runden-Log

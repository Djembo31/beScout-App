# Slice 016 — B2 Transactions Pagination

## Ziel

`TransactionsPageContent` laed nicht mehr 200 Rows upfront sondern paginiert via React-Query `useInfiniteQuery`. User sieht erste 50, dann "Mehr laden"-Button der weitere 50 nachladt. Skaliert fuer Heavy-User (Flow 14 GELB → GRUEN).

## Hintergrund

Flow 14 markierte "Keine Pagination — laedt 200 Rows upfront" als Restrisiko (B2). Aktueller Stand:

- `src/lib/services/wallet.ts:128` — `getTransactions(userId, limit=20, offset=0)` nutzt `.range(offset, offset+limit-1)`. **Pagination-ready, ungenutzt.**
- `src/lib/services/tickets.ts:39` — `getTicketTransactions(userId, limit=20)` kein offset. **Muss erweitert werden.**
- `src/lib/queries/misc.ts:25` — `useTransactions` nutzt `useQuery`, gibt limit weiter.
- `src/lib/queries/tickets.ts:20` — `useTicketTransactions` nutzt `useQuery`, gibt limit weiter.
- `src/components/transactions/TransactionsPageContent.tsx:129-130` — beide Hooks mit `{limit: 200}` aufgerufen.

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `src/lib/services/tickets.ts` | `getTicketTransactions(userId, limit=20, offset=0)` — offset-Default-Param, `.range(offset, offset+limit-1)` statt `.limit(limit)` |
| `src/lib/queries/keys.ts` | `qk.transactions.infinite(uid, pageSize)` + `qk.tickets.transactionsInfinite(uid, pageSize)` |
| `src/lib/queries/misc.ts` | Neue Hook `useInfiniteTransactions(userId, pageSize)` — alte `useTransactions` UNVERAENDERT |
| `src/lib/queries/tickets.ts` | Neue Hook `useInfiniteTicketTransactions(userId, pageSize)` — alte UNVERAENDERT |
| `src/lib/queries/index.ts` | Export der neuen Hooks |
| `src/components/transactions/TransactionsPageContent.tsx` | Umstellung auf Infinite-Hooks + Load-More-Button |
| `messages/de.json` + `messages/tr.json` | Keys `loadMore`, `allLoaded` (falls nicht schon da) |

## Nicht betroffen (bewusst)

- `src/components/profile/hooks/useProfileData.ts` — nutzt `useTransactions`/`useTicketTransactions` mit `{limit: 50}` fuer TimelineTab. Keine Pagination-UI dort, Hook bleibt wie es ist.
- `src/components/profile/TimelineTab.tsx` — gleiches Profile-Scope.
- Alle Mock-Tests (`ProfileView.test.tsx`, `useProfileData.test.ts`) — mocken alte Hook-Signaturen, keine Aenderung.

## Acceptance Criteria

1. `TransactionsPageContent` laedt initial 50 credit-Tx + 50 ticket-Tx (nicht 200 + 200).
2. "Mehr laden"-Button unten unter Liste. Click → fetchNextPage auf beiden Queries die noch `hasNextPage === true` haben.
3. Button-Label: `{t('loadMore')}` ("Mehr laden" / "Daha fazla yükle").
4. Button deaktiviert / ersetzt durch Text `{t('allLoaded', { count: rows.length })}` wenn beide Queries `!hasNextPage`.
5. Button-Loading-State mit `Loader2` Spinner + deaktiviert waehrend `isFetchingNextPage`.
6. Aggregation (earned/spent/net/count) bleibt berechnet auf aktuell geladenen + gefilterten Rows (wie jetzt). Scope-Out: echte Server-Side-Aggregation.
7. Filter (Date-Range, Type, Search) weiterhin Client-Side auf aktuell geladenen Pages (unveraendert).
8. Bestehender CSV-Export arbeitet auf aktuell geladenen + gefilterten Rows (unveraendert).
9. `npx tsc --noEmit` clean.
10. Bestehende Tests bleiben gruen: `wallet-v2.test.ts` (getTransactions), `tickets.test.ts` (getTicketTransactions), Profile-Tests.
11. `getTicketTransactions` Service-Signatur backwards-compatible (offset default=0).

## Edge Cases

1. **User mit 0 Tx**: `data.pages = [[]]` → `rows = []` → Empty-State rendert (unveraendert).
2. **User mit <50 Tx**: First page hat <50 Rows → `hasNextPage=false` sofort → "Alle N geladen" Text.
3. **User mit exakt 50 Tx**: First page hat 50 → `hasNextPage=true` → Click "Mehr laden" → 0 Rows returned → `hasNextPage=false`. Kein Duplicate (offset=50 liefert leere DB-Antwort, React-Query appendet leere Page).
4. **Credits >50 aber Tickets <50**: 1 Button, Click triggert nur `txQuery.fetchNextPage()`, `ticketTxQuery` bleibt. Button wird `hasNextPage=false` erst wenn CREDITS erschoepft.
5. **Filter aktiv bei Load-More**: Filter applied client-side auf aggregierter Menge aller Pages. `rows.length=0` waehrend Load-More schon lief ist moeglich (kein match im aktuellen Filter, aber mehr Pages verfuegbar) → "Mehr laden" bleibt sichtbar (prompted User).
6. **Doppel-Click**: `isFetchingNextPage=true` disabled button.
7. **Error auf Page-N-Fetch**: React-Query behandelt, `isError` bleibt false bis retry exhausted. Aktueller `isError`-Check ist auf `.isError` der Query. Das triggert nur auf initial error. Scope-Out: Page-Fetch-Error-Toast. Failure ist idempotent (User kann nochmal klicken).
8. **Infinite-Loop-Gefahr**: `getNextPageParam` returns `undefined` wenn `lastPage.length < pageSize` — verhindert unendliches Nachladen.
9. **Tab-Resume nach stale-time**: Alte Pages bleiben im Cache, refetchOnWindowFocus holt neueste Page falls stale. Acceptable.
10. **Logout waehrend fetching**: Slice 015-Fix cleart Cache → Infinite-Query komplett geflushed. OK.

## Proof-Plan

- `worklog/proofs/016-diff.txt` — `git diff --stat` Uebersicht + inline diff-Highlights
- `worklog/proofs/016-tsc.txt` — `npx tsc --noEmit` (leer = clean)
- `worklog/proofs/016-tests.txt` — `npx vitest run src/lib/services/__tests__/wallet-v2.test.ts src/lib/services/__tests__/tickets.test.ts src/components/profile/` — alle gruen
- `worklog/proofs/016-render-check.md` — statischer Render-Check: Welche Props der InfiniteData-Struktur in Component genutzt werden, wie `rows` abgeleitet wird, wie Load-More-Click mapped auf `fetchNextPage`.

Kein Playwright (Pagination ist render+state, gut unit-testbar via Logik-Trace).

## Scope-Out

- Server-Side Filter (Date-Range, Type, Search als DB-Query-Params) — separate Slice.
- Echte Server-Aggregation (Total Earned/Spent via RPC) — neue RPC = CEO-Scope.
- Infinite-Scroll via IntersectionObserver — nice-to-have, separate Slice.
- Page-Error-Toast bei mid-fetch-Fehler — separate.
- `useProfileData` auf Pagination umstellen — nicht noetig, Timeline-Tab ist auf Top-50 fix.

## Slice-Klassifikation

- **Groesse:** M (4 Code-Files + 1 Component + i18n-Keys, ~80-120 Zeilen neu)
- **CEO-Scope:** CTO-autonom, explizit freigegeben per Briefing ("B2 — M, CTO-autonom").
- **Risiko:** Niedrig-Mittel — Hook-API bleibt additive, alte Consumer unveraendert. Neues Infinite-Query-Pattern folgt React-Query-v5 Konvention.

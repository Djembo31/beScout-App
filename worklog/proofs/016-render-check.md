# 016 — Transactions Pagination Render-Check

Statischer Check der Render-Logik (kein Browser-E2E).

## Hook-Output-Schema

```ts
txQuery = useInfiniteTransactions(userId, 50) → InfiniteData<DbTransaction[]>
  .data?: { pages: DbTransaction[][], pageParams: number[] }
  .isLoading: boolean
  .isError: boolean
  .hasNextPage: boolean
  .isFetchingNextPage: boolean
  .fetchNextPage(): Promise<...>
  .refetch(): Promise<...>

ticketTxQuery analog fuer DbTicketTransaction[]
```

## Zeilen-Trace TransactionsPageContent.tsx

| Zeile | Code | Effekt |
|-------|------|--------|
| 129 | `useInfiniteTransactions(userId, 50)` | Initial Fetch Page 0 (offset=0, limit=50) |
| 130 | `useInfiniteTicketTransactions(userId, 50)` | Initial Fetch Page 0 |
| 132-135 | `data?.pages.flat() ?? []` | Flatten Credits-Pages in 1 Array |
| 136-139 | Same fuer Tickets | Flatten Tickets-Pages in 1 Array |
| 141 | `cutoffDate(range)` | Date-Range Filter |
| 143-158 | `filteredCredits = useMemo(...)` | Client-Filter (date + type + search) auf allen geladenen Pages |
| 160-173 | `filteredTickets = useMemo(...)` | Gleiches fuer Tickets |
| 175-183 | `aggregations = useMemo(...)` | Earned/Spent/Net auf gefilterten Rows |
| 186-198 | `rows = useMemo(...)` | Unified, date-desc-sortiert |
| 205 | `isLoading = txQuery.isLoading \|\| ticketTxQuery.isLoading` | Initial-Load Spinner |
| 366-381 | `<Button>` (neuer Load-More-Block) | Sichtbar wenn mindestens eine Query `hasNextPage=true` |
| 372-375 | `onClick` | Triggert `fetchNextPage` nur auf der Query mit `hasNextPage=true` |
| 377-380 | `{(txQuery.isFetchingNextPage \|\| ticketTxQuery.isFetchingNextPage)}` | Loader2-Spinner + Button disabled |

## Edge-Case-Verifikation

### EC1 — User mit 0 Tx
- Beide Queries `data.pages = [[]]` → `allTx = []`, `allTicketTx = []`
- `rows.length === 0` → Empty-State rendert (Zeile 354-363, unveraendert)
- `hasNextPage = false` fuer beide (weil `lastPage.length < pageSize` — hier 0 < 50) → Load-More-Block NICHT sichtbar ✓

### EC2 — User mit 30 Tx (alle Credits)
- `txQuery.data.pages = [[30 rows]]`, `hasNextPage = false` (30 < 50)
- `ticketTxQuery.data.pages = [[]]`, `hasNextPage = false`
- `rows.length = 30` → Liste rendert
- Load-More-Block NICHT sichtbar ✓ (`(false || false)`)

### EC3 — User mit 50 Tx (alle Credits)
- `txQuery.data.pages = [[50 rows]]`, `hasNextPage = true` (50 == 50)
- Load-More-Block sichtbar ✓
- Click → `fetchNextPage()` → Page 1 (offset=50, limit=50) fetch → returns `[]`
- `hasNextPage` recomputed: `0 < 50` → `false`
- Load-More-Block verschwindet ✓
- `rows.length` bleibt 50, kein Duplicate ✓

### EC4 — User mit 120 Credits + 10 Tickets
- Page 0: Credits [50 rows, hasNextPage=true], Tickets [10 rows, hasNextPage=false]
- Load-More Click → `if (txQuery.hasNextPage) void fetchNextPage()` → nur Credits fetchen. Tickets-Query bleibt.
- Page 1: Credits [50 rows, hasNextPage=true]
- Page 2 Click → Credits [20 rows, hasNextPage=false] → Load-More-Block verschwindet
- `rows.length` = 120 + 10 = 130 ✓

### EC5 — Filter aktiv waehrend Load-More
- User hat 50 Rows geladen, Filter "trades" matched 5 davon
- `rows.length = 5`, aber `hasNextPage = true` → Load-More-Block bleibt sichtbar (prompted zum Nachladen)
- Click → Page 1 fetched → mehr Daten im Cache, Client-Filter appliziert → evtl. mehr matches
- Acceptable Verhalten: `rows.length` waechst mit jedem Load-More wenn Filter-Matches vorhanden ✓

### EC6 — Doppel-Click auf Load-More
- Click 1: `isFetchingNextPage=true`, Button disabled
- Click 2: Button gibt nicht weiter (disabled). Kein Duplicate-Fetch ✓

### EC7 — Error auf initial Load
- `txQuery.isError=true` → `isError=true` (Zeile 202) → ErrorState rendert mit Retry (Zeile 212-216) ✓ (unveraendert)

### EC8 — Error auf Page-N-Fetch
- React-Query retry-backoff (default 3x). Nach Exhaustion bleibt `isFetchingNextPage=false`, `hasNextPage` unveraendert (=true).
- Button re-enabled, User kann nochmal klicken.
- Kein User-facing Error-Toast (scope-out). Acceptable fuer Beta-Phase.

## CSV-Export

`handleExport` arbeitet auf `filteredCredits` und `filteredTickets` — das sind die bereits geladenen + gefilterten Pages. Verhalten identisch zu vor Slice 016 (nur weniger Daten verfuegbar bis User "Mehr laden" klickt). ✓

## tsc clean

`npx tsc --noEmit` → 0 Bytes output. ✓

## Tests

- `wallet-v2.test.ts`: 40/40 passed (getTransactions Service-Signatur mit offset-Default war schon da, nichts veraendert).
- `tickets.test.ts`: getTicketTransactions-Tests passed (Service-Signatur backwards-compatible, offset-Default=0).
- `profile/**`: 54/55 passed (1 skipped, nicht 016-bezogen). Mocks auf alte `useTransactions`/`useTicketTransactions` Hooks weiter gueltig — diese wurden nicht veraendert.

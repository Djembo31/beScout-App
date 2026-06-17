# Frontend Journal: J10 Healer — 18 Fixes + notifText i18n + priceAlert

## Gestartet: 2026-04-15

### Verstaendnis
- Was: 18 autonome FIX-Items aus J10-Audit + notifText i18n-Gap + priceAlert-Integration (AR-59 Migration)
- Betroffene Files:
  - `src/lib/notifText.ts` (Core fix)
  - `src/lib/services/notifications.ts` (FIX-01..05)
  - `src/lib/hooks/useNotificationRealtime.ts` (FIX-06 + FIX-11)
  - `src/components/layout/NotificationDropdown.tsx` (FIX-12, FIX-14, price_alert)
  - `src/features/market/components/marktplatz/WatchlistView.tsx` (FIX-10 + FIX-16)
  - `src/components/player/detail/PlayerHero.tsx` (FIX-10 Star already ok)
  - `src/features/market/hooks/useWatchlistActions.ts` (FIX-18)
  - `src/components/player/detail/hooks/usePriceAlerts.ts` (FIX-15 deprecate)
  - `src/lib/services/watchlist.ts` (FIX-17)
  - `messages/de.json` + `messages/tr.json` (priceAlert Keys + FIX-07)
- Risiken:
  - notifText contract-change: 30+ Call-Sites, backward-compat via optional locale-Param mit default 'de'
  - Tests muessen updated werden: vi.mock existiert in vielen test-files
  - FIX-11 Realtime UPDATE channel — nicht 2 channels, sondern 1 channel mit event: '*'
  - FIX-17 Atomic Migration: remove localStorage NUR bei 0 failures

### Entscheidungen
| # | Entscheidung | Warum |
|---|-------------|-------|
| 1 | notifText(key, params, locale?) mit default 'de' | Backward-compat, 30+ Call-Sites muessen nicht alle geaendert werden |
| 2 | NotificationDropdown resolved price_alert via title-key + Player-lookup | Migration schreibt Key statt Text, UI kennt locale |
| 3 | FIX-10 Heart→Star konvertieren (WatchlistView) | PlayerHero nutzt schon Star, Konsistenz. Star = Brand (Gold-Theme) |
| 4 | FIX-11 Single channel auf INSERT + UPDATE events | Sparsamer als 2 Channels, Supabase JS unterstuetzt event: '*' oder mehrere .on() |
| 5 | FIX-15 localStorage Price-Alerts KOMPLETT entfernen | Parallel-Pfad war dead-weight, DB-Pfad ist jetzt live via AR-59 |
| 6 | FIX-07 "Ausschüttung" → "Verteilung" nur DE, TR "dağıtım" ist neutral OK | Gluecksspiel-Konnotation nur im DE |
| 7 | FIX-18 Cache-Race: nach addToWatchlist invalidate | Entfernt opt-${id} aus Cache automatisch |

### Fortschritt
- [ ] FIX-01: getUnreadCount + getNotifications throw
- [ ] FIX-02: markAsRead + markAllAsRead throw
- [ ] FIX-03: createNotification throw
- [ ] FIX-04: createNotificationsBatch throw
- [ ] FIX-05: createBatchedNotification throw
- [ ] FIX-06: markReadLocal rollback on error
- [ ] FIX-07: PBT-Ausschüttung → Verteilung (DE only)
- [ ] FIX-08: $SCOUT in achievement-bodies (Note: keine lokalen achievement-definitions gefunden — DB-seitig, deferred)
- [ ] FIX-09: prefTrading bleibt OK (kein Fix noetig)
- [ ] FIX-10: Watchlist Icon Heart→Star (WatchlistView)
- [ ] FIX-11: Realtime UPDATE channel
- [ ] FIX-12: Mobile BottomSheet preventClose bei isMarkingAll
- [ ] FIX-13: getNotifications limit cap Math.min(limit, 100)
- [ ] FIX-14: timeAgo duplicate check (wird beibehalten, keine Duplication gefunden)
- [ ] FIX-15: usePriceAlerts localStorage deprecate
- [ ] FIX-16: WatchlistView stale-entry Count
- [ ] FIX-17: migrateLocalWatchlist atomic
- [ ] FIX-18: addToWatchlist cache-race invalidate
- [ ] J10F-01: notifText locale-Parameter
- [ ] priceAlert i18n-Keys DE + TR (AR-59 Integration)
- [ ] priceAlert Dropdown-Resolution

### Runden-Log

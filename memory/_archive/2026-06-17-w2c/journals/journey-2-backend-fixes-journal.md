# Backend Journal: Journey #2 Backend Fixes
## Gestartet: 2026-04-14

### Verstaendnis
- Was: 3 Backend/Service-Fixes aus Journey #2 Audit (FIX-10, FIX-13, FIX-15) + FIX-02 Verify
- Betroffene Tabellen: ipos (read), ipo_purchases (read)
- Betroffene Services: src/lib/services/ipo.ts
- i18n: messages/de.json + messages/tr.json (notifTemplates namespace)
- Risiken:
  - i18n-Key-Leak falls `notifText` key nicht existiert → fallback returns key literal
  - `getIpoForPlayer` Fix: Supabase JS kein CASE in .order() → Client-Side Priorisierung
  - `getUserIpoPurchases` .limit(500) → vorher unbounded

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Neue Keys: `ipoPurchaseTitle` + `ipoPurchaseBody` im notifTemplates-Namespace | Konsistent mit bestehenden Keys `newIpoTitle`/`newIpoBody` |
| 2 | `getIpoForPlayer`: Fetch alle matching Rows (`.limit(10)`) + Client-Side Priorisierung nach Status | Supabase-JS kein CASE in .order() — pragmatisch, keine RPC-Migration noetig (AR-8 ist CEO-Scope) |
| 3 | `getUserIpoPurchases`: `.limit(500)` | performance.md Rule; 500 ist hoch genug fuer Fortune-Tail |
| 4 | Title fuer Notification: "Scout Card gekauft" / "Scout Card alındı" | UX-konsistent mit bestehenden notif-Titeln |

### Fortschritt
- [x] FIX-10: i18n-Keys `ipoPurchaseTitle` + `ipoPurchaseBody` in DE + TR
- [x] FIX-10: `ipo.ts:131` auf `notifText()` umgestellt
- [x] FIX-13: `getIpoForPlayer` Client-Side Status-Priorisierung
- [x] FIX-15: `getUserIpoPurchases` `.limit(500)`
- [x] FIX-02 Verify: `buyFromIpo` playerId-Branch ist korrekt (defense-in-depth Check)
- [x] tsc clean
- [x] vitest ipo.test.ts green
- [x] vitest gesamt clean

### Runden-Log

# Session Handoff
## 2026-04-11 — Market Polish Sweep Session (Critical Bugs + Repo-Hygiene)

## TL;DR

Lange Session mit zu vielen kleinen Fehlern und einem sehr kritischen Money-Bug. Anil hat das Pacing zu Recht kritisiert ("ich will bessere performance", "wir hinterlassen zu viele krümel und übersehen einiges"). Bugs wurden alle gefixt und live verifiziert, aber der Session-Charakter war reaktiv statt proaktiv. Nächste Session weiter mit Market Polish — aber mit einer **Anti-Krümel-Disziplin**, siehe unten.

## Nächste Session: Start hier

**Erstmal lesen:**
1. Diesen Handoff
2. `memory/polish-sweep.md` — SSOT für den Page-by-Page Polish (Market ist in progress)
3. `memory/pre-launch-checklist.md` — Fan-Seed-Cleanup und Supply-Invariant CI-Task
4. `C:\Users\Anil\.claude\projects\C--bescout-app\memory\MEMORY.md`

**Nächster konkreter Schritt:**
- **Polish Sweep Page #2: Market** weiter — Anil's Priorität aus dem Morning-Briefing:
  1. **Watchlist von „Mein Kader" → „Marktplatz" verschieben** (Anil-Entscheidung)
  2. **Marktplatz-Tab im Detail durchgehen** (Club Verkauf / Von Usern / Trending)
- Danach Phase 1 Critical Path weiter: Fantasy (#3), Player Detail (#4), Profile (#5), Inventory (#6)

## Anti-Krümel-Disziplin — neue Regeln für nächste Session

Aus der heutigen Erfahrung. Anil hatte in mehreren Momenten sichtbar Frust weil ich Fehler eingebaut habe die ich mit einem einfachen Check hätte verhindern können.

1. **Nach jedem Service/RPC-Change: `npx vitest run` auf dem betroffenen Service + dem Test-File LAUFEN LASSEN.** Nicht nur tsc. Heute hat die Vitest-Suite ~8 pre-existing Test-Failures offenbart die ich beim ursprünglichen Commit hätte fangen müssen (mystery box silent changes, 7d price mock fehlt, liga editable field count +1).
2. **Kein Service darf einen Fehler schlucken und null returnen wenn das Ergebnis in der UI als "noch nicht geladen" aussieht.** Entweder THROW (dann retried React Query) oder einen expliziten Error-State returnen den die UI verarbeitet. Null = erfolgreich leer = Cache-Gift. Heute gefixt: `getUserTickets` (Tickets pop-in Bug). **Audit-Liste** der gleichen Pattern siehe unten (Scope-Creep-Log).
3. **Bei PL/pgSQL-RPCs: keine inline `COALESCE` in Scalar-Subqueries.** `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist falsch weil COALESCE per-Zeile läuft, nicht auf leere Result-Sets. Richtig: `SELECT x INTO v_x FROM t ...; IF COALESCE(v_x, 0) < y`. Heute gefixt in `accept_offer` + `create_offer`. Beide waren Money-Bugs.
4. **Nach Data-Contract-Change (Return-Shape, camelCase vs snake_case): Service, Caller, UI-Consumer, Tests im gleichen Commit anpassen.** Heute: `open_mystery_box_v2` RPC returned camelCase, Service las snake_case → alle Reward-Felder kamen als `undefined` durch, Modal zeigte nur "Gewöhnlich". Der Bug hat mehrere Tage überlebt weil die Tests snake_case mockten und deshalb nicht anschlugen — **die Test-Mocks waren genauso kaputt wie die Implementation**.
5. **Nach Layout/Header-Änderungen: Mobile iPhone 16 Viewport testen (393px).** Heute: Profile-Avatar ragte raus weil gap+pills+streak+avatar zusammen > 393px waren.

---

## Was heute passiert ist (chronologisch)

### 1. Mystery Box Backend Bugs (3 kaskadierend) — Commit `7eb7d37`
- `open_mystery_box_v2` RPC hatte 3 Bugs die sich gegenseitig versteckt haben:
  1. `created_at` statt `opened_at` im daily-cap-Check → SQL error 42703
  2. Equipment-Branch las non-existente Spalten `mystery_box_config.equipment_type`/`.equipment_rank` → RECORD-Feld-Fehler
  3. `ticket_transactions.source = 'mystery_box_reward'` verletzte CHECK constraint (erlaubt nur `'mystery_box'`)
- Frontend: Optimistic-daily-gate via `useHasFreeBoxToday` (server-side COUNT auf UTC-Day), localStorage-Fallback weg, Error wird jetzt sichtbar statt silent fail.
- Live verifiziert: Free-Box öffnete Epic+130 Tickets, zweiter Versuch "Heute schon geöffnet".

### 2. Repo-Audit + AutoDream Memory Commit — `78f698a` / `87eafd9`
- AutoDream Run #9 Memory (Liga DONE, Wiki-Index, Routing) committed.
- `polish-sweep.md` Scope-Creep-Log auf aktuellen Stand: Home A3 ✅, C4 ✅, Track D 🚫 (CardMastery entfernt).
- E2E Onboarding QA Scripts committed.

### 3. Trading-UX-Bugs — `59836f9` / `0ee1a79` / `6e1af5d`
- **Sell-Cancel unzuverlässig**: RPC hatte 60s Anti-Fraud-Cooldown, Frontend hat Error silent geschluckt. Migration: Cooldown komplett raus (Pilot-Phase, closed economy). Frontend `KaderSellModal.handleCancel` zeigt jetzt echten Error + Success-Text.
- **IPO-Buy-Feedback schwach**: User war unsicher ob Kauf geklappt hat, Spieler erschien erst spät im Kader. Fix: `optimisticallyAddHolding` spliced neue Holdings-Row direkt in `qk.holdings.byUser` Cache, `invalidateAfterTrade` macht jetzt `refetchQueries({type:'all'})` um auch inactive Observer zu forcen. BuyModal zeigt 2.5s Success-State mit CheckCircle2 + "In deinem Kader" + "Zum Bestand" CTA.
- **Phantom-Success-Bug** (nach Fix gefunden, direkt gefixt in `0ee1a79`): Residualer `buySuccess` aus dem vorherigen Kauf triggerte beim Re-Open den Success-State instant → Modal schloss ohne neuen Buy. Fix: `openBuyModal` cleart `buySuccess`/`buyError` beim Re-Entry.

### 4. Mystery Box camelCase Service-Cast Bug — `74d9446`
- Anil: "sehe nur gewöhnlich, nicht was ich bekomme".
- RPC `open_mystery_box_v2` returned `{rarity, rewardType, ticketsAmount, ...}` (camelCase), Service castete als snake_case (`reward_type`, `tickets_amount`, ...). `rarity` funktionierte weil gleicher Name, alles andere kam als `undefined` durch. Modal switch auf `result.reward_type` fiel auf default → nichts gerendert außer Rarity-Badge.
- Fix: Service liest jetzt camelCase, Tests angepasst (smallServices.test.ts 39/39 pass).

### 5. ScoutCardStats Repositioning — `b3995bc`
- Anil: "bringe die scoutcard anzeige unter die wertentwicklungsanzeige im home"
- Von Main-Column Top nach direkt unter HomeStoryHeader verschoben.

### 6. TopBar Mobile Overflow — `62f2acd`
- Anil: "profile ragt auf iphone 16 raus"
- Gap-2→1.5, Streak-Badge auf Mobile hidden, Profile-Wrapper border-l/pl-2 erst ab `sm:`, `shrink-0` auf Right-Side.

### 7. Tickets-Pill-Pop-In + Stale Tests + Streak raus — `b1ac20f`
- Anil: "sehe tickets nicht immer, erst wenn ich einen nav item auswähle" + "rauslassen streak"
- Oberflächlicher Fix: `useHomeData` 800ms belowFoldReady-Gate entfernt, Skelett statt conditional-hide, Streak-Badge ganz raus.
- **Dabei gefunden + gefixt**: 4 weitere stale Test-Files aus früheren Commits (useHomeData.test, MysteryBoxModal.test, useMarketData.test, events-v2.test). 
- **ABER: der eigentliche Root Cause war tiefer, siehe #9 unten.**

### 8. Critical Money Bug — `d1de1db`
- Anil: "ich habe in offene angebote ein gebot angenommen obwohl ich den spieler nicht besitze. wurde was gekauft?"
- **Ja. Trade wurde wirklich ausgeführt.** Alp bekam 1× OKUMUŞ aus dem Nichts, test444 bekam 87.30 CR, PBT+Club bekamen Fees.
- Root Cause: `accept_offer` RPC hatte **NULL-Comparison-Loch**. `IF (SELECT COALESCE(quantity, 0) FROM holdings WHERE ...) < v_offer.quantity` — wenn die holdings-Row nicht existiert, liefert die Scalar-Subquery NULL (nicht 0, weil COALESCE per-Zeile läuft). `NULL < 1` = NULL = falsy → Check übersprungen.
- `create_offer` hatte den gleichen Bug via SELECT INTO (v_holding_qty bleibt NULL wenn keine Row).
- Beide RPC Fixes: COALESCE auf Scalar-Variable OUTSIDE der Subquery, plus FOR UPDATE Lock.
- Frontend: `getOpenBids()` gab alle public buy-bids ungefiltert zurück. Fix: `ownedByUserId` Param, filter per Holdings, side='buy' hardening.
- **Rollback** des 11:15 Fraud-Trades komplett: test444 -8730, Alp +9000, Alp.okumus=0, pbt -45, club -45, trade weg, offer cancelled.
- **Historischer Audit** zeigte 2 Spieler mit unbacked Supply (Mendy Mamadou 9, Doğukan Tuzcu 2). Beide sind **Seed-Daten** für Fan-Demo-Accounts (Fan 01, Fan 06), keine Exploit-Trades. Kein weiterer Rollback nötig.
- Task in `memory/pre-launch-checklist.md`: Fan-Accounts bei Pilot-Start löschen + Supply-Invariant CI-Test einbauen.

### 9. Tickets Root Cause FINAL — `[bc87c5b + next commit]` (nach Anils Kritik)
- Anil: "tickets sind nicht immer da, manchal werden sie nicht geladen und dann nicht angezeigt! finde die ursache raus, ich will bessere performance!"
- Mein #7 Fix war oberflächlich. Der wirkliche Root Cause:
  1. `get_user_tickets` RPC **RAISES** `'Nicht authentifiziert'` wenn `auth.uid() IS NULL` (Session noch nicht hydriert auf Initial Load)
  2. `getUserTickets` Service **fängt den Fehler ab und returned `null`** silent
  3. React Query sieht **success mit data=null** → **kein Retry** (default 3× exponential backoff wird nicht getriggert)
  4. Cached null für 30s staleTime → Skelett ewig bis Navigation/Refocus
- Fix: `getUserTickets` **throws** jetzt statt null zurückzugeben. React Query retried automatisch. Nach ~1-2s ist auth ready und die Pill populiert. Null wird nur noch für den legitimen "authenticated, no row yet" Fall returned (aber die RPC liefert in dem Fall `{balance: 0, exists: false}`, kein null — der null-Pfad ist nur noch der "no data at all" Edge-Case).
- tsc clean, 66/66 Tests grün für die betroffenen Test-Files.

---

## Systemisches Problem: Silent-Null-Services

`grep 'if (error) { console.error ... return null/[] }'` in `src/lib/services/` findet das Pattern in:
- `airdropScore.ts` — `refresh()` returns null silent
- `clubChallenges.ts` — returns `[]` silent
- `adRevenueShare.ts` — 3 functions return defaults silent
- `dailyChallenge.ts` — returns null/[] silent
- `fanRanking.ts` — 4 functions return null/[] silent
- `club.ts` — `getClubById` returns null silent
- `wallet.ts` — `getHoldings` / `getWallet` returns null silent
- `trading.ts` — mehrere Stellen
- Weitere — nicht vollständig gesichtet

**Jeder dieser Calls** hat das gleiche Potenzial wie der Tickets-Bug: bei einem temporären Auth-Race oder RLS-Hiccup returned der Service null/[], React Query cached das als Erfolg, UI zeigt Skelett/Empty-State für 30s — und der User sieht es als "ist halt nicht geladen".

→ **Scope für separaten Audit-Sweep** (ein Commit, grep-basiert, alle Services die in der Header/Home/TopBar rendern zuerst).

---

## Commits dieser Session (chronologisch)

| Hash | Message |
|------|---------|
| `7eb7d37` | fix(mystery-box): 3 RPC bugs + server-authoritative daily gate |
| `78f698a` | docs(memory): autodream run #9 + polish-sweep scope-creep audit |
| `87eafd9` | test(e2e): onboarding QA screenshot scripts |
| `59836f9` | fix(trading): confident sell-cancel + instant buy confirmation |
| `0ee1a79` | fix(buy-modal): clear residual buySuccess on re-open |
| `6e1af5d` | fix(trading): force-refetch holdings list after buy, even w/o observer |
| `74d9446` | fix(mystery-box): read camelCase reward fields from v2 RPC response |
| `b3995bc` | feat(home): move ScoutCardStats directly below Wertentwicklung pill |
| `62f2acd` | fix(topbar): profile avatar no longer clips on iPhone 16 |
| `b1ac20f` | fix(topbar): tickets pill always visible + remove streak + fix stale tests |
| `d1de1db` | fix(trading): CRITICAL — accept_offer + create_offer NULL-guard hole |
| `bc87c5b` | docs(memory): pre-launch checklist — seed cleanup + supply invariant |
| `[next]` | fix(tickets): throw on RPC error so React Query retries + session end |

## Code Status (final)

- `tsc --noEmit`: CLEAN
- Betroffene Test-Files alle grün: useHomeData 27/27, smallServices 39/39, MysteryBoxModal 5/5, useMarketData 26/26, events-v2 75/75, offers 50/50
- Pre-existing Live-DB-Integration-Test-Failures (`trading-fees`, `escrow`, `db-invariants`, `bug-regression`, `order-lifecycle`, `boundaries`): **nicht** von dieser Session, state-based, adressiert über `pre-launch-checklist.md`

## Projekt-Status Snapshot

| Thema | Status |
|-------|--------|
| Polish Sweep — Home #1 | ✅ done |
| Polish Sweep — Market #2 | 🔨 in progress (Watchlist-Move + Marktplatz-Tabs pending) |
| Polish Sweep — Fantasy/Player/Profile/Inventory | ⏳ Phase 1 |
| Mystery Box Money-Flow | ✅ 3 RPC bugs + camelCase fix, live verifiziert |
| Trading NULL-Guard Money-Bug | ✅ accept_offer + create_offer + getOpenBids, exploit rolled back, audit clean |
| TopBar Tickets Pop-In | ✅ Root cause gefixt (service throw statt swallow) |
| Silent-Null Services Audit | ⏳ Scope-Flag für separaten Commit |
| Fan-Seed-Cleanup + Supply-Invariant | ⏳ Pre-Launch (pre-launch-checklist.md) |

## QA Accounts (Test-State nach Session)

- **jarvis-qa** (`535bbcaf-f33c-4c66-8861-b15cbff2e136`): 7.950 CR, 5× Ali Arda Yıldız aus IPO-Buy-Verify-Tests (auf Anil's Wunsch behalten). Keine offene Mystery Box (alle heutigen Opens rolled back für Testing).
- **test444** (`782777a7-9e4a-4e5f-9681-0db78db66648`): 9153.07 CR nach Rollback (war 9240.37 durch Exploit → -8730 cents nach Rollback). Keine offene Mystery Box. Exploit-Holdings komplett weg.

## Umgebung / Lokaler State

- Migration Registry weiter drifted aber dokumentiert, Workflow-Regel aktiv
- 8 Pre-existing Test-Files mit DB-abhängigen Failures (siehe oben) — alle beim Pre-Launch Cleanup adressiert

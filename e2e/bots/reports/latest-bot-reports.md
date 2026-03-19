# BeScout Bot Simulation Report
**Datum:** 2026-03-19 15:44
**Bots:** 1

## Executive Summary

| Metrik | Wert |
|--------|------|
| Bugs gefunden | 0 |
| UX Issues | 7 |
| Feature Wishes | 2 |
| Spieler gekauft | 2 |
| Sell Orders | 0 |

## UX Issues

- **[login]** Seite braucht zu lange: Navigation login (33.8s) *(Emre Sniper)*
- **[club]** Seite braucht zu lange: Navigation club (36.2s) *(Emre Sniper)*
- **[market]** Seite braucht zu lange: Navigation market (37.6s) *(Emre Sniper)*
- **[player-detail]** Seite braucht zu lange: Navigation player-detail (36.4s) *(Emre Sniper)*
- **[player-detail]** Seite braucht zu lange: Navigation player-detail (34.5s) *(Emre Sniper)*
- **[player-detail]** Seite braucht zu lange: Navigation player-detail (35.0s) *(Emre Sniper)*
- **[player-detail]** Seite braucht zu lange: Navigation player-detail (34.6s) *(Emre Sniper)*

## Feature Wishes

- **[sniper]** Echtzeit-Benachrichtigungen bei neuen Sell Orders unter Referenzwert
- **[sniper]** Ein Filter fuer Spieler die unter ihrem Referenzwert gelistet sind

---
## Emre Sniper (sniper)
**Strategie:** Wartet auf guenstige Angebote unter Referenzwert. Kauft und verkauft schnell.
**Dauer:** 332s
**Balance:** 43.198 CR → ?
**Gekauft:** 2 | **Gelistet:** 0
**Seiten:** login, club, market, player-detail, buy-modal, sell, sell-modal, community

### Timeline

- `15:39:27` **[login]** Navigiere zur Login-Seite
⏱️ `15:40:00` **[login]** Navigation login: 33818ms
⚠️ `15:40:00` **[login]** Seite braucht zu lange: Navigation login (33.8s)
- `15:40:00` **[login]** Login als bot-sniper@bescout.app
✅ `15:40:36` **[login]** Login erfolgreich (33.8s)
- `15:40:36` **[club]** Besuche Sakaryaspor Vereinsseite
⏱️ `15:41:12` **[club]** Navigation club: 36229ms
⚠️ `15:41:12` **[club]** Seite braucht zu lange: Navigation club (36.2s)
👀 `15:41:12` **[club]** 37 Spieler-Links auf der Vereinsseite
- `15:41:12` **[market]** Oeffne Marktplatz
⏱️ `15:41:50` **[market]** Navigation market: 37626ms
⚠️ `15:41:50` **[market]** Seite braucht zu lange: Navigation market (37.6s)
- `15:41:52` **[market]** Marktplatz Tab geklickt
👀 `15:41:52` **[market]** 5 Spieler auf dem Marktplatz gefunden
- `15:41:52` **[player-detail]** Oeffne Spieler 0021a840
⏱️ `15:42:29` **[player-detail]** Navigation player-detail: 36438ms
⚠️ `15:42:29` **[player-detail]** Seite braucht zu lange: Navigation player-detail (36.4s)
👀 `15:42:29` **[player-detail]** Spieler: Cemil Berk Aksu
👀 `15:42:29` **[player-detail]** Preis angezeigt: 43.198 CR
👀 `15:42:29` **[player-detail]** Badge: Orderbuch?Bestes Gebot–Spread–Bester Ask939,020 Gebote5 AngeboteTiefe anzeigen
👀 `15:42:29` **[player-detail]** Wertentwicklung wird angezeigt
- `15:42:29` **[player-detail]** Klicke Kaufen fuer Cemil Berk Aksu
👀 `15:42:31` **[buy-modal]** Kauf-Modal geoeffnet
👀 `15:42:31` **[buy-modal]** 2 individuelle Verkaufsangebote sichtbar — User kann waehlen
✅ `15:42:31` **[buy-modal]** Orderbook funktioniert: Einzelne Angebote werden angezeigt
👀 `15:42:31` **[buy-modal]** Clubverkauf (IPO) Sektion vorhanden
✅ `15:42:35` **[buy-modal]** Cemil Berk Aksu gekauft!
- `15:42:36` **[player-detail]** Oeffne Spieler 9b536c38
⏱️ `15:43:10` **[player-detail]** Navigation player-detail: 34530ms
⚠️ `15:43:10` **[player-detail]** Seite braucht zu lange: Navigation player-detail (34.5s)
👀 `15:43:10` **[player-detail]** Spieler: Mehmet Demirözü
👀 `15:43:10` **[player-detail]** Preis angezeigt: 42.259 CR
👀 `15:43:10` **[player-detail]** Badge: Orderbuch?Bestes Gebot–Spread–Bester Ask1.661,540 Gebote2 AngeboteTiefe anzeigen
👀 `15:43:10` **[player-detail]** Wertentwicklung wird angezeigt
- `15:43:10` **[player-detail]** Klicke Kaufen fuer Mehmet Demirözü
👀 `15:43:12` **[buy-modal]** Kauf-Modal geoeffnet
👀 `15:43:12` **[buy-modal]** 1 individuelle Verkaufsangebote sichtbar — User kann waehlen
✅ `15:43:12` **[buy-modal]** Orderbook funktioniert: Einzelne Angebote werden angezeigt
👀 `15:43:12` **[buy-modal]** Clubverkauf (IPO) Sektion vorhanden
✅ `15:43:16` **[buy-modal]** Mehmet Demirözü gekauft!
- `15:43:16` **[sell]** Erstelle Verkaufsorder fuer 0021a840
⏱️ `15:43:51` **[player-detail]** Navigation player-detail: 34950ms
⚠️ `15:43:51` **[player-detail]** Seite braucht zu lange: Navigation player-detail (35.0s)
👀 `15:43:53` **[sell-modal]** Verkaufs-Modal geoeffnet
✅ `15:43:53` **[sell-modal]** Referenzwert wird als Orientierung angezeigt
- `15:43:54` **[sell-modal]** Floor-Preis gesetzt
👀 `15:43:56` **[sell-modal]** Kein Feedback nach Listing-Versuch
- `15:43:57` **[sell]** Erstelle Verkaufsorder fuer 9b536c38
⏱️ `15:44:31` **[player-detail]** Navigation player-detail: 34618ms
⚠️ `15:44:31` **[player-detail]** Seite braucht zu lange: Navigation player-detail (34.6s)
👀 `15:44:33` **[sell-modal]** Verkaufs-Modal geoeffnet
✅ `15:44:33` **[sell-modal]** Referenzwert wird als Orientierung angezeigt
- `15:44:34` **[sell-modal]** Floor-Preis gesetzt
👀 `15:44:36` **[sell-modal]** Kein Feedback nach Listing-Versuch
- `15:44:37` **[community]** Besuche Community
💡 `15:44:58` **[market]** Echtzeit-Benachrichtigungen bei neuen Sell Orders unter Referenzwert
💡 `15:44:58` **[market]** Ein Filter fuer Spieler die unter ihrem Referenzwert gelistet sind

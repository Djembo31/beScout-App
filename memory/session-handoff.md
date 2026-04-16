# Session Handoff (2026-04-16)

## Was passiert ist
- Anil unzufrieden mit Zusammenarbeit — zu viel Breite, zu wenig Tiefe, Baustellen lösen sich nicht
- ChatGPT als Second Opinion: 10 Core-Flows härten statt Features bauen
- Begriffswelt-Audit + Typen-Kette-Audit durchgeführt (2 Explore Agents)
- i18n Konsistenz-Cleanup: de.json (~80 Änderungen) + tr.json (~30 Änderungen)
- Anil hat abgebrochen — "wir gehen anders vor"

## Begriffsentscheidungen (bestätigt)
1. **Marktplatz** (statt Transfermarkt/Markt/Market — 4 Varianten eliminiert)
2. **Handel** (statt Trading), **Deal/Deals** (statt Trade/Trades)
3. **Mein Kader** (statt Bestand/Sammlung/Spielerkader — 4 Varianten eliminiert)
4. **Spieltag** (Nav) + **Fantasy** (Feature-Name)
5. **Scout Card** (bleibt EN, Branding)

## Typen-Kette Status (aus Audit)
- GRÜN: Wallet, Holdings, Orders, Profile/Auth, IPO, Offers, Bounties
- GELB: Transactions (3 Types source/type), Player (shirt_number→ticket mapper), Wildcards (kein unified Type)
- ROT: Fantasy (entry_fee deprecated aber 80+ Refs, Mapper-Fallback funktioniert)

## Offene Warnungen
- 7 pre-existing DB-Integration-Test-Failures (INV-07/08, AUTH-08, EDGE-17, MF-ESC/WAL, TURK-03)
- entry_fee→ticket_cost Migration: zu tief für Cleanup, braucht eigenen Task
- Hardcoded Admin-Fehlermeldungen (nicht user-facing, niedrige Prio)

## Anils Richtung
- "Wir gehen anders vor" — nächste Session wird Anil den neuen Ansatz definieren
- Core-Thesis bleibt: Systemhärtung > Featurebau, 10 Core-Flows belastbar machen

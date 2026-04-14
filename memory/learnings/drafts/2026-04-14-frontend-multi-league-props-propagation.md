**2026-04-14 — Frontend / Props-Propagation-Sweep nach Player-Feldergaenzungen**

Observation: Nach Multi-League-Expansion (Commit 8a5014d: 7 Ligen, 4.263 Spieler) wurden `leagueShort`/`leagueLogoUrl`/`leagueCountry`/`league` auf Player-Type gelegt, aber NUR BestandPlayerRow und PlayerIPOCard bekamen die Badge. 4 Player-UIs (TradingCardFrame Front+Back, PlayerHero, TransferListSection) blieben blind — ueber 4 Wochen bis J3-Audit unentdeckt.

Pattern: Wenn neue Player-Felder optional ergaenzt werden, ist Null-Guard "FIX genug fuer Runtime" — aber Consumer bleiben **silent outdated**. TSC merkt nichts (optional fields). Tests merken nichts (keine UI-Assertions auf League-Badge). Visual QA uebersieht's (Sakaryaspor-Pilot = alle Spieler gleiche Liga).

Audit-Signal: Neue Player-Felder → grep nach `<Player` Render-Call-Sites (TradingCardFrame, PlayerHero, PlayerIdentity, PlayerRow, BestandPlayerRow, KaderPlayerRow, PlayerIPOCard, TransferListSection, BuyModal sub-components) UND fuer JEDE manuell pruefen ob neues Feld gerendert werden MUSS. Checklist als Teil von `/impact` Skill: "Neues Player-Feld → diese 8+ Components auditieren".

Confidence: high (bestaetigt ueber J3F-02..05 + Cross-Check mit BestandPlayerRow-Pattern, der es schon hatte).

# Money-Modell Drift-Inventur — Checkliste für den Glattzug (→ D99)

> Erstellt 2026-06-24 aus dem Slice-365-E2E-Durchlauf (ein einziger echter Trade deckte systemischen Drift auf).
> **SSOT = D99** (`memory/decisions.md`). Jede Stelle unten wird auf D99 ausgerichtet — KEIN Massen-Edit ohne Anils Ratifikation der OFFEN-Punkte in D99.
> Quelle: Explore-Agent-Inventur (very thorough), 5 Kategorien, ~40 Fundstellen.

## Kern-Konflikte (die 5 systemischen)
1. **3 Namen für dieselbe Einheit:** `BSD` (VISION.md durchgängig, i18n-Key-Name, DB/Code), `$SCOUT` (rules/, treasury.md, decisions.md, Code-Kommentare), `Credits` (alle user-facing Strings via `de.json:27`/`tr.json:27` `"bsd":"Credits"`).
2. **Faktor-100-€-Widerspruch:** trading.md:21 / treasury.md:96,105 / D83 „1 $SCOUT = 1 cent = 0,01 €" **vs** CLAUDE.md:40 „1.000.000 cents = 10.000 $SCOUT" (= 1 $SCOUT=100 cents) **vs** Live-Code `centsToBsd = cents/100` (players.ts:170).
3. **Phasen-Nummerierung:** business.md ADR-028 = **1/3/4** (Token/Cash-Out = Phase 3 nach CASP) vs treasury.md:31 + D83 = **1/2** (Cash-out = Phase 2). Auch beta-exit-criteria.md:68 (Phase 3), VISION.md:339 (Phase 1/3).
4. **CASP-Strategie-Widerspruch:** `wiki/scout-launch-strategie.md:19-20` „**Keine CASP-Lizenz**, nur MiCA Title II / NCA-Notification, Token in 5-6 Monaten" **vs** business.md/business-model.md „Token erst Phase 3 **nach CASP**".
5. **`docs/CONCEPT-DPC-ECONOMY.md` in sich selbst widersprüchlich:** Header Z.20-21 + ADR-020 Z.412 = korrigierter Kurs (100 $SCOUT/€), aber Tabelle Z.339-344 + Beispiele Z.210/225/372/375 + DB-Kommentar Z.487 tragen noch den **alten Faktor (10.000 BSD/€)**. Größte Einzeldatei-Drift.

## Checkliste nach Datei (auf D99 ausrichten)

### A) Einheit $SCOUT↔cent↔€
- [ ] `.claude/rules/trading.md:12,21,31,41` — Einheiten-Definition + Beispiele
- [ ] `CLAUDE.md:40` — „1.000.000 = 10.000 $SCOUT"
- [ ] `docs/knowledge/domain/treasury.md:88,94,96,105` — €-Bezug + „kein Peg"-Hinweis (schon teil-markiert)
- [ ] `docs/knowledge/INDEX.md:33` — „1 $SCOUT=1 cent"
- [ ] `wiki/scout-cards.md:18-19`, `wiki/business-model.md:49`
- [ ] `memory/decisions.md` D83:3531 — €-Bezug (auf D99 als „ICO-Zeit" verweisen)
- [ ] `memory/patterns.md:219-222`, `memory/beta-exit-criteria.md:56`
- [ ] `docs/CONCEPT-DPC-ECONOMY.md:20-21,210,213,225,228,339-344,372,375,412,487` — **interner Selbstwiderspruch heilen**
- [ ] Code-Vokabular: `src/lib/services/players.ts:170-177` (`centsToBsd` JSDoc „→ $SCOUT"), `src/lib/services/wallet.ts:279-281` (`formatScout`), `src/lib/utils.ts:5-8` (`fmtScout` Doppel-Formatter)

### B) Card-/IPO-Pricing-Formel
- [ ] `.claude/rules/trading.md:23-25,32` — Formel + Manaj-Diskrepanz (250k vs Formel 220k)
- [ ] `docs/knowledge/domain/treasury.md:80` („**kein** starrer MV/1000-Automatismus" — Vereins-Entscheidung) **vs** `wiki/business-model.md:48` („Card-Preis **fix** = MV/10") — auflösen
- [ ] `wiki/scout-cards.md:24-30,67`, `docs/knowledge/INDEX.md:33`
- [ ] `docs/CONCEPT-DPC-ECONOMY.md:48,112,121` — freie IPO-Preiswahl vs MV-Formel
- [ ] **Data-Drift-Fix:** `ipo_price` der Nicht-Top-Spieler per Formel neu setzen (eingefroren bei Launch; Douglas Willian MV 500K = 10 statt ~500 Credits). Top-Spieler (Mbappé) sind korrekt.

### C) Anzeige-Einheit „Credits/CR/BSD"
- [ ] `messages/de.json:27` + `tr.json:27` `"bsd":"Credits"` — zentrale Mapping-Definition
- [ ] `.claude/rules/trading.md:15` („`$SCOUT` user-sichtbar" — falsch, UI zeigt „Credits")
- [ ] `src/components/help/Glossary.tsx:19`, `.claude/rules/errors-db-detail.md:524` („CR")
- [ ] `wiki/scout-cards.md:84`, viele `de.json`/`tr.json`-Strings (Z.201,213,319,333,513,602,730,843,961-978,1256,1327,1435 …)
- [ ] **Code-Funktionsnamen** vereinheitlichen (`centsToBsd`/`bsdToCents`/`formatScout`/`fmtScout`)

### D) $SCOUT-Begriff (Credits/Utility-Token/Coin/Währung) + €-Andeutung
- [ ] `.claude/rules/business.md:6,13-14`, `.claude/rules/trading.md:109-110`, `CLAUDE.md:3,59`
- [ ] `memory/beta-onboarding.md:22,86` („Währung"/„para birimi" — Coin-Andeutung)
- [ ] `docs/VISION.md` — durchgängig „BSD" (Z.20,50,54,112…) → Begriff vereinheitlichen
- [ ] `docs/CONCEPT-DPC-ECONOMY.md:10-12,20,99,397-401,407` — „echtes Geld"/„Investiert"/„Token-Identität" (Compliance-kritisch)
- [ ] `wiki/business-model.md:78` („Scout Credits"), `memory/ceo-approval-matrix.md:22` ($SCOUT-Wording = CEO-pflicht)

### E) Phasen-Sprache (Token/Coin/ICO/Cash-Out/CASP)
- [ ] **Phasen-Nummerierung 1/3/4 vs 1/2** vereinheitlichen: business.md:5-8, treasury.md:31-32, decisions.md D83:3531,3552, VISION.md:339, beta-exit-criteria.md:68,140, wiki/business-model.md:62-63
- [ ] **CASP-Strategie klären:** wiki/scout-launch-strategie.md:19-20,72-80 vs Phasen-Docs
- [ ] treasury.md:96-98 (ICO-Plan €0,01/€0,03) auf D99 „ICO-Zeit, nicht jetzt" markieren

## Nicht vergessen (Meta)
- `de.json`/`tr.json` zeigen **nie** einen €-Wert neben Credits → gut, so halten.
- Einzige €-nahe user-facing Stellen: `memory/beta-onboarding.md` / `beta-testplan.md` (Doku, nicht App-UI).
- Diese Inventur ist die **Checkliste**; abhaken beim Glattzug, nichts neu erfinden — alles auf **D99**.

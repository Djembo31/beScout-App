---
description: Business-Regeln, Compliance und Geofencing
---

## Licensing-Phasen (ADR-028 · neu nummeriert 1/2/3 per D99 2026-06-24)
- Phase 1 (jetzt): Scout Card Trading (Credits = wertloses Spielgeld, kein €-Wert), Free Fantasy, Votes, Events, Scout Reports
- Phase 2 (nach gültiger Token-Lizenz — Route CASP vs MiCA Title II = Anwalt vor ICO): $SCOUT-Coin (ICO), Cash-Out, Exchange — NICHT BAUEN
- Phase 3 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN
- Kill-Switch: Founder-Pass-Sales bei EUR 900K stoppen — IMPLEMENTIERT in `src/app/(app)/bescout-admin/AdminFoundingPassesTab.tsx` (`KILL_SWITCH_LIMIT_EUR = 900_000`, Progress Bar + `fpKillSwitchError` Toast)

## Wording-Compliance (KRITISCH)
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns"
- IMMER: Utility Token, Platform Credits, Scout Assessment, "at BeScout's discretion"
- User-facing Einheit = "Credits" (Platform Credits, nicht Kryptowaehrung). "$SCOUT" = Name des ICO-Coins (Phase 2). "BSD" = Legacy, deprecatet — nicht user-facing.
- Scout Card = "Digitale Spielerkarte" (nicht Spieleranteil, kein Eigentum)
- Code-intern bleiben Variable/DB-Column-Namen mit "dpc" (nur UI umbenannt)
- Disclaimers auf JEDER Seite mit $SCOUT/DPC (TradingDisclaimer Component)
- Fantasy-Bereich: FantasyDisclaimer Component auf jeder Seite/Modal mit Rewards
- **IPO-Begriffsregel (AR-7, Journey #2):** Kuerzel "IPO" (Initial Public Offering) ist
  Securities-Terminologie und triggert potenziell SPK/MASAK-Signale.
  - User-facing Strings: IMMER "Erstverkauf" (DE) / "Kulüp Satışı" (TR)
  - Admin-facing Strings (Club-Admin-Panel, Analytics): "IPO" darf bleiben
  - Code-intern (Variablen, DB-Columns, i18n-Keys): "ipo" darf bleiben (nur Values uebersetzt)
  - Glossar user-facing: title = "Erstverkauf" / "Kulüp Satışı"

## Kapitalmarkt-Glossar (AR-17, Journey #3 + AR-32+39 Journey #4)

Systematische Umbenennung von Securities- und Gluecksspiel-Terminologie in user-facing Strings.
Code-intern (Variablen, DB-Columns, i18n-Keys) bleiben Namen — nur Values ueberuebersetzt.

### Securities-Terminologie (SPK/MiCA Red-Flag)
| Verboten (user-facing) | Stattdessen DE | Stattdessen TR | Begruendung |
|------------------------|----------------|----------------|-------------|
| IPO (Kuerzel) | Erstverkauf | Kulüp Satışı | SPK/MASAK Signal |
| Orderbuch | Angebots-Tiefe | Teklif Derinliği | Boersenterminologie |
| Trader (als Rolle) | Sammler, Scout | Koleksiyoncu, Scout | Securities-Identitaet |
| Portfolio (Invest-Objekt) | Sammlung, Kader | Koleksiyon, Kadro | Invest-Framing |
| Handle clever | — streichen oder "Sammle gezielt" | — streichen oder "Akıllıca topla" | Spekulationsstrategie |
| am Erfolg beteiligen | optionale Community Success Fee | isteğe bağlı Topluluk Başarı Ücreti | Gewinnbeteiligung = Finanzinstrument |
| Marktwert steigt → Fee steigt | Die Hoehe... haengt von Markt-Bewertung ab | Miktar piyasa değerlemesine bağlıdır | Rendite-Kausalitaet |

### Gluecksspiel-Vokabel (StGB §284, MASAK-Risiko)
| Verboten (user-facing) | Stattdessen DE | Stattdessen TR | Begruendung |
|------------------------|----------------|----------------|-------------|
| Prize, Prämie | Reward, Belohnung | Ödül (neutral) | Prize = Gluecksspiel |
| Preisgeld, Preispool | Rewards-Pool | Ödül Havuzu | StGB §284 Auszahlung |
| gewinnen (Verb) | sammeln, erhalten | topla, al | Gluecksspiel-Duden |
| Gewinner | Top-Platzierung | Üst Sıralama | Substantivform von gewinnen |
| gewonnen (Partizip) | erhalten, erreicht | alınan, ulaşıldı | Partizip ebenso betroffen |
| kazan* (TR Fantasy) | topla, al, elde et | — | MASAK §4 Abs.1 e |
| Manager: Gewinne Events | Manager: Stelle Lineups auf und platziere dich | Manager: Lineup'unu kur ve sıralamaya gir | Gewinn-Maximierer-Rolle |

### Reinvestment-Anti-Pattern
- NIEMALS Post-Event Reward-Modals mit Trading-CTA (z.B. "Aufstocken", "Güçlendir")
- Neutrale CTAs: "Schließen", "Zum Kader", "Kapat", "Kadroya Git"
- Begruendung: SPK-Anti-Pattern — Gluecksspiel-Reinvestment-Zyklus (Reward → Reinvest → Reward...)

### CI-Guard (empfohlen — Pre-Commit Hook post-Beta)
```bash
grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b" messages/*.json | grep -iE "fantasy\\.|home\\.|welcome\\.|intro" | grep -v "gewinnLabel"
grep -iE "Marktwert steigt|piyasa değeri artınca|başarıya ortak|am Erfolg beteilig|Handle clever|akıllıca işlem" messages/*.json
```
Treffer → prüfen: Ist es in User-Kontext? → Neutralisieren nach Tabelle oben.

## Asset-Klasse-Positionierung — Wording-Drahtseilakt (Stand 2026-04-24)

**Kategorie-Innovation:** Scout Cards sind strukturell Equity-analog auf Spieler-Trajektorie (siehe `docs/VISION.md` Sektion „Kategorie-Innovation"). Das ist der Produkt-Vorteil. **Genau deshalb ist die rechtliche Sprache der wichtigste Compliance-Drahtseilakt.**

### Doppel-Register (intern vs. user-facing)

| Im Kopf (Produkt-Wahrheit) | Im Wort (Marketing-Pflicht) |
|---|---|
| Scout Cards = Equity-artiger Asset | Scout Cards = digitale Sammelkarte mit Trading-Utility |
| Fan investiert in Spieler | Fan sammelt + handelt Platform-Credits |
| Club verkauft Anteile am Talent | Club gibt Sammelkarten mit Utility aus |
| Rendite bei Erfolg | Utility-Credits durch aktive Teilnahme |
| Marktplatz für Fußball-Asset-Klasse | Marktplatz für Sammelkarten + Scout-Reports |

Beide Register dürfen in der Produkt-Erfahrung gleichzeitig wirken. **Nur das Utility-Register darf geschrieben stehen.** Investor-Pitches + interne Strategie-Dokumente dürfen das Asset-Register nutzen — Plattform-Text niemals.

### Erweitertes Verbots-Register (Session 2026-04-24 Strategic Discussion)

Ergänzend zum Kapitalmarkt-Glossar oben. Diese Begriffe sind aus strategischen Gesprächen entstanden (Asset-Klasse-Framing) und dürfen user-facing niemals verwendet werden:

| Verboten (user-facing) | Stattdessen DE | Stattdessen TR | Begruendung |
|------------------------|----------------|----------------|-------------|
| Investiere in Spieler/Talente | Unterstütze Talente, Entdecke früh | Yetenekleri destekle, Erken keşfet | Investment-Framing = Securities-Signal |
| Investiere in BeScout | Sammle Scout Cards | Scout Card topla | Plattform-Investment-Framing |
| Rendite, Profit, Gewinn (Subst.) | Belohnung, Upside, Scout-Gewinn | Ödül, kazanç-yok: sadece skor | Finanzinstrument-Sprache |
| Dividende, Ausschüttung | PBT-Auszahlung, Community-Reward | PBT ödemesi, Topluluk ödülü | Securities-Dividende |
| Asset-Klasse, Anteile, Shares | — (nur Investor-Pitch) | — | Kapitalmarkt-Vokabular |
| Handle smart, Invest clever | Scoute gezielt, Sammle mit Weitblick | Akıllıca scout ol | Spekulationsstrategie |
| Verdiene Geld (als Marketing-Hook) | Deine Leidenschaft zahlt sich aus | Tutkun karşılığını buluyor | Transaktional vs. Aspirational |

### Meme-Coin-Sprache — komplett verboten

Auch wenn marketing-wirksam: Meme-Coin-Vokabular triggert Spekulations-Framing → SPK/BaFin-Red-Flag **und** zerstört die Creator-Economy-Positionierung (Zielgruppe wird abgestoßen).

- Verboten: „to the moon", „diamond hands", „HODL", „ape in", „degen", „bagholder"
- Verboten: „x10", „x100", „moonshot"
- Verboten: „FOMO" (als CTA), „send it", „pump"

Grund: BeScout zielt auf Football-Manager-Community (primärer Beachhead) — diese Zielgruppe identifiziert sich NICHT mit Crypto-Kultur, sondern mit Scout-Professionalität. Meme-Coin-Sprache kostet uns beide Seiten.

### Zielgruppen-differenziertes Wording

**FM-Community** (primärer Beachhead, siehe VISION.md):
- OK: „Dein FM-Wissen wird belohnt", „Scoute real, nicht nur im Game"
- NICHT OK: „Dein FM-Wissen wird dein Investment", „Verdiene an jungen Talenten"

**Creator-Economy** (Tertiär-Zielgruppe):
- OK: „Monetarisiere deine Reichweite", „Bau dir eine Audience auf BeScout"
- NICHT OK: „Generiere passives Einkommen", „Aufbau eines Revenue-Streams"

**Club-B2B-Pitch** (Maria-Persona, Admin-Kontext):
- OK: „Neue Revenue-Streams für euren Club", „Fan-Monetarisierung auf Engagement-Basis"
- Admin-UI: „IPO" bleibt (Code-intern)
- Fan-UI: „Erstverkauf" / „Kulüp Satışı" pflicht

### Erweiterter CI-Guard (post-Beta empfohlen)

```bash
# Invest-Framing in User-Strings
grep -iE "\binvestier|rendite|dividende|anteil|\bshare\b|\bprofit\b|\byield\b|asset[- ]klasse" messages/*.json \
  | grep -v "scout-gewinn-animation\|technologie-gewinn"

# Meme-Coin-Framing
grep -iE "moonshot|hodl|diamond hands|degen|\bape\b|to the moon|bagholder" messages/*.json

# Transaktionales Marketing-Framing
grep -iE "verdiene geld|passives einkommen|generiere revenue" messages/*.json

# Securities-Valuation-Adjektive (Slice 224 — Phase-A-Re-Audit 2026-04-27)
grep -iE "unter[- ]?bewertet|über[- ]?bewertet|düşük değerli|yüksek değerli" messages/*.json

# Trading-Position-Vokabular (Slice 224)
grep -iE "\bposition\b|\bpozisyon\b|long-?position|short-?position" messages/*.json \
  | grep -v "Position(en)? auf|Spielposition|Position spielen"
```
Treffer → Kontext prüfen (User-facing?) → Neutralisieren nach Tabellen oben.

### Verbots-Erweiterung Slice 224 (Sentiment-Wording-Heal, Phase-A-Re-Audit 2026-04-27)

Targeted Re-Audit auf BuyConfirmModal-Sentiment-Tooltips fand Securities-Valuation-Drift in Casual-Education-Wording. Folgende Begriffe sind ab Slice 224 explizit verboten user-facing:

| Verboten (user-facing) | Stattdessen DE | Stattdessen TR | Begruendung |
|------------------------|----------------|----------------|-------------|
| unterbewertet / überbewertet | stark/schwach einschätzen, stark/schwach bewertet (kontextabhängig) | güçlü/zayıf bulmak | Securities-Under-/Overvaluation-Begriff. Suggeriert "wahrer Wert" + "Marktabweichung" → Rendite-Logik. |
| düşük değerli / yüksek değerli | — | güçlü / zayıf | TR-Direktübersetzung von under-/overvalued. MASAK-Risiko, gleiche Wurzel wie DE. |
| Position (Trading-Sinn, singular) | Einschätzung, Stimmung, Haltung | görüş, kanaat | Trading-Vokabular (long/short position). Driftet Trader-Identität — verboten analog zu Portfolio (Tabelle "Asset-Klasse-Positionierung"). |
| pozisyon (Trading-Sinn) | — | görüş, kanaat | TR analog. |
| Bewertung (im Sentiment-Kontext) | Einschätzung, Stimmung | görüş, değerlendirme bleibt OK in research-Domain | "Bewertung" + "Scout" zusammen → Asset-Klasse-Frame ("ein Scout bewertet einen Asset"). "Einschätzung" hält Talent-Späher-Identität. |

**Anti-Pattern:** "X Scouts halten den Spieler für ..." — die Phrase impliziert Securities-Konsensus zu einem latenten "wahren Wert". Stattdessen "X Scouts schätzen den Spieler ... ein" / "X Scout oyuncuyu ... buluyor" → keine Wert-Asymmetrie-Suggestion.

**Zielgruppen-Anker:** FM-Veteranen kennen "unter-/überbewertet" aus Comunio/Kicker — verstehen es korrekt im Equity-Frame. Casual-User nicht. Im Money-Path (Buy-Confirm) ist Education-Wording mit Securities-Begriffen ein Action-Push (Spekulation triggern). Daher Verbot auch wenn Kohärent mit FM-Sprache.

## Geofencing-Tiers
| Tier | Laender | Zugang |
|------|---------|--------|
| TIER_FULL | Rest EU | Alles |
| TIER_CASP | EU ohne Gaming | Trading ja, Paid Fantasy nein |
| TIER_FREE | DE/FR/AT/UK | Free only, kein Paid Fantasy |
| TIER_RESTRICTED | TR | Content + Free Fantasy only |
| TIER_BLOCKED | USA/China/OFAC | Kein Zugang |

## Sales-Pakete (B2B, fuer Club-Onboarding)
| Paket | Kader | Werbeflaechen | BSD-Pool |
|-------|-------|--------------|----------|
| Baslangic | 30 | 2 | 100K |
| Profesyonel | 50 | 5 | 500K |
| Sampiyon | unbegrenzt | 10+ | 2M |
- Implementierung ERST wenn erster Club-Deal real wird

## Fee-Split Uebersicht
| Quelle | Platform | PBT | Club | Creator |
|--------|----------|-----|------|---------|
| Trading | 3.5% | 1.5% | 1% | — |
| IPO | 10% | 5% | 85% | — |
| Research | 20% | — | — | 80% |
| Bounty | 5% | — | — | 95% |
| Polls | 20% | — | — | 80% |
| P2P Offers | 3.5% | 1.5% | 1% | — |
| Club Abos | 0% | 0% | 100% | — |

## Platform Treasury (ADR-026)
- Fees = impliziter Burn (deflationary)
- Rewards = kontrolliertes Minting (Welcome Bonus, Missions, Achievements)
- Airdrops = Treasury-Redistribution (post-Pilot)

## i18n
- next-intl, `t()` nutzen, Cookie `bescout-locale`
- Messages in `messages/{locale}.json`
- Aktuell: DE + TR

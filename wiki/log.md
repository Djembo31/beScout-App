# Wiki Log

> Append-only. Neueste Eintraege oben.

## [2026-04-21] Pre-Beta-Check — Overview + Roadmap Rewrite
- Seiten: bescout-overview.md, product-roadmap.md
- Typ: major rewrite
- Quelle: Codebase-Audit + worklog/log.md Slice 083-125 (40+ Slices seit Wiki-Erstellung)
- Änderungen overview: Core Features verdoppelt (20 statt 7), neue Sektionen Data-Quality + Performance, noch-nicht-gebaut auf KYC + Vercel Env Vars minimiert
- Änderungen roadmap: Prio 1 fast alle ✅ (nur KYC + Sentry Env Vars offen), Technische Gaps reduziert, Wave-Dokumentation Slice 083-125
- Querverweise: [[scout-cards]], [[business-model]]

## [2026-04-21] Business Model — Pricing-Asset-Model Sektion aktualisiert
- Seite: business-model.md
- Typ: section update
- Änderungen: "Community Success Fee" Sektion komplett neu mit Linear-Formel (MV_EUR/10 cents), 1× = 0,01 € Konvention, korrigierte Growth-Beispiele (5× = 5×, nicht 150×), Cap-Schutz. Historische Tier-Table-Drift + Slice 108/114 Backfill dokumentiert.
- Querverweise: [[scout-cards]], `memory/decision_pricing_asset_model.md`

## [2026-04-21] Scout Cards — Pricing-Asset-Model komplett überarbeitet
- Seite: scout-cards.md
- Typ: major update
- Quelle: Anil Slice 108 (liquidate_player Linear Formula) + Slice 114 Backfill + Sivasspor-DB-Verifikation
- Änderungen:
  - Neue Sektion "Pricing-Asset-Model" mit Einheit (1 $SCOUT = 1 cent = 0,01 €), Card-Preis-Formel (MV_EUR / 10 cents), 10%-Community-Cap-Regel (max 10.000 Cards)
  - Bekir-Baseline (Sivasspor) + Livan Burcu (Union Berlin) als Verifikation
  - Beispiel-Table 1 Mio → 5 Mio € Liquidation (Club/Holder/Platform/PBT-Bilanz)
  - Historische Drift-Korrekturen (Slice 108/111/114) dokumentiert
  - Floor Price Hierarchy ohne `reference_price` Fallback (Slice 112 deprecate)
  - Liquidation-Sektion Linear Formula + 3 Geldquellen (Success Fee + PBT + Mastery-Multiplier cap 1,15×)
- Querverweise: + `memory/decision_pricing_asset_model.md`, `.claude/rules/trading.md`

## [2026-04-07] $SCOUT Launch Strategie ingestiert
- Seite: scout-launch-strategie.md
- Typ: created
- Quelle: BeScout_SCOUT_Launch_Strategie.docx (Kemal, April 2026)
- Inhalt: 6-Monats-Plan Token Launch, Malta Ltd, Founding Pass, Sueper Lig Go-to-Market, Cashflow-Projektion
- Querverweise: business-model, compliance, socios-chiliz, early-feedback-freundeskreis

## [2026-04-07] Produkt-Wiki komplett (8 Seiten)
- Seiten: bescout-overview.md, business-model.md, compliance.md, scout-cards.md, fantasy-tournaments.md, gamification.md, equipment-system.md, product-roadmap.md
- Typ: created (8 Seiten)
- Quelle: Codebase-Scan (Rules, Memory, Types, Features, Decisions)
- Alle Produkt-Features, Business Model, Compliance, Roadmap dokumentiert + querverlinkt

## [2026-04-07] Competitor-Analyse (7 Seiten + Vergleichsmatrix)
- Seiten: sorare.md, socios-chiliz.md, onefootball.md, kickbase.md, comunio.md, hattrick.md, fancraze.md, vergleich-competitors.md
- Typ: created (8 Seiten)
- Quelle: Web-Recherche (3 parallele Agents)
- Erkenntnis: BeScout sitzt allein im Quadrant "Earning + Wissen-basiert". Kein Konkurrent verbindet beides ohne Crypto-Risiko.
- Querverweise: Alle Seiten untereinander + zurueck zu early-feedback-freundeskreis.md verlinkt

## [2026-04-07] Early Feedback — Freundeskreis (Update)
- Seite: early-feedback-freundeskreis.md
- Typ: updated
- Quelle: Anil direkt
- Aenderungen: Hook = "mit Wissen Geld verdienen" (nicht Club-Loyalitaet). Sakaryaspor kein Fokus mehr. Freunde als Beta-Tester verfuegbar.

## [2026-04-07] Early Feedback — Freundeskreis
- Seite: early-feedback-freundeskreis.md
- Typ: created
- Quelle: Gespraeche Anil mit engem Freundeskreis
- Aenderungen: Erste Wiki-Seite. Demand-Signal fuer $SCOUT Token, Begeisterung vor Launch.

## [2026-04-07] Wiki erstellt
- Schema angelegt (SCHEMA.md)
- Leerer Index + Log
- Bereit fuer ersten Input

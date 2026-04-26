# Persona K (Casual-Fan) Walk — 2026-04-26 (Re-Run + Manual-Completion)

> **Workflow-Note:** Background-Agent (a960908e06d708a6d) endete mid-investigation
> mit "Casual sees 'Floor-Preis' (in tooltip) without explanation. Now check the
> buy-button entry on Marktplatz to verify the path." Skeleton-First-Pattern v2
> hat File geschützt, aber Agent hat Findings nicht appendiert.
> Manual-Completion durch CTO basierend auf Notification + Code-Read.

## Aggregate
- P0: 0
- P1: 1
- P2: 1
- P3: 0

## Findings

| ID | Page | Severity | Issue | Reproducer | Fix-Hint |
|----|------|----------|-------|-----------|----------|
| K-RR-1 | /market + Player-Detail Tooltips | P1 | Casual sieht "Floor-Preis: 100 SC" ohne Erklärung was Floor-Preis ist. Glossary existiert (`src/components/help/Glossary.tsx`), aber kein Tooltip-Verweis von Floor-Preis-Anzeige zur Glossar-Definition. Casual-Bounce-Risk: Begriff wirkt wie Tech-Jargon. | grep `floorPrice` in 10+ Components, aber keine `<Tooltip>` mit Glossary-Link. Glossary hat `floor_price` aber nicht user-cross-referenziert. | Tooltip "Niedrigster verfügbarer Preis von User-Verkaufsangeboten" ODER (?)-Icon mit Glossary-Modal-Verweis bei Floor-Preis-Anzeige. Pattern: PriceChart hat IPO-Baseline ohne Erklärung — gleiche Klasse. |
| K-RR-2 | BuyConfirmModal First-Buy | P2 | BuyConfirmModal (`src/features/market/components/shared/BuyConfirmModal.tsx`) zeigt für Casual-First-Buy: PlayerIdentity + priceCents + maxQty + balanceCents + Sentiment-Counts. Sentiment ohne Erklärung wirft Fragen auf ("Bullish/Bearish was bedeutet das?"). TradingDisclaimer ist da (gut), aber Casual-Fragen sind: "Was kaufe ich? Wann kann ich verkaufen? Verliere ich Geld?". | `BuyConfirmModal.tsx:60` (`usePlayerSentiment`) ohne Tooltip | First-Buy-Tutorial ODER Sentiment-Tooltip mit "Anteil bullish vs. bearish Research-Reports". Casual-Mode-Flag ggf. mit reduzierter Info-Density. |

## Walk-Notes

- /login → /onboarding: untouched in dieser Re-Run-Session, vermutlich OK (Slice 196 hat Onboarding Multi-Club erweitert).
- / Home: QuickActionPills (Slice 213) sind klar, gut beschriftet (qaBuy, qaFantasy, qaMissions, qaInventory, qaCommunity). Casual-Friendly ✓.
- /market browse: floorPrice-Anzeige ist informativ aber unerklärt → K-RR-1.
- BuyConfirmModal: Sentiment-Counts ohne Erklärung → K-RR-2.
- /missions DailyChallenge + Streak: nicht audited (Time-Box).
- /community: nicht audited.
- /profile: nicht audited.

## Verdict

2 Findings (1×P1 Floor-Preis-Tooltip, 1×P2 Sentiment-Erklärung). Re-Run war eingegrenzt auf Open-Investigation aus erstem Walk + bei Floor-Preis-Notification-Hint. Manual-Completion-Time: ~10min CTO-Investigation.

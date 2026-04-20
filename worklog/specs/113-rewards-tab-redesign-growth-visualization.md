# Slice 113 — RewardsTab UI Redesign (Linear Growth Visualization statt Tier-Ladder)

## Ziel (1 Satz)
RewardsTab zeigt dem User die linearen CEO-Pricing-Payouts als Growth-Chart/Slider, nicht mehr als Tier-Ladder mit 10 Stufen — weil die zugrundeliegende Formel `MV/10` kontinuierlich ist.

## Root-Cause (Audit Slice 108)

- Nach Slice 108 liefert `SUCCESS_FEE_TIERS` pro Bucket eine linear-abgeleitete `fee` — aber das visuelle Ladder-Layout (10 Stufen, getrennt dargestellt) suggeriert künstliche Plateaus.
- User-facing wäre eine kontinuierliche Darstellung ehrlicher: "Wenn MV 5× steigt → dein Payout 5× steigt".
- `src/components/player/detail/RewardsTab.tsx:82-160` rendert `SUCCESS_FEE_TIERS.map(...)` → dense list, macht nur bei Tier-Basis Sinn.

## Design-Optionen

### Option 1: Growth-Multiplier-Chart
- X-Achse: MV-Multiplier (1×, 2×, 5×, 10×, 20×)
- Y-Achse: Payout in $SCOUT
- Marker: aktueller MV, IPO-Einstiegspreis
- Formel wird als Tooltip angezeigt

### Option 2: Interactive Slider
- User zieht Slider "wenn MV wächst auf X €" → Live-Preview Payout pro Card
- Nutzt `calcSuccessFee()` direkt

### Option 3: 3 Milestone Cards (Simple)
- "Heute" (current MV-payout)
- "Verdoppelt" (MV × 2)
- "Verfünffacht" (MV × 5)
- "Verzehnfacht" (MV × 10)

## Recommended: Option 3 (MVP) → Option 1 (später)

Begründung: Simpel, verständlich, matched "Spieler kam mit X, ist heute Y" Storytelling.

## Betroffene Files

- `src/components/player/detail/RewardsTab.tsx` — komplett redesign
- `messages/de.json` + `messages/tr.json` — neue i18n-Keys (rewardGrowthToday, rewardGrowthDoubled, rewardGrowth5x, rewardGrowth10x)
- Wegfall: Ladder-Komponente (oder behalten als expandable detail view)
- `SUCCESS_FEE_TIERS` Array bleibt (für Ladder-Fallback + Tests), aber nicht mehr primär visualisiert

## Acceptance Criteria

1. Neuer RewardsTab zeigt 3-4 Milestone-Cards mit MV-Growth + Payout pro Card.
2. Formel-Tooltip: "BeScout Reward-Formel: Payout = Marktwert / 100.000 €"
3. Mobile 393px Layout: Cards vertikal stack, kein horizontal overflow.
4. i18n: DE + TR komplett.
5. Screenshot-Proof gegen bescout.net nach Deploy.
6. Disclaimer (TradingDisclaimer) bleibt.

## Edge Cases

1. **MV = 0** (Player ohne Marktwert) — Empty-State mit "Aktueller Marktwert wird ermittelt"
2. **Holding = 0** — "Kauf Cards um zu profitieren" CTA
3. **Player liquidiert** — Komplett anders: Ausgezahlte Beträge anzeigen (aus liquidation_payouts)
4. **IPO noch nicht gestartet** — "Noch kein Einstiegspreis" State

## Proof-Plan

- `worklog/proofs/113-design-mockup.png` (optional, kann Anil abnicken)
- `worklog/proofs/113-screenshot-desktop.png` (Playwright auf bescout.net/player/<id>)
- `worklog/proofs/113-screenshot-mobile.png` (393px)
- `worklog/proofs/113-i18n-diff.txt` (neue de/tr keys)

## Scope-Out

- Option 1 Chart-Visualisierung (nur wenn MVP-Feedback es fordert)
- Backtesting (historische MV-Verläufe pro Player)
- Comparison mit anderen Players (separate Discovery-Feature)

## CEO-Scope

- Wording der Milestone-Labels (Anil approves)
- Ob "10× Growth" realistisch darstellbar oder euphemistisch wirkt (Compliance-Check gegen "Investment"-Terminologie)

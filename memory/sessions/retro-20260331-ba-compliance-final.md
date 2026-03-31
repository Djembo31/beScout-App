# BA Compliance Audit — CLEAN STATE ACHIEVED — 2026-03-31

## Summary

After 4 heartbeats (BES-8, BES-9, BES-12, BES-15), the i18n files are now
fully compliant. Zero forbidden-language violations in de.json or tr.json.

## Final Verification Results

### DE Scan — CLEAN
Pattern: `profitierst|Besitzer-Bonus|Anteil an einem|Partizipationsrecht|wirst
du dafür bezahlt|Taktischer Investor|sichere dir deine Anteile|Mögliche Gewinne`

No matches. ✓

### TR Scan — CLEAN
Pattern: `para kazanırsın|futbolcudaki payın|payını al|Taktik Yatırımcı|Scout
Card Sahipliğin|dpcOwned.*Sahip`

No matches. ✓

## What Was Fixed Across All 4 Audit Cycles

| Issue | Violations | Root Cause |
|-------|-----------|------------|
| BES-8 | 9 DE violations | First systematic scan |
| BES-9 | TradingDisclaimer missing on Airdrop | Missed on new page |
| BES-12 | 4 missed DE + 2 new Spieleranteil | Key names changed, content not re-scanned |
| BES-15 | 4 DE + 8 TR | Turkish never audited; concepts survived in TR vocab |

**Total fixed:** 27 wording violations across both languages.

## Accepted as Non-Violations

- `tr.json:2868` — "kazanırsın" in ticket tooltip (game mechanic: earn tickets)
- `tr.json:4382` — "sahiplerine" (everyday TR for "holders", not legal ownership)
- `de.json:3227-3229` — Legal disclaimer text (negative denials, correct)
- `de.json:178, 307-308` — "gewinnen/Gewinner" as contest verb (win a game)

## Canonical Audit Grep Patterns

Run after EVERY i18n change and before marking any compliance issue done:

```bash
# German forbidden content
grep -nE "profitierst|Besitzer-Bonus|Anteil an einem|Partizipationsrecht|wirst du .* bezahlt|Taktischer Investor|sichere dir deine Anteile|Mögliche Gewinne|deine Anteile!" messages/de.json

# Turkish forbidden content
grep -nE "para kazanırsın|futbolcudaki|payını al|Taktik Yatırımcı|Sahipliğin|Sahipliği[^n]|dpcOwned.*Sahip" messages/tr.json

# Both files — hard forbidden words
grep -niE "investment|ROI|rendite|dividende|guaranteed return|earn money|spieleranteil" messages/de.json messages/tr.json
```

Expected: all commands return CLEAN (no matches outside disclaimer text).

## TradingDisclaimer Coverage — PASS

All trading surfaces covered:
- Market Portfolio tab ✓
- Market Marktplatz tab ✓
- Player TradingTab ✓
- BuyModal, SellModal, OfferModal ✓
- IPOBuySection ✓
- BuyOrderModal, BuyConfirmModal ✓
- RewardsTab ✓
- Airdrop page (BES-9) ✓

## Phase Compliance — PASS

- No Phase 3 (Cash-Out, Token, Exchange) features ✓
- No Phase 4 (Paid Fantasy Entry) features ✓
- Kill-switch (EUR 900K) noted as not yet implemented — pre-launch acceptable ✓

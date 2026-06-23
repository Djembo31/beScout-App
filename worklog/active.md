# Active Slice

```
status: idle
slice: 347
title: ✅ DONE — FRE-5: Club-konfigurierbare Fan-Rang-Schwellen (Money-nah)
stage: LOG complete
size: L
slice-type: Migration
spec: worklog/specs/347-club-configurable-fan-rank-thresholds.md
impact: worklog (impact-analyst Consumer-Karte, 6 Gruppen, Risiko HIGH)
proof: worklog/proofs/347-thresholds-smoke.txt (Backend AC1-AC8 ✅ + UI AC9/AC10 ✅)
review: worklog/reviews/347-review.md (PASS, Finding #1 gefixt, 1 NIT pre-existing)
next: Pro-Stand-Roadmap sichern/abarbeiten — worklog/notes/348-pro-stand-roadmap.md
```

## Aktueller Stand — Mock → Pro

- **FRE-1/2/3/5 ✅ live**: Fan-Rang ist sichtbar, Follow zählt, exklusive Vereins-Beiträge sind gated, Schwellen sind club-konfigurierbar. **FRE-4 Airdrop ist bewusst auf echte-Coin-Phase verschoben** (D93-Update), nicht vergessen/nicht bauen.
- **E1 Money/Reward ist stark fortgeschritten**: Treasury-Ledger + CSF + Events + Bounties + Polls-REIN + Fan-Reward-Perks stehen. Nächster Money-Fokus ist nicht Airdrop, sondern Polls-Reste oder ein neuer REIN/Club-Value-Block.
- **E2 S7 Tech-First bleibt offen**: Leaderboard-/Score-Konsolidierung, Dormant-Feature-Hygiene, Bridges-Abbau, `players.club` sobald API-Football-Key frei.

## Vorherige FRE-Slices

- **344 / FRE-1** ✅ — Fan-Rang-Leiter sichtbar + Perk-Katalog. PASS, live.
- **345 / FRE-2** ✅ — Follow zählt (+5) + Recalc-Trigger. PASS, live.
- **346 / FRE-3** ✅ — Exklusive Vereins-Beiträge (Fan-Rang-Gate + 🔒-Vorschau). PASS, live.
- **347 / FRE-5** ✅ — Club-konfigurierbare Fan-Rang-Schwellen. PASS, live.

## Nächste sinnvolle Slice-Kandidaten

1. **Plan-/Drift-Hygiene**: TODO/MASTERPLAN/Knowledge gegen D93 und Pro-Stand synchron halten.
2. **Kleiner Aufräum-Slice**: `csf_multiplier` aus Fan-Rank/CSF-Resten entfernen (D83/D93), live-functiondef zuerst.
3. **Polls-Reste**: exklusive Treue-Umfragen (`min_fan_rank`) oder Abo-Early-Access.
4. **E2 Phase-3**: Leaderboard-Konsolidierung (scout_scores vs user_stats), Dormant-Feature-Hygiene, Bridge-Reduktion.
5. **Blockiert**: `players.club` String→UUID erst nach API-Football-Key-Reaktivierung.

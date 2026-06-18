# Active Slice

```
status: idle
slice: 344
title: ✅ DONE — E1.1: Fan-Rang-Leiter sichtbar + Perk-Katalog (Plattform-Default)
stage: LOG complete
size: M
slice-type: UI
spec: worklog/specs/344-fanrank-ladder-perk-catalog.md
impact: skipped (reine UI, 1 Consumer, kein RPC/Schema/Query-Key)
proof: worklog/proofs/344-live-verify.md (+ desktop/393px PNG + vitest)
review: worklog/reviews/344-review.md (PASS, 2 NIT non-blocking)
```

## Zuletzt
- **Slice 342** (2026-06-18) — Notify-Fan-out-Batching (S, 339-NIT#1 geschlossen). Reviewer PASS.
- **Slice 343** (2026-06-18) — Polls P3c Fan-Rang → Stimmgewicht (S, Migration, MAX mit Abo-Floor). Reviewer PASS, DB-Smoke 13/13.

## Fan-Reward-Engine (E1) — Design-Alignment 2026-06-18 (Anil)
- **Reihenfolge:** Perks/Gating zuerst, Airdrop später. **Follow zählt** als kleines Einstiegssignal. **csf_multiplier raus** (Treue läuft über Engine). **Plattform-Default-Perks zuerst**, Club-Konfig später. **Welt-1** (user_stats, Monatsliga) bleibt RAUS aus E1.
- **Slice-Kette:** E1.1 Leiter sichtbar + Perk-Katalog (= Slice 344) · E1.2 Follow→fan_rank-Signal (Migration, /impact, Money-nah) · E1.3 neues echtes Perk-Gate · E1.4 Airdrop (Money) · E1.5 Club-Konfig.
- Quelle: `docs/knowledge/domain/treasury.md` §8 + `reward-ranking.md` §2/§5/§6. Decisions am Session-Ende ins `decisions.md`.

## Nächstes
E1.2 (Follow→fan_rank-Signal) nach 344. Money-nah → /impact + Live-RPC-Read zuerst.

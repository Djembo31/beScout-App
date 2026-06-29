# Active Slice

```
status: idle
slice: 455
title: D-02 — Bench-Karten in holding_locks (Geld-Leck) — SPEC DONE, BUILD pending (Checkpoint)
size: M
type: Migration
stage: SPEC (done) — BUILD-Entscheid offen
spec: worklog/specs/455-d02-bench-holding-locks.md
scope: Money/§3, LATENT (Bench-Feature unbenutzt, holding_locks=0)
```

## Stand (Recon + Design KOMPLETT, Build offen)
D-02 live bestätigt (D87): `rpc_save_lineup` lockt nur 12 Starter (`v_all_slots` Z.37-41 = `v_slot_keys` 12 Keys), Bench (`v_bench_uids`) wird validiert aber **nie in holding_locks**; auch der Cross-Event-Verfügbarkeits-Check (Z.365-377) läuft nur über Starter. → Bench-Karte in N Events wiederverwendbar (Auto-Sub-Reward-Leck). **Latent** (0 Locks live).

**Fix steht (Spec 455):** 2 additive Blöcke (Bench-Verfügbarkeits-Check nach Z.377 + Bench-Lock-INSERT nach Z.438), spiegeln die Starter-Logik, Starter-Pfad byte-treu.

**Build = 25k-Money-RPC byte-treu CREATE OR REPLACE** → bewusst auf frischen Kontext vertagt (Caution > Speed, §1; D-02 latent). Nächste Session: Voll-Def ziehen → 2 Blöcke rein → force-rollback → Reviewer → CEO-Apply.

## Offen (TEIL B, nach D-02): W0 DB-Security · W2 Path-2/D-11 (454-Residuals) · K6/K7 (TEIL-A LOW).

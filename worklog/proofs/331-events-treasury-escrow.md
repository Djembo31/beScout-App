# Proof — Slice 331: Events ans Treasury (Voll-Reconcile, type='club')

Datum: 2026-06-17 · Projekt skzjfhvgccaeplydsunz · alle DB-Smokes force-rolled-back (nichts committed).
Test-Club bbd54175, available 3.723.200.

## Wave 1 — DB-Schicht (force-rollback Lebenszyklus)

### AC1 — type='club' + prize → Escrow-Debit
```
escrowed=t  debit=1000000  available 3723200 -> 2723200  (exakt prize_pool raus)
```
### bescout (fremde Quelle) → KEIN Escrow
```
escrowed=f  ledger_amount=0   (Vereins-Treasury unberührt)
```
### AC2 — Unterdeckung blockt (prize = available+1)
```
ERROR: treasury_insufficient_for_event_prize: benoetigt 3723201, verfuegbar 3723200
```
### AC3/AC4 — ended, 0 Teilnehmer → voller Rest zurück
```
escrow_after=f  credit_back=1000000  available_now=3723200  (zurück auf Start — zero-sum)
```
### Teil-Auszahlung — ended mit Gewinner (reward_amount=600000 von 1000000)
```
rest_zurueck=400000   (= prize_pool − Σ reward_amount, exakt)
```
### AC5 — grandfathered (prize_escrowed=false) → ended → KEIN Refund
```
bescout->ended: credit=0   (Alt-/Fremdquelle mintet wie bisher, kein fälschlicher Treasury-Credit)
```

**Invariante:** Für escrowtes Event gilt über den Lebenszyklus: Treasury −prize_pool (Insert) +Rest (ended) = −distributed. Gewinner +distributed. System zero-sum, kein Minting.

## Wave 2 — App-Schicht
- `createNextGameweekEvents`: Sammel-Insert → **per-Klon-Schleife**. Klon mit `treasury_insufficient_for_event_prize` → skip + `console.warn` + `skippedInsufficient++`, restliche Klone laufen. (Verhindert Batch-RAISE → 0 Events nächste GW.)
- Fehler-Mapping `errorMessages.ts`: `/treasury_insufficient_for_event_prize/i` → `eventPrizeTreasuryInsufficient`; i18n DE+TR.
- Scoring-Flow (`scoring.admin.ts`) fängt Klon-Fehler bereits via try/catch ab — unverändert robust.

## tsc + vitest
```
pnpm exec tsc --noEmit → EXIT 0
events-v2.test.ts: 76 passed (inkl. neuer Skip-on-Underfunding-Test)
events services suite: 192 passed
```

## Pre-Existing-Befunde (geflaggt, NICHT in dieser Slice gefixt)
1. **Event-Absage DB-seitig unmöglich:** `events_status_check` erlaubt kein 'cancelled' (nur upcoming/registering/late-reg/running/scoring/ended), aber die UI hat einen „Absagen"→'cancelled'-Button → würde 23514 werfen. Settle-Trigger deckt daher nur 'ended' (kein toter cancel-Zweig). Eigener Fix-Slice nötig.
2. **5-Quellen-Modell:** nur `type='club'` escrowt; `bescout`/`special`/`sponsor`/`creator` minten weiter bis zu ihren eigenen Quellen-Slices (dokumentiert in concept §8).

## Reviewer-Heal — Finding #1 (MAJOR, latent Money): prize_pool/type-Edit umging Escrow
Befund: `prize_pool` (registering/late-reg/running) + `type` (upcoming/registering) sind editierbar; nacktes `.update()` umging Insert- + Settle-Trigger → Escrow-Desync (Minting-Hintertür) / liegengebliebene Kaution bei Quellen-Wechsel.
Fix: 3. Trigger `trg_events_resync_prize_escrow` (BEFORE UPDATE OF prize_pool, type) — hält Escrow = Ziel (type='club' ∧ prize>0 ? prize_pool : 0); bucht Differenz (Erhöhung mit Deckungs-Guard, Reduzierung/Quellen-Wechsel = Teil zurück).
Verify (force-rollback):
```
prize 1M->1.5M->300k: net_debit=300000  available 3723200->3423200  (Escrow folgt finalem Topf)
type club->bescout:    net_event=0  prize_escrowed=f  (volle Kaution zurück)
```

## AC6 (UI Erstell-Dialog Treasury-Anzeige) = deferred
Harter Schutz (Trigger) + saubere i18n-Meldung greifen. Proaktive „available anzeigen + Vorabprüfung" = UX-Folgeschritt (Scope-Out).

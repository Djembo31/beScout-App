# E4 — Money-Modell-Glattzug + Mock→Pro-Härtung (Epic-Anker)

> Auslöser: Slice-365-E2E-Durchlauf (1 echter Trade) deckte systemischen Doc-Drift + Bugs auf.
> SSOT = **D99** (`memory/decisions.md`, ratifiziert 2026-06-24). Inventur = `worklog/notes/365-money-model-drift-inventory.md`. Funde = `worklog/notes/365-e2e-findings.md`.

## Ratifizierte Grundlinie (D99, Schritt 1 ✅ Commit b52e8b09)
1. **Naming:** user-facing **„Credits"** jetzt · „$SCOUT" = ICO-Coin später · „BSD" deprecaten · Code-Vokabular vereinheitlichen.
2. **Phasen sequenziell 1/2/3:** 1=Free-Play (wertlose Credits) · 2=ICO/$SCOUT nach Token-Lizenz · 3=Paid Fantasy nach MGA.
3. **CASP = schnellster sicherer Weg zum ICO:** Token erst nach gültiger Lizenz; Route (CASP vs MiCA Title II) = Anwalt vor ICO; Phasen-Docs neutral „nach gültiger Lizenz".
4. **Pricing kanonisch: 1 Card = MV/1.000 Credits** (= MV/100.000 € beim ICO-Peg, KEIN 100×-Widerspruch). €-Bezug = ICO-Zeit, user-facing nie €. `ipo_price`-Data-Drift = eigener Money-Slice.

## Slice-Sequenz
- **366 — Doc-Glattzug** ✅ DONE: ~40 Stellen auf D99 (Inventur A–E) + zusätzlich Skills (beScout-business/plan-legal-review .claude+.agents) + SYSTEM-DESIGN-v2.md. Proof `worklog/proofs/366-drift-grep.txt`. Bewusst belassen: `docs/plans/*` (historische Snapshots). Follow-up: eventCurrency/Tickets-„Währung"-Labels (eigener Compliance-Sweep).
- **367 — „Diamond Hands"-Cluster** (fix): Achievement umbenennen (DE+TR, business.md-konform) + Logik-Bug (Award nach 30d-Halten statt on-buy) + Konfetti-auf-Trade raus (feedback_no_confetti). Evidence `365e2e-1-trading-diamondhands.png`.
- **368 — Scout-Card-Wertanzeige ehrlich + eindeutig** (REFRAMED 2026-06-24, Spec `docs/plans/2026-06-24-scout-card-value-model-spec.md`): Alte Prämisse („ipo_price → MV/10 nachziehen") **verworfen** (D100 supersedes D99 Pkt 4). `ipo_price` = Vereins-Eintrittspreis, MV-entkoppelt — „Drift" ist KEIN Bug, kein Daten-UPDATE. Geschnitten in 3:
  - **368a ✅ DONE** — Kanon festhalten (D100 + treasury.md §1b + trading.md-Korrektur). Doc/Decision.
  - **368b** — Anzeige-Wahrheit (UI): „Dein Einstieg" ← `ipos.price` Erst-IPO / „—"; ipoPrice/MV/last klar trennen + Labels vereinheitlichen; CSF-Reward-Basis korrekt.
  - **368c** — Floor = transparentes Orderbuch (Quelle sichtbar: offene Order vs. letzter Verkauf) + Anti-Manipulation. Open-Q: Anti-Manip-Regel (Anil).
- **369 — `/api/push → 500`** (fix): Push-Route wirft 500 beim Order-Fill (VAPID/Payload?). Trade lief durch, kein Block — aber 500 still.
- **370 — E2E-Sweep ②–⑤** (Verify): IPO/Poll/Research/Bounty Fee-REIN live durchspielen + Bug-Jagd. Seed-Muster im Findings-File.
- **Produkt-offen (eigener Slice/Anil-Entscheid):** T-1 Cold-Start-Liquidität (leerer Markt → neuer Tester kann nichts kaufen). Dauer-IPO oder Seed-Orderbuch.

## DANACH: zurück zu E3 Slice 3 — Monats-Liga e2e (erster RAUS-Kanal aus dem Topf).

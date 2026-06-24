# Spec — Scout-Card-Wertmodell ehrlich + eindeutig (Slice-Serie 368)

**Datum:** 2026-06-24 · **Scope:** Money/CEO (§3) · **Größe:** L (in 3 Sub-Slices geschnitten) · **Slice-Type:** 368a Doc/Decision · 368b UI · 368c UI+Service
**Status:** SPEC — wartet auf Anil-Approval (SPEC GATE). Kein Code geschrieben.

> Diese Spec überschreibt die alte Slice-368-Prämisse aus dem Handoff („ipo_price ist falsch → auf MV/10 nachziehen"). Diese Prämisse war **falsch** (siehe §1). Auslöser der Korrektur: Anil-Klärung 2026-06-24.

---

## 1. Problem-Statement (mit Evidence)

Die vier Wert-Zahlen einer Scout Card sind im Produkt **verschmolzen** statt getrennt. Das erzeugt eine falsche Preis- und Reward-Wahrnehmung (UX **und** Compliance-Risiko: keine falschen Gewinn-Erwartungen, `business.md`).

**Die vier Zahlen und was sie bedeuten SOLLEN:**
| Zahl | DB-Spalte | Bedeutung (Anil-Modell) |
|---|---|---|
| Erstverkaufspreis / Eintritts-Anker | `ipo_price` (bzw. `ipos.price`) | Preis, den der **Verein** beim Markteintritt verlangt. Orientiert sich am MV, darf abweichen. **Bezugspunkt für Preisentwicklung.** Nach IPO eingefroren. |
| Aktueller Marktpreis | `last_price` / Orderbuch / `floor_price` | Was die Karte **jetzt** im Handel wert ist (Angebot/Nachfrage). |
| Marktwert-Referenz | `market_value_eur` | Echter Transfermarkt-Wert, per Cron aktualisiert. **Nur Referenz**, nicht der Kartenpreis. |
| CSF (Community Success Fee) | berechnet aus MV, Cap = `success_fee_cap_cents` | Möglicher Erfolgs-Reward. Im Reward-Bereich angezeigt. |

**Evidence (Live-DB + Code, 2026-06-24):**
- `ipo_price` wurde durch **Slice 114** (Migration `20260420213000`) zwangsweise auf `FLOOR(MV/10)` gesetzt — `ipos.price` UND `players.ipo_price`. Damit wurde der **Vereins-Eintrittspreis mit der MV-Referenz verschmolzen**. Der echte Eintrittspreis ist nur unzuverlässig in `initial_listing_price` erhalten (mal echter Wert z.B. 276 Cr, mal Flat-Default 100 Cr).
- 96 / 3.935 aktive Spieler (2,4 %) haben `ipo_price <> FLOOR(MV/10)` — beide Richtungen (47 zu billig, 49 zu teuer). **0 mit aktiver IPO, 0 mit offener Order.** Beispiele: Douglas Willian MV 500K → 10 statt 500 Cr; Baha Karakaya MV 25K → 2.500 statt 25 Cr.
- `floor_price` wird user-facing **immer** als „günstigstes Angebot" gelabelt — auch wenn `recalc_floor_price` ihn in Wahrheit aus dem **letzten Verkaufspreis** ableitet (keine offene Order). Quelle nie sichtbar. Zusätzlich uneinheitliche Labels: „Floor" / „Marktpreis" / „Markt Floor". (Explore-Inventur, Antwort A.)
- `RewardsTab.tsx:60-83`: „Aktueller Marktwert" (€) und „Dein Einstieg" (`prices.ipoPrice`, Cr) stehen **direkt nebeneinander**, nur durch Label/Einheit getrennt — verwechselbar (Explore, Antwort C).

**Entlastung (senkt Money-Risiko):** Der Sekundärhandel läuft über das **Orderbuch** — `buy_player_sc` kauft zum niedrigsten offenen Verkaufsangebot (`v_order.price`), NICHT zu `ipo_price`/`floor`/`last`. Die vier Zahlen sind heute fast nur **Anzeige-Werte**. Wir korrigieren Darstellungs-Wahrheit, nicht echte Handelspreise.

---

## 2. Lösungs-Design (Was ändert sich — nicht Wie)

**Grundprinzip:** Die vier Zahlen werden im Produkt **klar getrennt** dargestellt, jede mit korrekter Quelle und eindeutigem Label. Das Orderbuch (Floor) wird **transparent + manipulationssicher**.

**Anil-Entscheidungen (2026-06-24, CEO/Money):**
1. **Eintritts-Anker bestehender Spieler:** zeige `ipos.price` der **Erst-IPO**; existiert keine IPO → ehrlich **„—"** (keine erfundene Zahl). Echter historischer Vereinspreis ist verloren (Slice 114) — nicht rekonstruierbar, also keine Fiktion.
2. **Entkopplung:** `ipo_price` folgt **nie automatisch** dem MV. `createPlayer` nutzt MV/10 nur als **Vorschlag** bei Anlage; danach eingefroren. Kein MV→ipo-Backfill mehr (Slice-114-Klasse ist verboten).

**Daten-Fluss NACHHER (Anzeige-Quelle):**
- Eintritts-Anker UI ← `ipos.price` der ersten IPO des Spielers (neuer kleiner Query/Service), Fallback „—".
- MV-Referenz UI ← `market_value_eur` (unverändert, Cron-aktualisiert).
- Aktueller Preis UI ← Orderbuch (best ask) wenn offene Orders, sonst `last_price` — **mit sichtbarer Quelle**.
- CSF UI ← unverändert berechnet aus MV (`calcSuccessFee`), aber Reward-Kontext erklärt die Basis korrekt.

---

## 3. Slice-Schnitt (3 Sub-Slices, einzeln shippbar)

### 368a — Konzept + Anker-Definition (Doc/Decision, KEIN Runtime-Code)
- DISTILL: neuer `D<n>` in `memory/decisions.md` — „Scout-Card-Wertmodell: 4 getrennte Zahlen; ipo_price = Vereins-Eintrittspreis, MV-entkoppelt; Slice-114-Backfill-Prämisse verworfen."
- `docs/knowledge/domain/trading.md` (+ ggf. `treasury.md`): Wertmodell-Sektion (4 Zahlen, Anker-Regel, Entkopplung). `verified-against` + `updated:` heute (Knowledge-Gate D45/D88).
- Code-Guard-Notiz: `createPlayer` MV/10 = nur Default; kein MV→ipo-Sync. (Verifizieren dass keiner existiert — der Trigger `sync_player_ipo_price` ist `ipos→players`, das ist OK und bleibt.)
- **Kein Daten-UPDATE.** Die 96 „Drift"-Rows sind nach neuem Modell **kein Bug** (ipo_price soll dem MV NICHT folgen).

### 368b — Anzeige-Wahrheit (UI)
- „Dein Einstieg"/Erstverkauf liest `ipos.price` der Erst-IPO (Service/Query + RewardsTab), Fallback „—".
- ipoPrice / MV / aktueller Preis klar getrennt + erklärt (RewardsTab-Block, ggf. Tooltip/Glossar).
- Floor-Labels vereinheitlichen („Floor" als ein Begriff; „Marktpreis"/„Markt Floor" angleichen).
- CSF-Reward-Kontext: Basis (MV-Wachstum) korrekt erklärt, Compliance-konform.

### 368c — Floor-Orderbuch transparent + manipulationssicher (UI + leichte Service-Logik)
- Floor zeigt **Quelle**: „niedrigste offene Order" vs. „letzter Verkauf (keine Angebote)" — Badge/Sublabel.
- Anti-Manipulation: Mini-Order-Floor-Crash verhindern (Design-Frage 368c: Mindest-Order-Größe / Ignorier-Schwelle / nur Orders ≥ X% des letzten Preises in Floor). **CEO-Entscheid in 368c-Spec.**
- IPO + Sekundärmarkt bestimmen gemeinsam (bestehende `recalc_floor_price`-Kaskade prüfen/anpassen).

---

## 4. Code-Reading-Liste (für 368b/c — schon erledigt in Discovery)
| File | Zweck | Befund |
|---|---|---|
| `src/lib/services/players.ts` (`dbToPlayer`, `createPlayer`) | Mapper + Default-Pricing | `ipoPrice` strikt aus `ipo_price` (Slice 308); createPlayer Default MV/10 (respektiert explizit) |
| live `buy_player_sc` / `recalc_floor_price` | Money-Pfad | Buy = Orderbuch (`v_order.price`); Floor-Kaskade min-sell→ipo→last_price |
| `src/components/player/detail/RewardsTab.tsx` | CSF + Eintritt + MV | „Dein Einstieg"=ipoPrice neben „Aktueller Marktwert"=MV (verwechselbar) |
| `src/components/player/detail/PlayerHero.tsx` | großer Floor-Preis | Sublabel „Floor · günstigstes Angebot" (irreführend bei last-price-Quelle) |
| `src/components/player/detail/OrderbookSummary.tsx` | Best Bid/Ask | berechnet bestAsk separat, NICHT mit `prices.floor` verknüpft |
| `messages/de.json` + `tr.json` | Labels | „Floor"/„Marktpreis"/„Markt Floor" uneinheitlich; Glossar-Terms vorhanden |

## 5. Pattern-References
- `decisions.md` D83/D99 — Money-Modell-SSOT (Pricing, Phasen). Diese Spec ergänzt um Wert-Anzeige-Trennung.
- `business.md` „Asset-Klasse-Drahtseilakt" + „Verbots-Register" — Reward/Upside-Darstellung darf keine Rendite-/Gewinn-Erwartung framen.
- `errors-db.md` „Seed-Wert-Poisoning" (S303) + „Money-RPC Pricing-Formel Drift" (S108) — warum Backfill-auf-Formel gefährlich ist (Slice-114-Lehre).
- `common-errors.md` Mock→Pro-Drift-Klasse (Slice 367 gleiche Familie).

## 6. Open-Questions
**Pflicht-Klärung (vor 368b/c):**
1. 368c Anti-Manipulation-Mechanik: welche Regel? (Mindest-Order-Größe vs. %-Schwelle vs. Median-Filter) — CEO-Entscheid.
2. Soll „—" (kein Eintritts-Anker) im RewardsTab den ganzen Reward-Block ausblenden oder nur das Einstieg-Feld?

**Autonom-Zone (Agent/CTO):** Component-Struktur, Tooltip-Wording-Entwurf (DE, TR via Compliance-Check), Label-Vereinheitlichungs-Details.

**Nicht-Autonom (Anil):** CSF-Reward-Wording, Floor-Anti-Manipulation-Regel, jede Geld-Pfad-Berührung.

## 7. Scope-Out
- Keine Änderung an `buy_player_sc`/`buy_from_ipo`/`accept_offer` Pricing-Logik (Orderbuch bleibt).
- Kein Daten-UPDATE der 96 „Drift"-Rows (per neuem Modell kein Bug).
- `initial_listing_price`-Rekonstruktion (verloren, nicht zuverlässig machbar).
- Airdrop/Coin-Phase-Themen.

## 8. Proof-Plan (je Sub-Slice)
- 368a: Doc-Diff + `pnpm audit:knowledge:check` grün + DISTILL-Commit.
- 368b: Playwright bescout.net (RewardsTab zeigt ipos.price/„—"; getrennte Labels) + tsc + vitest.
- 368c: Playwright (Floor-Quelle sichtbar bei beiden Fällen) + Service-Test Anti-Manipulation + Live-SQL-Smoke.

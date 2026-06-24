# Spec — Slice 368b: Scout-Card-Anzeige-Wahrheit (RewardsTab)

**Datum:** 2026-06-24 · **Scope:** Money/CEO (§3) · **Größe:** M · **Slice-Type:** UI (+ kleiner Service/Query)
**Serien-Spec:** `docs/plans/2026-06-24-scout-card-value-model-spec.md` (368a✅ / **368b** / 368c)
**Status:** SPEC — wartet auf Anil-GO (Money/CEO + M-Größe + CSF-Wording = Anil-Zone).

---

## 1. Problem-Statement (mit Evidence)

Im `RewardsTab` (collapsible „Mögliche Rewards" in `TradingTab`) sind drei der vier Wert-Zahlen einer Scout Card verschmolzen/irreführend dargestellt:

1. **„Dein Einstieg"** liest `player.prices.ipoPrice` = `players.ipo_price`. Diese Spalte wurde von **Slice 114** für **jeden** Spieler auf `FLOOR(MV/10)` gesetzt — auch für Spieler **ohne je stattgefundenen Erstverkauf**. Heißt: das Feld zeigt aktuell **immer** eine erfundene MV/10-Zahl, nie „—". (Evidence: `players.ts:243` strict aus `ipo_price`; D100 / Handoff-Discovery 2026-06-24.)
2. **„Aktueller Marktwert" (€)** und **„Dein Einstieg" (Credits)** stehen direkt nebeneinander (`RewardsTab.tsx:60-83`), nur durch Label/Einheit getrennt — verwechselbar (MV-Referenz vs. Eintritts-Anker). Keine Erklärung, dass MV nur Kontext ist.
3. **CSF-Tooltips framen den Reward in €** (`growthFormulaTooltip`: „÷ 100.000 €… 10 € pro Card"; `growthMilestonesDesc`). Der Reward wird in **Credits** ausgezahlt/angezeigt (UI zeigt „CR"). User-facing **€ ist verboten** (D99, `trading.md` „user-facing nie €", `business.md`). = Compliance-Drift.

**Entlastung (Money-Risiko gering):** Diese Zahlen sind reine **Anzeige**. Der echte Handel läuft übers Orderbuch (`buy_player_sc` → `v_order.price`), nicht über `ipo_price`. Wir korrigieren Darstellungs-Wahrheit, keine Kaufpreise. (D100, Serien-Spec §1.)

---

## 2. Lösungs-Design

Die vier Zahlen sauber trennen + jede mit korrekter Quelle/Bedeutung erklären:

- **Eintritts-Anker** „Dein Einstieg" ← **`ipos.price` der Erst-IPO** (frühestes IPO-Row des Spielers), Fallback **„—"** (Anil-Entscheid 368a: keine erfundene Zahl). Fallback betrifft **nur das Einstieg-Feld** — MV + Meilensteine bleiben sichtbar (Anil-Entscheid 2026-06-24, da CSF am MV hängt, nicht am Einstieg).
- **MV-Referenz** „Aktueller Marktwert" ← `player.marketValue` (unverändert) + **InfoTooltip**: „Transfermarkt-Referenz, nur Kontext — nicht der Kartenpreis."
- **CSF** ← unverändert berechnet (`calcSuccessFee`), aber Tooltips **€→Credits** und Reward-Kontext compliant erklärt.

**Daten-Fluss (neu):** RewardsTab ruft einen kleinen, lazy Hook `useFirstIpoPrice(playerId)` → Service `getFirstIpoPrice` (frühestes `ipos.price`, sonst `null`). RewardsTab mountet nur wenn die Section aufgeklappt ist (`{rewardsOpen && <RewardsTab/>}`, `TradingTab.tsx:488-491`) → kein Extra-Fetch im Standard-Render.

**Scope-Cut (CTO-Vorschlag, in Open-Q zur Bestätigung):** Floor-Label-Vereinheitlichung aus der Serien-Spec wird nach **368c** verschoben — dort lebt das Floor-Quellen-Badge, das dieselben Strings anfasst (kohärenter zusammen, kein Doppel-Churn). 368b = nur RewardsTab-Wahrheit.

---

## 3. Betroffene Files

| File | Änderung |
|---|---|
| `src/lib/services/ipo.ts` | + `getFirstIpoPrice(playerId): Promise<number\|null>` (frühestes IPO, centsToBsd) |
| `src/features/market/queries/ipos.ts` | + `useFirstIpoPrice(playerId)` (lazy Query, staleTime 5min — statisch) |
| `src/lib/queries/keys.ts` | + Query-Key `firstIpoPrice(playerId)` |
| `src/components/player/detail/RewardsTab.tsx` | „Dein Einstieg" ← Hook + „—"-Fallback; 2 InfoTooltips; CSF-Texte |
| `messages/de.json` + `messages/tr.json` | CSF-Tooltips €→Credits; 2 neue Tooltip-Keys (MV-Referenz, Eintritts-Anker) |

## 4. Code-Reading-Liste (erledigt in Discovery)

| File | Zweck | Befund |
|---|---|---|
| `src/components/player/detail/RewardsTab.tsx` | Ziel-Component | `ipoPrice = player.prices.ipoPrice ?? 0`; zeigt schon „–" bei ≤0, aber Quelle = Slice-114-MV/10 |
| `src/lib/services/players.ts:238-244` | Mapper | `ipoPrice` strict aus `players.ipo_price` (Slice 308), kein floor-Fallback |
| `src/lib/services/ipo.ts:63-85` | IPO-Query-Muster | `getIpoForPlayer` = aktive IPO; ich brauche **frühestes** (created_at ASC, limit 1) |
| `src/components/player/detail/TradingTab.tsx:488-491` | RewardsTab-Parent | lazy gerendert in collapsible; bekommt nur `player` + `holdingQty` |
| `src/components/player/detail/hooks/usePlayerDetailData.ts:103` | bestehende IPO-Hooks | `useIpoForPlayer` = aktive; kein „first-IPO"-Hook vorhanden |
| `messages/de.json` (playerDetail) | CSF/Floor-Strings | `growthFormulaTooltip`/`growthMilestonesDesc` enthalten **€** (Compliance-Drift) |
| live `ipos`-Tabelle | Anker-Quelle | `price` (cents), `player_id`, `created_at`, `status` — frühestes = Erst-IPO |

## 5. Pattern-References
- **D100** (`memory/decisions.md`) — 4-Zahlen-Modell, ipo_price MV-entkoppelt, Anker = `ipos.price` Erst-IPO sonst „—".
- `trading.md` „Pricing Asset Model" + „user-facing nie €" — CSF in Credits, nicht €.
- `business.md` „Asset-Klasse-Drahtseilakt" + „Verbots-Register" — Reward = Belohnung/Ermessen, kein Gewinn/Rendite/€.
- `ui-components.md` Tooltip-Pattern (Slice 225) — Education-Tooltip = `InfoTooltip` (Mobile-pflicht, nicht `title=`).
- `errors-db.md` „Seed-Wert-Poisoning" (S303) — warum `players.ipo_price` als Anker vergiftet ist.
- `database.md` — `.maybeSingle()` für optionalen Lookup; Service-Layer statt Component-Query.

## 6. Acceptance Criteria (executable)

- **AC-1 [Anker-Wahrheit]:** Spieler **mit** IPO → „Dein Einstieg" = `ipos.price` der frühesten IPO (centsToBsd). VERIFY: Playwright bescout.net + SQL `SELECT price FROM ipos WHERE player_id=… ORDER BY created_at ASC LIMIT 1`. FAIL-IF: Feld zeigt `players.ipo_price` (MV/10).
- **AC-2 [Ehrliches „—"]:** Spieler **ohne** IPO-Row → „Dein Einstieg" = „—", **aber** „Aktueller Marktwert" + Meilensteine bleiben sichtbar. VERIFY: Player ohne ipos-Row rendern.
- **AC-3 [Nur Einstieg-Feld]:** Im „—"-Fall wird **kein** anderer Block ausgeblendet (Reward-Block voll da). VERIFY: Screenshot.
- **AC-4 [MV-Tooltip]:** „Aktueller Marktwert" hat `InfoTooltip` „Transfermarkt-Referenz, nur Kontext — nicht der Kartenpreis." VERIFY: Tooltip klickbar (Mobile 393px).
- **AC-5 [Einstieg-Tooltip]:** „Dein Einstieg" hat `InfoTooltip` (Erstverkaufspreis Verein; „—" = nie über Erstverkauf ausgegeben). VERIFY: Tooltip-Text.
- **AC-6 [CSF €→Credits]:** `growthFormulaTooltip` + `growthMilestonesDesc` enthalten **kein €**; Reward in Credits/linear erklärt. VERIFY: `grep -c '€' messages/de.json` an den 2 Keys = 0. FAIL-IF: € im Reward-Kontext.
- **AC-7 [Compliance]:** Keine verbotenen Begriffe (Gewinn/Rendite/Profit/ROI/€) in neuen/geänderten Strings; Ermessen/kein-Anspruch erhalten. VERIFY: business.md-grep.
- **AC-8 [i18n DE+TR]:** Alle neuen/geänderten Keys in DE **und** TR, korrekter Namespace `playerDetail`. VERIFY: namespace-aware Node-Check + Live-Render kein `MISSING_MESSAGE`.
- **AC-9 [Kein Regress]:** `tsc --noEmit` grün; `vitest run` (RewardsTab/TradingTab/PlayerContent + ipo-Service) grün.

## 7. Edge Cases

| Fall | Erwartet |
|---|---|
| Spieler ohne jede IPO-Row | „Dein Einstieg" = „—", Rest sichtbar (AC-2/3) |
| Mehrere IPO-Tranchen | frühestes `created_at` = Erst-IPO (nicht aktivste) |
| IPO mit `price = 0` | als „—" behandeln (`> 0`-Guard wie MV) |
| `marketValue = 0` | MV-Kachel zeigt „–" (bestehendes Verhalten), Meilensteine „–" |
| `holdingQty = 0` | kein Gesamt-Reward, „pro Card" bleibt |
| Hook lädt noch | Einstieg-Feld zeigt neutralen Lade-/„—"-Zustand, kein Layout-Shift |
| Hook-Error | fail-safe „—" (kein Crash, kein erfundener Wert), `throw` im Service → React-Query error → Hook liefert undefined → „—" |
| Realtime/Stale | First-IPO ist immutabel-historisch → staleTime 5min unkritisch |

## 8. Self-Verification Commands
```bash
npx tsc --noEmit
CI=true npx vitest run src/components/player/detail/__tests__/ src/lib/services/__tests__/ipo.test.ts
node -e "const m=require('./messages/de.json').playerDetail; console.log(/€/.test(m.growthFormulaTooltip)||/€/.test(m.growthMilestonesDesc) ? 'FAIL €' : 'OK no €')"
node -e "['de','tr'].forEach(l=>{const m=require('./messages/'+l+'.json').playerDetail; ['mvReferenceTooltip','entryAnchorTooltip'].forEach(k=>console.log(l,k,m[k]?'OK':'MISSING'))})"
# Live-Anker-Gegenprobe (ein Spieler mit + einer ohne IPO):
# SELECT p.id, p.ipo_price, (SELECT price FROM ipos WHERE player_id=p.id ORDER BY created_at ASC LIMIT 1) AS first_ipo FROM players p LIMIT 5;
```

## 9. Open-Questions

**Pflicht-Klärung (Anil, vor BUILD):**
1. **CSF-Tooltip-Neufassung (€→Credits)** — Vorschlag (DE):
   - `growthFormulaTooltip`: „Der mögliche Bonus pro Card steigt **linear mit dem Marktwert** des Spielers: verdoppelt sich der Marktwert, verdoppelt sich der mögliche Bonus. Auszahlung in Credits, nach Ermessen des Vereins."
   - `growthMilestonesDesc`: „Die Höhe des Bonus pro Card hängt vom Marktwert zum Liquidations-Zeitpunkt ab."
   → OK so, oder Wording anpassen? (Raw-Formel/Zahlen-Beispiel bewusst raus = compliant + klarer.)
2. **Scope-Cut Floor-Labels → 368c**: einverstanden, dass die Floor-Label-Vereinheitlichung mit dem Floor-Quellen-Badge in 368c zusammen läuft (statt in 368b)?

**Autonom-Zone (CTO):** Service/Hook/Query-Key-Struktur, Tooltip-DE-Entwurf, Component-Layout, TR-Übersetzung (Compliance-geprüft), Lade-Zustand.

**Nicht-Autonom (Anil):** finale CSF-Reward-Wording (Q1), Scope-Cut (Q2).

## 10. Proof-Plan
- Playwright bescout.net: RewardsTab bei (a) Spieler mit IPO (echter Einstieg) + (b) ohne IPO („—", Rest sichtbar) + Tooltips offen → 2 Screenshots `worklog/proofs/368b-*.png`.
- `tsc` + `vitest` Output → `worklog/proofs/368b-tests.txt`.
- € -grep-Check Output → `worklog/proofs/368b-compliance.txt`.

## 11. Scope-Out
- Keine Änderung an `buy_player_sc`/`buy_from_ipo`/`accept_offer`/`recalc_floor_price` (Orderbuch + Floor-Logik bleiben).
- Kein Daten-UPDATE der 96 „Drift"-Rows (per D100 kein Bug).
- Floor-Quellen-Badge + Floor-Label-Vereinheitlichung = **368c**.
- MV-€-Anzeige selbst (Transfermarkt-Referenz) bleibt € (app-weites Pattern, nicht 368b).
- `initial_listing_price`-Rekonstruktion (verloren).

## 12. Stage-Chain (geplant)
SPEC → IMPACT (skipped: kein Schema/RPC/Cross-Domain — 1 neue read-only Query, Consumer = nur RewardsTab) → BUILD → REVIEW (reviewer-Agent, Money/Compliance-Linse) → PROVE → LOG.

## 13. Pre-Mortem (M optional, hier 5 Szenarien)
1. **Anker zeigt doch MV/10**, weil `ipos.price` bei Pre-114-Spielern auch überschrieben wurde → bewusst akzeptiert (D100/Handoff): IPO-Preis ist der ehrlichste verfügbare Anker; entscheidender Gewinn = Spieler **ohne** IPO zeigen jetzt „—" statt Fiktion.
2. **Extra-Fetch-Last** auf Player-Detail → vermieden durch lazy Mount (nur bei aufgeklappter Section) + staleTime 5min.
3. **TR-Wording driftet** (Compliance) → TR gegen Verbots-Register prüfen; € auch in TR raus (`tr.json` gleiche Keys greppen).
4. **„—"-Fall blendet versehentlich Meilensteine aus** (Edge AC-3) → Fallback strikt nur im Einstieg-Feld, Meilenstein-Block unberührt.
5. **MISSING_MESSAGE** bei neuen Tooltip-Keys → namespace-aware Check + 1× Live-Render-Console-Scan (S333-Falle).

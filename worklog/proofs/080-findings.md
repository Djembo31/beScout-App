# Slice 080 — Market `/market` Findings (Erster Rundgang)

Playwright MCP, Mobile 393×852, https://www.bescout.net/market
jarvis-qa Session (7.221 CR, 306 Tickets, 12 Spieler / 22 Scout Cards)

Screenshots:
- `080-market-initial.png` — Mein Kader / Bestand (default)
- `080-market-marktplatz.png` — Mein Kader / Angebote (gleichaussehend, verdacht)
- `080-market-kaufen.png` — Marktplatz-Tab (Grid, alle Cards)

---

## Priorisierte Findings

### F1 — TopBar Balance-Stale vs Header (P1 Money-Critical, Reviewer-Follow-up F2)

- **TopBar-Chip:** `7.221` (no decimals, integer format)
- **Market-Header Hero:** `7.226,77 CR` (formatScout vollständig)
- **Home-Hero:** `7.220,77 Guthaben` (ebenfalls formatScout)
- **Diff:** TopBar-vs-Market-Header = 5,77 CR, TopBar-vs-Home-Hero = 0,23 CR → stale cache

**Root-Cause (vermutet):** TopBar nutzt einen anderen Wallet-Hook-Pfad als Hero/Header. Entweder anderer useQuery-Key, anderer staleTime, oder kein invalidate-on-route-change. Daten-Drift bedeutet User sieht 2 verschiedene Zahlen beim Navigieren → Vertrauensverlust + "did my transaction count or not?"

**Fix-Plan:**
1. `src/components/layout/TopBar.tsx` (oder wherever balance-chip sitzt) auf `useWallet()` vereinheitlichen (Single Source)
2. `formatScout()` auch in TopBar nutzen → kein `.toLocaleString()` ohne Dezimal
3. Query-Key `qk.wallet(userId)` — ist das konsistent zwischen TopBar und Hero?
4. Optional: `invalidateQueries` nach Trade-Mutation bereits vorhanden? Check.

---

### F3 — "P+L" Sort-Label = Securities-Terminologie (P1 Compliance)

- **Sort-Buttons:** `Wert | P+L | L-5 | Neueste` (Market-Bestand)
- **Problem:** "P+L" = "Profit and Loss" = stock market Terminology. AR-17 Kapitalmarkt-Glossar SPK-Red-Flag.
- **Business.md:** "NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn"

**Fix:**
- DE: "Veränderung" (oder "Entwicklung")
- TR: "Değişim" (oder "Gelişme")
- i18n-Keys: vermutlich `market.sort.profitLoss` → `market.sort.change`

**Impact:** geringer Code-Change (1 messages-Key + 1 tsx label), hoher Compliance-Gewinn.

---

### F4 — Market-Tabs Missing aria-selected (P2 A11y)

- **Problem:** Tab-Buttons "Mein Kader" / "Marktplatz" + Sub-Tabs "Bestand" / "Angebote" haben keinen `aria-selected`, kein `role="tab"`, kein parent `role="tablist"`.
- **Screen-Reader UX:** hört "Button Marktplatz" zweimal (Haupt-Tab + Side-Menu-Link) ohne "selected"-Hinweis → Verwirrung für Blind-User.
- **Verifizierung:** evaluate() zeigt `ariaSelected: null, dataState: null` auf allen 4 Tab-Buttons.

**Fix:**
- Parent-Container: `<div role="tablist" aria-label="Market-Bereiche">`
- Buttons: `<button role="tab" aria-selected={active === 'x'} id="tab-x" aria-controls="panel-x">`
- Panels: `<div role="tabpanel" id="panel-x" aria-labelledby="tab-x">`

**Impact:** 10-Zeilen-Change in Market-Page + Sub-Tab-Component. Guter A11y-Gewinn.

---

### F2 — Liga/Club-Namen Typos / verlorene Diacritics (P2 Daten)

- **Chips zeigen:** `Holoyspor`, `Karagümrüka`, `Bandirma`, `Sakaryaspor`, `Adana Demirspor`
- **Vermutete Korrekturen:**
  - "Holoyspor" → "Hatayspor" (vermutlich OCR/Import-Fehler)
  - "Karagümrüka" → "Karagümrük" (überflüssiges "a")
  - "Bandirma" → "Bandırma" (türkisches ı statt i)
- **Quelle:** `clubs.name` DB-Column. Muss gegen Transfermarkt/API-Football-Daten verifiziert werden.

**Fix:** Migration `UPDATE clubs SET name = 'correctName' WHERE name = 'wrongName'`. 1 Migration, 3 UPDATEs.

**Needs Verify:** Club-Liste via DB-Query abrufen und gegen offizielle TFF-1-Lig Mannschaften vergleichen.

---

### F5 — Filter-Chaos auf Mobile (P3 UX)

- **4 Zeilen Filter:** Position (GK/DEF/MID/ATT), Club (5 Chips), ?Salary-Range (Zahl-Chips), Wert-Range
- **Problem:** 393px-Viewport wird dominated von Filter, Player-Liste scrollt weit nach unten
- **Fix:** Filter-Drawer (bottom-sheet) mit "Filter" Button, State-Chip-Summary wenn gesetzt

**Impact:** Major UX-Refactor. Separater Slice (080b?)

---

### F6 — Mission-Banners im Bestand-Tab (P3 UX)

- **Zeigt oben:** "Mission: 2 Trades abschliessen" + "Mission: Kaufe 1 Scout Card"
- **Problem:** Bestand-Tab = User's holdings view (schon gekauft). Missions promoten Trading-Aktionen — logisch passender in Marktplatz-Tab.
- **Fix:** Mission-Banner an Tab binden (Buy-Missions im Marktplatz, Sell-Missions im Bestand).

**Impact:** Component-Move, 1-2 Stunden. Post-Beta.

---

### F7 — "22 Scout Cards" vs "12 Spieler" Label-Drift (P3 UX)

- **Rechts oben:** `22 Scout Cards`
- **Links oben:** `12 Spieler`
- **Kontext:** Cards = alle Owned-Tokens (include Duplikate), Spieler = distinct Players
- **Fix:** Tooltip/Subtext für Klarheit. Oder einheitlich "22 Cards / 12 Spieler" in einem Label.

---

### F8 — Marktplatz-Tab Grid-Density vs Bestand-Tab List (P3 UX)

- **Bestand:** List-View, 12 Rows, detailliert (Photo + L5 + Stats)
- **Marktplatz:** 2-col Grid, hunderte Cards, kompakter
- **Inconsistency:** Warum wechselt das Layout? User-Expectation?
- **Fix:** Either make both grid (more scannable), both list (more detail), oder Toggle-Button (User choice persisted).

**Impact:** Design-Entscheidung CEO.

---

### F9 — Missing Compliance-Disclaimer auf Mobile im Footer-Scope (P2 Compliance)

- **Checked:** Compliance-Footer sichtbar am Ende der Page: "Credits sind Plattform-Credits zum Zugang..." ✓
- **Fehlend:** Im Sticky-Bottom-Nav-Area — bei scroll-position "top" ist der Disclaimer nicht sichtbar. User könnte Trade ausführen ohne je den Disclaimer gesehen zu haben.
- **Fix:** Kleine Sticky-Indicator-Pill oder "Compliance-Info"-Icon in TopBar. Oder bei Trade-Modal: zeige Disclaimer-Zusammenfassung.

**Impact:** Compliance-Policy-Decision.

---

## Zusammenfassung

- **P1 (Fix in Slice 080):** F1 (Balance-Stale, Reviewer-Follow-up), F3 (P+L Compliance)
- **P2 (Fix diese Slice wenn Zeit):** F4 (aria-selected A11y), F9 (Compliance-Disclaimer Sticky)
- **P2 Needs-Verify:** F2 (Club-Namen-Typos — DB-Check nötig)
- **P3 (Queue für 080b oder post-Beta):** F5 (Filter), F6 (Mission-Position), F7 (Label), F8 (Grid vs List)

## Nächster Schritt

Anil-Priorisierung: "F1+F3+F4 in diesem Slice fixen + Rest in Queue?" oder "Nur F1+F3 weil Money+Compliance?"

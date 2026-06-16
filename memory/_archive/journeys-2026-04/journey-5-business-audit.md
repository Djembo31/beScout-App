---
name: Journey 5 — Business Audit (Mystery Box)
description: Compliance-Audit fuer Mystery Box — Gluecksspiel-Framing, Forbidden-Words-Scan, Disclaimer-Coverage, Geofencing TR, Phase 1 vs Phase 4 Grenze, Loot-Box-Regulierung.
type: project
status: ready-for-aggregate
created: 2026-04-14
---

# Journey #5 — Business Audit (Mystery Box)

**Scope:** Wording-Compliance, Forbidden-Words (gamble/bet/jackpot/lottery/fortune/Glück), Disclaimer-Coverage, Geofencing (TR TIER_RESTRICTED), Phase 1 vs Phase 4 Grenze (Paid Mystery Boxes? Loot-Box-Regulierung), Random-Drop-Rates-Transparenz, Minor-Protection.

**Total: 10 Findings — 3 CRITICAL + 3 HIGH + 3 MEDIUM + 1 LOW**

---

## CRITICAL

### J5Biz-01 CRITICAL — "Mystery Box" ist EU-Gaming-regulierte Loot-Box-Terminologie

**Kontext:**
- EU-Gaming-Commission (Belgien + Niederlande) klassifizieren "Loot Boxes" mit zufälligem paid Reward als **Glücksspiel-adjacent** seit 2018.
- Bei BeScout:
  - Daily FREE open → niedriges Risiko (keine Monetarisierung des Randomness)
  - ABER: Historisch (Legacy 18 paid_opens in DB) hat User **Tickets** fuer Opens bezahlt → **Pay-to-Win Loot-Box**. Tickets sind durch Missions + Daily-Login earnable, also nicht direkt mit Fiat gekauft — aber Ticketpool kann via `mysteryBoxTicketDiscount` durch Streak-Belohnungen beschleunigt werden.
  - Zukunft (unter PAID_FANTASY_ENABLED=true, siehe J4-AR-31 Paid-Fantasy-Preview): Paid-Mystery-Boxes mit $SCOUT wären KLARER Loot-Box-Fall.

**Code-Beweis:**
- `MYSTERY_BOX_BASE_COST = 15` (MysteryBoxModal.tsx:26) — paid-path ist noch in der Code-Struktur
- `effectiveCost = Math.max(1, 15 - ticketDiscount)` bleibt (`useHomeData.ts:222`)
- RPC unterstuetzt weiterhin paid-opens (`IF NOT p_free`)
- Die UI ruft aber nur `openMysteryBox(hasFreeBox)` auf (immer `free=true` in praxis), siehe `MysteryBoxModal:116, 94` → `handleOpen → onOpen(hasFreeBox)` und `hasFreeBox` ist immer der daily-slot

**Wording-Risiko:**
- "Mystery Box" engl. im TR + DE Code. In TR: "Gizem Kutusu" (DE-Aequivalent wörtlich "Gizem" = Geheimnis, "Kutu" = Kiste). TR Gaming-Regulierung (MASAK + SPK) kennt "Loot Box" nicht explizit, aber Analogien zu "Rastgele Ödül" = zufällige Belohnung = triggert Gaming-Flag.
- **kein Forbidden-Word live** (grep: keine Treffer für "gamble/bet/jackpot/lottery/fortune" im MysteryBox-Scope). GUT.
- ABER: "Mögliche **Belohnungen**" + "Mögliche **Rewards**" (inventory) + "Drops" (history) — mischt Gaming-Lingo mit Rewards-Lingo. Konsistenz-Thema.

**Empfehlung:**
- Phase 1 OK weil ausschliesslich FREE-Daily-Slot + aus Missions earnable. 
- Vor Beta-Launch: **Disclaimer auf MysteryBoxModal** (+Inventory-Tab Historie) → "Mystery Box Inhalte sind Plattform-Belohnungen ohne Geldwert. Drop-Raten basieren auf Zufall und koennen sich aendern. Keine Auszahlung, kein Re-Handel moeglich."
- `business.md`: neue **Loot-Box-Regel** — paid-opens DEAKTIVIEREN via Feature-Flag analog `PAID_FANTASY_ENABLED`. Legacy-Code paid-path weg oder gated.
- Minor-Protection: `age < 18` Check vor erstem Open (analog EU-Gaming-Richtlinie, nicht rechtlich zwingend in DE/TR aber Best-Practice).

### J5Biz-02 CRITICAL — KEIN Disclaimer auf MysteryBoxModal (analog J4 Fantasy)

**Live-Check:** 
- `grep 'disclaimer|Disclaimer|legalFootprint' src/components/gamification/MysteryBoxModal.tsx` → **KEINE TREFFER**
- Kein `TradingDisclaimer`, kein `GamificationDisclaimer`, kein Legal-Text

**Vergleich J1/J2/J3:** TradingDisclaimer ist auf 6 Entry-Pages (Welcome + Login + Onboarding + Home + FoundingPass + WelcomeBonusModal). Fantasy-Disclaimer fehlt noch (J4 AR-33). Mystery Box hat **NICHTS**.

**Empfehlung:** 
- Neuer `MysteryBoxDisclaimer` Component (analog `TradingDisclaimer`) mit Text:
  - DE: "Mystery Box Belohnungen sind rein virtuelle Plattform-Inhalte. Keine Auszahlung, keine Uebertragung moeglich. Drop-Raten koennen jederzeit angepasst werden. Beteiligung nur ab 18 Jahren empfohlen."
  - TR-Aequivalent
- Einbau in MysteryBoxModal (unterhalb Reward-Preview), Inventory-History-Section (oberhalb Liste), Admin-Economy-Panel.
- **Braucht CEO-Text-Approval** (Trigger #2 Compliance-Wording). → **AR-47**

### J5Biz-03 CRITICAL — Drop-Rate-Transparenz FEHLT (EU-Gaming Best-Practice + DE JuSchG §10b)

**Live-Check:**
- `mystery_box_config` RLS public SELECT (Backend-Audit J5B-10) — technisch lesbar aber nirgendwo UI-exposed
- `REWARD_PREVIEW` in MysteryBoxModal.tsx:28-35 zeigt nur Reward-Typen, KEINE Drop-Raten
- Mythic 2%, Legendary 6%, Epic 17%, Rare 30%, Common 45% — nirgendwo für User sichtbar

**Regulatorisches Umfeld:**
- **China Ministry of Culture** 2017: Loot-Box-Drop-Rates MUSS offengelegt werden
- **Apple App Store Review Guidelines 3.1.1**: Apps mit loot boxes MUSS Drop-Rates zeigen (seit 2017)
- **Belgian Gaming Commission** 2018: Loot Boxes = Gambling wenn nicht transparent
- **DE JuSchG §10b** (seit 2021): "in-game-purchases" mit Zufalls-Elementen brauchen erhöhte Transparenz für Minderjährige

**Empfehlung:**
- Drop-Raten in `REWARD_PREVIEW` sichtbar machen (als zusaetzliche Spalte). 
- "Common 45% | Rare 30% | Epic 17% | Legendary 6% | Mythic 2%"
- Bei kommender App-Store-Submission: **ZWINGEND**. → **AR-48**
- Text aus `mystery_box_config` dynamisch laden (RLS public SELECT macht das einfach).

---

## HIGH

### J5Biz-04 HIGH — "bCredits" User-facing exposed (nicht komplett von Credits/CR bereinigt)

**Live-Code:**
- `MysteryBoxModal.tsx:432` label `+{displayAmount.toLocaleString('de-DE')} CR` — OK (CR-Abkürzung)
- `MysteryBoxModal.tsx:33` Preview-Row: `"Tickets / Equipment R1-R3 / **bCredits**"` — user-facing literal "bCredits"!
- `bcreditsEarned` i18n-Key in DE: `"bCredits gutgeschrieben"` — user sieht "bCredits"
- TR: `"bCredits hesabina eklendi"` — gleich

**Compliance-Relevanz:**
- "bCredits" ist internes Code-Wort. User-facing sollte einheitlich "Credits" / "CR" sein (J4 B16 common-errors.md).
- Token-Namen inkonsistent: an einer Stelle "$SCOUT Credits", anderswo "CR", anderswo "bCredits". User-Vertrauen leidet.

**Fix:**
- `REWARD_PREVIEW` "bCredits" → "Credits"
- i18n-Keys `bcreditsEarned` DE/TR umformulieren
- Teil der AR-32 Vokabel-Sweep (J4)  → **AR-49**

### J5Biz-05 HIGH — Geofencing fehlt fuer Mystery Box

**Live-Check:**
- `MysteryBoxModal.tsx`: KEIN Import von `useGeoTier()` oder `geofencing`-Check
- `useHomeData.ts:198-243`: `handleOpenMysteryBox` macht keine TR-Pruefung
- `useHasFreeBoxToday` prüft nur Daily-Cap, nicht User-Location

**Business.md-Regel:**
- TIER_RESTRICTED (TR) = "Content + Free Fantasy only"
- Mystery Box fällt unter "Content + engagement" — OK (kein Kostet-Geld)
- ABER: bcredits-Drop (legendary/mythic) = credits minting → TR-User bekommt $SCOUT via Mystery Box → kann trade → braucht Trading-Access → OK, trading IS erlaubt in TR
- **ABER wenn Phase 4 kommt (Paid Mystery Box):** TR-Block zwingend

**Fix:** 
- Heute: **kein Fix nötig** (Daily FREE + keine Paid-Path in Production-UI)
- Zukunft: Feature-Flag `PAID_MYSTERY_BOX_ENABLED` + `useGeoTier()` Check im UI (analog `PAID_FANTASY_ENABLED` in J4-AR-31)
- Dokumentieren in business.md Phase 4 Tabelle

### J5Biz-06 HIGH — Mystery Box History zeigt auch paid_opens (Legacy) als wären sie Belohnungen

**Live-Check:** `MysteryBoxHistorySection.tsx` iteriert ueber ALLE `mystery_box_results` inkl. der 18 paid_opens (ticket_cost > 0). Show nur `formatRewardLabel` + `rarityConfig` + Datum. KEIN Hinweis ob es ein paid-oder-free Open war, KEINE Kosten-Anzeige.

**Transparenz-Problem:**
- User sieht "14.04.2026: 12 Tickets (Common)" — war Kostenlos ODER hat er 15 Tickets dafür bezahlt + 12 zurueckbekommen (= Verlust-3)?
- Bei Legacy-Paid-Opens: User hat 15 Tickets bezahlt für einen 12-Ticket-Common-Reward → Verlust, aber UI feiert es als "Drop"

**Fix:**
- `MysteryBoxHistorySection` sollte `ticket_cost` anzeigen: "Kostenlos" oder "−15 Tickets → +12 Tickets"
- Bei Net-Loss: rot markieren
- Transparenz: jede Mystery Box hat einen expliziten Kosten/Reward-Saldo

---

## MEDIUM

### J5Biz-07 MEDIUM — "Mögliche Belohnungen" Header kombiniert Tickets + Equipment + bCredits ohne Klarheit zur Verteilung

**Live-Text (DE):** 
```
Gewoehnlich (Common): Tickets
Selten (Rare): Tickets / Equipment R1
Episch (Epic): Tickets / Equipment R1-R2
Legendaer (Legendary): Tickets / Equipment R1-R3 / bCredits
Mythisch (Mythic): Equipment R3-R4 / bCredits
```

- Keine Indikation, welche kombination ODER alternativ
- User glaubt evtl. "bei Legendary bekomme ich ALLES" (Tickets UND Equipment UND bCredits) — aber Backend rollt nur EINEN reward_type
- **Täuschende UI** (nicht absichtlich, aber Missverständnis wahrscheinlich)

**Fix:**
- Entweder "/" ersetzen durch "oder" (i18n): "Tickets ODER Equipment R1-R3 ODER bCredits"
- Oder Drop-Raten pro reward-type zeigen (J5Biz-03 Overlap): "Tickets (30%) | Equipment (50%) | Credits (20%)"

### J5Biz-08 MEDIUM — Streak-bezogene Mystery-Box-Boosts ohne klare Kommunikation

**Live-Code:**
- Streak-Tier bei ≥90 Tage: `freeMysteryBoxesPerWeek: 1` (`streakBenefits.ts:28-34`) — Extra Box pro Woche
- `mysteryBoxTicketDiscount: 1` bei ≥4 Tage — Tickets billiger (Legacy paid-path, aktuell nicht genutzt)
- KEIN User-facing Counter/Indikator "Deine Woche-Box in 3 Tagen"

**Fix:**
- Home-Widget: wenn Tier ≥90 Tage, zeige "Weekly Bonus Box: X Tage bis reset"
- Oder zumindest in DailyChallengeCard / Missions erwähnen

### J5Biz-09 MEDIUM — Cosmetic-Reward "Neues Cosmetic freigeschaltet!" — kein Wert/Rarity-Klarheit

**Live-Text:** `cosmeticUnlocked` → "Neues Cosmetic freigeschaltet!" / "Zur Sammlung hinzugefügt"

**Transparenz:** User weiß nicht, ob der Cosmetic-Drop selten oder common war. Rarity-Badge zeigt es indirekt, aber der eigentliche Cosmetic-Name (Avatar-Rahmen? Titel? Badge?) wird nicht gezeigt. Parallel zu Frontend-J5F-06.

**Fix:** Cosmetic-Name + Cosmetic-Image sichtbar im Modal + History. Backend-Fix J5B-12.

---

## LOW

### J5Biz-10 LOW — Mystery Box heisst in TR "Gizem Kutusu" — aber im Chat/DB bleibt "Mystery Box" Englisch

**Live-Beweis:** 
- `tr.json:3080` `"mysteryBox": "Gizem Kutusu"` — korrekt lokalisiert
- `tr.json:3639` `"mysteryBoxSection": "Gizem Kutusu"` — OK
- **ABER:** `equipmentSourceMysteryBox` in TR = "Gizem Kutusu", in DE = "Mystery Box" — DE bleibt unübersetzt. Minor TR > DE asymmetry.

**Fix:** DE konsistent ubersetzen? "Mystery Box" ist in DE etabliertes Lehnwort (z.B. "Mystery Dinner", "Mystery Shopping"), also lassen. Nur TR ist korrekt lokalisiert. Kein Bug.

---

## VERIFIED OK (Live 2026-04-14)

| Check | Beweis |
|-------|--------|
| Forbidden-Words-Scan (gamble/jackpot/lottery) | 0 Treffer im MysteryBox-Scope |
| DE/TR i18n-Coverage Mystery-Box-Keys | 100% (alle Keys beidseitig vorhanden) |
| Free-Daily-Only-UX (kein paid-Path live) | `hasFreeBox` gate, paid-Button entfernt (Track C1) |
| Minor-Protection | N/A (kein explizit Age-Gate, aber Free-only = geringes Risiko) |
| Inventory-History-Zugang | via /inventory?tab=history (gated on user login) |
| Aktives-Monitoring (transaktional + Audit-Log) | activity_log hat mystery-box-Events? → nicht verifiziert, TBD |

---

## LEARNINGS (Drafts)

1. **Loot-Box-Regulierung ist im Beta-Scope gering, aber zukunfts-fatal** — Phase 4 (Paid Fantasy + Paid Mystery Boxes) braucht MGA-Lizenz + EU-Gaming-Compliance. Jeder Pfad der jetzt aufgebaut wird → Feature-Flag zwingend.
2. **Drop-Rate-Transparenz ist Standard** — App Store 3.1.1, China MoC, Belgian Gaming. Drop-Raten müssen sichtbar sein bevor App-Store-Submission. business.md-Rule: jede Zufalls-Reward-Mechanik MUSS Drop-Raten UI-exposed haben.
3. **"Mystery Box" als Term** — in DE OK (Lehnwort), in TR gut lokalisiert ("Gizem Kutusu"). Aber "Loot Box"-Framing-Risiko bleibt. Falls Phase 4 kommt, rebrand auf "Scout Belohnungs-Paket" oder ähnlich.
4. **bCredits vs Credits vs CR vs $SCOUT** — 4 verschiedene User-facing Terms fuer dasselbe. J4-AR-32 muss auf MysteryBox ausgeweitet werden.
5. **Paid-Mystery-Boxes im Code, nicht in UI** — analog J4-Paid-Fantasy-Preview. Feature-Flag + Geo-Gate nötig. Pattern: *NICHT BAUEN heisst auch NICHT VORBEREITEN*.

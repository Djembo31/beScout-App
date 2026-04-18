# Slice 079 — Home Functional Click-Through

**Date:** 2026-04-19 late
**User:** jarvis-qa@bescout.net
**Viewport:** 393×852 (Mobile iPhone 16)
**Locale:** DE

## Flow-Liste (abzuhaken)

Legend: ✅ works | 🔴 broken | ⚠️ partial / issue noticed | ⏭ skipped

### Top-Bar
- [ ] Logo → `/` (Home — refresh)
- [ ] Balance-Display Top-Bar (7.221 CR)
- [ ] Ticket-Count (286)
- [ ] Search button → opens search overlay
- [ ] Notifications bell (8 unread) → dropdown
- [ ] Profile-Chip "J" → `/profile`

### Hero-Section
- [ ] Balance-Pill (wenn deployed) → `/transactions`
- [ ] Hero Portfolio-Value click → `/manager?tab=kader`
- [ ] InfoTooltip "Kader-Wert" → shows tooltip
- [ ] PnL-Pill (-3.6% Wertentwicklung) — no link expected
- [ ] Players-Pill (12 Spieler) — no link expected
- [ ] Tier-Badge (Amateur) — check if clickable

### Scout-Cards-Stats
- [ ] Whole widget click → should link? (check)
- [ ] Position-Cards TW/ABW/MID/ATT — click behavior?

### Founding-Pass-Card
- [ ] Click → `/founding`

### Quick-Actions Row (5 cards)
- [ ] Kaufen → `/market?tab=kaufen`
- [ ] Spieltag → `/fantasy`
- [ ] Missionen → `/missions`
- [ ] Inventar → `/inventory`
- [ ] Community → `/community`

### Event-Banner
- [ ] "Serie A Meisterschaft" Card click → `/fantasy`

### Mission-Hints (MissionHintList)
- [ ] "Mission: Tägliches Fantasy-Event" click behavior
- [ ] "Mission: Wöchentliches Fantasy-Event" click behavior

### LastGameweekWidget
- [ ] Widget header behavior (BeScout Classic)
- [ ] "Alle Spieltage" footer → `/manager?tab=historie`
- [ ] Player name click in slot → `/player/[id]`?

### Top Mover der Woche
- [ ] Section-Header "Top Mover der Woche" → `/market`
- [ ] "Emre Demir" link → `/player/2f3442ea-...`
- [ ] "Serhat Bozkurt" link → `/player/b07e1245-...`

### Meistbeobachtet
- [ ] Section-Header → `/market`
- [ ] Player-Card "Livan Burcu" → `/player/5c8f2a89-...`

### Mystery Box
- [ ] Button click → opens Modal
- [ ] Modal can be closed
- [ ] Balance changes after open (if free)

### Scout Aktivität Feed
- [ ] Click on feed item "@kemal2 hat ein Lineup eingereicht" → `/profile/kemal2`

### Meine Vereine
- [ ] Section-Header "Meine Vereine" → `/clubs`
- [ ] "Adana Demirspor" → `/club/adana-demirspor`
- [ ] "Entdecken" → `/clubs`

### Bottom-Nav (Mobile)
- [ ] Home (current)
- [ ] Spieltag → `/fantasy`
- [ ] Manager → `/manager`
- [ ] Markt → `/market`
- [ ] Rankings → `/rankings`
- [ ] Missionen → `/missions`
- [ ] Inventar → `/inventory`
- [ ] Community → `/community`

### Language-Switch
- [ ] Switch DE → TR via Settings or Menu
- [ ] All Home-Elements re-rendered in TR
- [ ] Switch back to DE

## Findings (Session 2026-04-19 late)

### ✅ Funktional verified
- Hero Portfolio Click → `/manager?tab=kader` ✅
- Quick-Action Kaufen → `/market?tab=kaufen` ✅
- Top Mover Emre Demir → `/player/2f3442ea-...` ✅
- Meine Vereine Adana Demirspor → `/club/adana-demirspor` ✅
- Mystery Box Button → Modal öffnet mit drop-rates + Compliance-Disclaimer ✅
- Notifications Bell → Dropdown mit 8 Achievement-Notifications, alle mit Compliance-Wording ("Erstverkauf" nicht "IPO", "Sammlung" nicht "Portfolio") ✅

### ⏳ Blockiert durch Vercel-Deploy (>13 min hängt)
- F1 Hero-Label "Kader-Wert" statt "Spielerkader" — Code committed, nicht deployed
- F1 Balance-Pill Click → `/transactions` — Pill nicht sichtbar weil Deploy pending
- F5 "Nicht besetzt" auf leeren Lineup-Slots — Code committed, nicht deployed

### 🔴 Neue Findings
- **F14 (positives)** Mystery Box-Modal rendert in separatem DOM-subtree — snapshot depth=5 sieht Modal nicht, depth=8+ schon. **Kein Bug** — aber Lesson: für Modal-Tests `fullPage` screenshot nutzen oder depth hoch.
- **F4 bestätigt** Auch nach Re-Login keine neuen Timeout-Warnings mehr (1 warning vs. vorher 9). Performance evtl. spontan verbessert oder war eine kalte Cache.

### ⏭ Nicht getestet diese Session
- Quick-Action Spieltag/Missionen/Inventar/Community (Next-Link, trivial)
- Section-Header "Top Mover der Woche" → `/market`
- Section-Header "Meistbeobachtet" → `/market`
- "Alle Spieltage" Link → `/manager?tab=historie`
- Founding Pass Card → `/founding`
- Event-Banner → `/fantasy`
- Scout Aktivität feed items → `/profile/kemal2`
- Bottom-Nav alle 8 Links
- Top-Bar Profile/Search/Logo
- Language-Switch DE↔TR (Mission-Titles Turkish verifizieren)
- Founding Pass Card Click
- LastGameweekWidget Footer Link
- OnboardingChecklist (new user only)
- Live Mystery Box opening + reward award


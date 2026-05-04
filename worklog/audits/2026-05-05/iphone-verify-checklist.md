# iPhone Manual-Visual-Verify Checkliste — Beta GO-LIVE Pflicht-Block

**Datum:** 2026-05-05 · **Trigger:** Anil-Direktive (b) post-SO-5-Walkback
**Status:** 🔒 **BLOCKER für GO-LIVE-Tester-Mail-Versand**
**Geschätzt:** 30-45 min auf physischem iPhone (Mobile Safari iOS 18.7+)

---

## Pre-Setup (5 min)

- [ ] iPhone bereit, Mobile Safari geöffnet, NICHT PWA-Mode (für Console-Zugriff falls Bug auftritt)
- [ ] Lade `https://bescout.net` direkt (nicht via Bookmark, frischer Cache)
- [ ] Login als **Power-User-Account** (Anil's eigener Account mit Holdings + Multi-Liga)
- [ ] Sicherstellen: Account hat ≥1 Holding, ≥1 Watchlist-Player, läuft laufende GW-Events in min. 1 Liga
- [ ] DevTools-Web-Inspector verbinden (Mac → Safari → Develop → iPhone) für Console-Capture

---

## Block 1: Slice 266 Spotlight-Multi-Slot — 4 Konfigurationen (10 min)

D63 Phase 3 Live-Pulse + Daily-Driver-Discoverability. Spotlight rendert je nach Context entweder LiveScore-Slot, MysteryBox-Slot, beide gestackt oder Fallback.

### Konfig 1: `live-only` (laufende GW + Daily-Box bereits geöffnet)

**Setup:** Account während laufender Süper-Lig oder Premier-League-GW. Mystery-Box heute schon geöffnet.

- [ ] Spotlight zeigt **1 Slot „Live · Spieltag {gw} läuft"** mit „Live-Score ansehen" CTA
- [ ] Klick auf CTA leitet zu `/fantasy/spieltag` mit Live-Score-Bucket sichtbar
- [ ] Mobile 393px: kein x-overflow
- [ ] Above-fold-Check: ≤ 60vh sichtbar ohne scroll

### Konfig 2: `mb-only` (off-GW + freie Daily-Box verfügbar)

**Setup:** Keine laufende GW (alle Ligen sind off-GW). Mystery-Box heute noch nicht geöffnet.

- [ ] Spotlight zeigt **1 Slot „Daily Mystery Box · gratis"** mit „Box öffnen" CTA
- [ ] Klick auf CTA → Mystery-Box-Open-Flow (Modal oder `/inventory`)
- [ ] Mobile 393px: kein x-overflow
- [ ] Above-fold ≤ 60vh

### Konfig 3: `both` (laufende GW + freie Daily-Box)

**Setup:** Während laufender GW + Mystery-Box heute noch nicht geöffnet.

- [ ] Spotlight zeigt **2 Slots gestackt** (LiveScore oben, MysteryBox unten)
- [ ] Beide Slots sichtbar above-fold ≤ 60vh
- [ ] Beide CTAs funktional
- [ ] Vertical-Spacing zwischen Slots stimmig (kein doppelter Margin)

### Konfig 4: `neither` (off-GW + Box bereits geöffnet)

**Setup:** Keine laufende GW + Mystery-Box heute schon geöffnet.

- [ ] Spotlight zeigt **Fallback** (IPO `Erstverkauf`, TopMover `Dein Top-Spieler heute`, ODER Trending `Trending`)
- [ ] Fallback-CTA „Entdecke den Markt" funktional → `/market`
- [ ] Mobile 393px: kein x-overflow

---

## Block 2: Slice 269 Markt-Puls 3-Tab — 4 Tab-States × 2 Accounts (15 min)

D63 Phase 4 Discovery-Konsolidierung. 3 Tabs: Bewegung (Hareket) / Trends (Trendler) / Beobachtet (İzlenen).

### Account A — Power-User mit Holdings + Watchlist

#### State 1: 3-tabs (alle Tabs aktiv)

**Setup:** Account hat ≥1 Holding mit MV-Trend-Daten + ≥1 Watchlist-Eintrag + globale TopMovers verfügbar.

- [ ] **TabBar mit 3 Tabs** sichtbar: „Bewegung · Trends · Beobachtet"
- [ ] Default-Tab „Bewegung" aktiv (gold-highlighted)
- [ ] Strip darunter zeigt Player-Cards
- [ ] **Tab-Switch funktional:** Klick auf „Trends" → Strip ändert Inhalt zu globalen Trending-Movers
- [ ] **Tab-Switch funktional:** Klick auf „Beobachtet" → Strip zeigt Watchlist-Player
- [ ] **Inactive-Tabs nicht im DOM** (kein hidden-Render — DevTools Elements-Inspect prüfen)
- [ ] Mobile 393px: TabBar fits ohne overflow, Strip horizontal scrollbar wenn >3 Cards

#### State 2: 2-tabs (z.B. movers + trending, watched leer)

**Setup:** Wenn Account keine Watchlist hat ABER MV-Trend-Holdings + global Trending sichtbar.
ODER simulieren via Watchlist-Items entfernen (Heart-Icon klick auf Player).

- [ ] **TabBar zeigt nur 2 Tabs**: „Bewegung · Trends" (kein „Beobachtet")
- [ ] Default „Bewegung" aktiv
- [ ] Switch zu „Trends" funktional

#### State 3: 1-tab (nur einer aktiv)

**Setup:** Account hat NUR Watchlist-Items, kein MV-Trend-Holding, keine global trending → nur „Beobachtet"-Tab hat Daten.

- [ ] **SectionHeader+Strip ohne TabBar** (Spec-Verhalten bei 1-tab)
- [ ] Strip zeigt Watchlist-Player
- [ ] Heading „Markt-Puls" ist sichtbar mit Strip darunter

### Account B — New-User ohne Holdings/Watchlist (Test-Account oder fresh-Login)

#### State 4: 0-tabs (alles leer)

**Setup:** Frischer Account ohne Holdings, ohne Watchlist, ohne global Trending-Daten.

- [ ] ⚠️ **AKTUELL DRIFT:** h2 „Markt-Puls" leakt 16px statt unsichtbar (Slice 269 0-tabs-Edge-Case-Bug, dokumentiert in `worklog/audits/2026-05-04/mobile-repro-findings.md`)
- [ ] **Erwartet (Spec):** Section komplett unsichtbar
- [ ] **Bewertung:** P3-MINOR, nicht-Beta-blocking aber sollte als post-Beta-XS-Slice gefixt werden
- [ ] Verifizieren dass `/community`, `/market`, `/manager` etc. trotz Drift normal rendern

---

## Block 3: Slice 267 Live-Score Realtime (zeitabhängig, 5 min)

**Setup:** Während laufendem Süper-Lig oder Premier-League-Match (15:30 / 17:30 / 20:45 lokal).

- [ ] Navigate `/fantasy/spieltag`
- [ ] Live-Bucket sichtbar mit Score-Updates
- [ ] Pulse-Score-Animation läuft (gold-pulse-bg + animate-pulse)
- [ ] **Console: 0 Errors** (kein `n.values is not a function` Map-Persist-Bug — sollte gefixt sein)
- [ ] Tor-Event-Update kommt via Realtime-Channel (Score-Wert ändert sich live ohne Refresh)

---

## Block 4: JAVASCRIPT-NEXTJS-15 Repro-Check (3 min, RISK-1 Watch-Item)

**Setup:** Frisch-Reload `https://bescout.net/` auf iPhone Mobile Safari.

- [ ] Sentry NEXTJS-15 (`Maximum update depth exceeded`) — Web-Inspector Console während Page-Load watchen
- [ ] **Wenn Repro:** Console-Stack-Trace screenshotten + an Sentry NEXTJS-15 als Comment anhängen → Slice öffnen für Hot-Fix
- [ ] **Wenn KEIN Repro:** Sentry NEXTJS-15 als Resolved markieren (1-event-Singletreffer war vermutlich transient)

---

## Block 5: Functional-Click-Through Multi-Account Tour (10-15 min)

Per `feedback_polish_multi_account.md`. Nicht nur Visual — alle Interactions clicken.

### Power-User-Tour (Account A)

- [ ] Home → Manager-Block → klick „Liga-Rang" → leitet zu Rankings-Page
- [ ] Home → Streak-Risk-Card (wenn streak ≥7) → klick → leitet zu Mission-Detail
- [ ] Home → Spotlight-Slot (live oder mb) → klick CTA → erwartete Page
- [ ] Home → Markt-Puls-Tab-Switch (movers→trending→watched) → jeweils 1 Player-Card-Klick → Player-Detail-Page
- [ ] Home → „Meine Vereine"-Section → klick auf Club → Club-Detail-Page
- [ ] Home → Bottom-TabBar alle 7 Tabs einmal klicken (Spieltag/Manager/Markt/Rankings/Missionen/Inventar/Home)

### New-User-Tour (Account B oder fresh-Login)

- [ ] Home cta-new-Mode → klick „Hol dir deine erste Scout Card" → leitet zu `/market`
- [ ] Home → 4 Onboarding-Tiles („Was ist BeScout?") → jeder klick funktional
- [ ] Founding-Pass-Banner → „Mehr erfahren" → leitet zu Founding-Pass-Page
- [ ] PWA „Installieren"-Banner sichtbar (kann aber X-clickn ohne Install)

---

## Final-Sign-Off

- [ ] **Block 1 (Spotlight 4 Konfigs)** alle PASS oder Drifts dokumentiert
- [ ] **Block 2 (Markt-Puls 4 States × 2 Accounts)** alle PASS oder als bekannter Drift dokumentiert
- [ ] **Block 3 (Live-Score Realtime)** PASS oder Slot „nicht testbar weil keine laufende GW" dokumentiert
- [ ] **Block 4 (NEXTJS-15 Repro)** PASS (kein Repro) oder Hot-Fix-Slice geöffnet
- [ ] **Block 5 (Functional-Click-Through)** alle Interactions PASS

**Wenn alle Blocks PASS:**
1. `worklog/beta-phase.md`: phase D → READY, last_signoff PASS-PENDING-IPHONE-VISUAL-VERIFY → PASS
2. Recruitment-Templates rausschicken (`memory/beta-tester-recruitment-templates.md` copy-paste)
3. Onboarding-Doc-PDF an Tester senden (`memory/beta-onboarding.md`)
4. Zoom-Slots buchen mit Taki + Nail

**Wenn Block 1-2 Drifts kritisch:** XS-Hot-Fix-Slice öffnen, Re-Deploy, Re-Verify die affected Konfig, dann GO-LIVE.

**Wenn NEXTJS-15 Repro:** Slice öffnen für Hot-Fix VOR GO-LIVE — Maximum-Update-Depth ist potentiell schlimmer Render-Crash.

---

## Anti-Pattern-Reminder

- ❌ NICHT GO-LIVE-Mail an Tester schicken bevor diese Checkliste komplett durch
- ❌ NICHT Visual-Verify in Chromium-DevTools-Mobile-Emulation, das ist KEIN Mobile-Safari (NEXTJS-15 ist iOS-Engine-spezifisch)
- ❌ NICHT „sieht visuell OK aus" sagen ohne functional Click-Through (Slice 269 0-tabs h2-Leak war via Visual unauffällig, nur DOM-Inspect zeigte den Bug)

---

**Reference:** Anil-Direktive (b) 2026-05-05 post-SO-5-PASS-Walkback nach Discovery dass Playwright-Coverage nur 1/8 Konfigs (cta-new-Mode bei 0-Holdings-Account) abdeckte. CTO-Empfehlung war (a) GO-LIVE mit Tester-Coverage, Anil hat Walk-Back gewählt für Quality-First.

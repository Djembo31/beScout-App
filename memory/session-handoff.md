# Session Handoff
## Letzte Session: 2026-04-07 (Nacht)

## Was wurde gemacht

### 1. Manager Command Center (5 Waves, 1 Spec + 2 Commits)
- Spec geschrieben: `docs/plans/2026-04-06-manager-command-center-spec.md` (12 ACs, 7 Pre-Mortem, Cross-Over Analysis)
- 4-Zonen Layout: StatusBar + TacticalBoard + IntelPanel (3 Tabs) + SquadStrip
- IntelPanel: Stats (L5, Season, Fitness, Fixtures), Form (Sparkline, Consistency), Markt (P&L, Deep-Links)
- SquadStrip: horizontaler Player Bar, Position-gruppiert, Sort/Filter
- SquadPitch enhanced: Fitness Dots, Lock Icons, Equipment Badges (optional Props)
- Equipment Planning: EquipmentPicker im Manager (localStorage, kein RPC)
- Zustand Store + useManagerData Hook + Formation Data
- BottomNav: Club raus, Manager rein (5 Items: Home, Fantasy, Manager, Market, Community)
- i18n: 50+ Keys DE + TR
- Desktop: Side-by-side. Mobile: Bottom Sheet IntelPanel.

### 2. Scout Missions — verifiziert (kein Code noetig)
- DB hat 30 Mission-Definitionen (manuell im Dashboard geseedet)
- 402 aktive, 11 completed, 498 expired User-Missions
- System funktioniert E2E

### 3. Following Feed — verifiziert (kein Code noetig)
- "Folge ich" Tab in Community filtert Posts/Research/Bounties nach followingIds
- Funktioniert E2E

### 4. Transactions History — verifiziert (kein Code noetig)
- TimelineTab in ProfileView: Filter, Pagination, Icons, Day-Grouping
- Funktioniert E2E

### 5. Migration History repariert
- 7 fehlende Versionen in `supabase_migrations.schema_migrations` registriert
- `supabase db push` sollte jetzt ohne Timestamp-Konflikte funktionieren

### 6. Test Failures gefixt (3 von 8)
- BottomNav.test.tsx: Icons + Labels nach Club→Manager Swap aktualisiert
- KaderTab.test.tsx: PlayerPhoto + FormBars zum Mock hinzugefuegt
- PlayerIPOCard.test.tsx: FormBars + positionColors Mocks hinzugefuegt
- 26 Tests gruen ueber 3 Dateien

## Build
- `tsc --noEmit`: CLEAN (0 Fehler)
- Tests: 2328/2360 gruen (163/171 Files)
- 5 Commits gepusht auf main

## Offen (naechste Sessions)

### PRIO 1 — Visual QA (Anil will damit anfangen)
1. **Visual QA Manager Command Center** — gerade gebaut, noch nicht visuell geprueft. Dev-Server starten, Mobile 360px + Desktop 1280px pruefen. Alle 4 Zonen, IntelPanel Tabs, SquadStrip Scroll, Equipment Badges.
2. **Visual QA Equipment Lineup** — Braucht offenes Event. QA-Account hat 7 Equipment Items.
3. **Visual QA Stadium Noir (Home)** — Detail-QA ausstehend.

### PRIO 2 — Kalibrierung (Anil will nach QA)
4. **Mystery Box Drop-Raten kalibrieren** — Benchmark-Recherche gemacht (Brawl Stars, Genshin, Clash Royale). mystery_box_config Tabelle anpassen.

### PRIO 3 — Tech Debt (Anil will nach Kalibrierung)
5. **EventDetailModal Tests (3 failures)** — fehlende test-ids
6. **Wording Compliance TR** — Tuerkische Locale hat verbotene Begriffe (1 Test failure)
7. **DB-Live-Tests (3 failures)** — race-conditions, business-flows, event-lifecycle — brauchen echte scored Events
8. **Equipment Inventar Screen** — Optional. Equipment nur im Picker sichtbar.

## QA Account
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- 7 Equipment Items zugewiesen (fire_shot R1+R2, iron_wall R3, banana_cross R1, cat_eye R2, captain R1+R4)
- 18 Tickets, ~7.540 CR, 8 Holdings, Sakaryaspor-Fan, Bronze II

## Architektur-Notizen
- Manager = localStorage Planning Layer. KEIN DB-Write. Equipment-Plan in Zustand Store.
- EquipmentPicker wird von Fantasy (RPC) UND Manager (localStorage) genutzt — gleiche Component, unterschiedliche Callbacks.
- KaderTab lebt weiter (nicht geloescht) — wird noch von Market-Seite referenziert. Cleanup wenn Market redesigned wird.
- BottomNav: 5 Items (Home, Fantasy, Manager, Market, Community). Club nur noch in SideNav.

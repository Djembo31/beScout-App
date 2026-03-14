# BeScout Launch Battleplan — "Ultra WOW"

## Datum: 2026-03-14
## Ziel: Pilot-Launch Mitte Juni 2026 (50 Beta-Tester, Sakaryaspor)
## Vision: Premium-Produkt das suechtigt — Sorare + PokerStars + Instagram

---

## Philosophie

Der WOW-Effekt entsteht nicht durch Features sondern durch GEFUEHL.
Jede Interaktion muss sich belohnend anfuehlen.
Jeder Screen muss Premium ausstrahlen.
Jeder Tag muss einen Grund liefern zurueckzukommen.

3 Saeulen: **Sammeln** (Sorare) + **Adrenalin** (PokerStars) + **taegliche Gewohnheit** (Instagram)

---

## PHASE 1: FUNDAMENT (Wochen 1-2) — "Nichts darf wackeln"

Alles was existiert muss BULLETPROOF sein. Kein User darf je einen Fehler sehen.

| # | Task | Beschreibung | Aufwand |
|---|------|-------------|---------|
| 1.1 | CSP Headers + Security | Content-Security-Policy, Permissions-Policy, HSTS explizit | Klein |
| 1.2 | Hydration Errors eliminieren | Console muss LEER sein in Prod | Mittel |
| 1.3 | Fantasy API & Cron fertigstellen | Live-Scoring ist Kern-Feature, Cron stabil | Gross |
| 1.4 | Admin Event Management abschliessen | Club-Admin muss Events erstellen koennen | Mittel |
| 1.5 | E2E Tests komplett (inkl. 6 skipped) | Alle 68 Tests gruen, Player-Detail-Tests reparieren | Mittel |
| 1.6 | Vitest Config Fix | Stale Worktree excluden, 530/530 clean | Klein |
| 1.7 | Data Integrity Audit | Alle 4 Trade-Pfade: Fees, Balances, Side-Effects verifizieren | Mittel |
| 1.8 | Error Boundaries auf jeder Route | Crash -> Friendly Error, nie weisse Seite | Klein |
| 1.9 | SW Cache Purge bei Activate | Kein stales API-Data nach Deploy | Klein |
| 1.10 | Dependency + Env Cleanup | devtools -> devDeps, .env.example komplett, sharp -> deps | Klein |

**Gate:** Build clean, 530 Unit + 68 E2E gruen, Lighthouse >80, Console 0 Errors.

---

## PHASE 2: VOLLSTAENDIGKEIT (Wochen 3-4) — "Keine Sackgassen"

Jeder User-Flow muss KOMPLETT sein. Kein Button der ins Nichts fuehrt.

| # | Task | Beschreibung | Aufwand |
|---|------|-------------|---------|
| 2.1 | Onboarding Magic | Signup -> Welcome Bonus -> Erster DPC -> Erster Event in 5 Min | Gross |
| 2.2 | Club Admin komplett | Jeder Tab, jede Aktion fuer Sakaryaspor-Admin | Mittel |
| 2.3 | i18n Audit (DE + TR) | Kein unuebersetzter String, kein Fallback sichtbar | Mittel |
| 2.4 | Push Notification Strategie | Richtige Nachricht, richtige Zeit, kein Spam | Mittel |
| 2.5 | Empty States Audit | Neuer User sieht ueberall hilfreiche CTAs | Klein |
| 2.6 | Error States Audit | Network/Auth/RPC Error ueberall Friendly Messages | Klein |
| 2.7 | Mobile Real-Device QA | iPhone SE, Samsung A-Serie (360-428px) | Mittel |
| 2.8 | Loading States Audit | Skeleton -> Content, nie >2s Spinner | Klein |
| 2.9 | Tooltips/Hilfetexte | DPC, bCredits, L5 Score ohne Anleitung verstaendlich | Mittel |
| 2.10 | Keyboard + Screen Reader | A11y fuer jeden | Klein |

**Gate:** Komplett neuer User nutzt App ohne eine Frage zu stellen.

---

## PHASE 3: WOW DESIGN (Wochen 5-7) — "Premium-Gefuehl"

Aus "funktioniert" wird "WOW." Jeder Screen muss 10M-Dollar-App ausstrahlen.

| # | Task | Beschreibung | Aufwand |
|---|------|-------------|---------|
| 3.1 | DPC Card Holographic | Refractor/Holographic Effekt bei Kauf, Sammler-Gefuehl | Gross |
| 3.2 | Kauf-Celebration | Confetti + Card Reveal Animation, Dopamin-Hit | Mittel |
| 3.3 | Rank-Up Animation | Level-Up Screen mit Glow + Badge, episch | Mittel |
| 3.4 | Live-Ticker Integration | Echtzeit-Score im Header waehrend Spiel | Gross |
| 3.5 | Home Dashboard Redesign | Portfolio-Wert, Event, Challenge, Live auf einen Blick | Gross |
| 3.6 | Player Detail Premium | Stats-Dashboard wie Transfermarkt + Sorare Hybrid | Gross |
| 3.7 | Market Depth Charts | Bid/Ask Visualisierung, professionell wie Boerse | Mittel |
| 3.8 | Club Page Cinematic | Hero-Parallax + Live-Stats, Vereins-Stolz wecken | Mittel |
| 3.9 | Dark Mode Polish | Glassmorphism, Inset Shadows, Gold-Akzente, Tiefe | Mittel |
| 3.10 | Micro-Interactions | Button Feedback, Swipe Gestures, Response-Gefuehl | Mittel |

**Gate:** 5 Leute sagen "Wow" in den ersten 10 Sekunden.

---

## PHASE 4: SUCHT-MECHANIK (Wochen 7-9) — "Jeden Tag zurueckkommen"

Die Mechaniken die taegliche User machen.

| # | Task | Beschreibung | Aufwand |
|---|------|-------------|---------|
| 4.1 | Daily Loop | Login -> Challenge -> Reward -> Repeat, der Morgen-Grund | Mittel |
| 4.2 | Social Feed | Freunde-Aktivitaet, Trade-Reaktionen, Portfolio-Vergleich | Gross |
| 4.3 | Smart Push Timing | Personalisiertes Timing, nicht 9 Uhr pauschal | Mittel |
| 4.4 | FOMO Mechanics | Countdown, "Nur noch 3", "Endet in 2h" | Klein |
| 4.5 | Streak Rewards sichtbar | "Tag 7 = Gratis Mystery Box" Banner | Klein |
| 4.6 | Saisonale Events | Spieltag-Challenges, Club-spezifische Bonus-XP | Mittel |
| 4.7 | Ranglisten mit Kontext | "Noch 2 Trades bis #45" — konkrete naechste Aktion | Klein |
| 4.8 | Achievement Showcase | Profil-Badges die andere sehen, Status-Symbol | Mittel |
| 4.9 | Referral System | Einladung = 500 bCredits fuer beide | Mittel |
| 4.10 | Weekly Recap | "Deine Woche: +2.400 bCredits, 3 DPCs, Rang 42" | Klein |

**Gate:** Tester oeffnen App 3x/Tag ohne Aufforderung.

---

## PHASE 5: CLUB EXPERIENCE (Wochen 9-10) — "Vereine sagen JA"

B2B-Wert der sich selbst verkauft.

| # | Task | Beschreibung | Aufwand |
|---|------|-------------|---------|
| 5.1 | Club Dashboard Pro | Fan-Engagement KPIs live, Wachstums-Trends | Mittel |
| 5.2 | Revenue Reports | ROI beweisen: IPO + Trading + Abo Einnahmen | Mittel |
| 5.3 | Fan Communication Hub | News, Polls, Exclusive Content direkt an aktive Fans | Mittel |
| 5.4 | Club-Branded Experience | Vereinsfarben, Custom Badges, Wappen-Integration | Mittel |
| 5.5 | Sponsor Integration | Messbare Impressions + CTR fuer Sponsoren | Klein |
| 5.6 | Demo Mode | Voller Showcase ohne Login fuer Sales-Pitches | Klein |
| 5.7 | Onboarding-Kit | PDF + Loom + Checkliste "So starten Sie in 3 Tagen" | Klein |
| 5.8 | Multi-Club Dashboard | Platform-Ueberblick, Skalierbarkeit zeigen | Klein |

**Gate:** Sakaryaspor-Admin sagt "Das muessen wir unseren Fans zeigen" ohne Ueberreden.

---

## PHASE 6: LAUNCH (Wochen 11-12) — "Go Live"

| # | Task | Beschreibung | Aufwand |
|---|------|-------------|---------|
| 6.1 | 50 Beta-Tester rekrutieren | Sakaryaspor Fan-Gruppen, Social Media, echte Fans | Mittel |
| 6.2 | In-App Feedback System | Feedback-Button + strukturierter Survey | Klein |
| 6.3 | Monitoring Dashboard | Uptime, Error Rate, Sessions — Probleme VOR Usern sehen | Mittel |
| 6.4 | Stress Test | 50 gleichzeitige User simulieren | Klein |
| 6.5 | Legal Final Check | AGB, Datenschutz, Disclaimers, Impressum | Klein |
| 6.6 | PWA Install Polish | Manifest, Icons, Screenshots, Install-Prompt | Klein |
| 6.7 | Launch-Content | 5 Sakaryaspor Events vorbereitet + Initial IPOs | Mittel |
| 6.8 | Hotfix-Prozess | Wer meldet, wer fixt, wie schnell — bereit fuer Woche 1 | Klein |
| 6.9 | KPI Dashboard | DAU, Retention D1/D7/D30, ARPU — Erfolg messbar | Mittel |
| 6.10 | Launch-Day Checklist | DNS, SSL, Env Vars, Cron, Push — nichts vergessen | Klein |

**Gate:** 50 Sakaryaspor-Fans nutzen App taeglich, Retention D7 > 40%.

---

## Zeitleiste

```
Woche  1-2:  PHASE 1 — Fundament (Stabilisieren)
Woche  3-4:  PHASE 2 — Vollstaendigkeit (Luecken schliessen)
Woche  5-7:  PHASE 3 — WOW Design (Premium-Gefuehl)
Woche  7-9:  PHASE 4 — Sucht-Mechanik (Retention)
Woche  9-10: PHASE 5 — Club Experience (B2B-Wert)
Woche 11-12: PHASE 6 — Launch (Go Live)
```

Phase 3+4 ueberlappen (Woche 7): WOW und Sucht gehoeren zusammen.

## Arbeitsweise

- Jarvis v3 CTO-Mode: `/deliver` fuer jedes Item
- Level A default, Level B fuer Design-Items (Screenshots)
- Parallele Agents fuer unabhaengige Tasks
- Woechentliches Review mit Anil: Stand, Blocker, naechste Woche
- Knowledge Capture nach jeder Phase

## Erfolgs-Metriken

| Metrik | Ziel | Warum |
|--------|------|-------|
| DAU/MAU | >60% | Taegliche Nutzung = Sucht |
| Retention D1 | >80% | Erster Tag entscheidet |
| Retention D7 | >40% | Gewohnheit bildet sich |
| Retention D30 | >20% | Langzeit-Engagement |
| Session Duration | >3 Min | Genug Zeit fuer eine Aktion |
| Sessions/Day | >2.5 | Mehrmals taeglich checken |
| NPS | >50 | Empfehlungsbereitschaft |
| Club Admin Satisfaction | "Ja, das brauchen wir" | B2B-Verkaufsargument |

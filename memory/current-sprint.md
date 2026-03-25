# Current Sprint — Pilot Launch + UX Polish

## Stand (2026-03-25, Session 252)
- **Tests:** 2050+ (161 Files), tsc 0 Errors
- **Migrations:** 300
- **Routes:** 25
- **Pilot Readiness:** GO
- **Domain:** bescout.net

## Abgeschlossen (Session 252)
- **Event Category Cards** — Sorare-style visuelle Kategorie-Cards (5 Types)
  - Gradient Cards mit Glow, Noise, Shimmer, Logo Watermarks
  - BeScout Card: Stadion-Background (`bescout_event_card.png`)
  - Club Card: Taktikboard-Background (`club_event_card.png`) + TFF 1. Lig Logo
  - Horizontale Scroll-Row mit Snap, Click filtert EventBrowser
  - EventBrowser Pills werden bei aktiver Card-Filterung ausgeblendet
- **Event Type Badge** — EventScopeBadge → EventTypeBadge (Phase 1 komplett)
  - Zeigt jetzt Type (BeScout/Club/Sponsor/Special/Creator) statt Scope
  - Club Events zeigen Club-Name + Logo als Badge
  - Sponsor Events zeigen Sponsor-Name
  - 8/8 Tests gruen
- **Event Card Icons** — Club-Logo statt generisches Icon, BeScout Icon fuer Platform Events
- **Events API** — FK Join auf clubs Tabelle fuer clubName + clubLogo
- **Event Ownership Design** — Vollstaendiges Design Doc + Implementation Plan
  - Fee Split: Platform 5%, Club/Creator 5% (konfigurierbar via Admin)
  - Kein PBT bei Events
  - Subscription Gate server-seitig (aktuell nur UI)
  - 7 fehlende Revenue Streams dokumentiert

## Offen (naechste Session — Phase 2-4 Event Ownership)
1. **Phase 2:** `event_fee_config` Migration + Admin UI (~1h)
2. **Phase 3:** RPC Fee Split aus Config + Subscription Gate Enforcement (~1.5h)
3. **Phase 4:** Event Data Cleanup + Visual Verification (~30min)
4. DNS verifizieren + echten Signup testen
5. Email-Templates + OAuth Redirects

## Design Docs
- `docs/plans/2026-03-25-event-category-cards-design.md`
- `docs/plans/2026-03-25-event-ownership-system-design.md`
- `docs/plans/2026-03-25-event-ownership-plan.md` (Implementation Plan)

## Memory Updates
- `memory/project_missing_revenue_streams.md` — 7 Revenue Opportunities

## Blocker
- Keine

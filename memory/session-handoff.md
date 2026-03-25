# Session Handoff
## Letzte Session: 2026-03-25 (Session 252)
## Was wurde gemacht

### Event Category Cards (Sorare-Style)
- Neue `EventCategoryCards.tsx` Komponente — 5 visuelle Gradient Cards
- BeScout Card: Stadion-Background + BeScout Logo oben-mittig
- Club Card: Taktikboard-Background + TFF 1. Lig Logo oben-mittig
- Andere Cards: CSS-only mit Dual-Glow, Noise Texture, Shimmer on Hover
- Click filtert EventBrowser, nochmal Click = deselect
- EventBrowser Pills werden bei aktiver Card-Filterung ausgeblendet
- Assets: `public/stadiums/bescout_event_card.png`, `club_event_card.png`, `tff1.png`

### Event Type Badge (Phase 1 von 4)
- `EventScopeBadge` → `EventTypeBadge` (zeigt Type statt Scope)
- 5 Badge-Varianten: BeScout (gold), Club (emerald+name+logo), Sponsor (sky+name), Special (purple), Creator (orange)
- 3 Consumer updated: EventCardView, EventDetailModal, barrel export
- 8/8 Tests gruen, tsc clean
- Backward-compat Export bleibt (`EventScopeBadge` alias)

### Event Card Icons
- Club Events zeigen Club-Logo (FK Join via API Route)
- BeScout Events zeigen BeScout Premium Icon
- Fallback: generisches Type-Icon

### Event Ownership System — Design + Plan (NICHT IMPLEMENTIERT, nur Phase 1)
- Design Doc: `docs/plans/2026-03-25-event-ownership-system-design.md`
- Impl Plan: `docs/plans/2026-03-25-event-ownership-plan.md`
- Fee Split: Platform 5%, Club/Creator 5%, konfigurierbar
- Kein PBT bei Events (zu komplex, wenig Wert)
- Competitor Research: Dream11 15-25%, PrizePicks 15-20%, BeScout 5-10% (kompetitiv)
- 7 fehlende Revenue Streams in `memory/project_missing_revenue_streams.md`

---

## Naechste Session — SOFORT WEITERMACHEN

### Event Ownership Phase 2-4 (Plan steht, direkt loslegen)
Lies: `docs/plans/2026-03-25-event-ownership-plan.md`

1. **Phase 2: Fee Config Table + Admin UI** (~1h)
   - Migration `20260325_event_fee_config.sql` erstellen
   - `DbEventFeeConfig` Type in `src/types/index.ts`
   - Service Functions in `src/lib/services/platformAdmin.ts`
   - Admin UI Section in `src/app/(app)/bescout-admin/AdminEventFeesSection.tsx`

2. **Phase 3: RPC Fee Split + Subscription Gate** (~1.5h)
   - `rpc_lock_event_entry` liest Fee Config aus DB statt hardcoded
   - `min_subscription_tier` wird im RPC enforced (aktuell nur UI)
   - `tier_rank()` SQL Helper
   - `isClubEvent()` auf type-basiert umstellen
   - i18n Key `subscriptionRequired` in DE + TR

3. **Phase 4: Data Cleanup + Verification** (~30min)
   - 100 Events reviewen: Type-Zuweisungen pruefen
   - Visual QA: Badge pro Type korrekt?
   - Subscription Gate testen

### Danach
- DNS verifizieren + echten Signup testen
- 50 Einladungen raus

## Blocker
- Keine

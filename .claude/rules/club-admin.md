---
paths:
  - "src/components/admin/**"
  - "src/app/**/club/**/admin/**"
  - "src/lib/services/club*"
  - "src/lib/adminRoles*"
---

## Admin-Rollen (3 Stufen)
| Rolle | Zugriff | Einschraenkungen |
|-------|---------|-----------------|
| **Owner** | Alle 12 Tabs, alle Aktionen | Kann sich nicht selbst entfernen |
| **Admin** | 11 Tabs (kein Withdrawal) | Kein Admin-Management, keine Liquidation |
| **Editor** | 4 Tabs (Overview, Scouting, Moderation, Analytics) | Kein Trading, Events, Votes, Revenue |

- `canAccessTab(tab, role)` + `canPerformAction(action, role)` — IMMER pruefen vor Render
- Platform-Admin Override: `platformRole` gesetzt → synthetisch `admin_role='owner'`

## 12 Admin-Tabs
```
overview, players, events, votes, bounties, scouting,
moderation, analytics, fans, revenue, withdrawal, settings
```

## Subscription-Tiers
| Tier | Preis (cents) | Fee-Discount | Key Benefits |
|------|--------------|--------------|--------------|
| Bronze | 50.000 | 50 bps | Badge, 2x Vote-Gewicht, 0.5% Trading-Discount |
| Silber | 150.000 | 100 bps | + IPO Early Access (3 Tage), exklusive Bounties |
| Gold | 300.000 | 150 bps | + Score Boost, Premium Fantasy |

- Nur `status='active' AND expires_at > NOW` zaehlt
- Bei mehreren Abos: hoechster Tier gewinnt (gold > silber > bronze)
- 100% zum Club (ADR-027), Platform bekommt 0%
- DB CHECK: tier = 'bronze' | 'silber' | 'gold' (silber, NICHT silver!)

## IPO-Verwaltung (Admin+)
- Nur eligible: kein aktiver IPO + nicht liquidiert
- Status-Flow: announced → early_access → open → ended/cancelled
- Early Access = Silber+ (server-seitig in RPC, nicht UI-Gate)
- `startImmediately` Flag beeinflusst Initial-Status

## Liquidation (Owner Only)
- Voraussetzung: `success_fee_cap` MUSS gesetzt sein
- Input: Transfer-Wert (EUR), zeigt PBT-Balance
- Output: distributed_cents, pbt_distributed_cents, success_fee_cents
- Setzt `player.is_liquidated = true` — irreversibel

## Settings-Tab
- Active Gameweek: Owner only, max 38
- API-Football Sync: Admin+ (Teams, Players, Fixtures)
- Fantasy Jurisdiction: Owner only (TR/DE/OTHER)
- Team Management: Owner only (Add/Remove Admin/Editor)

## Key Services
- `getClubBySlug(slug, userId?)`, `getClubAdmins(clubId)`
- `subscribeTo(userId, clubId, tier)`, `getMySubscription(userId, clubId)`
- `createIpo(...)`, `updateIpoStatus(...)`, `setSuccessFeeCap(...)`, `liquidatePlayer(...)`
- `requestClubWithdrawal(clubId, amountCents, note?)`

## Cross-Domain (bei Bedarf nachladen)
- **Trading:** IPO-System, Fee-Split, Liquidation, Abo-Discount → `trading.md`
- **Fantasy:** Event-Erstellung, Spieltag-Lifecycle, Jurisdiction → `fantasy.md`
- **Gamification:** Score Boost (Gold), Premium Events (Gold) → `gamification.md`
- **Community:** Bounty-Management, Vote-Erstellung, Post-Moderation → `community.md`

## Haeufige Fehler
- Role als String vergleichen → Type `ClubAdminRole` nutzen
- Liquidation ohne Cap → RPC Error
- Preise in USD hardcoden → immer cents + `formatScout()`
- Sensitive Daten ohne Abo-Check → status + expires_at pruefen

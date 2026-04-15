---
name: Bug Tracker — Operation Beta Ready Phase 2
description: Findings aus 12 User-Journey E2E-Audits. Severity CRITICAL/HIGH/MEDIUM/LOW. Owner + Status live.
type: project
status: active
created: 2026-04-14
owner: CTO (Claude)
---

# Bug-Tracker — Phase 2 Journey-Audits

**Konventionen:**
- Severity: CRITICAL (Beta-Blocker, P0) | HIGH (Degradation, P1) | MEDIUM (UX-Gap, P2) | LOW (Polish, P3)
- Status: OPEN | IN-PROGRESS | FIXED | VERIFIED
- ID-Schema: `J{journey#}-{seq}` (z.B. J1-01)

---

## Journey #1 — Onboarding

Pages: `/welcome` → `/(auth)/login` → `/(auth)/onboarding` → `/home`

**Audit Status:** Backend ✅ + Business ✅ konsolidiert, Frontend ⏳ laeuft.

### Findings (Backend + Business — 2026-04-14)

| ID | Sev | Title | File:Line | Status |
|----|-----|-------|-----------|--------|
| J1-01 | 🔴 CRIT | OnboardingChecklist rendert IMMER DE (`item.labelDe`) — TR-User sehen nur Deutsch | `src/components/home/OnboardingChecklist.tsx:59` | FIXED (155a31c) |
| J1-02 | 🔴 CRIT | RPC-Migration-Drift: `claim_welcome_bonus`, `record_login_streak`, `get_auth_state` live aber KEIN Migration-File. Rollback = tot | Live-DB vs `supabase/migrations/` | OPEN (partial — record_login_streak fixed via AR-50 20260415010000, claim_welcome_bonus+get_auth_state pending) |
| J1-03 | 🔴 CRIT | Kein Wallet-Init-Trigger. User der `claim_welcome_bonus` nicht erreicht → keine Wallet → Trading broken. Live-DB Evidence: `trg_create_scout_scores` + `trg_init_user_tickets` vorhanden, Wallet-Trigger FEHLT | `supabase/migrations/*` | OPEN 🔴 BETA-BLOCKER |
| J1-04 | 🟡 HIGH | `record_login_streak` updated wallet OHNE Existence-Check → wenn wallet fehlt: `v_new_balance=NULL`, transaction INSERT broken | Live-DB RPC def (AR-50 Migration) | OPEN 🔴 BETA-BLOCKER (gekoppelt mit J1-03) |
| J1-05 | 🟡 HIGH | WelcomeBonusModal (erster Credits-Touchpoint!) ohne `<TradingDisclaimer>` | `src/components/onboarding/WelcomeBonusModal.tsx` | FIXED (b31fef1) |
| J1-06 | 🟡 HIGH | `/welcome` ohne TradingDisclaimer, bewirbt Trading+Credits | `src/app/welcome/page.tsx` | FIXED (b31fef1) |
| J1-07 | 🟡 HIGH | `/home` ohne TradingDisclaimer trotz Portfolio/PnL/Trading | `src/app/(app)/page.tsx` | FIXED (b31fef1) |
| J1-08 | 🟡 HIGH | FoundingPass-Upsell ohne `legal.foundingPassDisclaimer` | `src/app/(app)/page.tsx:110-124` | FIXED (b31fef1) |
| J1-09 | 🟡 HIGH | TIER_RESTRICTED (TR) Geofencing fehlt auf Welcome+Onboarding+WelcomeBonus — TR-User sehen Trading-CTAs | Multi-File | OPEN 🟡 Compliance |
| J1-10 | 🟡 HIGH | Multi-RPC-Chain in `handleSubmit` nicht atomar (profile + club-follow + referral + avatar + refresh) — Partial-Failure moeglich | `src/app/(auth)/onboarding/page.tsx:130-145` | FIXED (b31fef1 best-effort by design) |
| J1-11 | 🟡 HIGH | `applyClubReferral` schluckt DB-Error silent (`console.error` ohne throw) | `src/lib/services/referral.ts:94` | FIXED (155a31c) |
| J1-12 | 🟡 HIGH | `getMissionDefinitions` ohne error-destructuring (schlimmste Variante) | `src/lib/services/missions.ts:17-25` | FIXED (155a31c) |

**J1 Verification 2026-04-15:** 8/12 bereits gefixt (Commits 155a31c + b31fef1). 4 echt OPEN: J1-02 (Registry-Drift), J1-03+J1-04 (gekoppelt, Beta-Blocker), J1-09 (TR-Compliance).
| J1-13 | 🟡 HIGH | Handle-Validation blockt keine Reserved Words (admin, bescout, support, root) | `src/lib/services/profiles.ts:4` | OPEN |
| J1-14 | 🟠 MED | `claim_welcome_bonus` Service schluckt ALLE Errors mit `return { ok: false }` — kein Retry-Signal | `src/lib/services/welcomeBonus.ts:17-20` | OPEN |
| J1-15 | 🟠 MED | `welcomeBonusExplainer` nennt Credits "Waehrung" / "para birimi" — kollidiert mit "Platform Credits" Wording | `messages/de.json:3164` + `tr.json:3164` | OPEN |
| J1-16 | 🟠 MED | Login-Footer ohne Impressum-Link + ohne TradingDisclaimer | `src/app/(auth)/login/page.tsx` | OPEN |
| J1-17 | 🟠 MED | Onboarding-Seite ohne Legal-Footer (AGB/Datenschutz/Impressum) | `src/app/(auth)/onboarding/page.tsx` | OPEN |
| J1-18 | 🟠 MED | `retentionEngine.ts` hardcoded DE `rewardLabel` (4 entries) | `src/lib/retentionEngine.ts:136,144,152,160` | OPEN |
| J1-19 | 🟠 MED | Login eine Checkbox fuer 18+/AGB/Datenschutz — Legal-Review ob getrennt noetig | `src/app/(auth)/login/page.tsx:375-378` | OPEN |
| J1-20 | 🟢 LOW | `search.ts:76,106` + `notifications.ts:81` swallow errors silent | multi-file | OPEN |
| J1-21 | 🟢 LOW | `tr.json:291 home.pnl` = "+/−" statt echte Uebersetzung | `messages/tr.json:291` | OPEN |
| J1-22 | 🟢 LOW | `welcomeBonusExplainer` Dublette-Tippfehler "Scout Cards — Scout Cards —" | `messages/de.json:3164` | OPEN |
| J1-23 | 🟢 LOW | Kein End-to-End-Test fuer "createProfile→Welcome-Bonus→Streak→Missions"-Chain | Test-Coverage | OPEN |

### Frontend-Findings (CTO-Direct via Playwright MCP — 2026-04-14)

| ID | Sev | Title | Evidence | Status |
|----|-----|-------|----------|--------|
| J1-F01 | 🟡 HIGH | Home Mobile+Desktop ohne TradingDisclaimer (bestaetigt J1-07) | `qa-screenshots/journey-1-onboarding/{mobile,desktop}/02-home.png` + `desktop/02-login.png` | OPEN |
| J1-F02 | 🟡 HIGH | Welcome Mobile+Desktop ohne TradingDisclaimer (bestaetigt J1-06). Footer Links da, aber keine Disclaimer vor final CTA | `qa-screenshots/*/01-welcome.png` | OPEN |
| J1-F03 | 🟠 MED | Welcome Desktop: massive Leerflaechen zwischen Sections (Hero, "4 Wege", "So funktioniert", CTA), wirkt sparse/hollow — wahrscheinlich Scroll-Reveal Animations-State im Fullpage-Screenshot. Nicht wie optimale Page-Density | `desktop/01-welcome.png` | OPEN |
| J1-F04 | 🟠 MED | Home Mobile: "Turkish Airlines Liga" Event-Card violette Box ohne Liga-Logo (Multi-League Gap bestaetigt) | `mobile/02-home.png` | OPEN |
| J1-F05 | 🟠 MED | Home Mobile: "Letzter Spieltag" Table zeigt initial "—" fuer alle Scores, erst nach 2s Render werden echte Zahlen geladen — Loading-State koennte Skeleton nutzen statt "—" Placeholder | `mobile/02-home.png` (vergleiche 3-onboarding.png wo scores sichtbar) | OPEN |
| J1-F06 | 🟠 MED | Scout Activity Feed: 5 Eintraege alle "hat ein Lineup eingereicht" von @kemal2 — sieht nach Mock-Seed aus, nicht echte Aktivitaet | `mobile/02-home.png` | OPEN |
| J1-F07 | 🟢 LOW | PWA meta deprecation warning: `<meta name="apple-mobile-web-app-capable">` deprecated — sollte `mobile-web-app-capable` sein | Console-Warning on every page | OPEN |
| J1-F08 | 🟢 LOW | Desktop Home hat Side-Nav + Top-Bar + Hero + Widgets kompakt, aber "TOP MOVER DER WOCHE" section abgeschnitten am Viewport bottom ohne visible continuation hint | `desktop/02-login.png` | OPEN |
| J1-F09 | ✅ OK | Console-Errors: 0 auf allen getesteten Pages (/welcome, /login redirect, /, /onboarding redirect) | Console-Log | — |
| J1-F10 | ✅ OK | Onboarding-Redirect: `/onboarding` → `/` fuer bereits-onboarded User funktioniert korrekt | Navigate-Test | — |
| J1-F11 | ✅ OK | "Zum Inhalt springen" A11y-Skip-Link auf Home vorhanden | `mobile/03-onboarding.png` top-left | — |

### Live-DB Evidence
- Letzte 5 User (nailoku, test444, jarvisqa, kemal2, k_dmrts): alle haben wallet+tickets+missions ✅ System laeuft live stabil
- `club_followers` RLS komplett (4 Policies) — H2 entwarnt
- RPCs `claim_welcome_bonus` + `record_login_streak` + `get_auth_state` existieren live (definitions dumped)

---

## Journey #2 — IPO-Kauf
(pending)

## Journey #3 — Sekundaer-Trade
(pending)

## Journey #4 — Fantasy-Event
(pending)

## Journey #5 — Mystery Box
(pending)

## Journey #6 — Profile + Following
(pending)

## Journey #7 — Missions/Streak
(pending)

## Journey #8 — Verkaufen + Order-Buch
(pending)

## Journey #9 — Liga-Rang
(pending)

## Journey #10 — Watchlist + Notifications
(pending)

## Journey #11 — Equipment + Inventar
(pending)

## Journey #12 — Multi-League Discovery
(pending)

---

## Cross-Cutting Findings (Multi-Journey)

### HIGH-RISK RPC Audit (2026-04-15) — siehe `audit-high-risk-rpcs-2026-04-15.md`

| ID | Sev | Title | File/RPC | Status |
|----|-----|-------|----------|--------|
| XC-01 | 🟡 HIGH | `get_club_balance` anon-callable, NO auth-Guard — Club-Treasury fuer anon sichtbar (Business-Privacy-Leak) | Live-DB RPC | OPEN (CEO-Approval pending) |
| XC-02 | 🟡 HIGH | `get_available_sc` anon-callable, NO auth-Guard — fremde User-Holdings fuer anon sichtbar | Live-DB RPC + `src/lib/services/wallet.ts:87` | OPEN (CEO-Approval pending) |

**Kein Money-Exploit gefunden.** Alle 29 Money-RPCs haben funktionierende auth.uid Guards. Escrow (Offer+Bounty) ist atomic via PL/pgSQL. adjust_user_wallet ist fully audit-logged.

**XC-01/02 FIXED (2026-04-15 Commit 348af4d):** Migration `20260415150000_info_leak_fix_auth_guards.sql` — beide RPCs jetzt auth-gated, anon-blocked, Role-Check aktiv.

### E2E-Discovery Findings (2026-04-15)

| ID | Sev | Title | Evidence | Status |
|----|-----|-------|----------|--------|
| XC-03 | 🟢 LOW | TX-description zeigt raw cents "IPO: 1 SC für 10000 Cents/SC" statt "100 CR" | `transactions.description` nach ipo_buy via Playwright | OPEN (UX-Polish post-Beta) |
| XC-04 | 🟡 MED | React Query Cache stale nach IPO-Buy → Manager/Kader zeigt nicht neuen Holding ohne Full-Refresh | E2E: nach buy_from_ipo auf Player-Detail, Manager→Kader zeigte N-1 Spieler | OPEN (Invalidate-Sweep post-Beta) |
| XC-05 | 🔴 CRIT | 51 Image-Errors auf /market: media-4.api-sports.io NXDOMAIN (7 Liga-Logos) + media.api-sports.io next/image 400 (44 Team/Player) | E2E: Playwright console, 51 errors | FIXED (Commit 63b4c82) |
| XC-06 | 🟢 LOW | `get_auth_state` hat keinen auth.uid Guard gegen p_user_id (trust-client param) | Reviewer-Finding, RLS greift weiter | OPEN (Post-Beta hardening) |

### E2E Full-Cycle VERIFIED (2026-04-15 13:22-14:10 UTC)

**Wave 1 Solo:**
- ✅ Login (jarvis-qa@bescout.net) via Email+Password
- ✅ Home Rendering (Balance 6.861 CR, 9 Spieler, Mystery Box Preview)
- ✅ Mystery Box Modal (Drop-Rates 45/30/17/6/2 = 100% korrekt, Gratis-Box anzeigbar)
- ✅ **Mystery Box OPEN via RPC** — rare tickets +44 (182→226) — AR-42/42b Fixes LIVE-VERIFIED
- ✅ IPO-Kauf Livan Burcu (Union Berlin, BL1, 100 CR) — DB verified: wallet -10000 cents, holding +1, TX logged
- ✅ Sell-Order Place (100 CR, Floor-Button, Fee-Breakdown Brutto 100 / Gebühr 6 / Netto 94) — DB verified: orders.status=open
- ✅ Sell-Order Cancel — DB verified: orders.status=cancelled
- ✅ Broken-Images Fix live-verified: 0 Console-Errors nach Deploy (vorher 51)
- 🔴 XC-07 Watchlist-Star-Toggle: Silent Failure gefunden (siehe unten)

**Wave 2 Multi-Account:**
- ✅ **Register+Trigger-Init-Wallet**: Profile INSERT → Wallet auto-created (J1-03 Fix LIVE-VERIFIED)
- ✅ **Cross-User Trade**: jarvisqa → test1 Burcu @ 200 CR via buy_from_order. Zero-Sum verified: money -20000 + 18800 + 1200 fees = 0. Fee-Split 3.5%/1.5%/1% korrekt (700/300/200 cents).
- ✅ **P2P Offer + Escrow**: jarvisqa create_offer 150 CR → wallet.locked_balance 15000 cents (Escrow-Lock pattern verified). Cancel → locked_balance=0 (escrow released).
- ✅ **Follow/Unfollow**: user_follows row created + removed sauber

**Wave 3 Screenshots:** 9 Pages + Desktop+Mobile (rankings, airdrop, community, clubs, inventory, missions, founding, transactions, manager) captured.

### XC-07 NEW P0 BUG (E2E-Discovery)

| ID | Sev | Title | File:Line | Status |
|----|-----|-------|-----------|--------|
| XC-07 | 🔴 CRIT | Watchlist-Star auf Player-Detail ist **Silent Broken** — nur lokaler React State-Toggle, kein Service-Call, DB nie geupdated | `src/app/(app)/player/[id]/PlayerContent.tsx:68,180-182` | OPEN (Agent-Fix in Arbeit) |

Evidence: `onToggleWatchlist={() => setIsWatchlisted(!isWatchlisted)}` — ruft NICHT `addToWatchlist`/`removeFromWatchlist`. Cross-Check via Explore-Agent: 1/6 Handler-Pattern-Matches war dieser einzige Bug, alle anderen (Vote/Follow/Post-Vote) korrekt verdrahtet.

---

## Fixed + Verified

| ID | Journey | Fix-Commit | Verified-By | Date |
|----|---------|------------|-------------|------|
| — | — | — | — | — |

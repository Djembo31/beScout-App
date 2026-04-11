# Polish Sweep — Final Touch vor Business Launch

**Start:** 2026-04-09 Abend
**Ziel:** Jede Page + jeden Modal visuell verifizieren, final polieren, Produkt shippen.
**Scope:** Alle 29 Pages inkl. Club-Admin + BeScout-Admin (Q1=C)
**Reihenfolge:** Critical Path zuerst (Q2=A)
**Review-Stil:** Pro Page screenshot → review → fix → commit → nächste (Q3=A)

## Krümel-Regeln (ABSOLUT)
1. **Nur 1 Page gleichzeitig `in_progress`** — kein Multi-Tasking
2. **Commit pro Page** — saubere History, pause-fähig
3. **Scope Creep → Scope-Creep-Log (unten)**, nicht jetzt fixen
4. **Dieses File ist SSOT** — was hier steht, ist Wahrheit
5. **Fertig = fertig**: tsc clean + visual verify + Screenshot bewiesen, bevor Status auf ✅
6. **Route beibehalten**: Nacharbeiten werden dokumentiert, nicht vergessen. Ziel = abarbeiten bis fertig.

## Legend
- ⏳ pending | 🔨 in_progress | ✅ done | 🚫 skip | 📝 scope-creep

## Viewport-Konvention
- **Mobile:** 390 × 844 | **Desktop:** 1280 × 900
- **Screenshots:** `e2e/screenshots/polish-sweep/<slug>/{mobile,desktop}.png` + `{mobile,desktop}-<variant>.png`
- **Script:** `MSYS_NO_PATHCONV=1 npx tsx e2e/qa-polish.ts --path=/ --slug=home` (lokal dev)

---

## Phase 1 — Critical Path (6 Pages)

### #1 Home — `/` → `home` — Status: ✅ done (Pass 1 + Pass 2 A+B1+C, Track D deferred)

**Session 2026-04-09 Abend Requirements (Anil):**

**Track A — Home Polish — ✅ Pass 1 DONE (Commit pending)**

| ID | Item | Status |
|----|------|--------|
| A1 | "Entdecke den Markt" — marktPulse section + HomeSpotlight fallback beide raus | ✅ |
| A2 | "Melde dich für Fantasy Event" Banner (SuggestedActionBanner) raus | ✅ |
| A3 | "Mein Spielerkader" (PortfolioStrip) raus + neuer "Top Mover der Woche" Block mit Empty-State | ✅ (Empty-State Option A implementiert) |
| A4 | SC-Count + TW/ABW/MID/ATT Split Widget (`ScoutCardStats.tsx`) | ✅ |

**Track B — "Letzter Spieltag" Widget — ✅ Pass 2 DONE**

| ID | Item | Scope | Status |
|----|------|-------|--------|
| B1 | Home-Widget "Dein letzter Spieltag" | **Nur Fantasy-Event Teilnahmen** (keine Predictions/Missions). Zeigt: letztes gescorte Event + User-Aufstellung + Platzierung + Punkte + Link | ✅ |

**Pass 2 Artefakte (B1):**
- New file: `src/components/home/LastGameweekWidget.tsx` — self-contained component
  - Queries: inline `useQuery` with home-scoped keys (`['home','lastFantasyResult',uid]` + `['home','lineupSnapshot',eventId,uid]`) to avoid cache collision with Manager Historie tab
  - Services reused: `getUserFantasyHistory(uid, 1)` + `getLineup(eventId, uid)` from `@/features/fantasy/services/lineups.queries`
  - Format detection: `getFormationsForFormat` + `buildSlotDbKeys` from `@/features/fantasy/constants`
  - Slot rows reversed for pitch order (ATT → MID → DEF → GK)
  - Anil option C: full lineup grid, one row per slot with position tag + player + score
  - Empty state: Card with Swords icon + CTA to `/fantasy`
  - Footer link: `/manager?tab=historie` for full history
- Modified: `src/app/(app)/page.tsx` — widget rendered between ScoutCardStats and Top-Mover block in main column
- Modified: `src/components/home/index.ts` — barrel export
- Modified: `messages/de.json` + `messages/tr.json` — `home.lastGameweek.*` namespace (title/score/rank/reward/allHistory + emptyTitle/Desc/Cta)
- Verified: `tsc --noEmit` clean
- Screenshots: `e2e/screenshots/polish-sweep/home/{mobile,desktop}.png` (refreshed after widget render; jarvis-qa shows real "Sakaryaspor Fan-Challenge" data — 487 score / #26 rank / +250 CR reward / 7 lineup slots)

**Track C — Mystery Box Compliance — ✅ Pass 1 DONE (Commit pending)**

| ID | Item | Status |
|----|------|--------|
| C1 | Kauf-Option im Modal komplett raus (`canAfford = hasFreeBox`, neuer "dailyBoxClaimed" State) | ✅ |
| C2 | Free-Box: wöchentlich → täglich (3 Call-Sites: useHomeData, page.tsx, missions/page.tsx) | ✅ |
| C3 | Tickets bleiben für Paid Events | ✅ |
| C4 | **Backend-Check:** open_mystery_box_v2 RPC — 1x täglich durchsetzen? | ⏳ Scope-Creep (noch offen) |

**Track D — BeScout Liga + Rankings Hub** — **DEFERRED** → `memory/project_bescout_liga.md`

Separates Feature-Projekt mit eigenem Spec. Home wird nach Track-D-Abschluss um ein Liga-Widget ergänzt. Siehe Spec-File für Economy-Abstimmung (CardMastery, PBT, Community Success Fee, Club-Mitgliedschaftslevel).

**Home Page DONE-Kriterium:**
- ✅ Track A1-A4 umgesetzt, tsc clean, Mobile-Screenshot beweist alle Änderungen
- ✅ Track B1 umgesetzt, Last-Event-Widget rendert mit echten Daten (jarvis-qa Sakaryaspor Fan-Challenge 487/#26/+250)
- ✅ Track C1-C2 umgesetzt, Mystery Box Modal zeigt nur daily free-open, kein Kauf (Modal-Verifikation C-Live als nächste Session bei Bedarf)
- ✅ Track D Liga-Widget-Integration wird nach separatem Liga-Spec gemacht (nicht heute)

**Pass 1 Artefakte:**
- Screenshots: `e2e/screenshots/polish-sweep/home/{mobile,desktop}.png`
- Geänderte Dateien: `page.tsx`, `useHomeData.ts`, `missions/page.tsx`, `HomeSpotlight.tsx`, `index.ts`, new `ScoutCardStats.tsx`, `MysteryBoxModal.tsx`, `de.json`, `tr.json`, deleted `PortfolioStrip.tsx`, `SuggestedActionBanner.tsx`

---

### Nächste Pages (nach Home)

| # | Page | Slug | Sub-Routes / Tabs | Modals | Status |
|---|------|------|-------------------|--------|--------|
| 2 | Market | `/market` → `market` | Mein Kader (Bestand/Angebote) + Marktplatz (Club Verkauf/Von Usern/Trending/Watchlist) | SellModal, BuyConfirmModal, BuyOrderModal, CreateOfferModal | 🔨 in_progress |
| 3 | Fantasy | `/fantasy` → `fantasy` | Spiele / Events / Mitmachen / Ergebnisse | EventDetail, Summary, CreatePrediction, FixtureDetail, CreateEvent | ⏳ |
| 4 | Player Detail | `/player/[id]` → `player` | — | Buy, Sell, LimitOrder, Offer | ⏳ |
| 5 | Profile (eigen) | `/profile` → `profile` | Übersicht / Holdings / Verlauf / Timeline | FollowList | ⏳ |
| 6 | Inventory | `/inventory` → `inventory` | equipment / cosmetics / wildcards / history | EquipmentDetail | ⏳ |

## Phase 2 — Supporting Pages (12 Pages)

| # | Page | Slug | Status |
|---|------|------|--------|
| 7 | Manager | `/manager` → `manager` | ⏳ |
| 8 | Missions | `/missions` → `missions` | ⏳ |
| 9 | Community | `/community` → `community` | ⏳ |
| 10 | Transactions | `/transactions` → `transactions` | ⏳ |
| 11 | Clubs | `/clubs` → `clubs` | ⏳ |
| 12 | Club (eigen) | `/club` → `club-own` | ⏳ |
| 13 | Club Detail | `/club/[slug]` → `club-detail` | ⏳ |
| 14 | Compare | `/compare` → `compare` | ⏳ |
| 15 | Airdrop | `/airdrop` → `airdrop` | ⏳ |
| 16 | Founding | `/founding` → `founding` | ⏳ |
| 17 | Profile (public) | `/profile/[handle]` → `profile-public` | ⏳ |
| 18 | Profile Settings | `/profile/settings` → `profile-settings` | ⏳ |

## Phase 3 — Auth / Onboarding / Public (5 Pages)

| # | Page | Slug | Status |
|---|------|------|--------|
| 19 | Welcome | `/welcome` | ⏳ |
| 20 | Login | `/login` | ⏳ |
| 21 | Onboarding | `/onboarding` | ⏳ |
| 22 | Pitch | `/pitch` | ⏳ |
| 23 | Blocked | `/blocked` | ⏳ |

## Phase 4 — Admin (2 Pages)

| # | Page | Status |
|---|------|--------|
| 24 | Club Admin (`/club/[slug]/admin`) | ⏳ |
| 25 | BeScout Admin (`/bescout-admin`) | ⏳ |

## Phase 5 — Static / Legal (4 Pages)

| # | Page | Status |
|---|------|--------|
| 26 | AGB (`/agb`) | ⏳ |
| 27 | Datenschutz (`/datenschutz`) | ⏳ |
| 28 | Impressum (`/impressum`) | ⏳ |
| 29 | Auth Callback (`/auth/callback`) | 🚫 technical redirect |

---

## Scope-Creep-Log (Nacharbeiten)
*Items die während einer Polish-Iteration auffallen → hier rein, nicht sofort fixen. Am Ende abarbeiten.*

| Gefunden bei | Item | Severity | Target-Page / Context | Status |
|--------------|------|----------|------------------------|--------|
| Home A3 | **`price_change_7d` / `get_my_top_movers_7d` RPC** — aktuell nur 24h-change verfügbar. Für echtes "Top Mover der Woche" braucht es entweder neue DB column oder RPC der aus `trades` aggregiert | M | Home Widget, später auch Market-Page | ✅ done (efcb3f5 — `get_player_price_changes_7d` RPC live, `useHomeData` wired) |
| Home C4 | **Backend open_mystery_box_v2 daily-cap check** — aktuell `freeMysteryBoxesPerWeek`, nach daily switch prüfen ob backend gated | M | Mystery Box RPC | ✅ done (efcb3f5 initial + 7eb7d37 follow-up fixte 3 RPC-Bugs + server-authoritative Frontend-Gate; live auf bescout.net verifiziert 2026-04-11) |
| Track D | **CardMastery Konzept** — Anil hat es als Economy-Touchpoint erwähnt, aber das Feature existiert nicht im Code. Muss definiert werden. | L | BeScout Liga Spec | 🚫 skip — Anil 2026-04-10: "AUS SCOPE ENTFERNT" (siehe `bescout-liga.md` Economy-Entscheidungen) |

---

## Session Log

- **2026-04-09 20:00** — File erstellt, Sitemap inventarisiert (29 Pages, ~24 Modals). Start mit Home (#1).
- **2026-04-09 22:30** — Home Requirements session mit Anil. Track A/B/C/D defined. Track D deferred to separate spec (`project_bescout_liga.md`). Track A+B+C starten jetzt.
- **2026-04-09 23:57** — Home Pass 1 (A+C) committed (d995738). Track B1 + Track D deferred to next session.
- **2026-04-10 00:30** — Home Pass 2 (B1) committed. Anil Option C (full lineup grid) / Position B (main column after ScoutCardStats) / Empty B (recruit CTA). Widget reused existing fantasy services via self-contained inline queries with home-scoped keys. Home page flipped to ✅ done — Market is next.
- **2026-04-10 Abend** — Market Polish Pass 1: DPC→Scout Card (DB), bC→CR (6 Stellen), HOT-Badge raus, 21 Platzhalter-Sponsoren deaktiviert (4d4f4cc).
- **2026-04-10 Abend** — Market "Bestand" Tab (neuer Default in Mein Kader): Portfolio-Header, FormBars+L5 (KaderPlayerRow Pattern), Position/Club Filter, Sell-Button ($) mit 3 Zustaenden (rot=Nachfrage, gold=gelistet, grau=normal), Pitch/Goal/Assist Icons, Club-Logos, Trikotnummer+Alter, StatusBadge. 12 Commits.
- **2026-04-10 Abend** — FormBars Reihenfolge gefixt (oldest→newest links→rechts) global.
- **2026-04-10 Abend** — Naechste Session: Watchlist in Marktplatz verschieben, Marktplatz-Tab im Detail durchgehen.
- **2026-04-11** — Mystery Box endless-loop bug gefixt (3 kaskadierende RPC-Bugs in efcb3f5 + server-authoritative Gate, Commit 7eb7d37). Live auf bescout.net verifiziert. Scope-Creep-Log auf aktuellen Stand gebracht: Home A3 ✅, C4 ✅, Track D 🚫. Naechste Session weiter mit Market Polish (Watchlist-Move + Marktplatz-Tabs im Detail).

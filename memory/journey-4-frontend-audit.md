---
name: Journey 4 Frontend Audit — Fantasy-Event-Teilnahme
description: Read-only Frontend-Audit der Fantasy-User-Journey (/fantasy → Event → Lineup → Result → Reward-Claim). 27 Findings.
type: project
status: ready-for-aggregation
created: 2026-04-14
owner: Frontend Agent
---

# Journey #4 — Fantasy-Event-Teilnahme Frontend Audit

**Scope:** `/fantasy` → EventsTab → EventDetailModal → LineupBuilder → PlayerPicker → ResultScreen → RewardClaim → GwHeroSummary → EventSummaryModal.

**Methode:** Read-only Static-Analysis gegen common-errors.md Patterns, business.md Compliance, SKILL.md Mobile-First, J3-Aggregate-Patterns.

**Audit-Zeitraum:** 2026-04-14.

**Cross-References:** J1 (Onboarding), J2 (IPO), J3 (Sekundaer-Trade).

---

## Summary

**Total: 27 Findings — 7 CRITICAL + 10 HIGH + 7 MEDIUM + 3 LOW**

Verteilung nach Thema:
- **Multi-League Props-Gap (P0 SSOT-Item):** 5 CRITICAL Findings (Type + 4 Components)
- **i18n-Key-Leak via Service-Errors (J3-Pattern-Wiederholung):** 2 CRITICAL + 2 HIGH
- **Modal preventClose fehlt KOMPLETT:** 3 CRITICAL (3 Modals mit pending-State)
- **Compliance-Wording (Gluecksspiel + Investment-Framing):** 4 HIGH
- **Native `alert()`/`confirm()` auf Mobile:** 2 HIGH (EventDetailModal)
- **Hardcoded EN/DE-Strings im DE/TR-File:** 3 MEDIUM + 3 LOW
- **Hardcoded LEAGUES-Array in SpieltagTab (trotz 7 Ligen live):** 1 HIGH
- **Skeleton vs Loader2 Inkonsistenz:** 2 MEDIUM
- **Flex-/Layout-Issues:** 0 Treffer (Tabs sind korrekt flex-shrink-0)

**Beta-Blocker (Critical + High-Prio-Money):** 12 Findings → Healer-Worktrees parallel empfohlen.

---

## Critical Findings (7)

### J4F-01 — FantasyEvent Type hat KEIN leagueShort/leagueLogoUrl (Multi-League P0-Root-Cause)

**Severity:** CRITICAL
**File:** `src/features/fantasy/types.ts:30-88`

**Problem:**
```ts
export type FantasyEvent = {
  // ...
  leagueId?: string;
  leagueName?: string;   // ← nur Name-String, kein Logo/Short
  // KEIN leagueShort
  // KEIN leagueLogoUrl
  // KEIN leagueCountry
};
```
`UserDpcHolding` (Line 98-122) hat `clubId`/`clubLogo` — aber NULL fuer Liga. Kein Player-Feld `league*` im Fantasy-Context.

**Beweis:**
- SSOT Phase 2 Item J4: "EventDetailHeader + GwHeroSummary Liga-Logos fehlen" — **Root-Cause** ist fehlender Type, nicht fehlende Render-Logik.
- `grep leagueLogoUrl|leagueShort` in `src/features/fantasy/` → **0 Treffer** (verifiziert).
- Multi-League Expansion Commit 8a5014d hat 7 Ligen/134 Clubs/4.263 Spieler eingefuehrt. Fantasy bleibt 1-Liga-UI.
- `src/components/fantasy/events/RequirementChips.tsx:51-52` zeigt Liga nur als Globe-Chip mit Text, kein Logo.

**Fix-Vorschlag:**
Type erweitern + Mapper `dbEventToFantasyEvent` + DB-Query ergaenzen:
```ts
export type FantasyEvent = {
  // ...
  leagueId?: string;
  leagueName?: string;
  leagueShort?: string;      // + NEU
  leagueLogoUrl?: string;    // + NEU
  leagueCountry?: string;    // + NEU (fuer CountryBar-Sync)
};
export type UserDpcHolding = {
  // ...
  leagueShort?: string;      // + NEU (fuer PlayerPicker)
  leagueLogoUrl?: string;    // + NEU
};
```
Dann Props-Propagation durch alle Render-Call-Sites (siehe J4F-02..05). J3-Learning #2 systematisch anwenden.

**Pattern-Match:** common-errors.md "Multi-League Props-Propagation-Gap" (J3-Fund).

---

### J4F-02 — EventDetailHeader zeigt KEINE Liga (SSOT-P0)

**Severity:** CRITICAL
**File:** `src/features/fantasy/components/event-detail/EventDetailHeader.tsx:26-69`

**Problem:**
Header rendert Club-Logo (`EventTypeBadge` → `clubLogo`), aber Liga bleibt unsichtbar. Bei BL/PL/Serie A/LaLiga/SuperLig/BL2-Events sieht der User nicht welche Liga das Event betrifft.

**Beweis:**
```tsx
// Zeile 46:
<EventTypeBadge type={event.type} clubName={event.clubName} clubLogo={event.clubLogo} sponsorName={event.sponsorName} size="sm" />
// Nirgends: leagueLogoUrl, leagueShort
```

**Fix-Vorschlag:**
Zwischen EventTypeBadge und Mode-Chip einbauen:
```tsx
{event.leagueShort && (
  <LeagueBadge size="sm" logoUrl={event.leagueLogoUrl} short={event.leagueShort} />
)}
```
Siehe J3-FIX-08 (TradingCardFrame-Pattern).

---

### J4F-03 — GwHeroSummary zeigt KEINE Liga des MVPs (SSOT-P0)

**Severity:** CRITICAL
**File:** `src/components/fantasy/ergebnisse/GwHeroSummary.tsx:27-101`

**Problem:**
MVP-Hero-Row zeigt Player + Goal-Badge + Avg-Rating, aber keine Liga-Zugehoerigkeit. Bei Multi-League-Betrieb kann ein User nicht erkennen, ob der MVP aus BL, PL, SuperLig etc. ist.

**Beweis:**
```tsx
// Zeile 44-67: nur PlayerPhoto + PositionBadge + Score, kein Liga-Indikator
<PlayerPhoto imageUrl={best.player_image_url} first={...} last={...} pos={...} size={56} />
```
`FixturePlayerStat` Type (in `@/types`) muss `leagueShort`/`leagueLogoUrl` propagieren; RPC `getGameweekTopScorers` liefert es aktuell nicht.

**Fix-Vorschlag:**
1. RPC `get_gameweek_top_scorers` um `league_short, league_logo_url` erweitern (Backend-Impact)
2. `FixturePlayerStat` Type erweitern
3. GwHeroSummary: Nach Zeile 66 (nach PositionBadge) einbauen:
```tsx
{best.league_short && (
  <LeagueBadge size="sm" logoUrl={best.league_logo_url} short={best.league_short} />
)}
```
4. Die 4-col stat strip (Zeile 78-95) koennte optional +1 Col fuer "League" bekommen.

**Cross-Impact:** Backend/Impact-Agent pruefen.

---

### J4F-04 — PlayerPicker zeigt KEINE Liga des Spielers (SSOT-P0)

**Severity:** CRITICAL
**File:** `src/features/fantasy/components/lineup/PlayerPicker.tsx:172-188`

**Problem:**
Im Lineup-Builder waehlt der User Spieler aus Holdings. Bei Multi-League-Holdings ist nicht sichtbar aus welcher Liga der Spieler kommt — nur Club-Short. Zwei Clubs mit aehnlichem Short (z.B. "KS Karabuk" vs "KSC Karlsruhe") kollidieren.

**Beweis:**
```tsx
// Header Zeile 183-188:
<h3 className="font-black text-base">{t('selectPos', { pos: POS_LABEL[position] || position })}</h3>
<div className="text-xs text-white/40">{t('availableCount', { count: availablePlayers.length })}</div>
```
Kein Liga-Filter, kein Liga-Chip. `FantasyPlayerRow` (Zeile 118-119) zeigt nur `player.club` als Short.

**Fix-Vorschlag:**
1. `UserDpcHolding.leagueShort/leagueLogoUrl` ergaenzen (Type siehe J4F-01)
2. Header um Liga-Gruppierung oder -Filter erweitern (Option A: Dropdown aller Ligen in Holdings, Option B: `CountryBar`/`LeagueBar` einbauen)
3. `FantasyPlayerRow` in Line 111-119 Liga-Logo zeigen:
```tsx
{clubData?.logo && <Image ... />}
+ {player.leagueLogoUrl && <Image src={player.leagueLogoUrl} alt="" width={14} height={14} />}
<span className="text-xs text-white/50">{player.club}</span>
```

---

### J4F-05 — EventCardView zeigt KEINE Liga-Zugehoerigkeit

**Severity:** CRITICAL
**File:** `src/components/fantasy/events/EventCardView.tsx:54-88`

**Problem:**
Row-1 in Card zeigt Club-Logo, TypeBadge, "Liga"-Label fuer `isLigaEvent` — aber kein Liga-Logo/Short. Im Event-Browser bei 7 Ligen kann User nicht visuell nach Liga gruppieren.

**Beweis:**
```tsx
// Zeile 75-79:
{event.isLigaEvent && (
  <span ...>Liga</span>   // nur Gold-Chip "Liga", kein Logo
)}
```
Meta-Row (Zeile 93-99): Format + Modus, keine Liga.

**Fix-Vorschlag:**
Row 1 erweitern:
```tsx
{event.leagueLogoUrl && event.leagueShort && (
  <LeagueBadge size="xs" logoUrl={event.leagueLogoUrl} short={event.leagueShort} />
)}
```

**Identisches Pattern:** `EventCompactRow.tsx`, `EventSpotlight.tsx`, `EventDetailHeader.tsx`.

---

### J4F-06 — EventDetailModal hat KEIN preventClose trotz joining-Mutation

**Severity:** CRITICAL
**File:** `src/components/fantasy/EventDetailModal.tsx:196`

**Problem:**
```tsx
<Modal open={isOpen} onClose={onClose} title={event.name} size="lg">
// joining = true (useLineupSave), leaving = true (handleLeave), resetting = true (handleResetEvent)
// KEIN preventClose={joining || leaving || resetting}
```
User drueckt ESC/Backdrop waehrend Lineup-Save auf 4G TR (500-800ms) → Modal schliesst, Lineup-Save laeuft weiter im Background, kein Feedback ob Success/Fail. Auf Beta-Welle #1 (Comunio-Veteranen auf Mobile) wird das aktiv weh tun.

**Beweis:**
- `grep -n preventClose src/components/fantasy/**` → **0 Treffer**
- `grep -n preventClose src/features/fantasy/**` → **0 Treffer**
- SellModal/BuyModal nach J3-Fix haben `preventClose` — Fantasy-Modal aber nicht. Inkonsistent.

**Fix-Vorschlag:**
```tsx
<Modal
  open={isOpen}
  onClose={onClose}
  title={event.name}
  size="lg"
  preventClose={joining || leaving || resetting}
>
```

**Pattern-Match:** common-errors.md "Modal preventClose Pattern (J2F-04 + J3F-06..08)" — Fantasy wurde in J2/J3 uebersprungen, muss jetzt nachgezogen werden.

---

### J4F-07 — useEventActions i18n-Key-Leak in submitLineup (J3-Pattern-Wiederholung)

**Severity:** CRITICAL
**File:** `src/features/fantasy/hooks/useEventActions.ts:143,167-186`

**Problem:**
```tsx
// Zeile 143:
addToast(t('errorGeneric', { error: 'Not authenticated' }), 'error');   // hardcoded EN

// Zeile 183:
} else if (msg === 'lineup_save_failed') {
  addToast(t('errorGeneric', { error: 'Lineup konnte nicht gespeichert werden. Bitte erneut versuchen.' }), 'error');
  // hardcoded DE — TR-User sieht DE statt Tuerkisch
}
```
TR-User auf Beta sieht DE-Error. Zusaetzlich `'Not authenticated'` wird nie uebersetzt (EN). Das ist der gleiche Systemfehler wie J3-FIX-01 (handleSell), nur hier beim Lineup-Save.

**Beweis:**
- J3 hat `handleBuy`, `handleSell`, `placeBuyOrder` gefixt via `mapErrorToKey(normalizeError(e)) + te(key)` Pattern.
- Fantasy-`submitLineup`, `joinEvent`, `leaveEvent` nutzen das Pattern teilweise (Zeile 128, 185, 263), aber `lineup_save_failed` + `'Not authenticated'` sind hardcoded-Fallbacks.

**Fix-Vorschlag:**
```tsx
// Zeile 142-144:
if (!user?.id) {
  addToast(te('notAuthenticated'), 'error');  // neuer i18n-Key DE+TR
  return;
}

// Zeile 182-183:
} else if (msg === 'lineup_save_failed') {
  addToast(te('lineupSaveFailed'), 'error');  // neuer i18n-Key
}
```
+ `messages/de.json`: `"errors": { "lineupSaveFailed": "Aufstellung konnte nicht gespeichert werden. Bitte erneut versuchen.", "notAuthenticated": "Nicht angemeldet" }`
+ `messages/tr.json`: `"errors": { "lineupSaveFailed": "Kadro kaydedilemedi. Tekrar dene.", "notAuthenticated": "Oturum acik degil" }`

**Pattern-Match:** common-errors.md "i18n-Key-Leak via Service-Errors" — J3 Evidence-Block schreibt explizit: "nach JEDEM swallow→throw-Refactor ALLE gleichartigen Consumer-Pfade greppen". Fantasy wurde in J3 nicht geprueft.

---

## High Findings (10)

### J4F-08 — Native `alert()`/`confirm()` im EventDetailModal (Mobile-UX-Desaster)

**Severity:** HIGH
**File:** `src/components/fantasy/EventDetailModal.tsx:148, 160, 162, 165, 173, 179`

**Problem:**
```tsx
Zeile 148: if (!confirm(t('confirmResetMsg'))) return;
Zeile 160: alert(t('resetSuccess'));
Zeile 162: alert(t('resetFailed', { error: result.error ?? 'Unknown' }));
Zeile 165: alert(t('errorShort', { msg: e instanceof Error ? e.message : 'Unknown' }));
Zeile 173: if (confirm(t('confirmLeaveMsg', { name: event.name }))) {
Zeile 179: alert(t('leaveError', { msg: e instanceof Error ? e.message : 'Unknown' }));
```
Native Browser-Dialoge sind auf iPhone/Android hässlich, zeigen "localhost says:" / "bescout.net says:", stoeren den Mobile-Focus und lassen sich nicht stylen. Zudem ueber "Unknown" fallback im `err.message` wird potenziell Raw-Error-Key geleakt (J3-Learning #5).

**Beweis:**
- `grep alert\\( src/components/fantasy/` → 4 Treffer (alle in EventDetailModal)
- `grep confirm\\( src/components/fantasy/` → 2 Treffer (EventDetailModal)
- Es gibt `Modal` + `useToast` + `ConfirmDialog` bereits in Codebase, aber nicht genutzt.

**Fix-Vorschlag:**
- Replace `alert(...)` mit `addToast(..., 'success' | 'error')` (via `useToast()`)
- Replace `confirm(...)` mit ConfirmDialog-Modal (bottom-sheet auf Mobile)
- `JoinConfirmDialog.tsx` existiert bereits als Vorlage fuer Leave/Reset

---

### J4F-09 — Hardcoded `'Unknown'` Error-Fallback leakt als Message

**Severity:** HIGH
**File:** `src/components/fantasy/EventDetailModal.tsx:162, 165, 179`, `EventCommunityTab.tsx` (Annahme)

**Problem:**
```tsx
alert(t('resetFailed', { error: result.error ?? 'Unknown' }));           // hardcoded 'Unknown'
alert(t('errorShort', { msg: e instanceof Error ? e.message : 'Unknown' }));  // gleicher Bug
```
Wenn `err.message` ein i18n-Raw-Key ist (z.B. `'event_locked'`), sieht der User den Key statt uebersetzter Message. Zusaetzlich ist `'Unknown'` ein hardcoded-EN-String im DE/TR-File.

**Fix-Vorschlag:**
```tsx
const msg = e instanceof Error ? te(mapErrorToKey(normalizeError(e))) : te('unknownError');
addToast(t('errorShort', { msg }), 'error');
```

**Pattern-Match:** i18n-Key-Leak + EN-Fallback-in-DE.

---

### J4F-10 — "gewinne Credits-Preise!" Gluecksspiel-Framing (Compliance P0)

**Severity:** HIGH
**File:** `messages/de.json:4525` + `messages/tr.json:4525`

**Problem:**
```json
"fantasyDesc": "Stelle dein Lineup auf, tritt gegen andere an und gewinne Credits-Preise!"
"fantasyDesc": "Kadronuzu kur, rakiplerinizle yarış ve Credits ödüllerini kazan!"
```
"gewinne Preise" / "ödül kazan" triggert Gluecksspiel-Wording. In TIER_RESTRICTED (TR) haben wir Free Fantasy laut business.md — aber Wording "Preise gewinnen" positioniert es als Lotterie/Gaming.

**Zusatz:**
```json
Zeile 324: "winners24h": "Gewinner (24h)",
Zeile 389: "prizeMoney": "Preisgeld",        // = Gambling-Terminologie
Zeile 413: "prize": "Prämie",
Zeile 649: "prizeMoney": "Preisgeld",        // Duplicate
Zeile 652: "wonScout": "Gewonnene Credits",  // "Gewonnene" ist Gambling
Zeile 3538: "feature_fantasy_desc": "Wöchentliche Turniere — Credits Preise, Ranglisten, Badges"
```

**Beweis:**
- J3 hat `AR-15` ("am Erfolg beteiligen" SPK-Red-Flag) dokumentiert, aber Fantasy ist noch nicht gesweept.
- common-errors.md und business.md haben aktuell nur IPO-Begriffsregel, kein Fantasy-Glossar.

**Fix-Vorschlag (CEO-Approval-Trigger):**
- `"gewinne Credits-Preise!"` → `"spiele um Rewards"` / `"sammle Rewards"` / `"Meister werde im Ranking"`
- `"wonScout"` → `"Erhaltene Rewards"` (nicht "Gewonnene")
- `"prizeMoney"` → `"Reward-Pool"` / `"Rewards"` (nicht "Preisgeld")
- `"Gewinner 24h"` → `"Top Performer 24h"`
- TR: `"Ödülleri kazan"` → `"Ödülleri al"` oder `"Derecelere katıl"`

**Anmerkung:** Cross-Audit Business Agent muss final entscheiden. Dokumentieren in business.md als AR-Journey-4 Glossary-Item.

---

### J4F-11 — "prizePool"/"prizeLabel" = hardcoded "Prize" (EN im DE-File!)

**Severity:** HIGH
**File:** `messages/de.json:448, 593`

**Problem:**
```json
Zeile 448: "tablePrize": "Prize",        // EN im DE-File
Zeile 593: "prizeLabel": "Prize",        // EN im DE-File
```
Zusaetzlich `EventCompactRow.tsx:52`:
```tsx
<span className="text-purple-400 font-mono tabular-nums">
  {event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool} Prize
</span>
// ↑ "Prize" hardcoded im Code (EN) — ebenfalls DE-User sieht "Prize" statt "Prämie"
```

**Fix-Vorschlag:**
- `de.json`: `"tablePrize": "Prämie"`, `"prizeLabel": "Prämie"`
- `EventCompactRow.tsx:52`: `{...} {t('prizeLabel')}`
- TR ist bereits OK: `"tablePrize": "Ödül", "prizeLabel": "Ödül"`

**Siehe auch J4F-10 (Compliance-Glossary).**

---

### J4F-12 — SpieltagTab hardcoded LEAGUES = nur TFF 1. Lig (Multi-League Scoring-Gap!)

**Severity:** HIGH
**File:** `src/components/fantasy/SpieltagTab.tsx:22-26`

**Problem:**
```tsx
const LEAGUES = [
  { id: 'tff1', label: 'TFF 1. Lig', country: 'TR', flag: '🇹🇷' },
] as const;
type LeagueId = typeof LEAGUES[number]['id'];
```
Trotz 7 Ligen live (SSOT: BL, PL, Serie A, LaLiga, SuperLig, BL2, TFF 1. Lig) zeigt der Admin-Spieltag-Tab nur 1 Liga. Dropdown wird nur gerendert bei `LEAGUES.length > 1` (Zeile 177). Konsequenz: Admin kann nicht Multi-League simulieren/scoren.

**Beweis:**
- Zeile 177: `{LEAGUES.length > 1 && <ChevronDown />}` — Dropdown-Icon wird NIE gerendert, weil LEAGUES.length === 1.
- Zusammen mit SSOT P0 Beta-Blocker: "Cron `gameweek-sync/route.ts` hat keine activeLeagues-Loop → Scoring laeuft nur fuer TFF 1. Lig."

**Fix-Vorschlag:**
```tsx
import { getLeaguesByCountry, getCountries } from '@/lib/leagues';

const LEAGUES = useMemo(() => getCountries().flatMap(c =>
  getLeaguesByCountry(c.code).map(l => ({ id: l.short, label: l.name, country: c.code, flag: c.flag }))
), []);
```
Gleichzeitig SpieltagTab um Liga-Filter erweitern (wie MarktplatzTab `LeagueBar`).

**Cross-Impact:** Backend AR-Liga-Sync Multi-League-Loop.

---

### J4F-13 — LeaderboardPanel hardcoded "Pkt" + "Live" + "Formation:"

**Severity:** HIGH
**File:** `src/components/fantasy/event-tabs/LeaderboardPanel.tsx:90, 109, 218`

**Problem:**
```tsx
Zeile 90:  <div className="text-2xl font-mono font-black text-gold">{viewingUserLineup.entry.totalScore} Pkt</div>
Zeile 109: <div>Formation: {viewingUserLineup.data.lineup.formation || '1-2-2-1'}</div>
Zeile 218: <span>Live</span>   // kein useTranslations() aufgerufen hier
```
Vorhandene Keys nicht genutzt: `t('pointsLabel')` / `t('ptsLabel')` / `t('formationLabel')` / `t('statusLive')`.

**Fix-Vorschlag:**
- `Pkt` → `{t('ptsLabel')}`
- `Formation:` → `{t('formationLabel')}: ...`
- `Live` → `{t('statusLive')}`

---

### J4F-14 — OverviewPanel hardcoded "Platz {n}" (DE) + Top 1%..Rest Labels hardcoded

**Severity:** HIGH
**File:** `src/components/fantasy/event-tabs/OverviewPanel.tsx:47-63, 186`

**Problem:**
```tsx
Zeile 47-56: Arena-Scoring-Table
  { label: 'Top 1%', pts: '+50', color: 'text-gold' },
  { label: 'Top 5%', pts: '+40', ... },   // alle 8 Labels hardcoded (DE-freundlich aber keine i18n)

Zeile 186: <span className="font-bold">Platz {tier.rank}</span>
```
TR-User sieht DE-Text "Platz 1" / "Platz 2" / "Platz 3".

**Fix-Vorschlag:**
```tsx
Zeile 186: <span className="font-bold">{t('rankResult', { rank: tier.rank })}</span>
// bereits existiert: "rankResult": "Platz {rank}" (de) / "{rank}. Sıra" (tr)
```
Arena-Labels in i18n: `"arenaTop1pct": "Top 1%"` (DE/TR gleich, also nur Label-String-Escape).

---

### J4F-15 — FantasyDesc-Onboarding + Welcome "Credits Preise" Intro

**Severity:** HIGH
**File:** `messages/de.json:3538, 4525`, `messages/tr.json:3538, 4525`

**Problem (duplicate of J4F-10):**
```json
"feature_fantasy_desc": "Wöchentliche Turniere — Credits Preise, Ranglisten, Badges"
"fantasyDesc": "Stelle dein Lineup auf, tritt gegen andere an und gewinne Credits-Preise!"
```
2x gleicher Investment/Gaming-Framing-Fehler. J3-AR-15/B1 war "rewardsIntro"-Fund — das ist das Fantasy-Aequivalent.

**Fix-Vorschlag:** Siehe J4F-10 Glossary-Item. CEO-Approval + business.md Fantasy-Glossary.

---

### J4F-16 — Loader2 statt Skeleton im EventDetailModal-Lazy-Loading

**Severity:** HIGH
**File:** `src/app/(app)/fantasy/FantasyContent.tsx:48-57`

**Problem:**
```tsx
loading: () => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" />
      <span className="text-sm text-white/50">...</span>  // literal 3 dots, no i18n
    </div>
  </div>
)
```
SKILL.md: "Loader2 nur fuer Actions, Skeleton fuer Initial-Load". Lazy-Loading ist Initial-Load. Zusaetzlich "..." statt `t('loadingEvent')`.

**Fix-Vorschlag:**
```tsx
loading: () => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div className="bg-surface-base border border-white/10 rounded-2xl p-6 w-full max-w-md animate-pulse motion-reduce:animate-none">
      <div className="h-6 w-48 bg-white/10 rounded mb-4" />
      <div className="h-4 w-full bg-white/5 rounded mb-2" />
      <div className="h-4 w-3/4 bg-white/5 rounded" />
    </div>
  </div>
)
```

---

### J4F-17 — EventDetailModal Tabs: richtige flex-shrink-0, aber fehlendes aria-selected/role

**Severity:** HIGH
**File:** `src/components/fantasy/EventDetailModal.tsx:206-217`

**Problem:**
```tsx
<div className="flex overflow-x-auto scrollbar-hide -mx-4 md:-mx-5 border-b border-white/10 mb-4">
  {(['overview', 'lineup', 'leaderboard', 'community'] as EventDetailTab[]).map(tabId => (
    <button
      key={tabId}
      onClick={() => { setTab(tabId); }}
      className={`flex-shrink-0 px-4 py-3 min-h-[44px] font-medium text-sm ...`}
      // KEIN role="tab", KEIN aria-selected={tab === tabId}
    >
```
A11y-Gap fuer Screenreader. flex-shrink-0 ist korrekt (kein Scroll-Overflow).

**Fix-Vorschlag:**
```tsx
<div role="tablist" className="...">
  <button
    role="tab"
    aria-selected={tab === tabId}
    aria-controls={`panel-${tabId}`}
    ...
  >
```

---

## Medium Findings (7)

### J4F-18 — `EventCompactRow` hardcoded " Prize" im Code

**Severity:** MEDIUM
**File:** `src/components/fantasy/events/EventCompactRow.tsx:52`

**Problem:**
```tsx
<span className="text-purple-400 font-mono tabular-nums">
  {event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool} Prize
</span>
```
"Prize" (EN) hardcoded, obwohl component `useTranslations('fantasy')` laedt.

**Fix-Vorschlag:**
`{... } {t('prizeLabel')}` (nach J4F-11 DE korrigiert).

---

### J4F-19 — `CreateEventModal` `creatorName: 'Du'` hardcoded DE

**Severity:** MEDIUM
**File:** `src/components/fantasy/CreateEventModal.tsx:46`

**Problem:**
```tsx
onCreate({
  ...
  creatorName: 'Du',   // hardcoded DE — TR-User hat 'Du' im Event sichtbar
  creatorId: 'user1',  // hardcoded mock-ID
});
```
'Du' ist DE. Mock-ID fuer User's Event. Beta-Impact: jeder User-Event hat falschen creatorId='user1'.

**Fix-Vorschlag:**
```tsx
creatorName: profile?.display_name ?? t('youLabel'),  // existiert: "(Du)" / "(Sen)"
creatorId: user?.id ?? '',
```

---

### J4F-20 — `ScoreBreakdown` hardcoded `SC +5%` + `C ×1.5` Labels

**Severity:** MEDIUM
**File:** `src/features/fantasy/components/lineup/ScoreBreakdown.tsx:150-157`

**Problem:**
```tsx
{isCpt && <span>C ×1.5</span>}
{ownershipBonusIds.has(player.id) && <span>SC +5%</span>}
{tierCfg && (
  <span>{tierCfg.labelDe} +{tierCfg.bonusCents / 100} CR</span>  // labelDe — kein labelTr!
)}
```
`tierCfg.labelDe` ist ein DE-only Field; TR-User sieht DE.

**Fix-Vorschlag:**
`SCORE_TIER_CONFIG` in `@/types` erweitern:
```ts
{ labelDe: 'Gold', labelTr: 'Altın', ... }
```
Dann `locale === 'tr' ? tierCfg.labelTr : tierCfg.labelDe`.

---

### J4F-21 — `EventSummaryModal` hardcoded `CR` + open-prop inkonsistent mit `isOpen`

**Severity:** MEDIUM
**File:** `src/components/fantasy/EventSummaryModal.tsx:42, 62`

**Problem:**
```tsx
Zeile 42: <Modal open={open} onClose={onClose} title={t('summary.title')}>   // OK
Zeile 62: <div className="text-xl font-mono font-black text-gold">{fmtScout(myReward)} CR</div>
```
`CR` hardcoded. Andere Fantasy-Comp: `{t('crLabel')}` existiert bereits (FantasyPlayerRow:146).

**Fix-Vorschlag:**
`{fmtScout(myReward)} {t('crLabel')}`. Konsistenz mit J3-FIX-17.

---

### J4F-22 — `GwHeroSummary` hardcoded MVP-Label + en-dash `–`

**Severity:** MEDIUM
**File:** `src/components/fantasy/ergebnisse/GwHeroSummary.tsx:41, 63`

**Problem:**
```tsx
Zeile 41: <div ...>MVP</div>                    // hardcoded "MVP"
Zeile 63: {mvpScore ?? '\u2013'}               // en-dash hardcoded
```
`MVP` ist zwar international, aber kein i18n-Key. Die en-dash ist Placeholder-Text, ueberhaupt kein Label.

**Fix-Vorschlag:**
```tsx
<div ...>{t('ergebnisse.mvpLabel')}</div>   // neuer Key: "MVP" (DE/TR gleich, aber i18n-Future-proof)
```

---

### J4F-23 — LineupPanel Budget-Label hardcoded DE "Budget"

**Severity:** MEDIUM
**File:** `src/features/fantasy/components/event-detail/EventDetailFooter.tsx:76`

**Problem:**
```tsx
<span className="text-xs text-white/50">Budget</span>   // hardcoded DE/EN (ambiguous)
```
"Budget" ist in DE und EN gleich, aber TR ist "Bütçe". Kein i18n.

**Fix-Vorschlag:**
```tsx
<span>{t('budgetLabel')}</span>
```
+ de.json `"budgetLabel": "Budget"` + tr.json `"budgetLabel": "Bütçe"`.

---

### J4F-24 — EventCommunityTab Mini-Leaderboard "Anonym" Fallback

**Severity:** MEDIUM
**File:** `src/components/fantasy/EventSummaryModal.tsx:76`

**Problem:**
```tsx
<div>{entry.displayName ?? entry.handle ?? 'Anonym'}</div>
```
`'Anonym'` hardcoded DE. TR: "Anonim".

**Fix-Vorschlag:**
```tsx
<div>{entry.displayName ?? entry.handle ?? t('anonymousLabel')}</div>
```

---

## Low Findings (3)

### J4F-25 — PitchView Formation Fallback `'1-2-2-1'` als String in Code

**Severity:** LOW
**File:** `src/components/fantasy/event-tabs/LeaderboardPanel.tsx:109`

**Problem:**
```tsx
Formation: {viewingUserLineup.data.lineup.formation || '1-2-2-1'}
```
Wenn `lineup.formation` null/undefined ist, zeigt UI fallback "1-2-2-1". Das ist legitim als Default, aber besser als Konstante + i18n.

**Fix-Vorschlag:**
Constant in `constants.ts` + optional i18n-Label "Standard".

---

### J4F-26 — Liga-Badge `'\uD83C\uDDF9\uD83C\uDDF7'` Emoji-Flag inline in SpieltagTab

**Severity:** LOW
**File:** `src/components/fantasy/SpieltagTab.tsx:24`

**Problem:**
```tsx
{ id: 'tff1', label: 'TFF 1. Lig', country: 'TR', flag: '\uD83C\uDDF9\uD83C\uDDF7' }
```
Nach Fix von J4F-12 (getLeaguesByCountry) wird das obsolet. Aktuell aber: Emoji-Flag haardkodiert statt aus `leagues`-Source abgeleitet.

**Fix-Vorschlag:** Obsolet nach J4F-12.

---

### J4F-27 — `FantasyContent.handleResetEvent` `console.error` ohne i18n

**Severity:** LOW
**File:** `src/app/(app)/fantasy/FantasyContent.tsx:176`

**Problem:**
```tsx
} catch (err) { console.error('[Fantasy] Active gameweek fetch failed:', err); }
```
common-errors.md: "Niemals leere .catch(() => {})" — ist erfuellt. Aber: User sieht nichts, wenn `getActiveGameweek` fehlschlaegt. Silent degradation.

**Fix-Vorschlag:**
Toast-Feedback:
```tsx
} catch (err) {
  console.error('[Fantasy] Active gameweek fetch failed:', err);
  addToast(te('gameweekFetchFailed'), 'warning');
}
```

---

## Cross-Check gegen common-errors.md Patterns

| Pattern | J4-Befund | Gate |
|---------|-----------|------|
| i18n-Key-Leak via Service-Errors | J4F-07, J4F-09 | 🔴 Healer |
| Modal preventClose Pattern | J4F-06 | 🔴 Healer |
| Multi-League Props-Propagation-Gap | J4F-01..05 + J4F-12 | 🔴 Healer |
| Service Error-Swallowing | useEventActions OK (try/catch) | 🟢 |
| `.maybeSingle()` statt `.single()` | `getLineup` needs check | 🟡 Backend |
| `flex-1` auf Tabs | Alle Fantasy-Tabs `flex-shrink-0` | 🟢 |
| Dynamic Tailwind Classes | `style={{ borderColor: ... }}` korrekt | 🟢 |
| Hooks vor Early Returns | FantasyContent line 65-193 korrekt | 🟢 |
| Loading Guard VOR Empty Guard | J4F-16 | 🟡 Polish |
| `Array.from(new Set())` | LineupBuilder:134 korrekt | 🟢 |
| Cancellation Token in useEffect | EventDetailModal line 118-134 korrekt | 🟢 |
| Barrel-Export bei Deletion | N/A (keine Files geloescht) | 🟢 |
| `PlayerPhoto` Props `first/last/pos` | FantasyPlayerRow korrekt | 🟢 |

---

## Cross-Check gegen business.md Compliance

| Regel | J4-Befund | Severity |
|-------|-----------|----------|
| NIEMALS: Gewinn/Preis/Investment/ROI | J4F-10 ("gewinne Preise"), J4F-11, J4F-15 | 🔴 HIGH |
| Disclaimer auf $SCOUT-Seiten | **Fantasy hat KEIN `<TradingDisclaimer>`** — Event-Rewards zahlen SC aus! | 🔴 HIGH (siehe J4F-28 unten) |
| Phase 1: Free Fantasy = kostenlos | OK — `buyInPilotHint` enforced | 🟢 |
| Phase 4: Paid Fantasy = NICHT BAUEN | OK — buyIn `min={0} max={0} disabled` | 🟢 |
| Geofencing TR = Free Fantasy | OK — `GeoGate feature="free_fantasy"` | 🟢 |

---

## P0 Compliance-Erweiterung: J4F-28 — Disclaimer-Gap in Fantasy

**Severity:** HIGH
**Files:** Alle Fantasy-Screens wo Rewards angezeigt werden.

**Problem:**
`grep TradingDisclaimer src/components/fantasy/` → **0 Treffer**. `grep TradingDisclaimer src/features/fantasy/` → **0 Treffer**.

Fantasy zahlt Rewards in $SCOUT (`event.userReward`, `entry.rewardAmount`, `totalRewardBsd`). Laut business.md ist auf JEDER Seite mit $SCOUT ein `<TradingDisclaimer>` noetig.

**Beweis:**
- `EventSummaryModal.tsx:62` zeigt `{fmtScout(myReward)} CR` ohne Disclaimer.
- `LeaderboardPanel.tsx:272` zeigt `+{fmtScout(entry.rewardAmount / 100)} CR` ohne Disclaimer.
- `ScoreBreakdown.tsx:93` zeigt `+{fmtScout(myEntry.rewardAmount / 100)} CR` ohne Disclaimer.

**Fix-Vorschlag:**
- `<TradingDisclaimer variant="inline" />` in `EventSummaryModal` footer.
- `<TradingDisclaimer variant="inline" />` in `ScoreBreakdown` team-score-banner (scored-state).
- Globales Fantasy-Page-Footer-Disclaimer in `FantasyContent.tsx`.

---

## VERIFIED OK (Static-Analysis gegen Patterns)

| Check | Beweis |
|-------|--------|
| Tab flex-shrink-0 | EventDetailModal:211, FantasyNav:65, EventBrowser:133 |
| Hooks vor Returns | FantasyContent:65-193 korrekt strukturiert |
| Array.from(new Set()) | LineupBuilder:134, PlayerPicker:69, :73 |
| PlayerPhoto Props | FantasyPlayerRow:84, GwHeroSummary:49 |
| Cancellation Tokens | EventDetailModal:118, MitmachenTab:47, ErgebnisseTab:92 |
| `useEffect` Cleanup | EventDetailModal:133 korrekt |
| Dynamic Classes (style={}) | EventCompactRow:30 korrekt |
| Loading Guard Ordering | FantasyContent:195-197 (Loading vor Error) |
| No `[...new Set()]` | 0 Treffer |
| No leere `.catch(() => {})` | alle `catch` haben `console.error` |
| GeoGate auf /fantasy | page.tsx:55 |
| Dynamic Imports fuer grosse Modals | EventDetailModal + EquipmentPicker lazy |

---

## Cross-Cutting Funds (nicht einzelner Finding, aber systematisch)

### FUND-A: useToast existiert, wird aber nicht ueberall genutzt
- 4x native `alert()` in EventDetailModal statt `addToast`.
- Beta-UX-Desaster auf iOS (native-dialog popups stoeren Fullscreen-Modal-Context).

### FUND-B: 0 preventClose in der gesamten Fantasy-Domain
- J3 hat preventClose auf Trade-Modals nachgezogen, Fantasy wurde vergessen.
- Lineup-Save auf 4G TR kann 500-800ms dauern → ESC-Press/Backdrop-Click → kein Feedback.

### FUND-C: Multi-League-Type-Gap Root-Cause in `types.ts`
- J3-Learning #2 (Multi-League Props-Propagation-Gap) hat nur Player-Types gefixt.
- FantasyEvent-Type + UserDpcHolding-Type noch unberuehrt → alle Render-Call-Sites automatisch broken.

### FUND-D: Gaming-Framing-Glossary fehlt in business.md
- J3 AR-17 hat "Kapitalmarkt-Glossar" gefordert (Orderbuch, Trader, Portfolio).
- J4 zeigt: auch "Fantasy-Gaming-Glossar" noetig (Preis, Gewinn, Preisgeld, Prize).
- Ein konsolidiertes "Verbotene Terms Glossar" muss in business.md, mit CI-Regex-Guard.

### FUND-E: Fantasy ist komplett Disclaimer-frei
- Rewards zahlen SC aus Treasury → definitiv $SCOUT-facing.
- Kein `<TradingDisclaimer>` auf irgendeinem Fantasy-Screen.

---

## Recommended Healer-Strategie

**Healer FE-P0 (Worktree A) — i18n-Key-Leak + Modal + Compliance (autonom):**
- J4F-06: Modal preventClose in EventDetailModal + EventSummaryModal + CreateEventModal
- J4F-07: useEventActions `submitLineup` `'Not authenticated'` + `'lineup_save_failed'` → i18n-Keys
- J4F-08: Replace alert()/confirm() durch Toast + ConfirmDialog
- J4F-09: Fallback `'Unknown'` → `te('unknownError')` + `mapErrorToKey` Pattern
- J4F-11: `tablePrize` + `prizeLabel` DE-Fix
- J4F-13: LeaderboardPanel "Pkt"/"Formation:"/"Live" i18n
- J4F-14: OverviewPanel "Platz" → `rankResult`-Key
- J4F-18..27: Polish-Strings (CR/CR-Label, Budget, Anonym, creatorName='Du')
- J4F-28: `<TradingDisclaimer>` in EventSummaryModal + ScoreBreakdown + FantasyContent-Footer

**Healer FE-P1 (Worktree B) — Multi-League Props-Propagation (autonom + Backend-Koordination):**
- J4F-01: FantasyEvent + UserDpcHolding Type erweitern (+ leagueShort/leagueLogoUrl/leagueCountry)
- Backend-Impact: `dbEventToFantasyEvent` mapper, RPCs `get_active_events`, `get_event_by_id`, `get_user_holdings_with_player_details`, `get_gameweek_top_scorers` muessen Liga-Columns mitliefern.
- J4F-02: EventDetailHeader `<LeagueBadge />`
- J4F-03: GwHeroSummary `<LeagueBadge />` + RPC-Erweiterung
- J4F-04: PlayerPicker FantasyPlayerRow + optionaler Liga-Filter
- J4F-05: EventCardView + EventCompactRow + EventSpotlight `<LeagueBadge />`
- J4F-12: SpieltagTab `LEAGUES` dynamisch aus `getLeaguesByCountry`

**CEO-Approval-Triggers (Wording + Architektur):**
- AR-26 (J4F-10+15): Fantasy-Gaming-Glossary in business.md ("gewinne Preise" → "sammle Rewards", "Gewonnene Credits" → "Erhaltene Rewards"). Option A: Komplett-Sanitize 7 Keys in de/tr.json. Option B: Vorsichtige Phrasen. **CEO-Compliance-Entscheidung.**
- AR-27 (J4F-12): Multi-League Admin-Spieltag. Option A: Per Liga ein eigener Admin-Run. Option B: Cross-Liga Bulk-Run. **Architektur-Lock-In.**
- AR-28 (J4F-28): Disclaimer-Text Fantasy-spezifisch? Derzeit nur Trading-Disclaimer. Option A: Gleicher Text. Option B: `<FantasyDisclaimer>` Variante ("Free Fantasy. Keine Gewinne. Nur Spass."). **CEO Compliance-Wording.**
- AR-29: TradingDisclaimer-Coverage-Rule erweitern: "jede Seite mit fmtScout/CR-Label braucht Disclaimer" → CI-Guard. **Architektur.**

---

## LEARNINGS (Drafts fuer beScout-frontend LEARNINGS.md)

1. **Modal preventClose Sweep war unvollstaendig** — J3 hat Trade-Modals gefixt, Fantasy wurde uebersprungen. Pattern-Fix: **Nach preventClose-Sweep ALLE Domains durchgreppen** (trading, fantasy, missions, social, gamification). Audit-Query: `grep -n "<Modal" src/ | grep -v preventClose`.

2. **Multi-League Props-Gap ist Type-getrieben, nicht Render-getrieben** — J3-Learning #2 hatte Player-Types gefixt, aber nicht Event-/Holding-Types. Regel: **Jedes Type mit `club*` Field muss spiegelbildlich `league*` Fields haben** (leagueShort, leagueLogoUrl, leagueCountry). CI-Guard: Typescript-Struktur-Lint regel.

3. **Fantasy-Context ist Gaming-Framing-Risiko** — J3-Learning #9 fasst Kapitalmarkt-Investment-Framing zusammen (Marktwert, Portfolio, Handle clever). J4 zeigt: Fantasy hat **eigenes Vokabular-Risiko** — "Preise gewinnen", "Preisgeld", "Gewonnene Credits". Das ist Gluecksspiel-Framing, SPK/MASAK-Red-Flag in TR. **Neue Regel fuer business.md: Getrenntes Fantasy-Vokabular-Glossar.**

4. **Disclaimer-Coverage folgt nicht nur "Handel-Pages"** — Rewards-Auszahlung triggert `fmtScout()`/$SCOUT-Anzeige = Disclaimer-Pflicht (business.md). Audit-Regel: **Jeder `fmtScout()`/`CR`-Display ausserhalb Admin/Analytics braucht `<TradingDisclaimer>`**. CI-Guard: `grep -l "fmtScout|<CR" src/ | xargs grep -L TradingDisclaimer`.

5. **Native `alert()`/`confirm()` gehoeren nicht in Mobile-First-App** — 4 Instances in EventDetailModal sind Mobile-UX-Desaster. Regel: **NIEMALS `alert()`/`confirm()` im Production-Code** — immer Toast + ConfirmDialog-Modal. ESLint-Rule: `no-alert` + `no-confirm`.

6. **Hardcoded Arrays leaken bei Multi-League-Features** — `SpieltagTab` hatte `LEAGUES = [...1 Eintrag...]` festverdrahtet. Das ist ein Artefakt aus Pilot-Zeit (1 Liga). Regel: **Keine statischen `LEAGUES`/`COUNTRIES`/`CLUBS` Arrays** — immer aus `@/lib/leagues` / `@/lib/clubs` dynamisch. CI-Guard: `grep -n "LEAGUES = \[" src/` → muss 0 sein.

7. **i18n-Key-Leak Pattern gehoert in JEDE Domain** — J1 (Onboarding), J2 (IPO), J3 (Trade), J4 (Fantasy) — JEDE zeigt gleiches Pattern. Sweep-Todo: **missions, social, gamification, profile, notifications** sind die naechsten Baustellen.

8. **Fantasy-Tests decken UI-Logik, nicht Compliance/Multi-League/i18n** — 14 Test-Files in fantasy/, aber 0 Tests fuer i18n-Coverage, Multi-League-Rendering, Disclaimer-Presence. Regel: **Per-Domain mindestens 1 Smoke-Test fuer i18n + Multi-League-Rendering**. Test-Writer Agent kann das templaten.

---

## Verification

- [x] 15+ Findings — **27 Findings geliefert** (7C + 10H + 7M + 3L)
- [x] Cross-Check gegen common-errors.md — alle Pattern-Sektionen durchlaufen
- [x] Cross-Check gegen business.md — Phase 1/4 + Wording
- [x] "Preise gewinnen"/"Trader"-Framing: J4F-10, J4F-11, J4F-15
- [x] Liga-Logo-Gap in EventHeader (J4F-02) + GwHeroSummary (J4F-03): aufgedeckt + Root-Cause in Type (J4F-01)
- [x] J3-Learnings angewendet: preventClose (J4F-06), i18n-Key-Leak (J4F-07), Multi-League Props (J4F-01..05)
- [x] Read-Only: keine Code-Aenderungen (0 Edits geschrieben)

---

## Files Reviewed (25)

### `/fantasy` Page
- `src/app/(app)/fantasy/page.tsx` ✅
- `src/app/(app)/fantasy/FantasyContent.tsx` ✅
- `src/app/(app)/fantasy/loading.tsx` ✅
- `src/app/(app)/fantasy/error.tsx` ✅

### Event-Browser + Cards
- `src/components/fantasy/EventsTab.tsx` ✅
- `src/components/fantasy/events/EventBrowser.tsx` ✅
- `src/components/fantasy/events/EventCardView.tsx` ✅
- `src/components/fantasy/events/EventCompactRow.tsx` ✅

### Event-Detail + Tabs
- `src/components/fantasy/EventDetailModal.tsx` ✅
- `src/features/fantasy/components/event-detail/EventDetailHeader.tsx` ✅
- `src/features/fantasy/components/event-detail/EventDetailFooter.tsx` ✅
- `src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx` ✅
- `src/components/fantasy/event-tabs/OverviewPanel.tsx` ✅
- `src/components/fantasy/event-tabs/LineupPanel.tsx` ✅
- `src/components/fantasy/event-tabs/LeaderboardPanel.tsx` ✅

### Lineup-Builder + Picker
- `src/features/fantasy/components/lineup/LineupBuilder.tsx` ✅
- `src/features/fantasy/components/lineup/PlayerPicker.tsx` ✅
- `src/features/fantasy/components/lineup/FormationSelector.tsx` ✅
- `src/features/fantasy/components/lineup/ScoreBreakdown.tsx` ✅
- `src/features/fantasy/components/lineup/SynergyPreview.tsx` ✅
- `src/components/fantasy/FantasyPlayerRow.tsx` ✅

### Results + Reward-Claim
- `src/components/fantasy/ErgebnisseTab.tsx` ✅
- `src/components/fantasy/ergebnisse/GwHeroSummary.tsx` ✅
- `src/components/fantasy/EventSummaryModal.tsx` ✅

### Navigation + Misc
- `src/features/fantasy/components/FantasyHeader.tsx` ✅
- `src/features/fantasy/components/FantasyNav.tsx` ✅
- `src/components/fantasy/MitmachenTab.tsx` ✅
- `src/components/fantasy/SpieltagTab.tsx` ✅
- `src/components/fantasy/CreateEventModal.tsx` ✅
- `src/components/fantasy/ScoringRules.tsx` ✅

### Hooks + Types
- `src/features/fantasy/types.ts` ✅
- `src/features/fantasy/hooks/useEventActions.ts` ✅
- `src/features/fantasy/hooks/useFantasyEvents.ts` ✅
- `src/features/fantasy/hooks/useLineupSave.ts` ✅

### i18n
- `messages/de.json` (fantasy-namespace + cross-search) ✅
- `messages/tr.json` (fantasy-namespace + cross-search) ✅

---

**Report fertig. 27 Findings. Bereit fuer Aggregation mit Backend+Business-Audits.**

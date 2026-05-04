# Slice 269 — Markt-Puls 3-Tab-Discovery (D63 Phase 4)

**Status:** SPEC · **Größe:** M · **Slice-Type:** UI · **Scope:** CTO (D63 Phase 4 ist Anil-approved Roadmap, neue i18n-Strings benötigen TR-Review) · **Datum:** 2026-05-04

---

## 1. Problem Statement

Discovery-Sektionen auf der Home-Page sind heute **fragmentiert in 3 separate Hauptspalten-Sektionen** (`src/app/(app)/page.tsx:257-307`):

1. **TopMoversWeek** (Zeile 257-294, ~38 LOC inline) — own holdings winner/loser
2. **Global Top Movers** (Zeile 297-304) — TopMoversStrip (5 Top global)
3. **Most Watched** (Zeile 307) — MostWatchedStrip (10 most-watched)

Daraus resultieren zwei UX-Probleme aus dem D63 3-Persona-Audit (Phase 4 Discovery-Konsolidierung):

- **Vertikales Real-Estate-Problem (393px Mobile):** 3 separate Sektionen + Headers fressen ~480px-Höhe vertikal. Auf einem typischen Mobile-Bildschirm (393×720, abzgl. Layer 0/1/2/Spotlight = ~480px above-fold) bleibt für Discovery-Section ≈ 240px. 3 Sektionen mit Section-Header + Strip = vertikales-Scrollen-pflicht, User sieht weder zweite noch dritte Sektion ohne Scroll-Aufwand.
- **Discovery-Mode-Mischung:** User mit ≥ 2 Holdings sieht TopMoversWeek (own); danach Global TopMovers (parallel-redundant); danach Watched. Kein User-Filter — User muss alle 3 Modi gleichzeitig konsumieren statt zu wählen "Was interessiert mich gerade".

D63 Phase 4 mandated: **Markt-Puls als 3-Tab-Section** — konsolidiere die 3 fragmentierten Discovery-Quellen in 1 Tab-Container, User filtert via Tab-Switch.

**Evidence:**
- D63 (`memory/decisions.md:2806-2882`) Phase-Tabelle Z.2820: `4 Discovery-Konsolidierung | Markt-Puls als 3-Tab-Section | 269`.
- Live-Code-Read `src/app/(app)/page.tsx:257-307`: 3 isolierte Sektionen mit eigenen SectionHeaders.
- i18n-Key `home.marketPulse` existiert bereits in beiden Locales (Z.412 in de+tr) — orphan, kein Konsument bislang. Slice 269 wird der erste Konsument.
- `src/components/ui/TabBar.tsx`: TabBar + TabPanel-Pattern etabliert (Slice 251 Wave 3, FixtureDetailModal, EquipmentSection, MysteryBoxHistorySection, MissionBanner, GlobalLeaderboard nutzen es bereits).

**Wer ist betroffen?**
- ALLE Home-Page-User → 100% der täglichen Sessions.
- Mobile-User besonders: vertical-Real-Estate-Lift erwartet von 3-Sektionen-Stack (~240px-360px) auf 1 Tab-Section (~120-180px). Free-Vertical-Space für anderen Inhalt.
- Daily-Driver: User kann jetzt zwischen "What moved" / "What's hot" / "What I'm watching" filtern statt alle 3 parallel zu konsumieren.

## 2. Lösungs-Design (Architektur)

**3 fragmentierte Sektionen → 1 Markt-Puls-Section mit 3 Tabs.**

### Tab-Struktur

| Tab | ID | Inhalt | Aktivierungs-Bedingung |
|-----|----|----|------------------------|
| 1 (Default) | `movers` | Combined: TopMoversWeek (own holdings) + Global TopMovers (TopMoversStrip) gestackt — own zuerst | Aktiv wenn `holdings.length > 0` ODER `hasGlobalMovers` |
| 2 | `trending` | TrendingPlayers (5 Top-Trades, neu-Strip-Component) | Aktiv wenn `trendingPlayers.length > 0` |
| 3 | `watched` | MostWatchedStrip (existing, only-renders-if ≥ 2 watched players) | Aktiv wenn `uid` vorhanden (Hook gates ≥ 2-rule selber) |

### Tab-Default-Logic (Pre-Mortem #4)

```
defaultTab = 'movers'        // wenn movers-Inhalt vorhanden
ELSE 'trending'              // wenn trending-Inhalt vorhanden
ELSE 'watched'               // letzter Fallback
ELSE return null              // gar kein Discovery-Inhalt → Section unsichtbar
```

User kann via Tab-Click umschalten. Tab-State **lokal in MarktPuls-Component** (useState), KEINE sessionStorage-Persistenz (jede Mount-State-Reset OK pro D63 "Identität in 5 Sekunden").

### Tab-Visibility-Filter

Tabs ohne Inhalt werden **nicht gerendert** (kein Empty-State-Tab). Wenn nur 1 von 3 Tabs Inhalt hat → Section rendert ohne TabBar (kein Single-Tab-Slop). Wenn 2+ Tabs Inhalt haben → TabBar visible + Tab-Panels conditional.

### Datenfluss (F-02 Hook-Hoist + F-04 playersLoading-Gate)

```
useHomeData (existing State, KEIN neuer Hook):
  - holdings, topMovers, players, hasGlobalMovers (existing)
  - trendingPlayers (existing)
  - uid, playersLoading (existing)

page.tsx (Konsument):
  - Ruft NEU `useMostWatchedPlayers(uid, 10)` auf (Hook-Hoist per F-02 — Single-Source-Visibility-Decision)
  - Übergibt `watchedPlayers` als Prop an BEIDE: MarktPuls (für Tab-3-Visibility) + MostWatchedStrip (existing)
  - Übergibt `playersLoading` an MarktPuls (für movers-Tab-Gate)

MarktPuls Component (NEU):
  Props: {
    topMovers, holdings, players, hasGlobalMovers,
    trendingPlayers, watchedPlayers, uid,
    playersLoading,         // F-04: movers-Tab-Visibility-Gate
  }
  Local state: const [activeTab, setActiveTab] = useState<TabId>(defaultTab)
  Computed: tabs = [{ id, label, hasContent }] gefiltert auf hasContent
  Render: if (tabs.length === 0) return null
          if (tabs.length === 1) return <SingleTabContent />
          else return <SectionHeader /> + <TabBar /> + <TabPanel /> per active tab

  Tab-Visibility-Logic:
    movers:   !playersLoading && (holdings.length > 0 || hasGlobalMovers)
    trending: trendingPlayers.length > 0
    watched:  !!uid && watchedPlayers.length >= 2  (Single-Source via prop)
```

### Component-Extraction-Plan (DRY + reusability)

- **NEU `OwnTopMoversStrip.tsx`** (Sub-Component): extrahiert die 38-LOC-Inline-Logik aus page.tsx:257-294 (own-holdings TopMoversWeek mit Empty-State).
- **NEU `TrendingPlayersStrip.tsx`** (Sub-Component): extrahiert oder neu gebaut für Tab 2 (Trending). Nutzt existing `trendingPlayers` + `players` für PlayerPhoto-resolution.
- **EXISTING reuse:** `TopMoversStrip` (global) + `MostWatchedStrip` (watched) bleiben unverändert.

### TabBar-Stil + i18n-Schema (F-01 Drift-Mitigation, Variante C)

**Existing `home.marketPulse: "Markt-Puls"` Top-Level-String bleibt** für Section-Title (kein Löschen, kein Re-Naming → 0 Konsumenten-Break-Risk). Sub-Keys werden in **NEU `home.marketPulseTabs` Sub-Object** angelegt — KEIN Object/String-Drift wie Slice 263 F-01.

Nutzt etabliertes `src/components/ui/TabBar.tsx` Pattern. Tabs:
- `id: 'movers'`, `label: t('marketPulseTabs.movers')`, `shortLabel: t('marketPulseTabs.moversShort')`
- `id: 'trending'`, `label: t('marketPulseTabs.trending')`, `shortLabel: t('marketPulseTabs.trendingShort')`
- `id: 'watched'`, `label: t('marketPulseTabs.watched')`, `shortLabel: t('marketPulseTabs.watchedShort')`

Mobile zeigt shortLabel (≤ 7 chars per ui-components.md "Mobile Tab-Bars"). Desktop zeigt fullLabel.

Section-Title verwendet weiter `t('marketPulse')` (Top-Level-String unverändert).

### Visual-Design (Anti-Slop)

- Section-Header `marketPulse` (existing i18n-Key) als Title.
- TabBar direkt unter Header, keine zusätzliche Card-Wrapper (nicht-doppelt rahmen).
- Tab-Panel-Content ohne weiteren Spacing-Wrapper (Section-Header + TabBar + Panel = lean).
- Existing-Strip-Components (TopMoversStrip, MostWatchedStrip) bleiben in ihren Stilen — Tab-Panel ist nur Layout-Container.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/home/MarktPuls.tsx` | NEU | 3-Tab-Container mit Default-Logic + TabBar + TabPanel |
| `src/components/home/OwnTopMoversStrip.tsx` | NEU | Extrahiert aus page.tsx:257-294 (own-holdings TopMoversWeek) für Reuse + Testbarkeit |
| `src/components/home/TrendingPlayersStrip.tsx` | NEU | Tab 2 Renderer für Trending — neuer Strip mit Trade-Count-Badge |
| `src/components/home/__tests__/MarktPuls.test.tsx` | NEU | 8 Tests: Tab-Switch + Default-Logic + Empty-States + Multi-Tab-Filter |
| `src/components/home/__tests__/OwnTopMoversStrip.test.tsx` | NEU | 3 Tests: with-holdings + empty-state + zero-changes |
| `src/components/home/__tests__/TrendingPlayersStrip.test.tsx` | NEU | 3 Tests: render + empty + player-resolution |
| `src/app/(app)/page.tsx` | EDIT | 3 inline-Sektionen Z.257-307 → 1 `<MarktPuls .../>` Wire-Up |
| `messages/de.json` | EDIT | NEU `home.marketPulseTabs` Sub-Object mit 6 Keys (movers/moversShort, trending/trendingShort, watched/watchedShort). Top-Level `home.marketPulse` String unverändert (F-01 Variante C — Drift-Schutz) |
| `messages/tr.json` | EDIT | dito TR (Anil-Pflicht-Review pre-Commit) |
| `src/app/(app)/page.tsx` (zusätzlich F-02) | EDIT | + `useMostWatchedPlayers(uid, 10)` Hook-Call → `watchedPlayers` an MarktPuls + MostWatchedStrip übergeben |

**Greppen vor Implementation:**
- `grep -rn "marketPulse" src/ messages/` → Konsumenten-Audit (heute orphan, nach Slice 269 = 1 Konsument)
- `grep -rn "TopMoversStrip\|MostWatchedStrip\|trendingPlayers" src/` → existing Discovery-Komponenten verifizieren
- `grep -rn "topMoversWeek" src/ messages/` → bestehende i18n-Keys finden
- `grep -rn "TabBar\|TabPanel" src/components/ui/` → existing Pattern-Quelle

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/components/ui/TabBar.tsx` (komplett, 78 LOC) | Existing TabBar/TabPanel-Pattern | Welche Props? Wie wird `accentColor` gesetzt? `aria-selected` + `role="tab"` etabliert? |
| `src/app/(app)/page.tsx:250-308` | Discovery-Sektionen-Block | Welche Conditions? `holdings.length > 0`? `hasGlobalMovers`? Tab-1-Aktivierung verstehen. |
| `src/components/home/TopMoversStrip.tsx` | Global-Movers-Renderer | Welcher Card-Style? PlayerPhoto-size? Sortier-Logik? Reuse als Tab-1-Subkomponent. |
| `src/components/home/MostWatchedStrip.tsx` | Watched-Renderer | `players.length < 2 → return null` Logik — Tab-3-Visibility-Filter konsistent halten |
| `src/components/home/HomeSpotlight.tsx:240-275` (renderTrendingSlot) | Trending-Render-Pattern | Welche Felder von `TrendingPlayer`? `tp.tradeCount`-Anzeige? matchedPlayer-Lookup für Photo? |
| `src/app/(app)/hooks/useHomeData.ts:303-339` (return-Block) | Existing State-Outputs | Welche `topMovers`/`trendingPlayers`/`hasGlobalMovers`-Felder bereits exportiert? Kein neuer Hook nötig. |
| `messages/de.json` Section "home" Z.416-419 | Existing Spotlight-Pattern | Konsistenz-Check: existing `spotlightTopMover`, `spotlightTrending` vs. neue `marketPulse.tabX` |
| `.claude/rules/business.md` "Glücksspiel-Vokabel" + "Asset-Klasse" | Compliance | Neue Tab-Labels: kein "kazan"/"yatırım"/"gewinn"/"investier" |
| `.claude/rules/ui-components.md` "Mobile Tab-Bars" | Mobile-Pattern | shortLabel ≤ 5-7 chars, `flex-shrink-0` + `overflow-x-auto` |
| `.claude/rules/errors-frontend.md` "Tailwind data-* Variants" (Slice 181) | Bekannte Falle | TabBar nutzt aktuelle Klassen — Slice 269 fügt kein neues `data-state=...` Pattern hinzu |
| `memory/patterns.md` #47 (Slot-Priority-Engine, Slice 266) | Pattern-Konsistenz | Multi-Slot vs Multi-Tab: parallele Konzepte. Tab-Default-Logic ähnlich Slot-Priority-Cascade — gleiche Mental-Model anwenden. |

## 5. Pattern-References (relevant für DIESEN Slice)

- **D63** (`memory/decisions.md:2806`) — Phase 4 Slice 269 ist direkt-mandated.
- **patterns.md #47 (Slot-Priority-Engine, Slice 266)** — Tab-Default-Logic mit Cascade ist analoges Pattern: höchste-prio-aktive Wahl als Default, andere als opt-in. Reuse Mental-Model.
- **ui-components.md "Mobile Tab-Bars"** — `flex-shrink-0` + `overflow-x-auto` pflicht. Max ~5-7 chars für shortLabel.
- **business.md "Glücksspiel-Vokabel" + "Asset-Klasse"** — Tab-Labels neutral: "Bewegung"/"Trends"/"Beobachtet" statt "Gewinner"/"Kazananlar".
- **errors-frontend.md "Hardcoded German addToast/Error-Strings" (Slice 196 Track B)** — alle UI-Strings via `t()`, keine hardcoded Strings.
- **errors-frontend.md "Defensive null-strict-equality" (Slice 265)** — `topMovers.length > 0` strict statt `topMovers && topMovers.length`.
- **HomeSpotlight surface="hero" Pattern (Slice 261-266)** — N/A direct (Markt-Puls ist KEINE Hero-Card, sondern Standard-Section), aber Pattern-konsistent für andere Sub-Cards.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY] 3 Tabs mit Inhalt → TabBar visible, default movers active
  VERIFY: MarktPuls.test.tsx { playersLoading: false, holdings: [...], hasGlobalMovers: true, trendingPlayers: [...], uid: 'u1', watchedPlayers: [≥2] }
  EXPECTED: TabBar rendered mit 3 tabs ('movers', 'trending', 'watched'),
           Tab 'movers' aria-selected=true, OwnTopMoversStrip + TopMoversStrip rendered
  FAIL IF: TabBar fehlt ODER falscher Default ODER Inhalt nicht rendered ODER playersLoading=true zeigt movers-Tab (F-04 Gate)

AC-02: [HAPPY] Tab-Switch ändert active-tab + rendered Panel + inactive Panels NICHT im DOM (F-08)
  VERIFY: MarktPuls.test.tsx fireEvent.click(screen.getByRole('tab', { name: /trending/i }))
          + queryByRole('region', { name: /movers/i }) === null
  EXPECTED: Tab 'trending' aria-selected=true, TrendingPlayersStrip rendered, OwnTopMoversStrip + TopMoversStrip NICHT mehr im DOM (TabPanel `if (activeTab !== id) return null` filter)
  FAIL IF: Tab-Switch nicht aktiv ODER inactive panels noch in DOM (≠ TabPanel-conditional-mount)

AC-03: [EMPTY] Nur 1 Tab mit Inhalt → kein TabBar (kein Single-Tab-Slop)
  VERIFY: MarktPuls.test.tsx { holdings: [], hasGlobalMovers: false, trendingPlayers: [], uid: 'u1' but watched-strip-empty }
  EXPECTED: Wenn 1 Tab Inhalt hat, kein TabBar; wenn 0 Tabs → return null
  FAIL IF: TabBar mit 0 tabs ODER Single-Tab-Slop

AC-04: [EMPTY] Default-Tab-Cascade alle 8 Permutationen (F-03 explicit Tabelle)
  VERIFY: MarktPuls.test.tsx mit allen 8 Konfigurationen `{movers,trending,watched} ∈ {true,false}`:

  | # | movers | trending | watched | Expected default | Expected TabBar |
  |---|--------|----------|---------|------------------|-----------------|
  | 1 | true   | true     | true    | 'movers'         | 3 tabs visible  |
  | 2 | true   | true     | false   | 'movers'         | 2 tabs (m+t)    |
  | 3 | true   | false    | true    | 'movers'         | 2 tabs (m+w)    |
  | 4 | true   | false    | false   | 'movers'         | NO tabBar (1)   |
  | 5 | false  | true     | true    | 'trending'       | 2 tabs (t+w)    |
  | 6 | false  | true     | false   | 'trending'       | NO tabBar (1)   |
  | 7 | false  | false    | true    | 'watched'        | NO tabBar (1)   |
  | 8 | false  | false    | false   | null             | Section unsichtbar |

  EXPECTED: pro Zeile: defaultTab + TabBar-visibility wie oben
  FAIL IF: Cascade falsch ODER TabBar mit 1 Tab ODER null-Section nicht returnt bei (8)

AC-05: [REGRESSION] Existing topMovers/trendingPlayers/players state-output unverändert
  VERIFY: useHomeData.test.ts existing 4 spotlight-Tests bleiben grün
  EXPECTED: useHomeData.spotlightSlots/topMovers/trendingPlayers Output unverändert (kein neuer Hook)
  FAIL IF: existing Tests brechen

AC-06: [I18N-DE] 6 neue Keys (3 fullLabels + 3 shortLabels) in de.json + business.md-konform
  VERIFY: jq '.home.marketPulse.tabMovers, .home.marketPulse.tabTrending, .home.marketPulse.tabWatched, .home.marketPulse.tabMoversShort, .home.marketPulse.tabTrendingShort, .home.marketPulse.tabWatchedShort' messages/de.json
  EXPECTED: alle 6 present, ohne "gewinn|prämie|preis[eg]|investier|rendite|asset"
  FAIL IF: fehlend ODER Compliance-Verletzung

AC-07: [I18N-TR] 6 neue Keys in tr.json + business.md-konform
  VERIFY: jq '.home.marketPulse.tabMovers, ...' messages/tr.json
  EXPECTED: alle 6 present, ohne "kazan|ödül|yatırım|portföy|getiri"
  FAIL IF: fehlend ODER Compliance-Verletzung

AC-08: [MOBILE] TabBar passt 393px ohne x-overflow
  VERIFY-DOM: TabBar-Klasse `overflow-x-auto scrollbar-hide` + `flex-shrink-0` auf jedem Tab
  EXPECTED: TabBar Container hat `overflow-x-auto`-Class, Tabs `flex-shrink-0`
  FAIL IF: Tabs verteilen sich mit `flex-1` (würde Mobile-Overflow verursachen)

AC-09: [TYPE-SAFETY + LINT] tsc + eslint clean
  VERIFY: npx tsc --noEmit && npx eslint "src/components/home/MarktPuls.tsx" "src/components/home/OwnTopMoversStrip.tsx" "src/components/home/TrendingPlayersStrip.tsx" "src/app/(app)/page.tsx"
  EXPECTED: 0 errors, 0 new warnings
  FAIL IF: irgendein TS-Error ODER neuer eslint-warn

AC-10: [REGRESSION] page.tsx-Diff: 3 Sektionen entfernt, 1 MarktPuls eingefügt, andere Sektionen unverändert
  VERIFY: git diff src/app/(app)/page.tsx
  EXPECTED: Z.250 LastGameweekWidget bleibt; Z.252-307 (3 Sektionen) ersetzt durch MarktPuls; Z.310+ Sidebar unverändert
  FAIL IF: Sidebar-Änderung ODER LastGameweekWidget-Touch
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | movers-Tab | holdings empty + hasGlobalMovers=true | only global | Tab 1 zeigt nur TopMoversStrip (kein OwnTopMoversStrip) | Conditional render in Tab-Panel |
| 2 | movers-Tab | holdings.length > 0 + topMovers.length === 0 (no change24h) | own ohne Bewegung | Empty-State (existing Z.286-291 logic in OwnTopMoversStrip) | OwnTopMoversStrip handled internal |
| 3 | trending-Tab | trendingPlayers empty | leer | Tab 2 NICHT in TabBar visible | Visibility-Filter |
| 4 | watched-Tab | uid undefined | not logged in | Tab 3 NICHT visible | useHomeData uid-gate; Tab-3-condition `!!uid` |
| 5 | watched-Tab | < 2 watched players | watchedPlayers.length < 2 | Tab 3 NICHT visible (Visibility-Filter via Prop, F-02 Hook-Hoist) | page.tsx Hook-Call → `watchedPlayers.length >= 2` als Tab-3-Visibility-Bedingung. KEIN Strip-internal-null-render-Side-Effect. Single-Source-of-Truth. |
| 6 | All-Empty | 0 Tabs Inhalt | nichts da | MarktPuls returnt null, page.tsx kein leerer-Header-Render | `if (tabs.length === 0) return null` |
| 7 | 1-Tab-Only | nur watched hat Inhalt | exotic | TabBar NICHT, Section zeigt nur Strip + Section-Header | `if (tabs.length === 1) return content without TabBar` |
| 8 | Tab-Click rapid | rapid double-click | concurrent | setActiveTab idempotent | React-State-Idempotenz |
| 9 | i18n-Locale-Switch | DE → TR während Render | re-render | Tab-Labels neu rendered korrekt | next-intl handles |
| 10 | Tab-Default-Cascade | trending only Inhalt | default = trending | Tab 'trending' aria-selected=true initial | useState init mit default-Cascade |
| 11 | Mobile 393px Tab-Overflow | shortLabel zu lang | ≥ 8 chars | TabBar scroll horizontal, kein Slop | shortLabel ≤ 7 chars, `flex-shrink-0` |

## 8. Self-Verification Commands

PowerShell-kompatibel:

```powershell
# Pflicht:
npx tsc --noEmit
npx vitest run "src/components/home/__tests__/MarktPuls.test.tsx"
npx vitest run "src/components/home/__tests__/OwnTopMoversStrip.test.tsx"
npx vitest run "src/components/home/__tests__/TrendingPlayersStrip.test.tsx"
npx eslint "src/components/home/MarktPuls.tsx" "src/components/home/OwnTopMoversStrip.tsx" "src/components/home/TrendingPlayersStrip.tsx" "src/app/(app)/page.tsx"

# i18n-Verifikation:
$de = Get-Content messages/de.json | ConvertFrom-Json
$de.home.marketPulse
$tr = Get-Content messages/tr.json | ConvertFrom-Json
$tr.home.marketPulse

# Compliance-Check (extended business.md filter):
# (via Grep-Tool):
#   grep -iE "gewinn|prämie|preis[eg]|investier|rendite|asset|kazan|ödül|yatırım|portföy|getiri" messages/de.json messages/tr.json | grep "marketPulse"
#   → 0 Hits in den 6 neuen Keys

# Konsumenten-Verifikation:
# grep "marketPulse" src/  → mindestens 1 Hit (MarktPuls.tsx via t())
# grep "MarktPuls" src/    → 2-3 Hits (Component-Definition + page.tsx Konsument + Tests)
# grep "topMoversWeek" src/  → 0 Hits (Inline-Section entfernt) — i18n-Key kann bleiben (orphan-OK in Slice 269)
```

## 9. Open-Questions (klären VOR Code)

**Pflicht-Klärung (Anil pre-Commit-Review):**

1. **TR-Wording für 3 Tab-Labels (full + short)** — Anil-Pflicht-Review (per `feedback_tr_i18n_validation.md`). Vorschläge siehe TR-Wording-Vorab unten.

**Autonom-Zone (Claude entscheidet):**

- **Tab-Default = 'movers'** — höchste-Engagement-Quelle für Daily-Driver (eigene + global Movers).
- **Tab-State lokal in Component** (useState) — keine sessionStorage-Persistenz. Mount-Reset OK.
- **Tab-Visibility-Filter:** Tab nur in Bar wenn Inhalt vorhanden. Watched-Strip nutzt `useMostWatchedPlayers`-Hook **doppelt** (in Strip + in MarktPuls für Visibility-Check) — akzeptabel da useQuery dedupiert.
- **Component-Extraction:** OwnTopMoversStrip + TrendingPlayersStrip als NEUE Sub-Components — extrahiert Inline-Code aus page.tsx und nicht-existing Trending-Strip.
- **TabBar nutzt etabliertes `src/components/ui/TabBar.tsx`** — kein neues Tab-Pattern.
- **Section-Header bleibt:** `t('marketPulse')` als Title, gleicher Stil wie pre-Slice topMoversWeek/globalMovers/mostWatched-Header.

**Nicht-Autonom (CEO):**

- **Wording-Drift:** keine "Investment"/"Rendite"/"yatırım"/"kazan"-Strings in 6 neuen Keys.
- **Money-Path-Decisions:** N/A — Slice ist Read-Only Discovery, kein Money-Path.
- **Tab-Reihenfolge:** Hard-codiert nach D63 Phase 4 als `[movers, trending, watched]` — kein User-Preferences. Falls Anil später anders priorisieren will → Slice 269b.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI-Refactor (3 Files NEU) | `npx vitest run` 3-File-Output → `worklog/proofs/269-marktpuls-vitest.txt` (Sub-Strips zusammen) |
| Konsument-Migration (page.tsx) | tsc + eslint clean → `worklog/proofs/269-tsc-eslint.txt` |
| i18n-Compliance | jq + Compliance-grep auf 6 neue Keys → `worklog/proofs/269-i18n-verify.txt` |
| Visual-Render | Playwright gegen bescout.net post-Deploy: 4 Konfigurationen × 2 Accounts (Power-User mit Holdings + New-User ohne, F-09): 3-tabs, 2-tabs, 1-tab, 0-tabs → `worklog/proofs/269-screenshots-{3,2,1,0}-{power,new}.png` (post-Deploy, Anil-Pflicht-Verify am WE) |

## 11. Scope-Out

- **Tab-Persistenz via sessionStorage:** NICHT. Mount-State-Reset OK pro D63-Identität-in-5-Sekunden-Vision.
- **User-Preferences Tab-Reihenfolge:** NICHT. Hard-codiert per D63. Slice 269b post-Telemetrie.
- **Sidebar-Sektionen-Migration:** NICHT. Sidebar-Sektionen (NextEvent, ActiveIPOs, etc.) bleiben unverändert. Slice 269 nur Hauptspalten-Discovery-Sektionen.
- **TopMoversStrip + MostWatchedStrip Refactor:** NICHT. Existing Components bleiben unverändert, werden in Tab-Panels embedded.
- **`marketPulse`-i18n-Key Top-Level-Wert:** Bleibt erhalten ("Markt-Puls"/"Piyasa Nabzı"), nutzt für Section-Title (F-01 Variante C — KEIN Drift-Risk). Sub-Keys gehen in NEU `marketPulseTabs` Sub-Object.
- **`globalMovers`-i18n-Key (orphan post-Slice, F-07):** Bleibt im Bestand (orphan-OK). Slice 269 verschiebt Inhalt unter Tab-Banner ohne separates SectionHeader. Cleanup erst wenn `globalMovers` 0 grep-Hits in Code-base.
- **HomeSpotlight Trending-Slot-Removal:** NICHT. Trending in Spotlight + Markt-Puls = Doppelung akzeptiert (Spotlight prio-driven, Markt-Puls user-filterable). Slice 269b post-Telemetrie evaluiert ob Doppelung removable.
- **Tab-Switch-Animation:** NICHT. Statisches Render. TabPanel hat existing `anim-tab-fade` (in TabBar.tsx) — reicht.

## 12. Stage-Chain (geplant)

```
SPEC ✓ → IMPACT (skipped — Pure UI-Refactor + i18n, kein Schema/Service/Hook)
       → BUILD (M-Slice, sequenziell: OwnTopMoversStrip extrahieren → TrendingPlayersStrip neu → MarktPuls bauen → page.tsx wire-up → i18n DE+TR → 3 Test-Files)
       → REVIEW (reviewer-Agent — Pflicht bei feat/refactor, neue UI + Wording)
       → PROVE (3 vitest + tsc + eslint + i18n-jq + Compliance-grep)
       → LOG
```

**IMPACT-Skip-Begründung:** Pure UI-Refactor + i18n-Strings. Keine DB/Service/Hook-Änderung. Cross-Cutting-Impact = nur 1 Konsument (`page.tsx`), bereits identifiziert. 3 NEU Components + 1 Konsument-Edit + 6 i18n-Keys.

## 13. Pre-Mortem (M-Slice 5+ Szenarien)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Tab-Default-Cascade falsch — User mit nur trending-Inhalt sieht Empty-Movers-Tab default | LOW | mittel | Cascade-Logic AC-04 enforced. Test mit allen 8 Permutationen (2³ = 8). | useMemo + AC-04 Test |
| 2 | Watched-Tab visible aber Strip rendert null (< 2 watched) → leerer Panel-Render | MED | mittel | Visibility-Decision in MarktPuls per `useMostWatchedPlayers`-Hook, NICHT delegiert an Strip-internal. Ggf. Strip-Hook doppelt-call (akzeptabel via TanStack-dedupe). | Edge-Case #5 + AC-03 Test |
| 3 | Mobile 393px Tab-Overflow bei langen TR-Strings (z.B. "İzlenenler" = 9 chars) | MED | niedrig | shortLabel ≤ 7 chars enforced. TabBar `overflow-x-auto + flex-shrink-0` per ui-components.md "Mobile Tab-Bars". | Visual-QA in PROVE |
| 4 | i18n-Wording-Drift in TR — "kazan" für "Movers" (Wörtl.-Ü "Kazananlar" = Gewinner) | MED | hoch | Anil-Pflicht-Review pre-Commit + Compliance-grep mit erweitertem TR-Filter (kazan, ödül, yatırım, getiri). | grep + Anil's Eyes |
| 5 | page.tsx-Migration broken — LastGameweekWidget oder Sidebar fälschlich entfernt | LOW | hoch | git diff in PROVE explizit prüfen. AC-10 hard-asserts page.tsx-Struktur. | git diff |
| 6 | Performance-Regression: 3 Strips parallel-rendert (alle gleichzeitig) statt Tab-conditional | LOW | niedrig | TabPanel `if (activeTab !== id) return null` etabliert (TabBar.tsx:71). 2 inactive Tabs nicht-rendered. | Profiler post-Deploy |
| 7 | Doppelung Trending-Slot in Spotlight + Markt-Puls Tab 2 verwirrt User | MED | niedrig | Acceptable per Scope-Out — Spotlight-Slot ist prio-driven (1 player), Markt-Puls-Tab ist filter-driven (Liste). Anil entscheidet post-Telemetrie ob removable. | Beta-Telemetrie |
| 8 | Cache-Drift Spotlight-Trending vs Markt-Puls-Trending (F-06): gleicher queryKey aber 2 Subscriber → wenn 1 unmount/remount stale data | LOW | niedrig | Beide nutzen `qk.players.trending` (singleton-Key) → TanStack-Cache-Konsistenz garantiert. Risiko nur bei mid-flight-mutation zwischen Render-Frames. | Beta-Day-3 Telemetrie: Spotlight-Trending-Player-ID vs Markt-Puls-Tab-Trending[0] |

---

## Compliance-Check

- $SCOUT-Wording: keine Erwähnung in 6 neuen Keys → ✓ N/A
- IPO-Begriff: bestehende Spotlight-IPO-Sektion unverändert. Slice 269 berührt nicht.
- TR-Glücksspiel-Vokabel: Tab-Labels neutral ("Bewegung"/"Hareket" statt "Gewinner"/"Kazananlar"). "Trending"/"Trend" ist Marketing-neutral.
- Asset-Klasse-Framing: keins. Markt-Puls = neutrales Discovery-Wort, keine Equity-Konnotation.
- Disclaimer: Markt-Puls ist Discovery-Section, kein Money-Path-Trigger → kein TradingDisclaimer pflicht.

## TR-Wording-Vorab (Anil-Pflicht-Review pre-Commit)

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `home.marketPulse.tabMovers` | "Bewegung" | "Hareket" | ✓ neutral, kein "kazan"/"gewinn" |
| `home.marketPulse.tabMoversShort` | "Movers" | "Hareket" | ✓ short reuse |
| `home.marketPulse.tabTrending` | "Trends" | "Trendler" | ✓ neutral |
| `home.marketPulse.tabTrendingShort` | "Trends" | "Trend" | ✓ |
| `home.marketPulse.tabWatched` | "Beobachtet" | "İzlenen" | ✓ "izlenen" = beobachtet, neutral |
| `home.marketPulse.tabWatchedShort` | "Watched" | "İzlenen" | ✓ |

**Anil-Pflicht-Review:** vor Commit markiert. Bei OK → direct commit. Bei Edit-Wunsch → Spec patchen.

## Open Risiko (kurz, ehrlich)

- **Risiko 1 (LOW):** Tab-Default-Cascade-Bug bei exotic-Konfigurationen (z.B. holdings + ohne change24h + hasGlobalMovers=false + trending=0 + watched ≥ 2). 8 Permutationen werden in AC-04 alle getestet — Risiko mitigated durch Test-Coverage.
- **Risiko 2 (MED):** Doppelung Trending in Spotlight + Markt-Puls. Akzeptiert per Scope-Out, aber User-Verwirrungs-Risk. Mitigation via Telemetrie post-Beta-Day-3 (CTR-Analysis Spotlight-Trending vs Markt-Puls-Trending). Falls > 80% Markt-Puls-Tab → Spotlight-Trending-Slot kann in Slice 269b entfernt werden.

**Mitigation greift:** Pre-Mortem #1 + #4 + #7 sind covered, AC-04 + Anil-TR-Review als gating-step.

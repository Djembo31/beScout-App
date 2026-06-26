# Mock→Pro — Codebase-Bestandsaufnahme (Domäne für Domäne)

> **Auftrag (Anil, 2026-06-26):** Beta abgebrochen. Ganze Codebase Domäne für Domäne auditieren → **EIN finaler Plan**. Ziel = Profi-/Sorare-Niveau (Architektur, System-Design, Patterns). Read-only Bestandsaufnahme, **kein Fix während der Aufnahme**. Quelle der Schmerzpunkte: echte Beta-Erfahrung (1–11, siehe `memory/project_mock2pro_program.md`).
>
> Severity: CRITICAL (bricht Geld/Integrität) · HIGH (bricht Kern-UX/Wahrheit) · MEDIUM (Inkonsistenz/Drift) · LOW (Politur).

---

## Domäne 1 — Trading & Kaufprozess  ✅ auditiert 2026-06-26

**Methode:** Live-RPC-Bodies selbst gezogen (buy_player_sc / buy_from_order / buy_from_ipo / recalc_floor_price / get_price_cap / get_price_floor / trg_trades_book_club_treasury) + 2 Cold-Context-UI-Agenten (Kauf-Fluss + Floor/Orderbuch).

### 🎯 Kern-Befund (die eine Wurzel): **„Von allem gibt es zwei."**
Das System ist in Schichten gewachsen, ohne je konsolidiert zu werden. Konkret existieren **parallel und divergent**:
- **2 Kauf-UI-Implementierungen:** Player-Detail (`BuyModal`) vs. Markt-Tab (`BuyConfirmModal`) — eigene Preis-Auflösung, eigene Mengenlogik, eigene Cache-Invalidierung, beide steuern dieselben 3 RPCs unterschiedlich an. → Schmerz 4 „vermischter Kaufprozess".
- **3 Kauf-RPCs mit abweichenden Regeln:** `buy_player_sc` (Orderbuch billigste) / `buy_from_order` (konkrete Order) / `buy_from_ipo` (Erstverkauf).
- **2 Bid-Systeme:** echte Limit-Buy-`orders` (side=buy) vs. P2P-`offers`. Player-Detail zeigt „Best Bid/Spread" aus `offers`, Markt-Depth zeigt die echten Buy-`orders`. → Schmerz 3 „Orderbuch funktioniert nicht".
- **2 Quellen der Club-Geld-Wahrheit:** RPC schreibt direkt `clubs.treasury_balance_cents` (Legacy-Spalte) UND der Trades-Trigger bucht das echte Club-Ledger (`book_club_treasury`). → Doppel-Schreibung.

Sorare hat von jedem genau **eins**. Das ist die Sorare-Distanz dieser Domäne — kein fehlendes Feature, sondern fehlende Konsolidierung.

### Befunde (Money-Core, selbst verifiziert)
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **CRITICAL** | `buy_from_ipo` (RPC) | **Kein `idempotency_key`** (anders als buy_player_sc/buy_from_order) → Doppelklick/Retry = Doppelkauf im Erstverkauf | 4 |
| **HIGH** | `buy_*` + `trg_trades_book_club_treasury` | **Doppel-Schreibung Club-Geld:** RPC `UPDATE clubs SET treasury_balance_cents += fee` direkt + Trigger bucht `book_club_treasury` aufs Ledger. Bei IPO wird sogar der **85 % Club-Share** durch den „trade_fee"-Trigger gebucht (falsches Quellen-Label). Verifizieren: reine Legacy-Drift vs. echte Doppel-Zählung | 5/11 |
| **MEDIUM** | `buy_player_sc` vs `buy_from_order` | **Rate-Limit divergent:** tier-basiert (20–200/24h) vs. hart `>= 20`. Gleicher User, anderes Limit je Kaufweg | 4 |
| **MEDIUM** | alle 3 buy-RPCs | **User-facing Error-Strings sagen „BSD"** („Nicht genug BSD") — laut business.md deprecatet, muss „Credits" | 5 |
| **MEDIUM** | `buy_player_sc` vs `buy_from_order` | fee_config-Lookup divergent (`created_at DESC` vs `club_id NULLS LAST`) → potenziell andere Fee-Row | 5 |
| **MEDIUM** | `buy_player_sc` | **Menge wird still gekappt** (`p_quantity := v_remaining`), `buy_from_order` lehnt stattdessen ab. Zwei Verhalten für „zu viel" | 4 |
| **MEDIUM** | `buy_player_sc`/`buy_from_ipo` | `price_change_24h` wird NUR in `buy_from_order` gepflegt → 24h-Änderung je nach Kaufweg falsch/stale | 11 |

### Befunde (UI-Fluss, Agent A — alle mit Datei:Zeile belegt)
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **CRITICAL** | `marketContent.priceCents.ts:39` + `BuyConfirmModal.tsx:69` + `trading.ts:102` | Markt-Kauf zeigt/rechnet `prices.floor`, RPC bucht aber realen billigsten **Fremd**-Order-Preis → angezeigte ≠ abgebuchte Summe | 4/11 |
| **CRITICAL** | `BuyConfirmModal.tsx:69` + `useTradeActions.ts:96` | Menge im Markt-Tab hart auf 1; Player-Detail erlaubt Mehrmengen an EINE Order gebunden → unvorhersehbar „wie viel, von wem" | 4 |
| **HIGH** | `BuyConfirmation.tsx:27,46` | Bestätigungs-Summe = `floorBsd × qty` statt Preis der gewählten Order (`pendingOrderId` wird ignoriert) | 11 |
| **HIGH** | `TransferListSection.tsx:78` vs `marketContent.priceCents.ts:40` | Liste rechnet Floor **client-seitig neu** (MIN über orders), Modal nutzt DB-`prices.floor` → Liste 11 CR, Modal 12 CR | 11 |
| **HIGH** | `useWallet.ts:170` + `BuyModal.tsx:78` | Freshness-Self-Heal (S372) nur in EINEM Modal; Markt-Tab + andere balance-Stellen erben ihn nicht → „Saldo wird aktualisiert…" hängt | 10 |
| **MEDIUM** | `errorMessages.ts` KNOWN_KEYS | `idempotency_pending` fehlt → generischer „Fehler" obwohl Kauf gerade verarbeitet wird → wirkt fehlgeschlagen | 10/11 |
| **MEDIUM** | `usePlayerTrading.ts:248` vs `mutations/trading.ts:92` | Invalidierung dupliziert & divergent (pbt/scoring/ipos vs offers) → je Kaufweg andere stale Caches | 10 |
| **MEDIUM** | `BuyModal.tsx:156` | Success-Auto-Close = 2 überlappende Timer auf demselben Flag → fragil bei schnellem Re-Open | 10 |

### Befunde (Floor/Orderbuch, Agent B)
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **HIGH** | `OrderbookSummary.tsx:23` vs `OrderDepthView.tsx:312` + `offers.ts:112` | 2 Bid-Quellen (Buy-orders vs P2P-offers); Spread im Player-Detail rechnet Ask (orders) gegen Bid (offers) = Äpfel/Birnen | 3 |
| **HIGH** | `offers.ts:119` | „Best Bid" sortiert nach `created_at` + `.limit(50)`, NICHT nach Preis → höchstes Gebot kann fehlen | 3 |
| **MEDIUM** | `OrderbookSummary.tsx:23` | Best-Ask schließt **eigene** Orders ein, die der RPC nicht kauft → optimistischer Spread als handelbar | 3/11 |
| **MEDIUM** | `OrderbookSummary.tsx:48`, `OrderbookDepth.tsx:17` | Leeres/einseitiges Orderbuch → `return null` (Block verschwindet kommentarlos) statt Empty-State → „Orderbuch ist weg/kaputt" | 3 |
| **MEDIUM** | `recalc_floor_price` + `trg_recalc_floor_on_trade` | MIN-Preis ohne `quantity-filled_qty>0`-Guard (latent, falls Settle-Bug Order auf open lässt) | 3 |
| **LOW** | `OrderbookDepth.tsx:20` | nur Sell-Side, heißt aber „Orderbuch" (halbes Buch) | 3 |

### ✅ Positiv verifiziert (kein Bruch — nicht anfassen)
- Floor-**Single-Source** seit Slice 303/368c sauber (kein Client-Recompute in `playerMath`/`enriched`).
- Floor-Sublabels ehrlich (`floorSource` ipo/order/lastSale).
- Order-Invalidierung nach place/cancel/buy/fill korrekt (Prefix-Match `['orders']`).
- `get_public_orderbook` korrekt sortiert (Sell ASC, Buy DESC, LIMIT 1000).
- Idempotency + Optimistic-Rollback im Player-Detail-Pfad solide.

### Sorare-Distanz Domäne 1
Funktional + atomar (gute RPC-Bausteine), aber **architektonisch zwei Kauf-Maschinen statt einer**. Heilung = **eine order-gebundene Kauf-Pipeline mit „what-you-see-is-what-you-pay"** + **eine Bid-Quelle** + **eine Club-Geld-Wahrheit**. Kein neues Feature — Konsolidierung. Money-Scope (CEO, Live-functiondef, Zero-Sum-Beweis).

---

## Domäne 2 — Events & Fantasy-Aufstellung  ✅ auditiert 2026-06-26

**Methode:** `rpc_save_lineup` (25k) + Legacy-`save_lineup` + DB-Constraints von `lineups`/`event_entries` selbst gelesen; 1 Cold-Context-UI-Agent (Builder + Join-Flow). Live-DB-Check: 0 Über-Bindungen aktiv.

### 🎯 Anils Schmerz 7 („1 SC mehrfach aufgestellt") — faktisch geklärt
- **Starter-Doppelung IST geschlossen** (ich selbst im Live-RPC verifiziert): `duplicate_player`-Guard (`v_seen`-Loop über 12 Slots), `bench_duplicate` + `bench_overlaps_starter`, und Cross-Event-Bindung für Starter via `holdings.quantity − SUM(holding_locks WHERE event_id != self)` → `insufficient_sc`. Anil hat den **Vor-Fix-Zustand** erlebt (Slice 272 + Server-Guard kamen danach).
- **ABER: die Bank ist das echte verbliebene Loch (HIGH, selbst verifiziert).** Der Bench-Check ist NUR `holdings.quantity >= 1` (`bench_not_in_holdings`) — er subtrahiert **keine** Cross-Event-`holding_locks`, und der `holding_locks`-INSERT am Ende deckt **nur die 12 Starter-Slots** (`unnest(v_all_slots)`), die Bank-UIDs (`p_bench_gk/o1/o2/o3`) NICHT. `score_event` zieht Bank per Auto-Sub ins Scoring. → **EINE Karte kann als Bank in beliebig vielen Events liegen und überall punkten.** Das ist der real noch offene Teil von Schmerz 7.

### 🎯 Wurzel-Befund: das Daten-Modell selbst (HIGH, Architektur)
`lineups` speichert die Aufstellung als **12 nullbare Slot-Spalten + 4 Bank-Spalten** (`slot_gk`, `slot_def1..4`, … `bench_o3`). Folgen:
- **KEIN DB-Constraint gegen denselben Spieler in zwei Slots** — die Integrität lebt zu 100 % im App-Code + im RPC-`v_seen`-Loop. Kein zweiter Schreibpfad existiert heute (nur `save_lineup`→`rpc_save_lineup`), also praktisch sicher, aber **architektonisch nicht erzwungen**.
- Das Wide-Column-Modell **erzwingt** die 25k-Zeichen-IF-Leiter im RPC (Formations-Zählung Slot für Slot, 9 Regel-Typen je 12-Slot-Loop + Bench-Loop dupliziert).
- **Sorare-Modell:** Lineup-Slots als Zeilen (`lineup_slots(lineup_id, slot, player_id)`) + DB-`UNIQUE(lineup_id, player_id)` + Karten-Bindung als FK/Lock-Zeile. Dann ist Doppelung **DB-unmöglich** und der Validator schrumpft drastisch.

### Befunde
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **HIGH** | `rpc_save_lineup` Bench-Block + holding_locks-INSERT | **Bank bindet keine Karte + ignoriert Cross-Event-Locks**, punktet aber via Auto-Sub (`score_event`) → 1 Karte in N Events nutzbar | 7 |
| **HIGH** | `lineups`-Schema (12 Slot-Spalten, kein UNIQUE) | Integrität nur App-erzwungen, nicht DB; Wide-Column erzwingt Monster-RPC | 7/8 |
| **MEDIUM** | `useLineupSave.ts:96` | Join + vollständiges Lineup **hart gekoppelt** — kein „erst beitreten, später aufstellen"; unvollständig = keine Teilnahme | 6 |
| **MEDIUM** | `useEventActions.ts:534,548,587` + `useLineupSave.ts:96` | `onJoin`-Fehler verschluckt (`catch {}`), `onSubmitLineup` läuft trotzdem → 2 widersprüchliche Toasts bei Join-Fehlschlag | 6/10 |
| **MEDIUM** | `save_lineup`/`lock_event_entry`/`unlock_event_entry`/`cancel_event_entries` | „von allem zwei": dünne Wrapper über `rpc_`-Versionen (KEIN Bypass — verifiziert, aber Indirektions-/Namens-Smell) | 5 |
| **LOW** | `holdingLocks.ts:20` (staleTime 2min) | Paralleler Event-Tab kann gebundene Karte kurz als verfügbar zeigen (Server-Guard greift beim Save) | 10 |
| **LOW** | `LineupPanel.tsx:681` | Post-Game „Aufstocken"/Trading-CTA = SPK-Reinvest-Anti-Pattern (business.md) | 5 |

### ✅ Solide (nicht anfassen)
- Starter-Integrität (Doppel-Spieler, Bench-Overlap, Cross-Event) dreifach dicht; Live-DB 0 Verletzungen.
- Lock-Lifecycle korrekt: `trg_fn_event_status_unlock_holdings` löscht Locks bei ended/scoring/cancelled; cancel/unlock-RPCs räumen auf.
- Vollständiger Aufstellungs-Regelsatz (age/mv/position/nation/liga/max_per_club) für Starter UND Bank durchgesetzt — nur die Lock-Bindung fehlt der Bank.
- Cache-Invalidierung nach Join/Leave/Save deckt events/holdings/wallet/usage/locks.

### Sorare-Distanz Domäne 2
~75 % dort. Zwei echte Lücken: **(1) Bank-Karten-Bindung** (Integritäts-Patch) und **(2) das Wide-Column-Lineup-Datenmodell** (Architektur — DB-erzwungene Integrität + schlankerer Validator). Dazu ein **UX-Entscheid (CEO):** Entry und Lineup entkoppeln (früh beitreten, bis Deadline editieren) — das erklärt „ging fast gar nicht".

---
## Domäne 3 — Community & Follow  ✅ auditiert 2026-06-26

**Methode:** club_followers-Constraints/Trigger/RLS + Follow-Read/Write-Pfade selbst (grep) + 1 Cold-Context-Konsistenz-Agent.

### 🎯 Anils Schmerz 9 („Follow nicht sicher auf allen Ebenen") — präzise lokalisiert
- **Club-Page selbst ist sauber** (Slice 151b-RESET): `useToggleFollowClub` = einzige Mutations-Wahrheit, vorbildlicher Optimistic+Rollback+Reconcile auf 3 Keys. Das alte „mal 0, mal 4 Scouts" dort behoben.
- **Drift sitzt an Ebenen, die der zentrale Toggle NICHT kennt** (= exakt „nicht auf allen Ebenen"):
  - **Discovery-Page** (`clubs/page.tsx`) hält Vereinsliste + `follower_count` in eigenem `useState` + `Promise.all` (NICHT React Query) → vom Toggle nie invalidiert → Folge auf Club-Page lässt Discovery-Zähler/Button stale bis Remount.
  - **Fan-Rang-Karte** liest eigenen Query-Key; Follow gibt server-seitig **+5** (Trigger `club_followers_recalc_fan_rank`), aber Toggle invalidiert `fanRanking` NICHT → Rang hinkt bis 30s / Tier-Sprung sichtbar falsch. **Money-nah** (Fan-Rang→Poll-Stimmgewicht D92).

### Befunde
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **HIGH** | `clubs/page.tsx:37,64` | Discovery-Liste eigener `useState` statt React Query → vom Follow-Toggle nie invalidiert (Zähler+Button stale). Zwei Zähler-Quellen pro Verein (Button=Cache, Count=lokal) | 9/11 |
| **HIGH** | `useToggleFollowClub.ts:101` vs `fanRanking.ts:13` | Follow=+5 Fan-Rang server-seitig, aber `fanRanking`-Key nicht invalidiert → Rang/Tier stale ≤30s (money-nah) | 11 |
| **MEDIUM** | `ClubHero.tsx:67` + `ClubStatsBar.tsx:47` | 2× `useCountUp` für denselben follower_count auf einem Screen → kurzer Animations-Desync | 10/11 |
| **MEDIUM** | `useEventActions.ts:192` | `requires_follow`-Gate server-fail-closed (korrekt!), aber kein Client-Vorab-Check → „erst folgen" erst NACH Klick als Toast | 9 |
| **LOW** | `club.ts:181` `isUserFollowingClub` | swallowt Error → `return false` (cached Pseudo-Erfolg, kein Retry); inkonsistent zu `getClubFollowerCount` das wirft | 11 |
| **LOW** | club-follow = Direkt-Table-Write (`.from('club_followers')`) vs user-follow = RPC | „von allem zwei" (verschiedene Konzepte, aber uneinheitliche Schreib-Architektur) | 5 |

### ✅ Solide
- `UNIQUE(user_id, club_id)` → kein Doppel-Follow auf DB-Ebene; RLS sauber (read public, write own).
- Server-Gates (Event-Türsteher requires_follow, min_fan_rank, Poll-Reichweite, fan_rank-Recalc) fail-closed + autoritativ — **kein** Money-Drift, nur UX-Vorab-Lücke.
- `useToggleFollowClub` Optimistic-Pattern = Profi-Referenz.

### Sorare-Distanz Domäne 3
Nah dran. Kein Daten-/Money-Drift (Server-Gates dicht), die Lücken sind **Cache-Invalidierungs-Reichweite**: 2 Ebenen (Discovery-Liste, Fan-Rang) hängen nicht am Toggle. Fix = Discovery in React Query heben + `fanRanking`-Key in `onSettled` ergänzen (≈1 Hook-Lift + 1 Zeile).

---
## Domäne 4 — Money-/Wallet-Anzeige & UI-State-Freshness (cross-cutting)  ✅ auditiert 2026-06-26

**Methode:** globale Query-Config (`queryClient.ts`) + staleTime-Streuung + queryKeys-Struktur (52 Namespaces) selbst; 1 Cold-Context-Agent auf alle Geld-Anzeige-Oberflächen.

### 🎯 Wichtig: hier bricht das „teilweise konsolidiert"-Muster — POSITIV
- **Die Guthaben-Anzeige ist die sauberste Domäne bisher.** ALLE „mein Guthaben"-Oberflächen (TopBar, SideNav, ProfileView, HomeStoryHeader, BuyModal, SellModal, MarketHeader, BountyModal) lesen **denselben** Cache `useWallet → ['wallet', userId]`. Keine parallele Query, keine lokale Balance-Kopie (Slice 152 Provider→Query-Migration). Wallet-Invalidierung breit über ALLE credit-belastenden Mutations verdrahtet (Trading/Offers/Events/Polls/Research/Tips/Missionen/Abos).
- **Zentrale Query-Policy existiert** (`queryClient.ts`): staleTime 2min, gcTime 24h, retry 2, `refetchOnWindowFocus: false`, `placeholderData: keepPreviousData`. Sinnvoll konfiguriert. `staleTime:0`-Treffer = fast alle Kommentare/dokumentierte Ausnahmen (mysteryBox J5F-05, tickets) — kein Wildwuchs.

### 🎯 Die Fragmentierung sitzt hier in der PRÄSENTATION, nicht in den Daten
Neue Facette des Musters: nicht Daten-Quellen driften, sondern **Helfer/Formatter**.
- **Zwei Geld-Formatter mit verschiedener Präzision auf derselben Balance:** `formatScout()` (wallet.ts:281, `maximumFractionDigits:0` → ganze Credits) vs `fmtScout(centsToBsd())` (utils.ts:8, 2 Nachkommastellen). → TopBar zeigt „1.000,50", SideNav/Profil zeigen „1.001"/„1.000" für **dieselbe** DB-Balance. Anzeige-Drift, nicht Cache-Drift.

### Befunde
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **HIGH** | `wallet.ts:281` vs `utils.ts:8` | 2 Balance-Formatter, divergente Präzision → Header ≠ Sidebar für gleiche Balance | 11 |
| **MEDIUM** | `BuyModal.tsx:78` | Self-Heal (S372) deckt Fetch-**Fehler**-Pfad nicht: Netz weg → `balanceStale` bleibt true → Button dauerhaft „Saldo wird aktualisiert…", kein Retry/Error | 10 |
| **MEDIUM** | `JoinConfirmDialog.tsx:62` + verstreut | Inline `cents/100` statt `centsToBsd()` → latentes 100×-Bug-Risiko (kein Type-Schutz) | 11 |
| **LOW** | `useWallet.ts:170` (useIsBalanceFresh) | Freshness-Self-Heal pro-Komponente kopiert statt im Hook → jeder neue Money-Flow erbt den Hang erneut | 10 |
| **LOW** | `HomeStoryHeader:178` vs TopBar/SideNav | Loading: mal Skeleton (`animate-pulse`), mal Pill ausgeblendet → uneinheitlich | 10 |
| **LOW** | ~45 ad-hoc `staleTime`-Overrides | zentrale Default existiert, aber breit überschrieben ohne dokumentierte Freshness-Policy-Tabelle | 10 |

### Sorare-Distanz Domäne 4
Daten-seitig **nahezu Profi** (ein Wallet-Cache, breite Invalidierung). Lücken: **(1) zwei Formatter** vereinheitlichen (`formatBalance(cents)` + bewusste Präzisions-Policy), **(2) BuyModal-Fehlerpfad** härten, **(3) Freshness-Self-Heal in den Hook ziehen**. Präsentations-Konsolidierung, kein Architektur-Umbau.

---
## Domäne 5 — App-Shell & Performance (cold/warm-start)  ✅ auditiert 2026-06-26

**Methode:** Provider-Kette/AuthProvider/QueryProvider/next.config/useHomeData selbst (grep) + 1 Cold-Context-Performance-Agent (statische Architektur-Analyse, kein Build). Gemessen: **456 Client-Komponenten : 39 Server-Komponenten** in app/; **82 dynamic()-Splits**; zentrale Query-Policy vorhanden.

### 🎯 Wurzel-Befund: CSR-SPA in App-Router-Kleidung
- **0 (null) serverseitiger Datenvorlauf** im ganzen Repo (kein `prefetchQuery`/`HydrationBoundary`/`dehydrate`). Root-Layout ist Server, aber alles Sichtbare hängt an der `'use client'`-Kette. → Erster sinnvoller Pixel = JS-Download → Hydration → Auth-Roundtrip → Client-Query, **alles seriell**. Das ist die strukturelle Wurzel von Schmerz 2.
- **Harter Auth→Daten-Wasserfall:** `ClubProvider` + Daten-Schicht mounten erst NACH aufgelöster Session (`loading===false && user!==null`). Defensive Timeouts 10–15s (`AuthProvider.tsx:185,203,402`) = Team pflastert das Symptom bereits. Cold Mobile-Safari real 4–9s bis erste RPC.

### Befunde
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **CRITICAL** | `app/layout.tsx` + `Providers.tsx:35` | Komplett client-gerendert, 0 prefetch/HydrationBoundary → kein server-vorgerenderter LCP | 2 |
| **CRITICAL** | `Providers.tsx:20` + `AuthProvider.tsx:184` | Auth blockt gesamte Daten-Schicht; serieller Auth→Profile→ClubProvider→Home-Queries-Cascade, 10–15s Notfall-Timeouts | 1/2 |
| **HIGH** | `useHomeData.ts` | Home feuert ~16–17 Client-Queries; echte Wasserfälle (`usePlayersByIds` hängt an trending+ipos+dashboard; `useLineupWithPlayers` an scopedEvent+LeagueScope) | 2 |
| **HIGH** | `useWallet.ts:70,135` | Wallet `staleTime:0` + window-focus-Refetch → Refetch-Sturm auf Mobile (bewusster Money-Trade-off, aber Last im kritischen Pfad) | 2 |
| **MEDIUM** | `(app)/layout.tsx` (`'use client'`) | App-Shell-Layout vollständig Client → zieht SideNav/TopBar/BottomNav/BG ins Initial-Bundle; macht Kinder zwingend client | 2 |
| **MEDIUM** | `ClubProvider.tsx:89,131` | initClubCache+initLeagueCache+LeagueScope-Cascade = zweiter Post-Auth-Layer (`loading`=3 Bedingungen). Clubs/Ligen quasi-statisch → könnten build-time/server kommen | 2 |
| **LOW** | `QueryProvider.tsx:89` | Persist-Rehydration in `useEffect` (nach erstem Render) → Warm-Start-Vorteil gemindert. KEIN Hydration-Mismatch (SSR-Guards sauber) | 2 |

### ✅ Überraschend GUT (nicht das Problem — nicht anfassen)
- **Bundle-Hygiene stark:** keine schweren Libs (kein recharts/framer/date-fns/d3/chart.js), `optimizePackageImports` gesetzt, lucide named-imports, country-flag-Namespace-Leak gefixt (S120). 82 dynamic()-Splits über 31 Files.
- **CLS/Skeleton-Disziplin gut:** fixed-height-Skeletons gegen Layout-Shift (S116), AuthGuard returning-user quasi-sofort (S264).
- Persist-Cache korrekt (Map/Set-Korruptions-Guard, UUID-Filter, user-scope-Allowlist).

### Sorare-Distanz Domäne 5
Trennt EINE Sache: **above-the-fold server-rendern/streamen + Auth aus dem kritischen Render-Pfad** (RSC + prefetch für Home/Player-Detail; ClubProvider unconditional mounten, Queries via `enabled:!!uid` selbst-gaten). Das ist 1 großer Architektur-Hebel — die gute Bundle-Arbeit bleibt unberührt. Wahrgenommener Cold-Start fiele von „Sekunden weißer Screen" auf „instant Shell + progressiver Inhalt".

---
## Domäne 7 — Spieltag/Gameweek + Scoring/Ranking  ✅ auditiert 2026-06-26 (Anil-Nachtrag)

**Methode:** `score_event` (16k, Money-Herz) selbst gelesen + fixtures/player_gameweek_scores/league_standings-Spalten selbst + 1 Cold-Context-Fixtures-Display-Agent. Live-DB gegengeprüft.

### 🎯 Wurzel-Befund: Leistung ist an die **Gameweek-NUMMER** gebunden, nicht an das **Spiel**
`player_gameweek_scores` = nur **(player_id, gameweek, score)** — **keine** fixture_id, **keine** league_id. Der Score eines Spielers hängt an einer globalen Gameweek-Nummer, nicht an einem konkreten Match/Wettbewerb. `score_event` joint `fixture_player_stats → fixtures ON gameweek = v_event.gameweek` **ohne league-Filter**. Das ist Anils „nicht sauber gebunden" strukturell. Sorare bindet jeden Score hart an Karte×Fixture.

### Befunde
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **HIGH** | `player_gameweek_scores`-Schema + `score_event` (GW-Join ohne league) | Score an Gameweek-Nummer statt Fixture gebunden; Minutes-Join filtert nur GW, nicht Liga → bei Multi-Liga-GW (Transfer-Spieler) Vermischung über Wettbewerbe | vertauscht/zugeordnet |
| **HIGH** | `scoring.queries.ts:139` (getPlayerMatchTimeline) | Heim/Auswärts per **Mehrheits-Vote** geraten (`effectiveClubId`) → für 5 reale Transfer-Spieler (2 Ligen) Minderheits-Liga-Spiele **invertiert**: 2:1 zeigt 1:2, falscher Gegner | vertauscht |
| **HIGH** | `score_event` Default `v_gw_score := 40` | Spieler mit Minuten aber ohne Score → **phantom 40 Punkte** (data liar) statt 0/Fehler → falsche Wertung+Reward | 11 |
| **HIGH** | `ClubFixturesStrip.tsx:66` + `FDRBadge.tsx:36` | FDR/Gegner-Stärke matched Clubs über **Kürzel-String** (`WOL`=Wolfsburg+Wolverhampton, `BAY`,`GEN`…) → mischt gleichnamige Clubs über Ligen → falsche Schwierigkeit/L5 | 11/filter |
| **MEDIUM** | `SpieltagSelector.tsx:20` + `FantasyNav.tsx:48` | `maxGameweek=38` hart; in 34-GW-Ligen (TFF1/BL/2.BL) Navigation auf GW35-38 → leerer Spieltag. `getLeagueMaxGameweeks` (S251) existiert, nicht reingezogen | filter/10 |
| **MEDIUM** | `scoring.queries.ts:37` + `GameweekScoreBar.tsx:44` | Score-Map dedupt silent nach GW-Nummer (kein `.limit()`, keine Fixture-Bindung) → bei je 2 Scores/GW gewinnt still der letzte | zuordnung |
| **MEDIUM** | `GameweekSelector.tsx:24` | `canNext < 38` hart — aber Komponente **toter Code** (0 Render); Verwechslungsrisiko mit live SpieltagSelector | — |
| **LOW** | `fixtures.ts:28` | `getFixturesByGameweek` sortiert `created_at` statt `played_at` (Konsumenten ohne Re-Sort bekommen Insert-Ordnung) | 10 |

### ✅ Solide (überraschend gut)
- **Haupt-Spieltag-UI Heim/Auswärts korrekt** (FixtureCard/FixtureDetailModal/FormationTab/Club-FixtureCards ordnen home links/away rechts + Score richtig).
- **Gameweek↔Liga-Filterung im Fantasy-Spieltag sauber** (alle 7 Ligen teilen GW-Nummern, leagueId durchgeroutet, active-GW single-source `leagues.active_gameweek` S310).
- **„Von allem zwei" hier NEGATIV:** `src/lib/services/fixtures.ts` = 2-Zeilen-Re-Export-Bridge auf features-Service. Eine Wahrheit, kein Drift (verifiziert).
- Event-interne Rangverteilung (DENSE_RANK→prize) korrekt.

### Sorare-Distanz Domäne 7
Die Anzeige-Mechanik ist näher dran als gedacht; die Wurzel ist das **Datenmodell**: Leistung an GW-Nummer statt an Fixture gebunden (wie Domäne 2 das Lineup an Wide-Columns statt Slot-Zeilen). Fix-Richtung: `player_gameweek_scores` fixture-/liga-gebunden machen; Heim/Auswärts + FDR über Club-**UUID** statt Short/Majority-Vote; Default-40 → 0/explizit; per-Liga-GW-Max durchrouten. Money-Scope (score_event berührt Wallet/Reward).

---

## Domäne 6 — Design-System & Konsistenz  ✅ auditiert 2026-06-26

**Methode:** Hex-Farb-/Komponenten-Duplikat-Scan selbst + brand-coherence-auditor + ux-coherence-auditor (spezialisierte Agenten).

### 🎯 Muster bestätigt — visuell: „an der Quelle exzellent, in der Fläche driftig"
Die Tokens + Primitives (`Card`, `Button variant="gold"`, `positionColors.ts`) existieren und sind teils vorbildlich (`positionColors.ts` = echter SSOT; Home-Flächen Sorare-Niveau). Aber **zwei Drittel der Oberflächen wurden nie durch die Primitives gezogen** → sichtbare Drift. Exakt das domänenübergreifende „einmal konsolidiert, Rest nie reingezogen".

### Befunde (Brand)
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **HIGH** | `ui/index.tsx:76` (Card) vs `tailwind.config.ts:21` | Card-Default `surface-base` (5%) weicht von DNA-Spec `bg-white/[0.02]` (2%) ab → jede Card 2,5× heller als Soll. Quelle selbst driftet von Doku | 5 |
| **HIGH** | 183 Files / 411 hand-gerollte `bg-surface-*`/`bg-white/[0.0x]`-Divs vs nur 302 `<Card>` | Surface-Drift breit → nebeneinander unterschiedlich helle Kacheln = „gebastelt"-Eindruck | 5/8 |
| **HIGH** | Gold-Button copy-paste in 12+ Files; abweichende Gradienten im **Kauf-CTA** (`BuyConfirmModal.tsx:212`, `BuyModal.tsx:282`) | Wichtigste Money-Fläche nutzt NICHT den Standard-Gold-Button → Glanz variiert je Seite | 5/8 |
| **MEDIUM** | 181 Files / 506× `text-green-500`/`red-400` statt `vivid-green/red`-Token | Gewinn/Verlust-Grün je Page anders gesättigt | 5 |
| **MEDIUM** | `player/index.tsx:135` + `positionColors.ts` | Farb-Semantik-Kollision: amber/sky/rose mal Position, mal Qualität → Farbcode mehrdeutig | 8 |
| **MEDIUM** | `player/index.tsx`, `club/FixtureCards.tsx` u.a. | `yellow-*` statt `status-doubtful`-Token; zwei Gelb-Systeme (grünstichig vs warmes Gold) | 5 |
| **LOW** | diverse Stat-Boxen `bg-black/xx` statt Surface-Token | innere Kacheln kälter/dunkler als Surface daneben | 5 |
| **LOW** | Number-Weight schwankt (`font-black` vs `font-bold` auf Zahlen) | Zahlen wirken je Fläche unterschiedlich „schwer" | 5 |

### ✅ Solide (Brand)
- `positionColors.ts` echter SSOT (9 Varianten zentral). Home-Premium-Flächen Sorare-Niveau (vivid-Token, tabular-nums, gold-glow). `tabular-nums` breit durchgehalten. Token-Layer reich + durchdacht. Gold-Hardcodes meist legit (Canvas/SVG).

### Befunde (UX-States)
**Wichtig: UX-States-Fundamente sind GUT.** Eine Modal-Basis (Radix Dialog/AlertDialog, 42+ Sites), Skeleton-First durchgehend, `ErrorState`+`EmptyState`-Primitive, `preventClose`-Money-Disziplin breit korrekt. Der Drift konzentriert sich fast vollständig auf **EINE Fläche: den P2P-Angebote-Tab** (`OffersTab`/`useOffersState`), nie in die Konsolidierung nachgezogen.
| Sev | Ort | Problem | Schmerz |
|-----|-----|---------|---------|
| **HIGH** | `useOffersState.ts:68` | Angebote-Lade-Fehler swallowed → `setOffers([])` → User sieht Empty statt Error; OffersTab hat KEINEN Error-State | 8/10 |
| **HIGH** | `useOffersState.ts:92,120,147,175,223` | 5× `addToast('<i18nKey>')` → **rohe Keys im UI** (`offerAccepted`/`invalidPrice`…), Money-naher P2P-Flow | 5/8 |
| **MEDIUM** | `OrderbookSummary.tsx:48`, `OrderbookDepth.tsx:17` | Orderbook returnt `null` bei leer → verschwindet kommentarlos (latentes Empty-Loch, deckt Trading-Audit Domäne 1) | 3/8 |
| **MEDIUM** | `OffersTab.tsx:257,473` | Create-/Counter-Dialog kein `preventClose` bei aktiver Mutation → State-Loss-Risiko im Money-Flow | 8 |
| **LOW** | `SpieltagTab.tsx:326,362` | Admin Start/Finalisieren-Confirm ohne preventClose/Loading → Doppel-Trigger mid-mutation möglich | 8 |

### Sorare-Distanz Domäne 6 (gesamt)
Infrastruktur (Tokens, Primitives, Modal-Basis, States) ist da und teils vorbildlich. **Brand driftet breit** (Card/Button/Farb-Durchsetzung über viele Flächen), **UX-States driftet punktuell** (fast nur OffersTab + Orderbook-Empty). Beides = Durchsetzung, kein Neubau. OffersTab = eigener fokussierter Heal-Slice.

---

### Sorare-Distanz Domäne 6
Infrastruktur ist da, der Hebel klein aber breit: **Quelle angleichen** (Card-Default ↔ DNA) + **Haupt-Flächen durch die existierenden Primitives ziehen** (Card/Button/vivid-Token). Kein Neubau — Durchsetzung. „Gebastelt" kommt nicht von hässlichen Komponenten, sondern von driftender Helligkeit/Farbton/Glanz nebeneinander.

---

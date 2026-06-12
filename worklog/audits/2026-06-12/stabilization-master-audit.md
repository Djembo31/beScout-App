# BeScout Stabilization Master Audit — Product/Pages/Components

Datum: 2026-06-12
Status: READ-ONLY AUDIT / NO CODE CHANGES
Scope: Produktwahrheit, Page-E2E-Reife, Component/Service-Source-of-Truth, Stabilisierungspfad
Wichtig: Dieses Dokument wurde bewusst separat angelegt, um Claudes aktive Slice-284-Arbeit nicht zu überschreiben.

---

## 0. Executive Summary

Anils Gefühl ist korrekt: BeScout ist nicht grundsätzlich kaputt, aber es trägt deutlich sichtbares Prototype-/Mockup-Erbgut. Die Plattform hat eine starke, differenzierte Vision und viele funktionierende Bausteine, aber die Vorführbarkeit leidet unter vier Kernproblemen:

1. Truth Drift: mehrere Dokumente beschreiben unterschiedliche Produktstände.
2. Page Drift: viele Pages existieren, aber nicht jede Page hat einen klaren E2E-Vertrag.
3. Source-of-Truth Drift: Komponenten, Pages, Query Hooks, Services und Bridge-Dateien greifen teils uneinheitlich auf dieselben Daten/Domänen zu.
4. Confidence Drift: Tests sind vorhanden, aber nicht jedes grüne Testfile bedeutet echte Produktreife; es gibt Placeholder-/Skipped-/Mock-heavy Tests.

Die Lösung ist nicht ein Big-Bang-Refactor. Die Lösung ist ein Stabilization Operating Mode:

- erst Slice 284 Core-Domain-Stabilisierung abschließen,
- dann Produktwahrheit einfrieren,
- dann Pages in Demo-Reihenfolge auditieren,
- dann pro Page kleine Stabilisierungsslices,
- parallel Source-of-Truth-Grenzen und Bridge-Cleanup vorbereiten,
- erst danach Sommer-Roadmap / neue Features.

---

## 1. Verifizierte Repo-Fakten

Stand aus read-only Inventar:

- Pages: 30 `src/app/**/page.tsx`
- Nicht-Test-Komponenten: 391 `.tsx` Files ohne `page.tsx` und ohne `__tests__`
- Component-Tests: 109 `*.test.tsx`
- API-Routes: 24 `src/app/api/**/route.ts`
- Aktiver Projektprozess: SHIP-Loop aus `CLAUDE.md`
  - SPEC -> IMPACT -> BUILD -> PROVE -> LOG
- Aktiver Slice laut `worklog/active.md`:
  - Slice 284
  - Stage: BUILD
  - Wave 1 / Slice 284a Live-Lifecycle
  - Spec: `worklog/specs/284a-live-lifecycle.md`

Aktuelle Vorsicht:
- Es gibt uncommitted Slice-284-Änderungen von Claude.
- Dieses Audit verändert absichtlich keine laufenden Slice-Dateien.

---

## 2. Product Truth / Vision Befund

### 2.1 Aktuelle Zielvision

Aktuelle Wahrheit laut `CLAUDE.md` und `memory/decisions.md`:

- BeScout ist B2B2C Fan-Engagement.
- Clubs verkaufen Scout Cards, starten Events/Votes, verteilen $SCOUT-Credits.
- Fans bauen Fußball-Reputation, Portfolio, Scouting-Profil und Community-Status auf.
- Alle 7 Ligen sind launch-ready, nicht mehr Sakaryaspor-only.
- DE/TR bleiben Priorität, aber Qualitätsstandard gilt für alle Ligen.

Das ist ein starkes Produktbild: Fußballwissen wird zu Reputation, Aktivität und Club-Nähe.

### 2.2 Truth Drift

Gefundene Konflikte:

| Quelle | Aussage | Problem |
|---|---|---|
| `CLAUDE.md` | 7 Ligen launch-ready | aktuell gültig |
| `memory/decisions.md` D1 | Sakaryaspor nicht mehr Pilot-exklusiv | aktuell gültig |
| ältere Vision-/Memory-Dateien | Sakaryaspor/25 Spieler/Pilot-Fokus | historisch, aber nicht überall als historisch markiert |
| `README.md` | MVP Starter, Mock Data, Supabase später | stark veraltet |
| Beta-Dokumente | READY / pending visual verify / faktisch live | Status-Semantik nicht eindeutig |

Risiko:
Ein Agent liest README oder alte Vision und arbeitet auf einem falschen mentalen Modell. Dadurch entstehen Schleifen und Rework.

### 2.3 Notwendige Truth-Freeze-Regel

Ab sofort sollte gelten:

1. `CLAUDE.md` + `memory/decisions.md` D1 = aktuelle Produkt-/Scope-Wahrheit.
2. `README.md` darf nicht mehr als Architektur-/Produktwahrheit genutzt werden, bis es ersetzt ist.
3. Historische Pilot-Sakaryaspor-Dokumente müssen als historical markiert werden.
4. Journey-Status darf nicht nur `done` sein, sondern braucht drei Ebenen:
   - happy-path wired
   - production-data stable
   - beta-user validated

---

## 3. Page Inventory und Audit-Reihenfolge

### 3.1 Page-Liste

| Route | File | Lines | Erste Einstufung |
|---|---:|---:|---|
| `/` | `src/app/(app)/page.tsx` | 525 | Core demo-critical, high integration |
| `/market` | `src/app/(app)/market/page.tsx` | 8 | Core demo-critical, wrapper auf MarketContent |
| `/player/[id]` | `src/app/(app)/player/[id]/page.tsx` | 41 | Core demo-critical, server metadata + PlayerContent |
| `/clubs` | `src/app/(app)/clubs/page.tsx` | 376 | Core demo-critical, broad data usage |
| `/club/[slug]` | `src/app/(app)/club/[slug]/page.tsx` | 46 | Core demo-critical, server + ClubContent |
| `/fantasy` | `src/app/(app)/fantasy/page.tsx` | 60 | Core demo-critical, GeoGate + FantasyContent |
| `/manager` | `src/app/(app)/manager/page.tsx` | 29 | Core demo-critical, dynamic ManagerContent |
| `/community` | `src/app/(app)/community/page.tsx` | 337 | Core/social, complex hooks |
| `/missions` | `src/app/(app)/missions/page.tsx` | 266 | Engagement core, mutation-heavy |
| `/profile` | `src/app/(app)/profile/page.tsx` | 64 | Account core |
| `/profile/settings` | `src/app/(app)/profile/settings/page.tsx` | 511 | Account mutation-heavy |
| `/login` | `src/app/(auth)/login/page.tsx` | 523 | Auth/demo entry, demo accounts present |
| `/onboarding` | `src/app/(auth)/onboarding/page.tsx` | 469 | Auth/new-user critical, complex |
| `/transactions` | `src/app/(app)/transactions/page.tsx` | 54 | Economy support |
| `/inventory` | `src/app/(app)/inventory/page.tsx` | 171 | Engagement/economy support |
| `/rankings` | `src/app/(app)/rankings/page.tsx` | 61 | Discovery/support, current Slice 284 concern |
| `/compare` | `src/app/(app)/compare/page.tsx` | 305 | Analysis support, likely under-tested |
| `/founding` | `src/app/(app)/founding/page.tsx` | 427 | Monetization support |
| `/airdrop` | `src/app/(app)/airdrop/page.tsx` | 285 | Campaign/support |
| `/profile/[handle]` | `src/app/(app)/profile/[handle]/page.tsx` | 138 | Public profile support |
| `/welcome` | `src/app/welcome/page.tsx` | 311 | Marketing/public |
| `/pitch` | `src/app/pitch/page.tsx` | 458 | Marketing/public |
| `/club` | `src/app/(app)/club/page.tsx` | 6 | Redirect |
| `/auth/callback` | `src/app/auth/callback/page.tsx` | 66 | Auth plumbing |
| `/blocked` | `src/app/blocked/page.tsx` | 24 | Geo/legal support |
| `/club/[slug]/admin` | `src/app/(app)/club/[slug]/admin/page.tsx` | 16 | Club admin/security |
| `/bescout-admin` | `src/app/(app)/bescout-admin/page.tsx` | 12 | Platform admin/security |
| `/impressum` | `src/app/impressum/page.tsx` | 62 | Legal |
| `/datenschutz` | `src/app/datenschutz/page.tsx` | 71 | Legal |
| `/agb` | `src/app/agb/page.tsx` | 67 | Legal |

### 3.2 Demo-Reife-Audit-Reihenfolge

Nicht alle 30 Pages gleichzeitig anfassen. Reihenfolge nach Vorführwert:

#### Phase A — Core Demo Path
1. `/market`
2. `/player/[id]`
3. `/` Home
4. `/clubs`
5. `/club/[slug]`
6. `/fantasy`
7. `/manager`
8. `/community`

#### Phase B — Auth / Account / Engagement
9. `/missions`
10. `/profile`
11. `/profile/settings`
12. `/login`
13. `/onboarding`
14. `/transactions`
15. `/inventory`
16. `/founding`
17. `/airdrop`

#### Phase C — Discovery / Public / Support
18. `/rankings`
19. `/compare`
20. `/profile/[handle]`
21. `/welcome`
22. `/pitch`
23. `/auth/callback`
24. `/blocked`
25. `/club` redirect

#### Phase D — Admin / Legal
26. `/club/[slug]/admin`
27. `/bescout-admin`
28. `/impressum`
29. `/datenschutz`
30. `/agb`

---

## 4. Page E2E Contract Template

Für jede Page wird künftig nicht zuerst Code geändert, sondern dieser Vertrag ausgefüllt:

```txt
Route:
Primary user job:
Demo relevance: P0/P1/P2
Auth/Geo/Compliance gates:
Primary data sources:
Primary mutations:
Query keys / cache ownership:
Main components:
Loading states:
Empty states:
Error states:
Mobile state:
Source-of-truth owner:
Known bridge/debt:
Tests:
E2E status:
Demo status: GREEN/YELLOW/RED
Decision: keep / stabilize / hide / defer / delete-candidate
```

### Statusdefinition

- GREEN: vorführfähig, Datenquelle eindeutig, Loading/Error/Empty vorhanden, keine bekannten P0/P1 Journey-Brüche.
- YELLOW: funktioniert teilweise, aber Quelle/State/UX/Tests nicht vertrauenswürdig genug.
- RED: nicht vorführen; bricht, verwirrt oder widerspricht Produktversprechen.

---

## 5. Component / Service Taxonomy

Jede relevante Datei wird klassifiziert, bevor sie refactored oder gelöscht wird.

| Klasse | Bedeutung | Regeln |
|---|---|---|
| CANONICAL_SOURCE | besitzt Business-/Datenlogik | darf Supabase/RPC nutzen; braucht Tests/Mapper |
| QUERY_FACADE | React Query keys, cache, staleTime, invalidation | Komponenten sollen bevorzugt hierüber lesen |
| FEATURE_CONTAINER | orchestriert eine Page/Feature | darf Query/Mutation Hooks nutzen, keine rohe Supabase-Logik |
| UI_PURE | Props rein, UI/Event raus | keine Supabase-/Service-Imports |
| BRIDGE | temporäre Re-export-Kompatibilität | keine neue Logik, keine neuen Imports erlauben |
| SIDE_EFFECT_SERVICE | Notifications, Missions, Activity, Analytics | keine unsichtbaren Fire-and-forget-Ketten ohne Logging |
| TEST_ARTIFACT | Tests/Mocks/Fixtures | als behavioral/contract/placeholder/skipped klassifizieren |
| DEAD? | keine sichtbare Nutzung | Hypothese, keine Löschfreigabe |
| DEPRECATED | bewusst behalten, aber nicht erweitern | späterer Cleanup-Slice |

---

## 6. Erste Source-of-Truth-Befunde

### 6.1 Fantasy Bridge Layer

Bridge-/Kompatibilitätsdateien:

- `src/lib/services/fixtures.ts`
- `src/lib/services/lineups.ts`
- `src/lib/services/fantasyLeagues.ts`
- `src/lib/services/scoring.ts`
- `src/lib/services/events.ts`
- `src/lib/services/predictions.ts`
- `src/lib/services/wildcards.ts`

Befund:
Diese Dateien wirken wie alte Importpfade, während die Implementierung in `src/features/fantasy/services/*` liegt.

Regel:
- behalten bis Migration abgeschlossen,
- aber als BRIDGE markieren,
- keine neue Logik dort,
- neue Imports sollen auf Feature-Service oder Query-Facade zeigen.

### 6.2 Direct Data Access in Komponenten

Beispiel:
- `src/components/rankings/PlayerRankings.tsx` importiert Supabase direkt.

Risiko:
- Komponente wird Datenautorität.
- Query/cache/invalidation wird uneinheitlich.
- Source-of-truth wird unklar.

Ziel:
- Data access in Service/Query-Hook ziehen.
- Component wird UI_PURE oder FEATURE_CONTAINER.

### 6.3 Pages als Mini-Orchestratoren

Beispiele:
- `src/app/(app)/missions/page.tsx` importiert mehrere Services direkt.
- `src/app/(app)/clubs/page.tsx` hat viele direkte Service-/Hook-Abhängigkeiten.

Regel:
Pages sollen möglichst Container laden und nicht selbst breite Domain-Orchestrierung machen.

---

## 7. Test Confidence Befund

Testbestand ist nicht wertlos, aber Confidence ist ungleich verteilt.

Gefundene Muster:

- Placeholder-Tests mit `expect(true).toBe(true)`
- skipped tests für nicht implementierte Features
- stark mock-lastige Tests
- gute Service-Tests, aber schwächere Query-/Page-Verträge

Künftige Test-Klassen:

| Testklasse | Zählt als Vertrauen? | Beispiel |
|---|---|---|
| Behavioral | ja | User-Flow/Komponente macht echtes Verhalten |
| Regression | ja | schützt gefixten Bug |
| Contract | ja | Source-of-truth/Mapper/API-Vertrag |
| Placeholder | nein | `expect(true).toBe(true)` |
| Skipped | nein | `it.skip` |
| Legacy Mock Bridge | bedingt | nur als Migrationseinordnung |

Regel:
Testzahlen nie mehr als Produktvertrauen reporten, ohne Placeholder/Skipped zu nennen.

---

## 8. Bekannte Pattern-Schulden

### 8.1 Native Confirm

Noch vorhandene native `confirm()`-Stellen:

- `src/components/fantasy/LeaguesSection.tsx`
- `src/app/(app)/bescout-admin/AdminSponsorsTab.tsx`
- `src/app/(app)/bescout-admin/AdminCSVImportTab.tsx`

Ziel:
- auf `AlertDialog` / project confirm pattern migrieren.

### 8.2 Dynamic Imports als Side-Effect-Brücke

Einige dynamic imports sind legitim, andere wirken wie Cycle-/Side-Effect-Brücken.

Klassifikation nötig:
- legit bundle split
- test hoisting
- cycle breaker
- fire-and-forget side effect

Side Effects sollen langfristig in explizite, typisierte Dispatcher.

### 8.3 Unsafe Casts / `any`

Viele Casts sind Tests/Supabase-Join-Workarounds. Kritisch sind Production-Model-Casts ohne Mapper/Decoder.

Regel:
- Supabase rows über Mapper normalisieren.
- Production `as unknown as ...` priorisiert auditieren.

---

## 9. Demo Path Lock

BeScout wird vorführfähig, wenn dieser Pfad GREEN ist:

1. Welcome/Login: User versteht, was BeScout ist.
2. Home: User sieht klar, was heute wichtig ist.
3. Market: User findet Scout Cards und versteht Preis/Status.
4. Player Detail: User versteht den Spieler, Performance, Card, Aktion.
5. Buy/Sell/Portfolio: Transaktion und Bestand sind konsistent.
6. Manager: Bestand/Wert/P&L stimmen mit Market überein.
7. Fantasy: Spieltag/Lineup/Score sind verständlich und nicht widersprüchlich.
8. Club: Club-Kontext erklärt warum diese Plattform für Fans/Clubs existiert.
9. Profile: User sieht seinen Fußball-CV/Reputation.

Alles außerhalb dieses Pfads wird nicht gelöscht, aber nicht als erstes perfektioniert.

---

## 10. Konkrete Stabilization Roadmap

### Slice S0 — Product Truth Freeze

Ziel:
Eine aktuelle Produktwahrheit herstellen.

Aufgaben:
- README als veraltet markieren oder ersetzen.
- alte Sakaryaspor-Pilot-Aussagen historisieren.
- aktuelle 7-Ligen-Wahrheit prominent machen.
- Journey-Status-Schema einführen: wired / production-data stable / beta-user validated.

Output:
- `memory/current-product-truth.md` oder `worklog/audits/current-product-truth-YYYY-MM-DD.md`
- keine Runtime-Änderung

### Slice S1 — Page Contract Audit: Market + Player

Ziel:
Die wichtigste Demo-Kette abschließen.

Pages:
- `/market`
- `/player/[id]`

Prüfen:
- Datenquellen
- Query keys
- Buy/Sell/Offer source of truth
- Loading/Error/Empty
- Mobile
- Compliance wording
- Tests wirklich behavioral?

Output:
- Page Contract Reports
- konkrete Fix-Slices, nicht direkt Big Refactor

### Slice S2 — Page Contract Audit: Home + Manager

Ziel:
Market/Portfolio/Manager-Vertrauen herstellen.

Pages:
- `/`
- `/manager`

Besonders:
- Market vs Manager Werte/P&L konsistent
- Home zeigt nicht stale oder widersprüchliche Stories
- Manager ist nicht nur dynamisch nachgeladen, sondern klar erklärt

### Slice S3 — Page Contract Audit: Fantasy + Club

Ziel:
Spieltag/Fantasy/Club-Kontext stabilisieren.

Pages:
- `/fantasy`
- `/clubs`
- `/club/[slug]`

Besonders:
- Fixture lifecycle
- ghost fixtures/scores
- league-scope
- lineups/scoring
- Club page data truth

### Slice S4 — Source-of-Truth Boundaries

Ziel:
Import-/Layer-Grenzen definieren.

Aufgaben:
- BRIDGE-Liste finalisieren.
- neue Imports auf Bridge-Pfade verhindern.
- erste Komponente mit direktem Supabase-Zugriff in Query-Facade verschieben.
- kein massenhaftes Löschen.

### Slice S5 — Test Confidence Audit

Ziel:
Testgrün wieder aussagekräftig machen.

Aufgaben:
- Placeholder/skipped tests erfassen.
- Top-10 placeholder tests entweder real machen oder quarantinen.
- Query-Hook-Verträge für Demo-Pfad ergänzen.

### Slice S6 — Dead Artifact Inventory

Ziel:
Löschkandidaten beweisbar machen.

Aufgaben:
- Import graph
- dynamic refs
- route refs
- tests
- runtime path
- Status: KEEP / BRIDGE / DEPRECATED / DEAD?

Wichtig:
DEAD? ist keine Löschfreigabe. Löschen nur mit RED/GREEN Removal-Proof.

---

## 11. Anti-Kreis-Regeln

Diese Regeln verhindern, dass wir weiter rotieren:

1. Kein neues Feature, solange Slice 284 P0/P1 Core-Domain-Bugs offen sind.
2. Keine Page optisch polieren, bevor ihr Page Contract GREEN/YELLOW/RED eingestuft ist.
3. Keine Datei löschen, nur weil sie ungenutzt wirkt.
4. Keine Testanzahl als Vertrauen reporten, solange Placeholder/Skipped nicht getrennt sind.
5. Keine neuen Imports auf Bridge-Services.
6. Keine Komponenten mit direktem Supabase-Zugriff neu bauen.
7. Keine Sommer-Roadmap, bevor Demo Path Lock mindestens bis Manager/Fantasy YELLOW/GREEN ist.
8. Jede Stabilisierung endet mit einem kleinen Proof: Focused test, type-check oder E2E/smoke je nach Scope.

---

## 12. Nächster sicherer Schritt

Da Claude aktuell an Slice 284 arbeitet:

1. Claude Slice 284 abschließen lassen.
2. Danach keinen neuen Feature-Slice starten.
3. Start mit Slice S0: Product Truth Freeze.
4. Danach S1: Market + Player Page Contract Audit.

Dieses Audit kann als Steuerungsdokument für die nächsten 2-3 Wochen genutzt werden.

---

## 13. Kurzurteil

BeScout hat eine gute Substanz und eine starke Produktidee. Das Problem ist nicht mangelnder Umfang, sondern zu wenig Kuratierung und zu viele halboffene Source-of-Truth-Schichten.

Vorführfähigkeit entsteht jetzt durch Reduktion von Unsicherheit:

- eine Produktwahrheit,
- ein Demo-Pfad,
- eindeutige Datenquellen,
- Page-Verträge,
- kleine Stabilisierungsslices,
- kein weiterer Feature-Ausbau bis Kernvertrauen hergestellt ist.

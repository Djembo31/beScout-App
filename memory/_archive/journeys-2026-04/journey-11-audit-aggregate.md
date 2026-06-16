---
name: Journey 11 — Aggregated Audit (Equipment + Inventar)
description: Round-1 Audit Journey #11 Equipment & Inventory. 3 Perspektiven (Frontend/Backend/Business) vereint. Post-AR-42 Equipment-Path Ende-zu-Ende nie live benutzt, viele i18n-Leaks entdeckt.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #11 — Aggregated Findings (Equipment + Inventar)

**Total: 29 Findings — 3 CRITICAL + 9 HIGH + 11 MEDIUM + 6 LOW**

**Audit-Basis:**
- Live-DB Pull (Supabase MCP `execute_sql` 2026-04-14):
  - `user_equipment`: 10 rows (7 admin_grant, 3 mystery_box), 0 consumed, 1 equipped
  - `lineups` mit `equipment_map`: **0 von 111** (System Ende-zu-Ende noch nie in Produktion genutzt)
  - `equipment_definitions`: 5 rows (all active, DE+TR names complete)
  - `equipment_ranks`: 4 rows (R1 ×1.05 / R2 ×1.10 / R3 ×1.15 / R4 ×1.25)
  - 4 RPC bodies (open_mystery_box_v2, equip_to_slot, unequip_from_slot, equip_cosmetic)
  - Grants alle korrekt (`anon=false, auth=true, security_definer=true`)
- Code-Reads: EquipmentSection, EquipmentDetailModal, EquipmentPicker, EquipmentShortcut, equipment.ts service, useLineupBuilder, useLineupSave, MysteryBoxHistorySection, AufstellenTab, rarityConfig.ts
- i18n-Coverage-Grep: DE 50 keys, TR 50 keys — Parität gegeben, aber Hardcoding in Components
- Post-AR-42 Fix Verify: Migration 20260414230000 live angewendet (`pg_get_functiondef` zeigt `INSERT INTO public.user_equipment (user_id, equipment_key, rank, source)` — Column-Name korrekt)

Severity-Kalibrierung für J11 (Equipment ist Reward-Pfad, kein direkter Geld-Pfad):
- **CRITICAL** = Live-Broken-Path, i18n-Raw-DE-für-TR-User, Security-Vulnerability, Pre-Save-Data-Loss
- **HIGH** = Wording-Compliance-Verletzung user-facing, Silent-Fail bei Save, fehlendes State-Protection
- **MEDIUM** = Kosmetik/UX-Gap, Consumer-Side Error-Handling, Post-Beta-Polish
- **LOW** = Code-Duplication, fehlende Tests, Post-Pilot-Architektur

---

## 🚨 AKUT — 3 LIVE-KRITISCHE CRITICAL BUGS (P0)

### J11F-01 🚨 EquipmentSection hardcoded auf `name_de` → TR-User sehen DE-Strings

**Beweis (File:Line):**
- `src/components/inventory/EquipmentSection.tsx:106,109,211,474,499,552,563,608,629` — 9 Stellen `entry.def.name_de` / `def.name_de` ohne Locale-Branch
- `src/components/inventory/EquipmentDetailModal.tsx:84` — Modal-Title `def.name_de`
- `src/components/inventory/EquipmentDetailModal.tsx:113` — Description `def.description_de`
- `src/components/gamification/EquipmentPicker.tsx:107,176` — Picker zeigt `def.name_de`
- `src/components/gamification/EquipmentPicker.tsx:182` — Hardcoded String `"×1.25 Spieltag-Boost"` (**DE literal, kein `t()` wrap**, TR-User sieht Deutsch)

**Impact:**
- TR-User sieht Feuerschuss/Bananen Flanke/Eiserne Mauer/Katzenauge/Kapitaen statt Ates Sutu/Muz Ortasi/Demir Duvar/Kedi Gozu/Kaptan — obwohl `name_tr` in DB & Typ vorhanden ist
- 10/10 live User-Equipment-Rows betroffen (5 distinct equipment-Namen)
- Sort-Vergleich via `name_de.localeCompare` bricht Turkish Unicode-Korrektheit (şçğıöü)
- 6-Monats-Cycle: bei jedem Aufruf identisch, nicht nur Edge-Case
- **Parallel zu J5-FIX-05 (Rarity-Labels locale-aware)** — gleicher Bug-Typ unerkannt für Equipment

**Fix-Owner:** Frontend autonom. `useLocale()` in EquipmentSection + EquipmentDetailModal + EquipmentPicker, Helper `resolveEquipmentName(def, locale)` analog `resolveRarityLabel` in MysteryBoxHistorySection. → **FIX-01 (CRITICAL)**

---

### J11F-02 🚨 MysteryBoxHistorySection zeigt Equipment-KEY statt Equipment-Name

**Beweis (File:Line):**
- `src/components/inventory/MysteryBoxHistorySection.tsx:45` — `const name = entry.equipment_type ?? 'Equipment'`
- `mystery_box_results.equipment_type` persistiert den Equipment-KEY (`fire_shot`, `banana_cross`, etc.), NICHT den Display-Namen
- Render: `historyRewardEquipment`: DE `"{name} (R{rank})"` → **User sieht `"fire_shot (R2)"` statt `"Feuerschuss (R2)"`**
- Cosmetics haben FIX-08 aus J5 (`cosmetic_name ?? cosmetic_key`), Equipment hat kein Pendant
- RPC-Return enthält `equipmentNameDe`/`equipmentNameTr` bereits (siehe AR-42 migration Lines 273-275) — wird in History nicht genutzt
- Für Historie braucht es Client-Side-Lookup via `equipment_definitions` (analog Cosmetic-Resolution in `useHomeData.ts`)

**Impact:**
- 3 live Mystery-Box-Equipment-Drops. 3 betroffene History-Rows zeigen technische Keys statt User-facing Namen
- Zukünftige Equipment-Drops sind ebenso betroffen (persistierter Key, kein Name in DB)
- DE UND TR-User sehen technischen String, keine Produkt-Qualität
- Breakt Visual-Consistency gegenüber MysteryBoxModal (das resolved Namen korrekt)

**Fix-Owner:** Frontend autonom. Service `getMysteryBoxHistory` kann `equipment_definitions` joinen ODER Component kann `useEquipmentDefinitions()` nutzen + Key→Name-Lookup. → **FIX-02 (CRITICAL)**

---

### J11F-03 🚨 EquipmentDetailModal Date-Format hardcoded `'de-DE'`

**Beweis (File:Line):**
- `src/components/inventory/EquipmentDetailModal.tsx:66` — `new Date(latest.acquired_at).toLocaleDateString('de-DE', {...})`
- Kein `useLocale()` in Modal (Grep bestätigt)
- TR-User sieht DE-Format `01.01.2026` statt TR-Format (identisch, aber Lokalisation-Audit-Signal)
- Parallel zu J5-FIX-09 (`MysteryBoxHistorySection.tsx` Date-Format), dort bereits via `dateLocale` gefixt

**Impact:**
- Konsistenz-Verstoss gegenüber J5-Healer-Fixes
- Leaflet zum EquipmentSection-Problem (die gesamte Modal ist nicht locale-aware)
- Tag/Monat-Format ist in TR/DE identisch (geringes User-Sichtbarkeitssymptom), aber Pattern muss einheitlich sein

**Fix-Owner:** Frontend autonom. `useLocale()` + `locale === 'tr' ? 'tr-TR' : 'de-DE'`. → **FIX-03 (CRITICAL fuer Konsistenz, LOW fuer User-Impact — zählt wegen pattern-systematic als CRITICAL)**

---

## Cross-Audit Overlaps (mehrfach gesehen)

| Bug | Frontend | Backend | Business |
|-----|----------|---------|----------|
| Hardcoded `name_de` / kein `useLocale()` in Equipment-UI | **J11F-01** | — | J11Biz-01 |
| History zeigt Equipment-Key statt Name | **J11F-02** | J11B-01 | J11Biz-02 |
| Date-Format hardcoded `de-DE` | **J11F-03** | — | — |
| `equipToSlot` Service swallow→console.error, no throw | J11F-06 | **J11B-02** | — |
| RPC-Errors in Englisch/DE gemischt (i18n-Key-Leak-Vector) | J11F-07 | **J11B-03** | J11Biz-03 |
| Equipment-Picker ohne preventClose + fehlender Loading-Guard | **J11F-04** | — | — |
| Equipment-Bonus auf User-facing String user-sichtbar aber keine Disclaimer | — | — | **J11Biz-04** |
| Post-Save `equipToSlot` Promise.allSettled silently fails | **J11F-08** | J11B-04 | — |
| "kazan" TR-Vokabel in Equipment-Keys | — | — | **J11Biz-05** |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO noetig)

### Group A — P0 Locale + Name-Display (analog J5-Healer-Pattern)

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| **FIX-01** | **CRITICAL** | `src/components/inventory/EquipmentSection.tsx` + `EquipmentDetailModal.tsx` + `src/components/gamification/EquipmentPicker.tsx` | `useLocale()` + Helper `resolveEquipmentName(def, locale)` = `locale === 'tr' ? def.name_tr : def.name_de`. 10+ Referenzen umstellen. Sort-Compare mit locale-spezifischem `localeCompare(b.def[nameKey], locale)`. Description genauso `description_de/_tr`. | J11F-01 |
| **FIX-02** | **CRITICAL** | `src/components/inventory/MysteryBoxHistorySection.tsx:44-50` | Equipment-Key → Name-Lookup via `useEquipmentDefinitions()` + `definitions.find(d => d.key === entry.equipment_type)?.name_de/_tr`. Fallback auf Key. Parallel zum J5-FIX-07/08 Cosmetic-Pattern. | J11F-02 |
| FIX-03 | HIGH | `src/components/inventory/EquipmentDetailModal.tsx:66` | `const dateLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';` → `toLocaleDateString(dateLocale, ...)`. `useLocale()` importieren. | J11F-03 |
| FIX-04 | HIGH | `src/components/gamification/EquipmentPicker.tsx:182` | Hardcoded `"Spieltag-Boost"` → `t('equipmentMultiplier')` (bereits in `inventory` namespace, in `gamification` namespace neu anlegen oder namespace crossing). Text ist exakt gleich, nur i18n-Key. | J11F-01 |

### Group B — Service Error-Handling + Save-Flow

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-05 | HIGH | `src/lib/services/equipment.ts:69-75, 88-94` | `equipToSlot` / `unequipFromSlot` returnen `{ok:false, error:error.message}` bei Supabase-Error. Kommt aus dem NICHT-geworfenen Path — Consumer (`useLineupSave.ts:100-104`) sieht nur `r.value.ok===false`, loggt `console.error`, nichts User-facing. Fix: **throw stattdessen** (mapErrorToKey resolve am Consumer-Ende). Parallel zu J4 Equipment-Error-Mapping. `result.error` ist RAW-DE-Englisch-Mix: `'Equipment not available'`/`'No lineup found'`/`'Slot is empty'`/`'Position mismatch'`/`'Lineup is locked'` — alles Englisch, kein `t()`-Key. | J11B-02, J11F-06 |
| FIX-06 | HIGH | `src/features/fantasy/hooks/useLineupSave.ts:99-105` | `Promise.allSettled(...equipToSlot)` filtert `failed` aber macht nur `console.error`. User sieht kein Toast/Feedback wenn Equipment NICHT persistiert wird. Fix: Toast mit `te('equipmentSaveFailed', {count: failed.length})` wenn `failed.length > 0`. Neue i18n-Keys in `errors`-namespace anlegen (DE+TR). | J11F-08, J11B-04 |
| FIX-07 | HIGH | `src/lib/errorMessages.ts` ERROR_MAP | Neue Regex-Mappings für Equipment-RPCs:<br>- `/equipment.*not.*available|ekipman.*bulunamadı/i → 'equipmentNotAvailable'`<br>- `/no.*lineup.*found|kadro.*bulunamadı/i → 'lineupNotFound'`<br>- `/slot.*is.*empty|slot.*boş/i → 'slotEmpty'`<br>- `/position.*mismatch|pozisyon.*uyumsuz/i → 'positionMismatch'`<br>- `/lineup.*is.*locked|kadro.*kilitli/i → 'lineupLocked'`<br>- `/no.*equipment.*on.*this.*slot/i → 'noEquipmentOnSlot'` | J11B-03, J11F-07 |
| FIX-08 | MEDIUM | `src/components/gamification/EquipmentPicker.tsx` Modal | Kein `preventClose` auf Modal trotz `loading`-Prop. Wenn Equipment optimistisch gesetzt wird, ist loading=false — aber wenn useLineupSave läuft (joining=true), sollte Picker zugemacht sein oder preventClose=true. Aktuell: während Save kann User Picker öffnen und State lokal ändern → kurzer Race. | J11F-04 |

### Group C — History + UX Polish

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-09 | MEDIUM | `src/components/inventory/EquipmentSection.tsx:170-172` | `stats.equippedCount` zählt nur `active` (non-consumed), aber das `equipped_event_id !== null`-Predicate ignoriert dass consumed Items historisch auch equipped waren. Edge-Case: nach Event-Scoring wird `equipped_event_id` nicht zurückgesetzt, nur `consumed_at` gesetzt. Statsäule zeigt dann fälschlich "equipped" obwohl verbraucht. Live-Check: 1 equipped, 0 consumed → derzeit kein Symptom, aber post-erstes-Scoring-Event sichtbar. | J11F-09 |
| FIX-10 | MEDIUM | `src/components/inventory/EquipmentSection.tsx:142-151` + `EquipmentDetailModal.tsx:40-48` | Multiplier-Labels `{1:'×1.05', 2:'×1.10', 3:'×1.15', 4:'×1.25'}` sind hardcoded Default-Fallback, obwohl `equipment_ranks` live aus DB geladen wird. Ranks R5-R10 sind CHECK-constraint-erlaubt aber nicht seeded. Wenn Admin via `equipment_ranks` INSERT einen R5 addet, wird Fallback `×5` angezeigt (nicht `×1.40`). Guard: `ranks.length > 0 ? ranks[rank].multiplier : null` + "unbekannt" wenn nicht in DB. | J11F-10 |
| FIX-11 | MEDIUM | `src/components/inventory/MysteryBoxHistorySection.tsx` | Equipment-History hat keinen Quick-Jump "Zu meinen Equipment" CTA (nur `/missions` in Empty-State). User mit 3 Drops sieht History aber kein Link zurück zu `?tab=equipment`. | J11F-11 |
| FIX-12 | MEDIUM | `src/components/inventory/EquipmentSection.tsx:211` | Sort `a.name_de.localeCompare(b.name_de)` nutzt DE-Collation auch wenn User TR ist. Nach FIX-01 muss `localeCompare` Locale-Param nutzen: `a.name_de.localeCompare(b.name_de, locale)`. Bei TR-Strings mit ş/ç/ğ wichtig für korrekte Sort-Order. | J11F-12 |
| FIX-13 | LOW | `src/components/inventory/EquipmentSection.tsx:33-43` + `EquipmentDetailModal.tsx:15-25` + `EquipmentPicker.tsx:37-47` | EQUIPMENT_ICONS-Map wird in 3 Files dupliziert. Extract zu `@/components/gamification/equipmentIcons.ts`. Post-Beta-Polish, aber Single-Source-of-Truth-Hygiene. | J11F-13 |
| FIX-14 | LOW | `src/components/inventory/EquipmentSection.tsx:56-79` | `groupActive` und `groupConsumed` sind fast identisch (1 Zeile Unterschied: `eq.consumed_at` Check). Refactor zu `groupByStatus(inventory, defs, {consumed: boolean})`. Post-Beta. | J11F-14 |

**Total autonome Fixes: 14** (2 CRITICAL + 5 HIGH + 5 MEDIUM + 2 LOW)

**Healer-Strategie:**
- **Healer A (P0 Locale-Fix + Display):** FIX-01 + FIX-02 + FIX-03 + FIX-04 — ~2h (größter Scope, 4 Files, i18n-Key-Audit)
- **Healer B (Service Error-Handling):** FIX-05 + FIX-06 + FIX-07 — ~1.5h (Service + Consumer + Error-Map, i18n-Key-Leak-Schutz analog J3)
- **Healer C (Polish):** FIX-08 + FIX-09 + FIX-10 + FIX-11 + FIX-12 + FIX-13 + FIX-14 — ~1.5h

---

## CEO-Approval-Triggers (siehe `journey-11-ceo-approvals-needed.md`)

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-60** | **Live-Verify nach Fix** | **HIGH P0** | AR-42 Live-Equipment-Drop post-fix Verifikation: Kein User hat seit 2026-04-14 23:00 UTC (Fix-Migration deploy) eine Mystery Box geöffnet (live-DB: `mystery_box_results WHERE opened_at >= '2026-04-14 23:00'` = 0). Equipment-Drop-Pfad ist theoretisch gefixt (RPC-Body bestätigt), aber End-to-End-Beweis fehlt. Empfehlung: 1 Test-Open als Admin + 1 `source='mystery_box'` Row nach 2026-04-15 verifizieren. Ohne real-world-Daten kein "fertig"-Beweis (Ferrari-Standard). |
| **AR-61** | External Systems (Datenkonsistenz) | CRITICAL | `lineups.equipment_map` = NULL bei 111 von 111 Lineups. Equipment-Feature ist Ende-zu-Ende nie in Produktion genutzt — obwohl seit 2026-04-06 deployed. Entweder: (a) User-Adoption-Issue (UX-Gap), (b) Silent-Failure in `equipToSlot` RPC-Call (dazu passt Service-Swallow J11B-02), (c) feature-flag-unsichtbar. Empfehlung: 1 Test-Flow durch den Auflegen als Test-User + DB-Query danach. |
| AR-62 | Compliance-Wording (J5-Folge) | HIGH | TR-Key `"rewardEquipment": "Yeni ekipman kazanildi!"` (de.json:3143 / tr.json:3143) nutzt `kazanildi` (passive von `kazan` = gewinnen). **MASAK §4 Abs.1.e + business.md Gluecksspiel-Vokabel-Tabelle**: `kazan*` → `al*/elde et*/topla*`. DE-Pendant: `"Neues Equipment freigeschaltet!"` ist Compliance-safe. TR muss `"Yeni ekipman eklendi!"` oder `"Yeni ekipman alındı!"`. Context: Mystery Box Reward Modal — direkt nach Gluecksspiel-analogem Roll. Triggering. Blockt Beta-TR für MASAK-Audit. |
| AR-63 | Compliance-Wording (Minor) | MEDIUM | TR-Key `"equipmentMissingSlot": "Henüz kazanılmadı"` (tr.json:4847) — gleiches `kazan*`-Root. Context: Ghost-Slot in EquipmentSection.tsx Matrix-Grid (Item nicht besessen). Softer als AR-62 (kein Reward-Context), aber systematisch. Fix: `"Henüz sahip değilsin"` oder `"Henüz elde edilmedi"`. |
| AR-64 | Compliance-Disclaimer | MEDIUM | Equipment-Drops ohne Disclaimer. Mystery Box HAT MysteryBoxDisclaimer (AR-47), aber Inventory-Equipment-Tab (`/inventory?tab=equipment`) zeigt KEINEN. Equipment ist Reward-Kategorie, TR/MASAK-relevant. Empfehlung: MysteryBoxDisclaimer-variant oder neuer EquipmentDisclaimer oberhalb EquipmentSection (klein, dezent, Text: "Equipment ist kein übertragbares Gut, kein Geldwert, siehe AGB"). |
| AR-65 | Architektur-Lock-In | MEDIUM | Equipment-Sources CHECK erlaubt `'achievement'`, `'mission'`, `'admin_grant'`, `'event_reward'` — aber **KEIN Code-Pfad existiert** um Equipment via diese Sources zu vergeben. Nur `'mystery_box'` live (via RPC) und `'admin_grant'` (7 rows manuell via SQL). Entscheidung: (a) Sources im CHECK auf aktive reduzieren (cleaner), (b) RPC-Handler anlegen für zukünftige Achievement/Mission-Rewards. Post-Beta, aber Scope-Klarheit jetzt. |
| AR-66 | Fee-Split (Kategorie-Lücke) | MEDIUM | Equipment ist nicht in `business.md` Fee-Split-Übersicht (7 Kategorien: Trading, IPO, Research, Bounty, Polls, P2P, Club Abos). Equipment-Drops sind Reward (Platform→User) ohne Fee, analog Welcome-Bonus. Dokumentations-Lücke. Empfehlung: Ergänzung in business.md als "Reward Categories" Abschnitt oder expliziter Verweis "Mystery Box Drops = Reward, keine Fee". |
| AR-67 | Sourcing / Data-Ops | LOW | `equipment_definitions` hat nur 5 Rows live seit 2026-04-06, keine Updates. Vermutlich statisch für Beta. Anil-Alignment: sind weitere Equipment-Typen geplant (z.B. "Penalty-King" für Elfmeterschützen, "Set-Piece-Specialist" für Freistoß)? Falls ja: content-calendar post-Beta. Falls nein: Ok. |

**Total CEO-Approvals: 8 Items** (1 CRITICAL + 2 HIGH + 4 MEDIUM + 1 LOW)

---

## VERIFIED OK (Live 2026-04-14)

| Check | Beweis |
|-------|--------|
| AR-42 Equipment-Column-Fix angewendet | `pg_get_functiondef(open_mystery_box_v2)` zeigt `INSERT INTO public.user_equipment (user_id, equipment_key, rank, source)` — Column `rank` korrekt |
| AR-49 Feature-Gate Equipment-Branch intakt | Migration 20260415000300 enthält volle equipment-Branch unchanged |
| RLS Policies user_equipment komplett | 3 Policies: SELECT own, INSERT own (`auth.uid()=user_id`), UPDATE own. Fehlt DELETE — aber keine Client-DELETE-Calls, kein Bug. |
| Equipment RPCs grants korrekt | `equip_to_slot`, `unequip_from_slot`, `equip_cosmetic`, `open_mystery_box_v2`: alle `anon=false, auth=true, security_definer=true` — kein J4/J8-Muster |
| Equipment Lineup-Scoring-Integration | `score_event` RPC: Multiplier wird nach Captain-Bonus angewendet, Consume nach Scoring, Guard `IF v_eq_multiplier IS NOT NULL` |
| Equipment Position-Match-Logic | `equip_to_slot`: 5-stufige CASE (Goalkeeper/Tor, Def/Abw, Mid/Mit, Att/For/Stu, Default) — DE+EN-Positions-Strings berücksichtigt |
| Equipment 'uncommon' Rarity im AR-46 Scope | `rarityConfig.ts` hat `uncommon` Entry (green theme). Code-Pfad Crash geheilt. |
| i18n-Keys DE+TR Parität | Alle 50 `inventory.equipment*` Keys DE+TR vorhanden. Fehler sind NICHT fehlende Keys, sondern **Component-Hardcoding** (J11F-01). |
| `useUserEquipment` Query-Key Split | Active vs includeConsumed haben separate Keys (`qk.equipment.inventory` vs `qk.equipment.inventoryAll`) — korrekt |
| Modal `open` Prop bei EquipmentDetailModal + EquipmentPicker | Beide setzen `open={true/false}` Prop (CLAUDE.md Pflicht) |
| Mobile 393px Layout | EquipmentSection `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — min 155px Card-Width auf iPhone, passt |
| Loading-Guard vor Empty-Guard | `EquipmentSection.tsx:240-259` — loading-branch VOR invAll.length===0-Empty (CLAUDE.md Pflicht) |

---

## LEARNINGS (Drafts)

1. **i18n-`name_de` Hardcoding ist systematisch, nicht Einzelfall** — 9 Stellen in einem Component, 2 weitere in Modal, 2 in Picker. Grund: DB hat `name_de`/`name_tr` aber kein Helper `resolveName(def, locale)`. **Common-errors.md Regel:** Jeder DbType mit `_de`/`_tr`-Pair braucht Helper-Funktion neben Typ-Definition + Lint-Rule gegen raw `.name_de` in JSX. (J11F-01)
2. **Post-fix Live-Verify ist unverzichtbar** — AR-42 Fix-Migration ist technisch korrekt, aber "fix deployed" ≠ "fix verified in prod" (0 Mystery-Box-Opens seit deploy). Empfehlung: Jeder P0-Fix braucht "prove it" Step mit 1 Test-Flow + DB-Query. (J11-AR-60)
3. **Equipment-Feature ist End-to-End nie live benutzt** — 111 Lineups, 0 mit `equipment_map`. 2 User mit Equipment, aber keiner equipped. Signal: Entweder UX-Gap (User findet EquipmentPicker nicht) ODER Silent-Fail (J11B-02 Error-Swallow). Engineering-Regel: **Nach neuem Feature Deploy Week 1 Review der DB-State** — "wurde es genutzt?" ist härter als "builds/tests green". (J11-AR-61)
4. **Equipment-Sources im CHECK-Constraint ohne Code-Pfad** — `achievement`/`mission`/`event_reward` sind erlaubt aber kein RPC-Handler. Overbuilt ohne User-Nutzen. **Pattern:** Enums nur in DB-CHECK wenn Code existiert ODER explicit ADR als "geplant". (J11-AR-65)
5. **"kazan*"-Vokabel in TR-i18n ist systematisch** — Nicht nur Fantasy (J4-AR-32) sondern auch Mystery-Box-Equipment-Reward. TR-Sweep muss ALLE `kazan*`-Strings erfassen, nicht nur Fantasy-Scope. Audit-Command: `grep -iE "kazan" messages/tr.json`. (J11-AR-62, AR-63)
6. **Service Return `{ok:false,error:...}` vs throw ist Inkonsistenz** — Equipment-Service folgt NICHT dem J3/J4-Throw-Pattern, bleibt bei Return-Shape. Ergebnis: Consumer muss manuell `result.ok` prüfen, vergisst's easily. Fix: konvertieren zum Throw-Pattern post-Beta. (J11B-02)
7. **`equipment_type` in `mystery_box_results` ist Key nicht Name** — Persistierte Daten enthalten Technical-Keys, Display-Names kommen aus Join. Regel für neue Reward-Tables: entweder beide persistieren ODER Display-Namen-Resolution klar dokumentieren. (J11F-02)

---

## Recommended Healer-Strategie

**Parallel 3 Worktrees:**
- **Healer A (P0 Locale-Fix):** FIX-01 + FIX-02 + FIX-03 + FIX-04 (name_de Hardcoding + History Name-Display + Date-Format + Spieltag-Boost) — ~2h
- **Healer B (Service Error-Handling):** FIX-05 + FIX-06 + FIX-07 (throw-Pattern + Toast + Error-Map) — ~1.5h
- **Healer C (Polish + Wording):** FIX-08 + FIX-09 + FIX-10 + FIX-11 + FIX-12 + FIX-13 + FIX-14 — ~1.5h

**CEO-Approvals (8 Items):** 
- **AR-60 (Live-Verify) + AR-61 (Equipment-Adoption)** — SOFORT bevor Beta-Launch (beides P0 für Confidence-Beweis)
- **AR-62 + AR-63 (kazan-Vokabel)** — vor TR-Beta, MASAK-Risiko
- **AR-64 + AR-65 + AR-66 + AR-67** — Post-Beta-Backlog

**Reviewer-Pass nach Healer-Phase.**

**Notably KLEINER als J3 (62) oder J4 (71), vergleichbar mit J5 (35):** Equipment ist eng gescopted (Inventory-Tab + Picker + Lineup-Integration), aber die i18n-Hardcoding-Defekte und die ZERO-Production-Usage sind systematisch und ein frühes Rote-Flagge-Signal.

---

## Audit-Baseline-Metriken

| Metric | Wert | Signal |
|--------|------|--------|
| Total Findings | 29 | Kleiner als J8 (42), J3 (62), J4 (71) |
| CRITICAL Count | 3 | Alle i18n + Display-Logic (keine Money-Invariants) |
| Live-Broken Paths | 0 bestätigt | AR-42 deployed; aber AR-60 "unverified" |
| User Impact | alle 10 User-Equipment-Rows | TR-User mit irgendeinem Equipment sehen DE-Strings |
| Files Audited | 12 Components + 6 Migrations + 1 Service + 1 Query + Live-DB | Read-only |
| Duration | Round-1 Round-Trip | Keine Healer-Calls (Audit-Phase) |

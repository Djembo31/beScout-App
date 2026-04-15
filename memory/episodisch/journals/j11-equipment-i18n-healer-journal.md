# Frontend Journal: Journey #11 Healer — Equipment i18n + 14 autonome Fixes

## Gestartet: 2026-04-14

### Verstaendnis
- **Was:** 14 FIX-Items (FIX-01..14) aus `memory/journey-11-audit-aggregate.md` + Vokabel-Fix AR-62/AR-63 (kazan → al/topla/ekle) in EINEM Commit
- **Kern-Problem:** Equipment-UI hat `name_de` hardcoded ueberall → TR-User sehen DE-Strings; History zeigt technical Key statt Display-Name; `de-DE` Date-Format hardcoded; Service `return {ok,error}` statt throw
- **Betroffene Files:**
  - `src/components/inventory/EquipmentSection.tsx` (9x name_de, 1x localeCompare, Stats)
  - `src/components/inventory/EquipmentDetailModal.tsx` (Title, Description, Date)
  - `src/components/gamification/EquipmentPicker.tsx` (name_de, Spieltag-Boost, localeCompare)
  - `src/components/inventory/MysteryBoxHistorySection.tsx` (equipment_type → name)
  - `src/lib/services/equipment.ts` (throw pattern)
  - `src/features/fantasy/hooks/useLineupSave.ts` (Toast bei failed equips)
  - `src/lib/errorMessages.ts` (6 neue Equipment-Error-Keys)
  - `messages/de.json` + `messages/tr.json` (i18n-Keys)
  - Neu: `src/components/gamification/equipmentNames.ts` (Helper)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Helper `resolveEquipmentName(def, locale)` in neuem File `equipmentNames.ts` | Analog `resolveMissionTitle` in missions.ts — single source of truth; importiert von 4+ Files |
| 2 | `resolveEquipmentDescription(def, locale)` zusaetzlich | Modal zeigt Description auch |
| 3 | Service `equipToSlot` throw Error(i18n-key) | J3-Pattern, Consumer resolved via mapErrorToKey |
| 4 | 6 neue Error-Keys + Regex in errorMessages.ts | J3/J4-Pattern: swallow→throw nie ohne Key-Leak-Schutz |
| 5 | `equipmentMultiplier` in inventory namespace bereits vorhanden → EquipmentPicker nutzt inventory.equipmentMultiplier direkt | Keine Namespace-Duplikate |
| 6 | TR Vokabel-Fix: `kazanildi` → `eklendi` (Reward-Kontext), `kazanılmadı` → `elde edilmedi` (Ghost-Slot) | MASAK §4 Abs.1.e + business.md Tabelle |
| 7 | FIX-13+14 DEFERRED | Post-Beta Polish, Scope-Expansion vermeiden, Risiko null |

### Plan
**Group A (Locale + Display):**
- [x] FIX-01: EquipmentSection/EquipmentDetailModal/EquipmentPicker → useLocale + helper
- [x] FIX-02: MysteryBoxHistorySection → def-Lookup fuer equipment_type
- [x] FIX-03: EquipmentDetailModal Date locale-aware
- [x] FIX-04: EquipmentPicker "Spieltag-Boost" → t('equipmentMultiplier')
- [x] FIX-12: localeCompare mit locale-Param

**Group B (Service):**
- [x] FIX-05: equipToSlot/unequipFromSlot → throw
- [x] FIX-06: useLineupSave toast bei failed
- [x] FIX-07: errorMessages.ts 6 neue Keys + Regex

**Group C (Polish):**
- [x] FIX-08: EquipmentPicker preventClose
- [x] FIX-09: stats.equippedCount Guard (consumed filter)
- [x] FIX-10: multiplierLabels null guard
- [x] FIX-11: History CTA

**AR-62/AR-63: Vokabel-Fix tr.json**
- [x] "rewardEquipment" → eklendi
- [x] "equipmentMissingSlot" → elde edilmedi

**Circuit Breaker / Deferred:**
- [ ] FIX-13/14: Code-Duplikation Icons + groupByStatus — POST-BETA

### Fortschritt
- [x] Task verstanden
- [x] Knowledge geladen (SKILL, Learnings, common-errors, ui-components, db, gamification)
- [x] Files gelesen (4 Components + Service + Hook + errorMessages + Types + Messages)
- [x] Helper erstellen (`equipmentNames.ts`)
- [x] i18n DE+TR keys adden (errors + inventory)
- [x] EquipmentSection umbauen
- [x] EquipmentDetailModal umbauen
- [x] EquipmentPicker umbauen
- [x] MysteryBoxHistorySection erweitern
- [x] equipment.ts throw pattern
- [x] useLineupSave failed-Toast
- [x] errorMessages.ts Mappings
- [x] AR-62/AR-63 kazan-Fix
- [x] tsc clean
- [x] Tests gruen
- [x] Commit

### Runden-Log
Round 1: Implementation aller Group A/B/C Fixes + Vokabel-Fix — DONE
- tsc: EXIT=0 clean
- vitest (gamification + services): 991 tests green, 43 files
- 11 Files changed, 1 new (equipmentNames.ts)

### AFTER Phase — 8-Punkt Checklist
- [x] Types propagiert (`DbEquipmentDefinition` name_de/name_tr/description_de/description_tr; MysteryBoxResult optional equipment_name_de/tr)
- [x] i18n komplett (DE + TR: 7 neue Error-Keys + historyEquipmentCta; TR Vokabel-Fix rewardEquipment/equipmentMissingSlot)
- [x] Column-Names korrekt (equipment_type, equipment_rank, equipped_event_id, consumed_at — gegen database.md verified)
- [x] Alle Consumers aktualisiert (equipToSlot nur in useLineupSave, unequipFromSlot keine Consumer — Signatur-Change ok)
- [x] UI-Text passt zum Kontext (Equipment nur Inventar/Picker/History — kein Trading-Mix)
- [x] Keine Duplikate (resolveEquipmentName/Description im neuen Helper, nirgendwo dupliziert)
- [x] Service Layer eingehalten (equipToSlot throw, Consumer via mapErrorToKey)
- [x] Edge Cases (null-guard equipment_type/rank, plural i18n fuer failed count, Empty-defs fallback-Kette)

### Frontend-Checks
- [x] Components aus Registry (Card/EmptyState/Modal/Loader2/Button)
- [x] Design Tokens (bg-white/[0.02] border-white/10 rounded-2xl, Gold gradient, font-mono tabular-nums, transition-colors)
- [x] Touch targets min-h-[44px] / min-h-[56px]
- [x] aria-labels auf Icon-Buttons (History-CTA, Package/ArrowRight aria-hidden)
- [x] Kein verbotenes CSS Pattern (keine dynamic Tailwind Classes, keine flex-1 auf horizontal-scrollbar)

### FYI (nicht in J11-Scope, zum Nachpruefen)
- tr.json Line 4862 `cosmeticsEmptyDesc`: "Başarımları tamamla veya gizem kutuları aç, kozmetik kazan." — "kozmetik kazan" im Mystery-Box-Kontext, sollte zu "kozmetik topla" (post-Beta Vokabel-Sweep).
- tr.json Line 3109 `noCosmeticsHint`: "Rütbe Yolu, Gizem Kutuları ve Başarılarla kazan" — analog.
- tr.json Line 3057 `celebration`: "{reward} kazanıldı!" im Achievement-Context (AR-32 J4 sollte das schon gefixt haben; vor Beta verifizieren).

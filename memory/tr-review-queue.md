---
name: TR-Review-Queue
description: Batch-Review-Queue für alle TR-Strings die von Agents/CTO geschrieben wurden. Anil reviewt am Session-Ende statt einzeln. Pattern aus Feedback feedback_tr_i18n_validation.md.
type: reference
---

# TR-Review-Queue

**Regel:** Jeder neue oder geänderte TR-String, den nicht Anil selbst geschrieben hat, wird hier angehängt. Anil reviewt batch am Session-Ende und approved/rejected.

## Format pro Entry

```
- [ ] <key> | "TR-String" | Context (File:Line oder Migration) | Author (agent-name oder CTO)
```

## Pending (zum Review)

### 2026-04-15 Session — Phase 3 + J6-J11

**Achievement-Definitions (Backfill in Live-DB, AR-Achievement-i18n):**
- [ ] `achievement_definitions.title_tr` für 33 Achievements — von mir inline beim apply-migration angepasst (Tüccar→Scout, Ticaret→İşlem). Anil: sind 33 konkret OK? Siehe migration `20260415132100`.

**Mission-Definitions (J7-AR-54):**
- [ ] `mission_definitions.title_tr` für 25 active missions — aus Migration `20260415030200`, z.B. "Günlük Görev", "1 Scout Card Satın Al", "Fantasy Etkinliğe Katıl". Anil: stilistisch OK?

**Disclaimer-Texte:**
- [ ] `legal.mysteryBoxDisclaimer` TR (Card + Short) — approved in vorheriger CEO-Session
- [ ] `legal.missionDisclaimer` TR — approved
- [ ] `legal.fantasyDisclaimer` TR — approved

**AR-59 priceAlert Keys (Phase 3 Rework):**
- [ ] `notifTemplates.priceAlertDown` TR: "Fiyat düştü"
- [ ] `notifTemplates.priceAlertUp` TR: "Fiyat yükseldi"
- [ ] `notifTemplates.priceAlertBody` TR: "{playerName}: Taban fiyat değişti"

**Compliance-Sweep (H2 Agent, Commit c1e3ef0):**
- [ ] 43 TR `kazan*` → `aldın/alındı/aldı` Substitutionen — Bulk-OK laut Agent?
- [ ] "Ev Sahibi Kazanır" → "Ev Sahibi (1)" (1X2-Totoschein-Pattern) — Anil-Testing benötigt

## Approved (Historie)
Keine.

## Rejected / Corrections
Keine.

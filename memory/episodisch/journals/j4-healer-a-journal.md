# Frontend Journal: J4 Healer A — Fantasy-i18n-Leak + preventClose × 4 + native-alerts raus

## Gestartet: 2026-04-14

### Verstaendnis
- Was: 3 FIX-Gruppen fuer Journey #4 Fantasy-Event quick-wins
  - FIX-01: i18n-Key-Leak in `submitLineup` (useEventActions.ts:183) + hardcoded DE-Fallback
  - FIX-02: preventClose auf 4 Fantasy-Modals (EventDetailModal, JoinConfirmDialog, CreateEventModal, EventSummaryModal)
  - FIX-03: 4 alert() + 2 confirm() + 2 alert() in useLineupSave ersetzen
- Betroffene Files:
  - `src/features/fantasy/hooks/useEventActions.ts` (FIX-01)
  - `src/components/fantasy/EventDetailModal.tsx` (FIX-02 + FIX-03 confirm/alert)
  - `src/components/fantasy/CreateEventModal.tsx` (FIX-02)
  - `src/components/fantasy/EventSummaryModal.tsx` (FIX-02)
  - `src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx` (FIX-02 — ist kein Modal, sondern custom overlay!)
  - `src/features/fantasy/hooks/useLineupSave.ts` (FIX-03)
  - `src/features/manager/components/aufstellen/AufstellenTab.tsx` (FIX-03 — handleLeave alert+confirm)
  - `src/components/ui/index.tsx` (neuer ConfirmDialog-Helper) — ODER ConfirmDialog als separate Component
  - `messages/de.json` + `messages/tr.json` (falls neue Keys)
- Risiken:
  - JoinConfirmDialog ist KEIN Modal sondern absolute-positioned overlay → kein preventClose prop existiert
  - preventClose in CreateEventModal nicht trivial: keinerlei Pending-State
  - useLineupSave alert(reqCheck.message) — message kommt aus reqCheck.ok: false (nicht i18n-Key)
  - handleSaveLineup catch's errors — ersetzen durch addToast
  - submitLineup error wird BEREITS in useEventActions gefangen UND dann nochmal in useLineupSave → doppelter catch, aber useEventActions addToast bereits

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | `useToast` in useLineupSave einfuehren | alert() raus, bestehendes Toast-System verwenden, keine neue Component |
| 2 | Neuer `ConfirmDialog` Component in `@/components/ui` | Wiederverwendbar fuer handleResetEvent, handleLeave in 2 Stellen |
| 3 | FIX-01: `'Not authenticated'` → `te('notAuthenticated')` (existiert bereits) | Kein neuer i18n-Key noetig |
| 4 | FIX-01: `'lineup_save_failed'` branch → neuer `fantasy.lineupSaveFailed` i18n-Key DE + TR | Beschreibender Text, keep message as separate hint |
| 5 | CreateEventModal preventClose → `preventClose={false}` mit TODO-Kommentar | Kein Pending-State im Modal (onCreate ist synchron Parent-Call) |
| 6 | EventSummaryModal preventClose → `preventClose={false}` mit TODO-Kommentar | Kein Mutation-State (reine Result-Anzeige) |
| 7 | JoinConfirmDialog: `onCancel` blockieren wenn `joining` | kein Modal-Prop, direkt im Overlay-Handler |
| 8 | useLineupSave: nutze addToast fuer validation-alerts (`incompleteLineupAlert`, `reqCheck.message`, catch) | Consistent mit useEventActions |

### Fortschritt
- [x] FIX-01 useEventActions.ts submitLineup i18n-Key-Leak weg
- [x] FIX-01 `'Not authenticated'` → `te('notAuthenticated')`
- [x] FIX-02 EventDetailModal preventClose={joining || leaving || resetting}
- [x] FIX-02 CreateEventModal preventClose={false} + TODO
- [x] FIX-02 EventSummaryModal preventClose={false} + TODO
- [x] FIX-02 JoinConfirmDialog onCancel-Guard (kein Modal, aber analoges Pattern)
- [x] FIX-03 EventDetailModal alert()×4 + confirm()×2 → ConfirmDialog + addToast
- [x] FIX-03 useLineupSave alert()×3 → addToast
- [x] FIX-03 AufstellenTab handleLeave alert+confirm → ConfirmDialog + addToast
- [x] Neuer ConfirmDialog Component in `@/components/ui`
- [x] i18n-Keys DE + TR (`fantasy.lineupSaveFailed` neu; rest wiederverwendet)
- [x] tsc --noEmit clean
- [x] vitest run betroffene Tests (310/310 passed)

### Runden-Log

**Runde 1 — FIX-01 i18n-Key-Leak (done)**
- useEventActions.ts Line 143: `'Not authenticated'` → `te('notAuthenticated')` (Key existiert bereits in errors-Namespace)
- useEventActions.ts Line 183: hardcoded DE-Fallback → `t('lineupSaveFailed')` (neuer fantasy-Key)
- messages/de.json + tr.json: `lineupSaveFailed` Key hinzugefuegt
- Pattern analog J3 `resolveErrorMessage` via mapErrorToKey + te()

**Runde 2 — FIX-02 preventClose + FIX-03 ConfirmDialog (done)**
- Neuer Component `src/components/ui/ConfirmDialog.tsx` — Modal-based, Mobile-friendly,
  mit `preventClose={confirming}` built-in
- Export in `src/components/ui/index.tsx`
- EventDetailModal:
  - `preventClose={joining || leaving || resetting}` auf Haupt-Modal
  - 2 ConfirmDialog fuer reset + leave
  - `addToast` + `resolveErrorMessage` fuer i18n-Key-Leak-Schutz
  - 4 `alert()` + 2 `confirm()` entfernt
- CreateEventModal: `preventClose={false}` mit TODO (Paid-Fantasy-Phase-4)
- EventSummaryModal: `preventClose={false}` mit TODO (Reward-Claim-Phase)
- JoinConfirmDialog: backdrop-click + cancel-Button blockiert bei `joining`
- useLineupSave: 3 `alert()` → `addToast`, err.message → `mapErrorToKey` + `te()`
- AufstellenTab: `confirm()` + `alert()` → ConfirmDialog + addToast

**Runde 3 — Test Fix (done)**
- EventDetailModal.test.tsx: lucide-react mock erweitert (X, AlertCircle, Info, AlertTriangle)
- ToastProvider gemockt (spart Lucide-Mock + Confetti-Tree-Init)
- `@/components/ui` mock erweitert um `ConfirmDialog`
- 14/14 Tests gruen

**Runde 4 — Scope-Tests (done)**
- `src/features/fantasy + src/components/fantasy + src/features/manager + src/components/ui`
- 310/310 Tests gruen
- 2 pre-existing failing Suites (MitmachenTab + PredictionsTab) haben Supabase-ENV-Problem
  in Baseline → nicht durch meine Aenderung verursacht (via `git stash` verifiziert)
- tsc --noEmit EXITCODE=0 clean

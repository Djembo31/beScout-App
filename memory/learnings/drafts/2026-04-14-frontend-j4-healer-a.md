**2026-04-14 — J4 Healer A quick-wins (Fantasy i18n-Leak + preventClose + alert/confirm)**

## Observation 1 — Lucide-Icon-Mock-Pflicht bei useToast-Transitiv-Import
Wenn eine Component `useToast` importiert und in einem Test `@/components/providers/AuthProvider` gemockt wird, triggert der Test trotzdem den `ToastProvider.tsx`-Import — der lucide-Icons `AlertCircle`, `CheckCircle2`, `Info`, `Sparkles`, `X` braucht. Wenn im Test `vi.mock('lucide-react', ...)` nur ein Subset hat → Vitest-Fehler `No "AlertCircle" export is defined on the "lucide-react" mock`.

**Fix-Pattern:** Entweder (a) ToastProvider komplett mocken (clean, isoliert) ODER (b) lucide-mock erweitern. Pragmatisch: mock ToastProvider als `{ useToast: () => ({ addToast: vi.fn() }) }` → spart auch Confetti-Tree + 5 Icon-Imports.

**Confidence:** high — reproduzierbar, klare Ursache.

## Observation 2 — ConfirmDialog als ui-Primitive verhindert 12+ alert/confirm-Wiederholungen
Wir hatten vor dem Fix alert()/confirm() verstreut in 3 Files (EventDetailModal, useLineupSave, AufstellenTab). Gleiches Pattern wird sich in Folge-Journeys (J5 Mystery Box, J7 Missions) wiederholen. Ein einziger `ConfirmDialog` in `@/components/ui` auf Modal-Base mit eingebauter `preventClose`-Logik entfernt alle Hand-Rolled Dialog-Mimics.

**Fix-Pattern:** Vor-Emptiv `ConfirmDialog` + `AlertDialog` als UI-Primitives in Registry pflegen. **Regel:** Kein `window.confirm()` / `window.alert()` in Production-Code — Lint-Regel erzwingen.

**Confidence:** high — wird in 4+ weiteren Journeys sparen.

## Observation 3 — Modal-inside-Modal funktioniert in Testumgebung anders
`ConfirmDialog` rendert ein Modal INNERHALB des EventDetailModal. Im Real-Browser: fine (z-index + fixed-position). Im Test: der `@/components/ui`-Mock rendert beide Modals gleichzeitig → `data-testid="confirm-dialog"` steht NEBEN `data-testid="modal"` in DOM. Wenn ein Test getByTestId('modal') ohne weitere Filter macht, kann er das falsche Modal hitten.

**Fix-Pattern:** Mock-Stubs mit distinct testids; im Test genau `getByTestId('confirm-dialog')` vs `getByTestId('modal')` unterscheiden. Bei zukuenftigen Tests darauf achten.

**Confidence:** medium — in unseren Tests aktuell nicht getroffen, aber lauerndes Risiko.

## Observation 4 — i18n-Key-Leak-Pattern hat jetzt 5. Wiederholung (J1, J2, J3 x3, J4)
J1 (handleBuy), J2 (nur handleBuy), J3 (handleSell + placeBuyOrder + handleCancelOrder), J4 (submitLineup + lineupSaveFailed + leaveError + resetFailed + errorShort). Die Systematik ist glasklar: **jeder `catch` in einem Hook/Component der auf `err.message` zugreift braucht `mapErrorToKey + normalizeError + te(key)`**.

**Fix-Pattern:** Pre-commit Lint-Regel schreiben: `err.message` + `addToast`/`setError` im gleichen Block ohne `mapErrorToKey` → Warning. Oder besser: `resolveErrorMessage` Helper in `@/lib/errorMessages.ts` exportieren, Hook-Call auf `useErrorResolver()` → automatische te()-Resolution.

**Confidence:** high — 5. Wiederholung, Bug-Pattern hat jetzt klaren Footprint.

## Observation 5 — preventClose fehlt systematisch auf Fantasy-Modals
Trading-Modals (BuyConfirmModal, SellModal, BuyOrderModal, LimitOrderModal) haben preventClose seit J2/J3. Fantasy-Modals (EventDetailModal, JoinConfirmDialog, CreateEventModal, EventSummaryModal) hatten 0 Treffer. Gleicher Systemfehler wie Multi-League Props-Propagation: **nach Pattern-Einführung (preventClose in J2) wurde die Regel nicht systematisch über alle Modals audited**.

**Fix-Pattern:** Bei Einführung eines neuen Modal-Sicherheits-Patterns → sofort grep über ALLE Modal-Call-Sites, nicht nur den direkt betroffenen. Bei Modal-Komponenten: Skill-Registry sollte preventClose-Anforderung + Konvention (`preventClose={X.isPending}`) prominent dokumentieren.

**Confidence:** high — 4. Domain mit dem gleichen Gap.

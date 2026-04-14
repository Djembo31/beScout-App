**2026-04-14 — Healer (Frontend) J3 Money-Safety**

Observation: **Service-Layer Error-Contract muss vollstaendig auf `throw new Error(i18nKey)` umgestellt werden** — Mischform `return { success: false, error }` + `throw` fuehrt zu zwei Code-Pfaden im Consumer, und Raw-DE-Strings (`'Kauf fehlgeschlagen'`, `'Invalid quantity'`) koennen durch die Mutation-Wrapper leaken, weil `useMutation`'s `onError` nur `err.message` sieht. Der Fix in `useTradeActions` war zentrale `resolveErrorMessage()` via `mapErrorToKey + te()`, plus `placeBuyOrder` komplett von return→throw umgestellt, plus Mutation-Wrapper Fallbacks auf `'generic'` key umgestellt. **Audit-Signal**: `grep -rn "'Kauf.*fehlgeschlagen'\|'Invalid \\(quantity\\|price\\)'\|'No response'" src/` nach jedem Service-Refactor — und Mutation-Wrapper mit `throw new Error('raw string')` sind latent i18n-Leaks selbst wenn Service clean ist.
Confidence: high

Observation: **`'Price exceeds maximum (${Math.floor(cap / 100)} $SCOUT)'`** war ein Triple-Red-Flag: (a) raw DE/EN string gemischt, (b) `$SCOUT` Ticker-Leak in Error, (c) dynamischer Teil (`Math.floor(cap / 100)`) kann nicht in i18n-Key verpackt werden. Fix: Service wirft statischen i18n-Key `'maxPriceExceeded'`. Dynamischer Preis-Cap gehoert in Price-Input-Hint (before-submit), nicht in Post-Error-Message. Regel: **Error-Messages NIE dynamische Werte enthalten — das ist ein UX-Hint, kein Error**.
Confidence: high

Observation: **Preventclose-Gap ist systematisch im Codebase** — J2F-04 fixte BuyConfirmModal, J3F-06..08 findet 3 weitere Modals die Geld-Mutation haben aber `preventClose` nicht gesetzt (BuyModal, SellModal, LimitOrderModal). **Healer-Empfehlung**: ESLint-Rule `no-modal-without-preventclose-on-mutation` oder common-errors.md Eintrag "Jeder Modal mit Mutation → preventClose PFLICHT". Heuristik: `Modal` + `isPending|cancelling|selling|buying` im gleichen File → preventClose nachruesten.
Confidence: medium

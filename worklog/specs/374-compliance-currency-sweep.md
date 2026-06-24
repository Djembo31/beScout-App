# Slice 374 — Compliance-Sweep: eventCurrency/Tickets-„Währung" → D99-neutral

**Slice-Type:** i18n (Compliance) · **Größe:** XS · **CEO-Scope:** Wording (Compliance) — D99/business.md.

## 1. Problem-Statement
D99 (`memory/decisions.md`): user-facing Einheit = „Credits", Credits sind explizit **keine Währung** (creditsContent-Disclaimer). Trotzdem:
- `eventCurrency` Label = „Währung"/„Waehrung" (3× DE, inkonsistente Schreibung) / „Para birimi" (3× TR) — admin-facing (AdminEventsTab Credits-vs-Tickets-Auswahl), aber Währungs-Framing.
- `glossary.terms.tickets.description` = „Zweitwaehrung, verdient durch Aktivitaet…" (DE) / „…ikinci para birimi…" (TR) — **user-facing** (Glossary via TopBar) → echte Compliance-Stelle (Tickets als „Währung" framen).

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `messages/de.json` | `eventCurrency` ×3 → „Einheit"; `glossary…tickets.description` → ohne „Zweitwährung" |
| `messages/tr.json` | `eventCurrency` ×3 → „Birim"; `glossary…tickets.description` → ohne „para birimi" |

## 4. Code-Reading-Liste (erledigt)
1. `src/components/admin/AdminEventsTab.tsx:53` — `currency: t('eventCurrency')` = admin-Event-Form-Label (Credits vs Tickets). Admin-facing.
2. `src/components/help/Glossary.tsx:39` — `useTranslations('glossary')`, via TopBar user-facing.
3. `messages/de.json:3683` creditsContent — Disclaimer erklärt korrekt „keine Kryptowährung"/„Fiat-Währungen" → NICHT anfassen.

## 5. Pattern-References
- `business.md` D99 — Einheit „Credits", kein Währungs-/Finanzprodukt-Framing. Tickets = Gamification-Einheit (Mystery Box/Chips), aber nicht „Währung".

## 6. Acceptance Criteria
- **AC1** [no-currency] `grep -niE 'waehrung|währung' messages/de.json | grep -v creditsContent` → 0. EXPECTED: nur Disclaimer behält „Währung".
- **AC2** [no-currency-tr] `grep -niE 'para birimi' messages/tr.json | grep -v creditsContent` → 0.
- **AC3** [unified] `eventCurrency` = „Einheit" (DE ×3) / „Birim" (TR ×3), keine „Waehrung"-Schreibung mehr.
- **AC4** [json] beide JSON parsen.

## 8. Self-Verification
Siehe `worklog/proofs/374-currency-sweep.txt`.

## 11. Scope-Out
- creditsContent-Disclaimer (legitimes „keine Währung").
- Tickets-Mechanik/Code unverändert (reine Label-/Beschreibungs-Werte).
- Andere Compliance-Begriffe (Securities/Glücksspiel) = separate Sweeps.

## 12. Stage-Chain
SPEC → IMPACT skipped (reine i18n-Values, 0 Code) → BUILD → REVIEW (self-review, XS reine Wording-Values) → PROVE → LOG.

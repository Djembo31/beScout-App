---
name: CEO Approval Matrix
description: Welche Entscheidungen brauchen Anil (CEO), welche triffst du (CTO) autonom. Definitive Liste. Reibung reduzieren, Ping-Pong beenden.
type: reference
---

# CEO-Approval-Matrix

Anil = CEO. Claude = CTO. Diese Liste ist verbindlich: keine Rueckfrage wenn Claude-Scope, keine Eigenmaechtigkeit wenn CEO-Scope.

---

## 1. Anil approved (CEO-Scope, Claude fragt ZUERST)

**Business und Produkt**
- Ob ein Feature ueberhaupt gebaut wird (Scope-Entscheidung)
- Prioritisierung: was zuerst, was spaeter
- Feature-Definition: Was ist Must-Have, was Can-Hide
- Zielgruppen, Personas, User-Journeys

**UX mit Brand- oder Compliance-Relevanz**
- $SCOUT-Wording, IPO-Umbenennungen, Fantasy-Terminologie
- TR-Strings (feedback_tr_i18n_validation: vor Commit zeigen)
- Disclaimer-Texte, Footer-Text, Legal-Pages
- Onboarding-Flow Schritte
- Empty-States mit Message-Text

**Geld-Flows (immer)**
- Fee-Splits, Fee-Tiers
- Trading-RPCs (Buy, Sell, Cancel, Order-Matching)
- Wallet-Aenderungen, Balance-Manipulation
- IPO-Pricing, Reward-Calculation
- Kill-Switch-Grenzen

**Security-sensitive Aenderungen**
- Auth-Flow, Session-Management
- RLS-Policies (neue oder geaenderte)
- SECURITY DEFINER RPCs mit neuen Grants
- Admin-Role-Logik
- Penetration-Surface (neue API-Routes, Edge Functions)

**Breaking Changes**
- Schema-Migrationen die Daten verlieren koennten
- RPC-Signatur-Aenderungen mit externen Consumern
- Type-Aenderungen die Client-Server-Kontrakte brechen
- Major-Version-Upgrades von Libraries

**Meta-Prozesse**
- Neue Workflow-Aenderungen (SHIP-Loop, Slice-Prozess)
- Neue MCPs aktivieren
- Neue Skills, neue Hooks
- Archivierung bestehender Prozesse

---

## 2. Claude entscheidet autonom (CTO-Scope, kein Fragen)

**Technische Umsetzung**
- Service-Layer-Design (wie strukturiert, welche Helper)
- Component-Hierarchie (wo liegt welches File)
- State-Management-Pattern (Zustand vs React Query)
- Query-Key-Strukturen (qk.* Factory)
- File-Namen und Ordner-Struktur innerhalb src/

**Code-Qualitaet**
- Welche Tests geschrieben werden (nicht OB — Tests sind Pflicht)
- Refactors ohne Scope-Change, ohne Risk
- Pattern-Konsistenz zu bestehenden Conventions
- Type-Definitionen, Union-Types, Schema-Validation

**Agents und Delegation**
- Welcher Agent welche Aufgabe bekommt
- Worktree vs Main
- Parallel vs Sequenziell
- Impact-Check wann (bei DB/RPC Pflicht, sonst optional)

**Fixes mit klarer Root Cause**
- Bug mit Testfall → fixen, common-errors.md update
- tsc-Fehler, Lint-Fehler, Test-Failures
- Typo in internal-facing Code/Logs/Keys
- Library-Upgrades: minor, patch
- Dependency-Updates ohne Breaking-Change

**Interne Tools**
- Hooks (in .claude/settings.json)
- Skills (neue, Updates)
- Memory-Files, Wiki-Seiten
- worklog/ Prozess-Files
- Dokumentation, Learnings, common-errors.md

**i18n**
- DE-Strings (Anil kann ueberstimmen, aber Default autonom)
- TR-Uebersetzung SCHREIBEN: autonom
- TR-Uebersetzung COMMITTEN: vor Commit Anil zeigen (feedback_tr_i18n_validation)

---

## 3. Border-Cases (Claude fragt wenn unsicher, sonst macht)

- Scope waechst waehrend Arbeit ueber 5 Files hinaus → fragen
- Neue Library-Abhaengigkeit (major version) → fragen
- Refactor der Cross-Domain ist (>2 Domains) → fragen
- Design-Entscheidung bei Uneindeutigkeit → fragen (mit 2-3 Optionen)
- Performance-Optimierung die Verhalten messbar aendert → fragen
- Daten-Migration mit User-Impact → fragen

---

## 4. Protokoll fuer CEO-Approval

Wenn Claude approval braucht:
1. **Kontext** (1-2 Saetze)
2. **Optionen** (max 3, nummeriert, mit Tradeoff)
3. **Empfehlung** (welche Option und warum)
4. **Was ich brauche von dir** ("Option 1/2/3?" oder "Ja/Nein")

Anils Antwort darf so kurz sein wie: `1` oder `nein` oder `anders: ...`. Kein Essay erwartet.

---

## 5. Anti-Patterns (was wir NICHT mehr machen)

- Claude fragt bei technischer Pattern-Wahl ("soll ich Zustand oder React Query nehmen?") → autonom entscheiden
- Anil mikromanagt Code-Details ("nimm doch lieber useMemo hier") → CTO-Scope, Anil-Input als Feedback fuer zukuenftige Patterns, nicht als Commando
- Claude macht Business-Entscheidung ohne zu fragen ("ich hab Fee-Split auf 5% gesetzt") → Verletzung, immer CEO
- Claude schreibt TR und committet ohne Review → Verletzung (feedback_tr_i18n_validation)

---

## 6. Revisions-Protokoll

Wenn einer von uns spuert dass die Liste nicht passt:
- Anil kann jederzeit per "CEO-Approval anpassen: X" die Liste aendern
- Claude schlaegt Aenderungen vor, Anil approved

Letzte Revision: 2026-04-16 (initial)

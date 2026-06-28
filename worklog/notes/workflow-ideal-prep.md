# Workflow-Ideal / Anti-Akkretion — Vorbereitungs-Briefing (für frische Session)

> **Auftrag (Anil 2026-06-28):** „Das ist ein ziemlich wichtiges Thema, das will ich in einer frischen Session durchplanen. Bereite alles dafür, damit ich es ziel-orientiert angehen kann. Das schieben wir VOR Mock→Pro. Ich will endlich unseren Workflow / unsere Arbeitsweise ideal am Laufen haben."
>
> Diese Datei = der Einstieg der nächsten Session. Die **Diagnose** ist hier fertig festgehalten (damit sie nicht verloren geht), die **Entscheidungs-Punkte** sind vorbereitet → die frische Session startet direkt mit Anils Entscheidungen + Plan, keine Re-Analyse.
>
> **Reihenfolge:** dieses Thema ZUERST → dann zurück zu Mock→Pro (428b DROP · Ranking-Konsolidierung · Welle 3). Slice 430 (Tracker-Konsolidierung) war der erste kleine Schritt davon; DAS hier ist die große, grundsätzliche Variante.

---

## 0. Das Ziel in einem Satz

Den Workflow/die Arbeitsweise so umbauen, dass die **Akkretions-Krankheit** strukturell gebremst wird — das Muster „immer anhängen, nie konsolidieren", das BEIDE Ebenen befällt (die Prozess-Docs UND den Code). Ergebnis: eine Arbeitsweise, in der Konsolidieren genauso selbstverständlich ist wie Bauen — ohne das Bau-Tempo zu killen.

## 1. Diagnose (aus Session 430 festgehalten — nicht neu herleiten)

**Die eine Ursache:** Anhängen ist lokal billig, Konsolidieren ist lokal teuer. Jede Session ist die günstigste korrekte Handlung „hinzufügen" (neuer Block, neue Spalte, neue RPC-Variante, zweiter Service). Aufräumen heißt: alles lesen + verstehen + riskieren etwas zu brechen. Über 430 Slices gewinnt „anhängen" jedes Mal → reine **Akkretion**, Schicht auf Schicht, nie verdichtet.

**4 Verstärker:**
1. **Kein SSOT → Löschangst.** Ohne *eine* Quelle kann man ein Duplikat nicht sicher löschen (liest jemand die andere Kopie?). Also beide behalten „sicherheitshalber". (So überlebte `clubs.treasury_balance_cents` als write-only-Waise [406], so existierte der Lineup-Builder doppelt [426].) Fehlender SSOT macht künftiges Aufräumen riskanter → schaukelt sich auf.
2. **Cold-Start-Angst.** Der Agent startet jede Session ohne Gedächtnis → der Handoff schreibt *alles* mit „falls ich's brauche". Der Mechanismus, der Kontinuität sichert, ist der, der aufbläht. Überkorrektur gegen „Kontext zwischen Sessions verlieren".
3. **Kein Feedback-Signal.** Code hat tsc/Tests/Bundle-Budget/Lint = sofortige Rückmeldung bei falschem Wachstum. Die Docs/Architektur hatten KEINS → Bloat unsichtbar bis es physisch wehtut. (Slice-430-Guard = erstes solches Signal für Docs.)
4. **Bau-Ritual ohne Verdicht-Ritual.** Der SHIP-Loop *addiert* (Slice → Log → reconcile). Nichts *subtrahiert* je.

**Das eigentliche Meta-Versäumnis:** Wir haben den Workflow auf **„nie Information verlieren"** optimiert — nie auf **„Information auffindbar halten".** Das sind zwei verschiedene Ziele. Eine 946KB-`log.md` verliert Information genauso wie Löschen — niemand findet mehr was. Horten ≠ Wissen. Und wir haben nie definiert *„was ist der EINE Job dieser Datei/dieses Moduls?"* → jede Datei/jedes Modul versuchte langsam jeden Job.

**Gleiche Krankheit Doc + Code (Anils Kern-Beobachtung):**

| Meta-Ebene (Tracker) | Code-Ebene (D111 Mock→Pro) | Gleicher Mechanismus |
|---|---|---|
| Stand 4-5× dupliziert | „von allem zwei" (`scout_scores`+`user_stats`, 2× Lineup-Builder, treasury-Counter+Ledger) | neue Variante daneben statt auf die alte konsolidiert |
| Mega-Zeilen | Aufstellung 16 Spalten / Scores an GW-Nummer | Schema wuchs durch Anhängen statt einmal designt |
| Append-only Handoff | Client-only-Architektur | billiger lokaler Zug, akkumuliert bis es bricht |

Bei jedem Money-Feature war „zweiten Pfad daneben bauen" sicherer als „den alten anfassen" (alt = Geld-kritisch = Angst). → „von allem zwei", 430× gemacht.

## 2. Die scharfe Problem-Formulierung (wichtige Nuance!)

**„Von allem zwei" ist nicht per se schlecht.** `orders` + `offers` (D112, Fork B) sind eine BEWUSST entschiedene Zwei (zwei echte Produkte) — das ist gesund. Das Gift ist die **UNBEWUSSTE / UNGETRACKTE Zwei**, die entsteht weil niemand den alten Weg geschlossen oder die Entscheidung protokolliert hat.

→ Die Kern-Regel-Kandidatin lautet also NICHT „nie zwei Wege", sondern:
> **„Jede Duplikation muss entweder konsolidiert sein ODER als bewusste Entscheidung protokolliert (wie D112). Ein ungetrackter zweiter Weg gilt als unfertig."**

## 3. Evidenz — die Krankheit ist real + hat schon einen Backlog

- **Schon geheilt (Konsolidierung):** treasury-Counter→Ledger (406) · 2× Lineup-Builder gelöscht (426) · GameweekSelector-Orphan (421) · `initial_listing_price` gedroppt (368f) · Tracker-Stand (430).
- **Bewusste Zwei (gesund, kein Bug):** `orders`/`offers` (D112).
- **Offen = Krankheit:** `scout_scores`↔`user_stats` (zwei Ranking-Quellen) · `club_votes`↔`community_polls` (zwei Voting-Systeme) · `creatorFund.ts`/`adRevenueShare.ts` (Calc ohne Distribution) · Wildcard-Earn (0 Consumer) · Club-Missionen (0 Rows). Quelle: `worklog/s7-phase3-remaining.md` + `401-e2e-enforcement-audit.md`.

→ Es gibt also schon ein **faktisches Inventar** der Duplikate. Ein Teil des Plans könnte sein, das in ein lebendes „Konsolidierungs-Schuld-Register" zu heben.

## 4. Entscheidungs-Punkte für Anil (in der frischen Session zu klären)

1. **Scope.** Nur das Anti-Akkretions-Gegengewicht (Regel + Ritual + Signal) — ODER ein voller „Arbeitsweise-Ideal"-Review des ganzen SHIP-Loops (was ist Ballast, was ist echter Wert)? Empfehlung: erst das Gegengewicht scharf machen (das ist die Wurzel), Ballast-Review als zweiter Block.
2. **Die Kern-Regel.** „Kein ungetrackter zweiter Weg" als **harte Definition-of-Done** (Slice nicht fertig, bis alter Weg weg ODER Entscheidung protokolliert) — oder als weichere Leitlinie? Empfehlung: harte DoD (weiche Regeln sind genau das, was bisher nicht griff).
3. **Konsolidier-Ritual.** Kontinuierlich (jeder Slice trägt seine Konsolidierungs-Pflicht) · periodisch (alle N Slices ein Verdicht-Pass) · getriggert (ein Detektor meldet, dann Pflicht)? Vermutlich Kombi: kontinuierlich als DoD + Detektor als Netz.
4. **Tooling.** Einen „zwei-Wege-für-X"-Detektor bauen (analog `audit:orphan`/`wiring-check`, der Build-without-Wire fängt)? Ja / Nein / später? Was wäre der erkennbare Fingerabdruck einer Duplikation (zwei RPCs gleiche Domäne, zwei Services gleiche Tabelle, zwei Components gleiche Rolle)?
5. **Konsolidierungs-Schuld-Register.** Ein lebender Tracker aller bekannten Duplikate mit Status (konsolidieren / bewusst-zwei / erledigt) — ja/nein? (Würde das §3-Inventar formalisieren.)
6. **Der Agent (ich) als Mit-Verursacher.** Meine Default-Verbosität (alles in den Handoff schreiben aus Vollständigkeits-Eifer) IST Teil der Krankheit. Soll mein Verhalten als Regel geändert werden: konsolidieren als Default statt anhängen, knapper Handoff, „ein Job pro Artefakt"? (Das ist eine Feedback-/Memory-Regel über mich, kein Code.)
7. **Verhältnis zu Mock→Pro.** Anil-Setzung: dieses Thema VOR Mock→Pro. Frage zum Schärfen: ist „Workflow-Ideal" eine **Voraussetzung** für Mock→Pro (damit Mock→Pro nicht selbst neue Akkretion erzeugt) — oder ein abgeschlossener Vorab-Block? Empfehlung: Voraussetzung — denn Mock→Pro IST der große Konsolidierungs-Feldzug, der soll auf der idealen Arbeitsweise laufen.

## 5. Kandidaten-Bausteine (zum Reagieren, nicht vorab-entscheiden)

- **DoD-Erweiterung** „kein ungetrackter zweiter Weg" (§4.2) im SHIP-Loop + ggf. Hook.
- **Konsolidierung als first-class Slice-Type** (eigener Typ neben UI/Service/Migration, mit eigener Definition-of-Done).
- **„DISTILL für Code"** — Session-End-Pass, der nicht nur Entscheidungen extrahiert, sondern fragt „habe ich diese Session einen zweiten Weg erzeugt?".
- **Konsolidierungs-Schuld-Register** (§4.5).
- **Detektor-Tool** (§4.4).
- **Agent-Verhaltens-Regel** (§4.6) als `memory/feedback_*`.
- **SSOT-Prinzip aufs Code-Niveau ziehen:** „ein Job pro Modul/Tabelle/RPC" als Architektur-Leitstern (genau das, was Mock→Pro pro Domäne durchsetzt — hier als Dauer-Regel verankern).
- Optional: **Ballast-Review des SHIP-Loops** — welche Zeremonie fängt echte Bugs (behalten) vs. welche ist Theater (streichen). Anils „endlich ideal" deutet darauf hin.

## 6. Was NICHT anfassen (bewährt, fängt echte Bugs)

- **Money/Security-Rigorosität** (Reviewer-Pflicht, PATCH-AUDIT, Live-functiondef vor Spec, Zero-Sum) — hat diese Woche real Bugs gefangen (419b Form-Bar-Fanout, 428 RPC-Revert). Kein Ballast.
- **Bewusste Zweien** wie D112 (orders/offers). Die Regel zielt auf *ungetrackte* Duplikation, nicht auf bewusste Architektur.

## 7. Erfolgs-Kriterium

Nach dem Slice existiert ein **Gegengewicht zur Akkretion** aus 3 Teilen: eine **Regel** (kein ungetrackter zweiter Weg) + ein **Ritual** (wann/wie konsolidiert wird) + ein **Signal** (Detektor/Register, das Duplikate sichtbar macht). Messbar: eine neue Duplikation entsteht nicht mehr *unbemerkt* — sie wird entweder konsolidiert oder bewusst protokolliert. Und: das Bau-Tempo für Standard-Slices bleibt gleich (die Regel darf nicht zur Bürokratie werden).

## 8. Kontext-Pointer / Pre-reads (damit die frische Session nicht sucht)

- Dieser Befund + Plan: **diese Datei.**
- Die volle Root-Cause-Analyse: Session 2026-06-28 (nach Slice 430), in diese Datei §1-§2 destilliert.
- Vorläufer (Meta-Ebene, schon umgesetzt): `worklog/notes/process-elite-prep.md` + Slice 430 (`worklog/log.md`).
- Workflow-Regeln heute: `.claude/rules/workflow.md` (SHIP-Loop + Stand-SSOT-Regel Slice 430).
- Die Code-Krankheit als Programm: `worklog/notes/mock2pro-audit.md` + `mock2pro-plan.md` (D111). Dieses Thema ist die **Dauer-Regel**, Mock→Pro die **einmalige Heilung**.
- Verwandte Process-Erfindung: `decisions.md` **D110** (e2e-Durchsetzungs-Audit — „Trackern nicht glauben, verifizieren").
- Duplikat-Inventar: `worklog/s7-phase3-remaining.md` + `worklog/notes/401-e2e-enforcement-audit.md`.

# Decisions Log

**Zweck:** Strategic + Architectural + Process-Entscheidungen, die länger als ein Slice wirken. Versioniert in git, automatisch in Claude's Context via `MEMORY.md`-Index, in Obsidian als Graph-Node, optional in Notion gespiegelt.

**Wann Entry anlegen:**
- Anil sagt „ist nicht mehr...", „neu...", „Scope-Change...", „ab jetzt..."
- Architektur-Entscheidung mit Alternativen-Abwägung (z.B. Tech-Stack, System-Design)
- Process-Regel die für künftige Sessions gilt (z.B. „Rollback-Drill Pflicht")

**Was NICHT hier rein:**
- Code-Patterns → `.claude/rules/common-errors.md`
- Business-Compliance-Regeln → `.claude/rules/business.md`
- Slice-Historie → `worklog/log.md`
- Ad-hoc Bug-Fixes → Commit-Message + log.md

**ID-Schema:** `D<n>` — einmal vergeben, nie wiederverwendet. Superseded-Entries bleiben als Historie, neue Entscheidung bekommt neue ID mit `Supersedes: D<old>`.

**Kategorien:**
- **PRODUCT** — Scope, Markt, Zielgruppe, Roadmap-Phasen
- **ARCHITECTURE** — Tech-Stack, System-Design, Bibliotheks-Wahl
- **PROCESS** — Workflow, Memory-System, Release-Prozess, Governance

---

## D1 — PRODUCT: 7 Ligen launch-ready (nicht mehr Sakaryaspor-Pilot-exklusiv)

**Datum:** 2026-04-21
**Status:** ✅ Aktiv
**Supersedes:** Historische Pilot-Strategie „Sakaryaspor (TFF 1. Lig) only" aus pre-2026-04 (siehe `docs/VISION.md` historisch, jetzt geupdated)

### Entscheidung

Alle 7 Ligen sind launch-ready: Süper Lig, TFF 1. Lig, Bundesliga, 2. Bundesliga, Premier League, La Liga, Serie A. Sakaryaspor war initialer Hook, aber Produktstand reicht jetzt für größere Clubs (Bundesliga, Süper Lig, EU-Top-5).

### Begründung (Anil-Direktive)

- Produktstand nach Multi-Liga-Expansion (Slice-Serie 2026-03/04) deutlich breiter als Pilot-Scope
- DE+TR-Prio bleibt (persönliche Nähe des Gründers), aber qualitativ gleicher Standard für alle Ligen
- B2B-Vertrieb soll größere Clubs targeten — kein Pilot-Lock-in nötig

### Auswirkungen

- **Code:** CLAUDE.md + SHARED-PREFIX + beScout-business LEARNINGS + VISION.md geupdated (Slice 131)
- **Content:** Bot-Handles + Seed-Daten mit Sakaryaspor-Fokus bleiben als Test-Content (post-Beta neu seeden)
- **Vertrieb:** Post-Beta Club-Deal-Entscheidung offen (Anil — realer Club-Partner vor Public-Launch?)
- **Data-Quality:** Gold-Standard-Ziel gilt für alle 7 Ligen gleichermaßen

### Alternativen erwogen

- **Sakaryaspor-only bleiben:** Verworfen weil Produktstand überproportional gewachsen ist — wäre Verschwendung von Produktreife.
- **Nur Süper Lig + Bundesliga:** Zu schmal — Scouting-Wert liegt in breiter Liga-Abdeckung.

---

## D2 — ARCHITECTURE: Beta-Metrics via SQL statt PostHog-Instrumentation

**Datum:** 2026-04-21
**Status:** ✅ Aktiv (nur für Beta-Phase, post-Beta evtl. revisit)

### Entscheidung

Während Beta-Phase werden User-Engagement + Feature-Usage + Money-Flow KPIs via Supabase-SQL-Queries direkt berechnet (`scripts/beta-metrics.mjs`), nicht via PostHog-Event-Instrumentation.

### Begründung

- PostHog-Instrumentation kostet 1-2h Entwicklungszeit + Testing + CSP-Anpassung + Cookie-Banner-Interaktion
- Pilot-Daten (20 Fans, 7 Tage) reichen als SQL-Aggregation völlig aus
- Supabase-Daten sind 100% deterministisch + auditierbar (für Money-KPIs wichtig)
- PostHog-Mehrwert (Session-Replay, No-Code-Dashboards) greift erst bei mehr User-Volume

### Auswirkungen

- `scripts/beta-metrics.mjs` rechnet 14 SQL-messbare KPIs (User-Engagement 5, Feature-Usage 6, Money-Flow 3)
- `pnpm run beta:metrics` als Daily-Check-Command
- PostHog-ENV-Vars bleiben live (nicht abschalten), aber 0 aktive Instrumentation in `src/`

### Alternativen erwogen

- **PostHog-Instrumentation bauen:** Verworfen wegen Pre-Beta-Zeitbudget + Pilot-Größe.
- **Keine Metrics-Tracking:** Verworfen — Exit-Criteria brauchen messbare Zahlen.
- **Sentry-Performance als Proxy:** Nur für Tech-KPIs (LCP), nicht für Business-Funnel.

### Re-Visit-Trigger

- Bei Public-Launch (>100 DAU): PostHog-Instrumentation evaluieren (SKILL.md oder neuer Slice)
- Bei Session-Replay-Bedarf nach Bug-Report: evtl. früher

---

## D3 — PROCESS: Rollback-Drill = Pflicht einmal vor Beta-Start

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Vor Beta-Launch muss einmal ein absichtlicher Rollback-Drill durchgeführt werden (`memory/beta-rollback-runbook.md` Section „Test-Prozedur VOR Beta-Start"). Ziel: Rollback-Zeit <3 Minuten, Fallstricke entdecken, CLI-Login etc. vorbereiten.

### Begründung

- Rollback-Prozedur wurde noch nie geübt — unter Druck während echtem P0-Incident entstehen Fehler
- 3-Minuten-Ziel nur verifizierbar mit echtem Drill
- Fallstricke (2FA-Prompt, expired CLI-Token, Service-Worker-Cache) sichtbar nur beim Durchspielen

### Auswirkungen

- Beta-Start-Checkliste bekommt „Rollback-Drill durchgeführt" als Pre-Start-Gate
- Ergebnis wird in `worklog/proofs/rollback-drill-YYYY-MM-DD.txt` dokumentiert
- Fallstricke kommen in Runbook zurück

### Alternativen erwogen

- **Überspringen:** Verworfen — Ops-Runbook ohne Drill ist Theater.
- **Nur bei Incident testen:** Verworfen — zu spät, dann fehlt Zeit zum Lernen.

---

## D4 — PROCESS: Memory-System — git ist Truth, Obsidian ist Lese-Layer, Notion ist Coordination

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Klare Rollen-Trennung der 3 Knowledge-Systeme:

- **git-tracked (`memory/` + `.claude/rules/` + `worklog/`)** = primärer Truth-Layer. Claude liest automatisch bei jeder Session.
- **Obsidian** = reiner Read-Layer auf `memory/`-Files via `.obsidian/`-Config. Anil nutzt Graph-View für Exploration. Kein Sync nötig (dieselben Files).
- **Notion** = Coordination-Layer für Anil (Kanban, Slice-DB, Status-Page). Kein Truth-Source, sondern Spiegel + Executive-View.

### Begründung

- Claude kann Notion nicht automatisch lesen ohne explicit MCP-Call → alles Strategy-relevante MUSS in git
- Obsidian und git auf denselben Files → kein Divergenz-Risiko
- Notion für Anil-Facing-Views (Stakeholder-Sharing, Priority-Changes) unschlagbar

### Auswirkungen

- `memory/MEMORY.md` als Index für Claude's Auto-Discovery
- Alle neuen Strategic Decisions → `memory/decisions.md` (dieses File)
- Slice-DONE-Hook spiegelt in Notion-Slice-DB
- Decisions optional Spiegelung in Notion-Status-Page (via `docs(decision):`-Commit-Hook, siehe Slice 131)

### Alternativen erwogen

- **Notion als Truth-Source:** Verworfen — Claude kann nicht auto-lesen, Versionierung fehlt, Grep-unfreundlich.
- **Obsidian als Truth-Source:** Verworfen — ist eigentlich nur ein Viewer auf Markdown-Files, kein eigener Store.
- **Alles in git, kein Notion:** Verworfen — Anil braucht Executive-Views für Stakeholder-Kommunikation.

---

## D5 — PROCESS: Session-End-Protokoll „DISTILL" — Chat-Ausarbeitungen müssen persistiert werden

**Datum:** 2026-04-21
**Status:** ✅ Aktiv (in `.claude/rules/workflow.md` verankert)

### Entscheidung

Am Ende jeder Session (vor Stop-Hook) muss Claude den Chat rückwärts scannen und folgende Inhalte extrahieren:

1. **Strategic Decisions** → `memory/decisions.md` neuer Entry
2. **Architektur-Alternativen erwogen** → `Alternativen erwogen`-Section in relevanter Decision
3. **Process-Erfindungen** (neue Workflows, Regeln, Checklisten) → `memory/decisions.md` mit Category PROCESS
4. **Ad-hoc Learnings** (überraschende Erkenntnisse, tech-deep-insights) → falls Code-relevant in `.claude/rules/common-errors.md`, sonst als neuer Decision-Entry

Commit-Message-Prefix: `docs(decision): D<nn> — <title>`.

### Begründung

Anil-Feedback 2026-04-21: „Ich habe das Gefühl dass viele Dinge die wir ausarbeiten auch verloren gehen, Kernerkenntnisse sollten schon extrahiert werden." Konkretes Beispiel: Sakaryaspor-Scope-Change war mündlich im Chat, landete aber nicht strukturiert in git — führte zu stale facts in CLAUDE.md über Wochen.

### Auswirkungen

- `.claude/rules/workflow.md` bekommt Section „DISTILL — Session-End-Protokoll"
- SHIP-Loop bekommt 6. Stufe nach LOG: DISTILL (optional pro Slice, pflicht pro Session)
- Claude muss aktiv sein — kein Hook kann semantische Decisions erkennen

### Alternativen erwogen

- **Stop-Hook mit LLM-Call:** Verworfen — zusätzlicher API-Cost, braucht Inference, fragil.
- **Anil macht es manuell:** Verworfen — genau das was der Feedback kritisiert hat.
- **Nur wenn Anil „decide"/"entschieden" sagt:** Verworfen — zu eng, viele Decisions kommen implizit.

---

## D6 — PRODUCT: Beta-Usability-Test-Format (30 Min Zoom × 3 Tester mit heterogenen Profilen)

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Phase 3b Beta-Testing läuft als **30-Min Zoom-Calls** mit **3 Testern verschiedener Profile**, nicht als Survey/Async/Single-Profile:

- **Tester A (Power-User):** Tech-affin + Fußball-Fan → validiert Power-Flows
- **Tester B (Novice):** Nicht-fußballaffin → validiert ob App selbsterklärend
- **Tester C (TR-Locale):** Türkisch-sprachig → live TR-UX (ergänzt Deutsch-Türke-Review der NUR 12 String-Findings durchklickt)

**Format:** „Denk-laut"-Protokoll, 8 sequentielle Tasks (Onboarding → First-Trade → Fantasy → Community → Mission → Club-Abo → Profile), Moderator beobachtet ohne einzugreifen (45-Sek-Regel), 6-8 Abschluss-Fragen mit NPS.

### Begründung

- Anil ist Einzelperson — Zoom-Setup ist niedrige operative Hürde
- 3 Tester in heterogenen Profilen maximieren Signal-pro-Zeit gegenüber 5 gleichen
- „Denk laut" deckt Mental-Model-Mismatches auf, die Survey-Items nie fangen würden
- Tester-C + Deutsch-Türke trennen **UX-Test** (lebendige Navigation) von **String-Review** (statische Korrektur) — beide nötig, aber verschiedene Methoden

### Auswirkungen

- 3 Files neu: `memory/beta-testplan.md`, `beta-test-results.md`, `beta-testing-runbook.md`
- Severity-Schema erweitert: neben P0-P2 auch **P3 = Celebration** (positive Findings explizit kategorisieren)
- Nachrichten-Template DE + TR für Tester-Akquise
- Commit-Prefix `docs(beta-test): tester <A|B|C> results` etabliert

### Alternativen erwogen

- **Written Survey (Google Forms):** Verworfen — keine Observation möglich, Tester rationalisieren.
- **Async Video-Recording (User-Testing-Style):** Verworfen — keine Rückfragen möglich bei Confusion, keine Follow-up-Probes.
- **5+ Power-Users:** Verworfen — überbetont tech-affine Bubble, ignoriert Novice-Perspektive.
- **Nur 1 Tester für alle Profile:** Verworfen — Tester A hat Fußball-Brille die UX-Gaps für B unsichtbar macht.
- **Längere Sessions (60 Min):** Verworfen — Test-Fatigue nach 30 Min sichtbar in Fremdstudien.

### Re-Visit-Trigger

- Nach Phase 3b Aggregation: War 30 Min knapp? Fehlten Tasks? → Format für Public-Launch-Beta anpassen.
- Bei >20 Testern (post-Beta): Methode umstellen auf PostHog-Funnel + selektive Zoom-Calls.

---

## D7 — PROCESS: Stale-Reference-Self-Heal bei Evidence-Check

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Wenn beim Evidenz-Check (z.B. „was ist in Phase 3 noch?") **stale references** gefunden werden (memory/MEMORY.md oder active.md behauptet File-X existiert aber `ls` zeigt Gegenteil), dann wird sofort in derselben Session der stale reference aufgelöst — entweder durch Erstellen des versprochenen Files ODER Entfernen der falschen Referenz. **Nicht „später"**.

### Begründung

Konkret erlebt in dieser Session: `memory/beta-testplan.md` und `beta-test-results.md` waren in `worklog/active.md` + `MEMORY.md` als fertig referenziert, existierten aber nicht. Genau das Pattern das D5 (DISTILL) adressieren soll — und es wäre beim nächsten Session-Start re-injected worden (CLAUDE reads MEMORY.md → findet Link → liest Content → Missing → Halluzination oder Verwirrung).

Stale references sind **infektiös**: je länger sie stehen, desto mehr Files referenzieren sie weiter, desto schwerer rauszuräumen.

### Auswirkungen

- Integriert in DISTILL-Stage: Wenn Stale-Reference beim Chat-Scan gefunden wird, ist Action Teil von DISTILL (schließen vor Commit).
- Bei Priorisierungsfragen vom Stale-Target: „jetzt" nicht „Slice später".
- Slice 132 (94f8ceea) ist Proof-of-Concept: Gap entdeckt → selbe Session geschlossen.

### Alternativen erwogen

- **„Ticket öffnen und später"**: Verworfen — führt zu genau dem Problem das D5 löst.
- **Nur Referenz löschen (nicht Content füllen)**: Verworfen wenn Content echt gebraucht wird (wie beta-testplan.md). Nur OK wenn Referenz unnötig ist.
- **Aus MEMORY.md auto-Index auskommentieren**: Verworfen — Obsidian zeigt broken links trotzdem.

---

## D8 — PROCESS: Bug-Triage mit DB-Truth-First bei UI-Daten-Anomalien

**Datum:** 2026-04-22
**Status:** ✅ Aktiv

### Entscheidung

Wenn ein User-Report sagt „die UI zeigt X aber sollte Y sein" (Zahlen, Listen, Counts) — **erste Diagnose-Aktion ist eine SQL-Query gegen die Produktions-DB**, nicht Code-Read. Erst wenn DB ≠ UI, gehe ich in den Client-Code. Wenn DB = UI, liegt der Bug in Service-Query oder Data-Pipeline.

Konkrete Reihenfolge:
1. DB-Truth: `SELECT ... GROUP BY ...` für die angeblich falsche Metric
2. Service-Layer-Query simulieren: gleiche Filter, gleiche JOINs, gleiche Limits
3. Wenn Stufe 1 + 2 unterschiedlich sind → Service hat Bug (Filter, Cap, Auth)
4. Wenn Stufe 1 + 2 gleich sind, UI anders → Client-Cache, React-State, Display-Mapping
5. Code-Read erst wenn Diagnose-Hypothese steht

### Begründung

Slice 133: Anil-Screenshot zeigte Beşiktaş „2 Spieler". DB-Query + Service-Simulation nahmen zusammen ~90 Sekunden — und zeigten sofort dass DB-Realität 20 ist, Service-Query auch 20 liefert in SQL, aber Client weniger bekommt. Daraus war in Sekunden klar: PostgREST-row-cap trotz `.limit(10000)`.

Ohne diesen Check wäre der erste Instinkt gewesen Code-Walk durch `getClubsWithStats` → Hypothesen bilden → testen — das dauert 10-15 Min mit Hypothesen die am Ende vielleicht alle falsch wären.

SQL-First ist **objektiv schneller** weil DB keine Meinung hat, nur Fakten.

### Auswirkungen

- **Pattern für Debug-Sessions:** Bei UI-Anomalie → `mcp__supabase__execute_sql` als erstes Tool, nicht grep + Read
- **In `.claude/rules/common-errors.md`** (Section „Silent Fails"): Beim Debug-Pattern verankert — „DB-Query vor Code-Read bei Count/Listen-Bugs"
- **Agent-Brief-Template** für impact-analyst / reviewer: bei Daten-Bugs explicit die Query-Reihenfolge (1. DB, 2. Service-Sim, 3. Client) einbauen

### Alternativen erwogen

- **Code-Walk first (klassisches Debugging):** Verworfen — erzeugt Hypothesen-Theater, kostet 5-10× mehr Zeit bei Data-Bugs
- **Nur bei Money-Bugs DB-first, sonst nach Gefühl:** Verworfen — User merkt keinen Unterschied zwischen Money und Count-Display, die Debugging-Disziplin muss einheitlich sein
- **User selbst DB-Query ausführen lassen:** Verworfen — Claude hat direkten MCP-Zugriff, das ist unnötige Latenz

### Re-Visit-Trigger

Wenn `mcp__supabase__execute_sql` mal 3× hintereinander bei einem Daten-Bug _nicht_ die Ursache lokalisiert hat → Pattern re-evaluieren (vielleicht gibt's eine UI-Layer die weiter vorne sitzt wie Realtime-Sync oder Service-Worker).

---

## D9 — PROCESS: Hypothesis-Validation-Before-Slice (Backlog-Items sind Hypothesen, keine Wahrheiten)

**Datum:** 2026-04-22
**Status:** ✅ Aktiv

### Entscheidung

Bevor ein Kanban-/Backlog-Item als Slice gestartet wird, **validiere zuerst die Hypothese gegen aktuellen Code + DB**. Backlog-Items sind Momentaufnahmen eines vergangenen Denkens — zwischen Eintrag und Start können Tage bis Monate liegen, Code/DB hat sich bewegt. Ein Slice der eine invalide Hypothese löst, ist entweder Noise (nichts geändert) oder schädlich (bricht funktionierenden Code).

Pflicht-Checks vor Code-Change auf Basis eines Backlog-Items:

1. **Ist die Root-Cause noch aktuell?** — grep für erwähnte Files/Flags/Symbols. Fehlende Referenzen = stale (D7 self-heal).
2. **Stimmt die Zahl?** — jede konkret genannte Zahl (367 Spieler, 5 cron-routes, etc.) per DB-Query oder grep verifizieren. Zahlen altern am schnellsten.
3. **Existiert der Fix vielleicht schon?** — grep für den vorgeschlagenen Fix-Mechanismus (Feature-Flag, Guard, Helper-Funktion). Oft ist halb-fertig implementiert und nur Kanban nie gepflegt.
4. **Wie groß ist der Blast-Radius des Fix?** — der Fix-Vorschlag könnte mehr breaken als er löst (siehe Case unten).

Wenn einer der Checks Red-Flag zeigt: **stop, cleanup Kanban-Eintrag mit Evidence, report an User**. Kein Code.

### Begründung (2 Fälle in derselben Session 2026-04-22)

**Fall 1 — Paid-Mystery-Box Gating (CRITICAL):**
Kanban sagte "Paid-Opens mit $SCOUT = Loot-Box-Fall, Feature-Flag fehlt". Check: 4-Layer-Defense-in-Depth live (env-flag `PAID_MYSTERY_BOX_ENABLED`, client-guard in MysteryBoxModal, RPC-guard in open_mystery_box_v2 — via `pg_proc` verifiziert mit `HAS_GUARD`+`HAS_ERROR`, DB-setting `app.paid_mystery_box_enabled=(unset)` → default false). Ergebnis: **Stale — Journey-5-Arbeit schon komplett**, Kanban nie synced. Wenn ich den Slice gestartet hätte, hätte ich entweder doppelt-gebaut oder den live-gate versehentlich modifiziert.

**Fall 2 — api-football Name-Normalization (P2):**
Kanban sagte "367 Spieler blockiert weil api-football 'F.', 'P.' initials liefert, reject oder flag vor Insert". Check via DB-Audit: von 197 Spielern mit Initial-Namen haben **162 (82%)** ein valides TM-Mapping (K.Tsimikas, P.Dybala, M.Svilar als top-Spieler). Die Überschneidung "unknown + Initial-Namen" ist nur 7 von 134 unknowns (5%). Ergebnis: **Hypothese falsch** — ein naiver Reject-Fix hätte 162 top-Spieler silent gedroppt für max 7 mögliche Wins. Negativer ROI.

### Auswirkungen

- Pattern verankert in `memory/feedback_verify_before_claiming_open.md` (bereits existent — D9 formalisiert den Workflow für Kanban-Items)
- Bei Kanban-Planung: **3 Min Verify-Aufwand spart 30-120 Min Slice-Aufwand** wenn Hypothese falsch ist. Auch wenn Hypothese richtig: Verify schärft Scope und Blast-Radius.
- Agent-Briefs für backend-Agent müssen ebenfalls Pre-Validation enthalten — der Agent arbeitet sonst auf stale Briefing.
- In dieser Session: 4 Kanban-Items durch Validation als Erledigt markiert (1× Slice 115 gelöst, 2× J4/J5 gelöst, 1× Hypothese falsch). Das ist nicht "Faulheit", sondern Schutz vor Pseudo-Arbeit.

### Alternativen erwogen

- **Blind trust Kanban-Inhalt:** Verworfen — heute 2× würde es uns schaden haben gekostet. Das skaliert nicht.
- **Nur bei CRITICAL/P0 verifizieren:** Verworfen — P2 Fall 2 hätte 162 Spieler broken, die Priorität sagt nichts über Blast-Radius aus.
- **User (Anil) zuerst fragen:** Verworfen — Anil delegiert explizit ("überlasse es dir"). Self-Verify ist CTO-Pflicht.

### Re-Visit-Trigger

Wenn Kanban-Items 3× hintereinander Verifikation überleben und unverändert valide sind → vielleicht ist die Backlog-Quality inzwischen hoch genug und der Verify-Check kann weiter vorne im Session-Start stattfinden (z.B. als Kanban-Hygiene-Skill).

---

## D10 — PROCESS: Backlog in 5 Layern dependency-sortiert (memory/backlog.md)

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Offene Arbeiten außerhalb aktiver Slices werden in `memory/backlog.md` in **5 topologisch sortierten Layern** gepflegt: L0 Anil-Blocker (extern), L1 Independent (parallel startbar), L2 Depends-on-L1, L3 Post-Beta-Launch, L4 Revenue-Scaling. Items in Layer N können erst nach Abschluss von L<N-1> starten. Innerhalb eines Layers ist Reihenfolge frei.

### Begründung

- Vor Slice 137-140 gab es 3 parallele Listen (Kanban, `next-session-briefing`, `project_*.md`) mit unklarer Sortierung.
- Anil-Frage „haben wir was out-of-scope offen" ließ sich nicht in einem Blick beantworten — 15 Min Query über Notion + memory/ nötig.
- Ein einziges Backlog mit harten Dependencies macht die Antwort trivial: Layer N ist blockiert bis L<N-1> grün, innerhalb Layer beliebig.
- Layer-Sortierung (statt Prio) bildet echte Abhängigkeiten ab — Prio ist Gefühlssache, Dependency ist Fakt.

### Auswirkungen

- **Code:** Neue Datei `memory/backlog.md` (5 Layer, Spalten Prio + Aufwand + Quelle + Dependencies).
- **Prozess:** Bei jeder Session-End-DISTILL ggf. `backlog.md` aktualisieren (neue Items einsortieren, fertige streichen, Dependency-Verschiebungen tracken).
- **Team:** Claude ist Owner für Layer 1-4 (technical), Anil Owner für L0 (externe Tasks).

### Alternativen erwogen

- **Prio-sortiert (P0/P1/P2):** Verworfen — Prio ist kontext-abhängig und kann mehrere Items blockieren die sich gegenseitig nicht blockieren.
- **Nur Notion-Kanban:** Verworfen — Notion ist keine durchsuchbare Referenz in Sessions und Mobile-Edit ist träge.
- **Im `next-session-briefing`:** Verworfen — das File ist session-spezifisch, nicht persistent-langfristig.
- **Kanban + `memory/backlog.md` parallel:** Pragmatisch übernommen — Notion für externes Tracking + Daily-View, `backlog.md` für Claude-internal-Planning. Sync nur wenn relevanter Shift passiert.

### Re-Visit-Trigger

Wenn `backlog.md` >50 Items enthält oder Layer-Hierarchie unhandlich wird → in Unter-Files pro Theme splitten (`backlog-tech.md`, `backlog-revenue.md`).

---

## D11 — ARCHITECTURE: Supabase Reconcile-Trust-Model — Follow skipt, Unfollow behält

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

In optimistic-UI-Patterns mit Supabase, nach erfolgreichem DB-Write:
- **Follow / Add-Path (deterministisch):** KEIN Reconcile via `.select()`. Optimistic-State ist komplette Wahrheit (wir kennen die Daten die wir geschrieben haben).
- **Unfollow / Remove-Path + Side-Effects:** RECONCILE via `.select()`. Server-seitige Effekte (Primary-Promotion, Cascade-Deletes, Trigger) sind für Client nicht vorhersagbar.

Gilt für alle Provider die via pgBouncer-transaction-pooling lesen (alle Supabase-JS-Clients).

### Begründung

- Slice 138 Live-Test entdeckte: `getUserFollowedClubs` direkt nach erfolgreichem `upsert` liefert den neuen Row manchmal nicht zurück → `setFollowedClubs(server-truth)` überschreibt Optimistic → UI reverted sichtbar. Nach Refresh ist alles korrekt.
- Ursache: Supabase pgBouncer transaction-pooling — Write committed auf Connection A, immediate Read auf Connection B kann pre-commit-state sehen.
- Folge: Blind-Replace mit Server-Read ist ein Risiko ohne Informationsgewinn, wenn Client-State bereits deterministisch ist.
- Für Unfollow ist Reconcile echter Wert: `toggleFollowClub` transfert den `is_primary`-Flag zu einem unpredictable next-Club — nur Server-Read bringt diese Info.

### Auswirkungen

- **Code:** Slice 139 — `src/components/providers/ClubProvider.tsx` conditional Reconcile (follow skipt, unfollow behält).
- **Prozess:** Bei neuem Provider-State-Management (Community-Follows, Friends, Inventory): gleiche Regel anwenden.
- **Rules:** `common-errors.md` Section 2 → „pgBouncer Read-After-Write Transient" Pattern dokumentiert.
- **Tests:** `ClubProvider.test.tsx` enthält Regression-Guards für beide Pfade.

### Alternativen erwogen

- **Reconcile mit 100-300ms Delay:** Verworfen — pragmatisch aber hacky. Trifft nicht den Root-Cause (Connection-Scheduling ist nicht deterministisch, Delay kann zu kurz oder zu lang sein).
- **Merge-Strategy (Optimistic ∪ Server):** Verworfen — komplex, erfordert per-Field-Merge-Logic, und Cross-Tab-Sync wird schwieriger.
- **service_role-Read für Reconcile:** Verworfen — bricht RLS-Semantik, nur für Admin-Routes OK.
- **Retry mit expected-clubId check:** Verworfen — exponentieller Code-Aufwand, deckt aber nur Follow-Case ab. Skip ist einfacher.
- **Komplett auf Optimistic-Only umstellen:** Verworfen — Unfollow braucht Server-Truth für Primary-Promotion.

### Re-Visit-Trigger

Wenn Supabase pgBouncer auf session-pooling oder direct connection wechselt → Reconcile kann wieder read-your-write garantieren, skip ist dann optional statt nötig. ODER: Wenn Cross-Tab-Sync wichtig wird (z.B. User in 2 Tabs, Tab A followt, Tab B muss aktualisieren) → brauchen wir realtime-subscription, nicht reconcile.

---

## D12 — ARCHITECTURE: Cron-Completion-Guards basieren auf DB-Truth, nicht API-Response-Count

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Cron-Jobs die „alle X sind fertig"-Semantik haben (Phase-B in gameweek-sync, future sync-jobs, reconciliation-jobs) MÜSSEN ihre Completion-Guards gegen **DB-Truth** prüfen, nicht allein gegen **externe API-Response-Count**. Externe APIs können Rows silent droppen (postponed, cancelled, data-quality-issues) — die DB bleibt Ground-Truth für „haben wir alle Rows für diesen Zustand".

Konkret: `allFixturesDone = apiAllDone && dbTruthAllDone`, wobei `dbTruthAllDone = (dbFinishedIds.size + newlyFinishedFixtures.length >= totalDbFixtures)`.

### Begründung

- Slice 140 Root-Cause: `gameweek-sync` vertraute `fixtureCheck.allDone = API.total === API.finished`. API-Football dropped 4 von 9 Süper-Lig-Fixtures (postponed) → allDone=true → Phase B advanced Clubs → 4 Fixtures unerreichbar.
- Symptom sichtbar auf `/clubs` 30-60h später (Slice 137). Root-Cause 2 Tage versteckt, weil gameweek-sync Logs als „Skipped: No fixtures past kickoff" harmlos aussahen.
- Regel gilt transitiv: jeder Cron der aufgrund einer Completion-Check-weiterspringt (GW-advance, Liga-Rotation, Season-Rollover), muss DB-Count mit einbeziehen.

### Auswirkungen

- **Code:** Slice 140 — `src/app/api/cron/gameweek-sync/route.ts` Phase-B-Guard.
- **Prozess:** Bei neuen Cron-Routes (z.B. season-end-rollover, bounty-close-batch): Guard-Pattern aus common-errors.md übernehmen.
- **Rules:** `common-errors.md` Section 1 → „Cron-Guard API-Response-Count vs DB-Count" Pattern dokumentiert.
- **Monitoring:** `logStep 'phase_X_blocked_db_mismatch'` bei Divergenz → admin sieht cron_sync_log → manuelle Intervention möglich (sync-fixtures-future oder SQL-cleanup).

### Alternativen erwogen

- **Blind der API vertrauen:** Verworfen — Slice 140 zeigte wie das silent-data-lost verursacht.
- **Cron bei jedem Discrepancy-Fall hart failen:** Verworfen — ein einziges postponed Match würde Phase B für alle Ligen blockieren. Partial-Processing + Log-Warning ist besser.
- **Nur postponed-Status-Handling in gameweek-sync einbauen:** Zu eng. Das Pattern ist breiter (gilt für alle Cron-Guards).
- **Separate reconciliation-cron pro Entity:** Verworfen — verdoppelt Code. Guard-Pattern im existing Cron ist minimal-invasiv.

### Re-Visit-Trigger

Wenn API-Football-Reliability > 99.9% erreicht wird (keine silent drops mehr), könnten wir API-Response-Counts wieder direkt trusten. Unwahrscheinlich kurzfristig.

---

## D13 — PROCESS: Reviewer-Agent als Pflicht-Stage nach BUILD (6-Stufen-SHIP-Loop)

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** Implizite Reviewer-ist-optional-Politik der 5-Stufen-SHIP-Loop

### Entscheidung

Zwischen BUILD und PROVE wird REVIEW als eigenständige Stage eingeführt. Bei jedem feat/fix/refactor-Slice ab S-Größe muss ein Reviewer-Agent (Cold-Context, `subagent_type: "reviewer"`) dispatched werden und einen Review nach `worklog/reviews/<slice>-review.md` schreiben. Hook `ship-cto-review-gate` blockt Commits ohne Review-File.

Loop: SPEC → IMPACT → BUILD → **REVIEW** → PROVE → LOG.

### Begründung (Session-Self-Assessment 2026-04-22)

- In 5 konsekutiven Slices (137-142) wurde Reviewer-Agent nie dispatched.
- Bestehender `ship-cto-review-gate` Hook war tot: checkte `status="active"` — dieser Wert existiert nie im SHIP-Loop.
- Claude-Primary hat Blindspots (eigener Context ≠ Cold-Context-Prüfung). Commit-Message + eigene Tests sind keine Code-Review.
- Session-Bewertung: "Output gut (7 Commits), aber Discipline-Gaps ziehen Note auf 2-." Reviewer-Agent ist die größte der 10 identifizierten Gaps.

### Auswirkungen

- **Hook:** `.claude/hooks/ship-cto-review-gate.sh` rewrite (warn→strict-block, heredoc-exempt entfernt).
- **Workflow:** `.claude/rules/workflow.md` Loop 5→6 Stufen, REVIEW-Stage 3b dokumentiert.
- **Filesystem:** `worklog/reviews/` Directory neu.
- **Active.md:** neuer `review:` Key, parallel zu `proof:`.
- **Prozess:** Bei Agent-Dispatch wird Reviewer Schreibpfad explizit genannt. Read-Only-Reviewer (ohne Write) liefert Content inline → Primary-Claude legt File an.

### Alternativen erwogen

- **Hook als Warn statt Block:** Verworfen — wurde 5 Slices ignoriert. Nur Hard-Gate erzwingt Discipline.
- **Reviewer nach PROVE:** Verworfen — REWORK braucht evtl. Code-Change der erneuten Proof erfordert. REVIEW→PROVE-Order minimiert Rework-Zyklen.
- **Reviewer Pflicht auch für XS:** Verworfen — Trivial-Fixes haben Review-Cost > Nutzen. XS-Opt-Out via `touch worklog/reviews/<slice>-review.md` oder `review: skipped (Grund)` in active.md.
- **Automatischer Reviewer-Dispatch via Hook:** Verworfen — Hooks können keine Agent-Tools triggern (nur Claude-Prozess). Primary-Claude muss explicit dispatchen.

### Re-Visit-Trigger

Nach 20+ Slices mit REVIEW-Stage: Empirische Auswertung, wie viele REWORK-Verdicts echte Bugs gefunden haben. Wenn <5% → evtl. Gate auf M-Size einschränken. Wenn >20% → REVIEW in XS-Slices auch aktivieren.

---

## D14 — ARCHITECTURE: TM-Squad-Page-Strategie statt Search-Profile-Pattern für Player-Sync

**Datum:** 2026-04-22
**Status:** ⚠️ Trial (Slice 144 erst 1× Full-Run durchlaufen)
**Supersedes:** Implizite Strategie via `transfermarkt-search-batch` + `sync-transfermarkt-batch` (Slice 068/069)

### Entscheidung

Neuer Player-Sync-Weg: Pro Club 1 Request auf `https://www.transfermarkt.de/<slug>/startseite/verein/<tm-club-id>` liefert komplette Squad (20-30 Players) mit Shirt + Position + MV + Nationality direkt aus der Squad-Tabelle. Ersetzt perspektivisch den 2-Request-per-Player-Flow des alten Scrapers.

Pre-Condition (Slice 141b): `club_external_ids(source='transfermarkt')` für alle 134 Clubs gefüllt.

### Begründung

- Alter Flow: ~5000 Players × 2 Requests = ~10.000 Requests/Sync-Zyklus. Vercel-Hobby-Timeout hart, Cloudflare-Block permanent, TM-Rate-Limit gefährdet.
- Neuer Flow: 134 Clubs × 1 Request = **75× weniger Netzwerk-Last**.
- Garantierte Club-Zuordnung (keine Fuzzy-Match-False-Positives wie in Search-Flow).
- Erst nach Slice 141b möglich (134/134 TM-Club-IDs gemappt).
- Slice 144 Full-Run: 134/134 clubs, 2841 matched, 22 shirt-drift updated, 0 errors, 12.8 min.

### Auswirkungen

- **Code:** `src/lib/scrapers/transfermarkt-squad.ts` + `scripts/tm-squad-scrape-local.ts` + Migration `players.last_squad_check TIMESTAMPTZ`.
- **Deprecation-Plan:** Alter `transfermarkt-search-batch` bleibt bis Squad-Scraper im Production-Cron läuft. Sync-Tasks die neue Players importieren bleiben bei API-Football (`sync-players-daily`) — Squad-Scraper ist Update-Tool, kein Insert-Importer.
- **Scope-Decision (Anil 2026-04-22 Option A):** Leihspieler zählen als Squad-Member des Leih-Clubs (nicht Stammverein).

### Alternativen erwogen

- **Bei Search-Scrape bleiben:** Verworfen — kostet 75× mehr Requests, weniger robust gegen Cloudflare-Blocks.
- **API-Football als einzige Truth:** Verworfen — API-Football liefert keine Marktwerte, nur Shirts+Positions. TM als MV-Quelle bleibt unverzichtbar.
- **TM-Profile-Page (einzeln) behalten:** Wird für Contract-End + Nationality nachträglich weiter genutzt (Squad-Page hat kein Contract). Hybrid-Strategie.

### Re-Visit-Trigger

- Wenn TM Squad-Table-HTML umgestellt wird (analog Slice 078 MV-Markup-Migration): Parser muss adaptiert werden.
- Wenn `sync-players-daily` (API-Football) retired wird: Squad-Scraper müsste Insert-Pfad übernehmen.
- Wenn Production-Cron für Squad-Scraper gesetzt wird: Vercel-Pro-Upgrade oder Proxy-Service evaluieren.

---

## D15 — PROCESS: Shell-case auf COMMAND-Strings MUSS command-token-anchorn

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Jedes `case "$COMMAND" in *"<token>"*)`-Pattern in `.claude/hooks/` (oder generell PreToolUse-Hooks die JSON-Command-Strings parsen) MUSS:

- Start-of-Command anchorn (z.B. `"git merge"|"git merge "*)`) statt Substring-Match.
- Bei Flag-Check (`--amend`, `--force`, `-i`): quoted-Content erst strippen (`UNQUOTED=$(sed 's/"[^"]*"//g; s/'\''[^'\'']*'\''//g')`), dann Substring-Match auf UNQUOTED.
- Keine `*"<english-word>"*` Patterns weil Commit-Messages das Wort als Text enthalten können.

Zusätzlich: `grep -oE` in Hook-MSG-Extraktion darf KEIN `\b`-word-anchor nutzen, weil JSON-escaped Heredoc (`\nfeat(...`) ein Literal `n` vor `feat` hat — word-char blockiert `\b`. Stattdessen `[(:]`-Suffix oder `[^a-zA-Z_]`-Lookbehind.

### Begründung

Slice 146 Cold-Context-Review fand 4 Bugs derselben Klasse in 2 Gate-Hooks:

1. `*"merge"*` matched `fix(api): prevent merge conflict` → false-exempt
2. `*"--amend"*` matched `fix(docs): add --amend help` → false-exempt
3. `*"git commit"*` matched bash-test-scripts mit Fixture-Strings → false-trigger
4. `\b(feat|fix|refactor)` failed bei JSON-escaped Heredoc → review-gate-Backdoor für alle Heredoc-Commits silent exempt

Primary-Claude hatte in Slice 145 die ersten beiden Patterns als "trivial copy" klassifiziert und den `\b`-Bug komplett verpasst — Reviewer-Agent fand es, weil Cold-Context keinen Tunnel-Vision-Bias hatte. Das validiert D13 (REVIEW als Pflicht) empirisch beim ersten Live-Test.

Regel ist verallgemeinerbar auf alle Shell-Hooks die User-Commands parsen, nicht nur Commit-Gates.

### Auswirkungen

- **Code:** `.claude/hooks/ship-proof-gate.sh`, `.claude/hooks/ship-cto-review-gate.sh` in Slice 146 gefixt. Audit-Kandidaten: alle anderen `.claude/hooks/*.sh` die `case "$COMMAND"` nutzen.
- **Prozess:** Bei jedem neuen Hook der PreToolUse.Bash parst: dieses D15-Muster Pflicht in Code-Review-Checklist.
- **Test-Coverage:** Hook-Test-Suites müssen "message-contains-token-as-text"-Regression-Cases abdecken (siehe `worklog/proofs/146-hook-test.txt` Case B/H/I/L als Template).
- **Team:** Eintrag in `.claude/rules/common-errors.md` Section 8 als "Shell case-statement wildcard promiskuös" (erweitert) + neuer Entry "grep `\b` broken bei JSON-escaped Heredoc".

### Alternativen erwogen

- **Rein auf Convention verlassen (kein Gate-Hardening):** Verworfen — Slice 145 hat gezeigt dass der Backdoor aktiv genutzt wurde (heredoc-Commits umgingen review-gate silent).
- **Full JSON-Parser in Shell (jq):** Verworfen — Windows Git Bash hat jq nicht garantiert, sed/grep reicht mit korrekten Pattern-Anchors.
- **Hook in Node/Python rewriten:** Verworfen — Performance-Overhead bei jedem PreToolUse-Event, Bash-Hooks bleiben Standard im Codebase.

### Re-Visit-Trigger

- Wenn weiterer Bug derselben Klasse auftaucht (Hook exempt durch Command-Substring-Match): sofort auditieren. Pattern ist bekannt und fixable.
- Wenn neue Gate-Hook-Kategorien hinzukommen (z.B. spec-gate auf nicht-Bash Tools): Regel verallgemeinern.

---

## D16 — ARCHITECTURE: Scraper-null-Policy — always write null statt old-value keep

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Wenn ein Scraper-Parser `null` returnt (Source-Feld fehlt im externen HTML), MUSS der DB-Write den alten Wert mit `null` überschreiben — nicht belassen. Policy für alle `scripts/tm-*` und ähnliche Scraper:

```ts
// FALSCH (data-liar):
if (contract !== null) updates.contract_end = contract;

// RICHTIG (honest):
updates.contract_end = contract; // null = Source has no current value
```

### Begründung

Slice 144f hatte die alte Policy: `tm-rescrape-stale.ts` setzte `mv_source='transfermarkt_verified'` nach erfolgreichem Scrape, schrieb aber `contract_end` nur bei parser-success. Bei 3 Werder-Players (Lynen/Pieper/Stark) hatte TM-Profile **0 "Vertrag bis"**-Occurrences → parser returnt null → alte DB-Werte aus 2022-2023 blieben → UI zeigte "Vertrag bis 2022-07-01" trotz `verified`-Flag.

Debug-Evidence (`tmp/144g-contract-debug.ts`): Parser ist funktional korrekt. Die 3 Spieler haben im TM-Profil-HTML tatsächlich kein aktuelles Contract-Ende. `null` ist semantisch ehrlich — alte historische Importe (pre-Slice 144f) zu belassen erzeugt **permanente Data-Liar-Akkumulation**, die nur durch manuelle Fixes heilt.

INV-38 (contract_end < cutoff AND mv_source != stale) wurde durch 144f aktiv verletzt bei diesen 3 Playern (verified + 2022-07-01). Nach 144g-Fix: null-values sind vom IS-NOT-NULL-Filter implizit ausgeschlossen → Invariant heilt automatisch.

### Auswirkungen

- **Code:** `scripts/tm-rescrape-stale.ts:271` Line-Change (Slice 144g commit `a487a93b`). Consumer-Chain 12x null-safe verifiziert (calcContractMonths returns 0, PerformanceTab gated via `>0`).
- **Prozess:** Bei jedem neuen Scraper/Parser-Consumer die DB-Write macht: `null`-als-valid-Output vom Source einplanen, nie "keep old" als Default.
- **Pattern → common-errors.md Section 9:** "Scraper null-Policy — always write null on missing source field. Keep-old = permanent data-liar."
- **Tests:** DB-Invariants (INV-38) dienen als Regression-Detector wenn Policy wieder bricht.

### Alternativen erwogen

- **Conservative-Mode als default ("keep old, set verified"):** Verworfen — erzeugt stille Datenlügen, die nur manuell heilen. Bei 3 Players schon user-sichtbar falsch.
- **Separate `contract_source` Column analog `mv_source`:** Verworfen — Migration-Overhead, und Policy "null = missing" ist genau diese Information kompakter.
- **Parser-Tweak (versuche andere Patterns wenn primary fehlt):** Verworfen — Parser ist korrekt, die 3 Players haben wirklich kein "Vertrag bis" in TM. Mehr Pattern würde false-positives einbringen.

### Re-Visit-Trigger

- Wenn ein neuer Scraper-Konsument auftaucht der absichtlich "keep old" Policy braucht (z.B. Multi-Source-Merge mit TM als Tertiärquelle): dann Opt-out-Flag einbauen und D16-Policy bleibt Default.
- Wenn parser-unsafe für bestimmte Feld-Typen (z.B. numerische 0 vs null-Verwirrung): Entry erweitern um Feld-Typ-Distinction.

---

## D17 — ARCHITECTURE: useSafeMutation als Standard-Primitive für alle Mutations

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Alle neuen Mutation-Handler (feature oder migration) MUESSEN `useSafeMutation` aus `src/lib/hooks/useSafeMutation.ts` nutzen, nicht `useState(loading)` + `async handleX`. Kein `useRef`-Mutex-Custom-Build — useSafeMutation wraps React Query v5 useMutation mit synchronem Pending-Guard via `safeTrigger(variables)` + Auto-Toast via `errorToast` + Sentry via `errorTag`.

### Begründung

Slice 150 Audit (User-Report Slice 149 "Follow-Button loest mehrfach aus"): 63 React-Components hatten das `setState(loading)`-Pattern, nur 4 nutzten `useMutation`. React-setState ist async — Race-Window zwischen `if (loading) return` und `setLoading(true)`. Pragmatisch + projekt-konsistent ist ein shared Primitive der React Query's `isPending` (synchron im Observer) ausnutzt plus Toast-Integration einheitlich macht.

Primitive in Slice 151a etabliert, 2 Piloten in 151b (useClubActions / Follow) + 151c (MembershipSection / Subscribe) migriert — beide race-safe, 20 neue Tests green.

### Auswirkungen

- **Code:** `src/lib/hooks/useSafeMutation.ts` ist canonical. Generic-Order matched React Query v5: `<TData, TError, TVariables, TContext>`. Intersection-type (nicht interface-extends) weil `UseMutationResult` in v5 discriminated-union ist.
- **Prozess:** Neue Mutations → useSafeMutation. Legacy-Migration via Slice-per-File. ESLint-Rule `no-restricted-syntax` (warn) gegen `onClick={async ...}`. Audit-Script `npm run audit:mutation-race` zeigt migration-candidates + prueft Baseline.
- **Pattern → common-errors.md D18:** "React setState Race in Mutation-Handler" mit Migration-Plan-Reference.

### Alternativen erwogen

- **`useRef`-Mutex pro Component custom:** Verworfen — inkonsistent, dupliziert in jeder Stelle, keine Toast-Integration, keine Sentry-Integration.
- **`<AsyncButton>` Component:** Verworfen als Primary-Pattern — Hook-Level ist flexibler (andere Call-Sites als Button), Component-Wrapper als Phase-6-Option fuer legacy-safe-spot-migration.
- **Direkter useMutation ohne Wrapper:** Verworfen — jede Call-Site wuerde Toast + Sentry + safeTrigger neu bauen. Shared Primitive macht das einmal zentral.

### Re-Visit-Trigger

- Bei React Query v6 Upgrade: Generic-Order + MutationObserver-Interna neu verifizieren.
- Wenn `<AsyncButton>` Component-Wrapper-Pattern sich als besser erweist (empirisch nach Slice 152-160): Primitive bleibt, Component als zusaetzliche Layer.

---

## D18 — ARCHITECTURE: Money-RPC Idempotency-Window als Pflicht-Pattern

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Jeder Money-RPC der Wallet-Deduct + Domain-INSERT kombiniert MUSS einen Idempotency-Pre-Check mit kurzem Window (typisch 60 Sekunden) VOR der Wallet-Deduction haben. Client-Guard (useSafeMutation safeTrigger) ist Defense-in-Depth — **nicht authoritativ**. Server-side Network-Retry umgeht den Client-Guard.

### Begründung

Slice 151c.2 Reviewer-Agent identifizierte echten Money-Path-BLOCKER in `subscribe_to_club` RPC: Wallet-Deduction passierte UNCONDITIONAL vor `ON CONFLICT`-Check auf `club_subscriptions`. Szenario: Call #1 (T+0) Balance 1M → -50K → 950K. Call #2 (T+1, network-retry bei Mobile-Switch) Balance 950K → -50K → 900K. Subscription-Row via ON CONFLICT saved von Duplicate, aber **Wallet 2x deducted für 1 Subscription** — direkter Geld-Verlust bei 3-Tester-Beta realistisch (Mobile-Netzwerk).

Fix-Pattern in `20260423190000_slice_151c2_subscribe_idempotency.sql` live deployed:
```sql
IF FOUND THEN
  IF v_existing.tier = p_tier AND v_existing.started_at > NOW() - INTERVAL '60 seconds' THEN
    RETURN jsonb_build_object('success', true, 'idempotent_retry', true, ...);
  END IF;
  -- tier-change / older: Upgrade/Downgrade-Flow
END IF;
```

### Auswirkungen

- **Migration-Standard:** Jede neue Money-RPC-Migration ab Slice 151c.2 hat Pre-Check-Early-Return.
- **Audit vor Migration:** `SELECT pg_get_functiondef('rpc_name'::regproc);` VOR useSafeMutation-Migration. Ohne Server-Hardening ist Client-Migration nur halbe Wahrheit.
- **Betroffene RPCs (Audit pending):** `subscribe_to_club` (DONE 151c.2), `renew_club_subscription`, `buy_player_dpc`, `open_mystery_box`, `liquidate_player`, `withdraw_club_balance`, `createOffer`/`acceptOffer`. Slice 152+ jede einzeln pruefen.
- **Pattern → common-errors.md:** Subsection unter D18 — "Money-RPC Idempotency-Window".

### Alternativen erwogen

- **UNIQUE-Constraint + ON CONFLICT DO NOTHING als Idempotency-Quelle:** Verworfen als alleinige Strategie — Wallet-Deduction passiert trotzdem vor ON CONFLICT check in current subscribe_to_club. Muss mit Pre-Check kombiniert werden.
- **Idempotency-Key Pattern (client-generated UUID):** Verworfen fuer Slice 151c.2 — substantieller Refactor (API-change + DB-column), nicht Beta-Launch-ready. Kandidat fuer Phase 6 Production-Hardening.
- **Client-only Guard reicht:** Verworfen — Browser-Retry (fetch auto-retry bei Network-Timeout) + Mobile-Switch umgehen jeden Client-Guard. Defense-in-Depth Pflicht.

### Re-Visit-Trigger

- Wenn 60s-Window zu kurz fuer Legitimate-Retry-Scenarios (e.g. offline-queue bei Mobile): auf 120s oder 300s erhoehen, abhaengig von Business-Context.
- Bei Scale (>1000 subscriptions/Tag): Idempotency-Key-Pattern bauen (cleaner, performance-aware). Dann D18 → 📦 Superseded.

---

## D19 — PROCESS: Cron-Route-Registry (jede route.ts MUSS in vercel.json)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** "MANUAL-ONLY wegen Hobby-Plan"-Pattern aus pre-2026-04 (Projekt ist Pro-Plan)

### Entscheidung

Jede `src/app/api/cron/*/route.ts` MUSS entweder (a) in `vercel.json.crons` mit explicit schedule ODER (b) als `MANUAL-ONLY` dokumentiert mit Klaus-Owner + Dokumentation warum nicht automatisch. "Existiert in trigger-cron-whitelist aber nicht in vercel.json" ist stille Daten-Drift-Quelle.

### Begründung

Slice 149c (Anil-Report "Gala hat 71 Punkte, UI zeigt 68"): `sync-standings` existierte als Route + Admin-Trigger-Whitelist aber war seit 2026-03 nicht in vercel.json crons. Niemand triggerte manuell → league_standings 4 Tage stale. Slice 149d Follow-up: `sync-fixtures-future` (6 Tage stale, 294 rows) + `sync-transfers` (NIE gesynced, 0 rows) hatten dasselbe Problem. Alle 3 routes hatten Header-Kommentar "MANUAL-ONLY wegen Hobby-Plan" — aber Projekt ist laengst Pro (6 Crons aktiv bereits).

Audit-Command (7 Zeilen Shell):
```bash
ls src/app/api/cron/ | while read d; do
  grep -q "\"path\": \"/api/cron/$d\"" vercel.json || echo "MISSING: $d"
done
```

### Auswirkungen

- **vercel.json:** jetzt 9 crons (alle src/app/api/cron-Routes registriert).
- **Schedule-Layout konfliktfrei:** 1,2,3,4,5,6,12 Uhr-Slots (Stand Slice 149d). Rate-aware: transfers weekly (134 API-Calls), rest daily.
- **Route.ts-Convention:** Header-Kommentar MUSS Schedule nennen ODER explicit "MANUAL-ONLY mit Begruendung" flaggen.
- **CI-Gate-Kandidat:** Audit-Command als Pre-Commit-Hook oder GH-Actions Check.

### Alternativen erwogen

- **MANUAL-ONLY als Default:** Verworfen — erzeugt Drift ohne Owner-Warning.
- **Automatisches Cron-Scheduling via File-Naming-Convention:** Verworfen — vercel.json ist Vercel-Canonical, Sync-Layer waere Redundanz.

### Re-Visit-Trigger

- Wenn Cron-Slots knapp werden (Vercel Pro hat 40 cron/day limit): Schedule-Optimierung + weekly-Consolidation.

---

## D20 — ARCHITECTURE: Query-Cache ist Single-Source-of-Truth fuer Server-Daten, Provider NUR fuer UI-State

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Server-Daten (Wallet-Balance, Follower-Listen, Holdings, etc.) werden ausschliesslich via React-Query-Cache verwaltet. Provider-Komponenten (React-Context) sind reserviert fuer **UI-State** (activeClub, modal-open, selected-tab) — niemals fuer Server-Daten als Duplikat.

Konkret eliminiert:
- **ClubProvider.followedClubs/primaryClub/isFollowing/toggleFollow** → `useFollowedClubs` + `usePrimaryClub` + `useToggleFollowClub` (151b-RESET, commit 04b4492f)
- **WalletProvider komplett** → `useWallet` + 4 Helpers `setWalletBalance/setWalletLockedBalance/invalidateWallet/removeWalletFromCache` (152a-d, commits 753e8f83 / 0e10fe12 / a59a7209 / 78c7f409)

ClubProvider verbleibt mit `activeClub/setActiveClub/loading` — reiner UI-State. Kein anderer Provider hat noch Server-Daten-Spiegel.

### Begruendung

State-Sync-Audit 2026-04-23 (commit f0cfbc6b) identifizierte 5 Anti-Pattern-Klassen auf 18 Features. Klasse A (Dual-State-Drift) und Klasse C (Zwei-Provider) machten zusammen 40% der Findings aus und waren direkte Ursache fuer Anil's User-Report "Follow-Button zeigt mal 0, mal 4 Scouts, wackelt, nicht synchron".

Single-Source-of-Truth eliminiert die Drift-Klasse systematisch:
- Optimistic-Update via `setQueryData` ist atomar, jeder Consumer sieht exakt denselben Wert.
- Kein `useState`-Spiegel der mit `useQuery` divergieren kann.
- Cross-Consumer-Sync (Sidebar + Button + Hero auf derselben Page) funktioniert ohne Sync-Logik.

### Auswirkungen

- **Code:** 465 LOC netto entfernt (207 LOC WalletProvider + 207 LOC dessen Test + ClubProvider-Shrink 127 LOC). Ersetzt durch ~220 LOC neue Query-Hooks.
- **Prozess:** Neue Pattern-Regel in `.claude/rules/` — "Kein Provider fuer Server-Daten". ESLint D18b (Slice 160 Backlog) soll `useState` parallel zu `useQuery`-Key als Error flaggen.
- **Team:** Slice 153-158 wenden dieselbe Regel auf `useProfileData` (Follower/Following), `usePlayerTrading` (15 useStates), `useEventActions` (parallel-state) an.

### Alternativen erwogen

- **Provider behalten + Query-Sync-Bridge:** Verworfen — Dual-Ownership bleibt, jeder Mutation-Pfad muss beide Layer updaten. Gleiche Drift-Klasse, nur mit mehr Code.
- **Zustand-Store als Alternative zu React-Query:** Verworfen — beScout nutzt React-Query bereits durchgaengig. Zweiter Store waere erneut Dual-Ownership.
- **Provider-First wie Sorare (beobachtet):** Verworfen — Sorare hat auch inzwischen auf React-Query migriert. Peer-Confirm fuer die Richtung.

### Re-Visit-Trigger

- Wenn React Query v6 das Cache-Modell grundsaetzlich aendert.
- Wenn ein UI-State (z.B. aktiver Tab) Server-Persistenz braucht → dann nur fuer diesen Fall, nicht als globales Re-Einfuehren von Server-Providern.

---

## D21 — ARCHITECTURE: Ferrari-Blueprint-Pattern fuer alle Mutations (pgBouncer-safe onSuccess/onSettled-Split)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Jede Mutation in beScout folgt **exakt** diesem Muster (Referenz-Implementation: `src/lib/hooks/useToggleFollowClub.ts` aus Slice 151b-RESET):

```ts
const mut = useSafeMutation<TData, Error, TVars, RollbackContext>({
  mutationFn: async (vars) => { /* RPC-Call */ },
  onMutate: async (vars) => {
    await Promise.all([ /* cancelQueries × n */ ]);
    const ctx = { /* snapshot × n */ };
    /* setQueryData optimistic × n */
    return ctx;
  },
  onError: (_err, vars, ctx) => { /* rollback aus ctx */ },
  onSuccess: (result) => {
    /* setQueryData(deterministic-server-response) */
    /* NICHT invalidateQueries hier! */
  },
  onSettled: () => {
    /* invalidateQueries NUR fuer non-deterministic Keys */
  },
  errorToast: t('...'),
  errorTag: 'domain.action',
});
```

**Kritisch:** `invalidateQueries` im `onSettled`, nicht `onSuccess`. Gruende: pgBouncer-Read-After-Write-Transient (Slice 139) — wenn `setQueryData` und `invalidateQueries` im selben Microtask laufen, ueberschreibt der Invalidate-Refetch den deterministischen Write mit Stale-Row.

### Begruendung

Slice 152c Reviewer-Agent (Commit a59a7209) fand genau dieses Anti-Pattern 2× als HIGH-Finding in meiner initialen Migration: `invalidateWallet(queryClient)` stand im `onSuccess` direkt nach `setWalletBalance`. Ich hatte das pgBouncer-Pattern in `useWallet.ts:200` selbst dokumentiert und trotzdem falsch migriert. Cold-Context-Review fing die Blaupause↔Impl-Diskrepanz.

Zwei Referenz-Implementationen existieren jetzt:
- **`useToggleFollowClub`** — Single-Mutation mit 3-Key-Cascade (isFollowing + follower-count + followed-list), `onSettled` invalidate nur fuer non-deterministic `followedByUser`.
- **`useWallet` + Helpers** — Cross-Mutation-Shared-State-Pattern. Trading-Hooks nutzen `setWalletBalance(qc, uid, result.new_balance)` im `onSuccess` und `invalidateWallet(qc)` im `onSettled`.

### Auswirkungen

- **Code:** 151b-RESET + 152c setzen den Standard. Slice 153 (usePlayerTrading Ferrari-Refactor) + 156-158 muessen dieses Pattern anwenden.
- **Prozess:** Reviewer-Agent-Briefing bei Money-Path-Slices enthaelt explizit "Jede Abweichung zu useToggleFollowClub/useWallet ist ein Finding".
- **Team:** Pattern wird Slice 160 (Norm-Codification) in `.claude/rules/mutations.md` einziehen + ESLint-Rule + `scripts/audit-mutation-pattern.sh`.

### Alternativen erwogen

- **Alles in onSuccess:** Verworfen — 152c-Review fand genau dieses Anti-Pattern als HIGH. pgBouncer-Race ist real.
- **Kein Optimistic (nur invalidate nach Success):** Verworfen — UI wartet Round-Trip, "mal 0, mal 4 scouts"-Symptom (User-Report 2026-04-23) kehrt zurueck.
- **setQueryData nur, kein invalidate:** Verworfen — non-deterministic Felder (Server-timestamps, DENSE_RANK promote-primary-Logik) drifted ohne Reconcile-Roundtrip.

### Re-Visit-Trigger

- Bei React Query v6-Migration: Pattern gegen neue API pruefen.
- Bei Supabase-Connection-Pool-Wechsel (von pgBouncer auf Supavisor): Pattern evaluieren — Commit-Fenster-Timing kann anders sein.

---

## D22 — PROCESS: Sub-Slice-Gating fuer Provider-Elimination (Foundation → Read → Mutation → Delete)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Provider-Eliminationen (aktuell: WalletProvider 152a-d, zukuenftig: ggf. andere) werden in **4 Sub-Slices** gebaut:

- **Sub-a — Foundation:** Neuer Query-Hook + Helpers + TDD-Tests. Keine Consumer-Aenderung. **Self-Review reicht.** Rollback-trivial.
- **Sub-b — Welle 1 Read-only Consumer:** Import-Swap, keine Behavior-Aenderung. **Self-Review reicht.**
- **Sub-c — Welle 2 Mutation-Consumer:** API-Swap (alte Provider-Methoden → neue Helper). **Reviewer-Agent pflicht** (Money-Path-Behavior-Change).
- **Sub-d — Welle 3 Provider-Delete + Test-Mocks:** Provider-File entfernen, Tree schrumpfen, Test-Mock-Pfade migrieren, AuthProvider-signOut-Check. **Reviewer-Agent pflicht** (Cross-Cutting).

### Begruendung

Slice 152 haette als Big-Bang-Commit 22 non-test + 5 test Files in einem Rutsch aendern muessen. Problem:
1. **Review-Kosten:** Reviewer-Agent muss 20+ verschiedene Aenderungs-Patterns in einem Diff beurteilen → Findings gehen unter.
2. **Rollback-Kosten:** Ein Bug irgendwo → kompletter `git revert` zerstoert auch die sauberen 18 Files.
3. **Deploy-Risiko:** Money-Path-Bug betrifft alle Trading-Flows gleichzeitig → keine partial-Rollback-Option.

Evidenz aus 152c:
- Reviewer-Agent fand 2 HIGH + 1 MEDIUM **genau weil** der Diff nur auf Mutation-Handlern fokussiert war.
- Fix war in 5 Minuten moeglich und wurde inline vor Commit gemacht.
- Big-Bang-Variante haette entweder die Findings verloren oder den Fix-Zyklus ueber 20+ Files treiben muessen.

### Auswirkungen

- **Code:** Slice 152 hat 4 Commits (753e8f83 / 0e10fe12 / a59a7209 / 78c7f409) statt 1.
- **Prozess:** Pattern ist Backlog-Referenz fuer zukuenftige Provider-Eliminationen. Reviewer-Agent-Gate-Regel: pflicht bei Mutation-Sub-Slice (c) + Cross-Cutting-Sub-Slice (d).
- **Team:** Spec-Template fuer Provider-Elimination sollte diese 4-Wellen-Struktur enthalten (Slice 160 Backlog).

### Alternativen erwogen

- **Big-Bang-Commit:** Verworfen (siehe Begruendung oben).
- **2 Sub-Slices (Hook+Consumer als 1, Delete+Tests als 1):** Verworfen — Read-Consumer-Migration (10 Files, triviale Substitution) und Mutation-Consumer-Migration (6 Files, Behavior-Change) haben unterschiedliches Review-Risiko. Zusammenfassen waere falsches Gleichbehandeln.
- **Parallel-Agent-Dispatch:** Akzeptabel fuer Sub-b (Read-only-Substitution), verworfen fuer Sub-c+d (Money-Path braucht sequenzielle Reviewer-Ketten).

### Re-Visit-Trigger

- Bei naechster Provider-Elimination (z.B. Zustand-Store-Migration falls relevant): Pattern anwenden + Retro ob 4 Wellen die richtige Granularitaet sind.

---

## D23 — PROCESS: Ferrari-API-Swap und Ferrari-Struktur-Upgrade in getrennten Slices

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Wenn ein Consumer von der alten zur neuen Ferrari-Mutation-API migriert, wird **zwei-stufig** refactored:

1. **Stufe 1 — API-Swap (Minimal):** Nur Methoden-Namen-Mapping. `setBalanceCents(x)` → `setWalletBalance(qc, uid, x)`. `refreshBalance()` → `invalidateWallet(qc)`. Keine strukturelle Aenderung. Behavior unchanged.
2. **Stufe 2 — Struktur-Upgrade (Ferrari):** Raw `useMutation` + useRef-Mutex → `useSafeMutation` + `onMutate` + `onError` + `errorToast` + `errorTag`. Echter Optimistic-Update mit Rollback.

Beide Stufen = separate Slices, separate Reviewer-Agent-Gates.

### Begruendung

Slice 152c fasste urspruenglich "alles in einem Rutsch" an (`usePlayerTrading` 15 useStates + 3 useRef-Mutex auf `useSafeMutation` migrieren). Das waere 2-3 Stunden Arbeit und fuer den Reviewer-Agent nicht mehr handhabbar (5 Handler × 4 Lifecycle-Callbacks = 20 Struktur-Aenderungen parallel zum API-Swap).

Entscheidung: Minimal-Swap fuer 152c (30 Min, klar scope'd). Struktur-Upgrade in separatem Slice 153. Vorteile:
- **Review-Fokus:** 152c = "jeder `setBalanceCents` → `setWalletBalance`"-Pattern. Mechanisch pruefbar.
- **Rollback-Kosten:** Wenn Struktur-Upgrade einen Handler falsch migriert (z.B. Missing-Optimistic), ist Money-Path broken. Minimal-Swap hat 0 Behavior-Change-Risiko.
- **Eigenstaendige Begruendung:** Slice 153 hat `usePlayerTrading 15 useStates → 3` als eigenen Value, nicht als Nebeneffekt.

### Auswirkungen

- **Code:** Slice 152c committed als API-Swap (a59a7209). Slice 153 als Nachfolger fuer Struktur-Upgrade geplant.
- **Prozess:** Reviewer-Agent-Briefing fuer "Welle 2"-Slices enthaelt explizit "Struktur-Upgrade ist scope-out, nur API-Swap pruefen". Das verhindert Reviewer-Findings wie "warum kein onMutate?" bei API-Swap-Slices.
- **Team:** Spec-Template fuer Consumer-Migration dokumentiert die 2-Stufen-Trennung.

### Alternativen erwogen

- **Alles in einem Slice (Ferrari-extended):** Verworfen — 2-3 Stunden, Review unhandhabbar, hoeheres Rollback-Risiko.
- **API-Swap skippen, direkt Struktur-Upgrade:** Verworfen — alter Provider-Export kann nicht parallel zum neuen Hook existieren ohne Runtime-Crash. API-Swap-Zwischenschritt ist noetig fuer sauberen Provider-Delete in Welle 3.
- **Kein Struktur-Upgrade, nur API-Swap permanent:** Verworfen — raw useMutation ohne onMutate/onError bleibt Nicht-Ferrari. Eventual-Migration auf Ferrari-Blueprint (D21) ist Pflicht.

### Re-Visit-Trigger

- Slice 153 DONE: Retro ob 2-Stufen-Trennung tatsaechlich schneller/sicherer war als Big-Bang-Alternative.
- Falls `usePlayerTrading` Ferrari-Refactor Probleme bringt: Pattern evaluieren.

---

## D24 — PROCESS: Ferrari-Blueprint-Retro nach 6 Slices (Pattern-Codification COMPLETE)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv

### Entscheidung

Nach 6 konsekutiven Ferrari-Slices (153a/b, 156, 157, 158, 159 — total 19 Mutations refactored) ist das Pattern stabil. Kodifizierung komplett abgeschlossen:

- `memory/patterns.md` #28 — Ferrari-Blueprint als Standalone-Pattern mit Blueprint-Referenzen + Scope-Entscheidungen.
- `.claude/rules/common-errors.md` §5 D18 — Piloten-Liste + Stand-per-2026-04-23-Status + patterns.md-Crossref.
- `memory/decisions.md` D21 (ARCHITECTURE) + D22/D23 (PROCESS) bleiben autoritativ fuer "warum" und "wie-im-Detail".

### Begruendung

Reviewer-Agent-Feedback (Slice 159 NIT #1 "mut.mutate vs safeTrigger Blueprint-Stil-Drift") zeigte, dass Pattern **gelernt** aber nicht mehr **reflektiert** werden muss. Codification in `memory/patterns.md` macht es einem frischen Agent (oder Cold-Start-Claude) schneller erschliessbar als D21 (Decision-History) allein. Trennung:

- **decisions.md**: WARUM (Genesis, Abwaegung, Alternativen) — historisch-kontextuell.
- **patterns.md**: WAS/WIE (Copy-Paste-Template, Scope-Entscheidungen) — operational.
- **common-errors.md §5**: WANN/WO-ANGEWANDT (Pilot-Liste, Stand-per-Datum) — discoverability bei Bug-Suche.

### Auswirkungen

- **Fuer Claude:** Bei neuer Mutation-Arbeit zuerst `patterns.md #28` lesen (Copy-Paste-Ready). Falls Historie wichtig: D21 nachschlagen.
- **Fuer Reviewer-Agent:** Briefing kann "gegen patterns.md #28 pruefen" schreiben — klare Rubrik.
- **Open Work (Slice 160+):** Nur noch 2 Admin-Tier-1 (WithdrawalTab, FoundingPassesTab) + 3 Tier-2 (LeaguesSection, AirdropScoreCard, MissionBanner) + 10× Admin-Space. Pattern-Stabilitaet heisst Slice-Groesse kann zurueck auf S/XS (30-45 min pro Datei).

### Alternativen erwogen

- **Nur in decisions.md belassen:** Verworfen — ein neuer Agent muesste durch die ganze D21/D22/D23-Historie lesen, bevor Code kopiert werden kann. Patterns.md fuehrt direkt zum Template.
- **Separate .claude/rules/ferrari.md Datei:** Verworfen — patterns.md ist der etablierte Ort fuer operational-Templates. Rule-Files sind fuer "thou shalt not". Ferrari ist Affirmativ.
- **Jetzt codifizieren vs nach Slice 160/161 warten:** Codification jetzt — wir koennen den Kontext in der aktuellen Session noch frisch einfuegen. Warten heisst Risiko dass nuances vergessen werden.

### Re-Visit-Trigger

- Nach Slice 165: Pattern-Stabilitaet nochmal pruefen. Falls neue Scope-Entscheidung auftaucht (z.B. Streaming-Mutations, Supabase-Realtime-Integration), patterns.md #28 nachziehen.
- Falls ein Reviewer-NIT dreimal dasselbe bemaengelt (z.B. "Optimistic-Scope zu eng"): Decision-Entry dazu machen statt patterns.md mit Ausnahmen zuzumuellen.

---

## D25 — PROCESS: Knowledge-Flywheel als Slice-Chain-Pattern

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Wenn ein Bug-Fix/Refactor-Slice einen Reviewer-Finding produziert, das eine neue Pattern/Konvention codifiziert, wird die Codification in einem **separaten nachfolgenden Slice** (XS, docs-only) umgesetzt — nicht in-same-slice, nicht Backlog-only.

Session-Evidence 2026-04-23 (9 Slices):
- Slice 159 Ferrari-Batch → Slice 164 Pattern-Konvention-Codification (patterns.md #28 + testing.md useSafeMutation-Test-Patterns)
- Slice 166 Modal-Sweep → Slice 167 Grep-Audit-Scope-Gap-Pattern (common-errors.md §8) + Modal-preventClose-Konvention (patterns.md #28)
- Slice 165 Silent-Cast-Hardening → Slice 168 RPC-Shape-Discriminated-Union-Regel (database.md)

### Begründung

**In-same-slice-Codification** = Scope-Creep. Codification braucht eigene Spec/Review-Disziplin; mit Bug-Fix vermischt wird Proof-Artefakt unklar.

**Backlog-only** = Vergessen. Session 2026-04-23 hatte 3 Reviewer-Findings die codification-wert waren. Wenn nicht in separate Slices umgesetzt, wären sie nach 1-2 Sessions verloren.

**Separate XS-Slice pro Codification** hält:
- Bug-Fix-Slice fokussiert auf tatsächlichen Fix (keine doc-sweeps).
- Codification-Slice klar als docs-only (kein Code-Risk, XS-Größe).
- Knowledge-Flywheel explizit sichtbar im Commit-Log (`fix(...)` → `docs(codification): ...`).

### Auswirkungen

- **Prozess:** Nach jedem PASS-mit-Learnings-Review entscheiden ob Codification separater Slice (XS, 15-45min) oder Backlog. Faustregel: Wenn der gleiche Learning in 2+ Slices schon aufgetaucht ist → unbedingt codifizieren.
- **Commit-Log:** Flywheel-Pattern sichtbar via `refactor(X) → docs(codification)` Chain.
- **Claude als CTO:** Beim Review-Verdict "PASS mit Learnings" explizit fragen: "Codification-Slice jetzt oder Backlog?" — nicht implizit in Backlog werfen.

### Alternativen erwogen

- **In-same-slice-Codification:** Verworfen — vermischt Scope, Proof-Artefakt schwammig, Commit-Log-Intent unklar.
- **Nur Backlog-Eintrag in active.md:** Verworfen — Session-Evidence zeigt dass 3/3 relevante Learnings in dieser Session codifiziert wurden weil Separater Slice explizit angeboten wurde. Backlog-only-Wahrscheinlichkeit für Vergessen hoch.
- **Alle Learnings in 1 Batch-Codification-Slice am Ende:** Verworfen — Codification-Slice wird dann zu groß (z.B. M oder L), verliert XS-Disziplin. Plus: Einzeln codifizierte Patterns sind einfacher cross-referenziert.

### Re-Visit-Trigger

- Falls 2 Codification-Slices in Folge unbeantwortete Reviewer-Findings produzieren: Meta-Pattern prüfen ob Spec-Audit-Methodik angepasst werden muss (siehe D26).
- Falls Codification-Slice-Aufwand >60 min wird: Scope zu groß, in 2 Slices splitten.

---

## D27 — ARCHITECTURE: Idempotency-Infrastructure generisch statt per-RPC inline

- **Datum:** 2026-04-24
- **Status:** Aktiv (Foundation live seit Slice 178)
- **Kontext:** Slice 151c.2 hatte inline-60s-Idempotency-Window in `subscribe_to_club`. Pattern-bekannt aus common-errors.md §2 "Money-RPC Idempotency-Window". Sorare/Socios-Audit Tier A1: systemweit absichern.
- **Entscheidung:** Generische `request_dedup_keys(user_id, dedup_key, response JSONB)` Tabelle + SECURITY DEFINER Helper `check_or_reserve_dedup_key(p_user_id, p_dedup_key, p_ttl_seconds)`. Response-Caching erlaubt idempotent retry-replay mit cached data.
- **Begruendung:** Ad-hoc per-RPC-Implementation bei 5+ Money-RPCs (subscribe_to_club, buy_player_sc, liquidate_player, openMysteryBox, create_offer) = 5× duplicated logic = 5× drift-risk. Generisch als Foundation standardisiert das Pattern.
- **Auswirkungen:** Zukuenftige Money-RPCs erhalten `p_idempotency_key TEXT` Parameter + 3-Line-Integration. Slice 178a ist Pilot, 178c migriert existing inline.
- **Alternativen erwogen:**
  - **Postgres `advisory_lock`**: Verworfen weil nur während Transaction aktiv (nicht retry-safe nach commit).
  - **Redis-Cache**: Verworfen weil Supabase-only (no Redis in stack).
  - **Client-side dedup**: Verworfen weil Network-retry (Mobile-switch) umgeht Client-Guard (Slice 151c.2 Lehre).
- **Re-Visit-Trigger:** Bei >50 RPCs im Money-Path oder wenn per-RPC-cleanup nicht mehr via Cron machbar.

---

## D28 — ARCHITECTURE: DB-Invariants via Trigger + Opt-In GUC fuer legitimierte Bulk-Migrations

- **Datum:** 2026-04-24
- **Status:** Aktiv (etabliert Slice 179, applicable auf andere immutable-log-tables)
- **Kontext:** CLAUDE.md-Regel "Trades/Transactions append-only" war nur Doku, nicht enforced. Slice 179 setzt als DB-Invariant: `REVOKE UPDATE, DELETE` von anon/authenticated + BEFORE-Trigger raising exception.
- **Entscheidung:** Trigger pruefen `current_setting('bescout.allow_transactions_mutation', true) = 'true'` → Bypass. Legitimierte Bulk-Migrations setzen `SET LOCAL <guc>` innerhalb Transaction. SET LOCAL = Transaction-scope, nicht Session-scope.
- **Begruendung:** REVOKE allein reicht nicht (SECURITY DEFINER RPCs laufen als postgres). Trigger = defense-in-depth. GUC-Opt-in-Pattern erlaubt legitimierte one-time-backfills ohne Trigger-temporaer-disable/re-enable (zu risky).
- **Auswirkungen:** Pattern uebertragbar auf `trades`, `activity_log`, `audit_log`, zukuenftige `holdings_history` etc. Migration-Template:
  ```sql
  BEGIN;
  SET LOCAL bescout.allow_<table>_mutation = 'true';
  UPDATE public.<table> SET ...;
  COMMIT;
  ```
- **Alternativen erwogen:**
  - **Temporär Trigger DROP/re-CREATE**: Verworfen (zu risky, race-window).
  - **Service_role bypass auto**: Verworfen (RPCs nutzen SECURITY DEFINER = postgres, würde Guard komplett durchlöchern).
  - **Audit-Tabelle statt Append-Only**: Verworfen (erhöht Complexity, Append-Only ist simpler).
- **Re-Visit-Trigger:** Bei echtem Refund-Flow (nicht in V1 geplant).

---

## D29 — PROCESS: Autonomous-Marathon-Session mit CEO-Explicit-Grant

- **Datum:** 2026-04-24
- **Status:** Trial (1 Session durchgefuehrt, 14 Slices)
- **Kontext:** Tier-Plan Slices 174-185 (Sorare/Socios-Audit) enthielt Money-Path-Slices (178, 179). Per CEO-Approval-Matrix: Money = CEO approved vor Code. User-Prompt "voller Zugriff! komm zurück wenn du durch bist" = explicit session-scoped approval.
- **Entscheidung:** Autonomous-Marathon zulaessig bei explicit session-scoped grant. Claude arbeitet Tier-Plan ab mit:
  - Scope-narrowing bei zu grossen Slices (z.B. 180 → nur INV-25-Fix statt alle 33 Services)
  - Self-Review statt Reviewer-Agent bei XS-Slices mit trivialer Pattern-Wiederholung (175c, 185, 179, 178)
  - Reviewer-Agent Pflicht bei S/M-Slices mit Consumer-Impact (175b, 176d, 177)
  - Live-DB-Migrations via mcp__supabase__apply_migration + Post-Apply-Verify
  - Pragmatic Follow-Slice-Markierung statt Scope-Creep (e.g. 178a/b/c/d, 180b)
- **Begruendung:** CEO-Approval-Matrix ist per-Action-Scoped, nicht per-Slice. "Voller Zugriff" = Session-Scope = explicit. Ohne Marathon-Option würde Tier-Plan-Completion über viele Sessions streuen (context-loss, repetitive setup).
- **Auswirkungen:**
  - Next-Session-Handoff kann Marathon-Outcome in 1 active.md Summary lesen (kein 14× Slice-by-Slice catch-up)
  - Pattern fuer zukuenftige Tier-Plan-Abarbeitungen wenn Scope vorher klar (Foundation-Tiers, nicht Feature-Tiers)
- **Alternativen erwogen:**
  - **Slice-by-Slice CEO-approval**: Verworfen weil User explicit "komm zurueck wenn du durch bist" gesagt hat = full-marathon-intent.
  - **Only-non-money Marathon**: Verworfen weil 178+179 kernstuecke des Audits sind, ohne die der Tier-Plan unvollstaendig.
- **Re-Visit-Trigger:** Wenn post-Marathon-Review Quality-Issues findet die durch Slice-by-Slice-Pause gefangen worden waeren.

---

## D26 — PROCESS: Reviewer-Agent als Scope-Gap-Catcher etabliert

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Cold-Context-Reviewer-Agent wird bei **Sweep-/Pattern-Migration-Slices** explizit als zweite Audit-Iteration eingesetzt — mit Auftrag, Spec-behauptete "Scope komplett"-Claims gegen eigenen Grep-Pattern zu verifizieren.

Session-Evidence (Slice 166 Modal-preventClose-Sweep):
- Primary Top-Level-Grep fand 7/13 Modals (Spec-Scope)
- Reviewer-Agent fand zusätzliche 6/13 (46% ROI) via embedded-Component-Cross-Ref
- Ohne Reviewer wären 6 Safety-Fixes inkl. 1 Money-Pfad (OfferModal) übersehen worden

### Begründung

**Primary-Claude Audit-Pattern hat Blind-Spot** bei embedded Sub-Components:
- `grep "<Modal" src/components/` listet Files, aber Cards/Tabs mit eingebetteten Modals werden übersehen wenn der Scan auf Top-Level-Container fokussiert.
- Cross-Ref mit Mutation-State-Pattern (Cards mit `loading`/`isPending`/`submitting`) fehlt.

**Cold-Context-Reviewer** hat strukturellen Vorteil:
- Kein Anker an bereits gesehenem Scope.
- Liest Spec mit Skeptiker-Brille "welche Modals hat Primary verpasst?"
- Kann eigenen Grep-Pattern erfinden (recursive + cross-ref).

**Nicht für jedes Slice pflicht** — nur bei Sweep-Patterns mit "alle X mit Y finden"-Scope.

### Auswirkungen

- **Prozess:** Bei Sweep-Slices (Pattern-Migration, Dead-Code-Entfernung, API-Consumer-Updates) expliziter Reviewer-Prompt: "Prüfe ob Spec-Audit alle Targets gefunden hat — nutze eigenen Grep-Pattern als Cross-Ref."
- **common-errors.md §8** codifiziert das "Grep-Audit-Scope-Gap"-Pattern (Slice 167 Codification) — Audit-Command-Template dort.
- **Slice-Size-Kalkulation:** Sweep-Slices sollten +20-30% Buffer für Scope-Gap-Fixes nach Reviewer einplanen. Slice 166 plante 7 Fixes, lieferte 13.

### Alternativen erwogen

- **Immer Reviewer bei jedem Slice:** Verworfen — ROI ist bei Single-Feature-Slice niedrig (Primary hat dort klaren Scope). Bei Sweep-Slices ist ROI 46% (Slice 166 Evidence).
- **Primary macht zweiten Grep-Pass selbst:** Verworfen — Anchoring-Bias. Primary hat bereits mentales Modell vom Scope, sieht nur was reinpasst. Cold-Context-Second-Iteration ist strukturell besser.
- **Reviewer nur retrospektiv (nach Commit):** Verworfen — Scope-Gaps müssen in-slice gefixt werden (sonst separates 166b-Slice nötig). Pre-Commit-Review ist der richtige Gate.

### Re-Visit-Trigger

- Falls Reviewer-ROI bei Sweep-Slices unter 10% fällt: Primary-Audit-Methodik ist besser geworden, Reviewer-Iteration optional.
- Falls Reviewer-ROI über 60% bei 3+ Slices: Primary-Audit-Methodik ist schlechter geworden, Audit-Template-Review nötig.

---

## D30 — ARCHITECTURE: useSafeIdempotentMutation als Money-Path Standard-Primitive

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Extends D17 (useSafeMutation) fuer Money-Path-Subset

### Entscheidung

Money-Path-Mutations nutzen **`useSafeIdempotentMutation`** (Composition ueber `useSafeMutation`) mit `idempotencyNamespace` + `mutationFn: (vars, key) => service(..., key)`. Plain-async-Handler (fire-and-forget) nutzen `newIdempotencyKey('namespace')` inline.

Rollout in Session 2026-04-24: 6 Money-Path Call-Sites (useBuyFromMarket, usePlaceBuyOrder, usePlayerTrading buy/sell, MembershipSection, useHomeData.openMB, missions/page.openMB, useAdminPlayersState.liquidate) + 8 Server-RPCs (178a/c/e-a..e).

### Begründung

- **D27 (generic Idempotency-Infrastructure)** lieferte Server-Side Foundation — ohne Client-Side Auto-Key bleibt Wert ungenutzt.
- Hook-Composition gewinnt gegen optional-flag-Sprawl im Base-Hook.
- Auto-managed key-lifecycle (persist waehrend in-flight+retry, reset on onSuccess+onError) ist komplex genug um nicht per-caller copy-pastable zu sein.
- Plain-async-Pfad (`newIdempotencyKey()` direkt) bleibt fuer Callers ohne React-Query-Mutation (z.B. openMysteryBox handler, handleLiquidate).

### Auswirkungen

- **Code:** neu `src/lib/idempotency.ts` + `src/lib/hooks/useSafeIdempotentMutation.ts`. Rules-Referenz in `errors-db.md` Money-RPC Idempotency-Blueprint.
- **Tests:** Call-Site-Test-Assertions erweitert um `expect.stringMatching(/^namespace:/)` fuer key-pass-through.
- **Pattern-Replikation:** Weitere Money-RPC-Integrationen (buyFromIpo, cancelBuyOrder, cancelOrder falls gewuenscht) folgen demselben Pattern.

### Alternativen erwogen

- **Per-Caller `useRef<string>`-Management:** Verworfen — zu viel Disziplin-Last auf Consumers, key-lifecycle-Bugs wahrscheinlich.
- **Integriert in `useSafeMutation`:** Verworfen — nicht alle Mutations brauchen Idempotency (pure Reads, Client-State-only). Flag-Sprawl.
- **Key-Generation im Service-Layer:** Verworfen — Service-Layer weiss nicht ob Mutation `isRetry` vs. fresh-attempt. Hook hat besseren Lifecycle-Kontext.

### Re-Visit-Trigger
- Falls >3 Money-RPCs ohne Idempotency-Integration in Prod driften: Namespacing-Convention pruefen.
- Falls Client-Side-Key-Collision beobachtet wird: UUID-Fallback vs. crypto.randomUUID-Availability pruefen.

---

## D31 — PROCESS: Auto-generated Files mit Merge-Markern (nie komplett ueberschreiben)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Session-Handoff-Hook-Verhalten pre-2026-04-24 (komplettes Overwrite)

### Entscheidung

Hooks die auto-generierte Files pflegen (konkret: `memory/session-handoff.md`, aber Pattern-generell) nutzen **Marker-Block-Merge** statt Full-File-Write:

```
<!-- auto:handoff-start -->
... auto content ...
<!-- auto:handoff-end -->

... manual rich content (untouched) ...
```

awk state-machine (`before → in_block → after`) ersetzt nur den Block zwischen Markern. Migration-Path fuer Bestandsdateien ohne Marker: Auto-Block oben einfuegen, existierender Content darunter.

### Begründung

Historisches Problem (pre-2026-04-24): Session-Handoff-Hook ueberschrieb bei jedem Stop-Event die ganze Datei. Rich-Content (Priority-Queue, DB-Stand, Next-Session-Briefing) war nach jeder Session weg. In Session 2026-04-24 **3× manuell wiederhergestellt** bevor Root-Cause-Fix.

### Auswirkungen

- **`.claude/hooks/session-handoff-auto.sh`** umgebaut (Slice session-handoff-merge-Commit).
- **`errors-infra.md`** dokumentiert Pattern fuer kuenftige Hooks.
- Anwendbar auf: Crash-Recovery-Hook (wenn er auch in gleiche Datei schreibt), zukuenftige Auto-Status-Hooks.

### Alternativen erwogen

- **Separate Auto-Datei (`session-handoff.auto.md`):** Verworfen — Doppelpflege, `MEMORY.md`-Index muesste beide referenzieren.
- **Hook skippt wenn Datei bereits Content hat:** Verworfen — verliert Auto-Status-Updates bei aktivem Handoff.
- **Header-Zeile als Marker (`# Auto-Handoff-Only`):** Verworfen — fragile, User koennte Header unbewusst editieren.

### Re-Visit-Trigger
- Falls Marker-Format mit User-Tooling konfligiert (Obsidian-Rendering, Markdown-Lint): alternative Markers (z.B. Special-Comment-Style) erwaegen.

---

## D32 — PROCESS: Bundle-Budget-Gate in CI (Size-Regression-Prevention)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

`bundle-budget.json` definiert thresholds pro Route + shared-bundle. `scripts/check-bundle-size.ts` parst `next build`-Output, exit 1 bei jeder Route ueber Budget oder shared > threshold. CI-Gate im build-Job (`.github/workflows/ci.yml`): `next build | tee build-output.txt` + `cat | npx tsx scripts/check-bundle-size.ts`.

Baseline 2026-04-24: 162 kB shared, 51 routes tracked, ~10-15 kB Headroom pro critical Route (`/player/[id]` 378/390, `/market` 346/360, `/community` 364/375, etc.).

### Begründung

Bundle-Size-Regressions sind **silent**: `next build` warnt nicht bei +20 kB auf einer Route. Entdeckt wurde nur durch manuelle Bundle-Analyzer-Inspektion nach User-Reports ueber Langsamkeit (historisch: `country-flag-icons` namespace 235 kB, Slice 120).

CI-Gate verhindert Regression vor Merge statt retrospektiv nach Prod-Deploy. Budget-Headroom (~10-15 kB) erlaubt kleine Schwankungen, grosse Spruenge bleiben sichtbar.

### Auswirkungen

- **Neu:** `bundle-budget.json`, `scripts/check-bundle-size.ts`, `pnpm run size` script.
- **CI:** build-Job hat zwei Steps: `next build | tee` + size-check.
- **Budget-Updates:** nur mit Justification (neuer Feature, Performance-Tradeoff). Anil-Review fuer >+20 kB-Updates.
- **`errors-infra.md`** dokumentiert Gate.

### Alternativen erwogen

- **size-limit mit @size-limit/file:** Verworfen — Next.js-Chunks haben dynamische Namen, statische File-Target-Liste bricht bei jedem Chunk-Hash-Change.
- **Manueller Bundle-Analyzer-Run vor Merge:** Verworfen — zu disziplinabhaengig, wird vergessen.
- **Nur shared-bundle-Check, keine per-route-Budgets:** Verworfen — route-level Regressions (z.B. /player/[id] +50 kB durch neuen heavy-chart) waeren unsichtbar.

### Re-Visit-Trigger
- Falls CI-Gate >2× pro Monat gruene PRs falsch-blockt: Budget-Headroom erhoehen oder per-slice-opt-out-Mechanismus erwaegen.
- Falls Bundle-Size systematisch waechst trotz Gate: Per-Chunk-size-limit (Slice 185c) oder bundle-analyzer-artifact-Upload erwaegen.

---

## D33 — PROCESS: common-errors.md Split in Domain-Files (40 KB Regel)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Single-File `common-errors.md` (55 KB, 720 Zeilen)

### Entscheidung

`.claude/rules/common-errors.md` wird auf **~6 KB Navigator + Section 1 Silent-Fails** reduziert. Domain-spezifische Patterns in:

- `errors-db.md` (~11 KB) — Supabase/Postgres, RPC-Design, Auth/Security, React-Query+Cache
- `errors-frontend.md` (~7 KB) — React/TS/CSS, Modal-Pattern, i18n/Locale
- `errors-infra.md` (~11 KB) — Build/Deploy, Bundle, Hooks, Beta-Launch-Ops
- `errors-scraper.md` (~6 KB) — Transfermarkt, API-Football, HTML-Parsing

Alle Files unter 30 KB (Soft-Ziel < 40 KB, Optimal ~30 KB).

### Begründung

- **Context-Efficiency:** CLAUDE.md laedt rules/ autoloaded. Bei 55 KB Single-File frisst common-errors jede Session unnoetige Tokens.
- **Skip-Rate bei grossen Files:** User-Behavior — lange Rules werden seltener gescrollt, wichtige Patterns verloren im Middle.
- **Domain-Splits reflektieren Use-Case:** DB-Arbeit braucht DB-Patterns, Frontend-Arbeit Frontend-Patterns. Autoload-alle bleibt, Navigator macht Scope klar.
- **Silent-Fails bleiben im Hauptfile:** cross-cutting relevant (trifft DB+Frontend+Scraper), wichtigste Bug-Klasse.

### Auswirkungen

- **Autoload-Impact:** Alle 4 neuen Files werden autoloaded (rules/**/*.md). Gesamt-Content aehnlich, verteilt.
- **Navigation:** Devs + Claude finden Pattern via Navigator-Table in common-errors.md. Querverweise zwischen Splits via relative Pfade.
- **Maintenance:** Neuer Pattern → direkt in richtige Domain-Datei. "Silent-Fails" bleiben Ankerpunkt fuer cross-cutting.

### Alternativen erwogen

- **Aggressive Inline-Pruning (55→30 KB im Single-File):** Verworfen — wichtiges Know-how geht verloren, Maintenance-Load bleibt auf einem File.
- **Split nach Slice-ID-Ranges:** Verworfen — Slice-Historie ist nicht Search-Intent. User sucht "wie fixe ich RPC-Silent-Fail", nicht "was war Slice 160".
- **Markdown-Sections als Multi-File mit automatischem Merge:** Verworfen — Over-engineering, Plain-Splits funktionieren.

### Re-Visit-Trigger
- Falls eines der Splits >25 KB erreicht: weiter splitten (z.B. errors-db.md → errors-db-core.md + errors-db-auth.md).
- Falls common-errors.md Navigator-Section stale wird (2+ Pattern in falscher Datei): Renovation-Slice.

---

## D34 — ARCHITECTURE: Radix UI als Headless-Foundation fuer Dialog/AlertDialog/DropdownMenu

**Datum:** 2026-04-24
**Status:** ✅ Aktiv (Slice 181)
**Supersedes:** Custom-`Modal` + `ConfirmDialog` (bleiben coexistent bis Slice 181h Cleanup)

### Entscheidung

`@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-dropdown-menu` als Foundation einfuehren. Drei Wrapper in `src/components/ui/`:

- **Dialog.tsx** — Drop-in API zu altem Modal (1:1 Props)
- **AlertDialog.tsx** — Drop-in API zu altem ConfirmDialog (1:1 Props)
- **DropdownMenu.tsx** — Compound API (Radix-idiomatisch, kein Vorgaenger im Code)

Migration der 48 Modal-Konsumenten + 2 ConfirmDialog-Konsumenten ueber Folge-Slices 181b-h (siehe `worklog/specs/181b-radix-migration-plan.md`).

### Begründung

- **A11y aus der Box:** Korrekte ARIA-Roles (dialog, alertdialog, menu), robust focus-trap (react-focus-scope), focus-restore aufs Trigger-Element, Screen-Reader-Announcements via DialogTitle.
- **Code-Reduktion:** Custom-Modal hatte ~150 LoC fuer ESC + scroll-lock + focus-trap manuell. Radix loest das + bessere Edge-Cases.
- **Industry-Standard:** Radix ist de-facto-Standard fuer Headless-UI in Next.js-Projekten. Onboarding neuer Devs einfacher.
- **Drop-in API minimiert Migration-Risiko:** Folge-Slices sind Import-Renames, nicht Strukturaenderungen.

### Auswirkungen

- **Bundle:** Per-Route +14-21 kB (NICHT shared chunk wie initial vermutet — Webpack tree-shaket Radix in Pilot-Sites lokal). Bundle-Budget per-Route +25 kB Headroom dokumentiert.
- **Tests:** `src/test-utils/radix-mocks.ts` als shared factory-mock-helper. 48 Folge-Migrations nutzen es konsistent.
- **Animations:** Erforderte Tailwind-Fix (`@layer utilities` Wrap fuer `anim-*`-Klassen, sonst keine `data-[state=open]:`-Variants generiert) — siehe errors-frontend.md Pattern.
- **Pattern-Asymmetrie AlertDialog Action:** Bewusst plain `<Button>` statt `RadixAlert.Action` weil Action implizit closed → race mit async onConfirm. Cancel via `RadixAlert.Cancel asChild` ist OK weil Cancel = sofort-close.

### Alternativen erwogen

- **Custom-Modal weiter ausbauen:** Verworfen — A11y ist hard-to-get-right manuell, Code-Maintenance hoch.
- **Radix Themes (vorgefertigte styled Components):** Verworfen — loest unser Design-Token-System auf, Inkompatibel mit BeScout-Dark-Mode-Theming.
- **Headless UI (Tailwind Labs):** Verworfen — kleinerer Featureset, keine AlertDialog/DropdownMenu Primitives.
- **Big-Bang-Migration aller 48 Sites in 181:** Verworfen — Risk zu hoch (Money-Path-Modals dabei). Pilot + gradual rollout via 181b-h.

### Re-Visit-Trigger
- Falls Bundle-Impact pro Route ueber 30 kB steigt nach 181e Trading-Migration: Optimization-Slice (selektives Lazy-Import von Radix-Internals).
- Falls Radix v2 Breaking-Changes bringt: Migration-Window planen.
- Falls 5+ neue Primitives nach 181 hinzugefuegt werden (Tooltip, Popover, Select, Tabs, Toast): zentrale Theming-Schicht (z.B. shadcn-style Theme-File) statt per-Wrapper-Styling.

---

## D35 — PROCESS: Mechanical-Pattern-Slices duerfen Self-Review nutzen nach 2+ erfolgreichen Pattern-Iterations

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bei Slices die **identisches Pattern** wiederholen das in mindestens 2 vorherigen Slices durch Cold-Context-Reviewer erfolgreich PASS-validiert wurde, darf Primary-Claude **Self-Review** in `worklog/reviews/<slice>-review.md` schreiben statt reviewer-Agent zu dispatchen.

Bedingungen:
- Pattern ist mechanisch (z.B. Import-Rename + JSX-Rename + Test-Mock-Rename — nichts neues)
- Keine Logic-Aenderung, keine neuen Edge-Cases, keine API-Drift
- 2+ Slices mit gleichem Pattern hatten Cold-Context-Review = PASS
- Self-Review-Doc dokumentiert Pattern-Wiederholung explizit
- ship-cto-review-gate-Hook akzeptiert File-Existence (Content reviewer-agnostic)

### Begründung

- **Reviewer-Cost:** Cold-Context-Reviewer braucht 30-40 min, $$, viel Output. Bei mechanischer Wiederholung ist das verschwendet.
- **False-Positive-Rate hoch:** Reviewer flaggt manchmal HIGH "fehlende Spec-Datei im Worktree" obwohl File in main existiert (Slice 181 Beispiel) — Noise.
- **Pattern-Validation ist additive:** Wenn Iteration 1+2 PASSed haben, ist Iteration 3 nicht riskanter als Iteration 2.
- **Belt-and-Suspenders weiterhin aktiv:** tsc + vitest + Bundle-Gate + Pre-Commit-Hooks.
- **Bei NEUEM Pattern-Element:** Reviewer-Pflicht zurueck (z.B. wenn Migration auf Money-Path Trading-Modal trifft → 181e bekommt qa-visual statt Self-Review).

### Auswirkungen

- **Slice 181b/c/d:** Self-Review angewandt nach 181 (Pilot, Cold-Context-Review) + 181b (Self) + 181c (Self).
- **Slice 181e (Trading):** Reviewer + qa-visual zurueck (HIGH-risk, neuer Risiko-Aspekt: Money-Path Visual-Regression).
- **Hook-Update nicht noetig:** ship-cto-review-gate prueft File-Existence, nicht Reviewer-Authorship.
- **Speed-Gewinn:** 4 Slices in 1 Session (181/b/c/d) statt 4 Sessions mit Reviewer-Roundtrip.

### Alternativen erwogen

- **Reviewer-Pflicht fuer ALLE Slices:** Verworfen — over-validation bei mechanischer Wiederholung, blockt Velocity unnoetig.
- **Reviewer skip ohne Self-Review-Doc:** Verworfen — verletzt ship-cto-review-gate, hinterlaesst Audit-Luecke.
- **Reviewer NUR fuer L-Slices:** Verworfen — L vs M ist scope-Groesse, nicht Risk. 181b ist L (11 Files) aber low-risk.
- **Healer-Agent statt Self-Review fuer Mechanical-Slices:** Verworfen — Healer fixed Bugs, hier gibts keine zu fixen.

### Re-Visit-Trigger
- Falls Self-Reviewed Slice einen Production-Bug erzeugt: Self-Review-Pattern revertieren, Reviewer-Pflicht fuer ALLE Slices ab dann.
- Falls Reviewer-Agent Cost/Speed deutlich verbessert (z.B. Caching) — Reviewer wieder default.

---

## D36 — PROCESS: Vercel-Deploy-Health-Check nach Push (Silent-Build-Fail-Detection)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Nach jedem `git push origin main` muss innerhalb 3 Minuten via `mcp__vercel__list_deployments` verifiziert werden, dass der neueste Commit als Deployment listet. Wenn Vercel-List die letzten Commits NICHT enthält: **Silent-Build-Fail vermuten** und SOFORT `vercel deploy --prod --yes` foreground laufen lassen, um den echten Fehler zu sehen.

Trigger-Bedingung:
- Eine komplette Session (8+ Commits, 4+ Stunden) ohne Auto-Deploy-Output auf Vercel → Plan-Downgrade oder Webhook-Drop vermuten
- Auto-Deploys funktionieren laut Vercel-MCP seit X Stunden nicht → NICHT weiter pushen bis Ursache gefunden

### Begründung

In Session 2026-04-24 waren **17 Commits silent blockiert** seit 15:41 UTC weil `dedup-cleanup` cron `0 * * * *` (hourly) auf Hobby-Tier rejected wurde. Jede `git push` hat den Webhook getriggert, Vercel hat Build started, der Build validiert `vercel.json`, Fail mit Message „Hobby accounts are limited to daily cron jobs" — aber **keine Notification irgendwo**. GitHub Action sah Commit, Vercel-Dashboard hatte failed-builds, aber nichts hat eskaliert.

Fix-Zeit nach Discovery: 2 min (cron-Schedule auf daily, manual deploy). **Discovery-Zeit ohne Protokoll: 30 min** (MCP-Rumsucherei, API-Call, Log-Inspektion). Health-Check nach Push hätte das sofort gefangen.

### Auswirkungen

- **Post-Push-Protokoll:** Neue Routine — nach `git push` immer `mcp__vercel__list_deployments` mit `since: <push-timestamp>` checken. Wenn 0 Results nach 2-3 min: `vercel deploy --prod --yes` manuell triggern um die echte Fehlermeldung zu sehen.
- **Rules-Update:** `.claude/rules/errors-infra.md` kriegt Vercel-Hobby-Cron-Pattern (parallel zu dieser Decision).
- **CI-Gate möglich (Optional Slice):** GHA-Workflow der post-push-deploy-status nach 5 min überwacht und failed bei MISSING-Deploy.

### Alternativen erwogen

- **Manuelle Vercel-Dashboard-Check:** Verworfen — unreliable, nicht in Claude's Loop.
- **GHA-Webhook `deployment_status` watch (existiert bereits für Smoke):** Verworfen als alleinige Lösung — triggered nur bei `success`-events, nicht bei silent-fail WITH NO DEPLOYMENT CREATED at all.
- **Vercel-Pro-Plan immer zahlen:** CEO-Entscheidung — auch mit Pro können Webhooks droppen (Slice 140 cron-gaps als Präzedenzfall).

### Re-Visit-Trigger
- Falls Vercel je ein Notification-System für build-config-rejections einführt (z.B. E-Mail bei Hobby-Plan-Limit-Breach) → Protokoll vereinfachen.
- Falls CI-Gate implementiert ist (GHA watcher) → manuelles Probing optional.

---

## D37 — PROCESS: Re-Audit-Grep vor Component-Deletion-Slices (Cleanup-Gap-Catch)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bevor ein Component, Hook, Type, Service oder UI-Primitive aus `src/` gelöscht wird, ist ein finaler Re-Audit-Grep über alle Import-Pfade Pflicht. Das gilt auch wenn der Primary-Plan explizit alle bekannten Call-Sites auflistet — weil Cleanup-Slices oft 46× validiertes Pattern wiederholen und man daher dazu neigt die Restliste als komplett zu betrachten.

Template-Grep:
```bash
grep -rn "import.*\b<Component>\b.*from ['\"]@/<path>" src/
# Erwartung: 0 matches VOR Deletion
```

Wenn Treffer > 0: **Stop, diese Files zuerst migrieren**, Deletion-Slice pausieren. Wenn Deletion-Slice trotzdem läuft → Build-bruch garantiert.

### Begründung

Slice 181h (Modal + ConfirmDialog Cleanup):
- Primary-Plan: nur EventDetailModal (181f) + fine
- Re-Audit-Grep: fand **2 zusätzliche Files** (PlayerDetailModal.tsx Manager + EventSelector.tsx Manager-Aufstellen) die nicht im Plan standen
- Ohne Re-Audit: `Modal` aus index.tsx removen → diese 2 Files hätten `import { Modal } from '@/components/ui'` → Build-Error auf Prod

Pattern-Referenz: `errors-infra.md` Slice 166 (Grep-Audit-Scope-Gap bei Sub-Component-Scan — 46% zusätzliche Files gefunden durch Gap-Audit).

### Auswirkungen

- **Post-Migration, Pre-Deletion Audit:** Standard-Step in Cleanup-Slices. Findings in Slice-Proof dokumentieren („Re-Audit Gap-Catch: N zusätzliche Files migriert bevor Deletion").
- **Spec-Template für Cleanup-Slices:** Expliziter Re-Audit-Step in Stage-Chain vor BUILD (oder am BUILD-Ende).
- **Applies auch für:** Hook-Removal, Type-Removal, Service-Removal, Feature-Flag-Removal.

### Alternativen erwogen

- **Primary-Plan exhaustive machen:** Verworfen — Cleanup-Slices leben von „46× validiert, trivial" Velocity-Erwartung. Exhaustive-Planning macht jeden Cleanup zum L-Scope.
- **Deletion ohne Audit (Trust the Plan):** Verworfen — 181h Szenario zeigt: 22% Gap-Catch-Rate reicht zum Build-Bruch.
- **Reviewer-Agent exklusiv:** Verworfen — Reviewer kann Re-Audit machen aber Cold-Context hat weniger Signal als einfacher Grep.

### Re-Visit-Trigger
- Falls grep-basierter Re-Audit je einen Silent-Miss hat (z.B. dynamic-imports, barrel-re-exports) → Audit-Tool upgraden (ts-morph, ripgrep-JSON mit AST).

---

## D38 — ARCHITECTURE: Data-Cleanup via Supabase MCP statt Migration fuer non-schema-changes

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Für Data-Integrity-Cleanups (Invariant-Repair, Ghost-Row-Orphaning, Stale-Flag-Update, Order-Expiration), die **nur Live-DB-State ändern ohne Schema-Change**, nutzen wir direkt `mcp__supabase__execute_sql` statt Migration-File zu schreiben.

Regeln:
- **Schema-Change (DDL, neue Tabellen, neue RPCs):** Migration Pflicht (`mcp__supabase__apply_migration`).
- **Data-Change (UPDATE, DELETE auf existing rows):** MCP-Execute in Slice-Proof dokumentieren, kein Migration-File.
- **Money-Path Data-Change:** Nur via existierende SECURITY DEFINER RPC (z.B. `expire_pending_orders`) — niemals raw UPDATE auf `wallets`, `transactions`, `orders`.
- **Proof-Pflicht:** Jede Query (Before-Count, UPDATE, After-Count) in `worklog/proofs/<slice>.md` verbatim + 0-Violations Verify + vitest RED→GREEN.

### Begründung

Slice 187 (5 pre-existing Invariants → 0):
- 0 Code-Änderungen im Repo
- 5 gezielte UPDATEs via MCP + 1 RPC-Call
- Verify via Live-DB-Count + vitest 44/44 grün
- Proof + Review dokumentiert (reproducible via Queries)

Migration hätte 5 separate Files erfordert, keine davon würde nach erstmaligem Apply je wieder laufen (idempotent trivial weil UPDATE mit Filter). File-Noise + Registry-Drift-Risiko ohne Nutzen.

Gegenargument: „Migration als Audit-Trail". Counter: Git-Log + Proof-File sind Audit-Trail genug, MCP-Calls sind loggenbar via Supabase-Edge-Logs.

### Auswirkungen

- **Slice-Classification:** Data-Cleanup-Slices bekommen Stage-Chain SPEC → IMPACT `skipped (data-only)` → BUILD (DB-State-Change via MCP) → REVIEW → PROVE → LOG.
- **Proof-Template:** Before-Counts + SQL-Queries + After-Counts + vitest.
- **Money-Path-Guard:** `UPDATE wallets|transactions|orders` niemals raw — immer RPC. Pre-Commit-Grep möglich als CI-Check.
- **Recurring Data-Issues:** Falls ein Invariant-Violation regelmäßig auftritt → ursprünglicher Bug (z.B. sync-players-daily Ghost-Prevention) muss als Code-Fix gemacht werden, Cleanup-Slice ist nur Symptom-Behandlung.

### Alternativen erwogen

- **Migration pro Data-Cleanup:** Verworfen — File-Noise, Registry-Entries für Einmal-Aktionen, kein Re-Run-Wert.
- **Direct-SQL-Editor (Supabase-Dashboard):** Verworfen — nicht in Claude's Workflow, kein Audit-Trail im Repo.
- **Admin-UI-Buttons für Cleanups:** Verworfen — Over-Engineering, CEO könnte versehentlich Money-Path-Daten touchen.

### Re-Visit-Trigger
- Falls Data-Cleanups sich wiederholen (gleicher Invariant 2+ mal in 30 Tagen gebrochen) → Code-Fix für Root-Cause Pflicht, Cleanup-Protokoll dokumentiert es als Symptom-Indicator.
- Falls Supabase MCP je entfernt wird → Fallback auf Migration-Files.

---

## D39 — ARCHITECTURE: Trigger+GUC-Pattern als Standard für DB-Level Data-Integrity-Invariants

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** — (generalisiert D28 über append-only hinaus)

### Entscheidung

Das **Trigger-Function + GUC-Escape-Pattern** (etabliert in D28 für `transactions` append-only) ist ab sofort **Standard für alle DB-Level Data-Integrity-Invariants**, bei denen:

1. Die Invariant-Verletzung sonst durch mehrere Code-Pfade unabhängig eingeführt werden könnte (Scripts, Crons, RPCs, manuelle SQL)
2. Eine reine Code-Guard-Lösung fragil wäre (neue Call-Sites = neue Gap-Kandidaten)
3. Legitime Bulk-Imports/Migrations trotzdem möglich sein müssen

**Template:**

```sql
CREATE OR REPLACE FUNCTION public.prevent_<invariant_violation>()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Escape-Hatch (D28-Pattern)
  IF current_setting('bescout.allow_<feature>', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- 2. NULL-Guards: skip if data incomplete
  IF NEW.critical_field IS NULL THEN RETURN NEW; END IF;

  -- 3. Invariant-Check(s) mit RAISE EXCEPTION
  IF <violation_condition> THEN
    RAISE EXCEPTION '<invariant_key>: <human msg>'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS <trigger_name> ON public.<table>;
CREATE TRIGGER <trigger_name>
  BEFORE <INSERT|UPDATE|DELETE> ON public.<table>
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_<invariant_violation>();

COMMENT ON FUNCTION public.prevent_<invariant_violation>() IS
  'Slice <N>: <purpose>. Bypass: SET LOCAL bescout.allow_<feature> = true.';
```

**Bulk-Import-Bypass (Session-Pattern):**

```sql
BEGIN;
SET LOCAL bescout.allow_<feature> = 'true';
-- ... legitimate bulk-work ...
COMMIT;
```

### Begründung

**Empirische Validierung (2 Iterationen):**

| Slice | Invariant | Trigger | GUC |
|-------|-----------|---------|-----|
| 179 (D28) | transactions append-only | BEFORE UPDATE/DELETE | `bescout.allow_transactions_mutation` |
| 189 (heute) | players ghost-row-prevention | BEFORE INSERT | `bescout.allow_player_ghost_insert` |

Beide Trigger verhalten sich stabil, erwischen alle Insert/Update/Delete-Pfade, und erlauben kontrollierten Bypass für Bulk-Migrations. Pattern ist reproduzierbar genug für Copy-Paste-Template.

**Warum kein reines Code-Guard:**

Code-Guards (z.B. Pre-Check in Service-Layer) hätten diese strukturelle Schwäche:
- Neue Call-Site entstanden = neue Gap (siehe Slice 189 Ghost-Quellen: 3 verschiedene manuelle Scripts)
- Raw SQL via MCP oder psql umgeht Code-Guards komplett
- Tests müssten für jeden Call-Site neu durchlaufen werden

**Warum GUC statt Trigger-DROP für Bulk-Imports:**

D28-Analyse: Temporäres Trigger-DROP + Re-CREATE öffnet Race-Window für andere concurrent Writes. GUC (`SET LOCAL`) ist transaction-scoped und thread-safe ohne DDL-Overhead.

### Auswirkungen

- **Code:** Pattern-Referenz in `.claude/rules/errors-db.md` + `memory/patterns.md` dokumentieren (Follow-up-XS-Slice).
- **Prozess:** Bei künftigen Data-Integrity-Anforderungen zuerst fragen: "Kann das via Trigger+GUC abgebildet werden?" bevor Code-Guards überlegt werden.
- **Migration-Template:** REVOKE/GRANT nicht nötig für Trigger-Functions (per database.md Ausnahme). Dafür: COMMENT ON FUNCTION pflicht.
- **Test-Pattern:** 4-Test-Suite etabliert (same-class violation, cross-class violation, positive-case, GUC-bypass).
- **Bekannte Kandidaten:** `trades` (append-only analog transactions), `activity_log` (append-only), künftige `holdings_history`, `audit_log` — alle geeignet für Trigger+GUC.

### Alternativen erwogen

- **Pure CHECK-Constraints:** Verworfen — CHECK kann nicht auf andere Rows (SELECT EXISTS) referenzieren, nur auf eigene Tuple-Fields. Cross-Row-Invariants brauchen Trigger.
- **DEFERRABLE CONSTRAINTS + DEFERRED check:** Verworfen — komplex, schlechter UX bei Fehler (Error erst bei COMMIT), keine Escape-Hatch.
- **RLS-Policies mit custom check-functions:** Verworfen — RLS prüft wer zugreifen darf, nicht welche Daten-Konstellationen legitim sind. Wrong layer.
- **Application-Layer-Guards in Service-Functions:** Verworfen — siehe Begründung oben. Gap-Risk hoch.
- **Materialized Views mit UNIQUE INDEX:** Verworfen — refresh-latency, kein Pre-Insert-Block, Performance-Overhead.

### Re-Visit-Trigger

- Wenn 3+ Slices denselben GUC-Namespace nutzen müssen: Namensraum-Convention dokumentieren (z.B. `bescout.allow_<domain>_<op>`).
- Wenn Trigger-Performance je Bottleneck wird (unlikely bei BEFORE-Row-Triggern mit EXISTS-Subqueries): Partial-Index zur Beschleunigung.
- Wenn GUC-Audit-Log gewünscht: separater Slice (optional Follow-up aus Slice 189 Review).

---

## D40 — PROCESS: Live-Verify mit Chrome-DevTools-MCP statt Hypothesen-Debugging

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

Bei Bug-Reports mit visuellem Symptom (Anil-Screenshots, "X funktioniert nicht") ist die **erste** Aktion **Chrome-DevTools-MCP-Live-Inspection**, nicht Hypothesen-Bildung aus Code-Reading.

### Begründung (Slice 192-Lehre)

Bei Slice 192 hatte ich initial Auth-Race als Hypothese aus Console-Warnings (`get_auth_state RPC slow > 10s timeout`). Live-Network-Trace via Chrome-DevTools-MCP zeigte: RPC liefert in 154ms server-time. **Hypothese widerlegt nach 30 Sekunden Live-Inspection** statt 30 min Code-Lesung.

Konkrete Signale die Live-Inspection liefert:
- `x-envoy-upstream-service-time` = echte RPC-Performance (Server-Side)
- DOM-Pattern-Match (z.B. `#0 MID 0 CR 1/1 SC 0S 0T 0A` = 7-feldige Mapper-Default-Signature)
- Network-Request-Sequenz (parallel vs sequenziell)
- Console-Errors mit Stack-Trace
- Render-State (was tatsächlich im DOM steht)

### Auswirkungen

- **Workflow:** Bei Bug-Reports zuerst `chrome-devtools-mcp` aufrufen, navigieren, snapshot, list_console_messages, get_network_request — VOR Code-Reading
- **Reviewer-Briefings:** Reviewer-Agent-Prompts erwähnen explizit "lies Live-Network-Trace falls vorhanden"
- **Bug-Pattern-Codification:** Symptom-zu-Code-Backtrack-Tabellen in `common-errors.md` (Slice 192-Tabelle als Vorlage)

### Alternativen erwogen

- **Sentry Issue-Stream:** Nur post-mortem, kein Live-State.
- **Playwright-Screenshot-only:** Zeigt nur Pixel, nicht DOM-Struktur, Network, Console.
- **Code-Hypothese + Spec-Reading:** Long-cycle, fehleranfällig (siehe Slice 192 erste Hypothese).

---

## D41 — ARCHITECTURE: Defense-in-Depth-Pattern für Silent-Fails (4-Layer-Standard)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

Bei Silent-Fail-Klassen (Mapper-Defaults überdecken NULL, RPC-Cast lügt, Race-Conditions) ist **Defense-in-Depth mit 4 Layern Pflicht-Standard**, nicht single-point-fix.

**Template:**

```
Layer 1: Type-Truth         — Service-Type matched RPC-Return-Shape (kein lügender Cast)
Layer 2: Service-Filter     — Service filtert kaputte Daten + logSilentCatch
Layer 3: Mapper-Throw       — Mapper wirft i18n-key statt silent-default
Layer 4: Tests              — Unit-Tests für jeden Layer-Branch
```

### Begründung (Slice 192 + 193)

Slice 192 zeigt das Pattern: Symptom (Ghost-Rows) entstand durch **3 sich überdeckende Silent-Fails**:
1. Mapper applizierte Defaults bei `h.player == null`
2. Service akzeptierte data-array ohne Validation
3. Type-Cast `as HoldingWithPlayer[]` log über RPC-Shape

Single-Layer-Fix (z.B. nur Mapper-Throw) hätte CRITICAL Cache-Priming-Pfad gecrasht (Reviewer Finding #1). Erst 4-Layer-Defense + Auth-Gate (Slice 193) eliminiert die Klasse vollständig.

### Auswirkungen

- **Code:** Pattern dokumentiert in `memory/patterns.md` (Pattern-Reference + Slice-192/193-Beispiel)
- **Review-Checkliste:** Reviewer-Agent prüft bei Silent-Fail-Fixes: sind alle 4 Layer gebaut?
- **Service-Layer-Convention:** Bei jeder neuen RPC-konsumierenden Service-Function: Type-Truth + Filter + Throw-on-Invalid + Tests pflicht (Refactor existing services as we touch them)

### Alternativen erwogen

- **Single-Layer (Mapper-Throw only):** Verworfen — Reviewer Finding #1 zeigt Hard-Crash-Risk wenn andere Cache-Pfade unbeobachtet bleiben.
- **Validation-Library (zod, yup):** Verworfen — Performance-Overhead bei jedem Hot-Path-Call. Manueller Discriminator-Check ist schlank.
- **Sentry-Sampling-only:** Verworfen — Catches symptom, not cause. Defense-in-Depth verhindert Symptom überhaupt.

### Re-Visit-Trigger

Wenn nach 5+ Slice-Anwendungen ein 5. oder 6. Layer sich wiederholt einschleicht (z.B. "Hook-Catch in useFantasyHoldings"): Pattern auf 5-Layer erweitern.

---

## D42 — PROCESS: Reviewer-Agent Critical-Findings sind Pre-Merge-Pflicht

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Implizite Praxis "PASS oder REWORK ohne Verbindlichkeit"

### Entscheidung

Reviewer-Agent-Output mit **CRITICAL-Severity-Finding** blockiert Merge. Primary-Claude muss Finding fixen + Review-File aktualisieren mit Status `addressed`, **vor** Commit.

### Begründung (Slice 192 Beispiel)

Reviewer-Agent fand **Finding #1 CRITICAL** — `primeMarketDashboardCaches` schreibt `DbHolding[]` (ohne nested `player`) in `qk.holdings.byUser` Cache. Mit Slice-192 Mapper-Throw wäre `/market → /fantasy/aufstellen` Hard-Crash gewesen. Wäre dieser Finding unaddressed gemerged worden, hätte das den User-facing Bug von "Geister-Rows" zu "Whitescreen" eskaliert.

**Empirisch:** Reviewer-Agent (Cold-Context Opus 4.6) findet pro Slice 1-3 CRITICAL/HIGH-Findings die Primary-Claude in 6-50% der Fälle übersehen hat. Pre-Merge-Pflicht macht das Audit-System zur **echten Qualitätsgate**, nicht Audit-Theater.

### Auswirkungen

- **Hook:** `ship-cto-review-gate.sh` blockt feat/fix/refactor-Commits ohne `worklog/reviews/<slice>-review.md` (bereits aktiv)
- **Workflow-Erweiterung:** Review-File muss bei CRITICAL/HIGH-Findings expliziten "Status: addressed" pro Finding-Item haben (oder explicit "Skipped: <reason>" bei LOW)
- **Self-Review (D35) bleibt erlaubt** für trivial Hygiene + Pattern-Wiederholung — aber NICHT bei Money-Path/Cross-Domain/Auth-Layer

### Alternativen erwogen

- **CONCERNS-Status statt REWORK:** Verworfen — verwischt Verbindlichkeit. PASS|REWORK|FAIL drei-stufig ist klar.
- **Reviewer-Agent als CI-Gate (GitHub Action):** Verworfen — Cost (jede PR triggert Opus-Run). Pre-Commit-Hook reicht.
- **Manueller Reviewer (Anil) statt Agent:** Verworfen — Anil-Bandbreite ist begrenzt, Agent ist 24/7.

---

## D43 — ARCHITECTURE: Type-Truth-Audit-Pflicht bei RPC-konsumierenden Services

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

Jede TypeScript-Service-Function die `supabase.rpc(...)` aufruft MUSS ihren Return-Type gegen den **echten** RPC-Body verifizieren via `pg_get_functiondef('public.fn_name(args)'::regprocedure)`. Kein blinder `as XYZ[]` Cast.

### Begründung (Slice 192 + Reviewer Finding #1)

`getMarketUserDashboard` returnte `DbHolding[]` (kein JOIN auf players in RPC-Body), aber TS-Cast war `as HoldingWithPlayer[]`. Lie-Cast war seit 2026-04-21 (Slice 122) unbemerkt — funktionierte nur weil **kein Consumer den nested `player`-Feld gelesen hatte**. Slice-192 Mapper-Throw deckte die Lie auf — hätte Hard-Crash auf `/market → /fantasy` produziert.

**Empirisch:** Bei Audit der existierenden `as ...[]` Casts in `src/lib/services/` finde wir mit hoher Wahrscheinlichkeit weitere latente Lies (besonders bei aggregierten Dashboard-RPCs).

### Auswirkungen

- **Code:** Audit-Skript `scripts/audit-rpc-type-truth.ts` (TODO Backlog) — automatischer Vergleich `as XYZ[]` casts vs `pg_get_functiondef` shape
- **Service-Layer-Convention:** Neue RPC-Service-Function MUSS einen Type definieren der **exakt** das RPC-Return-JSON matched. Bei Discrepancy: Type ist Wahrheit, Cast wird gefixt
- **Migration-Header-Pflicht:** Jede neue Migration mit `RETURNS jsonb` macht Return-Shape-Doku in Top-Comment (Sample-JSON)

### Alternativen erwogen

- **Auto-generated Types via supabase-cli:** Verworfen — generiert nur für Tabellen, nicht für jsonb-RPC-Return-Shapes.
- **Runtime Schema-Validation (zod):** Verworfen — Performance-Hit auf Hot-Path. Type-Truth at compile-time reicht.
- **Manueller Audit pre-merge:** Verworfen — fehleranfällig. Skript-basierter Audit ist Pflicht.

### Re-Visit-Trigger

Wenn `scripts/audit-rpc-type-truth.ts` mehr als 3 latente Lies findet bei initialem Run: dedizierter Sweep-Slice (analog Slice 081 Cleanup-Sweep).

---

## D44 — PROCESS: Remote-Agent für autonomes Over-Night-Design (neue Modalität)

**Datum:** 2026-04-25
**Status:** ⚠️ Trial (1. Anwendung läuft 2026-04-25 00:35 Berlin)

### Entscheidung

Für **Multi-Day-Spec-Aufgaben** (Architektur-Design, Plan-Doc-Schreiben, Skeleton-Implementation) wird Remote-Agent via `claude.ai/code/routines` als **Over-Night-Workstream** genutzt — Anil schläft, Agent arbeitet, morgen früh PR zum Review.

### Begründung

Lokaler Claude (mein Channel) ist Anils tägliche Bandbreite — limitiert. Remote-Agent ist parallele Bandbreite für:
- Multi-File-Design-Docs (200-500 Zeilen, viel Kontext lesen)
- Skeleton-Implementations (additiv, wenig Risiko)
- Audit-Sweeps (read-only Analyse)

**Konkrete Anwendung:** `trig_01YPzqQgFtgjqij1x5uitJpf` (Walkthrough-Crawler-Design 2026-04-25 00:35 Berlin).

### Auswirkungen

- **Workflow:** Bei Multi-Day-Tasks via `/schedule` Skill — One-shot mit run_once_at
- **Prompt-Quality:** Self-contained, alle Pflicht-Reads explizit, Acceptance-Criteria messbar (siehe Walkthrough-Crawler-Prompt als Vorlage)
- **CEO-Approval-Pattern:** Agent liefert PR mit Open-Questions (5-10 Stück) → Anil reviewt morgens → entscheidet pro Frage → ich (lokaler) baue Phase 2 nach Approval

### Alternativen erwogen

- **Cron-basierter Recurring-Agent:** Funktioniert für Routine-Audits, nicht für Multi-Day-Design.
- **Anil-Solo nachts:** Verworfen — Burnout-Risk, Anil braucht Schlaf.
- **Lokaler Claude über Nacht:** Geht nicht (Mac-Schlaf, Token-Limit).

### Re-Visit-Trigger

Nach 5 Anwendungen Retro: Wie oft Agent-PR sofort gemergt? Wie oft REWORK? Pattern-Erfolgsrate dokumentieren.

### Risiken

- **Update-Race:** Wenn Schedule schon gefeuert ist (run_once_fired), kann Prompt nicht mehr geändert werden. **Konkret heute passiert:** Walkthrough-Crawler-Update kam 23min zu spät → erste PR hat nur Stufe-1, Stufe-2+3 muss als zweiter Slice nachgezogen werden. Gelernt: Zeit-Buffer >5min einplanen, oder Schedule erst nach komplettem Briefing erstellen.
- **Spec-Missverständnis im PR:** Agent baut falsches → PR-Close ohne Merge, kein Schaden.
- **Repo-Permissions:** Erfordert GitHub-App Install (Slice-internal-Setup, einmalig).

---

## D45 — PROCESS: Worktree-Awareness-Briefing als Pflicht-Block für Worktree-Agent-Dispatch

**Datum:** 2026-04-25
**Status:** ✅ Aktiv (empirisch validiert über 5 Tracks)

### Entscheidung

Jeder Frontend/Backend-Agent-Prompt mit `isolation: "worktree"` MUSS am Anfang des Briefings den Worktree-Awareness-Block enthalten:

```
**WICHTIG (Worktree-Awareness, patterns.md #34):** Du arbeitest in einem Worktree.
Dein CWD ist `C:\bescout-app\.claude\worktrees\agent-XXX`. Edits MUESSEN Pfade
unter diesem Verzeichnis verwenden — relative Pfade (`src/components/...`)
oder worktree-prefixed absolute. NIEMALS `C:\bescout-app\src\...` als
absoluter Pfad — das ist main-Repo, nicht dein Worktree.
```

### Begründung

Empirische Daten 2026-04-25:
- **Slice 198 Wave 1** (4 Tracks ohne Briefing): 50% Trap-Rate (3/4 Tracks edited via main-Pfad → Worktree-Junction-Drift, Re-Apply-Heal nötig)
- **Slice 198b Wave 2** (3 Tracks mit Briefing): 0% Trap-Rate
- **Slice 199** (BE+FE mit Briefing): 0% Trap-Rate

Über 5 Tracks mit Briefing: 0/5 Trap. Pattern wirkt scharf.

### Auswirkungen

- **Prozess:** Briefing-Template-Pflicht in jedem worktree-Agent-Dispatch.
- **Code:** Pattern dokumentiert in `memory/patterns.md` #34.
- **Reviewer:** Bei Reviewer-Briefings explizit Trap-Rate als KPI tracken.

### Alternativen erwogen

- **Worktree-CWD-Hook in Settings:** Vercel-Hobby-Limit-analog hard-block. Verworfen — Hooks haben kein Tool-Pre-Context.
- **Path-Sanitizing in Edit-Tool:** Zu invasiv, breaks legitime cross-worktree Operations.
- **Agent-Definition-Update:** Subagent-System-Prompts editieren — verworfen weil global, nicht worktree-spezifisch.

### Re-Visit-Trigger

Wenn nach 10 Slices >0% Trap-Rate → Pattern verschärfen (Hard-Block via Hook).

---

## D46 — PROCESS: Service-Schnittstelle vorab spezifizieren bei parallelem BE+FE-Dispatch

**Datum:** 2026-04-25
**Status:** ✅ Aktiv (Reviewer-Find Slice 199)

### Entscheidung

Bei parallel-dispatch von Backend-Agent + Frontend-Agent in separaten Worktrees MUSS das SPEC vor Dispatch den **kanonischen Service-File-Pfad** plus **exakte Function-Signatur + Type-Definition** festlegen — nicht "BE legt an + FE importiert irgendwo".

### Begründung

Slice 199 Reviewer-Find: BE-Agent + FE-Agent haben parallel `getTopPredictorsLeaderboard` implementiert — BE in `src/lib/services/leaderboards.ts` (canonical), FE in `src/features/fantasy/services/predictions.queries.ts` (duplicate). FE-Hook nutzte FE-Variante → BE's Service war orphan production-code (Drift-Risk).

Heal-Cycle: FE-Duplicate entfernt, Hook-Import auf BE-Pfad re-routed. Vermeidbar gewesen mit klarer Vorab-Spec.

### Auswirkungen

- **SPEC-Template:** Bei Cross-Domain-Slices Sektion "Service-Schnittstelle" pflicht:
  - Canonical Service-File-Pfad (z.B. `src/lib/services/leaderboards.ts`)
  - Exact Function-Signatur (`async function X(args): Promise<T>`)
  - Return-Type-Definition (auch wenn nur skeleton — beide Agents nutzen exakt diese Type)
- **BE-Briefing:** "Du legst Service in `<canonical-path>` an mit Signature `<sig>`"
- **FE-Briefing:** "Du importierst aus `<canonical-path>`. Falls noch nicht da, schreibe inline-Type-Stub mit Backend-Signatur"

### Alternativen erwogen

- **Sequential dispatch BE → FE:** Zu langsam für L-Slices.
- **Beide Agents schreiben Spec-First:** Doppelte Arbeit, Drift-Risk dort.
- **Reviewer-Pflicht-Catch:** Funktioniert (Slice 199 caught), aber Prevention > Detection.

### Re-Visit-Trigger

Bei nächster parallelem Dispatch: bewusst mit Service-Spec arbeiten + tracken ob Drift auftritt.

---

## D47 — PROCESS: Skip-Pattern-Bündelung — gebündelte Wave-Slice statt Einzel-Nachzügler

**Datum:** 2026-04-25
**Status:** ✅ Aktiv (Slice 199 als Erfolgs-Beispiel)

### Entscheidung

Wenn 3+ Slices innerhalb kurzer Zeit den gleichen Skip-Grund nennen ("Backend-Aggregat-RPC fehlt", "Column X muss erst migriert werden", "neuer Cron nötig"), wird daraus eine **gebündelte Wave-Slice** statt 3 Einzel-Nachzügler über die Zeit verteilt.

### Begründung

Slice 198 Track C skipped fm 4.4 + 4.5 wegen Backend. Slice 198b Track C skipped C-05 + K-02 wegen Backend-Aggregat-RPC. Track B skipped fm 2.4 wegen Schema-Annahmen. Reviewer Slice 198b: "Skip-Pattern 'Backend-Aggregat-RPC fehlt' häuft sich (C-05, K-02, fm 2.4, fm 1.3) — Kandidat für Slice 199 als gebündelte RPC-Wave statt einzeln nachzuziehen."

→ Slice 199 = 3 RPCs + 4 UI-Consumers in 1 parallel-dispatch. Effizienz: 4 Findings in 1 Slice statt 4 Slices.

### Auswirkungen

- **Reviewer-Pflicht:** Bei Skip-Findings Pattern-Match prüfen (gleicher Grund über Track/Slice-Grenzen?). Wenn ja → in `notes` als Slice-Kandidat dokumentieren.
- **CTO-Pflicht:** Skip-Backlog scannen vor neuem Slice — wenn Pattern-Cluster >3 → bündeln.
- **Punch-Liste-Format:** Skip-Reason explizit machen, nicht nur "deferred". Macht Pattern-Cluster sichtbar.

### Alternativen erwogen

- **Slice-pro-Finding:** Sauber pro Item, aber 4× Setup-Overhead (Spec/Impact/Reviewer/Push) statt 1×.
- **Catch-all "tech-debt"-Slice:** Zu unspezifisch, kein klarer Acceptance-Criterion.
- **Backlog-Decay:** Skip-Items "vergessen" — verworfen, würde Beta-Readiness gefährden.

### Re-Visit-Trigger

Nach 3 Wave-Slices Retro: Schließrate (Closed/Total) gegen Einzel-Slices vergleichen. Wenn Wave nicht effizienter → Pattern aufgeben.

---

## D48 — PROCESS: Reviewer-Agent als Audit-Stale-Catcher (Already-Fixed-Marker-Pattern)

**Datum:** 2026-04-26
**Status:** ✅ Aktiv (Slice 200a UX-2 + Slice 200b R-03 als 2 Erfolgs-Beispiele)

### Entscheidung

Bei Polish-Sweep-Slices aus Punch-List-Items: Reviewer-Agent ist Pflicht-Catcher für **Audit-Stale**-Bugs (Spec klassifiziert "X fehlt", aber Code im consumed-Hook/parallel-Component löst es bereits). Wenn Reviewer "already-fixed"-Pattern findet, wird das Item **nicht implementiert** sondern als "already-fixed-marker" in der Punch-Liste vermerkt.

### Begründung

Slice 200a (UX-2): Implementierte 5s setTimeout in `MarketContent.tsx:82-92`, aber pre-existing identisches Timer in `useTradeActions.ts:63-69` seit Slice 161. Reviewer fing CRITICAL pre-merge → Heal-Action: Duplicate gelöscht.

Slice 200b (R-03): Spec sagt "Manager-Score isoliert fehlt", aber `GlobalLeaderboard.tsx:19` hat `'manager'`-Tab als Dimension-Filter pre-Slice. Reviewer-Agent dokumentierte als already-fixed-marker.

Beide Cases: Audit aus 2026-04-25 wurde vor Hooks/Service-Layer-Implementation erstellt. Punch-Liste driftet 1-2 Wochen, Audit-Items sind Snapshot-in-Time. Polish-Sweep ohne Pre-Existing-Code-Grep produziert Duplicate-Code in Production.

### Auswirkungen

- **Reviewer-Pflicht (D42-Erweiterung):** Bei Polish-Sweep-Items "ist X bereits implementiert?" als ERSTER Check, BEFORE Spec-Klassifikation akzeptieren. Grep über consumed-hook-source + parallel-Components.
- **Punch-Liste-Format:** Status-Werte erweitert um `already-fixed via <pre-existing-source>` als legitimen Done-Status.
- **CTO-Pflicht:** Vor BUILD jedes Polish-Items: `grep -rn "<spec-pattern>" src/features/<domain>/hooks/ src/features/<domain>/services/ src/lib/hooks/ src/components/<domain>/` als 30-Sekunden-Sanity-Check.
- **Pattern-Codify:** `errors-frontend.md` "Polish-Audit Pre-Existing-Code-Drift" (codifiziert in Slice 200a).

### Alternativen erwogen

- **Audit-Refresh vor jeder Slice:** Wäre teuer (jeden Audit komplett re-scannen). Verworfen — Reviewer-Agent ist günstiger.
- **CI-Gate "Duplicate-Detection":** Static-Analysis schwer (verschiedene Patterns: useEffect, helper-fn, dimension-tab). Verworfen — zu false-positive-prone.
- **Pre-Implementation-Pflicht-Audit:** Würde Single-Track verlangsamen. Reviewer-Agent ist Post-BUILD aber Pre-Merge — gleicher Effekt.

### Re-Visit-Trigger

Wenn 3 Polish-Sweeps in Folge ohne already-fixed-marker enden, Pattern aufgeben (Audit-Drift dann nicht mehr Hauptproblem). Aktuell 2/2 Slices haben einen Marker — Pattern aktiv.

### Beziehung zu D42

D42 (CRITICAL-Findings = Pre-Merge-Pflicht) deckt Code-Quality-Bugs. D48 ist spezialisiert auf Audit-Stale-Bugs in Polish-Sweeps. Beide Reviewer-Agent-Use-Cases.

### Update Slice 202 (2026-04-26): D48 produktiv-validiert

3. Slice nach D48-Codification (Slice 202 FM-9.3 TierComparisonMatrix). Reviewer-Agent fuhr Pre-Existing-Code-Grep (`grep TierComparison|comparison.*tier|stripe.*matrix|TierMatrix|FeatureMatrix` ueber `src/`) — **NO duplicate gefunden**. Greenfield-Component, kein false-positive, kein Heal-Loop.

**Lehre:** D48 funktioniert auch wenn Pre-Existing-Code-Grep zero matches ergibt — der Verifikations-Schritt selbst ist die Versicherung. Die Frage ist nicht "wo ist die Duplicate", sondern "wuerde ich erfahren wenn da eine waere?". Slice 202 hat das mit 14-min Reviewer-Cold-Context-Effort beantwortet.

**Aktuelle Empirie:** 2/3 Slices mit already-fixed-marker (Slice 200a UX-2 + Slice 200b R-03), 1/3 ohne (Slice 202 — clean greenfield). Pattern bleibt aktiv weil 22% Trefferquote in den Polish-Slices reicht zum ROI.

---

## Template für neue Entries

```markdown
## D<n> — <CATEGORY>: <kurzer Titel>

**Datum:** YYYY-MM-DD
**Status:** ✅ Aktiv | ⚠️ Trial | ❌ Verworfen | 📦 Superseded by D<n>
**Supersedes:** D<n> (wenn ersetzt) ODER „—"

### Entscheidung
Ein Absatz, was entschieden wurde. Konkret + messbar.

### Begründung
Warum so? Wer hat entschieden? Welcher Input hat geführt?

### Auswirkungen
- Code: <Files/Slices>
- Prozess: <Workflow-Änderungen>
- Team: <Wer muss wissen>

### Alternativen erwogen
- **<Alt A>:** Verworfen weil <Grund>.
- **<Alt B>:** Verworfen weil <Grund>.

### Re-Visit-Trigger (optional)
Wann diese Entscheidung neu bewerten? (z.B. „bei >100 DAU", „post-Beta", „wenn KPI X unter Y")
```

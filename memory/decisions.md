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

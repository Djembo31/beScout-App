# Beta-Testplan (Phase 3b)

**Zweck:** Strukturierter 30-Min-Usability-Test mit 3 echten Pilot-Fans. Ziel ist NICHT „funktioniert es", sondern **„wo stolpert ein echter User?"**

**Format:** Zoom mit Screen-Share des Testers, Anil moderiert, Claude-Code oder Notion tickt mit. Jeder Call wird in `memory/beta-test-results.md` gespiegelt.

**Tester-Profil (empfohlen):**
- **Tester A** — Technik-affin, Fußball-Fan → testet Power-User-Flows
- **Tester B** — Nicht fußballaffin → testet ob App „selbsterklärend" ist (Proxy für Non-Pilot-Users)
- **Tester C** — Türkisch-sprachig → testet TR-Locale live (Ergänzung zum Deutsch-Türke-Review)

**Regeln für Anil als Moderator:**

1. **Reden lassen.** Stille ist OK. Nicht erklären, wenn Tester stolpert — beobachten.
2. **„Denk laut" erinnern.** Bei jeder Task einmal: „Sag mir was du siehst und was du als nächstes erwartest."
3. **Nicht helfen, auch wenn es weh tut.** Wenn Tester den „Kaufen"-Button nicht findet in 45 Sek → das IST das Finding. Notieren.
4. **Immer fragen:** „Was hast du gerade erwartet, dass passiert?" vs. „Was ist wirklich passiert?"
5. **Keine leading questions.** „War das gut?" ist raus. „Wie fühlte sich das an?" ist rein.

---

## Die 8 Tasks (in Reihenfolge, ~30 Min total)

### Task 1 — Ankommen & Onboarding (3 Min)

**Moderator sagt:**
> „Geh auf bescout.net auf deinem Handy. Registriere dich mit deiner E-Mail. Durchklick was du siehst. Sag mir alles was du denkst."

**Was Anil beobachtet:**
- [ ] Versteht Tester was BeScout ist nach 30 Sek?
- [ ] Bleibt auf Landing-Page hängen oder klickt direkt Signup?
- [ ] Email-Verifizierung: Dauer? Problem?
- [ ] Welcome-Onboarding: klickt er alles durch oder überspringt?
- [ ] **Knackfrage am Ende:** „Was meinst du, was kann man hier machen?"

**Red Flags:** >2 Min bis zum ersten Erkenntnis-Moment. Tester sagt „Ist das wie [anderes Spiel/App]?" (= Positioning unklar).

---

### Task 2 — Finde einen Lieblings-Spieler (5 Min)

**Moderator sagt:**
> „Du wolltest hier Fußballspieler scouten. Such dir einen aus, den du persönlich magst — egal aus welcher Liga."

**Was Anil beobachtet:**
- [ ] Navigiert Tester zu Market? Rankings? Clubs? (Entry-Point-Erkenntnis)
- [ ] Nutzt Filter (Country/League) oder scrollt wild?
- [ ] Beim Klick auf Spieler-Card: ist Detail-Page lesbar?
- [ ] L5-Score, Preis, Trend — versteht er die Metriken?
- [ ] **Knackfrage:** „Welcher Metrik hier ist dir am wichtigsten?"

**Red Flags:** Tester findet Filter nicht. „L5" / „Floor" / „$SCOUT" unverständlich. Wirkt überwältigt von Spalten.

---

### Task 3 — Kaufe deine erste Scout Card (3 Min)

**Moderator sagt:**
> „Kauf diese Karte. Wähl eine günstige, unter 200 Credits."

**Was Anil beobachtet:**
- [ ] Findet „Kaufen"-Button innerhalb 10 Sek?
- [ ] Versteht $SCOUT-Betrag (= Credits, nicht Euro, nicht Krypto)?
- [ ] BuyModal: Info klar? Button-Labels verständlich?
- [ ] Nach dem Kauf: sieht er Bestätigung? Findet er die Card in seinem Kader?
- [ ] TradingDisclaimer sichtbar? Liest er ihn? (Für Compliance-Check.)
- [ ] **Knackfrage:** „Was kostet dich das jetzt in Euro?"

**Red Flags:** Tester denkt es ist echtes Geld. Versteht nicht dass Cards virtuell sind. Panik beim Klick.

---

### Task 4 — Ein Fantasy-Event mitspielen (5 Min)

**Moderator sagt:**
> „Schau dir die Fantasy-Events an. Tritt einem kostenlosen bei und stell ein Team auf."

**Was Anil beobachtet:**
- [ ] Fantasy vs. Manager-Tab: ist der Unterschied klar?
- [ ] Event-Liste scrollbar, Formate (6er/11er) verständlich?
- [ ] Join-Flow: Entry-Fee-Warnung (obwohl 0) verstörend?
- [ ] Lineup-Builder: Drag-Drop intuitiv? Positions-Slots klar (GK/DEF/MID/ATT)?
- [ ] Fixture-Deadlines sichtbar?
- [ ] **Knackfrage:** „Was passiert jetzt, wenn das Event startet?"

**Red Flags:** Tester versteht nicht dass es um echte Spieltage/Scorings geht. Denkt es ist Simulation-Spiel. Versucht zu kaufen-um-zu-spielen (Confusion Trade ↔ Fantasy).

---

### Task 5 — Check Community-Feed (3 Min)

**Moderator sagt:**
> „Schau in der Community nach was los ist. Lies ein paar Posts. Schreib einen eigenen."

**Was Anil beobachtet:**
- [ ] Feed hat Content? (Nach Slice 129 Cleanup sind nur noch 10 Posts da — vielleicht leer wirkend!)
- [ ] Versteht er die Post-Kategorien (Analyse/Meinung/News)?
- [ ] „Post schreiben" auffindbar?
- [ ] Char-Limit / Tags / Image-Upload — Friction?
- [ ] Nach Post: sieht er ihn selbst sofort? Kann er ihn löschen?
- [ ] **Knackfrage:** „Würdest du hier regelmäßig vorbeischauen?"

**Red Flags:** Feed fühlt sich leer an. Tester weiß nicht was postwürdig ist. Post geht verloren nach Submit.

---

### Task 6 — Mission einlösen (3 Min)

**Moderator sagt:**
> „Geh zu Missionen. Da sollte was sein was du abschließen oder claimen kannst."

**Was Anil beobachtet:**
- [ ] Missions-UI klar strukturiert?
- [ ] Findet er eine abgeschlossene Mission zum Claimen?
- [ ] Reward-Betrag sichtbar BEVOR Claim?
- [ ] Nach Claim: sieht er Credits-Zuwachs in Wallet?
- [ ] **Knackfrage:** „Welche Mission würde dich als nächstes motivieren?"

**Red Flags:** Progress unverständlich. Kein Feedback nach Claim. Versteht Unterschied Daily/Mission/Achievement nicht.

---

### Task 7 — Club-Abo anschauen (kein Kauf) (3 Min)

**Moderator sagt:**
> „Geh zu einem Verein den du magst. Schau dir die Abo-Tiers an — Bronze, Silber, Gold. NICHT KAUFEN, nur anschauen."

**Was Anil beobachtet:**
- [ ] Navigation zu Club-Seite intuitiv?
- [ ] Sub-Tier-Vergleich lesbar?
- [ ] Versteht Tester die Benefits pro Tier?
- [ ] Preise realistisch empfunden? (Bronze 500 $SCOUT, Silber 1500, Gold 3000)
- [ ] **Knackfrage:** „Welchen Tier würdest du nehmen und warum?"
- [ ] **Bonusfrage:** „Würdest du überhaupt zahlen für so ein Abo? Wofür?"

**Red Flags:** „Das sind doch nur Credits, nicht Euro, oder?" (Kennt $SCOUT-Preis nicht mehr). Keine Motivation für Silber/Gold sichtbar.

---

### Task 8 — Profile + Abmelden (2 Min)

**Moderator sagt:**
> „Zum Schluss: Geh in dein Profil. Schau dir Achievements + Transaktionen an. Dann meld dich ab."

**Was Anil beobachtet:**
- [ ] Profil-Navigation (Avatar oben rechts?) auffindbar?
- [ ] Achievement-Liste verständlich? Gesperrte Ach. triggert Neugier?
- [ ] Transaktionshistorie klar (Kauf/Verkauf/Mission-Reward getrennt)?
- [ ] Findet Logout innerhalb 10 Sek?
- [ ] **Knackfrage:** „Wie fühlt es sich an, dein Profil zu sehen? Stolz? Motiviert?"

**Red Flags:** Logout versteckt. Transaktions-Liste unleserlich (Tech-Labels statt User-Language).

---

## Abschluss-Fragen (5 Min, nach Tasks)

Moderator stellt in dieser Reihenfolge, ohne zu führen:

1. **„Was hat dir am besten gefallen?"** (Celebrate what works)
2. **„Was war verwirrend oder frustrierend?"** (Pain-Points mit freier Assoziation)
3. **„Was hast du vermisst?"** (Feature-Gaps aus User-Sicht)
4. **„Auf einer Skala von 1-10: Wie wahrscheinlich würdest du BeScout einem Freund empfehlen?"** (NPS)
   - Bei <7: „Was müsste anders sein damit es 9-10 wäre?"
5. **„Würdest du in 1 Woche nochmal reinschauen? Wenn ja, wofür?"** (Retention-Intent)
6. **„Was hältst du vom Produktnamen + Branding?"** (Bonus, oft ehrlich)

**Ab Tester B+C zusätzlich:**
7. **„Kennst du vergleichbare Apps? Welche?"** (Competitive-Positioning)
8. **Für Tester C (türkisch):** „Die Übersetzungen — fühlt sich das natürlich an oder holprig?" (TR-UX live)

---

## Dokumentation nach jedem Call

Sofort nach Zoom-Ende (spätestens 30 Min später):

1. Öffne `memory/beta-test-results.md`
2. Fülle Tester-Sektion (A / B / C) mit Observations pro Task
3. Markiere 3-5 **Killer-Findings** (Showstopper für Beta-Go-Live)
4. Markiere 3-5 **Quick-Wins** (wenig Arbeit, große UX-Wirkung)
5. Commit: `docs(beta-test): tester <A|B|C> session results`

Am Ende aller 3 Calls:
6. Aggregiere **Top-10 Issues** in `worklog/log.md`-Section „Phase 3b Findings"
7. Entscheide: Welche sind Beta-Blocker vs. Post-Beta?
8. Slice(s) für Beta-Blocker aufmachen → fix → re-deploy

---

## Anti-Patterns (was Anil NICHT machen darf)

1. **„Ah das hab ich vergessen, schau mal hier"** — Tester führen = Test kaputt. Beobachten.
2. **Task überspringen weil „klar wird nicht funktionieren"** — genau DIESER Fail ist das wertvolle Finding.
3. **Feedback rationalisieren** („Das ist halt Beta") — Tester-Stimme bleibt unkommentiert im Protokoll. Filtern nach.
4. **Tester in Richtung kaufen/traden drängen** — organisches Verhalten ist das, was wir testen.
5. **Alle 3 Tester am selben Tag durch** — 2 am Tag max, sonst verschwimmen Observations.

---

## Equipment-Checkliste vor jedem Call

- [ ] Zoom-Call läuft + Recording gestartet (mit Tester-Zustimmung)
- [ ] Tester nutzt Handy (nicht Desktop), weil Mobile = Primär-Target
- [ ] Zweiter Monitor bei Anil: `memory/beta-test-results.md` offen zum tippen
- [ ] Test-Account bereitgestellt (oder Tester registriert sich live)
- [ ] Notizblock + Stift als Fallback
- [ ] `scripts/beta-metrics.mjs` einmal vor dem Call laufen lassen (Baseline)
- [ ] `scripts/beta-metrics.mjs` einmal nach allen Calls laufen lassen (Impact-Messung)

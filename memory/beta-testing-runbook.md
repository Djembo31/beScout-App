# Beta-Testing Runbook (Phase 3b)

**Zweck:** Wie Anil die 3 Zoom-Calls operativ durchzieht. Setup + Moderation + Follow-up.

**Verweis:** `memory/beta-testplan.md` (die 8 Tasks), `memory/beta-test-results.md` (Protokoll-Template).

---

## 1. Tester-Akquise (vor Termin-Vereinbarung)

### Kriterien für gute Tester
- **Tester A (Power-User):** Tech-affin (nutzt viele Apps), Fußball-Fan (versteht Liga-Struktur, Spielerwerte). Beispiel: Freund aus der Coding-Bubble + Fußball-Interesse.
- **Tester B (Novice):** NICHT fußballaffin — aber offen für neue Apps. Beispiel: Ex-Kollege aus anderer Branche. Kritischster Test für „selbsterklärend".
- **Tester C (TR-Locale):** Türkisch-sprachig, nutzt tendenziell TR-Websites. Entweder in TR oder DE-Türke. Tests die tatsächliche TR-UX (nicht Deutsch-Türke-Übersetzung auf Papier).

### Nachrichten-Template (DM)

**DE:**
> Hey [Name], ich bau gerade BeScout — Scouting-App für Fußballfans (bescout.net). Vor dem Beta-Launch brauch ich 30 Min von dir für einen ehrlichen Usability-Test per Zoom. Du klickst, ich schau zu, du sagst alles was du denkst. Kein Vorbereiten nötig. Feedback hilft massiv. Hättest du diese Woche Zeit?

**TR:** _(nur für Tester C)_
> Merhaba [Name], BeScout'u geliştiriyorum — futbol fanları için scouting uygulaması (bescout.net). Beta-Launch öncesi senden 30 dakika istiyorum, Zoom üzerinden dürüst bir kullanılabilirlik testi için. Sen tıklayacaksın, ben izleyeceğim, sen düşündüklerini söyleyeceksin. Hazırlığa gerek yok. Geri bildirimin çok değerli. Bu hafta müsaitlik var mı?

### Termin-Cluster
- **NICHT** alle 3 am selben Tag — Observations verschwimmen, Anil ist müde.
- Empfehlung: Mo-Mi-Fr oder Di-Do-Sa. 1-2 Tage Abstand zwischen Calls.

---

## 2. Pre-Call-Setup (15 Min vor Tester-Join)

### Technik
- [ ] Zoom öffnen, Recording-Berechtigung vorbereiten (Tester vor Start um Zustimmung fragen)
- [ ] 2. Monitor frei für Notizen
- [ ] `memory/beta-test-results.md` im Editor offen, Tester-Sektion A/B/C vorbereitet
- [ ] Stoppuhr / Timer griffbereit (für 30-Min-Budget)
- [ ] Handy mit Tester-Browser NICHT verbinden — Tester nutzt SEIN Handy
- [ ] Logout aus dem eigenen Account auf bescout.net (kein geteilter State)

### BeScout-Status
- [ ] `gh run list --limit 3` — sind alle CI-Runs grün?
- [ ] `pnpm run beta:metrics` Baseline-Snapshot speichern (als Referenz)
- [ ] Sentry-Dashboard offen in Browser-Tab (falls während Test ein Error kommt)
- [ ] `memory/beta-exit-criteria.md` zweiter Tab als Reminder

### Moderator-Mindset
- „Ich bin nicht hier um zu verkaufen, ich bin hier um zu lernen."
- Bei Stolperer: **Innerlich zählen: 10-9-8-7-6-5-4-3-2-1** bevor ich helfe. Meistens löst Tester es selbst in 10 Sek — DAS ist das Finding.

---

## 3. Opening-Script (3 Min)

**Anil sagt zum Tester:**

> „Hi, danke dass du dir Zeit nimmst. Wir haben 30 Minuten, super locker. Ich zeig dir BeScout — das ist eine Scouting-App für Fußballfans. Du wirst ein paar Sachen ausprobieren, ich schau dir zu. Wichtig: **Sag mir alles was du denkst, auch wenn es dumm klingt**. Wenn was unklar ist, sag es. Wenn du verwirrt bist, sag es. Wenn was cool ist, auch das. Das ist KEIN Test für dich — das ist ein Test für die App. Wenn du stolperst, ist es die App die versagt hat, nicht du.
>
> Ich helfe dir absichtlich nicht — auch wenn es weh tut. Nur wenn du 45 Sekunden wirklich feststeckst, fangen wir nochmal neu an.
>
> Ich nehme den Call auf (mit deiner Zustimmung), damit ich später genau nachhören kann. Ist das okay?"

Nach Zustimmung: Recording starten, Tester teilt Screen.

---

## 4. Während der Tasks (30 Min)

- Timer pro Task sichtbar halten — aber Tester NICHT sagen was die Zeit-Targets sind.
- Beobachtungs-Notizen während Tester spricht (nicht nach dem Call — zu spät).
- Key-Phrases markieren die wörtlich festgehalten werden (für Zitat-Qualität).
- Bei **Nachfrage vom Tester** („soll ich das klicken?"): immer „Mach was du natürlich machen würdest" zurück.
- Bei **offensichtlichem Bug** (App crashed, Screen weiß): Tester höflich bitten Browser-Refresh, Task fortsetzen. Bug-ID notieren, Sentry-Check nach Call.
- **Nach jeder Task:** 15-Sek-Pause, Tester durchatmen lassen, Knackfrage stellen.

---

## 5. Closing-Script + Abschluss-Fragen (5 Min)

**Anil sagt:**

> „Super, das war's mit den Tasks. Ich hab noch paar schnelle Fragen. Kurze Antworten reichen, ich will deine erste Reaktion."

Dann die 6-8 Abschluss-Fragen aus `beta-testplan.md`. In dieser Reihenfolge, ohne Führen.

**Letzter Satz:**

> „Letzte Sache: Wenn du in einer Woche nochmal reinschauen würdest — wofür würdest du kommen?"

Antwort notieren. Dann:

> „Danke. Ich schick dir in 2 Wochen nochmal einen Link, falls du magst — aber kein Druck."

---

## 6. Post-Call (sofort, 30 Min)

### Direkt nach Zoom-End

1. **Beta-Test-Results füllen** — solang Nuancen noch frisch sind. Tester-Zitate wörtlich aus Notizen.
2. **3-5 Killer-Findings markieren** — Dinge die Beta-Launch blocken würden.
3. **3-5 Quick-Wins identifizieren** — wenig Code, große UX-Wirkung.
4. **Sentry prüfen:** Ist während dem Call ein Error aufgetreten? Falls ja: Issue-Link zum Finding.

### Commit-Zyklus

```bash
git add memory/beta-test-results.md
git commit -m "docs(beta-test): tester <A|B|C> session results"
git push origin main
```

**Nicht committen:**
- Zoom-Recording (zu groß + Privacy)
- Tester-Klartextname

---

## 7. Nach allen 3 Calls — Aggregation

### Am Ende der Testwoche

1. `memory/beta-test-results.md` → Sektion „Aggregierte Findings" füllen
2. Top-10 Issues sortiert nach Severity × Frequency
3. NPS-Durchschnitt rechnen
4. **Go/No-Go/Extend-Entscheidung treffen:**
   - Check gegen `memory/beta-exit-criteria.md` (Entscheidungs-Matrix)
   - Entscheidung dokumentieren + Begründung

### Wenn GO-LIVE

- Beta-Blocker-Slice(s) aufmachen → fix → re-deploy → `pnpm run test:smoke` + `pnpm run test:synthetic` als Regression-Check
- Invite-Liste für Pilot-Fans (10-20 Personen) zusammenstellen
- Phase 4 starten (Polish + TR-Review final)

### Wenn EXTEND (+7 Tage)

- P1-Fixes priorisieren
- Pilot-Fans informieren: „Beta läuft 1 Woche länger, hier ist was passiert"
- Re-Test nach Fix (1 Tester reicht)

### Wenn ABORT

- Post-Mortem schreiben in `memory/post-mortem-beta-abort-YYYY-MM-DD.md`
- Launch-Datum verschieben
- Root-Cause in `.claude/rules/common-errors.md` festhalten
- Neuen Plan mit Anil besprechen

---

## 8. Häufige Fallstricke

1. **„Der Tester versteht das sicher, ich erklär's ihm kurz"** — NEIN. Beobachten.
2. **„War nicht so schlimm, wir überspringen das Finding"** — JEDES Finding in Template, Entscheidung später ob Beta-Blocker.
3. **„Tester A war sehr positiv, dann brauchen wir B+C nicht mehr"** — JEDER Tester hat andere Perspektive. Alle 3 durchziehen.
4. **„Ich mach Tester B+C zusammen, spart Zeit"** — Zwei Tester gleichzeitig = falsche Dynamik. Einzeln.
5. **Tester-Empathie-Trap:** Wenn Tester sichtbar frustriert ist, gibt es Drang zu sagen „Ja das ist schon in Arbeit". NIEMALS. Stattdessen: „Sag mir was du stattdessen erwartet hättest."

---

## 9. Checkliste Gesamt-Phase-3b

**Pre:**
- [ ] 3 Tester vereinbart (Termine in Kalender)
- [ ] `beta-testplan.md` durchgelesen
- [ ] Deutsch-Türke für TR-Review-Stage kontaktiert (parallel, für nach Phase 3b)

**Während:**
- [ ] Tester A durchgeführt, results committed
- [ ] Tester B durchgeführt, results committed
- [ ] Tester C durchgeführt, results committed

**Post:**
- [ ] Aggregierte Findings in `beta-test-results.md`
- [ ] Go/No-Go/Extend-Entscheidung getroffen + dokumentiert
- [ ] Slice(s) für Beta-Blocker aufgemacht
- [ ] `memory/decisions.md` bekommt Entry `D<n>` mit Beta-Launch-Entscheidung (DISTILL-Pflicht)

**Dann Phase 4:** Polish + TR-Review final + Invite-Liste.

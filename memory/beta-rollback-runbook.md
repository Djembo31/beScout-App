# Vercel-Rollback Runbook (Beta-Launch)

**Zweck:** Wenn ein Deploy während Beta einen P0-Bug einführt — in <3 Minuten auf letzten guten Deploy zurück.

**Vercel-Project:** `beScout-app`  ·  **Production-Domain:** `bescout.net`

**Wichtigstes Prinzip:** Rollback ist nicht teurer als Forward-Fix. Bei Zweifel ZUERST rollback, dann in Ruhe debuggen.

---

## Wann rollen wir zurück? (Entscheidungs-Matrix)

| Symptom | Rollback? |
|---------|-----------|
| Post-Deploy-Smoke GHA failed | **JA — sofort** |
| Sentry Alert Rule 1 (Error-Rate >1%) feuert | **JA — sofort** |
| Sentry Alert Rule 3 (Money/Cron-Error) feuert | **JA — sofort**, danach Admin-Kill-Switch für Trading |
| User-Report: „Login broken", „Kann nicht kaufen" | **JA** nach Reproduktion (<5 Min) |
| Visueller Bug (Badge falsch, Layout kaputt) | NEIN — Forward-Fix im nächsten Slice |
| Einzelne 500er-Spitze (<0.5% Requests) | NEIN — watchen, Forward-Fix planen |

**Faustregel:** *Wenn 1 von 20 Pilot-Fans den Bug sieht und stoppt → Rollback.*

---

## Rollback-Prozedur (3 Minuten)

### Option A — Vercel CLI (schnellster Pfad, 90 Sekunden)

```bash
# 1. Login check
vercel whoami
# Falls leer: vercel login

# 2. Letzte Deploys listen (zeitlich sortiert, READY zuerst)
vercel ls bescout-app --prod

# 3. Ziel-Deploy (letzter guter) aus Liste picken — URL kopieren
# z.B. dpl_5P2uXG7vzWfHBxFkKUj6pBHRLDv8

# 4. Rollback
vercel rollback dpl_5P2uXG7vzWfHBxFkKUj6pBHRLDv8 --yes

# 5. Verify
curl -I https://bescout.net | grep -i 'x-vercel-deployment-url'
# Sollte den rollback-target-Deploy zeigen.

# 6. Custom-Domain switch auto, aber Sanity-Check:
#    https://bescout.net öffnen, Smoke-Fluss durchklicken.
```

### Option B — Vercel Dashboard (fallback, 2 Minuten)

1. https://vercel.com/<team>/bescout-app/deployments
2. Liste zeigt alle Deploys mit Status + Git-SHA.
3. Letzten `Ready` + `Production` Deploy vor dem broken-one finden.
4. „..." (right side) → **Promote to Production**.
5. Bestätigen → Domain switched atomic in ~30 Sek.

### Option C — GHA (wenn CI + CLI nicht greifbar)

Git-Revert + neuer Deploy:
```bash
git revert <broken-commit-sha> --no-edit
git push origin main
# Wartet auf CI + Deploy — dauert 5-10 Min total.
```

**Nutze C NUR wenn A + B nicht funktionieren.** C triggert ein neues Build, ist langsamer, und kann weitere Bugs einführen.

---

## Post-Rollback-Checks (5 Min)

Nach erfolgreichem Rollback:

```bash
# 1. Post-Deploy-Smoke manuell triggern
gh workflow run post-deploy-smoke.yml

# 2. Sentry — sind die Error-Spikes weg?
# (via MCP)
# mcp__sentry__search_events("count of errors in last 15 minutes")

# 3. Beta-Metrics-Script — alles normal?
pnpm run beta:metrics

# 4. Bekannten User-Flow manuell durchklicken (Jarvis-QA-Account).
```

Wenn alles grün → **rollback war erfolgreich, P0 abgewendet**.

---

## Kommunikation nach Rollback

1. **Pilot-Fans informieren** (wenn >5 Min offline waren):
   - WhatsApp/Telegram-Nachricht: „Kurze Störung behoben. Plattform wieder stabil."
   - Kein Detail über broken Feature — schafft nur Unsicherheit.

2. **Incident-Log anlegen** (`memory/incident-YYYY-MM-DD-<slug>.md`):
   - Zeitstempel (Alert → Rollback → Resolved)
   - Betroffener Commit
   - Symptom
   - Root-Cause (wenn bekannt)
   - Forward-Fix-Plan

3. **Slice für Forward-Fix aufmachen** (`/ship new "Fix: <title>"`).

---

## Test-Prozedur VOR Beta-Start (Pflicht einmal!)

**Um Rollback-Zeit zu messen und zu üben:**

1. **Absichtlich einen „intentional bug" deployen** (z.B. ein harmloses Timing-Issue oder nur einen kosmetischen Fehler).
   ```bash
   # Beispiel: 1-Zeilen-Fehler in einer Page — klar als Test erkennbar.
   # git commit -m "test(rollback): intentional ui breakage for rollback drill"
   # git push
   ```

2. **Warten bis Vercel-Deploy grün + Live.**

3. **Jetzt Rollback üben** (Option A oder B oben).

4. **Zeit messen:**
   - Von: „Entscheidung Rollback" bis „bescout.net zeigt alten Deploy wieder"
   - Ziel: **<3 Minuten**.
   - Wenn >5 Min: Workflow optimieren, CLI-Login vorbereiten.

5. **Ergebnis festhalten** (`worklog/proofs/rollback-drill-YYYY-MM-DD.txt`):
   - Zeit gemessen
   - Fallstricke entdeckt (z.B. 2FA-Prompt? CLI-Token abgelaufen?)
   - Improvements für echten Incident

---

## Bekannte Fallstricke

1. **Vercel-CLI-Version veraltet:** `vercel --version` — aktuell sollte ≥33 sein. Update: `npm i -g vercel@latest`.

2. **Service-Worker cached alten Deploy:** User-Browser zeigt manchmal alten Bundle trotz Rollback. Workaround: Hard-Reload (Strg+F5). Für Pilot-Fans in Kommunikation erwähnen.

3. **Supabase-Schema-Inkompatibilität:** Wenn der broken-Deploy eine Migration brachte, muss die auch zurück. **Vercel-Rollback alleine reicht nicht** — zusätzlich Migration manuell revert via MCP. → Bei Schema-Migrationen immer: *Migration rollforward-only schreiben* (additive, backwards-compatible).

4. **ENV-Var-Änderungen sind nicht Teil vom Deploy:** Wenn du zwischen Deploys eine ENV-Var geändert hast, greift Rollback sie NICHT. Du musst manuell in Vercel-Dashboard zurücksetzen.

---

## Matrix: Rollback-Safe vs. Nicht-Rollback-Safe Slices

| Slice-Typ | Rollback-safe? |
|-----------|:--------------:|
| Frontend-UI, i18n | ✅ Ja |
| Service-Layer-Refactor ohne Schema | ✅ Ja |
| Additive Migration (neue Spalte NULL) | ✅ Ja (rollback lässt Spalte ungenutzt — unkritisch) |
| Rewriting Migration (Rename, NOT NULL) | ❌ NEIN — braucht Migration-Revert + Code-Rollback synchron |
| ENV-Var-Change | ❌ Teilweise — ENV muss manuell zurück |
| Secret-Rotation | ❌ NEIN — nicht rollbacken, nur forward-fix |

**Regel:** Bei „nicht-rollback-safe" Slices VOR Merge nochmal fragen: *Was wenn das broken ist?* — wenn unklar → Feature-Flag davor + Canary-Test.

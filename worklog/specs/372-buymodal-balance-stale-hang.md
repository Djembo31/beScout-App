# Slice 372 — BuyModal hängt bei „Saldo wird aktualisiert…" (Freshness-Gate ohne Self-Heal)

**Status:** SPEC · **Größe:** S · **Slice-Type:** UI (Bug-Fix, Money-Pfad) · **Scope:** CTO (Cache-/UX-Fix, Money-Logik byte-identisch) · **Datum:** 2026-06-24

---

## 1. Problem Statement

Im Kauf-Modal (`BuyModal` → `BuyForm`) bleibt der „Kaufen"/„Commit"-Button dauerhaft disabled mit der Statuszeile **„Saldo wird aktualisiert…"** (`balanceRefreshing`), die sich **nie** auflöst (>30s). Reproduzierbar gemeldet im 368c-E2E-Walk (`worklog/notes/368c-e2e-trading-findings.md` F3 / Tabelle G): „Menge per **Tippen** → hängt; mit **+/−** ok."

**Korrigierte Ursache (Code-Analyse, nicht die Korrelation aus dem Report):** Das „Tippen vs. +/−" ist ein **Timing-Artefakt**, kein kausaler Auslöser. `useIsBalanceFresh()` (`src/lib/hooks/useWallet.ts:163`) gated rein zeitbasiert: `Date.now() - dataUpdatedAt < 30_000` UND `!isFetching`. Die Wallet-Query hat `staleTime:0` und ist bereits über die TopBar gemountet → **das Öffnen des BuyModals triggert keinen Refetch**. Ist die Balance beim Öffnen (oder nach >30s Verweildauer im Modal) älter als 30s, wird `balanceStale=true` und **bleibt es für immer**, weil nichts einen Reload auslöst. Die Meldung „Saldo wird aktualisiert…" behauptet einen Refresh, der nicht stattfindet.

**Wer/wie oft:** Jeder Käufer auf einer Session, die >30s ohne Wallet-Refetch im Buy-Modal verweilt (langsames Lesen/Tippen, Mobile-Tab-Switch zurück). Money-Pfad-blockierend (User kann nicht kaufen) → MEDIUM/HIGH-UX im Kern-Flow.

## 2. Lösungs-Design (Architektur)

Das Freshness-Gate von **passiv-blockierend** zu **aktiv-selbstheilend** machen: Wenn die Balance im offenen Buy-Modal stale ist, **aktiv refetchen** statt nur zu blockieren. Dann gilt:
- Stale → Refetch startet → `isFetching=true` → `balanceStale` bleibt kurz true (Meldung jetzt **ehrlich**, ein Fetch läuft wirklich) → Fetch fertig → `dataUpdatedAt` frisch → `balanceStale=false` → Button frei.

**Umsetzung (minimal):**
1. `useWallet()` exponiert zusätzlich `refetch` (aus `useQuery`).
2. In `BuyForm` (wo `balanceStale` lebt) ein `useEffect`, der bei `balanceStale === true` `refetch()` ruft. Self-Heal, kein Loop (Effekt-dep = `balanceStale`; bleibt der Wert true während des Fetches, feuert der Effekt nicht erneut; nach Erfolg flippt er auf false).

**Datenfluss vorher:** Modal offen + Balance >30s alt → `balanceStale` true → Button disabled → (kein Auslöser) → bleibt disabled.
**Datenfluss nachher:** `balanceStale` true → `useEffect` → `refetch()` → frische `dataUpdatedAt` → `balanceStale` false → Button frei.

**Money-Logik unberührt:** Es wird nur die Wallet-Balance neu **gelesen** (read-only), keine Buchung, kein RPC-Verhalten geändert.

Neue Interface-Erweiterung (exakt):
```ts
export interface UseWalletResult {
  // …bestehend…
  /** Manueller Refetch (React-Query). Self-Heal des Freshness-Gates. */
  refetch: () => Promise<unknown>;
}
```

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/hooks/useWallet.ts` | EDIT | `refetch` aus `useQuery` in `UseWalletResult` exponieren (Interface + Return). |
| `src/components/player/detail/BuyModal.tsx` | EDIT | In `BuyForm`: `useEffect` der bei `balanceStale` `refetch()` ruft (Self-Heal). |

**Vor diesem Slice greppt man:** `grep -rn "useIsBalanceFresh\|balanceStale\|balanceRefreshing\|useWallet(" src/` — alle Freshness-Gate-Consumer identifizieren (BuyModal, evtl. BuyOrderModal).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/hooks/useWallet.ts` (1-168) | Freshness-Mechanik | `useIsBalanceFresh` = `Date.now()-dataUpdatedAt<30s && !isFetching`; `staleTime:0`; `refetch` aus query verfügbar? (ja, `useQuery`-Return). |
| `src/components/player/detail/BuyModal.tsx` (47-120) | `BuyForm` + `balanceStale` | Wo `balanceStale` berechnet wird (Z.68), wo Button disabled (Z.107), wo `balanceRefreshing` rendert (Z.113). |
| `worklog/notes/368c-e2e-trading-findings.md` (F3/G) | Original-Evidence | Genauer gemeldeter Symptom-Wortlaut. |
| `.claude/rules/errors-frontend.md` „TanStack v5: initialData vs placeholderData" (S268) | Bekannte Falle | `placeholderData` → `dataUpdatedAt=0` → Freshness false bis Real-Fetch — bestätigt, warum on-open-Refetch nötig. |
| `.claude/rules/performance.md` „React Query" | Refetch-Hygiene | Kein `staleTime:0`-Antipattern neu einführen; refetch nur gezielt. |
| `grep -rn "useIsBalanceFresh" src/` | Andere Consumer | Greift derselbe Hang in `BuyOrderModal`/Sell? (Scope-Entscheid). |

## 5. Pattern-References

- `errors-frontend.md` „Derived-Loading aus `data === undefined`" (S283) — analoge Klasse: Gate hängt, weil ein Failure/Stale-Mode keinen Recovery-Pfad hat.
- `errors-frontend.md` „TanStack v5: initialData vs placeholderData" (S268) — erklärt `dataUpdatedAt=0`-Cold-Start, Teil derselben Freshness-Mechanik.
- `errors-frontend.md` „Money-Mutation invalidiert Domänen-Key aber NICHT Wallet" (S371) — Nachbar-Pattern (Wallet-Cache-Disziplin), bestätigt: Wallet-Reads müssen aktiv frisch gehalten werden.
- `performance.md` „invalidateQueries nach Writes / kein staleTime:0 blind" — Refetch gezielt, nicht per Default-Polling.

## 6. Acceptance Criteria (Executable)

```
AC1: [HAPPY] Buy-Modal auf stale Session löst sich selbst auf
  VERIFY: bescout.net (jarvis-qa), Player mit aktiver Sell-Order/IPO; Buy-Modal öffnen, >30s warten ODER Menge tippen
  EXPECTED: „Saldo wird aktualisiert…" erscheint höchstens kurz, dann verschwindet sie; Kaufen-Button wird aktiv
  FAIL IF: Button bleibt >5s disabled mit dauerhafter „Saldo wird aktualisiert…"

AC2: [REGRESSION] Tippen UND +/− verhalten sich identisch
  VERIFY: Menge 1→3 per Tippen, dann per +/−; je Buy-Button-Zustand prüfen
  EXPECTED: Beide Wege enden mit aktivem Kaufen-Button (sofern afford)
  FAIL IF: Ein Weg hängt, der andere nicht

AC3: [MONEY-REGRESSION] Kauf-Buchung unverändert
  VERIFY: git diff — kein RPC/Service/Buchungs-Edit; echter Buy auf bescout.net → DB-Reconcile balance/holdings
  EXPECTED: Buy bucht korrekt (−Preis, +Holding), Topf-Fee wie gehabt
  FAIL IF: Doppel-Buchung, falscher Betrag, oder fehlende Buchung

AC4: [I18N] Meldung DE+TR korrekt
  VERIFY: balanceRefreshing in messages/de.json + tr.json vorhanden
  EXPECTED: beide gesetzt, kein MISSING_MESSAGE
  FAIL IF: TR fehlt / raw key

AC5: [PERF] Kein Refetch-Loop
  VERIFY: Netzwerk-Tab im offenen Modal beobachten (idle, afford)
  EXPECTED: max 1 Wallet-Refetch bei Stale, danach Ruhe (kein Dauer-Polling)
  FAIL IF: wiederholte /wallet-Requests im Sekundentakt

AC6: [TSC/TEST] tsc clean + Wallet/BuyModal-Tests grün
  VERIFY: npx tsc --noEmit; CI=true npx vitest run (useWallet + BuyModal Tests falls vorhanden)
  EXPECTED: 0 Fehler
  FAIL IF: tsc-Fehler oder rote Tests
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Open | Balance schon frisch (<30s) | dataUpdatedAt jung | Kein Refetch nötig, Button sofort frei | Effekt-Guard `if (balanceStale)` |
| 2 | Open | Cold-Start placeholderData | dataUpdatedAt=0 | balanceStale true → Refetch → frisch | Self-Heal-Effekt |
| 3 | Verweilen | >30s im Modal getippt | Frische läuft ab | Re-Render (setQty) → balanceStale true → Refetch | Self-Heal-Effekt |
| 4 | Fetch-Fehler | Netzwerk down | refetch rejectet | balanceStale bleibt true, **kein** Loop (dep unverändert) | Effekt feuert nur bei dep-Wechsel |
| 5 | balanceCents null | kein User/initial loading | balanceStale=false (null-Guard) | Kein Refetch, kein Crash | `balanceCents !== null`-Guard bleibt |
| 6 | Doppel-BuyForm | IPO+Market beide offen | beide rufen refetch | React-Query dedupt In-Flight | dedupe by query-key |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/lib/hooks  # falls useWallet-Test existiert
grep -rn "useIsBalanceFresh\|balanceStale" src/   # Consumer-Scope
grep -n "balanceRefreshing" messages/de.json messages/tr.json  # i18n DE+TR
sed -n '60,120p' src/components/player/detail/BuyModal.tsx  # Spot-Check BuyForm
```

Money-Smoke (read-only, kein Schema-Edit): echter Buy auf bescout.net + DB-Reconcile balance/holdings + Topf-Ledger unverändert in Logik.

## 9. Open-Questions

**Pflicht-Klärung:** keine offen — Fix ist Cache-/UX-Read, Money-Logik byte-identisch (CTO-Scope laut ceo-approval-matrix: kein Fee/RLS/Wording-Change).

**Autonom-Zone:** Platzierung des Self-Heal-`useEffect` (in `BuyForm` vs. `BuyModal`), ob zusätzlich on-open-Invalidate.

**Nicht-Autonom:** keine Money-/RLS-/Wording-Entscheidung berührt.

## 10. Proof-Plan

Bug-Fix → **Vorher/Nachher live (bescout.net, Playwright)**:
- VORHER: Modal-Screenshot mit hängendem „Saldo wird aktualisiert…" + disabled Button (falls reproduzierbar) bzw. dokumentierte Stale-Reproduktion.
- NACHHER: Button aktiv nach Self-Heal + echter Buy reconciled.
- Plus `tsc clean` + vitest + `git diff --stat` (kein Money-RPC berührt).
Artefakte: `worklog/proofs/372-*.png` + `372-buymodal-stale.txt`.

## 11. Scope-Out

- **`BuyOrderModal`/Sell-Pfad** falls dasselbe Gate nutzt → prüfen; wenn betroffen, **gleiche Fix-Stelle** mitnehmen (sonst eigener Folge-Slice). Entscheidung im BUILD nach grep.
- **3×11=33 „Gesamt"-Lüge** ist bereits in 368d/368e gefixt (Menge/Preis an aktive Order) → NICHT erneut.
- **Freshness-Window-Tuning (30s)** bleibt unverändert — nur Recovery, nicht Schwellwert.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT skipped (2 Files, Cache/UX-Read, kein Schema/Service-Contract) → BUILD → REVIEW (reviewer-Agent, Money-Pfad-Pflicht) → PROVE (live Vorher/Nachher + tsc + vitest) → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Refetch-Loop (Effekt feuert endlos) | MED | hoch (RPC-Spam) | dep = `balanceStale`; bleibt true während Fetch → kein Re-Fire; Guard `if (balanceStale)` | AC5 Netzwerk-Tab |
| 2 | Self-Heal maskiert echten Wallet-Fehler | LOW | mittel | Fetch-Fehler → balanceStale bleibt true, Button disabled (sicher, kein Kauf auf falscher Balance) | AC1 FAIL-Pfad |
| 3 | `refetch`-Stabilität (neue Funktion je Render) | LOW | niedrig | React-Query memoisiert `refetch` (stabil) | Loop-Check |
| 4 | Andere `useIsBalanceFresh`-Consumer brechen | LOW | niedrig | additive Interface-Erweiterung (`refetch` optional-genutzt), bestehende Consumer unverändert | tsc + grep |

---

## Compliance-Check

- Kein $SCOUT/Investment/ROI-Wording berührt. Keine neuen User-Strings (nur bestehendes `balanceRefreshing`).
- Kein IPO-Begriff user-facing geändert. Kein Money-Fee/RLS-Change. TradingDisclaimer unverändert.

## Open Risiko

Einziges reales Risiko = Refetch-Loop; durch dep-Guard (`balanceStale`-Wechsel) + React-Query-In-Flight-Dedup abgedeckt und in AC5 verifiziert. Money-Pfad byte-identisch (nur Read-Refresh).

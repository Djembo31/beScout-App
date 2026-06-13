# CTO Review: Slice 306 — Wildcard-Ledger dormant + getWildcardHistory swallow→throw

**Verdict: PASS** · reviewer-Agent (cold-context) · time-spent: 9 min · 2026-06-13

## Spec-Coverage
- [x] **AC-1** [HAPPY] `getWildcardHistory` gibt rows zurück — Test `should return transaction rows for the user`
- [x] **AC-2** [ERROR] throw `error.message` statt silent `[]` — `wildcards.ts:56` + Test
- [x] **AC-3** [DOC] Registry §2.7 + Finding #3 = „dormant, kein Risiko" mit Live-Evidence
- [x] **AC-4** [REGRESSION] Sibling-Pattern eingehalten, mock-chain korrekt
- [x] Alle 5 Scope-Items im Diff vorhanden

## Findings

| # | Severity | File:Line | Issue | Status |
|---|----------|-----------|-------|--------|
| 1 | MINOR | `s7-…-registry.md:221` | Übergreifendes-Muster #4 trug noch die widerlegte „Audit-Ledger ohne Einträge = Risiko"-These (einziger Ort im Doku der die alte Klassifikation stehen ließ → interne Inkonsistenz). | ✅ **in-slice gefixt** — Pattern #4 umgeschrieben zu „Audit-Fehldiagnose: leere Backfill-Platzhalter". |

## Kern-Fragen (beantwortet)
- **swallow→throw korrekt & vollständig?** JA. `getWildcardHistory:56` wirft `error.message` analog Siblings (`:18`/`:35`). `grep "return \[\]"` → 0 (nur Kommentar). `return (data ?? [])` ist legitimer SUCCESS-Pfad.
- **throw safe?** JA, verifiziert. `grep "useWildcardHistory("` → 0 echte Call-Sites (nur Definition + re-export + Persist-Allowlist-Kommentar). Kein gemounteter Consumer → throw erreicht niemanden.
- **Tests korrekt?** JA. Mock-Chain `.from().select().eq().order().limit()` matcht Service exakt; Mock-Felder matchen `DbWildcardTransaction`.
- **Doku faktisch korrekt + Compliance?** JA. Spiegelt Live-Evidence; keine verbotenen Securities-/Gewinn-Begriffe; „Geld ohne Trail" als entkräftete These in Anführung.
- **Vergessener Consumer/Side-Effect?** Nein. Kein Schema/RPC-Change → AR-44/IMPACT-skip korrekt. Money-Path unberührt.

## Positive
- Vorbildliche Investigation-vor-Klassifikation: Risiko-These via Live-DB widerlegt (Backfill-Platzhalter + `pg_get_functiondef` Ledger-Pfad-Check). Root-cause-first (`feedback_root_cause_eifer`).
- Sibling-Pattern-Konsistenz, kein Reinvent.
- Knowledge-Capture proaktiv + präzise (errors-db.md Sibling zu Slice 303 mit ausführbarer Detection-SQL).
- misc.ts-Kommentar begründet korrekt warum Hook live bleibt (Aktivierung ohne Code-Change).

## Summary
Sauberer, eng-geschachtelter S-Slice. Code-Fix korrekt + sibling-konsistent, throw nachweislich consumer-frei, Tests strukturell exakt, Doku-Korrektur faktisch fundiert + compliant. Einziges MINOR-Finding (Pattern #4 Doku-Drift) in-slice behoben. PASS.

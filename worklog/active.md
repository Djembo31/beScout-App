# Active Slice

```
status: idle
slice: 444
title: K2.3 Welle A — 7 superseded docs/-root Files GC — DONE
size: S
type: Doc
stage: LOG (DONE)
spec: inline (Ops-Lane; Doc-GC, 0 einzigartiger Wert, git=Archiv)
impact: inline (7 Files gelöscht, 0 lebende Refs verifiziert via git grep)
proof: worklog/proofs/444-welleA-superseded-gc.txt
review: self-review (Ops-Lane, kein Money/Security/User-facing)
```

## Spec (inline, Ops-Lane — Slice 352)

**Kontext:** K2-Epic „EINE Wissens-Heimat", Welle A von 4. CEO-Entscheid (Anil 2026-06-29): „Wellen, A sofort · alles voll nach knowledge/ kanonisieren". 4-Agent-Recon (read-only, live-verifiziert) klassifizierte alle 18 `docs/`-root-Files in 4 Klassen. Diese Welle = Klasse 1 (Superseded, 0 einzigartiger Wert).

**Problem (Evidence: 4-Agent-Kartierung 2026-06-29):** 7 `docs/`-root-Files (Feb/Mär 2026) sind vollständig superseded — ihr durabler Inhalt lebt in der kanonischen SSOT (handoff/MASTERPLAN/disease-register §2 + git-History). 2 (SECURITY-AUDIT „Risk LOW", ARCHITECTURE broken-pointer) sind aktiv irreführend.

**Files (git rm, git=Archiv):**
1. `docs/bescout-briefing-claude-code.md` — ❌ Feb, BSD/Sakaryaspor-only; durable Teile in business.md/treasury.md/compliance.md
2. `docs/BeScout_Context_Pack_v8.md` — ❌ v8.2 Feb; CASP-Kostenrahmen Phase-2-deferred (git-Pointer im Proof)
3. `docs/bescout-final-report-v3.md` — ❌ Feb Red-Team-Bericht, stale Zahlen
4. `docs/STATUS.md` — ❌ Mär; Status-SSOT = session-handoff/worklog/active
5. `docs/ROADMAP.md` — ❌ Mär; Roadmap-SSOT = MASTERPLAN.md
6. `docs/SECURITY-AUDIT.md` — ❌ Feb; superseded+übertroffen von disease-register §2 (28 anon-SECDEF); „Risk LOW" gefährlich irreführend
7. `docs/ARCHITECTURE.md` — ❌ broken pointer (memory/architecture.md existiert nicht); SSOT = knowledge/domain/architecture-3hub

**Schnitt-Regel (§0):** alter Weg weg, kein zweiter Pfad. SSOT existiert je Doc. 0 lebende Ref verifiziert.

**Acceptance:** AC-1 alle 7 weg · AC-2 0 dangling in lebenden Dirs (re-grep) · AC-3 git-Pointer für die 2 Niedrig-Salvage (CASP-Kosten, Red-Team-Methode) im Proof.

**Proof:** `worklog/proofs/444-welleA-superseded-gc.txt` (git rm stat + re-grep 0). **Review:** self-review (Ops).
**Scope-Out:** Welle B (Vision/GTM-Harvest), C (Legal/Sales-Kanonisierung), D (Gamification/Scaling-Harvest), E (Frontend COMPONENTS/player-card dedup).
**Stage-Chain:** SPEC(inline) → IMPACT(inline) → BUILD → REVIEW(self) → PROVE → LOG.

## Zuletzt

- **Slice 443** (2026-06-29) — K2.2b verbrauchte Backfill-Scripts GC (XS).
- **Slice 442** (2026-06-29) — K2.1 Skill-Trees + K2.2 semantisch/ (S).

Nächstes (K2-Epic): Welle B Vision/GTM-Harvest · C Legal/Sales · D Gamification/Scaling · E Frontend.

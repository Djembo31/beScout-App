# Active Slice

```
status: idle
slice: 387
title: Compliance-Fix — verbotenes Glücksspiel-Verb kazanılır → elde edilir (tr.json, MASAK) (DONE)
size: XS
slice-type: i18n (Compliance)
scope: Compliance / §3 (business.md Glücksspiel-Vokabel) — Inline-Spec
spec: inline (Problem: business.md verbietet kazan*-Verben user-facing [MASAK §4]. Slice 374 schleuste "Aktiviteyle kazanılır" in tr.json ein → COMPL-tr-kazan-Test rot seit 374. Plan: kazanılır→elde edilir [business.md-vorgeschrieben]. Einzige kazan-Stelle in tr.json.)
stage: LOG
impact: skipped (1 String, kein Code/Consumer)
proof: worklog/proofs/387-compliance-kazan.txt
review: self-review (XS, business.md-vorgeschriebener 1-String-Ersatz, kein Money/Logik)
```

## Zuletzt

- **Slice 386** (2026-06-25) — E-3 Alters-Fenster age_min/age_max (S, reviewer PASS, gepusht aa8f695a).
- **Slice 385** (2026-06-25) — E-3 Aufstellungs-Regel-Fundament (M, reviewer PASS).
- **Slice 384** (2026-06-25) — E-3 Türsteher (M, reviewer PASS).

Nächstes: 387 PROVE (vitest COMPL-tr-kazan grün) → commit. Dann E-3 Positions-Quote (Anil-Wahl). 386 AC-13 UI-Verify nach Deploy.

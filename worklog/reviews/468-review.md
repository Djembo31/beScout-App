# Review — Slice 468 (search_path-Härtung 62 SECDEF-Fns + update_club_assets anon-REVOKE)

**Reviewer:** Cold-Context-Agent (§3) · **Datum:** 2026-06-30 · **time-spent:** ~14 min

## Verdict: CONCERNS (mergeable/live; Concerns = Evidenz-Auditierbarkeit, NICHT Korrektheit — beide adressiert)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | proof | Primäre Safety-Garantie = „Risk-Scan leer", aber dessen SQL war nicht committed → nicht reproduzierbar. | → **ERLEDIGT:** Scan-Query in Proof eingefügt + Methodik-Note (deckt die einzige Break-Klasse `extensions`; auth./storage./realtime. nicht im Default-Pfad → ohnehin qualifiziert). |
| 2 | LOW | migration | DO-Loop opak (enumeriert die 62 nicht, kein Post-Condition-Check); greenfield pinnt „was matcht" ohne Assertion. | → **ERLEDIGT:** trailing `DO`-Block mit `RAISE EXCEPTION wenn remaining > 0` ergänzt — Migration selbst-verifizierend (live: remaining=0). |
| 3 | NITPICK | AC-02 | `bcredits=250000` = Regression-Check auf unverändertem Body (akzeptabel). | keine. |

## One-Line
Ein tightening-only, reversibler, prosrc-unberührter search_path-Sweep mit korrektem anon-REVOKE — ship it; Scan-Query + Count-Assertion machen die Long-Tail-Safety reproduzierbar (erledigt).

## Belege (5 Fragen, Reviewer)
1. **Body-erhaltend?** JA by construction (`ALTER SET` schreibt nur `proconfig`, prosrc byte-identisch, S368c). Einzige Break-Klasse = unqualifizierte `extensions`-Refs (auth./storage./realtime. nicht im Default-Pfad → qualifiziert; pg_catalog implizit). Scan leer + Reviewer-grep über committed Migrations = 0 Extension-Refs/Operatoren.
2. **Money-Safety?** JA Mechanismus (prosrc unberührt → Kill-Switch/Fee byte-identisch); grant_founding_pass-Mint (ok=true/250000/rolled back) beweist Resolution+Execution unter Pin. Andere Money-RPCs: induktiv via leerem Scan.
3. **DO-Loop?** idempotent (NOT EXISTS proconfig) + deterministisch + greenfield-besser als named ALTERs (kein „function does not exist", fängt live-only Fns); skippt korrekt das schon-gepinnte update_club_assets.
4. **update_club_assets REVOKE?** sauber — Signatur (uuid,uuid,text,text) korrekt, nur anon berührt (auth=true erhalten), Caller-Enum repo-weit = nur club.ts:790 (authenticated). **Bonus:** schließt echtes AR-44/default-privileges-Loch.
5. **db-invariants ausreichend?** nicht exhaustiv (Subset der 62), aber der **statische leere Scan** ist die reale Garantie; db-invariants + Money-Mint + 3-Klassen-Stichprobe sind bestätigend. Residual reversibel (`ALTER … RESET search_path`).

## Positive
- Korrektes S368c-Verständnis (ALTER-only → kein AR-44-REVOKE/GRANT-Renewal, nicht vom AR-44-grep geflaggt).
- `'public'`-only Pin = hijack-resistenteste Wahl.
- anon-REVOKE behebt echtes latentes Loch, nicht kosmetisch.
- Spec ehrlich über Residual-Risiko + Reversibilität.

## Learning (→ errors-db)
`ALTER FUNCTION … SET search_path` body-erhaltend (prosrc/ACL unberührt, S368c-Klasse). search_path-Sweep via DO-Loop > N named ALTERs (greenfield-robust, fängt live-only) ABER Diff-Audit-Verlust → trailing Count-Assertion (RAISE wenn remaining>0) = selbst-verifizierend. Break-Risiko = nur unqualifizierte `extensions`-Refs (Fns + Operatoren/Typen/Casts); Scan-Query MUSS im Proof committed sein (sonst non-reproduzierbar).

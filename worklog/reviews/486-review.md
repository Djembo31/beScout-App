# Slice 486 Review — W6 Phase 3 LCP-Bild (self-review)

**Self-review** (Infra/Perf, kein Money, low-risk Config + 2 Image-Props). Datengetrieben aus d03-Trace. **Perf-Proof = post-Deploy-Messung** (feedback_no_local_qa).

## Verdikt: PASS (pending post-Deploy-Messung)

## Geprüft
1. **Datengetrieben (performance.md: Messen vor Optimieren):** d03-Trace hat die Baseline + den echten Bottleneck (Bild, nicht Daten) bereits gemessen → der Fix zielt auf das gemessene Element, nicht auf Annahmen. ✓
2. **context7-verifiziert:** `images.formats=['image/avif','image/webp']` + `sizes` für fill + `quality`-Prop (1-100) sind exakt die Next-14-API (NICHT die Next-15-`images.qualities`-Config). ✓
3. **Low-Risk:** AVIF ist additiv (Next/Vercel fällt auf WebP/original zurück für non-AVIF-Browser); `sizes="100vw"` ist honest (Hero IST full-bleed); `quality={60}` nur auf das decorative Stadion (andere Bilder behalten 75). Kein Money/Auth/Data-Touch. ✓
4. **Messen-vor-übertreiben:** Auflösungs-Cap bewusst zurückgehalten — erst post-Deploy /club LCP messen, dann entscheiden. Kein Over-Engineering. ✓
5. **Build:** next.config parst, formats gesetzt, tsc 0. Vercel-Deploy = next-build-Gate. ✓

## Findings
| Sev | Issue | Status |
|-----|-------|--------|
| — | Keine. Contained Config+Props, context7-bestätigt, datengetrieben. | — |
| INFO | Perf-Proof (Stadion-AVIF-Transfer + /club LCP) = post-Deploy bescout.net — ohne Messung kein „LCP-Win bewiesen". | post-Deploy nachzutragen |

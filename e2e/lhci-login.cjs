/**
 * Slice 282b — LHCI-Auth: Puppeteer-Login VOR Lighthouse-Collection.
 *
 * Hintergrund: /, /market, /community sind auth-gated und redirecten
 * unauthenticated auf /login. Alle Phase-1-Lighthouse-Runs (Slice 279,
 * 2026-05-06 bis 2026-06-11) haben deshalb 3× die LOGIN-Page gemessen
 * (worklog/audits/2026-06-11/lighthouse-baseline.md Validity-Befund).
 *
 * LHCI ruft dieses Script vor JEDER URL auf; die Browser-Instanz bleibt
 * über alle URLs offen → Cookies persistieren → Login ist idempotent
 * (skip wenn Session aktiv). Zusammen mit settings.disableStorageReset
 * (lighthouserc.cjs) überlebt die Session auch die Audit-Runs.
 *
 * Design-Entscheidung (Spec AC-05): Login-Fail wirft LAUT — lieber ein
 * roter LHCI-Run als still die falsche Page messen (der Slice-279-Fehler).
 *
 * @param {import('puppeteer').Browser} browser
 * @param {{url: string, options: object}} context
 */

const BASE = 'https://www.bescout.net';
// Gleiche QA-Persona wie Smoke + Synthetic (konsistente Mess-Basis).
// Env-Override für GHA (Secrets), Fallback = repo-übliche jarvis-Creds
// (vgl. e2e/mystery-box-qa.spec.ts).
const EMAIL = process.env.SMOKE_EMAIL || 'jarvis-qa@bescout.net';
const PASSWORD = process.env.SMOKE_PASSWORD || 'JarvisQA2026!';

module.exports = async (browser, context) => {
  const page = await browser.newPage();
  try {
    // Skip-if-logged-in: deterministischer Cookie-Check statt URL-Check.
    // WICHTIG: Der Auth-Redirect der App ist CLIENT-SIDE (nach Hydration) —
    // page.url() nach domcontentloaded zeigt noch '/' obwohl unauthenticated
    // (false-positive "Session aktiv", Slice-282b-BUILD-Befund). @supabase/ssr
    // createBrowserClient legt die Session als sb-*-auth-token-Cookie ab.
    const cookies = await page.cookies(BASE);
    if (cookies.some((c) => /^sb-.*auth-token/.test(c.name))) {
      console.log(`[lhci-login] Session-Cookie vorhanden — skip (${context.url})`);
      return;
    }

    console.log(`[lhci-login] Login für ${context.url} …`);
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Cookie-Banner (best-effort — persistiert danach im Browser-Profil,
    // damit der Banner NICHT im Audit-Run rendert und Scores drückt).
    try {
      const accept = await page.waitForSelector('::-p-text(Akzeptieren)', { timeout: 2_000 });
      if (accept) {
        await accept.click();
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      /* kein Banner — ok */
    }

    await page.type('input[placeholder="E-Mail Adresse"]', EMAIL);
    await page.type('input[placeholder="Passwort"]', PASSWORD);
    await page.click('button ::-p-text(Anmelden)');

    // Erfolg = Redirect weg von /login (gleiche Bedingung wie synthetic-users loginJarvis)
    await page.waitForFunction(
      () => !window.location.pathname.startsWith('/login'),
      { timeout: 30_000 },
    );

    console.log(`[lhci-login] ✅ eingeloggt — final: ${new URL(page.url()).pathname}`);
  } catch (err) {
    // AC-05: LAUT failen — niemals still /login messen.
    throw new Error(`[lhci-login] Login fehlgeschlagen: ${err.message}`);
  } finally {
    await page.close().catch(() => {});
  }
};

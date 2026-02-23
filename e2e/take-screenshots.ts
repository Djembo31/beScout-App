import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.join(__dirname, 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

// Read env
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const sbUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim() || '';
const sbKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim() || '';
const projectRef = new URL(sbUrl).hostname.split('.')[0]; // skzjfhvgccaeplydsunz

const BASE = 'http://localhost:3000';
const EMAIL = 'test@gmx.de';
const PASSWORD = 'BeScout2026!';

async function authenticate(): Promise<{ access_token: string; refresh_token: string; expires_in: number; expires_at: number; token_type: string; user: unknown } | null> {
  console.log('🔐 Authenticating via Supabase API...');
  const res = await fetch(`${sbUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': sbKey,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (data.access_token) {
    console.log('✅ Auth successful! User:', data.user?.email);
    return data;
  }
  console.log('❌ Auth failed:', data);
  return null;
}

async function main() {
  // 1. Get auth session from Supabase
  const session = await authenticate();
  if (!session) {
    console.error('Cannot authenticate. Exiting.');
    process.exit(1);
  }

  // 2. Build cookie value — @supabase/ssr stores session JSON as cookie
  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user,
  });

  // 3. Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // 4. Set auth cookies — @supabase/ssr may chunk large cookies
  // Split into ~3500 byte chunks if needed
  const CHUNK_SIZE = 3500;
  if (sessionJson.length <= CHUNK_SIZE) {
    await context.addCookies([{
      name: cookieName,
      value: sessionJson,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }]);
  } else {
    // Chunked cookies
    const chunks = Math.ceil(sessionJson.length / CHUNK_SIZE);
    const cookies = [];
    for (let i = 0; i < chunks; i++) {
      cookies.push({
        name: `${cookieName}.${i}`,
        value: sessionJson.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      });
    }
    await context.addCookies(cookies);
  }

  const page = await context.newPage();

  // --- Public pages ---
  console.log('📸 Login page...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '01-login.png'), fullPage: true });

  // Dismiss cookie consent
  try {
    const btn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  } catch {}

  console.log('📸 Pitch page...');
  await page.goto(`${BASE}/pitch`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '02-pitch.png'), fullPage: true });

  // --- Verify auth works ---
  console.log('🔍 Testing auth — navigating to /...');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const currentUrl = page.url();
  console.log('   Current URL:', currentUrl);
  if (currentUrl.includes('/login') || currentUrl.includes('/welcome')) {
    console.log('❌ Auth cookie not recognized. Trying base64 encoding...');

    // Try base64-encoded cookie value (some @supabase/ssr versions use this)
    const base64Session = Buffer.from(sessionJson).toString('base64');
    await context.clearCookies();
    if (base64Session.length <= CHUNK_SIZE) {
      await context.addCookies([{
        name: cookieName,
        value: base64Session,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      }]);
    } else {
      const chunks = Math.ceil(base64Session.length / CHUNK_SIZE);
      const cookies = [];
      for (let i = 0; i < chunks; i++) {
        cookies.push({
          name: `${cookieName}.${i}`,
          value: base64Session.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax' as const,
        });
      }
      await context.addCookies(cookies);
    }

    // Retry
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const retryUrl = page.url();
    console.log('   Retry URL:', retryUrl);

    if (retryUrl.includes('/login') || retryUrl.includes('/welcome')) {
      console.log('❌ Base64 also failed. Trying URL-encoded JSON...');

      // Try URL-encoded
      await context.clearCookies();
      const urlEncoded = encodeURIComponent(sessionJson);
      await context.addCookies([{
        name: cookieName,
        value: urlEncoded,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      }]);

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const retry2Url = page.url();
      console.log('   Retry2 URL:', retry2Url);

      if (retry2Url.includes('/login') || retry2Url.includes('/welcome')) {
        console.log('❌ All cookie formats failed. Trying UI login...');

        // Last resort: UI login
        await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Dismiss cookie consent
        try {
          const acceptBtn = page.getByRole('button', { name: 'Akzeptieren' });
          if (await acceptBtn.isVisible({ timeout: 2000 })) {
            await acceptBtn.click();
            await page.waitForTimeout(300);
          }
        } catch {}

        await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
        const pwField = page.getByPlaceholder('Passwort');
        await pwField.click();
        await pwField.fill(PASSWORD);
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

        try {
          await page.waitForURL('**/', { timeout: 15000 });
          const loginUrl = page.url();
          if (loginUrl.includes('/login') || loginUrl.includes('/welcome')) {
            console.log('❌ UI login also redirected. Taking error screenshot.');
            await page.screenshot({ path: path.join(screenshotDir, '03-auth-error.png'), fullPage: true });
            await browser.close();
            return;
          }
          console.log('✅ UI login worked! URL:', loginUrl);
        } catch {
          console.log('❌ UI login timed out.');
          await page.screenshot({ path: path.join(screenshotDir, '03-auth-error.png'), fullPage: true });
          await browser.close();
          return;
        }
      }
    }
  }

  console.log('✅ Authenticated! Taking screenshots...');
  await page.waitForTimeout(2000);

  // --- Authenticated pages ---
  const routes = [
    { name: '03-home', path: '/' },
    { name: '04-market', path: '/market' },
    { name: '05-fantasy', path: '/fantasy' },
    { name: '06-community', path: '/community' },
    { name: '07-clubs', path: '/clubs' },
    { name: '08-club-sakaryaspor', path: '/club/sakaryaspor' },
    { name: '09-profile', path: '/profile' },
    { name: '10-compare', path: '/compare' },
    { name: '11-airdrop', path: '/airdrop' },
  ];

  for (const route of routes) {
    console.log(`📸 ${route.name}...`);
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(screenshotDir, `${route.name}.png`), fullPage: true });
  }

  console.log('✅ All screenshots taken!');
  await browser.close();
}

main().catch(console.error);

/**
 * Slice 282b — puppeteer ist NUR LHCI-Login-Treiber (e2e/lhci-login.cjs).
 * skipDownload verhindert den ~130-MB-Chrome-Download im Postinstall —
 * der würde sonst JEDEN `pnpm install` in ALLEN GHA-Workflows verlangsamen.
 * Chrome kommt via lighthouserc.cjs puppeteerLaunchOptions.executablePath
 * (System-Chrome: GHA /usr/bin/google-chrome, lokal Windows-Standardpfade).
 */
module.exports = {
  skipDownload: true,
};

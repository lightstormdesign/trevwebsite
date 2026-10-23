const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w,h] of [[390,700]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto('http://127.0.0.1:3013/trev-world-scroll.html'); await p.waitForTimeout(1500);
  for (let i=0;i<=12;i++) { const f=i/12;
    await p.evaluate(f => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
    await p.waitForTimeout(1300);
    await p.screenshot({ path: `/tmp/claude-0/s/w3-${i}.png` });
  } }
  await b.close();
})();

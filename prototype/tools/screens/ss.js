const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('http://127.0.0.1:3013/trev-world-scroll.html'); await p.waitForTimeout(1000);
  const fr=[0.82,0.86,0.9,0.93,0.96,1.0];
  for (let i=0;i<fr.length;i++){ await p.evaluate(f=>window.scrollTo(0,innerHeight*2.36*f),fr[i]); await p.waitForTimeout(2200); await p.screenshot({path:`/tmp/claude-0/s/ss-${i}.png`}); }
  await b.close(); })();

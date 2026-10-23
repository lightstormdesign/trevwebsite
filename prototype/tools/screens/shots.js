const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' , args:['--autoplay-policy=no-user-gesture-required']}).catch(async()=>chromium.launch());
  const out = '/tmp/claude-0/s/shots/';
  for (const [name, vp, mobile] of [['d', { width: 1440, height: 860 }, false], ['m', { width: 390, height: 780 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('ERR', name, e.message));
    await p.goto('http://127.0.0.1:3009/', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: out + name + '-home-intro.png' });
    await p.waitForTimeout(4500);
    await p.click('.kd-skip');
    await p.waitForTimeout(3500);
    await p.screenshot({ path: out + name + '-home-hero.png' });
    await p.goto('http://127.0.0.1:3009/about', { waitUntil: 'load' });
    await p.waitForTimeout(3500);
    await p.screenshot({ path: out + name + '-about-0.png' });
    for (const frac of [0.3, 0.7]) {
      await p.evaluate(f => window.scrollTo(0, document.querySelector('[data-testid=about-hook]').offsetHeight * f), frac);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: out + name + `-about-${frac}.png` });
    }
    for (const i of [0, 5, 9]) {
      await p.evaluate(i => { const h = document.querySelector('[data-testid=about-hook]'); window.scrollTo(0, h.offsetTop + h.offsetHeight - innerHeight + innerHeight * 0.7 * i + 10); }, i);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: out + name + `-about-s${i}.png` });
    }
    for (const r of ['music', 'community', 'epk']) {
      await p.goto('http://127.0.0.1:3009/' + r, { waitUntil: 'load' });
      await p.waitForTimeout(2500);
      await p.screenshot({ path: out + name + '-' + r + '.png' });
    }
    await ctx.close();
  }
  await b.close();
})();

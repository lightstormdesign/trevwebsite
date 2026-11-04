// the world at the lion's tap, once the focus has settled every animal (fixed poses), no UI
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = process.argv[2], AT_MS = +process.argv[3];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { const real = performance.now.bind(performance); window.__freeze = null; performance.now = () => window.__freeze ?? real(); window.__realNow = real; });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('http://127.0.0.1:3020/about'); await p.waitForTimeout(300);
  await p.evaluate(() => { sessionStorage.setItem('tj-totems', JSON.stringify(['bison','bluebird','butterfly','owl','salmon'])); sessionStorage.setItem('tj-awake', '1'); });
  await p.reload(); await p.waitForTimeout(3500);
  await p.addStyleTag({ content: `.tj-story,.tj-bubble,.tj-header,.tj-totems,.tj-progress,.tj-vignette,.tj-lionFocus,.tj-sound,.film-grain-frame,.tj-landing,.tj-awaken{display:none!important}` });
  await p.evaluate(() => { document.querySelector('.tj-scroller').scrollTop = 2.36 * document.querySelector('.tj-svh').clientHeight; }); await p.waitForTimeout(5000);
  await p.evaluate((at) => new Promise(res => {
    const t0 = window.__realNow(); document.querySelector('.tj-lionTotem').click();
    const tick = () => { if (window.__realNow() - t0 >= at) { window.__freeze = t0 + at; document.getAnimations().forEach(a => a.pause()); return setTimeout(res, 600); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), AT_MS);
  await p.screenshot({ path: OUT });
  await b.close();
})();

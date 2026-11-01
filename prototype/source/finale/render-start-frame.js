// Frame-exact start frame: the page's clock (performance.now) stops at exactly AT_MS after the roar while the
// browser keeps painting normally; CSS animations begun by the roar are set to the same moment.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = process.argv[2] || 'kf-exact.png', AT_MS = +(process.argv[3] || 900);
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
  const info = await p.evaluate((at) => new Promise(res => {
    let roarT = null, roarAnims = [];
    new MutationObserver((m, o) => { if (document.querySelector('.tj').classList.contains('roaring')) { o.disconnect(); roarT = window.__realNow(); roarAnims = document.getAnimations().filter(a => (a.currentTime || 0) < 60); } })
      .observe(document.querySelector('.tj'), { attributes: true });
    document.querySelector('.tj-lionTotem').click();
    const tick = () => {
      if (roarT != null && window.__realNow() - roarT >= at - 20) {
        window.__freeze = roarT + at;                                      // the scene's clock stops here
        document.getAnimations().forEach(a => a.pause()); roarAnims.forEach(a => { a.currentTime = at; });
        const f = document.querySelector('.tj-cr-salmon .fish');
        return setTimeout(() => res({ roarAnims: roarAnims.length, fish: f.style.transform }), 600);   // real frames paint the frozen moment
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), AT_MS);
  console.log(JSON.stringify(info));
  await p.screenshot({ path: OUT });
  await b.close();
})();

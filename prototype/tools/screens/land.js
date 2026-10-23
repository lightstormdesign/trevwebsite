const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 941, height: 1672 }, deviceScaleFactor: 2 });
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('http://127.0.0.1:3013/trev-world-scroll.html'); await p.waitForTimeout(3000);
  await p.addStyleTag({content:'#bar,#hint,#logo,#shade{display:none!important} #world{filter:none!important}'});
  await p.evaluate(()=>{const w=document.getElementById('world'); new MutationObserver(()=>{w.style.filter='none'}).observe(w,{attributes:true}); w.style.filter='none';});
  await p.waitForTimeout(800);
  await p.screenshot({ path: process.argv[2] }); await b.close(); })();

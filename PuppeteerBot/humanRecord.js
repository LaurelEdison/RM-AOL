const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page    = await browser.newPage();

  await page.goto('http://localhost:3000/index.php');
  // Storage for events
  const events = { mouse: [], scroll: [], clicks: [] };

  // Bind listeners
  await page.exposeFunction('recordMouse', e => events.mouse.push(e));
  await page.exposeFunction('recordScroll', y => events.scroll.push(y));
  await page.exposeFunction('recordClick', e => events.clicks.push(e));

  await page.evaluateOnNewDocument(() => {
    document.addEventListener('mousemove', e =>
      window.recordMouse({ x: e.clientX, y: e.clientY, t: Date.now() })
    );
    document.addEventListener('scroll', () =>
      window.recordScroll(window.scrollY)
    );
    document.addEventListener('click', e =>
      window.recordClick({ x: e.clientX, y: e.clientY, t: Date.now() })
    );
  });

  console.log('Start browsing normally…');
  // Let user interact for e.g. 30s
  await page.waitForTimeout(30000);

  // Dump to disk
  const fs = require('fs');
  fs.writeFileSync('humanTrace.json', JSON.stringify(events, null, 2));

  await browser.close();
  console.log('Human trace saved to humanTrace.json');
})();

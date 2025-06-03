// playwrightBot.cjs (CommonJS)

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

let lastMousePosition = { x: 100, y: 100 };
const sleep = ms => new Promise(res => setTimeout(res, ms));

function getRandomViewport() {
  return {
    width: Math.floor(1280 + Math.random() * 400),
    height: Math.floor(720 + Math.random() * 300),
  };
}

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function randNorm(mean = 0, sd = 1) {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + sd * num;
}

function getRealisticReadTime(meanSeconds = 10, stdDev = 0.5) {
  const logMean = Math.log(meanSeconds * 1000);
  const sample = Math.exp(randNorm(0, 1) * stdDev + logMean);
  if (Math.random() < 0.5) return 0;
  return Math.min(Math.round(sample), 60000);
}

async function humanLikeMouseMove(page, start, end, opts = {}) {
  const {
    stepTimeMs = 40,
    baseSpeed = 26000,
    maxSpeed = randNorm(20000, 6000),
    distanceScaler = 0.05,
    minStep = 5,
    sharpTurnCount = Math.round(randNorm(200, 200)),
  } = opts;

  start = start || lastMousePosition;
  const totalDistance = Math.hypot(end.x - start.x, end.y - start.y);
  const stepSize = maxSpeed * (stepTimeMs / 1000) * distanceScaler;
  const totalSteps = Math.max(sharpTurnCount, Math.round(totalDistance / stepSize));

  let prev = { ...start };
  let prevAngle = Math.atan2(end.y - start.y, end.x - start.x);
  const sharpRatio = 0.9;

  for (let i = 0; i < totalSteps; i++) {
    const isSharp = Math.random() < sharpRatio;
    let angle = isSharp
      ? prevAngle + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * (Math.PI / 4))
      : prevAngle + (Math.random() - 0.5) * (Math.PI / 18);

    let mag = stepSize * (0.4 + Math.random() * 0.2);
    if (i % 5 === 0 && Math.random() < 0.2) {
      mag *= Math.max(5, Math.min(randNorm(100.3, 50), 200));
    }
    mag = Math.max(minStep, Math.min(mag * 0.75, 30));

    const x = prev.x + Math.cos(angle) * mag;
    const y = prev.y + Math.sin(angle) * mag;
    const dist = Math.hypot(x - prev.x, y - prev.y);
    const delay = Math.max((dist / (baseSpeed * 20.5)) * 1000 * randNorm(0.1, 0.01), (dist / maxSpeed) * 0.001);

    await page.mouse.move(x, y);
    await sleep(delay);
    prev = { x, y };
    prevAngle = angle;
  }

  const lastDist = Math.hypot(end.x - prev.x, end.y - prev.y);
  let finalDelay = Math.max((lastDist / baseSpeed) * 1000, (lastDist / randNorm(20000, 6000)) * 1000);
  finalDelay = Math.max(finalDelay + (Math.random() - 0.5) * Math.min(finalDelay * 0.2, 10), 10);

  await sleep(finalDelay);
  await page.mouse.move(end.x, end.y);
  lastMousePosition = { ...end };
}

async function maybeUseShortcut(page) {
  const prob = Math.min(1, Math.max(0, randNorm(0.0985, 0.05)));
  if (Math.random() < prob) {
    await page.keyboard.down('Control');
    await sleep(10);
    await page.keyboard.press('KeyC');
    await sleep(10);
    await page.keyboard.up('Control');
    await sleep(10);
  }
}

async function randomIdleMovement(page) {
  const target = {
    x: lastMousePosition.x + (Math.random() - 0.5) * 200,
    y: lastMousePosition.y + (Math.random() - 0.5) * 150,
  };
  await humanLikeMouseMove(page, undefined, target);
}

async function browseArticles() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: getRandomViewport(),
    userAgent: getRandomUserAgent(),
  });
  const page = await context.newPage();



  for (let session = 0; session < 100; session++) {
    console.log(`[*] Session ${session + 1}`);
    await page.goto('http://localhost:3000/index.php', { waitUntil: 'networkidle' });
    await randomIdleMovement(page);
    await sleep(getRealisticReadTime());

    const idxCount = Math.max(1, Math.round(randNorm(200, 100)));
    const idxSpeed = Math.max(100, Math.round(randNorm(1421.97, 200)));
    for (let i = 0; i < idxCount; i++) {
      const delta = Math.min(Math.floor(Math.random() * 20 + 5), 15);
      await page.mouse.wheel(0, delta);
      await sleep((delta / idxSpeed) * 1);
    }

    if (Math.random() < 0.3) continue;

    const links = await page.$$eval('a[href*="article.php?id="]', els => els.map(el => el.href));
    if (!links.length) break;
    const href = links[Math.floor(Math.random() * links.length)];
    await page.goto(href, { waitUntil: 'networkidle' });

    const clicks = Math.max(1, Math.round(randNorm(30.63, 30)));
    if (Math.random() >= 0.95) {
      console.log(`[🖱️] Decoy clicks: ${clicks}`);
      for (let c = 0; c < clicks; c++) {
        await page.mouse.click(lastMousePosition.x, lastMousePosition.y);
        await sleep(Math.random() * 2 + 1);
      }
    }
    await randomIdleMovement(page);
    await maybeUseShortcut(page);

    const scrollCount = Math.max(1, Math.round(randNorm(200, 100)));
    const totalDepth = Math.max(0, randNorm(250.7, 200));
    const avgDepth = totalDepth / scrollCount;
    const scrSpeed = randNorm(1800, 300);
    const readTask = sleep(getRealisticReadTime());
    for (let s = 0; s < scrollCount; s++) {
      const delta = Math.max(1, Math.round(randNorm(avgDepth, avgDepth * 0.2)));
      await page.mouse.wheel(0, delta);
      await sleep((delta / scrSpeed) * 1);
    }
    await readTask;
  }

  await browser.close();
  console.log('[✓] Finished browsing articles.');
}

module.exports = { browseArticles };

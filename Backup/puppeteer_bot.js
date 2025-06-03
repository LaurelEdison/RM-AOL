const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

let lastMousePosition = { x: 100, y: 100 };
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function getRandomViewport() {
  return {
    width: Math.floor(1280 + Math.random() * 400),
    height: Math.floor(720 + Math.random() * 300),
  };
}

function getRandomUserAgent() {
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112 Safari/537.36",
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// helper to sample a normal-ish value
function randNorm(mean, sd) {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); // [0,1)
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + sd * num;
}
function getRealisticReadTime(meanSeconds = 10, stdDev = 0.5) {
  const logMean = Math.log(meanSeconds * 1000); // convert to ms
  const sample = Math.exp(randNorm(0, 1) * stdDev + logMean);
  if(Math.random() < 0.5){
    return 0;
  }
  return Math.min(Math.round(sample), 6000); // cap at 60s max
}
function logNormalSample(mean = 5, stdDev = 0.5) {
  const normal = Math.exp(randNorm() * stdDev + mean);
  return Math.round(normal);
}
async function humanLikeMouseMove(
  page,
  start,
  end,
  {
    // proportion of steps that are straight (rest = sharp)
    stepTimeMs = 40, // average time per step in ms
    baseSpeed = 26000, // average speed (px/sec)
    maxSpeed = randNorm(20000, 6000), // max speed (px/sec)
    distanceScaler = 0.05, // adjust granularity of motion
    minStep = 5, // px
    sharpTurnCount = randNorm(200, 200),
  } = {}
) {
  if (start === undefined) {
    start = lastMousePosition; // px
  }
  const totalDistance = Math.hypot(end.x - start.x, end.y - start.y);
  const estimatedStepSize = maxSpeed * (stepTimeMs / 1000) * distanceScaler;
  const totalSteps = Math.max(
    sharpTurnCount,
    Math.round(totalDistance / estimatedStepSize)
  );

  let prev = { ...start };
  let prevAngle = Math.atan2(end.y - start.y, end.x - start.x);
  const sharpRatio = 0.9;
  for (let i = 0; i < totalSteps; i++) {
    const isSharp = Math.random() < sharpRatio;

    let angle;
    if (isSharp) {
      const sign = Math.random() < 0.5 ? 1 : -1;
      const delta = Math.PI / 2 + Math.random() * (Math.PI / 4);
      angle = prevAngle + sign * delta;
    } else {
      const jitter = (Math.random() - 0.5) * (Math.PI / 18);
      angle = prevAngle + jitter;
    }

    let mag = estimatedStepSize * (0.4 + Math.random() * 0.2);
    if (i % 10 === 0 && Math.random() < 0.2) {
      const scaleFactor = randNorm(100.3, 50); // mean, sd
      mag *= Math.max(5, Math.min(scaleFactor, 200)); // cap at 35
    }
    mag = Math.max(minStep, Math.min(mag * 0.75, 30)); // absolute cap

    const x = prev.x + Math.cos(angle) * mag;
    const y = prev.y + Math.sin(angle) * mag;

    const dist = Math.hypot(x - prev.x, y - prev.y);
    const baseDelay = (dist / (baseSpeed * 20.5)) * 1000;
    const minDelay = (dist / maxSpeed) * 1000;
    let delay = Math.max(baseDelay * randNorm(0.1, 0.01), minDelay * 0.001);

    const timeDeltaSec = delay / 1000;
    const actualSpeed = dist / timeDeltaSec;

    await page.mouse.move(x, y);
    await sleep(delay);

    // if (actualSpeed > 10000) {
    //   console.log(
    //     `[⚠️] Speed spike: ${actualSpeed.toFixed(2)} px/s at step ${i}`
    //   );
    // }
    prev = { x, y };
    prevAngle = angle;
  }

  // Final move

  const lastDist = Math.hypot(end.x - prev.x, end.y - prev.y);
  let finalDelay = (lastDist / baseSpeed) * 1000;
  const finalMin = (lastDist / maxSpeed) * 1000;
  const finalJitter = Math.min(finalDelay * 0.2, 10);
  finalDelay = Math.max(
    finalDelay + (Math.random() - 0.5) * finalJitter,
    finalMin
  );

  // Clamp max speed
  const finalSpeed = lastDist / (finalDelay / 1000);
  if (finalSpeed > 5500) {
    finalDelay = (lastDist / 5500) * 1000;
  }

  // Lower bound
  finalDelay = Math.max(finalDelay, 10);

  await sleep(finalDelay);
  await page.mouse.move(end.x, end.y);
  lastMousePosition = { ...end };
}

async function maybeUseShortcut(page) {
  // sample a per-page probability around 0.0985 ± 0.05
  const prob = Math.min(1, Math.max(0, randNorm(0.0985, 0.05)));
  if (Math.random() < prob) {
    // existing logic
    await page.keyboard.down("Control");
    await sleep(10);
    await page.keyboard.press("KeyC"); // or KeyF, you choose…
    await sleep(10);
    await page.keyboard.up("Control");
    await sleep(10);
  }
}

async function randomIdleMovement(page) {
  const target = {
    x: lastMousePosition.x + (Math.random() - 0.5) * 200,
    y: lastMousePosition.y + (Math.random() - 0.5) * 150,
  };

  // call humanLikeMouseMove with tiny step-counts and faster speed:
  await humanLikeMouseMove(page, undefined, target);

  // much shorter idle pause—200–400 ms instead of 500–1500 ms
}

function randX() {
  return Math.floor(Math.random() * 1200 + 100);
}
function randY() {
  return Math.floor(Math.random() * 800 + 100);
}
async function browseArticles() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport(getRandomViewport());
  await page.setUserAgent(getRandomUserAgent());

  // track clicks in-page
  await page.evaluateOnNewDocument(() => {
    window.clickCount = 0;
    document.addEventListener("click", () => window.clickCount++);
  });

  for (let pageIndex = 0; pageIndex < 100; pageIndex++) {
    console.log(`[*] Opening homepage (page ${pageIndex + 1})…`);

    // 1) Go (or reload) homepage
    await page.goto("http://localhost:3000/index.php", {
      waitUntil: "networkidle2",
    });
    await page
      .waitForSelector('a[href="index.php"]', { timeout: 3000 })
      .catch(() => {});

    // await page.mouse.move(800, 400);
    // await sleep(100); // 100ms delay to avoid 0ms time window
    // lastMousePosition = { x: 800, y: 400 };
    await randomIdleMovement(page);
    const readTask = sleep(getRealisticReadTime());
    await sleep(getRealisticReadTime());
    // sample ~200±50 scroll events on the index
    const idxMean = 200,
      idxSd = 100;
    const idxScrolls = Math.max(1, Math.round(randNorm(idxMean, idxSd)));
    // reuse your human scrollSpeed sampling
    const speedMean = 1421.97,
      speedSd = 200;
    const idxSpeed = Math.max(100, Math.round(randNorm(speedMean, speedSd)));

    for (let i = 0; i < idxScrolls; i++) {
      const by = Math.min(Math.floor(Math.random() * 20 + 5), 15);
      await page.mouse.wheel({ deltaY: by });
      // no extra jitter here—keep it tight so avg_scroll_speed is accurate
      await sleep((by / idxSpeed) * 1);
    }
    if (Math.random() < 0.3) {
      await page.goto("http://localhost:3000/index.php", {
        waitUntil: "networkidle2",
      });
      console.log("[✓] Finished early before article.\n");
      return;
    }
    // 2) Pre-clicks
    // 3) Click into an article
    const links = await page.$$('a[href*="article.php?id="]');
    if (links.length === 0) {
      console.log("[!] No articles found; ending session.");
      break;
    }
    const chosen = links[Math.floor(Math.random() * links.length)];
    await chosen.evaluate((el) => el.scrollIntoView());
    const href = await chosen.evaluate((el) => el.href);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      await page.goto(href, { waitUntil: "networkidle2" }),
    ]);
    // ─── PHASE A: decoy-clicks + idle wiggle ─────────────────────────
    async function decoyTask(
      page,
      { pZero = 0.9, clickMean = 30.63, clickSd = 30 } = {}
    ) {
      // 95% of the time, skip clicking entirely
      if (Math.random() < pZero) {
        return;
      }

      const totalClicks = Math.max(1, Math.round(randNorm(clickMean, clickSd)));
      console.log(`[🖱️] Injecting ${totalClicks} decoy clicks`);

      const viewport = page.viewport();

      for (let i = 0; i < totalClicks; i++) {
        const x = lastMousePosition.x;
        const y = lastMousePosition.y;
        await page.mouse.move(x, y);
        await page.mouse.click(x, y);
        await sleep(Math.random() * 2 + 1); // 50–150ms
      }
    }
    const preClicks = await page.evaluate(() => window.clickCount || 0);
    const decoyPromise = decoyTask(page, preClicks);
    const idleTask = await randomIdleMovement(page);
    // wait for both to finish (in parallel)
    await maybeUseShortcut(page);

    // ─── PHASE B: scroll + read + wander moves ───────────────────────
    // scroll parameters
    let scrollMean = 200,
      scrollSd = 100;
    if (Math.random() < 0.1) {
      scrollMean = 1000;
      scrollSd = 400;
    }
    const targetScrolls = Math.max(
      1,
      Math.round(randNorm(scrollMean, scrollSd))
    );
    const depthMean = 250.7,
      depthSd = 200;
    const totalDepth = Math.max(0, randNorm(depthMean, depthSd));
    const avgBy = totalDepth / targetScrolls;
    const scrollSpeed = Math.max(400, Math.round(randNorm(1000, 200)));

    // read time
    const scrollTask = (async () => {
      for (let s = 0; s < targetScrolls; s++) {
        const by = Math.max(1, Math.round(randNorm(avgBy, avgBy * 0.2)));
        await page.mouse.wheel({ deltaY: by });
        await sleep((by / scrollSpeed) * 1);
      }
    })();

    await Promise.all([scrollTask, readTask, decoyPromise, idleTask]);
  }

  await browser.close();
  console.log("[✓] Finished browsing articles.\n");
}
module.exports = browseArticles;

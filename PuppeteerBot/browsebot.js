const browseArticles = require('./puppeteer_bot');

(async () => {
  console.log(`[PID ${process.pid}] Starting bot...`);
  await browseArticles();
  console.log(`[PID ${process.pid}] Bot finished.`);
  process.exit(0);
})();

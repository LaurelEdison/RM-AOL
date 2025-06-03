// runner.cjs

const { browseArticles } = require('./playwrightBot.cjs');

const CONCURRENCY = 10;    // number of parallel browser processes
const TIMEOUT_MS  = 0;    // set to >0 to abort everything after N ms

async function runParallel() {
  console.log(`Starting ${CONCURRENCY} parallel bots…`);

  // Create an array of promises
  const workers = Array.from({ length: CONCURRENCY }, (_, idx) => {
    return (async () => {
      console.log(`▶ Worker ${idx + 1} starting`);
      try {
        await browseArticles();
        console.log(`✔ Worker ${idx + 1} finished`);
      } catch (err) {
        console.error(`✖ Worker ${idx + 1} error:`, err);
      }
    })();
  });

  // Optionally enforce a global timeout
  const all = Promise.all(workers);
  if (TIMEOUT_MS > 0) {
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Global timeout')), TIMEOUT_MS)
    );
    return Promise.race([all, timeout]);
  }
  return all;
}

if (require.main === module) {
  runParallel()
    .then(() => {
      console.log('[✓] All workers done');
      process.exit(0);
    })
    .catch(err => {
      console.error('[!] Runner error:', err);
      process.exit(1);
    });
}

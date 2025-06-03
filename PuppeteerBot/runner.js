const { fork } = require('child_process');

const numBots = 20;
const numRuns = 20;

async function runBatch() {
  for (let n = 0; n < numRuns; n++) {
    console.log(`--- Run ${n + 1} ---`);
    const processes = [];

    for (let i = 0; i < numBots; i++) {
      processes.push(new Promise((resolve) => {
        const child = fork('./browseBot.js');
        child.on('exit', (code) => {
          console.log(`Child PID ${child.pid} exited with code ${code}`);
          resolve();
        });
      }));
    }

    await Promise.all(processes); // wait for all i bots before next n
  }
}

runBatch();

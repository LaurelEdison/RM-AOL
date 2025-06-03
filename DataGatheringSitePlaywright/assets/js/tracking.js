const behaviorData = {
  sessionId: generateUUID(),
  page: window.location.pathname,
  startTime: Date.now(),
  mouseMoves: [],
  clicks: [],
  scrolls: [],
  keyPresses: [],
  endTime: [],
};

function generateUUID() {
  // Generates a UUID v4-like string using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

document.addEventListener("mousemove", (e) => {
  behaviorData.mouseMoves.push({
    x: e.clientX,
    y: e.clientY,
    time: Date.now(),
  });
});

document.addEventListener("click", (e) => {
  behaviorData.clicks.push({
    x: e.clientX,
    y: e.clientY,
    time: Date.now(),
    button: e.button
  });
});

document.addEventListener("scroll", () => {
  behaviorData.scrolls.push({
    scrollY: window.scrollY,
    time: Date.now(),
  });
});

document.addEventListener("keydown", (e) => {
  behaviorData.keyPresses.push({
    key: e.key,
    time: Date.now(),
  });
});

// Calculate averages, max values, distances, etc.
function analyzeBehavior() {
  const now = Date.now();
  const timeSpent = (now - behaviorData.startTime) / 1000;

  // --- Mouse movement thresholds ---
  const MIN_DIST = 3;                    // px
  const MIN_STRAIGHT = Math.PI / 12;     // 15°
  const SHARP_THRESH = Math.PI / 2;      // 90°

  // angle difference helper
  function angleDiff(a1, a2) {
    let d = Math.abs(a2 - a1) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  }

  let totalDistance = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let sharpTurns = 0;
  let straightMovements = 0;

  for (let i = 2; i < behaviorData.mouseMoves.length; i++) {
    const prev = behaviorData.mouseMoves[i - 2];
    const a = behaviorData.mouseMoves[i - 1];
    const b = behaviorData.mouseMoves[i];

    const dx1 = a.x - prev.x;
    const dy1 = a.y - prev.y;
    const dx2 = b.x - a.x;
    const dy2 = b.y - a.y;

    const d1 = Math.hypot(dx1, dy1);
    const d2 = Math.hypot(dx2, dy2);
    if (d1 < MIN_DIST || d2 < MIN_DIST) continue;  // skip jitter

    const dt = (b.time - a.time) / 1000 || 1;
    const speed = d2 / dt;

    totalDistance += d2;
    totalSpeed += speed;
    maxSpeed = Math.max(maxSpeed, speed);

    const a1 = Math.atan2(dy1, dx1);
    const a2 = Math.atan2(dy2, dx2);
    const da = angleDiff(a1, a2);

    if (da > SHARP_THRESH)      sharpTurns++;
    else if (da < MIN_STRAIGHT) straightMovements++;
    // else: ignore neutral turns
  }

  const avgMouseSpeed = totalSpeed / (behaviorData.mouseMoves.length - 2 || 1);

  // Scroll behavior
  const scrollEvents = behaviorData.scrolls;
  let totalScroll = 0;
  let totalScrollTime = 0;
  let scrollDirection = 0;

  for (let i = 1; i < scrollEvents.length; i++) {
    const dy = scrollEvents[i].scrollY - scrollEvents[i - 1].scrollY;
    totalScroll += Math.abs(dy);
    if (dy > 0) scrollDirection++;
    else if (dy < 0) scrollDirection--;
    totalScrollTime += scrollEvents[i].time - scrollEvents[i - 1].time;
  }

  const avgScrollSpeed = totalScroll / ((totalScrollTime || 1000) / 1000);
  const maxScrollDepth = Math.max(...scrollEvents.map((s) => s.scrollY), 0);

  // Keyboard
  let totalKeyInterval = 0;
  for (let i = 1; i < behaviorData.keyPresses.length; i++) {
    totalKeyInterval += behaviorData.keyPresses[i].time - behaviorData.keyPresses[i - 1].time;
  }
  const avgTimeBetweenKeys = totalKeyInterval / (behaviorData.keyPresses.length - 1 || 1);
  const shortcutUse = behaviorData.keyPresses.some(
    (k) => k.key === "Control" || k.key === "Meta"
  );

  // Clicks
  const clickTimestamps = behaviorData.clicks.map((c) => c.time);
  let clicksData = behaviorData.clicks.map((c, i) => ({
    clickType: c.button === 0 ? "left" : c.button === 1 ? "middle" : "right",
    clickTimestamp: c.time,
    timeSinceLastClick: i === 0 ? null : c.time - clickTimestamps[i - 1],
  }));

  return {
    sessionId: behaviorData.sessionId,
    page: behaviorData.page,
    startTime: behaviorData.startTime,
    endTime: now,
    timeSpentSeconds: timeSpent,

    scroll: {
      maxDepth: maxScrollDepth,
      avgSpeed: avgScrollSpeed,
      direction: scrollDirection > 0 ? "down" : scrollDirection < 0 ? "up" : "none",
      totalEvents: scrollEvents.length,
    },

    mouse: {
      totalDistance,
      avgSpeed: avgMouseSpeed,
      maxSpeed,
      idleTime: 0,
      sharpTurns,
      straightMovements,
    },

    keyboard: {
      avgTimeBetweenKeys,
      shortcutUse,
    },

    clicks: clicksData,
  };
}

window.addEventListener("beforeunload", () => {
  const finalData = analyzeBehavior();
  console.log(finalData);
  navigator.sendBeacon(
    "track.php",
    new Blob([JSON.stringify(finalData)], { type: "application/json" })
  );
});

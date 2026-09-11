// === CONFIG ===
const CONFIG = {
  moveSpeed: 520,
  itemFallBase: 220,
  itemFallScale: 100,
  playerScale: 0.7,
  itemScale: 1.2,
  healthMax: 3,
  hitGrace: 6,
};

let touchingLeft = false;
let touchingRight = false;

// === CANVAS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// === ASSETS ===
const playerImg = new Image();
const itemImg = new Image();
playerImg.src = "player.png";
itemImg.src = "item.png";
let assetsLoaded = { player: false, item: false };
playerImg.onload = () => (assetsLoaded.player = true);
itemImg.onload = () => (assetsLoaded.item = true);

// === INPUT ===
const INPUT = { mode: "none", lastMouseMove: 0 };

// === ITEM COUNT BY SCORE ===
function getMaxItems(score) {
  if (score >= 50) return 3;
  return 2;
}

// === ITEM FALL SPEED ===
function getFallSpeed(score) {
  const cappedScore = Math.min(score, 100);
  const speedBoost = Math.floor(cappedScore / 10) * CONFIG.itemFallScale;
  return CONFIG.itemFallBase + speedBoost;
}

// === EXPLOSION PARTICLES ===
let explosions = [];

function spawnExplosion(x, y, color1, color2, count) {
  const n = count || 20;
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    const life = 0.6 + Math.random() * 0.4;
    explosions.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 3 + Math.random() * 6,
      alpha: 1,
      color: Math.random() < 0.5 ? color1 : color2,
      life,
      maxLife: life,
    });
  }
}

function updateExplosions(dt) {
  explosions = explosions.filter((p) => p.life > 0);
  for (const p of explosions) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 250 * dt; // gravity
    p.life -= dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
  }
}

function drawExplosions() {
  for (const p of explosions) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
// === CLOUDS ===
const CLOUD_COUNT   = 12;
const CLOUD_SPEED   = 38;   // px/s — fixed, never scales with score

const clouds = [];

function makeCloud() {
  return {
    x:      Math.random() * canvas.width,
    y:      Math.random() * canvas.height,          // random start across full height
    r:      18 + Math.random() * 38,                // base radius of each puff
    puffs:  2 + Math.floor(Math.random() * 3),      // 2–4 puffs per cloud
    speed:  CLOUD_SPEED * (0.6 + Math.random() * 0.8), // slight per-cloud variation
    alpha:  0.04 + Math.random() * 0.09,            // very faint
  };
}

// Init clouds spread across the whole canvas
for (let i = 0; i < CLOUD_COUNT; i++) clouds.push(makeCloud());

function updateClouds(dt) {
  for (const c of clouds) {
    c.y += c.speed * dt;
    // Wrap back to top when fully off-screen at bottom
    if (c.y - c.r > canvas.height) {
      c.y     = -(c.r * 2);
      c.x     = Math.random() * canvas.width;
      c.r     = 18 + Math.random() * 38;
      c.puffs = 2 + Math.floor(Math.random() * 3);
      c.alpha = 0.04 + Math.random() * 0.09;
    }
  }
}

function drawClouds() {
  ctx.save();
  for (const c of clouds) {
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = "#c8d8ff";
    ctx.beginPath();
    // Draw overlapping circles to form a cloud puff shape
    const spread = c.r * 0.7;
    for (let p = 0; p < c.puffs; p++) {
      const angle = (p / c.puffs) * Math.PI; // arc across the top
      const px = c.x + Math.cos(angle) * spread * (p % 2 === 0 ? 1 : -0.5);
      const py = c.y + Math.sin(angle) * spread * 0.35;
      const pr = c.r * (0.7 + Math.random() * 0.0); // consistent per frame
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

// === WIND TRAILS ===
const windTrails = [];
const WIND_SPAWN_RATE = 0.025; // seconds between each trail burst
let windSpawnTimer = 0;

function spawnWindTrails() {
  const p = state.player;
  // Emit from left wing tip, right wing tip, and centre tail
  const emitPoints = [
    { ox: -p.w * 0.38, oy:  p.h * 0.05 },  // left wing
    { ox:  p.w * 0.38, oy:  p.h * 0.05 },  // right wing
    { ox:  0,          oy:  p.h * 0.40 },  // tail centre
  ];

  for (const ep of emitPoints) {
    const count = 1 + Math.floor(Math.random() * 2); // 1–2 streaks per point
    for (let i = 0; i < count; i++) {
      const life = 0.28 + Math.random() * 0.22;
      windTrails.push({
        x:    p.x + ep.ox + (Math.random() - 0.5) * 6,
        y:    p.y + ep.oy + (Math.random() - 0.5) * 4,
        vx:   (Math.random() - 0.5) * 18,    // slight lateral drift
        vy:   -(18 + Math.random() * 28),     // drifts upward (opposite flight dir)
        len:  10 + Math.random() * 18,        // streak length
        life,
        maxLife: life,
      });
    }
  }
}

function updateWindTrails(dt) {
  windSpawnTimer -= dt;
  if (windSpawnTimer <= 0 && state.running && !state.gameOver) {
    spawnWindTrails();
    windSpawnTimer = WIND_SPAWN_RATE;
  }
  for (const t of windTrails) {
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.life -= dt;
  }
  // Remove dead trails
  for (let i = windTrails.length - 1; i >= 0; i--) {
    if (windTrails[i].life <= 0) windTrails.splice(i, 1);
  }
}

function drawWindTrails() {
  ctx.save();
  ctx.lineCap = "round";
  for (const t of windTrails) {
    const progress = t.life / t.maxLife;          // 1 → 0
    ctx.globalAlpha = progress * 0.45;            // fade out
    const trailLen = t.len * progress;            // shrink as it fades

    // Colour cycles subtly: white → light sky blue
    const b = Math.floor(200 + 55 * (1 - progress));
    ctx.strokeStyle = `rgb(210,225,${b})`;
    ctx.lineWidth = 1.5 * progress + 0.5;

    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + t.vx * 0.06, t.y + trailLen); // streak downward from spawn point
    ctx.stroke();
  }
  ctx.restore();
}

// === STATE ===
const state = {
  running: false,
  paused: false,
  gameOver: false,
  score: 0,
  health: CONFIG.healthMax,
  keys: { left: false, right: false },
  mouseX: null,
  player: { x: canvas.width / 2, y: 0, w: 72, h: 72 },
  items: [],
  itemW: 48,
  itemH: 48,
  blinkTimer: 0,
};

// === ITEM HELPERS ===
function makeItem() {
  return {
    x: 0,
    y: -state.itemH,
    w: state.itemW,
    h: state.itemH,
    vy: CONFIG.itemFallBase,
  };
}

function placeItemAt(item, resetY) {
  item.w = state.itemW;
  item.h = state.itemH;
  item.x = Math.random() * (canvas.width - item.w) + item.w / 2;
  item.y = resetY ? -item.h : -(Math.random() * 200 + item.h);
  item.vy = getFallSpeed(state.score);
}

function buildItems(count) {
  state.items = [];
  for (let i = 0; i < count; i++) {
    const item = makeItem();
    placeItemAt(item, false);
    // stagger so they don't all appear at once
    item.y = -(item.h + i * (Math.random() * 120 + 80));
    state.items.push(item);
  }
}

function resetGame() {
  state.score = 0;
  state.health = CONFIG.healthMax;
  state.gameOver = false;
  state.paused = false;
  state.blinkTimer = 0;
  INPUT.mode = "none";
  state.mouseX = null;
  explosions = [];
  fitSpritesToImages();
  centerPlayer();
  buildItems(getMaxItems(0));
  state.running = true;
}

function centerPlayer() {
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height - Math.max(80, state.player.h * 0.65);
}

// === INPUT EVENTS ===
window.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowLeft" || k.toLowerCase() === "a") {
    state.keys.left = true;
    INPUT.mode = "keys";
    state.mouseX = null;
  }
  if (k === "ArrowRight" || k.toLowerCase() === "d") {
    state.keys.right = true;
    INPUT.mode = "keys";
    state.mouseX = null;
  }
  if (k.toLowerCase() === "p") state.paused = !state.paused;
  if (
    (k.toLowerCase() === "r" || k === "Enter") &&
    (state.gameOver || !state.running)
  )
    resetGame();
});
window.addEventListener("keyup", (e) => {
  const k = e.key;
  if (k === "ArrowLeft" || k.toLowerCase() === "a") state.keys.left = false;
  if (k === "ArrowRight" || k.toLowerCase() === "d") state.keys.right = false;
});

// === DRAG CONTROL ===
let isDragging = false;
let activeTouchId = null;

function startDrag(x, touchId = null) {
  const rect = canvas.getBoundingClientRect();
  const gameX = (x - rect.left) * (canvas.width / rect.width);
  state.mouseX = gameX;
  INPUT.mode = "mouse";
  INPUT.lastMouseMove = performance.now();
  isDragging = true;
  activeTouchId = touchId;
}

function dragMove(x) {
  if (!isDragging) return;
  const rect = canvas.getBoundingClientRect();
  const gameX = (x - rect.left) * (canvas.width / rect.width);
  state.mouseX = gameX;
  INPUT.mode = "mouse";
  INPUT.lastMouseMove = performance.now();
}

function stopDrag(touchId = null) {
  if (touchId !== null && touchId !== activeTouchId) return;
  isDragging = false;
  activeTouchId = null;
}

// Mouse drag
canvas.addEventListener("mousedown", (e) => startDrag(e.clientX));
canvas.addEventListener("mousemove", (e) => {
  if (isDragging) dragMove(e.clientX);
});
canvas.addEventListener("mouseup", () => stopDrag());
canvas.addEventListener("mouseleave", () => stopDrag());

// Touch drag
canvas.addEventListener(
  "touchstart",
  (e) => {
    const t = e.changedTouches[0];
    startDrag(t.clientX, t.identifier);
    e.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    for (let t of e.changedTouches) {
      if (t.identifier === activeTouchId) {
        dragMove(t.clientX);
        e.preventDefault();
        break;
      }
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchend",
  (e) => {
    for (let t of e.changedTouches) {
      if (t.identifier === activeTouchId) {
        stopDrag(t.identifier);
        break;
      }
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchcancel",
  (e) => {
    for (let t of e.changedTouches) {
      if (t.identifier === activeTouchId) {
        stopDrag(t.identifier);
        break;
      }
    }
  },
  { passive: false }
);

// === UTIL ===
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    Math.abs(ax - bx) <= aw / 2 + bw / 2 - CONFIG.hitGrace &&
    Math.abs(ay - by) <= ah / 2 + bh / 2 - CONFIG.hitGrace
  );
}

// === UPDATE ===
function update(dt) {
  if (!state.running || state.paused || state.gameOver) return;

  state.blinkTimer += dt;
  updateClouds(dt);
  updateWindTrails(dt);

  // --- Player movement ---
  if (INPUT.mode === "keys") {
    let vx = 0;
    if (state.keys.left || touchingLeft) vx -= CONFIG.moveSpeed;
    if (state.keys.right || touchingRight) vx += CONFIG.moveSpeed;
    state.player.x += vx * dt;
  }
  if (INPUT.mode === "mouse" && state.mouseX !== null) {
    state.player.x = state.mouseX;
  }
  state.player.x = clamp(
    state.player.x,
    state.player.w / 2,
    canvas.width - state.player.w / 2
  );

  // --- Ensure correct item count for current score ---
  const targetCount = getMaxItems(state.score);
  while (state.items.length < targetCount) {
    const item = makeItem();
    placeItemAt(item, false);
    state.items.push(item);
  }

  // --- Update items ---
  const fallSpeed = getFallSpeed(state.score);
  for (const item of state.items) {
    item.vy = fallSpeed;
    item.y += item.vy * dt;

    // Collision: player hit by falling item
    if (
      aabbOverlap(
        state.player.x, state.player.y, state.player.w, state.player.h,
        item.x, item.y, item.w, item.h
      )
    ) {
      spawnExplosion(item.x, item.y, "#ff4d6d", "#ffaa00");
      state.health -= 1;
      if (state.health <= 0) {
        state.health = 0;
        // Big explosion on player
        spawnExplosion(state.player.x, state.player.y, "#ffffff", "#ff4d6d", 30);
        spawnExplosion(state.player.x, state.player.y, "#ffaa00", "#7aa2ff", 20);
        state.gameOver = true;
        state.running = false;
      }
      // Reset item above screen
      placeItemAt(item, false);
    }

    // Item passed the bottom — player successfully avoided it → +1 score
    if (item.y - item.h / 2 > canvas.height) {
      state.score += 1;
      placeItemAt(item, false);
    }
  }

  updateExplosions(dt);
}

// === DRAW ===
function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGridBg() {
  ctx.save();
  ctx.globalAlpha = 0.15;
  const step = 40;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawEntityAlpha(img, x, y, w, h, fallbackColor, alpha) {
  const left = x - w / 2, top = y - h / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (img && img.complete && img.naturalWidth > 0)
    ctx.drawImage(img, left, top, w, h);
  else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(left, top, w, h);
  }
  ctx.restore();
}

function overlayText(title, subtitle) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 26);
  ctx.restore();
}

function drawUI() {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(12, 12, 130, 46);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(12, 12, 130, 46);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("Score", 20, 32);
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillStyle = "#29d17e";
  ctx.fillText(String(state.score), 20, 54);

  const max = CONFIG.healthMax, barW = 24, gap = 8;
  const x0 = canvas.width - (max * barW + (max - 1) * gap) - 16, y0 = 18;
  for (let i = 0; i < max; i++) {
    const x = x0 + i * (barW + gap);
    ctx.fillStyle = i < state.health ? "#ff738a" : "#3a3a5f";
    ctx.fillRect(x, y0, barW, 12);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x, y0 + 14, barW, 6);
  }

  if (state.paused && !state.gameOver)
    overlayText("PAUSED", "Press P to resume");
  if (state.gameOver) overlayText("GAME OVER", "Press Enter or R to restart");

  if (!assetsLoaded.player || !assetsLoaded.item) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.font = "italic 14px system-ui, sans-serif";
    ctx.fillText(
      "Tip: Put player.png and item.png next to index.html",
      16,
      canvas.height - 16
    );
    ctx.restore();
  }
}

// Retro blink: alternates visibility every 150ms when health is 1
const BLINK_PERIOD = 0.15;
function getBlinkAlpha() {
  if (state.health === 1 && !state.gameOver) {
    return Math.floor(state.blinkTimer / BLINK_PERIOD) % 2 === 0 ? 1 : 0.12;
  }
  return 1;
}

function draw() {
  clear();
  drawGridBg();
  drawClouds();

  const blinkAlpha = getBlinkAlpha();

  // Draw falling items
  for (const item of state.items) {
    drawEntityAlpha(itemImg, item.x, item.y, item.w, item.h, "#7aa2ff", blinkAlpha);
  }

  // Draw player (hidden on game over so explosion takes center stage)
  if (!state.gameOver) {
    drawWindTrails();
    drawEntityAlpha(
      playerImg,
      state.player.x, state.player.y,
      state.player.w, state.player.h,
      "#29d17e",
      blinkAlpha
    );
  }

  drawExplosions();
  drawUI();
}

// === INIT / LOOP ===
function fitSpritesToImages() {
  if (assetsLoaded.player) {
    const base = Math.min(96, playerImg.width, playerImg.height);
    state.player.w = base * CONFIG.playerScale;
    state.player.h = base * CONFIG.playerScale;
  }
  if (assetsLoaded.item) {
    const base = Math.min(64, itemImg.width, itemImg.height);
    state.itemW = base * CONFIG.itemScale;
    state.itemH = base * CONFIG.itemScale;
    for (const item of state.items) {
      item.w = state.itemW;
      item.h = state.itemH;
    }
  }
  centerPlayer();
}
playerImg.addEventListener("load", fitSpritesToImages);
itemImg.addEventListener("load", fitSpritesToImages);

fitSpritesToImages();
centerPlayer();
buildItems(getMaxItems(0));
state.running = false;

let lastTime = performance.now();
function loop(t) {
  const dt = Math.min(0.1, (t - lastTime) / 1000);
  lastTime = t;
  if (state.running && !state.paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Start on first click / key
window.addEventListener(
  "keydown",
  () => {
    if (!state.running && !state.gameOver) resetGame();
  },
  { once: true }
);
canvas.addEventListener(
  "click",
  () => {
    if (!state.running && !state.gameOver) resetGame();
  },
  { once: true }
);

// Auto-pause on blur
window.addEventListener("blur", () => {
  if (state.running && !state.gameOver) state.paused = true;
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  if (state.running && !state.gameOver) {
    state.paused = !state.paused;
  }
});

document.getElementById("restartBtn").addEventListener("click", () => {
  resetGame();
});

// === INFO MODAL ===
const infoModal = document.getElementById("infoModal");
const startBtn  = document.getElementById("startBtn");

function closeModal() {
  infoModal.classList.add("hidden");
  resetGame();
}

startBtn.addEventListener("click", closeModal);

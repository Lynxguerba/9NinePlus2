// === CONFIG ===
const CONFIG = {
  moveSpeed: 520, // px/sec for keyboard
  itemFallBase: 220, // px/sec starting fall speed
  itemFallScale: 100, // extra px/sec per 10 score
  playerScale: 0.9,
  itemScale: 0.9,
  healthMax: 3,
  catchGrace: 6,
};

// === CANVAS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// === ASSETS (local images) ===
const playerImg = new Image();
const itemImg = new Image();
playerImg.src = "player.png";
itemImg.src = "item.png";
let assetsLoaded = { player: false, item: false };
playerImg.onload = () => (assetsLoaded.player = true);
itemImg.onload = () => (assetsLoaded.item = true);

// === INPUT MODE ===
const INPUT = { mode: "none", lastMouseMove: 0 };

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
  item: {
    x: Math.random() * canvas.width,
    y: -50,
    w: 48,
    h: 48,
    vy: CONFIG.itemFallBase,
  },
};

function resetGame() {
  state.score = 0;
  state.health = CONFIG.healthMax;
  state.gameOver = false;
  state.paused = false;
  INPUT.mode = "none";
  state.mouseX = null;
  placeItem(true);
  fitSpritesToImages();
  centerPlayer();
  state.running = true;
}

function centerPlayer() {
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height - Math.max(80, state.player.h * 0.65);
}

function placeItem(reset = false) {
  state.item.x =
    Math.random() * (canvas.width - state.item.w) + state.item.w / 2;
  state.item.y = reset ? -state.item.h : -Math.random() * 200 - state.item.h;
  const speedBoost = Math.floor(state.score / 10) * CONFIG.itemFallScale;
  state.item.vy = CONFIG.itemFallBase + speedBoost;
}

// === INPUT EVENTS ===
// Keyboard
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

function startDrag(x) {
  const rect = canvas.getBoundingClientRect();
  const gameX = (x - rect.left) * (canvas.width / rect.width);
  state.mouseX = gameX;
  INPUT.mode = "mouse";
  INPUT.lastMouseMove = performance.now();
  isDragging = true;
}

function dragMove(x) {
  if (!isDragging) return;
  const rect = canvas.getBoundingClientRect();
  const gameX = (x - rect.left) * (canvas.width / rect.width);
  state.mouseX = gameX;
  INPUT.mode = "mouse";
  INPUT.lastMouseMove = performance.now();
}

function stopDrag() {
  isDragging = false;
  state.mouseX = null;
  INPUT.mode = "none";
}

// Mouse drag
canvas.addEventListener("mousedown", (e) => startDrag(e.clientX));
canvas.addEventListener("mousemove", (e) => dragMove(e.clientX));
canvas.addEventListener("mouseup", stopDrag);
canvas.addEventListener("mouseleave", stopDrag);

// Touch drag
canvas.addEventListener(
  "touchstart",
  (e) => {
    startDrag(e.touches[0].clientX);
    e.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    dragMove(e.touches[0].clientX);
    e.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener("touchend", stopDrag);
canvas.addEventListener("touchcancel", stopDrag);

// === UTIL ===
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    Math.abs(ax - bx) <= aw / 2 + bw / 2 - CONFIG.catchGrace &&
    Math.abs(ay - by) <= ah / 2 + bh / 2 - CONFIG.catchGrace
  );
}

// === UPDATE ===
function update(dt) {
  if (!state.running || state.paused || state.gameOver) return;

  // Keyboard movement
  if (INPUT.mode === "keys") {
    let vx = 0;
    if (state.keys.left) vx -= CONFIG.moveSpeed;
    if (state.keys.right) vx += CONFIG.moveSpeed;
    state.player.x += vx * dt;
  }

  // Drag (mouse/touch)
  if (INPUT.mode === "mouse" && state.mouseX !== null) {
    state.player.x = state.mouseX;
  }

  // Clamp inside canvas
  state.player.x = clamp(
    state.player.x,
    state.player.w / 2,
    canvas.width - state.player.w / 2
  );

  // 📌 Speed scaling live during fall
  const milestoneBoost = Math.floor(state.score / 10) * CONFIG.itemFallScale;
  state.item.vy = CONFIG.itemFallBase + milestoneBoost;

  // Item falling
  state.item.y += state.item.vy * dt;

  // Catch
  if (
    aabbOverlap(
      state.player.x,
      state.player.y,
      state.player.w,
      state.player.h,
      state.item.x,
      state.item.y,
      state.item.w,
      state.item.h
    )
  ) {
    state.score += 1;
    placeItem(true);
  }

  // Missed
  if (state.item.y - state.item.h / 2 > canvas.height) {
    state.health -= 1;
    if (state.health <= 0) {
      state.health = 0;
      state.gameOver = true;
      state.running = false;
    } else {
      placeItem(true);
    }
  }
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
function drawEntity(img, x, y, w, h, fallbackColor) {
  const left = x - w / 2,
    top = y - h / 2;
  if (img && img.complete && img.naturalWidth > 0)
    ctx.drawImage(img, left, top, w, h);
  else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(left, top, w, h);
  }
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
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("Score", 20, 32);
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillStyle = "#29d17e";
  ctx.fillText(String(state.score), 20, 54);

  const max = CONFIG.healthMax,
    barW = 24,
    gap = 8;
  const x0 = canvas.width - (max * barW + (max - 1) * gap) - 16,
    y0 = 18;
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
function draw() {
  clear();
  drawGridBg();
  drawEntity(
    itemImg,
    state.item.x,
    state.item.y,
    state.item.w,
    state.item.h,
    "#7aa2ff"
  );
  drawEntity(
    playerImg,
    state.player.x,
    state.player.y,
    state.player.w,
    state.player.h,
    "#29d17e"
  );
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
    state.item.w = base * CONFIG.itemScale;
    state.item.h = base * CONFIG.itemScale;
  }
  centerPlayer();
}
playerImg.addEventListener("load", fitSpritesToImages);
itemImg.addEventListener("load", fitSpritesToImages);

placeItem(true);
fitSpritesToImages();
centerPlayer();
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

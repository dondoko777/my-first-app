const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const coinCount = document.querySelector("#coin-count");
const coinTotal = document.querySelector("#coin-total");
const overlay = document.querySelector("#message-overlay");
const messageEyebrow = document.querySelector("#message-eyebrow");
const messageTitle = document.querySelector("#message-title");
const messageCopy = document.querySelector("#message-copy");
const soundToggle = document.querySelector("#sound-toggle");

const VIEW_WIDTH = canvas.width;
const VIEW_HEIGHT = canvas.height;
const WORLD_WIDTH = 3160;
const GROUND_Y = 474;
const GRAVITY = 1900;
const MOVE_SPEED = 285;
const JUMP_SPEED = 700;

const platforms = [
  { x: 300, y: 390, width: 155 },
  { x: 565, y: 326, width: 145 },
  { x: 810, y: 405, width: 180 },
  { x: 1095, y: 360, width: 165 },
  { x: 1370, y: 300, width: 155 },
  { x: 1640, y: 385, width: 190 },
  { x: 1945, y: 332, width: 165 },
  { x: 2210, y: 390, width: 190 },
  { x: 2515, y: 318, width: 170 },
  { x: 2780, y: 375, width: 175 },
];

const initialCoins = [
  { x: 190, y: 408 }, { x: 365, y: 350 }, { x: 620, y: 285 },
  { x: 705, y: 420 }, { x: 875, y: 365 }, { x: 1160, y: 320 },
  { x: 1440, y: 260 }, { x: 1540, y: 425 }, { x: 1715, y: 345 },
  { x: 2010, y: 290 }, { x: 2290, y: 350 }, { x: 2570, y: 275 },
  { x: 2680, y: 425 }, { x: 2840, y: 330 }, { x: 3015, y: 410 },
];

const initialEnemies = [
  { x: 490, min: 475, max: 550, speed: 68, direction: 1 },
  { x: 1025, min: 1000, max: 1080, speed: 76, direction: -1 },
  { x: 1870, min: 1850, max: 1930, speed: 72, direction: 1 },
  { x: 2435, min: 2410, max: 2490, speed: 82, direction: -1 },
];

const keys = new Set();
const player = { x: 70, y: GROUND_Y - 48, width: 34, height: 44, vx: 0, vy: 0, grounded: true };
let coins = [];
let enemies = [];
let cameraX = 0;
let collected = 0;
let lives = 3;
let invulnerable = 0;
let elapsed = 0;
let previousTime = 0;
let jumpPressed = false;
let gameOver = false;
let gameWon = false;
let audioContext = null;
let soundEnabled = false;
let musicTimer = null;
let musicNoteIndex = 0;

const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 523.25, 659.25, 783.99, 1046.5, 880, 783.99, 659.25, 587.33];

coinTotal.textContent = String(initialCoins.length);

function playTone(frequency, duration, waveform = "sine", volume = 0.05, endFrequency = frequency, delay = 0) {
  if (!soundEnabled || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startTime = audioContext.currentTime + delay;
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startTime + duration);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playMusicNote() {
  playTone(melody[musicNoteIndex], 0.25, "sine", 0.022);
  musicNoteIndex = (musicNoteIndex + 1) % melody.length;
}

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  soundToggle.setAttribute("aria-pressed", String(enabled));
  soundToggle.setAttribute("aria-label", enabled ? "音をオフにする" : "音をオンにする");
  soundToggle.textContent = enabled ? "♪ 音あり" : "♪ 音なし";
  if (enabled) {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    playMusicNote();
    musicTimer = window.setInterval(playMusicNote, 300);
  } else {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

function resetGame() {
  player.x = 70;
  player.y = GROUND_Y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  cameraX = 0;
  collected = 0;
  lives = 3;
  invulnerable = 0;
  elapsed = 0;
  gameOver = false;
  gameWon = false;
  coins = initialCoins.map((coin) => ({ ...coin, taken: false }));
  enemies = initialEnemies.map((enemy) => ({ ...enemy }));
  coinCount.textContent = "0";
  overlay.hidden = true;
}

function showMessage(won) {
  gameWon = won;
  gameOver = !won;
  const endingNotes = won ? [523.25, 659.25, 783.99, 1046.5] : [330, 247, 196];
  endingNotes.forEach((note, index) => playTone(note, 0.24, "triangle", 0.06, note * 0.98, index * 0.14));
  messageEyebrow.textContent = won ? "STAGE CLEAR!" : "TRY AGAIN";
  messageTitle.textContent = won ? "ゴール！" : "ざんねん…";
  messageCopy.textContent = won
    ? `冒険クリア！コインを ${collected} 枚集めたよ。`
    : "もう一度チャレンジしてみよう！";
  overlay.hidden = false;
}

function damagePlayer() {
  if (invulnerable > 0 || gameOver || gameWon) return;
  playTone(220, 0.28, "sawtooth", 0.045, 95);
  lives -= 1;
  if (lives <= 0) {
    showMessage(false);
    return;
  }
  player.x = Math.max(50, player.x - 95);
  player.y = GROUND_Y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  invulnerable = 1.5;
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

function update(delta) {
  if (gameOver || gameWon) return;
  elapsed += delta;
  invulnerable = Math.max(0, invulnerable - delta);

  const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
  const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
  player.vx = (Number(right) - Number(left)) * MOVE_SPEED;
  if (jumpPressed && player.grounded) {
    player.vy = -JUMP_SPEED;
    player.grounded = false;
    playTone(440, 0.16, "triangle", 0.045, 740);
  }
  jumpPressed = false;

  const previousBottom = player.y + player.height;
  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.vx * delta));
  player.vy = Math.min(1050, player.vy + GRAVITY * delta);
  player.y += player.vy * delta;
  player.grounded = false;

  if (previousBottom <= GROUND_Y && player.y + player.height >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.grounded = true;
  }

  for (const platform of platforms) {
    if (
      player.vy >= 0
      && previousBottom <= platform.y
      && player.y + player.height >= platform.y
      && player.x + player.width > platform.x
      && player.x < platform.x + platform.width
    ) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  }

  for (const coin of coins) {
    if (!coin.taken && intersects(player, { x: coin.x - 12, y: coin.y - 12, width: 24, height: 24 })) {
      coin.taken = true;
      collected += 1;
      coinCount.textContent = String(collected);
      playTone(880, 0.11, "sine", 0.05, 1174);
    }
  }

  for (const enemy of enemies) {
    enemy.x += enemy.speed * enemy.direction * delta;
    if (enemy.x <= enemy.min || enemy.x >= enemy.max) {
      enemy.direction *= -1;
      enemy.x = Math.max(enemy.min, Math.min(enemy.max, enemy.x));
    }
    if (intersects(player, { x: enemy.x, y: GROUND_Y - 35, width: 34, height: 35 })) {
      damagePlayer();
    }
  }

  if (player.y > VIEW_HEIGHT + 90) damagePlayer();

  cameraX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH * 0.36));
  if (player.x + player.width >= WORLD_WIDTH - 110) showMessage(true);
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, "#a9def3");
  sky.addColorStop(0.68, "#e1f4f8");
  sky.addColorStop(1, "#eaf5e8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  for (let i = 0; i < 6; i += 1) {
    const cloudX = ((i * 223 - cameraX * 0.16) % (VIEW_WIDTH + 180) + VIEW_WIDTH + 180) % (VIEW_WIDTH + 180) - 90;
    const cloudY = 75 + (i % 3) * 57;
    ctx.beginPath();
    ctx.ellipse(cloudX, cloudY, 36, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX - 16, cloudY + 3, 20, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX + 15, cloudY + 3, 23, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHills("#a9d8c8", 0.12, 350, 100);
  drawHills("#88cbb4", 0.23, 410, 72);
}

function drawHills(color, parallax, baseY, height) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_HEIGHT);
  for (let x = -180; x <= VIEW_WIDTH + 180; x += 180) {
    const worldX = x + (cameraX * parallax) % 360;
    const offset = (Math.floor((x + cameraX * parallax) / 180) % 2) * 12;
    ctx.quadraticCurveTo(worldX + 90, baseY - height - offset, worldX + 180, baseY);
  }
  ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawWorld() {
  ctx.save();
  ctx.translate(-cameraX, 0);

  ctx.fillStyle = "#82c990";
  ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, VIEW_HEIGHT - GROUND_Y);
  ctx.fillStyle = "#5db77c";
  ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, 12);
  ctx.fillStyle = "#a2d991";
  for (let x = 18; x < WORLD_WIDTH; x += 42) {
    ctx.fillRect(x, GROUND_Y + 14 + (x % 3) * 3, 3, 8);
    ctx.fillRect(x + 13, GROUND_Y + 28, 2, 6);
  }

  for (const platform of platforms) {
    ctx.fillStyle = "rgba(51, 106, 93, 0.13)";
    roundedRect(platform.x + 4, platform.y + 7, platform.width, 20, 8);
    ctx.fill();
    ctx.fillStyle = "#a77953";
    roundedRect(platform.x, platform.y, platform.width, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#72c786";
    roundedRect(platform.x, platform.y - 5, platform.width, 12, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(platform.x + 13, platform.y + 12, platform.width - 26, 2);
  }

  drawFlag();
  drawCoins();
  drawEnemies();
  drawPlayer();
  ctx.restore();
}

function drawFlag() {
  const x = WORLD_WIDTH - 100;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, 332, 6, GROUND_Y - 332);
  ctx.fillStyle = "#ff8c83";
  ctx.beginPath();
  ctx.moveTo(x + 6, 334);
  ctx.lineTo(x + 64, 351);
  ctx.lineTo(x + 6, 368);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f6c866";
  ctx.beginPath();
  ctx.arc(x + 3, 329, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(49, 93, 83, 0.14)";
  ctx.beginPath();
  ctx.ellipse(x + 28, GROUND_Y + 3, 35, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoins() {
  for (let i = 0; i < coins.length; i += 1) {
    const coin = coins[i];
    if (coin.taken) continue;
    const bob = Math.sin(elapsed * 4 + i) * 3;
    const shimmer = 0.82 + Math.sin(elapsed * 5 + i) * 0.12;
    ctx.fillStyle = "#f7bd43";
    ctx.beginPath();
    ctx.ellipse(coin.x, coin.y + bob, 9 * shimmer, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e99b2e";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(coin.x - 2, coin.y - 3 + bob, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    const x = enemy.x;
    const bob = Math.sin(elapsed * 8 + x) * 2;
    ctx.fillStyle = "rgba(49, 77, 80, 0.16)";
    ctx.beginPath();
    ctx.ellipse(x + 17, GROUND_Y + 2, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#846caa";
    roundedRect(x, GROUND_Y - 32 + bob, 34, 29, 12);
    ctx.fill();
    ctx.fillStyle = "#a391c4";
    ctx.beginPath();
    ctx.arc(x + 17, GROUND_Y - 31 + bob, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + 12, GROUND_Y - 21 + bob, 3, 0, Math.PI * 2);
    ctx.arc(x + 23, GROUND_Y - 21 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#344254";
    ctx.beginPath();
    ctx.arc(x + 13, GROUND_Y - 20 + bob, 1.4, 0, Math.PI * 2);
    ctx.arc(x + 22, GROUND_Y - 20 + bob, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  if (invulnerable > 0 && Math.floor(elapsed * 12) % 2 === 0) return;
  const x = player.x;
  const y = player.y;
  const running = player.grounded && Math.abs(player.vx) > 0;
  const legSwing = running ? Math.sin(elapsed * 17) * 3 : 0;

  ctx.fillStyle = "rgba(49, 77, 80, 0.16)";
  ctx.beginPath();
  ctx.ellipse(x + player.width / 2, GROUND_Y + 2, 19, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e98268";
  roundedRect(x + 4, y + 12, 27, 31, 9);
  ctx.fill();
  ctx.fillStyle = "#f7c9a5";
  ctx.beginPath();
  ctx.arc(x + 18, y + 12, 13, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e98268";
  ctx.beginPath();
  ctx.arc(x + 18, y + 9, 13, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + 22, y + 19, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#304252";
  ctx.beginPath();
  ctx.arc(x + 23, y + 19, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff0d8";
  roundedRect(x + 6, y + 38 + legSwing, 11, 6, 3);
  ctx.fill();
  roundedRect(x + 19, y + 38 - legSwing, 11, 6, 3);
  ctx.fill();
}

function render() {
  drawBackground();
  drawWorld();
}

function frame(timestamp) {
  if (!previousTime) previousTime = timestamp;
  const delta = Math.min((timestamp - previousTime) / 1000, 0.033);
  previousTime = timestamp;
  update(delta);
  render();
  requestAnimationFrame(frame);
}

document.addEventListener("keydown", (event) => {
  const key = event.key;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(key)) event.preventDefault();
  if ((key === " " || key === "ArrowUp" || key === "w" || key === "W") && !keys.has(key)) {
    jumpPressed = true;
  }
  keys.add(key);
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});

window.addEventListener("blur", () => {
  keys.clear();
});

document.querySelectorAll("[data-action]").forEach((button) => {
  const action = button.dataset.action;
  const key = action === "left" ? "ArrowLeft" : action === "right" ? "ArrowRight" : " ";
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (action === "jump") jumpPressed = true;
    else keys.add(key);
  });
  const release = () => keys.delete(key);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

document.querySelector("#restart-button").addEventListener("click", resetGame);
document.querySelector("#play-again").addEventListener("click", resetGame);
soundToggle.addEventListener("click", () => setSoundEnabled(!soundEnabled));
if (!window.AudioContext) {
  soundToggle.disabled = true;
  soundToggle.textContent = "音声に非対応";
}

resetGame();
requestAnimationFrame(frame);

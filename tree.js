"use strict";

/* ===== Crystal Tree Background - Drawing Effect ===== */
const treeCanvas = document.getElementById("tree-canvas");
const treeCtx = treeCanvas.getContext("2d");

let treeW = 0, treeH = 0;
let treeDpr = Math.max(1, window.devicePixelRatio || 1);

// Image
const treeImage = new Image();
treeImage.crossOrigin = "anonymous";
treeImage.src = "/images/crystal-tree.png";
let imageLoaded = false;

// Animation state
let drawProgress = 0;
let isDrawing = true;
const DRAW_DURATION = 3500; // ms for full draw
const DRAW_START_DELAY = 300;

// Cursor tracking for petal interaction
const cursor = { x: 0, y: 0, vx: 0, vy: 0, speed: 0 };
let lastCursorTime = 0;

// Petals for interaction
let petals = [];
const CURSOR_SPEED_THRESHOLD = 8;

function sizeTreeCanvas() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  treeCanvas.style.width = vw + "px";
  treeCanvas.style.height = vh + "px";
  treeCanvas.width = Math.floor(vw * treeDpr);
  treeCanvas.height = Math.floor(vh * treeDpr);
  treeCtx.setTransform(treeDpr, 0, 0, treeDpr, 0, 0);
  treeW = vw;
  treeH = vh;
}

// Spawn petals when cursor moves fast
function spawnPetals(x, y, count) {
  if (petals.length > 50) return;
  for (let i = 0; i < count; i++) {
    petals.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 2.5,
      vy: Math.random() * 2 + 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.12,
      size: 3 + Math.random() * 5,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.03 + Math.random() * 0.02,
      opacity: 1,
      life: 1
    });
  }
}

// Update cursor velocity
function updateCursor(e) {
  const now = performance.now();
  const dt = Math.max(1, now - lastCursorTime);
  
  const rect = treeCanvas.getBoundingClientRect();
  const newX = e.clientX - rect.left;
  const newY = e.clientY - rect.top;
  
  cursor.vx = (newX - cursor.x) / dt * 16;
  cursor.vy = (newY - cursor.y) / dt * 16;
  cursor.speed = Math.hypot(cursor.vx, cursor.vy);
  
  cursor.x = newX;
  cursor.y = newY;
  lastCursorTime = now;
  
  // Spawn petals on fast movement (only where branches exist - top-left area)
  if (cursor.speed > CURSOR_SPEED_THRESHOLD && drawProgress > 0.5) {
    const branchAreaCheck = cursor.x < treeW * 0.7 && cursor.y < treeH * 0.8;
    const density = Math.max(0, 1 - (cursor.x / treeW) * 0.8 - (cursor.y / treeH) * 0.3);
    
    if (branchAreaCheck && Math.random() < density * 0.3) {
      spawnPetals(cursor.x, cursor.y, Math.floor(1 + Math.random() * 2));
    }
  }
}

// Draw the tree with a "being drawn" effect
// Reveals along diagonal lines that follow the branch flow direction
function drawTree(progress) {
  treeCtx.clearRect(0, 0, treeW, treeH);
  
  if (!imageLoaded) return;
  
  // Calculate image scaling to cover the canvas (like background-size: cover)
  const imgAspect = treeImage.width / treeImage.height;
  const canvasAspect = treeW / treeH;
  
  let drawW, drawH, offsetX, offsetY;
  
  if (canvasAspect > imgAspect) {
    drawW = treeW;
    drawH = treeW / imgAspect;
    offsetX = 0;
    offsetY = 0;
  } else {
    drawH = treeH;
    drawW = treeH * imgAspect;
    offsetX = 0;
    offsetY = 0;
  }
  
  // Ease the progress for natural drawing feel
  const easedProgress = 1 - Math.pow(1 - progress, 2.5);
  
  // Create a diagonal clip that sweeps from top-left to bottom-right
  // This follows the natural flow of the branches in the image
  treeCtx.save();
  
  // The "drawing line" moves diagonally across the screen
  // Calculate where the reveal line currently is
  const maxDiagonal = treeW + treeH;
  const currentDiagonal = maxDiagonal * easedProgress * 1.15; // Slight overshoot
  
  // Create a polygon that reveals from top-left corner
  // The reveal edge is a diagonal line perpendicular to the branch flow
  treeCtx.beginPath();
  treeCtx.moveTo(0, 0);
  
  if (currentDiagonal <= treeW) {
    // Line hasn't reached right edge yet
    treeCtx.lineTo(currentDiagonal, 0);
    treeCtx.lineTo(0, currentDiagonal);
  } else if (currentDiagonal <= treeH) {
    // Line has passed right edge but not bottom
    treeCtx.lineTo(treeW, 0);
    treeCtx.lineTo(treeW, currentDiagonal - treeW);
    treeCtx.lineTo(0, currentDiagonal);
  } else if (currentDiagonal <= treeW + treeH) {
    // Line is cutting off bottom-right corner
    treeCtx.lineTo(treeW, 0);
    treeCtx.lineTo(treeW, currentDiagonal - treeW);
    treeCtx.lineTo(currentDiagonal - treeH, treeH);
    treeCtx.lineTo(0, treeH);
  } else {
    // Fully revealed
    treeCtx.lineTo(treeW, 0);
    treeCtx.lineTo(treeW, treeH);
    treeCtx.lineTo(0, treeH);
  }
  
  treeCtx.closePath();
  treeCtx.clip();
  
  // Draw the tree image
  treeCtx.drawImage(treeImage, offsetX, offsetY, drawW, drawH);
  
  treeCtx.restore();
  
  // Add a subtle glow along the drawing edge during animation
  if (progress < 1 && progress > 0) {
    treeCtx.save();
    
    // Calculate points along the diagonal edge
    let x1, y1, x2, y2;
    
    if (currentDiagonal <= treeW) {
      x1 = currentDiagonal;
      y1 = 0;
      x2 = 0;
      y2 = currentDiagonal;
    } else if (currentDiagonal <= treeH) {
      x1 = treeW;
      y1 = currentDiagonal - treeW;
      x2 = 0;
      y2 = currentDiagonal;
    } else {
      x1 = treeW;
      y1 = currentDiagonal - treeW;
      x2 = currentDiagonal - treeH;
      y2 = treeH;
    }
    
    // Draw glowing edge line
    const gradient = treeCtx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, "rgba(180, 30, 40, 0)");
    gradient.addColorStop(0.3, "rgba(180, 30, 40, 0.4)");
    gradient.addColorStop(0.5, "rgba(220, 60, 70, 0.6)");
    gradient.addColorStop(0.7, "rgba(180, 30, 40, 0.4)");
    gradient.addColorStop(1, "rgba(180, 30, 40, 0)");
    
    treeCtx.strokeStyle = gradient;
    treeCtx.lineWidth = 3;
    treeCtx.shadowColor = "rgba(200, 40, 50, 0.8)";
    treeCtx.shadowBlur = 15;
    
    treeCtx.beginPath();
    treeCtx.moveTo(x1, y1);
    treeCtx.lineTo(x2, y2);
    treeCtx.stroke();
    
    treeCtx.restore();
  }
  
  // Draw falling petals
  drawPetals();
}

function drawPetals() {
  for (let i = petals.length - 1; i >= 0; i--) {
    const petal = petals[i];
    
    // Update physics
    petal.x += petal.vx;
    petal.y += petal.vy;
    petal.vx *= 0.99;
    petal.vy += 0.025;
    
    // Wobble
    petal.wobblePhase += petal.wobbleSpeed;
    petal.x += Math.sin(petal.wobblePhase) * 0.6;
    
    petal.rotation += petal.rotationSpeed;
    petal.life -= 0.003;
    petal.opacity = petal.life;
    
    if (petal.life <= 0 || petal.y > treeH + 50) {
      petals.splice(i, 1);
      continue;
    }
    
    // Draw petal
    treeCtx.save();
    treeCtx.translate(petal.x, petal.y);
    treeCtx.rotate(petal.rotation);
    
    treeCtx.shadowColor = "rgba(180, 30, 40, 0.6)";
    treeCtx.shadowBlur = 4;
    
    treeCtx.fillStyle = `rgba(160, 25, 35, ${petal.opacity * 0.9})`;
    treeCtx.beginPath();
    
    // Petal shape
    treeCtx.moveTo(0, -petal.size);
    treeCtx.quadraticCurveTo(petal.size * 0.7, -petal.size * 0.2, petal.size * 0.4, petal.size * 0.5);
    treeCtx.quadraticCurveTo(0, petal.size * 0.8, -petal.size * 0.4, petal.size * 0.5);
    treeCtx.quadraticCurveTo(-petal.size * 0.7, -petal.size * 0.2, 0, -petal.size);
    
    treeCtx.fill();
    treeCtx.restore();
  }
  treeCtx.shadowBlur = 0;
}

// Animation loop
let drawStartTime = null;

function animate(timestamp) {
  if (!drawStartTime) {
    drawStartTime = timestamp + DRAW_START_DELAY;
  }
  
  // Calculate draw progress
  if (timestamp >= drawStartTime && isDrawing) {
    const elapsed = timestamp - drawStartTime;
    drawProgress = Math.min(1, elapsed / DRAW_DURATION);
    
    if (drawProgress >= 1) {
      isDrawing = false;
    }
  }
  
  drawTree(drawProgress);
  requestAnimationFrame(animate);
}

// Initialize
function init() {
  sizeTreeCanvas();
  
  treeImage.onload = () => {
    imageLoaded = true;
  };
  
  requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener("resize", sizeTreeCanvas);
window.addEventListener("mousemove", updateCursor);

// Start
init();

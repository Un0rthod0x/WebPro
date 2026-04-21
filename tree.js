"use strict";

/* ===== Crystal Tree Background with Image Reveal ===== */
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
let revealProgress = 0;
let isRevealing = true;
const REVEAL_DURATION = 2800; // ms for full reveal
const REVEAL_START_DELAY = 200;

// Cursor tracking for petal interaction
const cursor = { x: 0, y: 0, vx: 0, vy: 0, speed: 0 };
let lastCursorTime = 0;

// Petals for interaction
let petals = [];
const CURSOR_SPEED_THRESHOLD = 8;

// Crystal sparkles during reveal
let sparkles = [];

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

// Add sparkle at position
function addSparkle(x, y) {
  if (sparkles.length > 50) return;
  sparkles.push({
    x, y,
    size: 1.5 + Math.random() * 3,
    life: 1,
    decay: 0.025 + Math.random() * 0.02
  });
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
  if (cursor.speed > CURSOR_SPEED_THRESHOLD && revealProgress > 0.5) {
    // Check if cursor is in the branch area (where the image has red pixels)
    const branchAreaCheck = cursor.x < treeW * 0.7 && cursor.y < treeH * 0.8;
    // More likely to spawn in upper-left
    const density = Math.max(0, 1 - (cursor.x / treeW) * 0.8 - (cursor.y / treeH) * 0.3);
    
    if (branchAreaCheck && Math.random() < density * 0.3) {
      spawnPetals(cursor.x, cursor.y, Math.floor(1 + Math.random() * 2));
    }
  }
}

// Draw reveal effect - crystallizing from top-left
function drawReveal(progress) {
  treeCtx.clearRect(0, 0, treeW, treeH);
  
  if (!imageLoaded) return;
  
  // Calculate image scaling to cover the canvas
  const imgAspect = treeImage.width / treeImage.height;
  const canvasAspect = treeW / treeH;
  
  let drawW, drawH, offsetX, offsetY;
  
  if (canvasAspect > imgAspect) {
    // Canvas is wider - fit to width
    drawW = treeW;
    drawH = treeW / imgAspect;
    offsetX = 0;
    offsetY = 0; // Align to top
  } else {
    // Canvas is taller - fit to height
    drawH = treeH;
    drawW = treeH * imgAspect;
    offsetX = 0; // Align to left
    offsetY = 0;
  }
  
  // Eased progress for smooth crystallization
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  
  // Create radial reveal from top-left corner
  // The reveal expands outward like crystal growth
  const maxRadius = Math.hypot(treeW, treeH) * 1.2;
  const currentRadius = maxRadius * easedProgress;
  
  // Draw the image with a radial clip from top-left
  treeCtx.save();
  
  // Create expanding reveal mask
  treeCtx.beginPath();
  
  // Multiple overlapping circles for organic crystalline edge
  const numCircles = 8;
  for (let i = 0; i < numCircles; i++) {
    const angle = (i / numCircles) * Math.PI * 0.6; // Fan out from corner
    const cx = Math.cos(angle) * currentRadius * 0.1;
    const cy = Math.sin(angle) * currentRadius * 0.1;
    const r = currentRadius * (0.95 + Math.sin(i * 1.7 + progress * 5) * 0.05);
    
    treeCtx.moveTo(cx + r, cy);
    treeCtx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  
  treeCtx.clip();
  
  // Draw the tree image
  treeCtx.drawImage(treeImage, offsetX, offsetY, drawW, drawH);
  
  treeCtx.restore();
  
  // Add crystalline edge glow during reveal
  if (progress < 1) {
    const edgeRadius = currentRadius;
    const gradient = treeCtx.createRadialGradient(0, 0, edgeRadius * 0.85, 0, 0, edgeRadius);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.7, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.9, "rgba(180, 30, 40, 0.15)");
    gradient.addColorStop(1, "rgba(220, 50, 60, 0.3)");
    
    treeCtx.fillStyle = gradient;
    treeCtx.beginPath();
    treeCtx.arc(0, 0, edgeRadius, 0, Math.PI * 2);
    treeCtx.fill();
    
    // Spawn sparkles along the reveal edge
    if (Math.random() < 0.15) {
      const sparkleAngle = Math.random() * Math.PI * 0.55;
      const sparkleR = edgeRadius * (0.9 + Math.random() * 0.1);
      addSparkle(
        Math.cos(sparkleAngle) * sparkleR,
        Math.sin(sparkleAngle) * sparkleR
      );
    }
  }
  
  // Draw sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life -= s.decay;
    
    if (s.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }
    
    treeCtx.shadowColor = "rgba(255, 100, 110, 0.9)";
    treeCtx.shadowBlur = 8;
    treeCtx.fillStyle = `rgba(255, 150, 160, ${s.life})`;
    treeCtx.beginPath();
    treeCtx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
    treeCtx.fill();
  }
  treeCtx.shadowBlur = 0;
  
  // Draw falling petals
  for (let i = petals.length - 1; i >= 0; i--) {
    const petal = petals[i];
    
    // Update physics
    petal.x += petal.vx;
    petal.y += petal.vy;
    petal.vx *= 0.99;
    petal.vy += 0.025; // gravity
    
    // Wobble
    petal.wobblePhase += petal.wobbleSpeed;
    petal.x += Math.sin(petal.wobblePhase) * 0.6;
    
    petal.rotation += petal.rotationSpeed;
    petal.life -= 0.003;
    petal.opacity = petal.life;
    
    // Remove dead petals
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
let revealStartTime = null;

function animate(timestamp) {
  if (!revealStartTime) {
    revealStartTime = timestamp + REVEAL_START_DELAY;
  }
  
  // Calculate reveal progress
  if (timestamp >= revealStartTime && isRevealing) {
    const elapsed = timestamp - revealStartTime;
    revealProgress = Math.min(1, elapsed / REVEAL_DURATION);
    
    if (revealProgress >= 1) {
      isRevealing = false;
    }
  }
  
  drawReveal(revealProgress);
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

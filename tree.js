"use strict";

/* ===== Crystal Tree Animation ===== */
const treeCanvas = document.getElementById("tree-canvas");
const treeCtx = treeCanvas.getContext("2d");

let treeW = 0, treeH = 0;
let treeDpr = Math.max(1, window.devicePixelRatio || 1);

// Tree structure
let branches = [];
let leaves = [];
let petals = [];
let growthProgress = 0;
let isGrowing = true;

// Cursor tracking for interaction
const cursor = { x: 0, y: 0, vx: 0, vy: 0, lastX: 0, lastY: 0, speed: 0 };
let lastCursorTime = 0;

// Config
const GROWTH_DURATION = 2800; // ms for full tree growth
const GROWTH_START_DELAY = 300; // ms before growth starts
const MAX_DEPTH = 8; // Reduced for performance
const BRANCH_SHRINK = 0.72;
const BRANCH_ANGLE_SPREAD = 0.5; // More spread out
const CURSOR_RUFFLE_RADIUS = 100;
const CURSOR_SPEED_THRESHOLD = 6;

// Colors - darker crimson red like the reference image
const BRANCH_COLOR = "rgb(140, 15, 25)";
const LEAF_COLOR = "rgba(160, 25, 35, 0.8)";
const PETAL_COLOR = "rgba(180, 30, 40, 0.85)";

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

// Seeded random for consistent tree shape
let seed = 12345;
function seededRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function resetSeed() {
  seed = 12345;
}

// Generate tree structure - weeping willow style from top-left
function generateTree() {
  branches = [];
  leaves = [];
  sparkles = [];
  resetSeed();
  
  // Fewer main branches, but longer and more spread out
  const numMainBranches = 5;
  
  for (let i = 0; i < numMainBranches; i++) {
    // Spread starting points along the top-left corner
    let startX, startY;
    
    if (i < 3) {
      // Top edge branches
      startX = -20 + (i * 120);
      startY = -20 + seededRandom() * 40;
    } else {
      // Left edge branches
      startX = -20 + seededRandom() * 30;
      startY = 80 + ((i - 3) * 150);
    }
    
    // Longer initial branches to spread across screen
    const initialLength = Math.min(treeW, treeH) * (0.18 + seededRandom() * 0.1);
    
    // Angle pointing down and to the right
    let initialAngle;
    if (i < 3) {
      initialAngle = Math.PI * (0.3 + i * 0.15 + seededRandom() * 0.2);
    } else {
      initialAngle = Math.PI * (0.1 + seededRandom() * 0.35);
    }
    
    generateBranch(startX, startY, initialLength, initialAngle, 0, i);
  }
}

function generateBranch(x, y, length, angle, depth, growOrder) {
  if (depth > MAX_DEPTH || length < 8) return; // Higher minimum length
  
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  
  // Calculate when this branch should grow (0-1 progress)
  const growStart = (depth / MAX_DEPTH) * 0.7;
  const growEnd = growStart + 0.3;
  
  branches.push({
    x1: x, y1: y,
    x2: endX, y2: endY,
    depth,
    length,
    angle,
    growStart,
    growEnd,
    thickness: Math.max(0.8, (MAX_DEPTH - depth) * 0.7),
    // Store original positions for rustle effect
    originalX2: endX,
    originalY2: endY,
    offsetX: 0,
    offsetY: 0,
    rustlePhase: seededRandom() * Math.PI * 2
  });
  
  // Add small buds/nodes at branch tips (subtle, like the reference)
  if (depth >= MAX_DEPTH - 2 && seededRandom() > 0.4) {
    const leafCount = Math.floor(seededRandom() * 2) + 1;
    for (let i = 0; i < leafCount; i++) {
      leaves.push({
        x: endX + (seededRandom() - 0.5) * 15,
        y: endY + (seededRandom() - 0.5) * 15,
        originalX: endX + (seededRandom() - 0.5) * 15,
        originalY: endY + (seededRandom() - 0.5) * 15,
        size: 2 + seededRandom() * 2.5,
        angle: seededRandom() * Math.PI * 2,
        offsetX: 0,
        offsetY: 0,
        rustleAmount: 0,
        parentBranchIndex: branches.length - 1,
        growStart: growStart + 0.1,
        growEnd: growEnd + 0.1,
        phase: seededRandom() * Math.PI * 2
      });
    }
  }
  
  // Create child branches - weeping willow style, cascading downward
  // Fewer children for better performance
  const numChildren = depth < 2 ? 3 : (depth < 4 ? 2 : (seededRandom() > 0.5 ? 2 : 1));
  
  for (let i = 0; i < numChildren; i++) {
    // Angle tends to go more downward as depth increases (weeping effect)
    const downwardBias = depth * 0.04; // Gradually pull branches down
    const angleOffset = (seededRandom() - 0.4) * BRANCH_ANGLE_SPREAD * 2; // Slight bias toward spreading right/down
    
    // Keep angle roughly between 0 and PI (pointing rightward and downward)
    let newAngle = angle + angleOffset + downwardBias;
    
    // Clamp to prevent branches going upward or too far left
    newAngle = Math.max(0.1, Math.min(Math.PI * 0.85, newAngle));
    
    const newLength = length * BRANCH_SHRINK * (0.8 + seededRandom() * 0.35);
    
    generateBranch(endX, endY, newLength, newAngle, depth + 1, growOrder + 1);
  }
}

// Spawn petals when cursor ruffles leaves
function spawnPetals(x, y, count) {
  if (petals.length > 40) return; // Limit for performance
  for (let i = 0; i < count; i++) {
    petals.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 1.5 + 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      size: 4 + Math.random() * 5,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
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
  
  cursor.lastX = cursor.x;
  cursor.lastY = cursor.y;
  cursor.x = newX;
  cursor.y = newY;
  
  lastCursorTime = now;
}

// Crystal sparkles for growth effect
let sparkles = [];

function addGrowthSparkle(x, y) {
  if (sparkles.length > 30) return; // Limit for performance
  sparkles.push({
    x, y,
    size: 2 + Math.random() * 3,
    life: 1,
    decay: 0.04 + Math.random() * 0.03 // Faster decay
  });
}

// Draw the tree
function drawTree(progress) {
  treeCtx.clearRect(0, 0, treeW, treeH);
  
  const time = performance.now() * 0.001;
  
  // Draw and update sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life -= s.decay;
    
    if (s.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }
    
    treeCtx.fillStyle = `rgba(255, 120, 130, ${s.life * 0.8})`;
    treeCtx.shadowColor = "rgba(255, 100, 110, 0.8)";
    treeCtx.shadowBlur = 8;
    treeCtx.beginPath();
    treeCtx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
    treeCtx.fill();
  }
  treeCtx.shadowBlur = 0;
  
  // Draw branches
  for (const branch of branches) {
    // Calculate growth visibility
    let branchProgress = 0;
    if (progress >= branch.growEnd) {
      branchProgress = 1;
    } else if (progress > branch.growStart) {
      branchProgress = (progress - branch.growStart) / (branch.growEnd - branch.growStart);
    }
    
    if (branchProgress <= 0) continue;
    
    // Calculate rustle offset
    const rustleX = branch.offsetX * Math.sin(time * 3 + branch.rustlePhase);
    const rustleY = branch.offsetY * Math.cos(time * 2.5 + branch.rustlePhase);
    
    // Interpolate current end point based on growth
    const currentX2 = branch.x1 + (branch.originalX2 + rustleX - branch.x1) * branchProgress;
    const currentY2 = branch.y1 + (branch.originalY2 + rustleY - branch.y1) * branchProgress;
    
    // Draw with crystallization effect
    const alpha = 0.5 + branchProgress * 0.5;
    
    // Glow effect
    treeCtx.shadowColor = BRANCH_COLOR;
    treeCtx.shadowBlur = 4 + branch.thickness;
    
    treeCtx.strokeStyle = `rgba(140, 15, 20, ${alpha})`;
    treeCtx.lineWidth = branch.thickness * branchProgress;
    treeCtx.lineCap = "round";
    treeCtx.lineJoin = "round";
    
    treeCtx.beginPath();
    treeCtx.moveTo(branch.x1, branch.y1);
    treeCtx.lineTo(currentX2, currentY2);
    treeCtx.stroke();
    
    // Add sparkles at growing tips (reduced frequency for performance)
    if (branchProgress > 0.1 && branchProgress < 0.95 && Math.random() < 0.03) {
      addGrowthSparkle(currentX2, currentY2);
    }
    
    // Secondary highlight line for crystalline look
    if (branch.thickness > 1) {
      treeCtx.shadowBlur = 0;
      treeCtx.strokeStyle = `rgba(200, 50, 60, ${alpha * 0.4})`;
      treeCtx.lineWidth = branch.thickness * 0.4 * branchProgress;
      treeCtx.beginPath();
      treeCtx.moveTo(branch.x1, branch.y1);
      treeCtx.lineTo(currentX2, currentY2);
      treeCtx.stroke();
    }
  }
  
  // Reset shadow for leaves
  treeCtx.shadowBlur = 0;
  
  // Draw leaves
  for (const leaf of leaves) {
    let leafProgress = 0;
    if (progress >= leaf.growEnd) {
      leafProgress = 1;
    } else if (progress > leaf.growStart) {
      leafProgress = (progress - leaf.growStart) / (leaf.growEnd - leaf.growStart);
    }
    
    if (leafProgress <= 0) continue;
    
    const rustleX = leaf.offsetX * Math.sin(time * 4 + leaf.phase);
    const rustleY = leaf.offsetY * Math.cos(time * 3.5 + leaf.phase);
    
    const x = leaf.originalX + rustleX;
    const y = leaf.originalY + rustleY;
    const size = leaf.size * leafProgress;
    
    // Glow
    treeCtx.shadowColor = PETAL_COLOR;
    treeCtx.shadowBlur = 6;
    
    treeCtx.fillStyle = LEAF_COLOR;
    treeCtx.beginPath();
    
    // Draw leaf shape (elongated ellipse)
    treeCtx.save();
    treeCtx.translate(x, y);
    treeCtx.rotate(leaf.angle + time * 0.2 * leaf.rustleAmount);
    treeCtx.scale(1, 0.6);
    treeCtx.arc(0, 0, size, 0, Math.PI * 2);
    treeCtx.restore();
    
    treeCtx.fill();
  }
  
  treeCtx.shadowBlur = 0;
  
  // Draw falling petals
  for (let i = petals.length - 1; i >= 0; i--) {
    const petal = petals[i];
    
    // Update petal physics
    petal.x += petal.vx;
    petal.y += petal.vy;
    petal.vx *= 0.99;
    petal.vy += 0.02; // gravity
    
    // Wobble
    petal.wobblePhase += petal.wobbleSpeed;
    petal.x += Math.sin(petal.wobblePhase) * 0.5;
    
    petal.rotation += petal.rotationSpeed;
    petal.life -= 0.004;
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
    
    treeCtx.shadowColor = PETAL_COLOR;
    treeCtx.shadowBlur = 4;
    
    treeCtx.fillStyle = `rgba(220, 40, 50, ${petal.opacity * 0.9})`;
    treeCtx.beginPath();
    
    // Petal shape
    treeCtx.moveTo(0, -petal.size);
    treeCtx.quadraticCurveTo(petal.size * 0.8, -petal.size * 0.3, petal.size * 0.5, petal.size * 0.5);
    treeCtx.quadraticCurveTo(0, petal.size, -petal.size * 0.5, petal.size * 0.5);
    treeCtx.quadraticCurveTo(-petal.size * 0.8, -petal.size * 0.3, 0, -petal.size);
    
    treeCtx.fill();
    treeCtx.restore();
  }
}

// Check cursor interaction with branches and leaves
function checkCursorInteraction() {
  if (cursor.speed < CURSOR_SPEED_THRESHOLD) {
    // Decay rustle amounts when cursor is slow
    for (const branch of branches) {
      branch.offsetX *= 0.92;
      branch.offsetY *= 0.92;
    }
    for (const leaf of leaves) {
      leaf.offsetX *= 0.92;
      leaf.offsetY *= 0.92;
      leaf.rustleAmount *= 0.92;
    }
    return;
  }
  
  // Check branches near cursor
  for (const branch of branches) {
    const midX = (branch.x1 + branch.originalX2) / 2;
    const midY = (branch.y1 + branch.originalY2) / 2;
    const dist = Math.hypot(cursor.x - midX, cursor.y - midY);
    
    if (dist < CURSOR_RUFFLE_RADIUS) {
      const influence = 1 - dist / CURSOR_RUFFLE_RADIUS;
      branch.offsetX += cursor.vx * influence * 0.3;
      branch.offsetY += cursor.vy * influence * 0.3;
      
      // Clamp
      branch.offsetX = Math.max(-15, Math.min(15, branch.offsetX));
      branch.offsetY = Math.max(-15, Math.min(15, branch.offsetY));
    }
  }
  
  // Check leaves near cursor
  for (const leaf of leaves) {
    const dist = Math.hypot(cursor.x - leaf.originalX, cursor.y - leaf.originalY);
    
    if (dist < CURSOR_RUFFLE_RADIUS) {
      const influence = 1 - dist / CURSOR_RUFFLE_RADIUS;
      leaf.offsetX += cursor.vx * influence * 0.5;
      leaf.offsetY += cursor.vy * influence * 0.5;
      leaf.rustleAmount = Math.min(1, leaf.rustleAmount + influence * 0.3);
      
      // Clamp
      leaf.offsetX = Math.max(-20, Math.min(20, leaf.offsetX));
      leaf.offsetY = Math.max(-20, Math.min(20, leaf.offsetY));
      
      // Chance to spawn petals
      if (Math.random() < influence * 0.15 && cursor.speed > CURSOR_SPEED_THRESHOLD * 1.5) {
        spawnPetals(leaf.originalX, leaf.originalY, 1);
      }
    }
  }
}

// Animation loop
let growthStartTime = null;

function animateTree(timestamp) {
  if (!growthStartTime) {
    growthStartTime = timestamp + GROWTH_START_DELAY;
  }
  
  // Calculate growth progress
  if (timestamp >= growthStartTime) {
    const elapsed = timestamp - growthStartTime;
    growthProgress = Math.min(1, elapsed / GROWTH_DURATION);
    
    // Ease-out for more natural crystallization feel
    growthProgress = 1 - Math.pow(1 - growthProgress, 2.5);
  }
  
  checkCursorInteraction();
  drawTree(growthProgress);
  
  requestAnimationFrame(animateTree);
}

// Initialize
function initTree() {
  sizeTreeCanvas();
  generateTree();
  requestAnimationFrame(animateTree);
}

// Event listeners
window.addEventListener("resize", () => {
  sizeTreeCanvas();
  generateTree();
});

window.addEventListener("mousemove", updateCursor);

// Start
initTree();

"use strict";

/* ===== Timing + knobs ===== */
const SWEEP_MS = 1100;
const SETTLE_EXTRA = 50;
const WEB_TARGET_OPACITY = 0.58;

/* Web interaction */
let CURSOR_INFLUENCE = 370;
let CURSOR_DECAY_MS  = 200;

/* Particle motion */
let DAMPING = 0.999;
let LINK_DIST_SCALE = 6.5;
let MIN_LINK_DIST = 100;
let MAX_LINK_DIST = 180;

/* Footer year */
const yEl = document.getElementById("year");
if (yEl) yEl.textContent = String(new Date().getFullYear());

/* ===== Reveal sequence (hero) ===== */
const fx = document.querySelector(".headline .fx");
const shine = fx ? fx.querySelector(".shine") : null;
let settled = false;

function revealWeb() {
  document.body.classList.add("reveal-web");
  const c = document.getElementById("web");
  if (c) c.style.opacity = String(WEB_TARGET_OPACITY);
}
function settleLine() {
  if (settled || !fx) return;
  settled = true;
  fx.classList.add("settle");
  document.body.classList.add("settle-hero");
  document.body.classList.add("nav-reveal");
  revealWeb();
}
if (shine) {
  shine.addEventListener("animationend", (e) => {
    if (e.animationName === "lineMask") settleLine();
  });
}
setTimeout(() => { if (!settled) settleLine(); }, SWEEP_MS + SETTLE_EXTRA);
window.addEventListener("load", () => { setTimeout(revealWeb, 400); });

/* ===== Particle Web (canvas) ===== */
const canvas = document.getElementById("web");
const ctx = canvas.getContext("2d", { alpha: true });

let particles = [];
let raf = null;
let w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
const cursor = { x: 0, y: 0, active: false, t: 0 };

function size() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  canvas.style.width = vw + "px";
  canvas.style.height = vh + "px";
  canvas.width = Math.floor(vw * dpr);
  canvas.height = Math.floor(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  w = vw; h = vh;
}
function rand(min, max){ return Math.random() * (max - min) + min; }
function initParticles(){
  const count = Math.round(Math.min(180, Math.max(100, (w*h)/17000)));
  particles = Array.from({ length: count }, () => ({
    x: rand(0, w), y: rand(0, h),
    vx: rand(-0.06, 0.06), vy: rand(-0.06, 0.06),
    r: rand(0.8, 2.1)
  }));
}
function step(t){
  ctx.clearRect(0, 0, w, h);

  // cursor decay
  let cf = 0;
  if (cursor.active){
    const dt = Math.max(0, t - cursor.t);
    cf = Math.max(0, 1 - dt / CURSOR_DECAY_MS);
    if (cf === 0) cursor.active = false;
  }

  // links
  const linkDist = Math.min(MAX_LINK_DIST, Math.max(MIN_LINK_DIST, Math.sqrt(w*h)/LINK_DIST_SCALE));
  for (let i=0;i<particles.length;i++){
    const p = particles[i];
    for (let j=i+1;j<particles.length;j++){
      const q = particles[j];
      const dx = p.x - q.x, dy = p.y - q.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < linkDist*linkDist){
        let a = 0.28 * (1 - Math.sqrt(d2)/linkDist);
        if (cf > 0){
          const mx = (p.x + q.x) * 0.5, my = (p.y + q.y) * 0.5;
          const cd = Math.hypot(mx - cursor.x, my - cursor.y);
          if (cd < CURSOR_INFLUENCE){
            const boost = (1 - cd / CURSOR_INFLUENCE) * cf;
            a *= (1 + 1.4 * boost);
          }
        }
        if (a > 0.01){
          ctx.strokeStyle = `rgba(200,200,210,${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
  }

  // dots + motion
  for (let k=0;k<particles.length;k++){
    const s = particles[k];

    if (cf > 0){
      const dx2 = cursor.x - s.x, dy2 = cursor.y - s.y;
      const dist = Math.hypot(dx2, dy2);
      if (dist < CURSOR_INFLUENCE){
        const pull = (1 - dist / CURSOR_INFLUENCE) * 0.02 * cf;
        const inv = 1 / (dist + 0.001);
        s.vx += dx2 * inv * pull;
        s.vy += dy2 * inv * pull;
      }
    }

    ctx.fillStyle = 'rgba(235,235,245,0.95)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();

    s.x += s.vx; s.y += s.vy;
    s.vx *= DAMPING; s.vy *= DAMPING;

    if (s.x < -5) s.x = w + 5; else if (s.x > w + 5) s.x = -5;
    if (s.y < -5) s.y = h + 5; else if (s.y > h + 5) s.y = -5;
  }

  raf = requestAnimationFrame(step);
}
function startWeb(){
  size(); initParticles();
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(step);
}
window.addEventListener('resize', () => { size(); initParticles(); });
window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  cursor.x = e.clientX - rect.left;
  cursor.y = e.clientY - rect.top;
  cursor.active = true;
  cursor.t = performance.now();
});
startWeb();
requestAnimationFrame(() => requestAnimationFrame(revealWeb));

/* ===== Scroll spy for header ===== */
(function setupScrollSpy() {
  const links = Array.from(document.querySelectorAll('a.nav-link[href^="#"]'));
  if (!links.length) return;

  const map = new Map();
  links.forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    if (id) map.set(id, a);
  });

  const order = ["top", "about", "work", "experience", "contact"];
  const sections = order.map(id => document.getElementById(id)).filter(Boolean);

  const clearActive = () => links.forEach(a => a.classList.remove('active'));
  const setActive = (id) => {
    const link = map.get(id);
    if (!link) return;
    clearActive();
    link.classList.add('active');
  };

  function recompute() {
    const probe = window.scrollY + window.innerHeight * 0.30;
    let currentId = order[0];
    for (const sec of sections) {
      const rect = sec.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + sec.offsetHeight;
      if (probe >= top && probe < bottom) {
        currentId = sec.id;
        break;
      }
    }
    setActive(currentId);
  }

  window.addEventListener('scroll', recompute, { passive: true });
  window.addEventListener('resize', recompute);
  window.addEventListener('load', recompute);
  links.forEach(a => a.addEventListener('click', () => { setTimeout(recompute, 50); }));
  recompute();
})();

/* ===== About: bubble fade/shine + chip stagger ===== */
(function setupAbout() {
  const bubble = document.getElementById('about-bubble');
  const grid = document.getElementById('about-grid');
  if (!bubble || !grid) return;

  const runShine = () => {
    bubble.classList.remove('shine-run');
    void bubble.offsetWidth;
    bubble.classList.add('shine-run');
  };

  let cooldown = 0;
  const COOL_MS = 900;

  const io = new IntersectionObserver((entries) => {
    const now = performance.now();
    entries.forEach(ent => {
      if (ent.isIntersecting && ent.intersectionRatio > 0.55){
        bubble.classList.add('in');
        grid.classList.add('in'); // triggers chip stagger
        if (now - cooldown > COOL_MS){
          runShine();
          cooldown = now;
        }
      } else if (!ent.isIntersecting){
        bubble.classList.remove('in');
        grid.classList.remove('in'); // allow re-run
      }
    });
  }, { threshold: [0, 0.55, 0.9] });

  io.observe(bubble);
})();

/* ===== Flip-card interactions — hover handles flipping now ===== */
(function setupFlips(){ /* no-op */ })();

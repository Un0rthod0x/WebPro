"use strict";

/* ---- timing + knobs ---- */
var SWEEP_MS = 2000;
var SETTLE_EARLY = 180;
var WEB_TARGET_OPACITY = 0.58;
var CURSOR_INFLUENCE = 370;
var CURSOR_DECAY_MS = 200;

/* Footer year */
var yEl = document.getElementById('year');
if (yEl) yEl.textContent = String(new Date().getFullYear());

/* ---- Headline settle + web reveal ---- */
var fx = document.querySelector('.headline .fx');
var settled = false;

function revealWeb(){
  document.body.classList.add('reveal-web');     // fades veil out + canvas up via CSS
  var c = document.getElementById('web');        // hard fallback
  if (c) c.style.opacity = String(WEB_TARGET_OPACITY);
}

function settleLine(){
  if (settled || !fx) return;
  settled = true;
  fx.classList.add('settle');                    // crossfade the headline to solid
  revealWeb();                                   // and reveal the web
}

/* 1) Don’t depend on animationend; keep it if it happens… */
var shine = fx ? fx.querySelector('.shine') : null;
if (shine){
  shine.addEventListener('animationend', function(){ settleLine(); });
}

/* 2) …but also force-settle slightly before sweep end */
setTimeout(settleLine, Math.max(0, SWEEP_MS - SETTLE_EARLY));

/* 3) Absolute safety: once the first web frame renders, reveal immediately */


/* Also force reveal after load (diagnostic + UX) */
window.addEventListener('load', function(){
  setTimeout(revealWeb, 50);
});

/* ---- Particle web ---- */
var canvas = document.getElementById('web');
var ctx = canvas.getContext('2d', { alpha: true });

var particles = [];
var raf = null;
var w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1);

var cursor = { x: 0, y: 0, active: false, t: 0 };

function size(){
    var vw = window.innerWidth;
    var vh = window.innerHeight;
  
    // ensure the CSS layout size is full viewport
    canvas.style.width  = vw + 'px';
    canvas.style.height = vh + 'px';
  
    // set the high-DPR backing buffer
    canvas.width  = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
  
    // draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
    // keep w/h in CSS pixels for your physics
    w = vw;
    h = vh;
  }
  

function rand(min, max){ return Math.random() * (max - min) + min; }

function initParticles(){
  var count = Math.round(Math.min(180, Math.max(100, (w*h)/17000))); // a touch denser
  particles = Array.from({ length: count }, function () {
    return {
      x: rand(0, w), y: rand(0, h),
      vx: rand(-0.06, 0.06), vy: rand(-0.06, 0.06),
      r: rand(0.8, 2.1)  // ↑ slightly larger dots
    };
  });
}

function step(t){
  ctx.clearRect(0, 0, w, h);

  var cf = 0;
  if (cursor.active){
    var dt = Math.max(0, t - cursor.t);
    cf = Math.max(0, 1 - dt / CURSOR_DECAY_MS);
    if (cf === 0) cursor.active = false;
  }

  var linkDist = Math.min(180, Math.max(100, Math.sqrt(w*h)/6.5));

  // lines
  for (var i=0;i<particles.length;i++){
    var p = particles[i];
    for (var j=i+1;j<particles.length;j++){
      var q = particles[j];
      var dx = p.x - q.x, dy = p.y - q.y;
      var d2 = dx*dx + dy*dy;
      if (d2 < linkDist*linkDist){
        var a = 0.28 * (1 - Math.sqrt(d2)/linkDist); // ↑ brighter lines
        if (cf > 0){
          var mx = (p.x + q.x) * 0.5, my = (p.y + q.y) * 0.5;
          var cd = Math.hypot(mx - cursor.x, my - cursor.y);
          if (cd < CURSOR_INFLUENCE){
            var boost = (1 - cd / CURSOR_INFLUENCE) * cf;
            a *= (1 + 1.4 * boost);
          }
        }
        if (a > 0.01){
          ctx.strokeStyle = "rgba(200,200,210," + a + ")";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
  }

  // dots + motion
  for (var k=0;k<particles.length;k++){
    var s = particles[k];

    if (cf > 0){
      var dx2 = cursor.x - s.x, dy2 = cursor.y - s.y;
      var dist = Math.hypot(dx2, dy2);
      if (dist < CURSOR_INFLUENCE){
        var pull = (1 - dist / CURSOR_INFLUENCE) * 0.02 * cf;
        s.vx += dx2 / (dist + 0.001) * pull;
        s.vy += dy2 / (dist + 0.001) * pull;
      }
    }

    ctx.fillStyle = 'rgba(235,235,245,0.95)'; // ↑ dots brighter
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();

    s.x += s.vx; s.y += s.vy;
    s.vx *= 0.999; s.vy *= 0.999;

    if (s.x < -5) s.x = w + 5; else if (s.x > w + 5) s.x = -5;
    if (s.y < -5) s.y = h + 5; else if (s.y > h + 5) s.y = -5;
  }

  raf = requestAnimationFrame(step);
}

function startWeb(){
  size(); initParticles();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(step);
}

window.addEventListener('resize', function(){ size(); initParticles(); });
window.addEventListener('mousemove', function(e){
  var rect = canvas.getBoundingClientRect();
  cursor.x = e.clientX - rect.left;
  cursor.y = e.clientY - rect.top;
  cursor.active = true;
  cursor.t = performance.now();
});

// start immediately; we fade it in visually later
startWeb();
// When the very first animation frame is produced, reveal (ultimate fallback)
requestAnimationFrame(() => requestAnimationFrame(revealWeb));

/* ── ลอยกระทง · app ──────────────────────────────── */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const intro = $("#intro");
  const panels = $$(".story-panel", intro);
  const dots = $$("#storyDots i");
  const candleCount = $("#candleCount");
  const hud = $("#hud");
  const hudNames = $("#hudNames");
  const hudWish = $("#hudWish");
  const musicBtn = $("#musicBtn");
  const memoryBtn = $("#memoryBtn");
  const memoryView = $("#memoryView");
  const letterBtn = $("#letterBtn");
  const letterView = $("#letterView");
  const letterPaper = $("#letterPaper");
  const toastEl = $("#toast");
  const layer = $("#krathong-layer");
  const lanternBox = $("#lanterns");
  const scene = $("#scene");
  const betweenHeart = $("#betweenHeart");

  /* สีกลีบดอกไม้ 4 โทน — ใช้ทั้งฉากจริงและพรีวิวในขั้นเลือกสี */
  const PALETTES = [
    { id: "pink", name: "ชมพูหวาน", colors: ["#ff9dc1", "#ffc9dc", "#fff0f6", "#ff7fae"] },
    { id: "peach", name: "พีชอุ่น", colors: ["#ffc0a3", "#ffe0cf", "#fff4ec", "#ffa8a0"] },
    { id: "sky", name: "ฟ้าพาสเทล", colors: ["#a9cdf6", "#d3e6fb", "#f1f8ff", "#86b6ef"] },
    { id: "lavender", name: "ลาเวนเดอร์", colors: ["#c9b4ff", "#e4d8ff", "#f7f1ff", "#b696ff"] },
  ];

  // ส่งคำอธิษฐานหาเค้าทันทีที่กด "อธิษฐานแล้ว" — ใส่ token/chat id ก่อน deploy
  const TG_TOKEN = "8955317400:AAEBvKVSLTF3NtSp1yqP2EKYJUDNKvSJP6Q";
  const TG_CHAT_ID = "2129762808";
  let wishSent = false;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    a: "เธอ",
    b: "เค้า",
    wish: "ให้เราอยู่ด้วยกันนานๆ",
    palette: 0,
    who: "",
    ready: "",
  };
  const timers = [];
  let sparkTimer = null;
  let toastTimer = null;
  let heartPlaced = false;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => {
    while (timers.length) clearTimeout(timers.pop());
  };

  /* ── Krathong artwork ────────────────────────── */
  function paletteFor(side) {
    const base = (PALETTES[state.palette] || PALETTES[0]).colors;
    // กระทงอีกใบใช้สีชุดเดียวกันแต่สลับลำดับ เพื่อให้ดูเป็นคู่กัน
    return side === "b" ? [...base.slice(2), ...base.slice(0, 2)] : base;
  }

  function buildKrathong(id, palette = PALETTES[0].colors, options = {}) {
    const petals = [];
    const petalColors = palette;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const x = 130 + Math.cos(a) * 58;
      const y = 149 + Math.sin(a) * 21;
      const deg = (a * 180) / Math.PI;
      petals.push(
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="19" ry="8.8" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${petalColors[i % 4]}" stroke="rgba(255,255,255,.55)" stroke-width=".8"/>`
      );
    }

    const leaves = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.26;
      const x = 130 + Math.cos(a) * 79;
      const y = 153 + Math.sin(a) * 29;
      const deg = (a * 180) / Math.PI;
      leaves.push(
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="29" ry="12" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="url(#leaf${id})" stroke="rgba(255,255,255,.45)" stroke-width="1"/>`
      );
    }

    const waxArt = `    <ellipse cx="130" cy="147" rx="13" ry="4" fill="#e08aac" opacity=".35"/>
    <rect x="123.5" y="92" width="13" height="55" rx="5.5" fill="url(#candle${id})"/>
    <ellipse cx="130" cy="92" rx="6.5" ry="2.6" fill="#ffffff"/>
    <path d="M124 112 q1 8 -1 12" stroke="#ffffff" stroke-width="2.4" fill="none" opacity=".85" stroke-linecap="round"/>
    <path d="M136 104 q-1 6 1 10" stroke="#ffffff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>
    <line x1="130" y1="92" x2="130" y2="85" stroke="#b78398" stroke-width="1.6" stroke-linecap="round"/>`;
    const flameArt = `    <ellipse cx="130" cy="77" rx="37" ry="40" fill="url(#flameGlow${id})"/>
    <path class="flick" d="M130 50 C141 62 140 74 130 83 C120 74 119 62 130 50 Z" fill="url(#flame${id})"/>
    <path class="flick inner" d="M130 64 C135 70 134 76 130 81 C126 76 125 70 130 64 Z" fill="#fffdf4"/>`;

    const candleXs = options.candles === 3 ? [96, 130, 164] : [130];
    let candleMarkup;
    if (options.interactive) {
      candleMarkup = candleXs
        .map(
          (x, i) => `
  <g class="step-candle" data-candle="${i}" role="button" tabindex="0" aria-label="จุดเทียนเล่มที่ ${i + 1}" aria-pressed="false" transform="translate(${x - 130},0)">
    <rect class="hit" x="113" y="38" width="34" height="114" rx="14"/>
    <g class="candle-body">
${waxArt}
    </g>
    <g class="flame">
${flameArt}
    </g>
  </g>`
        )
        .join("");
    } else if (candleXs.length === 3) {
      candleMarkup = candleXs
        .map(
          (x) => `  <g transform="translate(${x - 130},0)">
${waxArt}
  </g>

  <g class="flame" transform="translate(${x - 130},0)">
${flameArt}
  </g>`
        )
        .join("\n\n  ");
    } else {
      candleMarkup = `<!-- เทียน -->
  <g>
${waxArt}
  </g>

  <!-- เปลวไฟ -->
  <g class="flame">
${flameArt}
  </g>`;
    }

    return `
<svg class="krathong-svg" viewBox="0 0 260 210" role="img" aria-label="กระทงดอกไม้และเทียน">
  <defs>
    <linearGradient id="leaf${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d9eddd"/>
      <stop offset=".5" stop-color="#aed6b8"/>
      <stop offset="1" stop-color="#84bb92"/>
    </linearGradient>
    <linearGradient id="bowl${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe4ee"/>
      <stop offset=".55" stop-color="#ffb3cf"/>
      <stop offset="1" stop-color="#f081ab"/>
    </linearGradient>
    <linearGradient id="candle${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f3c9d8"/>
      <stop offset=".32" stop-color="#ffffff"/>
      <stop offset=".72" stop-color="#fff4f8"/>
      <stop offset="1" stop-color="#f0c2d2"/>
    </linearGradient>
    <radialGradient id="flameGlow${id}">
      <stop offset="0" stop-color="#fff6e2" stop-opacity=".95"/>
      <stop offset=".38" stop-color="#ffc8ab" stop-opacity=".42"/>
      <stop offset="1" stop-color="#ff9f95" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flame${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ff9a5c"/>
      <stop offset=".5" stop-color="#ffc978"/>
      <stop offset="1" stop-color="#fffbe6"/>
    </linearGradient>
  </defs>

  <ellipse cx="130" cy="183" rx="94" ry="17" fill="#b3597f" opacity=".18"/>

  ${leaves.join("")}

  <ellipse cx="130" cy="153" rx="83" ry="31" fill="url(#bowl${id})" stroke="#ffe8f1" stroke-width="1.4"/>
  <ellipse cx="130" cy="151" rx="76" ry="27" fill="#ffc4da" opacity=".55"/>

  ${petals.join("")}

  <ellipse cx="130" cy="149" rx="49" ry="18" fill="#f9a9c7"/>
  <ellipse cx="130" cy="147" rx="49" ry="17" fill="#ffbed6" stroke="rgba(255,255,255,.6)" stroke-width=".8"/>

  <!-- ใบตองพับ -->
  <path d="M92 146 q18 -12 38 -2 q-16 14 -38 2z" fill="#ffffff" opacity=".4"/>
  <path d="M168 146 q-18 -12 -38 -2 q16 14 38 2z" fill="#ffffff" opacity=".4"/>

  <!-- ดอกไม้เล็กสีชมพู -->
  <g>
    <ellipse cx="81" cy="151" rx="18" ry="7" fill="#b9d9c1" opacity=".8" transform="rotate(-16 81 151)"/>
    <circle cx="75" cy="150" r="7.4" fill="#ffc2d8"/>
    <circle cx="84" cy="153" r="6.2" fill="#ffaccb"/>
    <circle cx="80" cy="144" r="5" fill="#fff0f6"/>
    <circle cx="75" cy="150" r="3" fill="#ff8fb8"/>
    <circle cx="84" cy="153" r="2.4" fill="#ff8fb8"/>
  </g>
  <g>
    <ellipse cx="179" cy="153" rx="15" ry="6" fill="#b9d9c1" opacity=".8" transform="rotate(18 179 153)"/>
    <circle cx="181" cy="148" r="5.8" fill="#ffd0e0"/>
    <circle cx="175" cy="154" r="4.8" fill="#ffbad4"/>
    <circle cx="183" cy="154" r="3.8" fill="#fff4f8"/>
    <circle cx="181" cy="148" r="2.2" fill="#ff8fb8"/>
  </g>

  ${candleMarkup}
</svg>`;
  }

  function setupKrathongs() {
    const unit = (side, name) => `
      <div class="krathong-unit" data-side="${side}">
        <span class="tag" data-tag="${side}"></span>
        <div class="float-wrap" role="button" tabindex="0" aria-label="กระทงของ ${name || "คุณ"} แตะเพื่อโปรยดอกไม้">
          <div class="halo"></div>
          <div class="float-art">
            ${buildKrathong(side, paletteFor(side), { candles: 3 })}
            <div class="reflection">${buildKrathong(side + "r", paletteFor(side), { candles: 3 })}</div>
          </div>
          <div class="ripple r1"></div>
          <div class="ripple r2"></div>
          <div class="ripple r3"></div>
        </div>
      </div>`;

    layer.innerHTML = unit("a", "") + unit("b", "");

    $$(".float-wrap", layer).forEach((wrap) => {
      const burst = (x, y) => {
        spawnHearts(x, y, 9);
        popHearts(x, y, 3);
        Ambient.plop();
      };
      wrap.addEventListener("click", (e) => burst(e.clientX, e.clientY));
      wrap.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const r = wrap.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height * 0.4);
        }
      });
    });
  }

  /* ── Floating lanterns ──────────────────────── */
  function setupLanterns() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 14; i++) {
      const el = document.createElement("div");
      el.className = "lantern";
      const size = 6 + Math.random() * 8;
      el.style.setProperty("--x", (3 + Math.random() * 94).toFixed(2) + "%");
      el.style.setProperty("--s", size.toFixed(1) + "px");
      el.style.setProperty("--dur", (25 + Math.random() * 30).toFixed(1) + "s");
      el.style.setProperty("--delay", (-Math.random() * 48).toFixed(1) + "s");
      el.style.setProperty("--sway", (-Math.random() * 8).toFixed(1) + "s");
      el.style.setProperty("--o", (0.22 + Math.random() * 0.34).toFixed(2));
      el.innerHTML = "<i>💗</i>";
      frag.appendChild(el);
    }
    for (let i = 0; i < 5; i++) {
      const el = document.createElement("div");
      el.className = "lantern lamp";
      el.style.setProperty("--x", (6 + Math.random() * 88).toFixed(2) + "%");
      el.style.setProperty("--s", (7 + Math.random() * 5).toFixed(1) + "px");
      el.style.setProperty("--dur", (34 + Math.random() * 26).toFixed(1) + "s");
      el.style.setProperty("--delay", (-Math.random() * 58).toFixed(1) + "s");
      el.style.setProperty("--sway", (-Math.random() * 9).toFixed(1) + "s");
      el.style.setProperty("--o", (0.55 + Math.random() * 0.3).toFixed(2));
      el.innerHTML = '<span class="lamp-body"><span class="lamp-core"></span></span>';
      frag.appendChild(el);
    }
    lanternBox.appendChild(frag);
  }

  /* ── Night sky canvas ───────────────────────── */
  const canvas = $("#sky");
  const ctx = canvas.getContext("2d");
  const fxCanvas = $("#fx");
  const fx = fxCanvas.getContext("2d");
  // Mobile / low-core devices get a lighter rendering profile.
  let lowPower = false;
  let lastFrameAt = 0;
  let animating = true;
  let rafId = null;
  let fxWasActive = false;

  // One reusable glow sprite for fireflies (avoids a new gradient every frame).
  const flySprite = document.createElement("canvas");
  flySprite.width = flySprite.height = 96;
  {
    const fc = flySprite.getContext("2d");
    const fg = fc.createRadialGradient(48, 48, 0, 48, 48, 48);
    fg.addColorStop(0, "rgba(255, 244, 220, 1)");
    fg.addColorStop(0.38, "rgba(255, 205, 224, 0.45)");
    fg.addColorStop(1, "rgba(255, 205, 224, 0)");
    fc.fillStyle = fg;
    fc.fillRect(0, 0, 96, 96);
  }

  let W = 0, H = 0, DPR = 1;
  let stars = [];
  let dust = [];
  let flies = [];
  let constellation = null;
  let lastT = 0;
  let shoot = null;
  let nextShootAt = 5;
  const particles = [];
  const meteors = [];

  function resizeCanvas() {
    lowPower = window.innerWidth <= 640 || (navigator.hardwareConcurrency || 8) <= 4;
    // DPR 1 is enough for tiny stars on mobile and halves the pixels we draw.
    DPR = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fxCanvas.width = Math.round(W * DPR);
    fxCanvas.height = Math.round(H * DPR);
    fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    makeStars();
    makeDust();
    makeFlies();
    makeConstellation();
    if (heartPlaced) placeBetweenHeart();
  }

  function makeStars() {
    const n = Math.max(lowPower ? 40 : 60, Math.min(lowPower ? 84 : 170, Math.round((W * H) / (lowPower ? 15000 : 8500))));
    stars = Array.from({ length: n }, () => {
      const big = Math.random() < 0.1;
      const y = Math.pow(Math.random(), 0.85) * H * 0.58;
      const warm = Math.random() < 0.32;
      const s = {
        x: Math.random() * W,
        y,
        r: big ? 1.15 + Math.random() * 1.05 : 0.45 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        speed: 0.55 + Math.random() * 1.9,
        base: (0.32 + Math.random() * 0.5) * (1 - (y / (H * 0.58)) * 0.35),
        big,
        warm,
      };
      // Cache gradients once per resize instead of rebuilding them on every frame.
      if (big && !lowPower) {
        const tint = warm ? "255, 246, 226" : "255, 255, 255";
        s.glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 9);
        s.glow.addColorStop(0, `rgba(${tint},0.6)`);
        s.glow.addColorStop(0.35, "rgba(255, 214, 232, 0.24)");
        s.glow.addColorStop(1, "rgba(255, 214, 232, 0)");
        const len = s.r * 10;
        s.flareLen = len;
        s.flareH = ctx.createLinearGradient(s.x - len, s.y, s.x + len, s.y);
        s.flareH.addColorStop(0, "rgba(255,255,255,0)");
        s.flareH.addColorStop(0.5, `rgba(${tint},0.9)`);
        s.flareH.addColorStop(1, "rgba(255,255,255,0)");
        s.flareV = ctx.createLinearGradient(s.x, s.y - len * 1.3, s.x, s.y + len * 1.3);
        s.flareV.addColorStop(0, "rgba(255,255,255,0)");
        s.flareV.addColorStop(0.5, `rgba(${tint},0.9)`);
        s.flareV.addColorStop(1, "rgba(255,255,255,0)");
      }
      return s;
    });
  }

  function makeDust() {
    const n = Math.round(Math.min(lowPower ? 45 : 90, (W * H) / (lowPower ? 20000 : 12000)));
    dust = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.pow(Math.random(), 1.15) * H * 0.5,
      r: 0.3 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.55,
      base: 0.08 + Math.random() * 0.16,
    }));
  }

  function makeFlies() {
    const n = Math.round(Math.max(7, Math.min(14, W / 95)));
    flies = Array.from({ length: n }, () => ({
      x: W * (0.07 + Math.random() * 0.86),
      y: H * (0.57 + Math.random() * 0.32),
      r: 0.85 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.75,
      amp: 8 + Math.random() * 18,
      base: 0.45 + Math.random() * 0.4,
    }));
  }

  function makeConstellation() {
    constellation = null;
    if (W < 620) return;

    const card = document.getElementById("intro");
    const cr = card ? card.getBoundingClientRect() : null;
    const pad = 12;
    let R = Math.min(86, W * 0.11);
    let cx = 0;
    let cy = 0;

    if (cr && cr.width > 0) {
      const topRoom = cr.top - pad;
      const leftRoom = cr.left - pad;
      if (topRoom >= R * 1.7 + pad) {
        cx = Math.min(W * 0.16, W - R - pad);
        cx = Math.max(cx, R + pad);
        cy = cr.top - pad - R * 0.7;
      } else if (leftRoom >= (R + pad) * 2) {
        cx = cr.left - pad - R;
        cy = Math.max(R + pad, Math.min(H * 0.26, H - R - pad));
      } else {
        const fitR = Math.min(R, leftRoom / 2);
        if (fitR < 38) return;
        R = fitR;
        cx = cr.left - pad - R;
        cy = Math.max(R + pad, Math.min(H * 0.24, H - R - pad));
      }
    } else {
      cx = W * 0.12;
      cy = H * 0.22;
    }

    if (cx < R + pad || cy < R + pad) return;

    const pts = [];
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push([cx + (hx / 17) * R, cy + (hy / 17) * R]);
    }
    constellation = { pts };
  }

  function drawDust(time) {
    for (const d of dust) {
      const tw = 0.4 + 0.6 * Math.sin(time * d.speed + d.phase);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 226, 240, ${d.base * (0.35 + 0.65 * tw)})`;
      ctx.fill();
    }
  }

  function drawConstellation(time) {
    if (!constellation) return;
    const pts = constellation.pts;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.7);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = `rgba(242, 156, 195, ${0.2 + pulse * 0.16})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const tw = 0.55 + 0.45 * Math.sin(time * (1.05 + (i % 3) * 0.28) + i * 1.7);
      ctx.beginPath();
      ctx.arc(x, y, 1.15 + tw * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.5 * tw})`;
      if (!lowPower) {
        ctx.shadowColor = "rgba(255, 170, 205, 0.9)";
        ctx.shadowBlur = 7;
      }
      ctx.fill();
      if (!lowPower) ctx.shadowBlur = 0;
    }
  }

  function drawFlies(time) {
    for (const f of flies) {
      const x = f.x + Math.sin(time * 0.55 + f.phase) * f.amp;
      const y = f.y + Math.cos(time * 0.42 + f.phase * 1.3) * f.amp * 0.45;
      const a = f.base * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * f.speed + f.phase)));
      const size = f.r * 12;
      ctx.globalAlpha = a;
      ctx.drawImage(flySprite, x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 252, 238, ${Math.min(1, a * 2.1)})`;
      ctx.fill();
    }
  }

  function drawHeart(x, y, s, rot, color, alpha) {
    fx.save();
    fx.translate(x, y);
    fx.rotate(rot);
    fx.scale(s, s);
    fx.beginPath();
    fx.moveTo(0, 0.62);
    fx.bezierCurveTo(-1.1, -0.16, -0.7, -0.95, 0, -0.35);
    fx.bezierCurveTo(0.7, -0.95, 1.1, -0.16, 0, 0.62);
    fx.fillStyle = color;
    fx.globalAlpha = alpha;
    fx.fill();
    fx.restore();
  }

  function spawnHearts(x, y, count = 12) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      if (particles.length > 260) break;
      const colors = ["#ff8fb8", "#ffb3cd", "#ffd6e5", "#fff0f6", "#f874a6"];
      particles.push({
        type: "heart",
        x: x + (Math.random() - 0.5) * 46,
        y: y + (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 44,
        vy: -22 - Math.random() * 52,
        s: 3.5 + Math.random() * 5.5,
        rot: (Math.random() - 0.5) * 0.7,
        vr: (Math.random() - 0.5) * 1.4,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 2.2 + Math.random() * 1.8,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  function spawnPetals(x, y, count = 10) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      if (particles.length > 260) break;
      particles.push({
        type: "petal",
        x: x + (Math.random() - 0.5) * W * 0.7,
        y: y + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 36,
        vy: 20 + Math.random() * 46,
        s: 2.4 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 3,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 4.5 + Math.random() * 3,
        color: Math.random() < 0.5 ? "#ffb3cd" : "#fff0f6",
      });
    }
  }

  function spawnHeartRain(count = 52) {
    if (reduced) return;
    const colors = ["#ff8fb8", "#ffb3cd", "#ffd6e5", "#f874a6", "#fff0f6"];
    for (let i = 0; i < count; i++) {
      if (particles.length > 340) break;
      const y = -30 - Math.random() * H * 0.5;
      const vy = 150 + Math.random() * 170;
      particles.push({
        type: "rain",
        x: Math.random() * W,
        y,
        vx: (Math.random() - 0.5) * 22,
        vy,
        s: 3 + Math.random() * 5,
        rot: (Math.random() - 0.5) * 1.1,
        vr: (Math.random() - 0.5) * 1.3,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: Math.max(2.4, (H + 40 - y) / vy) + Math.random() * 0.6,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  function spawnSpark(x, y) {
    if (reduced || particles.length > 260) return;
    particles.push({
      type: "spark",
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 12,
      vy: -16 - Math.random() * 24,
      s: 0.9 + Math.random() * 1.7,
      rot: 0,
      vr: 0,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 1.6 + Math.random() * 1.8,
      color: Math.random() < 0.5 ? "#ffe3b8" : "#ffc2d6",
    });
  }

  const FW_COLORS = ["#ffd6e5", "#ffb3cd", "#ffe9b8", "#ffd0a6", "#cfe6ff", "#e6d1ff", "#fff2f8"];

  function spawnFirework(x, y, count = 24, power = 1) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      if (particles.length > 320) break;
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.16;
      const sp = (48 + Math.random() * 92) * power;
      particles.push({
        type: "fw",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        s: 1.1 + Math.random() * 1.5,
        rot: 0,
        vr: 0,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 1.5 + Math.random() * 1.1,
        color: FW_COLORS[(Math.random() * FW_COLORS.length) | 0],
      });
    }
  }

  function spawnMeteor() {
    if (reduced) return;
    meteors.push({
      x: W * (0.02 + Math.random() * 0.96),
      y: -H * 0.12 + Math.random() * H * 0.22,
      vx: 320 + Math.random() * 420,
      vy: 150 + Math.random() * 190,
      life: 0,
      maxLife: 0.85 + Math.random() * 0.6,
      len: 0.14 + Math.random() * 0.12,
    });
  }

  function spawnMeteorShower(count = 18) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      later(spawnMeteor, i * (70 + Math.random() * 110));
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      if (p.type === "heart") {
        p.vy -= 5 * dt;
        p.x += (p.vx + Math.sin(p.life * 2.4 + p.phase) * 16) * dt;
        p.y += p.vy * dt;
      } else if (p.type === "rain") {
        p.x += (p.vx + Math.sin(p.life * 1.9 + p.phase) * 24) * dt;
        p.y += p.vy * dt;
      } else if (p.type === "petal") {
        p.x += (p.vx + Math.sin(p.life * 1.8 + p.phase) * 26) * dt;
        p.y += p.vy * dt;
      } else if (p.type === "fw") {
        const drag = Math.max(0, 1 - 1.4 * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + 24 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else {
        p.x += (p.vx + Math.sin(p.life * 3 + p.phase) * 6) * dt;
        p.y += p.vy * dt;
        p.vy += 2 * dt;
      }
      p.rot += p.vr * dt;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const t = p.life / p.maxLife;
      const alpha = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.95;
      if (p.type === "heart" || p.type === "rain") {
        drawHeart(p.x, p.y, p.s, p.rot, p.color, Math.max(0, alpha));
      } else if (p.type === "petal") {
        fx.save();
        fx.translate(p.x, p.y);
        fx.rotate(p.rot);
        fx.scale(1, 0.55);
        fx.beginPath();
        fx.arc(0, 0, p.s, 0, Math.PI * 2);
        fx.fillStyle = p.color;
        fx.globalAlpha = Math.max(0, alpha * 0.85);
        fx.fill();
        fx.restore();
      } else if (p.type === "fw") {
        fx.beginPath();
        fx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        fx.fillStyle = p.color;
        fx.globalAlpha = Math.max(0, alpha);
        if (!lowPower) {
          fx.shadowColor = p.color;
          fx.shadowBlur = 9;
        }
        fx.fill();
        if (!lowPower) fx.shadowBlur = 0;
      } else {
        fx.beginPath();
        fx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        fx.fillStyle = p.color;
        fx.globalAlpha = Math.max(0, alpha);
        if (!lowPower) {
          fx.shadowColor = "rgba(255,170,205,.9)";
          fx.shadowBlur = 8;
        }
        fx.fill();
        if (!lowPower) fx.shadowBlur = 0;
      }
    }
    fx.globalAlpha = 1;
  }

  function frame(t) {
    if (!animating) return;
    // Cap to ~45fps on phones/low-core devices; the eye cannot tell, the battery can.
    if (lowPower && t - lastFrameAt < 1000 / 45) {
      rafId = requestAnimationFrame(frame);
      return;
    }
    // หน้าความทรงจำ/จดหมายปิดทับฉากอยู่ หยุดวาดชั่วคราวแต่ยังเดิน rAF ไว้
    if (document.body.classList.contains("memory-open") || (letterView && !letterView.hidden)) {
      lastT = t;
      rafId = requestAnimationFrame(frame);
      return;
    }

    lastFrameAt = t;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    const time = t / 1000;
    // กระทงยังโคลงต่อหลังหัวใจโผล่ — อัปเดตตำแหน่งทุกเฟรมให้หัวใจอยู่กลางเสมอ
    if (heartPlaced) placeBetweenHeart();
    ctx.clearRect(0, 0, W, H);
    // เคลียร์ fx เฉพาะตอนมีอนุภาค (หรือเฟรมสุดท้ายที่อนุภาคหาย) — ส่วนใหญ่ไม่มีอะไรให้วาด
    const fxActive = particles.length > 0 || meteors.length > 0;
    if (fxActive || fxWasActive) {
      fx.clearRect(0, 0, W, H);
      fxWasActive = fxActive;
    }

    drawDust(time);

    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
      const a = s.base * (0.34 + 0.66 * tw * tw);
      const tint = s.warm ? "255, 246, 226" : "255, 255, 255";
      if (s.big && s.glow) {
        ctx.globalAlpha = a;
        ctx.fillStyle = s.glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 9, 0, Math.PI * 2);
        ctx.fill();

        // Four-point twinkle flare (gradients cached at resize time)
        const len = s.r * (5.5 + 4.5 * tw);
        ctx.globalAlpha = Math.min(1, a * 0.9);
        ctx.strokeStyle = s.flareH;
        ctx.lineWidth = Math.max(0.6, s.r * 0.42);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y);
        ctx.lineTo(s.x + len, s.y);
        ctx.stroke();
        ctx.strokeStyle = s.flareV;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - len * 1.3);
        ctx.lineTo(s.x, s.y + len * 1.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (s.big && lowPower) {
        ctx.globalAlpha = Math.min(1, a * 0.45);
        ctx.fillStyle = `rgba(${tint},0.5)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${tint},${a})`;
      ctx.fill();
    }

    drawConstellation(time);
    drawFlies(time);

    if (!reduced) {
      if (!shoot && time > nextShootAt) {
        shoot = {
          x: W * (0.15 + Math.random() * 0.6),
          y: H * (0.06 + Math.random() * 0.24),
          vx: 300 + Math.random() * 240,
          vy: 110 + Math.random() * 110,
          life: 0,
          maxLife: 1.05,
        };
      }
      if (shoot) {
        shoot.life += dt;
        shoot.x += shoot.vx * dt;
        shoot.y += shoot.vy * dt;
        const k = shoot.life / shoot.maxLife;
        if (k >= 1) {
          shoot = null;
          nextShootAt = time + 7 + Math.random() * 11;
        } else {
          const a = Math.sin(k * Math.PI) * 0.9;
          const tx = shoot.x - shoot.vx * 0.14;
          const ty = shoot.y - shoot.vy * 0.14;
          const g = ctx.createLinearGradient(tx, ty, shoot.x, shoot.y);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(1, `rgba(255,255,255,${a})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(shoot.x, shoot.y);
          ctx.stroke();
        }
      }
    }

    // meteor shower (special event)
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const k = m.life / m.maxLife;
      if (k >= 1) {
        meteors.splice(i, 1);
        continue;
      }
      const a = Math.sin(k * Math.PI) * 0.95;
      const tx = m.x - m.vx * m.len;
      const ty = m.y - m.vy * m.len;
      const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
      g.addColorStop(0, "rgba(255, 226, 240, 0)");
      g.addColorStop(0.55, `rgba(255, 236, 246, ${a * 0.55})`);
      g.addColorStop(1, `rgba(255, 255, 255, ${a})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.fill();
    }

    updateParticles(dt);
    drawParticles();
    rafId = requestAnimationFrame(frame);
  }

  /* ── Ambient audio ──────────────────────────── */
  const Ambient = (() => {
    let ac = null;
    let master = null;
    let timer = null;
    let on = false;
    const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];

    function ensure() {
      if (ac) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0;
      const delay = ac.createDelay(1);
      delay.delayTime.value = 0.45;
      const fb = ac.createGain();
      fb.gain.value = 0.3;
      const wet = ac.createGain();
      wet.gain.value = 0.5;
      delay.connect(fb);
      fb.connect(delay);
      master.connect(ac.destination);
      master.connect(delay);
      delay.connect(wet);
      wet.connect(ac.destination);
      return true;
    }

    function pluck(freq, vol = 0.2, dur = 3.4, when = 0) {
      if (!ac || !master) return;
      const t = ac.currentTime + when;
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.1);
    }

    function schedule() {
      if (!on) return;
      const n = scale[(Math.random() * scale.length) | 0];
      pluck(n, 0.16 + Math.random() * 0.06, 3.2 + Math.random() * 1.2);
      if (Math.random() < 0.4) pluck(n * 2, 0.05, 2.4, 0.35);
      timer = setTimeout(schedule, 1150 + Math.random() * 1100);
    }

    function fade(to, seconds) {
      if (!ac || !master) return;
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.linearRampToValueAtTime(to, now + seconds);
    }

    async function start() {
      if (!ensure()) return false;
      try {
        if (ac.state !== "running") await ac.resume();
      } catch (e) {
        /* ignore */
      }
      if (ac.state !== "running") return false;
      if (on) return true;
      on = true;
      fade(0.55, 1.2);
      pluck(scale[2], 0.16, 4);
      pluck(scale[4], 0.1, 4, 0.6);
      schedule();
      return true;
    }

    function stop() {
      on = false;
      if (timer) clearTimeout(timer);
      timer = null;
      fade(0, 0.6);
    }

    function plop() {
      if (!ac || ac.state !== "running" || !master) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.16);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.32);
    }

    function chime() {
      if (!ac || ac.state !== "running") return;
      pluck(587.33, 0.16, 4.2, 0.05);
      pluck(880, 0.09, 3, 0.32);
      pluck(1174.66, 0.05, 2.4, 0.6);
    }

    return { start, stop, plop, chime };
  })();

  function setMusicUI(on) {
    musicBtn.setAttribute("aria-pressed", String(on));
    musicBtn.title = on ? "ปิดเพลง" : "เปิดเพลง";
  }

  /* ── Toast ──────────────────────────────────── */
  function toast(msg, ms = 3400) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  /* ── Names / HUD ────────────────────────────── */
  function renderNames() {
    hudNames.textContent = "";
    const a = document.createElement("span");
    a.textContent = state.a;
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = "♥";
    const b = document.createElement("span");
    b.textContent = state.b;
    hudNames.append(a, heart, b);
  }

  function showHud() {
    renderNames();
    hudWish.textContent = "“" + state.wish + "”";
    hud.hidden = false;
    hud.classList.add("show");
    if (memoryBtn) memoryBtn.hidden = false;
  }

  /* ── Memory view ─────────────────────────────── */
  let memoryCloseTimer = null;

  function openMemory() {
    if (!memoryView) return;
    clearTimeout(memoryCloseTimer);
    document.body.classList.add("memory-open");
    memoryView.hidden = false;
    memoryView.scrollTop = 0;
    void memoryView.offsetWidth;
    memoryView.classList.add("show");
  }

  function closeMemory() {
    if (!memoryView) return;
    const video = $("video", memoryView);
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    memoryView.classList.remove("show");
    memoryCloseTimer = setTimeout(() => {
      memoryView.hidden = true;
      document.body.classList.remove("memory-open");
    }, 350);
  }

  /* ── Letter envelope ─────────────────────────── */
  let letterOpenTimer = null;
  let letterCloseTimer = null;

  function openLetterView() {
    if (!letterView) return;
    clearTimeout(letterCloseTimer);
    clearTimeout(letterOpenTimer);
    letterView.classList.remove("opened", "show-paper");
    letterView.hidden = false;
    letterView.scrollTop = 0;
    if (letterPaper) letterPaper.hidden = true;
    void letterView.offsetWidth;
    letterView.classList.add("show");
  }

  function openEnvelope() {
    if (!letterView || letterView.classList.contains("opened")) return;
    letterView.classList.add("opened");
    letterOpenTimer = setTimeout(() => {
      if (letterPaper) letterPaper.hidden = false;
      letterView.classList.add("show-paper");
      letterView.scrollTop = 0;
    }, 620);
  }

  function closeLetterView() {
    if (!letterView) return;
    clearTimeout(letterOpenTimer);
    letterView.classList.remove("show", "opened", "show-paper");
    letterCloseTimer = setTimeout(() => {
      letterView.hidden = true;
      if (letterPaper) letterPaper.hidden = true;
    }, 350);
  }

  function heartsFromKrathongs() {
    const svgs = $$(".krathong-unit .float-art > .krathong-svg");
    svgs.forEach((svg, i) => {
      const r = svg.getBoundingClientRect();
      setTimeout(() => {
        spawnHearts(r.left + r.width / 2, r.top + r.height * 0.42, 14);
      }, i * 240);
    });
    spawnPetals(W / 2, H * 0.62, 14);
  }

  function startSparks() {
    stopSparks();
    sparkTimer = setInterval(() => {
      if (!document.body.classList.contains("lit")) return;
      const svgs = $$(".krathong-unit .float-art > .krathong-svg");
      if (!svgs.length) return;
      const svg = svgs[(Math.random() * svgs.length) | 0];
      const r = svg.getBoundingClientRect();
      spawnSpark(r.left + r.width * (0.42 + Math.random() * 0.16), r.top + r.height * 0.26);
    }, 480);
  }

  function stopSparks() {
    if (sparkTimer) clearInterval(sparkTimer);
    sparkTimer = null;
  }

  /* ── Two krathongs drift together ───────────── */
  function startTogether() {
    if (!document.body.classList.contains("released")) return;
    const ua = $('.krathong-unit[data-side="a"]', layer);
    const ub = $('.krathong-unit[data-side="b"]', layer);
    if (!ua || !ub) return;

    const ra = ua.getBoundingClientRect();
    const rb = ub.getBoundingClientRect();
    const gap = Math.max(12, Math.min(36, W * 0.026));
    const desired = (ra.width + rb.width) / 2 + gap;
    const ca = ra.left + ra.width / 2;
    const cb = rb.left + rb.width / 2;
    const shift = Math.max(0, (cb - ca - desired) / 2);
    const lift = (rb.bottom - ra.bottom) / 2;

    // Keep both krathongs clear of the HUD on short screens.
    const hudTop = hud.hidden ? H : hud.getBoundingClientRect().top;
    const maxBottom = Math.max(ra.bottom + lift, rb.bottom - lift);
    const push = Math.max(0, maxBottom - (hudTop - 22));

    ua.style.setProperty("--pair-x", shift.toFixed(1) + "px");
    ub.style.setProperty("--pair-x", (-shift).toFixed(1) + "px");
    ua.style.setProperty("--pair-y", (lift - push).toFixed(1) + "px");
    ub.style.setProperty("--pair-y", (-lift - push).toFixed(1) + "px");

    document.body.classList.add("together");

    if (reduced) {
      later(showBetweenHeart, 120);
      return;
    }
    // รอให้กระทงเลื่อนมาจอดสนิทก่อนค่อยขีดเส้น มิเช่นนั้นจุดปลายเส้นจะ
    // ถูกจับตอนยังเคลื่อนที่ แล้วเลยหลุดจากกระทงตอนtransitionจบ
    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      ua.removeEventListener("transitionend", onEnd);
      showBetweenHeart();
    };
    const onEnd = (e) => {
      if (e.target === ua) reveal();
    };
    ua.addEventListener("transitionend", onEnd);
    later(reveal, 3600); // สำรองเผื่อ transitionend ไม่ยิง
  }

  // viewBox กระทงคือ 0 0 260 210 แต่ตัวลำกระทงอยู่ที่ y≈150 (กลาง SVG คือ 105)
  // ถ้าใช้กลาง SVG หัวใจจะลอยสูงเหนือเทียน — ต้องใช้กลางลำกระทงจริง ๆ
  function heartAnchor() {
    const ua = $('.krathong-unit[data-side="a"]', layer);
    const ub = $('.krathong-unit[data-side="b"]', layer);
    const artA = ua && $('.float-art > .krathong-svg', ua);
    const artB = ub && $('.float-art > .krathong-svg', ub);
    if (!artA || !artB) return null;
    const ra = artA.getBoundingClientRect();
    const rb = artB.getBoundingClientRect();
    const bowl = (r) => r.top + r.height * (150 / 210);
    return {
      x: (ra.left + ra.width / 2 + rb.left + rb.width / 2) / 2,
      y: (bowl(ra) + bowl(rb)) / 2,
      ra,
      rb,
    };
  }

  function placeBetweenHeart() {
    if (!betweenHeart) return;
    const a = heartAnchor();
    if (!a) return;
    betweenHeart.style.left = a.x.toFixed(1) + "px";
    betweenHeart.style.top = a.y.toFixed(1) + "px";
  }

  function showBetweenHeart() {
    if (!betweenHeart || !document.body.classList.contains("together")) return;

    placeBetweenHeart();
    heartPlaced = true;
    void betweenHeart.getBoundingClientRect();
    betweenHeart.classList.add("show");

    const a = heartAnchor();
    if (a) {
      const { x, y, ra, rb } = a;
      spawnHearts(x, y, 10);
      popHearts(x, y, 2);

      const rise = Math.max(88, Math.min(H * 0.26, 168));
      const top = Math.min(ra.top, rb.top) - rise;

      if (!reduced) {
        later(() => spawnFirework(x - W * 0.15, top, 20, 0.85), 220);
        later(() => spawnFirework(x + W * 0.16, top - 46, 18, 0.8), 760);
        later(() => spawnFirework(x, top + 26, 26, 1), 1380);
      }

      // ลุ้นอีเวนต์พิเศษ 1 ใน 4 หลังเอฟเฟกต์บรรจบ
      later(() => {
        if (!reduced) toast("🎲 ลุ้นอีเวนต์พิเศษ...", 1600);
        later(() => runSpecialEvent(x, top + 40), reduced ? 0 : 1250);
      }, reduced ? 500 : 1850);
    }

    if (musicBtn.getAttribute("aria-pressed") === "true") Ambient.chime();
  }

  function resetBetweenHeart() {
    heartPlaced = false;
    if (betweenHeart) betweenHeart.classList.remove("show");
    $$(".krathong-unit", layer).forEach((u) => {
      u.style.removeProperty("--pair-x");
      u.style.removeProperty("--pair-y");
    });
    document.body.classList.remove("together");
  }

  /* ── Special random event (1 of 4) ───────────── */
  const SPECIAL_EVENTS = [
    { id: "rain", name: "ฝนหัวใจ", emoji: "💗" },
    { id: "meteor", name: "ดาวตกชุดใหญ่", emoji: "🌠" },
    { id: "lantern", name: "โคมลอยพิเศษ", emoji: "🏮" },
    { id: "firework", name: "ดอกไม้ไฟยักษ์", emoji: "🎆" },
  ];
  let lastSpecial = null;

  function pickSpecialEvent() {
    // กันไม่ให้ซ้ำกับรอบก่อนหน้า เพื่อให้รู้สึกว่าสุ่มจริง
    const pool = SPECIAL_EVENTS.filter((e) => e.id !== lastSpecial);
    const list = pool.length ? pool : SPECIAL_EVENTS;
    const ev = list[(Math.random() * list.length) | 0];
    lastSpecial = ev.id;
    return ev;
  }

  function spawnSpecialLanterns() {
    if (reduced) return;
    const box = document.createElement("div");
    box.className = "special-lanterns";
    const count = W < 520 ? 5 : 8;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "lantern lamp special";
      el.style.setProperty("--x", (10 + Math.random() * 80).toFixed(2) + "%");
      el.style.setProperty("--s", (32 + Math.random() * 26).toFixed(1) + "px");
      el.style.setProperty("--dur", (6.4 + Math.random() * 3.6).toFixed(1) + "s");
      el.style.setProperty("--delay", (Math.random() * 1.2).toFixed(2) + "s");
      el.style.setProperty("--sway", (-Math.random() * 6).toFixed(1) + "s");
      el.style.setProperty("--o", (0.8 + Math.random() * 0.2).toFixed(2));
      el.innerHTML = '<span class="lamp-body"><span class="lamp-core"></span></span>';
      box.appendChild(el);
    }
    lanternBox.appendChild(box);
    later(() => box.classList.add("fade"), 7600);
    later(() => box.remove(), 9400);
  }

  function runGiantFireworks(x, y) {
    if (reduced) return;
    const spots = [
      [0, 0, 54, 1.75, 0],
      [-0.22, 0.06, 36, 1.35, 200],
      [0.22, 0.06, 36, 1.35, 280],
      [0, 0.17, 48, 1.6, 460],
      [-0.12, -0.04, 30, 1.2, 680],
      [0.12, -0.04, 30, 1.2, 740],
    ];
    spots.forEach(([dx, dy, count, power, delay]) => {
      later(() => {
        spawnFirework(x + dx * W, y + dy * H, count, power);
        Ambient.plop();
      }, delay);
    });
  }

  function runSpecialEvent(x, y) {
    if (!document.body.classList.contains("together")) return;
    const ev = pickSpecialEvent();
    document.body.dataset.special = ev.id;

    if (!reduced) {
      if (ev.id === "rain") {
        spawnHeartRain(56);
        later(() => spawnHeartRain(52), 950);
        later(() => spawnHeartRain(46), 1900);
      } else if (ev.id === "meteor") {
        spawnMeteorShower(W < 520 ? 12 : 18);
      } else if (ev.id === "lantern") {
        spawnSpecialLanterns();
      } else {
        runGiantFireworks(x, y);
      }
    }

    toast(`${ev.emoji} อีเวนต์พิเศษ: ${ev.name}!`, 4600);
    if (musicBtn.getAttribute("aria-pressed") === "true") Ambient.chime();
  }

  function resetSpecial() {
    meteors.length = 0;
    delete document.body.dataset.special;
    // เคลียร์ฝนหัวใจที่ยังค้างอยู่เมื่อเริ่มรอบใหม่
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].type === "rain") particles.splice(i, 1);
    }
    $$(".special-lanterns", lanternBox).forEach((el) => el.remove());
  }

  /* ── Story flow ─────────────────────────────── */
  const STEP_ORDER = ["cover", "who", "wish", "ready", "petals", "candles", "wishnote", "release"];

  function panelFor(step) {
    return panels.find((p) => p.dataset.step === step) || null;
  }

  function goTo(step) {
    // ถ้าเคยจุดครบ 3 เล่มแล้ว กลับมาขั้นเทียนให้ผ่านไปหน้าอธิษฐานเลย
    if (step === "candles" && candlesLit >= 3) step = "wishnote";
    const next = panelFor(step);
    if (!next) return;
    const cur = panels.find((p) => p.classList.contains("is-active"));
    if (cur === next) return;

    if (cur) {
      cur.classList.remove("is-active");
      cur.hidden = true;
    }
    next.hidden = false;
    void next.offsetWidth;
    next.classList.add("is-active");

    const idx = Math.max(0, STEP_ORDER.indexOf(step));
    dots.forEach((d, i) => d.classList.toggle("on", i === idx));
    intro.dataset.step = step;
    intro.scrollTop = 0;
  }

  function renderCoverKrathongs() {
    const box = $("#coverKraths");
    if (!box) return;
    const a = $(".cover-krath.a", box);
    const b = $(".cover-krath.b", box);
    if (a) a.innerHTML = buildKrathong("ca", paletteFor("a"));
    if (b) b.innerHTML = buildKrathong("cb", paletteFor("b"));
  }

  function renderPetalsPreview() {
    const box = $("#krathongPreview");
    if (box) box.innerHTML = buildKrathong("pv", paletteFor("a"), { candles: 3 });
  }

  function renderCandleKrathong() {
    const box = $("#candleKrathong");
    if (box) box.innerHTML = buildKrathong("ck", paletteFor("a"), { candles: 3, interactive: true });
  }

  function applyPalette(index) {
    state.palette = index;
    setupKrathongs();
    renderCoverKrathongs();
    renderPetalsPreview();
    renderCandleKrathong();
    $$(".swatch", intro).forEach((s, i) => {
      s.classList.toggle("chosen", i === index);
      s.setAttribute("aria-pressed", String(i === index));
    });
  }

  let candlesLit = 0;
  let floatQueued = false;

  function lightCandle(btn) {
    if (!btn || btn.classList.contains("lit")) return;
    btn.classList.add("lit");
    btn.setAttribute("aria-pressed", "true");
    candlesLit += 1;

    const r = btn.getBoundingClientRect();
    popHearts(r.left + r.width / 2, r.top + r.height * 0.18, 2);
    Ambient.plop();

    if (candleCount) {
      candleCount.textContent = `จุดแล้ว ${candlesLit} / 3 เล่ม`;
      candleCount.classList.toggle("done", candlesLit === 3);
    }
    if (candlesLit < 3 || floatQueued) return;

    floatQueued = true;
    const candlePanel = panelFor("candles");
    if (candlePanel) $$(".back", candlePanel).forEach((b) => (b.disabled = true));

    toast("🕯️ เทียนครบสามเล่มแล้ว... หลับตาอธิษฐานนะ", 2600);
    // เริ่มเสียงจาก gesture นี้เลย (Safari ต้องการ user gesture ใกล้ ๆ กัน)
    Ambient.start().then((ok) => setMusicUI(ok));

    setTimeout(() => goTo("wishnote"), 1200);
  }

  function floatMessage() {
    return state.who === "moon"
      ? "🌕 คืนนี้พระจันทร์สวยเป็นพิเศษ"
      : state.who === "cat"
        ? "🐱 แมวน้อยนั่งดูเราลอยกระทงด้วย"
        : "💗 คืนนี้เป็นของเราสองคน";
  }

  function notifyWish() {
    if (wishSent || !TG_TOKEN || !TG_CHAT_ID) return;
    wishSent = true;
    const note = $("#finalWish");
    const typed = note ? note.value.trim() : "";
    const whoLabels = { love: "กับเค้าคนนี้ไง 💗", moon: "กับพระจันทร์ 🌕", cat: "กับแมวน้อย 🐱" };
    const lines = [
      "💌 คำอธิษฐานจากเธอ",
      "",
      "ลอยกระทงกับ: " + (whoLabels[state.who] || state.who || "-"),
      "คำอธิษฐานที่เลือก: " + (state.wish || "-"),
      "ความพร้อม: " + (state.ready || "-"),
      "สีกระทง: " + (PALETTES[state.palette] || PALETTES[0]).name,
      "เทียน: จุดแล้ว " + candlesLit + " / 3 เล่ม",
      "",
      "ข้อความที่พิมพ์:",
      "“" + (typed || "-") + "”",
      "",
      "เวลา: " + new Date().toLocaleString("th-TH", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      }),
    ].join("\n");
    const url =
      "https://api.telegram.org/bot" + TG_TOKEN +
      "/sendMessage?chat_id=" + encodeURIComponent(TG_CHAT_ID) +
      "&text=" + encodeURIComponent(lines);
    // no-cors: ส่งได้แม้ Telegram ไม่ตอบ CORS — เราไม่ต้องการอ่าน response
    fetch(url, { mode: "no-cors" }).catch(() => {});
  }

  function releaseFloat() {
    const note = $("#finalWish");
    const typed = note ? note.value.trim() : "";
    if (!typed) {
      toast("✍️ เขียนคำอธิษฐานก่อนนะ", 2400);
      goTo("wishnote");
      return;
    }
    state.wish = typed.slice(0, 140);
    startFloat({ music: "keep", toast: floatMessage() });
  }

  function setupStory() {
    renderCoverKrathongs();
    renderPetalsPreview();
    renderCandleKrathong();

    $$("[data-next]", intro).forEach((btn) => {
      btn.addEventListener("click", () => goTo(btn.dataset.next));
    });
    $$("[data-back]", intro).forEach((btn) => {
      btn.addEventListener("click", () => goTo(btn.dataset.back));
    });

    $$(".choice", intro).forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        const group = $$(`.choice[data-key="${key}"]`, intro);
        state[key] = btn.dataset.value;
        group.forEach((b) => {
          b.classList.toggle("chosen", b === btn);
          b.disabled = true;
        });
        setTimeout(() => {
          group.forEach((b) => (b.disabled = false));
          goTo(btn.dataset.goto);
        }, 300);
      });
    });

    $$(".swatch", intro).forEach((sw) => {
      sw.addEventListener("click", () => applyPalette(Number(sw.dataset.palette)));
    });

    const candleBox = $("#candleKrathong");
    if (candleBox) {
      candleBox.addEventListener("click", (e) => {
        const candle = e.target.closest(".step-candle");
        if (candle) lightCandle(candle);
      });
      candleBox.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const candle = e.target.closest(".step-candle");
        if (!candle) return;
        e.preventDefault();
        lightCandle(candle);
      });
    }

    const finalWish = $("#finalWish");
    const wishNext = $("#wishNext");
    if (finalWish && wishNext) {
      const syncWishNext = () => {
        wishNext.disabled = !finalWish.value.trim();
      };
      finalWish.addEventListener("input", syncWishNext);
      finalWish.addEventListener("change", syncWishNext);
      wishNext.addEventListener("click", notifyWish);
      syncWishNext();
    }

    const releaseBtn = $("#releaseBtn");
    if (releaseBtn) releaseBtn.addEventListener("click", releaseFloat);
  }

  /* ── Flow ───────────────────────────────────── */
  function startFloat(opts = {}) {
    const withMusic = opts.music !== false;

    state.a = "เธอ";
    state.b = "เค้า";
    state.wish = (state.wish || "ให้เราอยู่ด้วยกันนานๆ").slice(0, 140);

    intro.classList.add("gone");
    intro.setAttribute("aria-hidden", "true");
    clearTimers();
    resetBetweenHeart();
    resetSpecial();

    document.body.classList.remove("released", "lit");
    const tagA = $('[data-tag="a"]', layer);
    const tagB = $('[data-tag="b"]', layer);
    if (tagA) tagA.textContent = state.a;
    if (tagB) tagB.textContent = state.b;
    const wraps = $$(".float-wrap", layer);
    if (wraps[0]) wraps[0].setAttribute("aria-label", `กระทงของ ${state.a} แตะเพื่อโปรยดอกไม้`);
    if (wraps[1]) wraps[1].setAttribute("aria-label", `กระทงของ ${state.b} แตะเพื่อโปรยดอกไม้`);

    hud.hidden = false;
    hud.classList.remove("show");
    renderNames();
    hudWish.textContent = "“" + state.wish + "”";

    // restart the entry animation reliably
    void document.body.offsetWidth;
    document.body.classList.add("released");

    if (opts.music === "keep") {
      // เปิดเพลงไปแล้วตั้งแต่ตอนแตะเทียนเล่มที่สาม
      if (musicBtn.getAttribute("aria-pressed") === "true") Ambient.chime();
    } else if (withMusic) {
      Ambient.start().then((ok) => {
        setMusicUI(ok);
        if (ok) Ambient.chime();
      });
    } else {
      setMusicUI(false);
    }

    later(() => {
      document.body.classList.add("lit");
      heartsFromKrathongs();
      startSparks();
    }, reduced ? 120 : 1550);

    later(showHud, reduced ? 400 : 2900);
    later(startTogether, reduced ? 700 : 4700);

    if (opts.toast) later(() => toast(opts.toast, 4200), reduced ? 500 : 3300);
  }

  function popHearts(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "pop-heart";
      el.textContent = Math.random() < 0.5 ? "💗" : "💕";
      el.style.left = x + (Math.random() - 0.5) * 26 + "px";
      el.style.top = y + (Math.random() - 0.5) * 20 + "px";
      el.style.setProperty("--dx", (Math.random() * 46 - 23).toFixed(0) + "px");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }
  }

  /* ── Events ─────────────────────────────────── */
  musicBtn.addEventListener("click", async () => {
    const pressed = musicBtn.getAttribute("aria-pressed") === "true";
    if (pressed) {
      Ambient.stop();
      setMusicUI(false);
    } else {
      const ok = await Ambient.start();
      setMusicUI(ok);
    }
  });

  if (memoryBtn) memoryBtn.addEventListener("click", openMemory);
  const memoryClose = $("#memoryClose");
  if (memoryClose) memoryClose.addEventListener("click", closeMemory);

  if (letterBtn) letterBtn.addEventListener("click", openLetterView);
  const letterClose = $("#letterClose");
  const envelope = $("#envelope");
  if (letterClose) letterClose.addEventListener("click", closeLetterView);
  if (envelope) {
    envelope.addEventListener("click", openEnvelope);
    envelope.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEnvelope();
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (letterView && !letterView.hidden) closeLetterView();
    else if (memoryView && !memoryView.hidden) closeMemory();
  });

  window.addEventListener("resize", () => {
    clearTimeout(window.__canvasResize);
    window.__canvasResize = setTimeout(resizeCanvas, 180);
  });

  // Stop the canvas loop completely while the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    animating = !document.hidden;
    if (animating) {
      cancelAnimationFrame(rafId);
      lastT = 0;
      lastFrameAt = 0;
      rafId = requestAnimationFrame(frame);
    }
  });

  /* ── Init ───────────────────────────────────── */
  function init() {
    setupStory();
    setupKrathongs();
    setupLanterns();
    resizeCanvas();
    rafId = requestAnimationFrame(frame);

    // ไม่จำค่าฟอร์มเก่า — เปิดมาให้ช่องว่างเสมอ
    try {
      localStorage.removeItem("loykrathong-couple-v1");
    } catch (e) {
      /* ignore */
    }
  }

  init();
})();

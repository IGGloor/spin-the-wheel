// ---------- Settings (change these to tweak the wheel) ----------
const SETTINGS = {
  spinDuration: 6,            // seconds, 2–12 works well
  confettiAmount: "Generous", // "Light", "Generous" or "Lavish"
  palette: "Jewel",           // "Jewel", "Garden" or "Heritage"
};

const PALETTES = {
  Jewel:    ["#b0413e", "#c28d41", "#5f7a3a", "#2f6f73", "#2e4a7a", "#6b4a85", "#a34f72", "#8a5a2b"],
  Garden:   ["#c4553f", "#d39a2e", "#7d8f3a", "#3f8a6e", "#3d6f9e", "#7a5aa6", "#c0587e", "#9c6b3c"],
  Heritage: ["#8c2f2b", "#a4732a", "#4e6532", "#24585c", "#253d66", "#56396b", "#843d5c", "#6e4622"],
};

const CONFETTI_COUNTS = { Light: 120, Generous: 260, Lavish: 480 };

const SVG_NS = "http://www.w3.org/2000/svg";
const RADIUS = 196; // segment radius in wheel (viewBox) units

// ---------- Elements ----------
const form = document.getElementById("add-form");
const input = document.getElementById("choice-input");
const addBtn = document.getElementById("add-btn");
const listEl = document.getElementById("choice-list");
const countEl = document.getElementById("count");
const clearBtn = document.getElementById("clear-btn");
const wheelEl = document.getElementById("wheel");
const segmentsEl = document.getElementById("segments");
const labelsEl = document.getElementById("labels");
const spinBtn = document.getElementById("spin-btn");
const resultEl = document.getElementById("result");
const canvas = document.getElementById("confetti");

// ---------- State ----------
// Some starter choices so the wheel isn't empty
let entries = ["Pizza", "Sushi", "Tacos", "Curry", "Ramen", "Burgers", "Pasta", "Falafel"];
let spinning = false;
let result = null;     // the winning choice, or null
let resultIdx = -1;
let rotation = 0;      // total degrees rotated; keeps growing so each spin continues forward

// ---------- Colours ----------
function colors() {
  return PALETTES[SETTINGS.palette] || PALETTES.Jewel;
}

// Cycle through the palette, but avoid the last segment matching the first
function colorAt(i, n) {
  const c = colors();
  if (n > 1 && i === n - 1 && n % c.length === 1) return c[(i + 3) % c.length];
  return c[i % c.length];
}

// ---------- Drawing the wheel ----------
// Point on the rim at an angle measured clockwise from 12 o'clock
function point(angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  return `${(RADIUS * Math.sin(r)).toFixed(2)} ${(-RADIUS * Math.cos(r)).toFixed(2)}`;
}

function svg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function renderWheel() {
  const n = entries.length;
  segmentsEl.replaceChildren();
  labelsEl.replaceChildren();

  if (n === 0) {
    segmentsEl.appendChild(svg("circle", {
      r: RADIUS, fill: "var(--color-surface)", stroke: "var(--color-divider)", "stroke-dasharray": "4 6",
    }));
    return;
  }

  const seg = 360 / n;
  const maxChars = n > 16 ? 12 : n > 10 ? 15 : 18;
  const fontSize = n > 20 ? 10 : n > 14 ? 12 : n > 8 ? 15 : 18;

  entries.forEach((label, i) => {
    const a0 = i * seg;
    const a1 = a0 + seg;

    // With one entry, draw a full disc instead of a slice
    const d = n === 1
      ? `M 0 ${-RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 0 ${RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 0 ${-RADIUS} Z`
      : `M 0 0 L ${point(a0)} A ${RADIUS} ${RADIUS} 0 ${seg > 180 ? 1 : 0} 1 ${point(a1)} Z`;
    segmentsEl.appendChild(svg("path", {
      d, fill: colorAt(i, n), stroke: "var(--color-bg)", "stroke-width": 2,
    }));

    // Label points outward from the centre through the middle of the segment
    const mid = a0 + seg / 2;
    const labelEl = document.createElement("div");
    labelEl.className = "wheel-label";
    labelEl.style.transform = `rotate(${(mid - 90).toFixed(2)}deg)`;

    // Where the label will sit on screen once the wheel stops. If that's the
    // left half, the text would be upside down, so flip it.
    const screenAngle = (((mid + rotation) % 360) + 360) % 360;
    if (screenAngle > 180) labelEl.classList.add("flipped");

    const text = document.createElement("span");
    text.style.fontSize = `${((fontSize / 420) * 100).toFixed(2)}cqw`;
    text.textContent = label.length > maxChars ? label.slice(0, maxChars - 1) + "…" : label;
    labelEl.appendChild(text);
    labelsEl.appendChild(labelEl);
  });
}

// ---------- Choice list ----------
function renderList() {
  const n = entries.length;
  listEl.replaceChildren();

  if (n === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "The wheel is empty. Add at least two choices.";
    listEl.appendChild(empty);
  }

  entries.forEach((label, i) => {
    const row = document.createElement("div");
    row.className = "choice";

    const num = document.createElement("span");
    num.className = "choice-num";
    num.textContent = String(i + 1).padStart(2, "0");

    const dot = document.createElement("span");
    dot.className = "choice-dot";
    dot.style.background = colorAt(i, n);

    const text = document.createElement("span");
    text.className = "choice-label";
    text.textContent = label;

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-ghost btn-icon";
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `Remove ${label}`);
    removeBtn.disabled = spinning;
    removeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    removeBtn.addEventListener("click", () => removeEntry(i));

    row.append(num, dot, text, removeBtn);
    listEl.appendChild(row);
  });

  countEl.textContent = n === 1 ? "1 choice" : `${n} choices`;
}

// ---------- Result / hint ----------
function renderResult() {
  const n = entries.length;
  resultEl.replaceChildren();

  if (result !== null && !spinning) {
    const kicker = document.createElement("div");
    kicker.className = "kicker";
    kicker.textContent = "The wheel has chosen";

    const name = document.createElement("div");
    name.className = "result-name";
    name.style.borderBottomColor = colorAt(resultIdx, n);
    name.textContent = result;

    resultEl.append(kicker, name);
    return;
  }

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = spinning
    ? "Round and round it goes…"
    : n < 2
      ? "Add at least two choices to spin."
      : "Press Spin when you’re ready.";
  resultEl.appendChild(hint);
}

// ---------- Controls ----------
function renderControls() {
  const n = entries.length;
  input.disabled = spinning;
  addBtn.disabled = spinning || input.value.trim() === "";
  clearBtn.disabled = spinning || n === 0;
  spinBtn.disabled = spinning || n < 2;
  spinBtn.textContent = spinning ? "Spinning…" : "Spin";
}

function render() {
  renderList();
  renderWheel();
  renderResult();
  renderControls();
}

// ---------- Actions ----------
function addEntry() {
  const value = input.value.trim();
  if (value === "" || spinning) return;
  entries.push(value);
  input.value = "";
  result = null;
  render();
  input.focus();
}

function removeEntry(i) {
  if (spinning) return;
  entries.splice(i, 1);
  result = null;
  render();
}

function clearAll() {
  if (spinning) return;
  entries = [];
  input.value = "";
  result = null;
  rotation = 0;
  wheelEl.style.transition = "transform 0.6s ease";
  wheelEl.style.transform = "rotate(0deg)";
  render();
}

function spin() {
  const n = entries.length;
  if (n < 2 || spinning) return;

  const duration = SETTINGS.spinDuration;
  const seg = 360 / n;

  // Pick the winner first, then aim for a spot inside its segment (away from the edges)
  const winner = Math.floor(Math.random() * n);
  const target = winner * seg + seg * (0.15 + Math.random() * 0.7);

  // Rotate forward so the target ends up under the pointer at 12 o'clock
  const current = ((rotation % 360) + 360) % 360;
  const delta = ((360 - target) - current + 720) % 360;
  rotation += 360 * Math.round(duration + 2) + delta;

  wheelEl.style.transition = `transform ${duration}s cubic-bezier(0.12, 0.6, 0.08, 1)`;
  wheelEl.style.transform = `rotate(${rotation}deg)`;

  spinning = true;
  result = null;
  render();

  setTimeout(() => {
    spinning = false;
    result = entries[winner];
    resultIdx = winner;
    render();
    launchConfetti();
  }, duration * 1000 + 150);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  addEntry();
});
input.addEventListener("input", renderControls);
clearBtn.addEventListener("click", clearAll);
spinBtn.addEventListener("click", spin);

// ---------- Confetti ----------
const ctx = canvas.getContext("2d");
let particles = [];
let confettiFrame = null;

function makeParticle(width, height, palette) {
  return {
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.9,
    w: 6 + Math.random() * 7,
    h: 8 + Math.random() * 10,
    vx: (Math.random() - 0.5) * 1.6,
    vy: 1.6 + Math.random() * 2.6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    sway: Math.random() * Math.PI * 2,
    color: palette[Math.floor(Math.random() * palette.length)],
    round: Math.random() < 0.25,
  };
}

function launchConfetti() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const palette = [...colors(), "#e1ad66", "#facb8d"];
  const count = CONFETTI_COUNTS[SETTINGS.confettiAmount] || CONFETTI_COUNTS.Generous;
  for (let i = 0; i < count; i++) particles.push(makeParticle(width, height, palette));

  cancelAnimationFrame(confettiFrame);

  function tick() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter((p) => p.y < height + 30);

    for (const p of particles) {
      p.sway += 0.04;
      p.x += p.vx + Math.sin(p.sway) * 0.8;
      p.y += p.vy;
      p.r += p.vr;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.scale(1, Math.cos(p.sway * 1.7)); // makes rectangles look like they're flipping
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    if (particles.length) confettiFrame = requestAnimationFrame(tick);
  }

  confettiFrame = requestAnimationFrame(tick);
}

// ---------- Start ----------
render();

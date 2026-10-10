const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ---------- Kaydırmaya bağlı animasyonlar ----------
// Kelimeleri tek tek <span> içine al ki sırayla yanabilsinler; her cümle kendi satırında
const HIGHLIGHT_WORDS = /^(matematikçi|usta|mathematician|master)/i;

function splitWords(el, text) {
  const words = text.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = HIGHLIGHT_WORDS.test(word) ? 'word hl' : 'word';
    span.textContent = word;
    span.style.setProperty('--i', i);
    span.style.setProperty('--n', words.length);
    el.append(span, ' ');
    if (word.endsWith('.') && i < words.length - 1) el.append(document.createElement('br'));
  });
}

// ---------- Dil (TR / EN) ----------
// Türkçe metin HTML'de, İngilizcesi data-en özelliğinde durur
const PAGE_TITLES = {
  tr: 'Helyosfer — Matematikçi & Yazılım Geliştirici',
  en: 'Helyosfer — Mathematician & Software Developer',
};
const langToggle = document.querySelector('.lang-toggle');
const translatable = [...document.querySelectorAll('[data-en]')];
translatable.forEach((el) => { el.dataset.tr = el.textContent; });

function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.title = PAGE_TITLES[lang];
  translatable.forEach((el) => {
    if (el.hasAttribute('data-words')) splitWords(el, el.dataset[lang]);
    else el.textContent = el.dataset[lang];
  });
  // Düğme, geçilecek diğer dili gösterir
  langToggle.textContent = lang === 'tr' ? 'EN' : 'TR';
  langToggle.setAttribute('aria-label', lang === 'tr' ? 'Switch to English' : 'Türkçeye geç');
}

function savedLanguage() {
  try { return localStorage.getItem('lang'); } catch { return null; }
}

langToggle.addEventListener('click', () => {
  const next = document.documentElement.lang === 'tr' ? 'en' : 'tr';
  setLanguage(next);
  try { localStorage.setItem('lang', next); } catch {}
});

setLanguage(savedLanguage() === 'en' ? 'en' : 'tr');

// ---------- Arka planda kayan formüller ----------
// Yedi Milenyum Problemi'nin simgesel ifadeleri
// DÜZENLE: listeye yeni formül ekleyebilir, FORMULA_ROWS ile satır sayısını değiştirebilirsin
const FORMULAS = [
  // Riemann Hipotezi
  'ζ(s) = ∑ n<sup>−s</sup>',
  'ζ(s) = 0 ⟹ Re(s) = ½',
  // P – NP
  'P ≟ NP',
  // Navier–Stokes
  '∂u/∂t + (u·∇)u = −∇p + ν∇²u',
  '∇·u = 0',
  // Yang–Mills ve kütle aralığı
  'D<sub>μ</sub>F<sup>μν</sup> = 0',
  'Δ > 0',
  // Birch ve Swinnerton-Dyer
  'ord<sub>s=1</sub> L(E, s) = rank E(ℚ)',
  'y² = x³ + ax + b',
  // Hodge
  'Hdg<sup>k</sup>(X) = H<sup>2k</sup>(X, ℚ) ∩ H<sup>k,k</sup>(X)',
  // Poincaré (çözüldü: Perelman, Ricci akışı)
  'π<sub>1</sub>(M³) = 0 ⟹ M³ ≅ S³',
  '∂g<sub>ij</sub>/∂t = −2R<sub>ij</sub>',
];
const FORMULA_ROWS = 6;

const formulaLayer = document.querySelector('.formulas');
for (let row = 0; row < FORMULA_ROWS; row++) {
  // Her satır listeye farklı bir yerden başlar ve farklı hızda kayar
  const offset = (row * 5) % FORMULAS.length;
  const ordered = [...FORMULAS.slice(offset), ...FORMULAS.slice(0, offset)];
  const half = ordered.map((formula) => `<span>${formula}</span>`).join('');
  const line = document.createElement('div');
  line.className = 'formula-row';
  line.style.setProperty('--duration', `${150 + ((row * 37) % 90)}s`);
  line.innerHTML = half + half;
  formulaLayer.append(line);
}

// Sırayla belirecek öğelere sıra numarası ver
document.querySelectorAll('[data-stagger]').forEach((group) => {
  const items = [...group.children];
  items.forEach((item, i) => {
    item.style.setProperty('--i', i);
    item.style.setProperty('--n', items.length);
  });
});

// ---------- Navier–Stokes girdabı ----------
// Burgers girdabı, Navier–Stokes denklemlerinin tam bir çözümüdür:
//   u_r = -a·r   (içe sarmal)      u_z = 2a·z   (eksenel gerilme)
//   u_θ = Γ/(2πr) · (1 - e^(-r²/δ²))   (çekirdek etrafında dönüş)
// Akış çizgileri bu hız alanı boyunca ilerletilerek bir kez hesaplanır, sonra her karede döndürülüp çizilir.
const flowCanvas = document.getElementById('flow');
const flowCtx = flowCanvas.getContext('2d');
const flowSection = flowCanvas.closest('[data-pin]');

// DÜZENLE: şerit sayısı (dış + çekirdek), dönüş şiddeti, çekirdek yarıçapı ve dönme hızı
const FLOW_LINES = 46;
const FLOW_CORE_LINES = 12;
const FLOW_STEPS = 200;
const FLOW_CHUNKS = 20;
const FLOW_SWIRL = 1.9;
const FLOW_CORE = 0.25;
const FLOW_SPIN = 0.00025;

// Yarıçapa göre renk: dışta camgöbeği, ortada mavi, çekirdekte turuncu
const FLOW_COLORS = [
  { r: 0.0, rgb: [245, 175, 85] },
  { r: 0.16, rgb: [240, 170, 90] },
  { r: 0.3, rgb: [70, 110, 230] },
  { r: 0.55, rgb: [60, 140, 235] },
  { r: 0.9, rgb: [120, 230, 232] },
];

function flowColor(radius) {
  for (let i = 1; i < FLOW_COLORS.length; i++) {
    const a = FLOW_COLORS[i - 1];
    const b = FLOW_COLORS[i];
    if (radius <= b.r) {
      const k = (radius - a.r) / (b.r - a.r);
      return a.rgb.map((channel, j) => channel + (b.rgb[j] - channel) * k);
    }
  }
  return FLOW_COLORS[FLOW_COLORS.length - 1].rgb;
}

// Her şerit için (yarıçap, açı, yükseklik) üçlüleri.
// Dış şeritler tabandan içe sarılır; çekirdek şeritleri eksenin yanında başlayıp yukarı gerilir.
const flowLines = [];
for (let k = 0; k < FLOW_LINES + FLOW_CORE_LINES; k++) {
  const core = k >= FLOW_LINES;
  const z0 = core ? 0.12 + Math.random() * 0.35 : 0.012 + Math.random() ** 1.5 * 0.1;
  const r0 = core ? 0.1 + Math.random() * 0.2 : 0.8 + Math.random() * 0.3;
  // z = z0·e^(2t) tam 1'e (girdabın tepesine) ulaşana kadar geçen süre
  const duration = Math.log(1 / z0) / 2;
  const dt = duration / FLOW_STEPS;
  const points = new Float32Array((FLOW_STEPS + 1) * 3);
  let theta = Math.random() * Math.PI * 2;

  for (let i = 0; i <= FLOW_STEPS; i++) {
    const t = dt * i;
    points[i * 3] = r0 * Math.exp(-t);
    points[i * 3 + 1] = theta;
    points[i * 3 + 2] = z0 * Math.exp(2 * t);

    // Açıyı küçük alt adımlarla ilerlet; çekirdeğe yaklaştıkça dönüş hızlanır
    for (let s = 0; s < 4; s++) {
      const r = r0 * Math.exp(-(t + dt * (s + 0.5) / 4));
      theta += FLOW_SWIRL * (1 - Math.exp(-(r * r) / (FLOW_CORE * FLOW_CORE))) / (r * r) * dt / 4;
    }
  }
  flowLines.push({ points, phase: Math.random(), width: 0.55 + Math.random() * 0.45, beads: [0, 0] });
}

function resizeFlow() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  flowCanvas.width = Math.round(flowCanvas.clientWidth * dpr);
  flowCanvas.height = Math.round(flowCanvas.clientHeight * dpr);
}

function drawFlow(time) {
  const w = flowCanvas.width;
  const h = flowCanvas.height;
  if (!w || !h) return;

  const unit = w / 480;
  const centerX = w / 2;
  const baseY = h * 0.84;
  const radiusScale = w * 0.44;
  const heightScale = h * 0.76;
  const tilt = 0.3;
  const spin = time * FLOW_SPIN;

  // Kaydırma ilerlemesi: çizgiler dıştan içe ve yukarı doğru uzar
  const scrollProgress = parseFloat(flowSection.style.getPropertyValue('--p'));
  const progress = Number.isNaN(scrollProgress) ? 1 : Math.min(1, scrollProgress * 1.3);
  const visible = Math.floor(FLOW_STEPS * progress);

  flowCtx.clearRect(0, 0, w, h);
  flowCtx.lineCap = 'round';
  flowCtx.lineJoin = 'round';

  // Dönme ekseni
  flowCtx.strokeStyle = `rgba(255, 255, 255, ${0.22 * progress})`;
  flowCtx.lineWidth = unit;
  flowCtx.beginPath();
  flowCtx.moveTo(centerX, baseY);
  flowCtx.lineTo(centerX, baseY - heightScale * progress);
  flowCtx.stroke();

  // Şeritleri parçalara böl ve arkadan öne doğru sırala ki derinlik doğru görünsün
  const chunkLength = FLOW_STEPS / FLOW_CHUNKS;
  const chunks = [];
  for (const line of flowLines) {
    // Akışla sürüklenen iki küre: şerit üzerindeki güncel konumları
    line.beads[0] = Math.floor(((time * 0.0001 + line.phase) % 1) * visible);
    line.beads[1] = Math.floor(((time * 0.0001 + line.phase + 0.5) % 1) * visible);

    for (let c = 0; c < FLOW_CHUNKS; c++) {
      const start = c * chunkLength;
      const end = Math.min(start + chunkLength, visible);
      if (end <= start) break;
      const mid = Math.floor((start + end) / 2) * 3;
      const radius = line.points[mid];
      chunks.push({
        line,
        start,
        end,
        radius,
        depth: radius * Math.sin(line.points[mid + 1] + spin),
        along: (c + 0.5) / FLOW_CHUNKS,
      });
    }
  }
  chunks.sort((a, b) => a.depth - b.depth);

  for (const chunk of chunks) {
    const { points, beads } = chunk.line;
    let beadX = 0;
    let beadY = 0;
    let hasBead = false;

    flowCtx.beginPath();
    for (let i = chunk.start; i <= chunk.end; i++) {
      const radius = points[i * 3];
      const angle = points[i * 3 + 1] + spin;
      const x = centerX + radius * Math.cos(angle) * radiusScale;
      const y = baseY - points[i * 3 + 2] * heightScale + radius * Math.sin(angle) * radiusScale * tilt;
      if (i === chunk.start) flowCtx.moveTo(x, y); else flowCtx.lineTo(x, y);
      if (i > chunk.start && (i === beads[0] || i === beads[1])) {
        beadX = x;
        beadY = y;
        hasBead = true;
      }
    }

    // Uçlara doğru incelen şerit; arkadaki parçalar daha koyu
    const width = unit * (0.7 + 4.6 * chunk.line.width * Math.sin(Math.PI * chunk.along) ** 0.8);
    const shade = 0.5 + 0.5 * clamp((chunk.depth + 0.5) / 1.0, 0, 1);
    const [red, green, blue] = flowColor(chunk.radius);

    // Önce koyu bir kenar: üst üste binen şeritler birbirinden ayrışsın
    flowCtx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    flowCtx.lineWidth = width + unit * 2;
    flowCtx.stroke();

    flowCtx.strokeStyle = `rgb(${Math.round(red * shade)}, ${Math.round(green * shade)}, ${Math.round(blue * shade)})`;
    flowCtx.lineWidth = width;
    flowCtx.stroke();

    if (hasBead) {
      flowCtx.fillStyle = `rgb(${Math.round(205 * shade + 30)}, ${Math.round(225 * shade + 25)}, ${Math.round(235 * shade + 20)})`;
      flowCtx.beginPath();
      flowCtx.arc(beadX, beadY, unit * 3.2, 0, Math.PI * 2);
      flowCtx.fill();
    }
  }
}

// Yalnızca bölüm ekrandayken canlandır
let flowRunning = false;
function flowLoop(time) {
  if (!flowRunning) return;
  drawFlow(time);
  requestAnimationFrame(flowLoop);
}

resizeFlow();
new ResizeObserver(() => { resizeFlow(); drawFlow(performance.now()); }).observe(flowCanvas);

if (reducedMotion) {
  drawFlow(0);
} else {
  new IntersectionObserver(([entry]) => {
    const wasRunning = flowRunning;
    flowRunning = entry.isIntersecting;
    if (flowRunning && !wasRunning) requestAnimationFrame(flowLoop);
  }).observe(flowSection);
}

const pinned = [...document.querySelectorAll('[data-pin]')];
const entering = [...document.querySelectorAll('[data-enter]')];
let scrollQueued = false;

function updateScroll() {
  scrollQueued = false;
  const vh = window.innerHeight;
  const scrollable = document.documentElement.scrollHeight - vh;
  document.documentElement.style.setProperty('--scroll', scrollable > 0 ? window.scrollY / scrollable : 0);

  // Sabitlenen bölümler: bölüm boyunca kaydırma ilerlemesi (0 → 1)
  for (const el of pinned) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom < -vh || rect.top > vh * 2) continue;
    // Çok kısa ekranda bölümler sabitlenmez: giriş başlangıç, diğerleri bitiş hâlinde dursun
    if (rect.height <= vh * 1.2) {
      el.style.setProperty('--p', el.classList.contains('hero') ? 0 : 1);
      continue;
    }
    el.style.setProperty('--p', clamp(-rect.top / (rect.height - vh), 0, 1).toFixed(4));
  }

  // Ekrana giren öğeler: alttan girip ekranın ortasına gelene kadar (0 → 1)
  for (const el of entering) {
    const rect = el.getBoundingClientRect();
    if (rect.top > vh * 1.5) continue;
    el.style.setProperty('--e', clamp((vh - rect.top) / (vh * 0.6), 0, 1).toFixed(4));
  }
}

function queueScroll() {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(updateScroll);
  }
}

if (!reducedMotion) {
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);
  updateScroll();
}

// ---------- Mobil menü ----------
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', false);
  });
});

// Alt bilgideki yıl
document.getElementById('year').textContent = new Date().getFullYear();

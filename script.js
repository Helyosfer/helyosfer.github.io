// Ana sayfa. Ortak kod (dil, harf bölme, kaydırma çubuğu, menü, çerçeve koruması) ortak.js'te; o bu dosyadan önce yüklenir.

// ---------- Dil (TR / EN) ----------
initLanguage({
  tr: 'Helyosfer — Matematikçi & Yazılım Geliştirici',
  en: 'Helyosfer — Mathematician & Software Developer',
});

// ---------- Arka planda kayan formüller ----------
// Kalkülüsün tanıdık formülleri, LaTeX ile yazılıp KaTeX ile dizilir
// DÜZENLE: listeye yeni formül ekleyebilir, FORMULA_ROWS ile satır sayısını değiştirebilirsin
const FORMULAS = [
  String.raw`\frac{d}{dx}\ln x = \frac{1}{x}`,
  String.raw`\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}`,
  String.raw`\lim_{n\to\infty}\left(1+\frac{1}{n}\right)^{n} = e`,
  String.raw`\int \frac{1}{x}\,dx = \ln|x| + C`,
  String.raw`f'(x) = \lim_{h\to 0}\frac{f(x+h)-f(x)}{h}`,
  String.raw`\sum_{n=1}^{\infty}\frac{1}{n^2} = \frac{\pi^2}{6}`,
  String.raw`\ln(ab) = \ln a + \ln b`,
  String.raw`\int_a^b f'(x)\,dx = f(b)-f(a)`,
  String.raw`e^{x} = \sum_{n=0}^{\infty}\frac{x^n}{n!}`,
  String.raw`\lim_{x\to 0}\frac{\sin x}{x} = 1`,
  String.raw`\int u\,dv = uv - \int v\,du`,
  String.raw`\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \cdots`,
  String.raw`\frac{d}{dx}e^{x} = e^{x}`,
  String.raw`e^{i\pi} + 1 = 0`,
  String.raw`\int_1^{e}\frac{1}{x}\,dx = 1`,
  String.raw`\frac{d}{dx}\sin x = \cos x`,
];
const FORMULA_ROWS = 6;

// KaTeX yüklenemediyse (ör. çevrimdışı) arka plan boş kalır, sayfa yine çalışır
const formulaLayer = document.querySelector('.formulas');
if (window.katex) {
  const rendered = FORMULAS.map((tex) =>
    `<span class="formula">${katex.renderToString(String.raw`\displaystyle ` + tex, { throwOnError: false })}</span>`
  );
  // Satırın yarısı ekrandan geniş olduğu sürece döngü dikişsiz kalır. Bir formül en az ~200 px tuttuğu için dar ekranda
  // daha az formül yeter (telefonda 16 yerine 6: arka plan ~%60 daha az DOM). Süre de orantılı kısalır ki hız aynı kalsın.
  const perRow = Math.min(rendered.length, Math.max(6, Math.ceil(window.innerWidth / 110)));
  for (let row = 0; row < FORMULA_ROWS; row++) {
    // Her satır listeye farklı bir yerden başlar ve farklı hızda kayar
    const offset = (row * 5) % rendered.length;
    const half = [...rendered.slice(offset), ...rendered.slice(0, offset)].slice(0, perRow).join('');
    const line = document.createElement('div');
    line.className = 'formula-row';
    line.style.setProperty('--duration', `${((150 + ((row * 37) % 90)) * perRow) / rendered.length}s`);
    line.innerHTML = half + half;
    formulaLayer.append(line);
  }
  // Katman yazı tipleri yüklenince görünür (style.css → .formulas). Önce düzeni okumak yazı tiplerinin
  // yüklenmesini başlatır; yoksa fonts.ready, yükleme başlamadan çözülebilirdi.
  void formulaLayer.offsetWidth;
  document.fonts.ready.then(() => formulaLayer.classList.add('ready'));
}

// Sırayla belirecek öğelere sıra numarası ver
document.querySelectorAll('[data-stagger]').forEach((group) => {
  const items = [...group.children];
  items.forEach((item, i) => {
    item.style.setProperty('--i', i);
    item.style.setProperty('--n', items.length);
  });
});

// ---------- Parabol sahnesi ----------
// Matematik bölümünün ilk kısmında y = x² çizilir; üzerinde bir nokta teğetiyle birlikte ilerler.
// DÜZENLE: MATH_INTRO, bölümün ne kadarının parabole ayrılacağını belirler (style.css içindeki --intro ile aynı olmalı)
const MATH_INTRO = 0.38;
const PARABOLA_DRAW = 0.3;

const parabolaCurve = document.querySelector('.parabola-curve');
const parabolaDot = document.querySelector('.parabola-dot');
const parabolaTangent = document.querySelector('.parabola-tangent');

const parabolaPoints = [];
for (let i = 0; i <= 120; i++) {
  const x = -2.1 + (4.2 * i) / 120;
  // SVG'de y aşağı doğru arttığı için eğri ters çevrilir
  parabolaPoints.push(`${x.toFixed(3)} ${(-x * x).toFixed(3)}`);
}
parabolaCurve.setAttribute('d', 'M' + parabolaPoints.join('L'));
const parabolaLength = parabolaCurve.getTotalLength();

function updateParabola(sectionProgress) {
  const drawn = clamp(sectionProgress / PARABOLA_DRAW, 0, 1) * parabolaLength;
  const point = parabolaCurve.getPointAtLength(drawn);
  // Teğetin yönü: eğri üzerinde biraz geri ve biraz ileri iki nokta arasındaki doğrultu
  const before = parabolaCurve.getPointAtLength(Math.max(0, drawn - 0.02));
  const after = parabolaCurve.getPointAtLength(Math.min(parabolaLength, drawn + 0.02));
  const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
  const dx = ((after.x - before.x) / length) * 0.7;
  const dy = ((after.y - before.y) / length) * 0.7;

  parabolaDot.setAttribute('cx', point.x);
  parabolaDot.setAttribute('cy', point.y);
  parabolaTangent.setAttribute('x1', point.x - dx);
  parabolaTangent.setAttribute('y1', point.y - dy);
  parabolaTangent.setAttribute('x2', point.x + dx);
  parabolaTangent.setAttribute('y2', point.y + dy);
}

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

// Şeritlerin parçaları: değişmeyen bilgiler (konum, kalınlık) bir kez hesaplanır
const FLOW_CHUNK_LENGTH = FLOW_STEPS / FLOW_CHUNKS;
const FLOW_SHADES = 64;
const flowChunks = [];
for (const line of flowLines) {
  for (let c = 0; c < FLOW_CHUNKS; c++) {
    const along = (c + 0.5) / FLOW_CHUNKS;
    flowChunks.push({
      line,
      start: c * FLOW_CHUNK_LENGTH,
      end: 0,
      radius: 0,
      depth: 0,
      widthFactor: 0.7 + 4.6 * line.width * Math.sin(Math.PI * along) ** 0.8,
      colors: null, // parça tam görünürken yarıçapı sabittir; renk dizgileri gölge basamağına göre saklanır
    });
  }
}
const visibleChunks = [];

function chunkColor(chunk, shade) {
  const step = Math.round(shade * FLOW_SHADES);
  const full = chunk.end - chunk.start === FLOW_CHUNK_LENGTH;
  if (full && chunk.colors && chunk.colors[step]) return chunk.colors[step];
  const k = step / FLOW_SHADES;
  const [red, green, blue] = flowColor(chunk.radius);
  const color = `rgb(${Math.round(red * k)}, ${Math.round(green * k)}, ${Math.round(blue * k)})`;
  if (full) (chunk.colors ||= [])[step] = color;
  return color;
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
  // Bölümün ilk kısmı parabol sahnesine ayrılmış; girdap ondan sonra başlar
  const progress = Number.isNaN(scrollProgress)
    ? 1
    : Math.min(1, clamp((scrollProgress - MATH_INTRO) / (1 - MATH_INTRO), 0, 1) * 1.3);
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

  // Akışla sürüklenen iki küre: her şerit üzerindeki güncel konumları
  for (const line of flowLines) {
    line.beads[0] = Math.floor(((time * 0.0001 + line.phase) % 1) * visible);
    line.beads[1] = Math.floor(((time * 0.0001 + line.phase + 0.5) % 1) * visible);
  }

  // Görünen parçaları arkadan öne doğru sırala ki derinlik doğru görünsün. Parça nesneleri bir kez kurulur
  // (flowChunks); her karede yalnızca derinlik ve görünen uç güncellenir, yeni nesne üretilmez.
  visibleChunks.length = 0;
  for (const chunk of flowChunks) {
    if (chunk.start >= visible) continue;
    chunk.end = Math.min(chunk.start + FLOW_CHUNK_LENGTH, visible);
    const mid = Math.floor((chunk.start + chunk.end) / 2) * 3;
    chunk.radius = chunk.line.points[mid];
    chunk.depth = chunk.radius * Math.sin(chunk.line.points[mid + 1] + spin);
    visibleChunks.push(chunk);
  }
  visibleChunks.sort((a, b) => a.depth - b.depth);

  for (const chunk of visibleChunks) {
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
    const width = unit * chunk.widthFactor;
    const shade = 0.5 + 0.5 * clamp((chunk.depth + 0.5) / 1.0, 0, 1);

    // Önce koyu bir kenar: üst üste binen şeritler birbirinden ayrışsın
    flowCtx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    flowCtx.lineWidth = width + unit * 2;
    flowCtx.stroke();

    flowCtx.strokeStyle = chunkColor(chunk, shade);
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

// ---------- Helyosfer sahnesi ----------
// Yüzlerce tel kaydırdıkça üç biçim arasında geçer: yandan akan demet (Güneş rüzgârı), ortası parlayan
// ışınsal küre (heliosfer) ve sitenin simgesindeki H. Her telin üç biçimdeki noktaları bir kez hesaplanır;
// her karede bölümün ilerlemesine (--p) göre aralarında karıştırılır. Kökler sönük, uçlar parlak.
// DÜZENLE: tel sayısı (telefonda daha az), tel başına nokta sayısı ve geçiş aralıkları.
// Geçiş aralıkları style.css'teki yazıların dilimleriyle (0.30 ve 0.64) uyumlu olmalı.
const HELIO_STRANDS = 640;
const HELIO_STRANDS_PHONE = 300;
const HELIO_POINTS = 22;
const HELIO_TO_SPHERE = [0.2, 0.42];
const HELIO_TO_H = [0.56, 0.78];
const HELIO_LEVELS = 8; // derinliğe göre parlaklık basamakları: her basamak tek seferde çizilir

const helioCanvas = document.querySelector('.helio-canvas');
const helioCtx = helioCanvas.getContext('2d');
const helioSection = helioCanvas.closest('[data-pin]');
const helioScreen = new Float32Array(HELIO_POINTS * 2);
let helioStrands = [];
let helioPinned = false;

const smooth = (t) => t * t * (3 - 2 * t);

// Demetin omurgası: sağ üstten girip sola doğru inen bir eğri (kübik Bézier)
const BUNDLE_SPINE = [[1.9, -1.15], [0.8, -0.8], [0.25, -0.05], [-0.3, 0.45]];
function bundleSpine(s) {
  const k = [(1 - s) ** 3, 3 * (1 - s) ** 2 * s, 3 * (1 - s) * s * s, s ** 3];
  return [0, 1].map((axis) => k.reduce((sum, weight, i) => sum + weight * BUNDLE_SPINE[i][axis], 0));
}

function buildHelio(count) {
  helioStrands = [];
  for (let n = 0; n < count; n++) {
    const bundle = new Float32Array(HELIO_POINTS * 3);
    const sphere = new Float32Array(HELIO_POINTS * 3);
    const letter = new Float32Array(HELIO_POINTS * 3);

    // Demet: tel, kesitte bir dairenin içinde durur; uca doğru açılır ve demetin ekseni etrafında burulur
    const ringRadius = Math.sqrt(Math.random());
    const ringAngle = Math.random() * Math.PI * 2;
    const reach = 0.82 + Math.random() * 0.18;

    // Küre: yönler Fibonacci dağılımıyla küreye eşit yayılır; her diken bir yana hafifçe kıvrılır
    const y = 1 - (2 * (n + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const dir = [Math.cos(n * 2.399963) * ring, y, Math.sin(n * 2.399963) * ring];
    const side = ring > 0.01 ? [-dir[2] / ring, 0, dir[0] / ring] : [1, 0, 0];
    const spike = 0.36 + Math.random() * 0.16;

    // H: tellerin %42'si sol sütunda, %42'si sağ sütunda (kökler altta), %16'sı ortadaki çizgide
    const pick = Math.random();
    const depth = (Math.random() - 0.5) * 0.08;
    let from;
    let to;
    if (pick < 0.84) {
      const x = (pick < 0.42 ? -0.42 : 0.22) + Math.random() * 0.2;
      from = [x, 0.5 - Math.random() * 0.03];
      to = [x, -0.5 + Math.random() * 0.03];
    } else {
      const bar = -0.07 + Math.random() * 0.14;
      from = [-0.24 + Math.random() * 0.02, bar];
      to = [0.24 - Math.random() * 0.02, bar];
    }

    for (let i = 0; i < HELIO_POINTS; i++) {
      const s = i / (HELIO_POINTS - 1);
      const o = i * 3;

      const t = s * reach;
      const [bx, by] = bundleSpine(t);
      const spread = 0.04 + 0.5 * t ** 2.4;
      const twist = ringAngle + t * 2.6;
      const across = Math.cos(twist) * ringRadius * spread;
      bundle[o] = bx + 0.58 * across;
      bundle[o + 1] = by + 0.81 * across;
      bundle[o + 2] = Math.sin(twist) * ringRadius * spread;

      const radius = 0.13 + spike * s;
      const curl = 0.1 * s * s;
      for (let a = 0; a < 3; a++) sphere[o + a] = dir[a] * radius + side[a] * curl;

      letter[o] = from[0] + (to[0] - from[0]) * s;
      letter[o + 1] = from[1] + (to[1] - from[1]) * s;
      letter[o + 2] = depth;
    }
    helioStrands.push({ bundle, sphere, letter, delay: Math.random() * 0.3, phase: Math.random() * Math.PI * 2 });
  }
}

function resizeHelio() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  helioCanvas.width = Math.round(helioCanvas.clientWidth * dpr);
  helioCanvas.height = Math.round(helioCanvas.clientHeight * dpr);
  // Sabitlenmeyen hâlde (hareket azaltma, kısa ekran) küre gösterilir
  helioPinned = helioSection.offsetHeight > window.innerHeight * 1.2;
  const count = helioCanvas.clientWidth < 560 ? HELIO_STRANDS_PHONE : HELIO_STRANDS;
  if (count !== helioStrands.length) buildHelio(count);
}

function drawHelio(time) {
  const w = helioCanvas.width;
  const h = helioCanvas.height;
  if (!w || !h) return;

  const scrollProgress = parseFloat(helioSection.style.getPropertyValue('--p'));
  const p = helioPinned && !Number.isNaN(scrollProgress) ? scrollProgress : 0.5;
  const toSphere = clamp((p - HELIO_TO_SPHERE[0]) / (HELIO_TO_SPHERE[1] - HELIO_TO_SPHERE[0]), 0, 1);
  const toLetter = clamp((p - HELIO_TO_H[0]) / (HELIO_TO_H[1] - HELIO_TO_H[0]), 0, 1);

  // Küre kaydırdıkça döner ve hafifçe öne eğilir; demet ve H düz durur
  const sphereWeight = smooth(toSphere) * (1 - smooth(toLetter));
  const turn = sphereWeight * (p * 5 + Math.sin(time * 0.0004) * 0.3);
  const tilt = sphereWeight * 0.35;
  const cosY = Math.cos(turn);
  const sinY = Math.sin(turn);
  const cosX = Math.cos(tilt);
  const sinX = Math.sin(tilt);

  // Telefonda sahne dar; şekil alanı biraz daha doldursun
  const unit = Math.min(w, h) * (helioCanvas.clientWidth < 560 ? 0.46 : 0.4);
  const cx = w / 2;
  const cy = h / 2;
  const wave = time * 0.0012;

  helioCtx.clearRect(0, 0, w, h);
  helioCtx.globalCompositeOperation = 'lighter';

  // Kürenin ortasındaki sıcak ışık
  if (sphereWeight > 0.01) {
    const glow = helioCtx.createRadialGradient(cx, cy, 0, cx, cy, unit * 0.6);
    glow.addColorStop(0, `rgba(255, 226, 180, ${0.55 * sphereWeight})`);
    glow.addColorStop(0.35, `rgba(255, 170, 90, ${0.18 * sphereWeight})`);
    glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
    helioCtx.fillStyle = glow;
    helioCtx.fillRect(cx - unit, cy - unit, unit * 2, unit * 2);
  }

  const paths = Array.from({ length: HELIO_LEVELS }, () => new Path2D());
  const tips = new Path2D();
  const tipSize = Math.max(1, w / 900);

  for (const strand of helioStrands) {
    // Teller aynı anda değil, biraz dağınık sırayla biçim değiştirir
    const a = smooth(clamp(toSphere * 1.3 - strand.delay, 0, 1));
    const b = smooth(clamp(toLetter * 1.3 - strand.delay, 0, 1));
    let depthSum = 0;

    for (let i = 0; i < HELIO_POINTS; i++) {
      const o = i * 3;
      let x = strand.bundle[o] + (strand.sphere[o] - strand.bundle[o]) * a;
      let y = strand.bundle[o + 1] + (strand.sphere[o + 1] - strand.bundle[o + 1]) * a;
      let z = strand.bundle[o + 2] + (strand.sphere[o + 2] - strand.bundle[o + 2]) * a;
      x += (strand.letter[o] - x) * b;
      y += (strand.letter[o + 1] - y) * b;
      z += (strand.letter[o + 2] - z) * b;
      // Demet rüzgârda hafifçe dalgalanır
      y += (1 - a) * 0.025 * Math.sin(wave + i * 0.35 + strand.phase);

      // Döndür, sonra perspektifle ekrana yansıt
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const scale = 2.8 / (2.8 - z2);
      helioScreen[i * 2] = cx + x1 * scale * unit;
      helioScreen[i * 2 + 1] = cy + y1 * scale * unit;
      depthSum += z2;
    }

    const level = clamp(Math.floor((depthSum / HELIO_POINTS + 0.6) / 1.2 * HELIO_LEVELS), 0, HELIO_LEVELS - 1);
    const path = paths[level];
    path.moveTo(helioScreen[0], helioScreen[1]);
    for (let i = 1; i < HELIO_POINTS; i++) path.lineTo(helioScreen[i * 2], helioScreen[i * 2 + 1]);
    const last = (HELIO_POINTS - 1) * 2;
    tips.rect(helioScreen[last] - tipSize, helioScreen[last + 1] - tipSize, tipSize * 2, tipSize * 2);
  }

  helioCtx.lineWidth = Math.max(1, w / 1400);
  for (let level = 0; level < HELIO_LEVELS; level++) {
    helioCtx.strokeStyle = `rgba(214, 220, 232, ${0.08 + (0.22 * level) / (HELIO_LEVELS - 1)})`;
    helioCtx.stroke(paths[level]);
  }
  helioCtx.fillStyle = 'rgba(255, 196, 120, 0.85)';
  helioCtx.fill(tips);
  helioCtx.globalCompositeOperation = 'source-over';
}

// Yalnızca bölüm ekrandayken canlandır
let helioRunning = false;
function helioLoop(time) {
  if (!helioRunning) return;
  drawHelio(time);
  requestAnimationFrame(helioLoop);
}

resizeHelio();
new ResizeObserver(() => { resizeHelio(); drawHelio(performance.now()); }).observe(helioCanvas);

if (reducedMotion) {
  drawHelio(0);
} else {
  new IntersectionObserver(([entry]) => {
    const wasRunning = helioRunning;
    helioRunning = entry.isIntersecting;
    if (helioRunning && !wasRunning) requestAnimationFrame(helioLoop);
  }).observe(helioSection);
}

const pinned = [...document.querySelectorAll('[data-pin]')];
const entering = [...document.querySelectorAll('[data-enter]')];

function updateScroll() {
  const vh = window.innerHeight;
  const scrollable = document.documentElement.scrollHeight - vh;
  // Önce bütün ölçümler, sonra bütün yazmalar: arada yazılan bir stil sonraki ölçümü yeniden hesaplatmasın
  const pinnedRects = pinned.map((el) => el.getBoundingClientRect());
  const enteringTops = entering.map((el) => el.getBoundingClientRect().top);

  updateProgress(scrollable);

  // Sabitlenen bölümler: bölüm boyunca kaydırma ilerlemesi (0 → 1)
  pinned.forEach((el, i) => {
    const rect = pinnedRects[i];
    if (rect.bottom < -vh || rect.top > vh * 2) return;
    // Çok kısa ekranda bölümler sabitlenmez: giriş başlangıç, diğerleri bitiş hâlinde dursun
    if (rect.height <= vh * 1.2) {
      el.style.setProperty('--p', el.classList.contains('hero') ? 0 : 1);
      return;
    }
    const progress = clamp(-rect.top / (rect.height - vh), 0, 1);
    el.style.setProperty('--p', progress.toFixed(4));
    if (el === flowSection) updateParabola(progress);
  });

  // Ekrana giren öğeler: alttan girip ekranın ortasına gelene kadar (0 → 1)
  entering.forEach((el, i) => {
    const top = enteringTops[i];
    if (top > vh * 1.5) return;
    el.style.setProperty('--e', clamp((vh - top) / (vh * 0.6), 0, 1).toFixed(4));
  });
}

if (!reducedMotion) onScrollFrame(updateScroll);

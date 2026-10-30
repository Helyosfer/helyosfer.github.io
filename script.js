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
// NASA'nın "Heliopause Cycle" videosundaki akışı izler. Kaydırdıkça üç biçim arasında geçer:
//  1) Güneş rüzgârı: dokulu, parlayan Güneş; her yöne fırlayan parçacık izleri ve yanda hilal bir gezegen.
//  2) Helyosfer: kamera geri çekilir, Güneş bir noktaya iner, kuyruklu kabarcık açılır. İçeride parçacıklar
//     Güneş'ten sonlanma şokuna (ince halkalar) koşar, oradan kabarcığın duvarı boyunca kuyruğa süpürülür.
//     Duvar (helyopoz) yavaşça nefes alıp verir; dışarıda yıldızlararası rüzgâr kabarcığın çevresinden akar.
//  3) Sitenin simgesindeki H.
// Her tel bir parçacık izi. Her karede telin üç biçimdeki noktaları hesaplanır ve bölümün ilerlemesine (--p)
// göre aralarında karıştırılır. Hareket azaltılınca zaman durur, helyosfer sabit görünür.
// DÜZENLE: tel sayısı (telefonda daha az), renkler, ölçüler ve geçiş aralıkları.
// Geçiş aralıkları style.css'teki yazıların dilimleriyle (0.30 ve 0.64) uyumlu olmalı.
const HELIO_STRANDS = 640;
const HELIO_STRANDS_PHONE = 300;
const HELIO_POINTS = 14;
const HELIO_TO_SPHERE = [0.2, 0.42];
const HELIO_TO_H = [0.56, 0.78];
const HELIO_LEVELS = 8; // parlaklık basamakları: her basamak tek seferde çizilir

// Tel türleri ve renkleri: [r, g, b, en sönük opaklık, en parlak opaklık]
const WIND = 0; // Güneş rüzgârı parçacıkları
const WALL = 1; // helyopoz: kabarcığın duvarı
const ISM = 2; // yıldızlararası rüzgâr
const HELIO_COLORS = [
  [218, 222, 232, 0.12, 0.5],
  [255, 172, 128, 0.08, 0.42],
  [200, 186, 176, 0.03, 0.1],
];

// Ölçüler ("unit" cinsinden; unit ≈ sahnenin kısa kenarının %40'ı)
const SUN_R = 0.3; // 1. adımda Güneş'in yarıçapı
const BUBBLE_R = 0.64; // kabarcığın yan yarıçapı
const BUBBLE_NOSE = 0.56; // Güneş'ten burna uzaklık (burun yıldızlararası rüzgâra bakar, biraz basıktır)
const BUBBLE_TAIL = 1.5; // kuyruğun uzunluğu
const BUBBLE_CAP = 0.3; // duvar profilinde yuvarlak baş kısmın payı
const SHOCK_R = 0.27; // sonlanma şoku (iç halka)
const BUBBLE_SHIFT = [-0.24, -0.12]; // kuyruğa yer açmak için Güneş biraz sola ve yukarı kayar

const helioCanvas = document.querySelector('.helio-canvas');
const helioCtx = helioCanvas.getContext('2d');
const helioSection = helioCanvas.closest('[data-pin]');
const helioScreen = new Float32Array(HELIO_POINTS * 2);
let helioStrands = [];
let helioPinned = false;
let sunTexture = null;

const smooth = (t) => t * t * (3 - 2 * t);
const mix = (from, to, t) => from + (to - from) * t;

// Kabarcığın ekseni (kuyruk yönü) ve ona dik iki yön; her karede bakış açısına göre yeniden hesaplanır
const axis = new Float32Array(3);
const axisU = new Float32Array(3);
const axisV = new Float32Array(3);
const profilePoint = new Float32Array(2);
const local = new Float32Array(3);

// Duvarın yan kesiti: u = 0 burun, u = 1 kuyruğun ucu. [eksen boyunca konum, eksene uzaklık]
function bubbleProfile(u) {
  if (u < BUBBLE_CAP) {
    const angle = (u / BUBBLE_CAP) * Math.PI / 2;
    profilePoint[0] = -BUBBLE_NOSE * Math.cos(angle);
    profilePoint[1] = BUBBLE_R * Math.sin(angle);
  } else {
    const t = (u - BUBBLE_CAP) / (1 - BUBBLE_CAP);
    profilePoint[0] = BUBBLE_TAIL * t;
    profilePoint[1] = BUBBLE_R * (1 - 0.14 * t * t);
  }
}

// Kuyruğa doğru solma (1: tam parlak)
function tailFade(u) {
  const t = Math.max(0, (u - BUBBLE_CAP) / (1 - BUBBLE_CAP));
  return 1 - t ** 2.2;
}

// Güneş yüzeyi bir kez, ekran dışı bir canvas'a çizilir: sıcak renk, tanecikli doku, kenarda kararma
function makeSunTexture() {
  const size = 256;
  const r = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.clip();
  const base = g.createRadialGradient(r * 0.8, r * 0.78, 0, r, r, r);
  base.addColorStop(0, '#fff7e2');
  base.addColorStop(0.3, '#ffd88a');
  base.addColorStop(0.75, '#f5a04a');
  base.addColorStop(1, '#c75f22');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const dot = 1.5 + Math.random() * 6;
    g.fillStyle = Math.random() < 0.55 ? 'rgba(150, 50, 0, 0.13)' : 'rgba(255, 244, 214, 0.14)';
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, dot, 0, Math.PI * 2);
    g.fill();
  }
  const limb = g.createRadialGradient(r, r, r * 0.5, r, r, r);
  limb.addColorStop(0, 'rgba(90, 20, 0, 0)');
  limb.addColorStop(1, 'rgba(90, 20, 0, 0.6)');
  g.fillStyle = limb;
  g.fillRect(0, 0, size, size);
  return canvas;
}

function buildHelio(count) {
  helioStrands = [];
  for (let n = 0; n < count; n++) {
    const pick = Math.random();
    const role = pick < 0.5 ? WIND : pick < 0.92 ? WALL : ISM;

    // Yönler Fibonacci dağılımıyla küreye eşit yayılır (Güneş'ten fırlayan izler ve kabarcıktaki parçacıklar)
    const y = 1 - (2 * (n + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const dir = [Math.cos(n * 2.399963) * ring, y, Math.sin(n * 2.399963) * ring];

    // Kabarcıkta: dir[0] kuyruk yönü. Burundan açı ve eksen çevresindeki açı
    const fromNose = Math.acos(clamp(-dir[0], -1, 1));
    const around = Math.atan2(dir[2], dir[1]);
    const startU = fromNose <= Math.PI / 2
      ? BUBBLE_CAP * (fromNose / (Math.PI / 2))
      : BUBBLE_CAP + ((fromNose - Math.PI / 2) / (Math.PI / 2)) * 0.12;

    // H: tellerin %42'si sol sütunda, %42'si sağ sütunda (kökler altta), %16'sı ortadaki çizgide
    const letter = new Float32Array(HELIO_POINTS * 3);
    const hPick = Math.random();
    const depth = (Math.random() - 0.5) * 0.08;
    let from;
    let to;
    if (hPick < 0.84) {
      const x = (hPick < 0.42 ? -0.42 : 0.22) + Math.random() * 0.2;
      from = [x, 0.5 - Math.random() * 0.03];
      to = [x, -0.5 + Math.random() * 0.03];
    } else {
      const bar = -0.07 + Math.random() * 0.14;
      from = [-0.24 + Math.random() * 0.02, bar];
      to = [0.24 - Math.random() * 0.02, bar];
    }
    for (let i = 0; i < HELIO_POINTS; i++) {
      const s = i / (HELIO_POINTS - 1);
      letter[i * 3] = from[0] + (to[0] - from[0]) * s;
      letter[i * 3 + 1] = from[1] + (to[1] - from[1]) * s;
      letter[i * 3 + 2] = depth;
    }

    helioStrands.push({
      role,
      dir,
      around,
      startU,
      shock: SHOCK_R * (1 + 0.35 * dir[0]), // şok, kuyruk tarafında daha uzakta
      letter,
      delay: Math.random() * 0.3,
      phase: Math.random(),
      // 1. adım: Güneş'ten fırlama hızı ve iz uzunluğu
      sunSpeed: 1 / (2600 + Math.random() * 2200),
      sunLength: 0.6 + Math.random() * 0.8,
      // 2. adım: tür başına hız ve iz uzunluğu
      speed: role === WIND ? 1 / (7000 + Math.random() * 5000)
        : role === WALL ? 1 / (22000 + Math.random() * 14000)
          : 1 / (9000 + Math.random() * 6000),
      length: role === WIND ? 0.03 + Math.random() * 0.04
        : role === WALL ? 0.04 + Math.random() * 0.06
          : 0.06 + Math.random() * 0.08,
      wallAround: Math.random() * Math.PI * 2,
      wallRadius: 0.97 + Math.random() * 0.06,
      ismDistance: BUBBLE_R * (1.1 + Math.random() * 1.3),
    });
  }
}

function resizeHelio() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  helioCanvas.width = Math.round(helioCanvas.clientWidth * dpr);
  helioCanvas.height = Math.round(helioCanvas.clientHeight * dpr);
  // Sabitlenmeyen hâlde (hareket azaltma, kısa ekran) helyosfer gösterilir
  helioPinned = helioSection.offsetHeight > window.innerHeight * 1.2;
  const count = helioCanvas.clientWidth < 560 ? HELIO_STRANDS_PHONE : HELIO_STRANDS;
  if (count !== helioStrands.length) buildHelio(count);
}

// Kabarcıktaki bir noktayı (yerel koordinat: [kuyruk yönü, iki yan]) ekran düzlemine çevirir
function bubbleToView(lx, ly, lz, out, o) {
  out[o] = axis[0] * lx + axisU[0] * ly + axisV[0] * lz + BUBBLE_SHIFT[0];
  out[o + 1] = axis[1] * lx + axisU[1] * ly + axisV[1] * lz + BUBBLE_SHIFT[1];
  out[o + 2] = axis[2] * lx + axisU[2] * ly + axisV[2] * lz;
}

// 2. adımda bir telin s'inci noktası (s = 0 izin kuyruğu, 1 başı). Görünürlüğü (0–1) döndürür.
const bubblePoint = new Float32Array(3);
function bubbleStrandPoint(strand, s, time, size) {
  if (strand.role === WIND) {
    // Güneş → sonlanma şoku (düz), sonra duvar boyunca kuyruğa
    const head = (strand.phase + time * strand.speed) % 1;
    const tau = Math.max(0, head - strand.length * (1 - s));
    const shock = strand.shock * size;
    const d = strand.dir;
    if (tau < 0.45) {
      const r = shock * (tau / 0.45);
      bubbleToView(d[0] * r, d[1] * r, d[2] * r, bubblePoint, 0);
    } else {
      const q = (tau - 0.45) / 0.55;
      const u = strand.startU + (1 - strand.startU) * q ** 1.4 * 0.92;
      bubbleProfile(u);
      const wx = profilePoint[0] * 0.86 * size;
      const wr = profilePoint[1] * 0.86 * size;
      const m = smooth(Math.min(1, q * 2.2));
      bubbleToView(
        mix(d[0] * shock, wx, m),
        mix(d[1] * shock, wr * Math.cos(strand.around), m),
        mix(d[2] * shock, wr * Math.sin(strand.around), m),
        bubblePoint, 0,
      );
    }
    if (head < 0.45) return Math.min(1, head * 12);
    const q = (head - 0.45) / 0.55;
    return tailFade(strand.startU + (1 - strand.startU) * q ** 1.4 * 0.92);
  }

  if (strand.role === WALL) {
    // Duvar boyunca burundan kuyruğa akan izler; eksen çevresinde çok yavaş döner
    const head = 0.04 + ((strand.phase + time * strand.speed) % 1) * 1.08;
    const u = clamp(head - strand.length * (1 - s), 0.04, 1);
    bubbleProfile(u);
    const r = profilePoint[1] * strand.wallRadius * size;
    const angle = strand.wallAround + time * 0.00004;
    bubbleToView(profilePoint[0] * size, r * Math.cos(angle), r * Math.sin(angle), bubblePoint, 0);
    if (head > 1) return 0;
    // Kenardan (silüetten) görülen duvar daha parlak: videodaki parlayan kabuk
    const facing = Math.abs(axisU[2] * Math.cos(angle) + axisV[2] * Math.sin(angle));
    return Math.min(1, (head - 0.04) * 10) * tailFade(head) * (1 - 0.7 * facing);
  }

  // Yıldızlararası rüzgâr: burun tarafından gelir, kabarcığın çevresinden dolaşıp kuyruk yönünde gider
  const flow = (strand.phase + time * strand.speed) % 1;
  const head = -1.3 + flow * 3.4;
  const x = head - strand.length * 1.4 * (1 - s);
  let wall = 0;
  if (x > -BUBBLE_NOSE && x <= 0) wall = BUBBLE_R * Math.sqrt(1 - (x / BUBBLE_NOSE) ** 2);
  else if (x > 0) wall = BUBBLE_R * (1 - 0.14 * Math.min(1, x / BUBBLE_TAIL) ** 2);
  const r = Math.sqrt(strand.ismDistance ** 2 + (wall * size) ** 2);
  bubbleToView(x * size, r * Math.cos(strand.wallAround), r * Math.sin(strand.wallAround), bubblePoint, 0);
  return Math.sin(Math.PI * flow);
}

function drawHelio(time) {
  const w = helioCanvas.width;
  const h = helioCanvas.height;
  if (!w || !h) return;

  const scrollProgress = parseFloat(helioSection.style.getPropertyValue('--p'));
  const p = helioPinned && !Number.isNaN(scrollProgress) ? scrollProgress : 0.5;
  const toSphere = clamp((p - HELIO_TO_SPHERE[0]) / (HELIO_TO_SPHERE[1] - HELIO_TO_SPHERE[0]), 0, 1);
  const toLetter = clamp((p - HELIO_TO_H[0]) / (HELIO_TO_H[1] - HELIO_TO_H[0]), 0, 1);

  const pulledBack = smooth(toSphere); // 0: Güneş yakında, 1: kamera geri çekildi
  const bubbleWeight = pulledBack * (1 - smooth(toLetter));
  const sunWeight = 1 - pulledBack;
  // Geri çekilirken kısa bir ışık patlaması (videodaki gibi)
  const flash = Math.sin(Math.PI * pulledBack) ** 2;

  // 1. adım: kamera yavaşça geri çekilir; geçişte her şey Güneş'e doğru küçülür
  const sunZoom = (1 - 0.16 * smooth(clamp(p / HELIO_TO_SPHERE[0], 0, 1))) * (1 - 0.85 * pulledBack);
  // 2. adım: kabarcık geçişte büyüyerek açılır; duvar yavaşça nefes alıp verir (helyopoz döngüsü)
  const bubbleSize = (0.35 + 0.65 * pulledBack) * (1 + 0.05 * Math.sin(time * 0.0007));

  // Kabarcığın ekseni: kuyruk sağa, aşağıya ve ekranın içine doğru; kaydırdıkça hafifçe döner
  const yaw = 0.36 + p * 0.3;
  const pitch = 0.36;
  axis[0] = Math.cos(pitch) * Math.cos(yaw);
  axis[1] = Math.sin(pitch);
  axis[2] = -Math.cos(pitch) * Math.sin(yaw);
  const across = Math.hypot(axis[0], axis[1]);
  axisU[0] = axis[1] / across;
  axisU[1] = -axis[0] / across;
  axisU[2] = 0;
  axisV[0] = axis[1] * axisU[2] - axis[2] * axisU[1];
  axisV[1] = axis[2] * axisU[0] - axis[0] * axisU[2];
  axisV[2] = axis[0] * axisU[1] - axis[1] * axisU[0];

  // Telefonda sahne dar; şekil alanı biraz daha doldursun
  const unit = Math.min(w, h) * (helioCanvas.clientWidth < 560 ? 0.46 : 0.4);
  const cx = w / 2;
  const cy = h / 2;
  const line = Math.max(1, w / 1400);
  const sunX = cx + BUBBLE_SHIFT[0] * pulledBack * unit;
  const sunY = cy + BUBBLE_SHIFT[1] * pulledBack * unit;

  helioCtx.clearRect(0, 0, w, h);

  // 1. adım: Güneş'in yanındaki hilal gezegen (Güneş'e bakan yüzü aydınlık)
  if (sunWeight > 0.01) {
    const px = sunX + 0.95 * sunZoom * unit;
    const py = sunY - 0.42 * sunZoom * unit;
    const pr = 0.055 * sunZoom * unit;
    const toSun = Math.hypot(px - sunX, py - sunY) || 1;
    const lx = px + ((sunX - px) / toSun) * pr * 0.9;
    const ly = py + ((sunY - py) / toSun) * pr * 0.9;
    const lit = helioCtx.createRadialGradient(lx, ly, 0, lx, ly, pr * 1.7);
    lit.addColorStop(0, `rgba(226, 232, 242, ${0.95 * sunWeight})`);
    lit.addColorStop(0.45, `rgba(120, 140, 170, ${0.35 * sunWeight})`);
    lit.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    helioCtx.save();
    helioCtx.beginPath();
    helioCtx.arc(px, py, pr, 0, Math.PI * 2);
    helioCtx.clip();
    helioCtx.fillStyle = lit;
    helioCtx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    helioCtx.restore();
  }

  helioCtx.globalCompositeOperation = 'lighter';

  // 1. adım: Güneş'in tacı (korona)
  if (sunWeight > 0.01) {
    const r = SUN_R * sunZoom * unit;
    const corona = helioCtx.createRadialGradient(sunX, sunY, r * 0.8, sunX, sunY, r * 2.6);
    corona.addColorStop(0, `rgba(255, 196, 120, ${0.4 * sunWeight})`);
    corona.addColorStop(0.35, `rgba(255, 150, 70, ${0.12 * sunWeight})`);
    corona.addColorStop(1, 'rgba(255, 150, 70, 0)');
    helioCtx.fillStyle = corona;
    helioCtx.fillRect(sunX - r * 2.6, sunY - r * 2.6, r * 5.2, r * 5.2);
  }

  // 2. adım: kabarcığın yuvarlak başındaki sıcak parıltı (helyopoz) ve ortadaki Güneş noktası
  const capR = BUBBLE_R * bubbleSize * unit;
  if (bubbleWeight > 0.01) {
    const rim = helioCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, capR * 1.18);
    rim.addColorStop(0, 'rgba(255, 160, 120, 0)');
    rim.addColorStop(0.62, `rgba(150, 90, 140, ${0.05 * bubbleWeight})`);
    rim.addColorStop(0.84, `rgba(255, 150, 110, ${0.2 * bubbleWeight})`);
    rim.addColorStop(1, 'rgba(255, 150, 110, 0)');
    helioCtx.fillStyle = rim;
    helioCtx.fillRect(sunX - capR * 1.2, sunY - capR * 1.2, capR * 2.4, capR * 2.4);

    // Kabarcığın dış hattı (yandan görünen kenarı): burunda parlak, kuyruğa doğru söner.
    // İçi sitenin vurgu rengiyle çok hafif dolar (videodaki mor iç kısım)
    const outline = new Path2D();
    const toScreen = (lx, side) => {
      bubbleProfile(lx);
      const x = profilePoint[0] * bubbleSize;
      const r = profilePoint[1] * bubbleSize * side;
      const z = axis[2] * x;
      const scale = 2.8 / (2.8 - z);
      return [
        cx + (axis[0] * x + axisU[0] * r + BUBBLE_SHIFT[0]) * scale * unit,
        cy + (axis[1] * x + axisU[1] * r + BUBBLE_SHIFT[1]) * scale * unit,
      ];
    };
    for (let i = 40; i >= 0; i--) outline.lineTo(...toScreen(i / 40, 1));
    for (let i = 1; i <= 40; i++) outline.lineTo(...toScreen(i / 40, -1));
    const [noseX, noseY] = toScreen(0, 1);
    const tailX = cx + (axis[0] * BUBBLE_TAIL * bubbleSize + BUBBLE_SHIFT[0]) * unit;
    const tailY = cy + (axis[1] * BUBBLE_TAIL * bubbleSize + BUBBLE_SHIFT[1]) * unit;
    const along = (r, g, bl, alpha) => {
      const gradient = helioCtx.createLinearGradient(noseX, noseY, tailX, tailY);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${bl}, ${alpha})`);
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${bl}, ${alpha * 0.6})`);
      gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${bl}, 0)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${bl}, 0)`);
      return gradient;
    };
    helioCtx.fillStyle = along(150, 120, 230, 0.07 * bubbleWeight);
    helioCtx.fill(outline);
    helioCtx.strokeStyle = along(255, 156, 112, 0.16 * bubbleWeight);
    helioCtx.lineWidth = unit * 0.05;
    helioCtx.stroke(outline);
    helioCtx.strokeStyle = along(255, 190, 150, 0.5 * bubbleWeight);
    helioCtx.lineWidth = line * 1.4;
    helioCtx.stroke(outline);
  }
  const glowWeight = Math.min(1, 0.6 * bubbleWeight + 0.9 * flash);
  if (glowWeight > 0.01) {
    const r = unit * (0.32 + 0.35 * flash);
    const glow = helioCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r);
    glow.addColorStop(0, `rgba(255, 244, 226, ${glowWeight})`);
    glow.addColorStop(0.08, `rgba(255, 220, 170, ${0.55 * glowWeight})`);
    glow.addColorStop(0.3, `rgba(255, 170, 90, ${0.1 * glowWeight})`);
    glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
    helioCtx.fillStyle = glow;
    helioCtx.fillRect(sunX - r, sunY - r, r * 2, r * 2);
  }

  const paths = HELIO_COLORS.map(() => Array.from({ length: HELIO_LEVELS }, () => new Path2D()));
  const tips = new Path2D();
  const tipSize = Math.max(1, w / 900);

  for (const strand of helioStrands) {
    // Teller aynı anda değil, biraz dağınık sırayla biçim değiştirir
    const a = smooth(clamp(toSphere * 1.3 - strand.delay, 0, 1));
    const b = smooth(clamp(toLetter * 1.3 - strand.delay, 0, 1));
    const d = strand.dir;

    // 1. adım: Güneş yüzeyinden dışarı fırlayan iz; uzaklaştıkça söner. Geçişte iz uzar (hız çizgileri)
    const flight = (strand.phase + time * strand.sunSpeed) % 1;
    const sunHead = SUN_R * (1.04 + flight * 2.6);
    const sunTrail = SUN_R * (0.12 + 0.55 * flight) * strand.sunLength * (1 + 4 * flash);
    const sunVisible = (1 - flight) ** 1.3 * Math.min(1, flight * 10);

    let visible = 0;
    let depthSum = 0;
    for (let i = 0; i < HELIO_POINTS; i++) {
      const s = i / (HELIO_POINTS - 1);
      let x = 0;
      let y = 0;
      let z = 0;
      if (a < 1) {
        const r = Math.max(SUN_R * 1.02, sunHead - sunTrail * (1 - s)) * sunZoom;
        x = (d[0] * r + BUBBLE_SHIFT[0] * pulledBack) * (1 - a);
        y = (d[1] * r + BUBBLE_SHIFT[1] * pulledBack) * (1 - a);
        z = d[2] * r * (1 - a);
      }
      if (a > 0 && b < 1) {
        const seen = bubbleStrandPoint(strand, s, time, bubbleSize);
        x += bubblePoint[0] * a;
        y += bubblePoint[1] * a;
        z += bubblePoint[2] * a;
        if (i === HELIO_POINTS - 1) visible = sunVisible * (1 - a) + seen * a;
      } else if (i === HELIO_POINTS - 1) {
        visible = sunVisible;
      }
      if (b > 0) {
        const o = i * 3;
        x += (strand.letter[o] - x) * b;
        y += (strand.letter[o + 1] - y) * b;
        z += (strand.letter[o + 2] - z) * b;
      }

      // Perspektifle ekrana yansıt
      const scale = 2.8 / (2.8 - Math.min(z, 1.6));
      helioScreen[i * 2] = cx + x * scale * unit;
      helioScreen[i * 2 + 1] = cy + y * scale * unit;
      depthSum += z;
    }

    visible = visible * (1 - b) + b;
    if (visible < 0.04) continue;
    const near = clamp((depthSum / HELIO_POINTS + 0.6) / 1.2, 0, 1);
    const level = clamp(Math.floor((0.3 + 0.7 * near) * visible * HELIO_LEVELS), 0, HELIO_LEVELS - 1);
    // H harfi eskisi gibi tek renk (gümüş) olsun
    const path = paths[b > 0.5 ? WIND : strand.role][level];
    path.moveTo(helioScreen[0], helioScreen[1]);
    for (let i = 1; i < HELIO_POINTS; i++) path.lineTo(helioScreen[i * 2], helioScreen[i * 2 + 1]);
    if (strand.role === WIND && visible > 0.3) {
      const last = (HELIO_POINTS - 1) * 2;
      tips.rect(helioScreen[last] - tipSize, helioScreen[last + 1] - tipSize, tipSize * 2, tipSize * 2);
    }
  }

  helioCtx.lineWidth = line;
  HELIO_COLORS.forEach(([r, g, bl, dim, bright], role) => {
    for (let level = 0; level < HELIO_LEVELS; level++) {
      helioCtx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${dim + ((bright - dim) * level) / (HELIO_LEVELS - 1)})`;
      helioCtx.stroke(paths[role][level]);
    }
  });
  helioCtx.fillStyle = 'rgba(255, 200, 130, 0.85)';
  helioCtx.fill(tips);

  // 2. adım: sonlanma şoku, Güneş'in çevresinde iki ince halka
  if (bubbleWeight > 0.01) {
    const r = SHOCK_R * bubbleSize * unit;
    const sx = sunX + axis[0] * r * 0.12;
    const sy = sunY + axis[1] * r * 0.12;
    helioCtx.lineWidth = line * 1.2;
    helioCtx.strokeStyle = `rgba(232, 236, 246, ${0.3 * bubbleWeight})`;
    helioCtx.beginPath();
    helioCtx.arc(sx, sy, r, 0, Math.PI * 2);
    helioCtx.stroke();
    helioCtx.strokeStyle = `rgba(232, 236, 246, ${0.12 * bubbleWeight})`;
    helioCtx.beginPath();
    helioCtx.arc(sx, sy, r * 1.22, 0, Math.PI * 2);
    helioCtx.stroke();
  }
  helioCtx.globalCompositeOperation = 'source-over';

  // 1. adım: Güneş'in kendisi, izlerin önünde; geçişte küçülüp kaybolur. Yüzeyi çok yavaş döner
  if (sunWeight > 0.01) {
    if (!sunTexture) sunTexture = makeSunTexture();
    const r = SUN_R * sunZoom * unit;
    helioCtx.save();
    helioCtx.globalAlpha = sunWeight ** 0.7;
    helioCtx.translate(sunX, sunY);
    helioCtx.rotate(time * 0.00002);
    helioCtx.drawImage(sunTexture, -r, -r, r * 2, r * 2);
    helioCtx.restore();
  }
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

// Sayfanın temel kodu (çerçeve koruması, metin bölme, dil, kaydırma, menü). script.js'ten ÖNCE yüklenir (ikisi de defer):
//   <script defer src="ortak.js"></script>
// Buradaki üst düzey adlar (reducedMotion, clamp, navLinks…) script.js'te de görünür; orada yeniden tanımlama.

// Başka bir site sayfayı çerçeve (iframe) içine gömerse sayfa gizlenir ve kendi sekmesinde açılmaya çalışılır.
// GitHub Pages "frame-ancestors" başlığı gönderemediği için tıklama tuzağına (clickjacking) karşı bu kullanılır.
if (window.top !== window.self) {
  document.documentElement.style.display = 'none';
  try { window.top.location = window.location.href; } catch { /* engellendiyse sayfa gizli kalır */ }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ---------- Metni parçalara bölme (animasyonlar için) ----------
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

// Başlığı harf harf <span> içine al ki ekrana girerken "yazılsın"
function splitChars(el, text) {
  el.textContent = '';
  let index = 0;
  // Harfler kelime kelime gruplanır ki satır yalnızca boşluklardan kırılsın
  text.split(' ').forEach((word, w) => {
    if (w > 0) el.append(' ');
    const group = document.createElement('span');
    group.className = 'char-word';
    [...word].forEach((char) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char;
      span.style.setProperty('--i', index++);
      span.style.setProperty('--n', text.length);
      group.append(span);
    });
    index++;
    el.append(group);
  });
}

// ---------- Dil (TR / EN) ----------
// Türkçe metin HTML'de, İngilizcesi data-en özelliğinde durur. Düğme adları (aria-label) data-en-label'da.
// Seçim tarayıcıda saklanır.
const langToggle = document.querySelector('.lang-toggle');
const translatable = [...document.querySelectorAll('[data-en]')];
const labels = [...document.querySelectorAll('[data-en-label]')];
translatable.forEach((el) => { el.dataset.tr = el.textContent; });
labels.forEach((el) => { el.dataset.trLabel = el.getAttribute('aria-label'); });
let pageTitles = null;

function setLanguage(lang) {
  document.documentElement.lang = lang;
  if (pageTitles) document.title = pageTitles[lang];
  translatable.forEach((el) => {
    if (el.hasAttribute('data-words')) splitWords(el, el.dataset[lang]);
    else if (el.hasAttribute('data-chars')) splitChars(el, el.dataset[lang]);
    else el.textContent = el.dataset[lang];
  });
  labels.forEach((el) => el.setAttribute('aria-label', lang === 'en' ? el.dataset.enLabel : el.dataset.trLabel));
  // Düğme, geçilecek diğer dili gösterir
  langToggle.textContent = lang === 'tr' ? 'EN' : 'TR';
  langToggle.setAttribute('aria-label', lang === 'tr' ? 'EN: Switch to English' : 'TR: Türkçeye geç');
}

function savedLanguage() {
  try { return localStorage.getItem('lang'); } catch { return null; }
}

/** Sayfa betiği kendi sekme başlıklarıyla bir kez çağırır. */
function initLanguage(titles) {
  pageTitles = titles;
  langToggle.addEventListener('click', () => {
    const next = document.documentElement.lang === 'tr' ? 'en' : 'tr';
    setLanguage(next);
    try { localStorage.setItem('lang', next); } catch {}
  });
  setLanguage(savedLanguage() === 'en' ? 'en' : 'tr');
  // Çevirisi olmayan ama harf harf yazılan metinler (e-posta adresi)
  document.querySelectorAll('[data-chars]:not([data-en])').forEach((el) => splitChars(el, el.textContent.trim()));
}

// ---------- Kaydırma ----------
// Kaydırma ilerlemesi yalnızca üstteki ince çubuğa yazılır. Kök öğeye (<html>) yazılsaydı her karede bütün
// sayfanın stili yeniden hesaplanırdı (ana sayfada ölçülen: 12,5 ms/kare yerine 0,6 ms).
const progressBar = document.querySelector('.progress');

function updateProgress(scrollable) {
  progressBar.style.setProperty('--scroll', scrollable > 0 ? window.scrollY / scrollable : 0);
}

/** Kaydırma ve yeniden boyutlandırmada işi karede bir kez yapar. */
function onScrollFrame(update) {
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
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

// Hizmetler sayfası. Ortak kod (dil, harf bölme, kaydırma çubuğu, menü, çerçeve koruması) ../ortak.js'te;
// o bu dosyadan önce yüklenir.

// ---------- Dil (TR / EN) ----------
// Seçim ana sayfayla aynı yerde saklanır; birinde dil değişince diğeri de o dilde açılır
initLanguage({
  tr: 'Helyosfer — Bilgisayar, Linux ve Sunucu Desteği',
  en: 'Helyosfer — Computer, Linux & Server Support',
});

// ---------- Penguenler ----------
// Şablondaki çizimi her [data-tux] öğesine kopyala; data-tux içindeki her kelime bir sınıf olur (wave → tux-wave)
const tuxTemplate = document.getElementById('tux-template');
document.querySelectorAll('[data-tux]').forEach((slot) => {
  slot.append(tuxTemplate.content.cloneNode(true));
  slot.dataset.tux.split(/\s+/).filter(Boolean).forEach((name) => slot.classList.add(`tux-${name}`));
});

// Girişteki penguenin gözleri fareyi izler
const lookers = [...document.querySelectorAll('.tux-look')];
// Fare olayı saniyede yüzlerce kez gelebilir; iş karede bir kez yapılır: önce ölç, sonra yaz
if (!reducedMotion && lookers.length) {
  let pointer = null;
  const look = () => {
    const rects = lookers.map((el) => el.getBoundingClientRect());
    lookers.forEach((el, i) => {
      const rect = rects[i];
      const x = (pointer.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2);
      const y = (pointer.clientY - (rect.top + rect.height * 0.3)) / (window.innerHeight / 2);
      el.style.setProperty('--lx', clamp(x, -1, 1).toFixed(3));
      el.style.setProperty('--ly', clamp(y, -1, 1).toFixed(3));
    });
    pointer = null;
  };
  window.addEventListener('pointermove', (event) => {
    if (!pointer) requestAnimationFrame(look);
    pointer = event;
  }, { passive: true });
}

// ---------- Terminal ----------
// Her sahne bir komut ve çıktısı. Çıktının her satırı [sınıf, metin] parçalarından oluşur.
// DÜZENLE: sahne ekleyip çıkarabilirsin; satırlar telefonda taşmasın diye 46 karakteri geçmesin
const TERMINAL_SCENES = [
  {
    cmd: 'fastfetch',
    out: [
      [['t-logo', '    .--.     '], ['t-user', 'helyosfer@homelab']],
      [['t-logo', '   |o_o |    '], ['t-dim', '-----------------']],
      [['t-logo', '   |:_/ |    '], ['t-key', 'OS     '], ['', 'Debian 12']],
      [['t-logo', '  //   \\ \\   '], ['t-key', 'Host   '], ['', 'Raspberry Pi 5']],
      [['t-logo', ' (|     | )  '], ['t-key', 'Uptime '], ['', '42 days']],
      [['t-logo', "/'\\_   _/`\\  "], ['t-key', 'Memory '], ['', '1.2 / 8 GiB']],
      [['t-logo', '\\___)=(___/  '], ['t-b1', '███'], ['t-b2', '███'], ['t-b3', '███'], ['t-b4', '███'], ['t-b5', '███']],
    ],
  },
  {
    cmd: 'docker compose ps',
    out: [
      [['t-dim', 'NAME         STATUS']],
      [['', 'pihole       '], ['t-ok', 'Up 12 days (healthy)']],
      [['', 'nginx        '], ['t-ok', 'Up 12 days']],
      [['', 'uptime-kuma  '], ['t-ok', 'Up 12 days']],
      [['', 'minecraft    '], ['t-ok', 'Up 3 days']],
    ],
  },
  {
    cmd: 'tailscale status',
    out: [
      [['t-dim', '100.101.12.4  '], ['', 'homelab  linux    '], ['t-ok', '-']],
      [['t-dim', '100.88.40.17  '], ['', 'laptop   windows  '], ['t-ok', 'active']],
      [['t-dim', '100.72.9.33   '], ['', 'phone    android  '], ['t-dim', 'idle']],
    ],
  },
  {
    cmd: 'sudo certbot --nginx -d ornek.com',
    out: [
      [['t-dim', 'Requesting a certificate for ornek.com']],
      [['t-ok', 'Successfully received certificate.']],
      [['', 'Congratulations! HTTPS is now enabled:']],
      [['t-path', '  https://ornek.com']],
    ],
  },
  {
    cmd: 'systemctl status minecraft',
    out: [
      [['t-ok', '●'], ['', ' minecraft.service']],
      [['t-dim', '   Loaded: '], ['', 'enabled']],
      [['t-dim', '   Active: '], ['t-ok', 'active (running)'], ['t-dim', ' 3 days']],
      [['t-dim', '  Players: '], ['', '4 / 20 online']],
    ],
  },
];

const screen = document.querySelector('.term-screen');

// Terminal ekrandan çıkınca (ya da sekme gizliyken) yazmayı bırakır, geri gelince kaldığı yerden sürer
let terminalVisible = true;
new IntersectionObserver(([entry]) => { terminalVisible = entry.isIntersecting; }).observe(screen);
async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  while (!terminalVisible || document.hidden) await new Promise((resolve) => setTimeout(resolve, 400));
}

function segment(className, text) {
  const span = document.createElement('span');
  if (className) span.className = className;
  span.textContent = text;
  return span;
}

function promptLine() {
  const line = document.createElement('div');
  line.append(segment('t-user', 'helyosfer@homelab'), ':', segment('t-path', '~'), '$ ');
  screen.append(line);
  return line;
}

function cursor() {
  return segment('term-cursor', ' ');
}

// Çıktı satırları arasında delay kadar beklenir (0: hepsi bir anda)
async function printOutput(scene, delay) {
  for (const parts of scene.out) {
    const line = document.createElement('div');
    parts.forEach(([className, text]) => line.append(segment(className, text)));
    screen.append(line);
    if (delay) await wait(delay);
  }
}

async function playTerminal() {
  for (let s = 0; ; s = (s + 1) % TERMINAL_SCENES.length) {
    const scene = TERMINAL_SCENES[s];
    screen.textContent = '';
    const line = promptLine();
    const typed = segment('', '');
    const caret = cursor();
    line.append(typed, caret);
    await wait(700);
    for (const char of scene.cmd) {
      typed.textContent += char;
      await wait(35 + Math.random() * 55);
    }
    await wait(350);
    caret.remove();
    await printOutput(scene, 110);
    promptLine().append(cursor());
    await wait(3200);
  }
}

if (reducedMotion) {
  promptLine().append(segment('', TERMINAL_SCENES[0].cmd));
  printOutput(TERMINAL_SCENES[0], 0);
  promptLine().append(cursor());
} else {
  playTerminal();
}

// ---------- Araçlar şeridi ----------
// İçerik iki kez yazılır; yarısı kadar kayınca dikişsiz başa sarar
const toolsRow = document.querySelector('.tools-row');
if (!reducedMotion) {
  [...toolsRow.children].forEach((item) => {
    const copy = item.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    toolsRow.append(copy);
  });
}

// ---------- Kar ----------
// DÜZENLE: kar tanesi yoğunluğu (piksel kare başına) ve en fazla tane sayısı
const SNOW_DENSITY = 1 / 16000;
const SNOW_MAX = 140;

const snowCanvas = document.querySelector('.snow');
const snowCtx = snowCanvas.getContext('2d');
let flakes = [];

function makeFlake(w, h, anywhere) {
  return {
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : -10,
    r: 0.6 + Math.random() ** 2 * 2.2,
    speed: 0.15 + Math.random() * 0.45,
    drift: Math.random() * Math.PI * 2,
    alpha: 0.15 + Math.random() * 0.45,
  };
}

function resizeSnow() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  snowCanvas.width = Math.round(window.innerWidth * dpr);
  snowCanvas.height = Math.round(window.innerHeight * dpr);
  snowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(SNOW_MAX, Math.round(window.innerWidth * window.innerHeight * SNOW_DENSITY));
  flakes = Array.from({ length: count }, () => makeFlake(window.innerWidth, window.innerHeight, true));
}

function drawSnow(time) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  snowCtx.clearRect(0, 0, w, h);
  for (const flake of flakes) {
    if (!reducedMotion) {
      flake.y += flake.speed * (1 + flake.r * 0.4);
      flake.x += Math.sin(time * 0.0006 + flake.drift) * 0.25;
      if (flake.y > h + 10) Object.assign(flake, makeFlake(w, h, false));
    }
    snowCtx.globalAlpha = flake.alpha;
    snowCtx.fillStyle = '#fff';
    snowCtx.beginPath();
    snowCtx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
    snowCtx.fill();
  }
}

// Telefonda sohbet penceresi tüm ekranı kapladığında kar görünmez; o sırada çizilmez.
// (Gizli sekmede tarayıcı animasyon karelerini zaten durdurur.)
const fullScreenChat = window.matchMedia('(max-width: 760px)');
function snowLoop(time) {
  if (!(fullScreenChat.matches && document.body.classList.contains('chat-open'))) drawSnow(time);
  requestAnimationFrame(snowLoop);
}

resizeSnow();
window.addEventListener('resize', () => { resizeSnow(); if (reducedMotion) drawSnow(0); });
if (reducedMotion) drawSnow(0); else requestAnimationFrame(snowLoop);

// ---------- Kartların arkasından bakan penguenler ----------
// Kart ekrana iyice girince penguen bir kez başını çıkarır, sonra saklanır
if (!reducedMotion) {
  const peekObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      peekObserver.unobserve(entry.target);
      const order = [...entry.target.parentElement.children].indexOf(entry.target) % 3;
      setTimeout(() => {
        entry.target.classList.add('peeking');
        setTimeout(() => entry.target.classList.remove('peeking'), 2200);
      }, 500 + order * 300);
    });
  }, { threshold: 0.85 });
  document.querySelectorAll('.svc').forEach((card) => peekObserver.observe(card));
}

// ---------- Kaydırmaya bağlı animasyonlar ----------
const entering = [...document.querySelectorAll('[data-enter]')];

function updateScroll() {
  const vh = window.innerHeight;
  const scrollable = document.documentElement.scrollHeight - vh;
  // Önce bütün ölçümler, sonra bütün yazmalar
  const tops = entering.map((el) => el.getBoundingClientRect().top);
  updateProgress(scrollable);

  // Ekrana giren öğeler: alttan girip ekranın ortasına gelene kadar (0 → 1).
  // Sayfanın sonuna gelindiyse hepsi tamamlanır; yoksa en alttaki e-posta yarım yazılı kalabilirdi.
  const atBottom = window.scrollY >= scrollable - 2;
  entering.forEach((el, i) => {
    if (tops[i] > vh * 1.5) return;
    el.style.setProperty('--e', (atBottom ? 1 : clamp((vh - tops[i]) / (vh * 0.6), 0, 1)).toFixed(4));
  });
}

if (!reducedMotion) onScrollFrame(updateScroll);

// ---------- Sohbet penceresi ----------
// İlk mesajla iletişim Worker'ında bir sohbet açılır; Worker bir belirteç verir, bu tarayıcıda saklanır.
// Önce yapay zekâ asistanı cevap verir; devredince ya da ziyaretçi "Bir insanla konuşun" deyince sohbet bana geçer.
// Pencere açıkken cevaplar sık, kapalıyken seyrek yoklanır; yeni cevap gelince düğmede nokta yanar.
// DÜZENLE: Worker'ın adresi (iletisim-worker/wrangler.toml → routes)
const CHAT_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://127.0.0.1:8787/v1'
  : 'https://iletisim.helyosfer.me/v1';
const CHAT_API = `${CHAT_BASE}/mesaj`;
const CHAT_HANDOFF_API = `${CHAT_BASE}/devret`;
const CHAT_POLL_OPEN = 10000;
const CHAT_POLL_CLOSED = 60000;
const CHAT_KEY = 'sohbet';

const CHAT_TEXT = {
  tr: {
    sending: 'Gönderiliyor…',
    tooFast: 'Biraz hızlı gittiniz; birkaç saniye sonra tekrar deneyin.',
    busy: 'Şu an çok fazla mesaj geliyor. Biraz sonra tekrar deneyin ya da e-posta gönderin.',
    tooLong: 'Mesaj çok uzun.',
    full: 'Bu sohbet doldu. Yeni bir sohbet için sayfayı yenileyin.',
    failed: 'Mesaj gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin ya da e-posta gönderin.',
    closed: 'Bu sohbet kapatıldı. Yazarsanız yeniden açılır.',
    bot: 'Asistan · yapay zekâ',
    me: 'Helyosfer',
  },
  en: {
    sending: 'Sending…',
    tooFast: "That was a bit fast; try again in a few seconds.",
    busy: "We're getting a lot of messages right now. Try again later or send an email.",
    tooLong: 'The message is too long.',
    full: 'This chat is full. Reload the page to start a new one.',
    failed: "Couldn't send the message. Check your connection and try again, or send an email.",
    closed: 'This chat was closed. Writing again reopens it.',
    bot: 'Assistant · AI',
    me: 'Helyosfer',
  },
};

const chat = document.getElementById('chat');
const chatForm = chat.querySelector('.chat-form');
const chatThread = chat.querySelector('.chat-thread');
const chatLog = chat.querySelector('.chat-log');
const chatInput = chatForm.elements.metin;
const chatError = chat.querySelector('.chat-error');
const chatLauncher = document.querySelector('.chat-launcher');
const chatDot = chatLauncher.querySelector('.chat-dot');
const chatHuman = chat.querySelector('.chat-human');
const chatReset = chat.querySelector('.chat-reset');
const chatAnnounce = chat.querySelector('[data-chat-announce]');

const chatState = { session: readSession(), messages: [], status: 'acik', assistant: true, sending: false, timer: 0 };

function chatText(key) {
  return CHAT_TEXT[document.documentElement.lang === 'en' ? 'en' : 'tr'][key];
}

// Saklanan: { id, token, seen } — seen, okunduğu bilinen son cevabın numarası
function readSession() {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || null; } catch { return null; }
}
function saveSession() {
  try {
    if (chatState.session) localStorage.setItem(CHAT_KEY, JSON.stringify(chatState.session));
    else localStorage.removeItem(CHAT_KEY);
  } catch {}
}

function chatHeaders(json) {
  const headers = {};
  if (json) headers['content-type'] = 'application/json';
  if (chatState.session) headers.authorization = `Bearer ${chatState.session.id}.${chatState.session.token}`;
  return headers;
}

function formatTime(ms) {
  const lang = document.documentElement.lang === 'en' ? 'en-GB' : 'tr-TR';
  const date = new Date(ms);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function renderChat() {
  chatThread.textContent = '';
  for (const message of chatState.messages) {
    const bubble = document.createElement('p');
    const incoming = message.gonderen !== 'ziyaretci';
    bubble.className = incoming ? `msg msg-in${message.gonderen === 'asistan' ? ' msg-bot' : ''}` : 'msg msg-out';
    // Gelen mesajın kimden olduğu (asistan mı ben mi) balonun üstünde yazar
    if (incoming) {
      const who = document.createElement('span');
      who.className = 'msg-who';
      who.textContent = chatText(message.gonderen === 'asistan' ? 'bot' : 'me');
      bubble.append(who);
    }
    bubble.append(message.metin);
    const time = document.createElement('time');
    time.dateTime = new Date(message.zaman).toISOString();
    time.textContent = formatTime(message.zaman);
    bubble.append(time);
    chatThread.append(bubble);
  }
  if (chatState.status === 'kapali') {
    const note = document.createElement('p');
    note.className = 'msg-system';
    note.textContent = chatText('closed');
    chatThread.append(note);
  }
  // Sohbet açıldıktan sonra ad ve iletişim kutuları gizlenir
  chatForm.classList.toggle('has-session', Boolean(chatState.session));
  chatHuman.hidden = !(chatState.session && chatState.assistant);
  chatReset.hidden = !chatState.session;
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Asistan düşünürken üç noktalı bir balon
function showTyping() {
  const typing = document.createElement('p');
  typing.className = 'msg msg-in msg-bot msg-typing';
  typing.setAttribute('aria-hidden', 'true');
  typing.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
  chatThread.append(typing);
  chatLog.scrollTop = chatLog.scrollHeight;
  return typing;
}

function applyResponse(data) {
  chatState.messages = data.mesajlar;
  if (data.durum) chatState.status = data.durum;
  if (typeof data.asistan === 'boolean') chatState.assistant = data.asistan;
}

// Ekran okuyucuya yalnızca yeni gelen cevaplar okunur (geçmiş her çizimde baştan oluşturulduğu için canlı bölge değil)
function announceIncoming(previousLastId) {
  const fresh = chatState.messages.filter((m) => m.id > previousLastId && m.gonderen !== 'ziyaretci');
  if (!fresh.length) return;
  const text = fresh.map((m) => `${chatText(m.gonderen === 'asistan' ? 'bot' : 'me')}: ${m.metin}`).join('\n');
  // Aynı metin art arda gelse de okunsun diye önce boşaltılır
  chatAnnounce.textContent = '';
  requestAnimationFrame(() => { chatAnnounce.textContent = text; });
}

function lastMessageId() {
  return chatState.messages.reduce((last, m) => Math.max(last, m.id), 0);
}

function lastReplyId() {
  return chatState.messages.reduce((last, m) => (m.gonderen === 'ben' ? Math.max(last, m.id) : last), 0);
}

function updateDot() {
  const unseen = chatState.session && lastReplyId() > (chatState.session.seen || 0);
  if (!chat.hidden && unseen) {
    chatState.session.seen = lastReplyId();
    saveSession();
  }
  chatDot.hidden = !(chat.hidden && unseen);
}

function showError(text) {
  chatError.textContent = text || '';
  chatError.hidden = !text;
}

async function fetchMessages() {
  if (!chatState.session || document.hidden) return;
  // Eldeki son mesajdan yenileri istenir; ilk yoklamada (sayfa yeni açıldıysa) bütün geçmiş gelir
  const lastId = lastMessageId();
  try {
    const response = await fetch(lastId ? `${CHAT_API}?sonra=${lastId}` : CHAT_API, { headers: chatHeaders(false) });
    // Sohbet panelden silindiyse baştan başlanır
    if (response.status === 404) {
      chatState.session = null;
      chatState.messages = [];
      saveSession();
      renderChat();
      return;
    }
    if (!response.ok) return;
    const data = await response.json();
    // Bu arada gönderilen bir mesajla gelmiş olabilecekleri iki kez ekleme
    const current = lastMessageId();
    const fresh = data.mesajlar.filter((m) => m.id > current);
    const changed = fresh.length > 0
      || data.durum !== chatState.status
      || data.asistan !== chatState.assistant;
    applyResponse({ ...data, mesajlar: chatState.messages.concat(fresh) });
    if (changed && !chatState.sending) renderChat();
    if (!chat.hidden && current) announceIncoming(current);
    updateDot();
  } catch {}
}

function schedulePoll() {
  clearInterval(chatState.timer);
  if (!chatState.session) return;
  chatState.timer = setInterval(fetchMessages, chat.hidden ? CHAT_POLL_CLOSED : CHAT_POLL_OPEN);
}

// Telefonda pencere tüm ekranı kaplar: arkadaki sayfa klavyeye ve ekran okuyucuya kapanır (odak dışarı kaçmasın).
// Geniş ekranda pencere köşede durur, sayfa kullanılabilir kalır.
function setBackgroundInert() {
  const modal = !chat.hidden && fullScreenChat.matches;
  for (const el of document.body.children) {
    if (el !== chat) el.inert = modal;
  }
  chat.setAttribute('aria-modal', String(modal));
}
fullScreenChat.addEventListener('change', setBackgroundInert);

function openChat(event) {
  if (event) event.preventDefault();
  navLinks.classList.remove('open');
  chat.hidden = false;
  setBackgroundInert();
  chatLauncher.setAttribute('aria-expanded', 'true');
  document.body.classList.add('chat-open');
  renderChat();
  updateDot();
  fetchMessages();
  schedulePoll();
  chatInput.focus({ preventScroll: true });
}

function closeChat() {
  chat.hidden = true;
  setBackgroundInert();
  chatLauncher.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('chat-open');
  schedulePoll();
  chatLauncher.focus({ preventScroll: true });
}

function resetChat() {
  if (chatState.sending) return;
  chatState.session = null;
  chatState.messages = [];
  chatState.status = 'acik';
  chatState.assistant = true;
  saveSession();
  showError('');
  renderChat();
  updateDot();
  schedulePoll();
  chatInput.focus({ preventScroll: true });
}

async function sendMessage(event) {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text || chatState.sending) return;
  chatState.sending = true;
  chatForm.classList.add('is-sending');
  showError('');

  const body = {
    metin: text,
    ad: chatForm.elements.ad.value,
    iletisim: chatForm.elements.iletisim.value,
    web: chatForm.elements.web.value,
    dil: document.documentElement.lang === 'en' ? 'en' : 'tr',
  };

  // Mesaj, sunucu cevap verene kadar soluk bir balon olarak görünür
  const pending = document.createElement('p');
  pending.className = 'msg msg-out is-pending';
  pending.textContent = text;
  chatThread.append(pending);
  const typing = chatState.assistant ? showTyping() : null;

  try {
    const before = lastMessageId();
    const response = await fetch(CHAT_API, { method: 'POST', headers: chatHeaders(true), body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404 && chatState.session) {
        // Sohbet silinmiş: yeni bir sohbetle bir kez daha dene
        chatState.session = null;
        chatState.assistant = true;
        saveSession();
        chatState.sending = false;
        pending.remove();
        typing?.remove();
        return sendMessage(event);
      }
      const reason = { cok_hizli: 'tooFast', yogun: 'busy', cok_uzun: 'tooLong', sohbet_dolu: 'full' }[data.hata] || 'failed';
      throw new Error(reason);
    }
    if (data.belirtec) chatState.session = { id: data.sohbet, token: data.belirtec, seen: 0 };
    applyResponse({ ...data, durum: 'acik' });
    // Az önce gelen cevabı kullanıcı zaten görüyor; noktayı yakmasın
    chatState.session.seen = lastReplyId();
    saveSession();
    chatInput.value = '';
    resizeInput();
    renderChat();
    announceIncoming(before);
    schedulePoll();
  } catch (error) {
    pending.remove();
    showError(chatText(CHAT_TEXT.tr[error.message] ? error.message : 'failed'));
  } finally {
    typing?.remove();
    chatState.sending = false;
    chatForm.classList.remove('is-sending');
  }
}

async function askForHuman() {
  if (!chatState.session || chatState.sending) return;
  chatState.sending = true;
  chatHuman.disabled = true;
  showError('');
  try {
    const before = lastMessageId();
    const response = await fetch(CHAT_HANDOFF_API, { method: 'POST', headers: chatHeaders(false) });
    if (!response.ok) throw new Error(response.status === 429 ? 'tooFast' : 'failed');
    applyResponse(await response.json());
    chatState.session.seen = lastReplyId();
    saveSession();
    renderChat();
    announceIncoming(before);
  } catch (error) {
    showError(chatText(error.message));
  } finally {
    chatState.sending = false;
    chatHuman.disabled = false;
  }
}

// Yazdıkça kutu en fazla birkaç satır büyür
function resizeInput() {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
  chatInput.style.overflowY = chatInput.scrollHeight > 140 ? 'auto' : 'hidden';
}

document.querySelectorAll('[data-chat-open]').forEach((el) => el.addEventListener('click', (event) => {
  if (el === chatLauncher && !chat.hidden) closeChat();
  else openChat(event);
}));
chat.querySelector('.chat-close').addEventListener('click', closeChat);
chatReset.addEventListener('click', resetChat);
chat.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeChat(); });
chatForm.addEventListener('submit', sendMessage);
chatHuman.addEventListener('click', askForHuman);
chatInput.addEventListener('input', resizeInput);
// Enter gönderir, Shift + Enter yeni satır açar
chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchMessages(); });

// Önceden açılmış bir sohbet varsa cevap gelmiş mi diye bak
if (chatState.session) {
  fetchMessages();
  schedulePoll();
}

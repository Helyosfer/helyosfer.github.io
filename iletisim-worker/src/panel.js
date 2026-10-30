// Yönetim paneli: tek sayfa, Worker'ın kendisinden sunulur (/admin). Dış kaynak yok; CSP index.js'te.
// Ziyaretçiden gelen her şey textContent ile yazılır, HTML olarak yorumlanmaz.

export const PANEL_HTML = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>İletişim paneli</title>
  <link rel="stylesheet" href="/admin/panel.css">
  <script defer src="/admin/panel.js"></script>
</head>
<body>
  <header class="ust">
    <span class="logo">helyosfer</span>
    <span class="baslik">İletişim paneli</span>
    <span class="uyari" id="uyari" hidden></span>
  </header>
  <main class="duzen">
    <aside class="liste">
      <div class="filtre" role="tablist">
        <button data-filtre="acik" class="secili">Açık</button>
        <button data-filtre="kapali">Kapalı</button>
        <button data-filtre="hepsi">Hepsi</button>
      </div>
      <ul id="sohbetler"></ul>
      <p class="bos" id="liste-bos" hidden>Burada sohbet yok.</p>
      <button class="daha" id="daha" type="button" hidden>Daha eski sohbetler</button>
    </aside>
    <section class="detay">
      <p class="bos" id="detay-bos">Soldan bir sohbet seçin.</p>
      <div class="sohbet" id="sohbet" hidden>
        <div class="sohbet-ust">
          <button class="geri" id="geri" type="button">‹ Sohbetler</button>
          <div class="kisi">
            <h1 id="kisi-ad"></h1>
            <p id="kisi-bilgi"></p>
          </div>
          <div class="islemler">
            <button id="durum-dugme" type="button"></button>
            <button id="sil" class="tehlike" type="button">Sil</button>
          </div>
        </div>
        <ol class="mesajlar" id="mesajlar"></ol>
        <form class="yanit" id="yanit">
          <textarea id="yanit-metin" rows="3" maxlength="2000" required placeholder="Cevabınız… (Enter gönderir, Shift + Enter alt satır)"></textarea>
          <button type="submit">Gönder</button>
        </form>
      </div>
    </section>
  </main>
</body>
</html>
`;

export const PANEL_CSS = `
:root { --bg: #000; --yuzey: #0d0d0f; --yuzey2: #151518; --metin: #f5f5f7; --soluk: #86868b; --cizgi: rgba(255,255,255,.1); --vurgu: #bf9bff; }
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: var(--bg); color: var(--metin); font: 15px/1.5 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; }
button { font: inherit; color: inherit; cursor: pointer; }
.ust { display: flex; align-items: center; gap: 14px; height: 52px; padding: 0 20px; border-bottom: 1px solid var(--cizgi); flex-shrink: 0; }
.logo { font-weight: 600; }
.baslik { color: var(--soluk); font-size: .85rem; }
.uyari { margin-left: auto; padding: 4px 12px; border-radius: 999px; background: #3a1d1d; color: #ffb4b4; font-size: .8rem; }
.duzen { flex: 1; display: grid; grid-template-columns: 340px 1fr; min-height: 0; }
.liste { border-right: 1px solid var(--cizgi); overflow-y: auto; }
.filtre { display: flex; gap: 6px; padding: 14px; position: sticky; top: 0; background: var(--bg); border-bottom: 1px solid var(--cizgi); }
.filtre button { padding: 5px 12px; border: 1px solid var(--cizgi); border-radius: 999px; background: none; font-size: .82rem; color: var(--soluk); }
.filtre button.secili { background: var(--metin); color: #000; border-color: var(--metin); }
#sohbetler { list-style: none; margin: 0; padding: 0; }
.oge { display: block; width: 100%; padding: 14px 16px; border: 0; border-bottom: 1px solid var(--cizgi); background: none; text-align: left; }
.oge:hover { background: var(--yuzey); }
.oge.secili { background: var(--yuzey2); box-shadow: inset 3px 0 0 var(--vurgu); }
.oge-ust { display: flex; align-items: baseline; gap: 8px; }
.oge-ad { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oge-zaman { margin-left: auto; color: var(--soluk); font-size: .75rem; white-space: nowrap; }
.oge-onizleme { margin-top: 2px; color: var(--soluk); font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oge-rozet { min-width: 20px; padding: 0 6px; border-radius: 999px; background: var(--vurgu); color: #000; font-size: .72rem; font-weight: 700; text-align: center; }
.oge.kapali .oge-ad { color: var(--soluk); }
.bos { padding: 24px; color: var(--soluk); text-align: center; }
.daha { display: block; margin: 14px auto; padding: 6px 14px; border: 1px solid var(--cizgi); border-radius: 999px; background: none; font-size: .85rem; color: var(--soluk); }
.daha:hover { border-color: var(--metin); color: var(--metin); }
.daha[hidden] { display: none; }
.detay { display: flex; flex-direction: column; min-height: 0; }
.sohbet { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.sohbet[hidden] { display: none; }
.sohbet-ust { display: flex; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid var(--cizgi); }
.kisi { min-width: 0; }
.kisi h1 { margin: 0; font-size: 1.1rem; }
.kisi p { margin: 0; color: var(--soluk); font-size: .85rem; overflow-wrap: anywhere; }
.kisi a { color: var(--vurgu); }
.islemler { margin-left: auto; display: flex; gap: 8px; }
.islemler button, .geri { padding: 6px 14px; border: 1px solid var(--cizgi); border-radius: 999px; background: none; font-size: .85rem; }
.islemler button:hover { border-color: var(--metin); }
.islemler .tehlike:hover { border-color: #ff6b6b; color: #ff6b6b; }
.geri { display: none; }
.mesajlar { flex: 1; overflow-y: auto; list-style: none; margin: 0; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.mesaj { max-width: min(75%, 560px); padding: 10px 14px; border-radius: 16px; white-space: pre-wrap; overflow-wrap: anywhere; }
.mesaj.ziyaretci { align-self: flex-start; background: var(--yuzey2); border-bottom-left-radius: 4px; }
.mesaj.ben { align-self: flex-end; background: var(--vurgu); color: #000; border-bottom-right-radius: 4px; }
.mesaj.asistan { align-self: flex-end; background: #1d2a3a; border: 1px solid #2c4560; border-bottom-right-radius: 4px; }
.mesaj.asistan::before { content: "Asistan"; display: block; margin-bottom: 2px; font-size: .7rem; font-weight: 600; color: #7cc4ff; }
.oge-asistan { padding: 0 6px; border-radius: 999px; border: 1px solid #2c4560; color: #7cc4ff; font-size: .68rem; }
.kisi .asistan-durum { color: #7cc4ff; }
.mesaj time { display: block; margin-top: 4px; font-size: .7rem; opacity: .6; }
.yanit { display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--cizgi); }
.yanit textarea { flex: 1; resize: vertical; min-height: 48px; max-height: 40vh; padding: 10px 14px; border: 1px solid var(--cizgi); border-radius: 14px; background: var(--yuzey); color: var(--metin); font: inherit; }
.yanit textarea:focus { outline: none; border-color: var(--vurgu); }
.yanit button { align-self: flex-end; padding: 10px 20px; border: 0; border-radius: 999px; background: var(--metin); color: #000; font-weight: 600; }
.yanit button:disabled { opacity: .5; }
@media (max-width: 760px) {
  .duzen { grid-template-columns: 1fr; }
  .detay { display: none; }
  body.detayda .liste { display: none; }
  body.detayda .detay { display: flex; }
  .geri { display: inline-block; }
  .sohbet-ust { flex-wrap: wrap; padding: 12px 14px; }
  .islemler { margin-left: 0; }
  .mesajlar { padding: 14px; }
  .mesaj { max-width: 88%; }
  .yanit { padding: 12px 14px; }
}
`;

export const PANEL_JS = `
'use strict';
var SAYFA = 100;
var durum = { sohbetler: [], secili: null, filtre: 'acik', adet: SAYFA, devam: false, gonderiliyor: false };
var $ = function (id) { return document.getElementById(id); };

function api(yol, secenek) {
  secenek = secenek || {};
  var basliklar = { 'x-panel': '1' };
  if (secenek.govde !== undefined) basliklar['content-type'] = 'application/json';
  return fetch('/admin/api/' + yol, {
    method: secenek.yontem || 'GET',
    headers: basliklar,
    body: secenek.govde !== undefined ? JSON.stringify(secenek.govde) : undefined,
    credentials: 'same-origin',
  }).then(function (yanit) {
    if (yanit.status === 403) { uyar('Oturumun süresi doldu; sayfayı yenile.'); throw new Error('yetki'); }
    if (!yanit.ok) throw new Error('istek ' + yanit.status);
    uyar('');
    return yanit.json();
  });
}

function uyar(metin) {
  $('uyari').textContent = metin;
  $('uyari').hidden = !metin;
}

function zaman(ms) {
  var t = new Date(ms);
  var bugun = new Date();
  if (t.toDateString() === bugun.toDateString()) return t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return t.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function el(etiket, sinif, metin) {
  var e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin != null) e.textContent = metin;
  return e;
}

function listeyiCiz() {
  var liste = $('sohbetler');
  var gorunen = durum.sohbetler.filter(function (s) { return durum.filtre === 'hepsi' || s.durum === durum.filtre; });
  liste.textContent = '';
  gorunen.forEach(function (s) {
    var li = el('li');
    var dugme = el('button', 'oge' + (s.id === durum.secili ? ' secili' : '') + (s.durum === 'kapali' ? ' kapali' : ''));
    dugme.type = 'button';
    var ust = el('div', 'oge-ust');
    ust.append(el('span', 'oge-ad', s.ad || s.iletisim || 'Ziyaretçi'));
    // Asistan hâlâ konuşuyorsa rozet; okunmamış sayısı yalnızca sana geçmiş sohbetlerde gösterilir
    if (s.asistan) ust.append(el('span', 'oge-asistan', 'Asistan'));
    else if (s.okunmamis > 0) ust.append(el('span', 'oge-rozet', String(s.okunmamis)));
    ust.append(el('span', 'oge-zaman', zaman(s.guncelleme)));
    var onEk = { ben: 'Sen: ', asistan: 'Asistan: ' }[s.son_gonderen] || '';
    dugme.append(ust, el('div', 'oge-onizleme', onEk + (s.son_mesaj || '')));
    dugme.addEventListener('click', function () { sohbetAc(s.id); });
    li.append(dugme);
    liste.append(li);
  });
  $('liste-bos').hidden = gorunen.length > 0;
  $('daha').hidden = !durum.devam;
  var okunmamis = durum.sohbetler.reduce(function (t, s) { return t + (s.asistan ? 0 : s.okunmamis || 0); }, 0);
  document.title = (okunmamis ? '(' + okunmamis + ') ' : '') + 'İletişim paneli';
}

function listeyiYukle() {
  var filtre = durum.filtre;
  return api('sohbetler?durum=' + filtre + '&adet=' + durum.adet).then(function (veri) {
    // Yanıt gelene kadar filtre değiştiyse bu eski yanıtı çizme
    if (filtre !== durum.filtre) return;
    // 15 sn'lik yoklamada liste değişmediyse yeniden çizilmez
    var imza = filtre + '|' + veri.devam + '|' + JSON.stringify(veri.sohbetler);
    if (imza === durum.listeImzasi) return;
    durum.listeImzasi = imza;
    durum.sohbetler = veri.sohbetler;
    durum.devam = veri.devam;
    listeyiCiz();
  }).catch(function () {});
}

function iletisimBaglantisi(deger) {
  // Yalnızca düz adres: "?bcc=" ya da "&body=" eklenmiş bir değer bağlantı olmaz, düz metin kalır
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/.test(deger)) { var a = el('a', '', deger); a.href = 'mailto:' + deger; return a; }
  if (/^[+0-9 ()-]{7,}$/.test(deger)) { var t = el('a', '', deger); t.href = 'tel:' + deger.replace(/[^+0-9]/g, ''); return t; }
  return document.createTextNode(deger);
}

function sohbetiCiz(veri) {
  var s = veri.sohbet;
  $('detay-bos').hidden = true;
  $('sohbet').hidden = false;
  $('kisi-ad').textContent = s.ad || 'Ziyaretçi';
  var bilgi = $('kisi-bilgi');
  bilgi.textContent = '';
  if (s.iletisim) { bilgi.append(iletisimBaglantisi(s.iletisim), ' · '); }
  else bilgi.append('İletişim bilgisi bırakmadı · ');
  bilgi.append((s.dil === 'en' ? 'İngilizce' : 'Türkçe') + ' · ' + zaman(s.olusturma));
  if (s.asistan) bilgi.append(' · ', el('span', 'asistan-durum', 'Asistan konuşuyor; sen yazınca susar'));
  $('durum-dugme').textContent = s.durum === 'acik' ? 'Kapat' : 'Yeniden aç';
  $('durum-dugme').dataset.durum = s.durum;
  mesajlariCiz(veri.mesajlar);
}

function mesajlariCiz(mesajlar) {
  var kutu = $('mesajlar');
  // Aynı sohbette yeni mesaj yoksa (yoklama) yeniden çizme
  var son = mesajlar.length ? mesajlar[mesajlar.length - 1].id : 0;
  var imza = durum.secili + '|' + mesajlar.length + '|' + son;
  if (imza === kutu.dataset.imza) return;
  kutu.dataset.imza = imza;
  var enAltta = kutu.scrollHeight - kutu.scrollTop - kutu.clientHeight < 40;
  kutu.textContent = '';
  mesajlar.forEach(function (m) {
    var li = el('li', 'mesaj ' + m.gonderen, m.metin);
    var t = el('time', '', zaman(m.zaman));
    t.dateTime = new Date(m.zaman).toISOString();
    li.append(t);
    kutu.append(li);
  });
  if (enAltta || kutu.dataset.ilk !== durum.secili) kutu.scrollTop = kutu.scrollHeight;
  kutu.dataset.ilk = durum.secili;
}

function sohbetAc(id) {
  durum.secili = id;
  if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
  document.body.classList.add('detayda');
  return api('sohbetler/' + id).then(function (veri) {
    sohbetiCiz(veri);
    var kayit = durum.sohbetler.find(function (s) { return s.id === id; });
    if (kayit) kayit.okunmamis = 0;
    listeyiCiz();
  }).catch(function (e) {
    if (e.message === 'istek 404') { durum.secili = null; $('sohbet').hidden = true; $('detay-bos').hidden = false; }
  });
}

$('yanit').addEventListener('submit', function (olay) {
  olay.preventDefault();
  var metin = $('yanit-metin').value.trim();
  if (!metin || !durum.secili || durum.gonderiliyor) return;
  durum.gonderiliyor = true;
  var dugme = $('yanit').querySelector('button');
  dugme.disabled = true;
  api('sohbetler/' + durum.secili + '/yanit', { yontem: 'POST', govde: { metin: metin } }).then(function () {
    $('yanit-metin').value = '';
    sohbetAc(durum.secili);
    listeyiYukle();
  }).catch(function () { uyar('Cevap gönderilemedi.'); }).finally(function () {
    durum.gonderiliyor = false;
    dugme.disabled = false;
  });
});

$('yanit-metin').addEventListener('keydown', function (olay) {
  // Enter gönderir, Shift + Enter alt satıra geçer
  if (olay.key !== 'Enter' || olay.shiftKey || olay.isComposing) return;
  olay.preventDefault();
  $('yanit').requestSubmit();
});

$('durum-dugme').addEventListener('click', function () {
  var yeni = this.dataset.durum === 'acik' ? 'kapali' : 'acik';
  api('sohbetler/' + durum.secili + '/durum', { yontem: 'POST', govde: { durum: yeni } }).then(function () {
    return Promise.all([sohbetAc(durum.secili), listeyiYukle()]);
  });
});

$('sil').addEventListener('click', function () {
  if (!confirm('Bu sohbet ve tüm mesajları kalıcı olarak silinsin mi?')) return;
  api('sohbetler/' + durum.secili, { yontem: 'DELETE' }).then(function () {
    durum.secili = null;
    history.replaceState(null, '', location.pathname);
    $('sohbet').hidden = true;
    $('detay-bos').hidden = false;
    document.body.classList.remove('detayda');
    listeyiYukle();
  });
});

$('geri').addEventListener('click', function () { document.body.classList.remove('detayda'); });

document.querySelectorAll('[data-filtre]').forEach(function (dugme) {
  dugme.addEventListener('click', function () {
    durum.filtre = dugme.dataset.filtre;
    document.querySelectorAll('[data-filtre]').forEach(function (d) { d.classList.toggle('secili', d === dugme); });
    durum.adet = SAYFA;
    listeyiCiz();
    listeyiYukle();
  });
});

$('daha').addEventListener('click', function () {
  durum.adet = Math.min(durum.adet + SAYFA, 1000);
  listeyiYukle();
});

// E-postadaki bağlantı #sohbet-kimliği ile gelir
listeyiYukle().then(function () {
  var id = location.hash.slice(1);
  if (/^[0-9a-f-]{36}$/.test(id)) sohbetAc(id);
});

// Sekme açıkken yeni mesajları yokla
setInterval(function () {
  if (document.hidden) return;
  listeyiYukle();
  if (durum.secili && !$('sohbet').hidden) {
    api('sohbetler/' + durum.secili).then(function (veri) { mesajlariCiz(veri.mesajlar); }).catch(function () {});
  }
}, 15000);
`;

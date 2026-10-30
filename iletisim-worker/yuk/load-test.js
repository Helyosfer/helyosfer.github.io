// İletişim Worker'ı için Grafana k6 yük testi.
//
// Ne ölçülür: sohbet API'si (POST/GET /v1/mesaj, POST /v1/devret). Statik site GitHub Pages'te durduğu için
// yük testine dahil DEĞİL (GitHub'ın koşulları yük testini yasaklar).
//
// Hedef: varsayılan olarak yerel Worker (e2e/sunucular/worker.mjs: boş veritabanı, yüksek hız sınırları, sahte Gemini).
// Canlı adres (iletisim.helyosfer.me) bilerek reddedilir: ücretsiz planda günde 100 bin istek sınırı var,
// gerçek Gemini kotası ve e-posta harcanır. 10.000 kullanıcılık "tepe" profili yalnızca ayrı bir hazırlık (staging)
// Worker'ında anlamlıdır: kendi D1'i, SMTP_SIFRESI tanımsız, GEMINI_ADRESI sahte sunucuda (README → Yük testi).
//
// Çalıştırma:
//   k6 run yuk/load-test.js                                   # duman: 5 kullanıcı, 30 sn
//   k6 run -e PROFIL=ortalama yuk/load-test.js                # 500 kullanıcı
//   k6 run -e PROFIL=tepe -e HEDEF=https://<staging> -e KOKEN=https://<izinli köken> yuk/load-test.js
//   k6 run -e PROFIL=soguk yuk/load-test.js                   # boşta bekleyip ani yük (soğuk başlangıç)
//   A/B karşılaştırması için: --out csv=yuk/sonuc-a.csv  (sonra: python3 yuk/karsilastir.py sonuc-a.csv sonuc-b.csv)
import { check, fail, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

const HEDEF = (__ENV.HEDEF || 'http://127.0.0.1:8787').replace(/\/$/, '');
const KOKEN = __ENV.KOKEN || 'http://127.0.0.1:5500';
const PROFIL = __ENV.PROFIL || 'duman';
const HAVUZ = Number(__ENV.HAVUZ || 150); // okuyucuların yokladığı hazır sohbet sayısı (günlük 300 sohbet sınırının altında)

const makine = (HEDEF.match(/^https?:\/\/([^/:]+)/i) || [])[1] || '';
if (/(^|\.)helyosfer\.me$/i.test(makine) && !/staging|test|yuk/i.test(makine)) {
  throw new Error(`Canlıya yük testi yapılmaz: ${HEDEF}. Yerel ya da ayrı bir hazırlık Worker'ı kullan.`);
}

// --- Özel ölçüler ---
const sogukBaslangic = new Trend('soguk_baslangic_sure', true); // her sanal kullanıcının İLK isteği
const sinirReddi = new Counter('sinir_reddi'); // beklenen korumalar: 429 (hız sınırı, dolu sohbet), 503 yogun (günlük sohbet sınırı)
const beklenmeyen = new Rate('beklenmeyen_yanit'); // 5xx, bozuk JSON, beklenmeyen durum kodu

// --- Profiller ---
// Okuyucu: penceresi açık ziyaretçi, 10 sn'de bir yoklar (sitedeki CHAT_POLL_OPEN). Yazar: sohbet açıp birkaç mesaj yazar.
// İnsan: yazdıktan sonra "Bir insanla konuşun" der. Oran ~ 70 / 25 / 5.
function asamalar(tepe, sure) {
  return [
    { duration: '1m', target: Math.round(tepe * 0.1) },
    { duration: '2m', target: tepe },
    { duration: sure, target: tepe },
    { duration: '1m', target: 0 },
  ];
}
const PROFILLER = {
  duman: {
    okuyucu: { executor: 'constant-vus', vus: 3, duration: '30s' },
    yazar: { executor: 'constant-vus', vus: 2, duration: '30s' },
  },
  ortalama: {
    okuyucu: { executor: 'ramping-vus', stages: asamalar(350, '5m') },
    yazar: { executor: 'ramping-vus', stages: asamalar(125, '5m') },
    insan: { executor: 'ramping-vus', stages: asamalar(25, '5m') },
  },
  tepe: {
    okuyucu: { executor: 'ramping-vus', stages: asamalar(7000, '5m') },
    yazar: { executor: 'ramping-vus', stages: asamalar(2500, '5m') },
    insan: { executor: 'ramping-vus', stages: asamalar(500, '5m') },
  },
  // 3 dk boşta (Worker yalıtımları soğusun), sonra 30 sn'de 300 yeni ziyaretçi
  soguk: {
    okuyucu: { executor: 'ramping-arrival-rate', startTime: '3m', startRate: 0, timeUnit: '1s', preAllocatedVUs: 400,
      stages: [{ duration: '10s', target: 30 }, { duration: '20s', target: 0 }] },
  },
};

const senaryolar = {};
for (const [ad, ayar] of Object.entries(PROFILLER[PROFIL] || fail(`bilinmeyen PROFIL: ${PROFIL}`))) {
  senaryolar[ad] = { ...ayar, exec: ad, tags: { senaryo: ad } };
  // Yalnızca kademeli yürütücüler gracefulRampDown alır
  if (ayar.executor === 'ramping-vus') senaryolar[ad].gracefulRampDown = '30s';
}

export const options = {
  scenarios: senaryolar,
  setupTimeout: '5m',
  discardResponseBodies: false,
  // Eşikler: aşılırsa k6 0 dışı kodla çıkar (CI'da kırmızı). Soğuk başlangıç ayrı ölçülür ki ısınmış
  // isteklerin dağılımını bozmasın.
  thresholds: {
    'http_req_duration{islem:oku}': ['p(95)<300', 'p(99)<800'],
    'http_req_duration{islem:yaz}': ['p(95)<800', 'p(99)<2000'],
    'http_req_duration{islem:devret}': ['p(95)<800'],
    'http_req_duration{islem:yeni}': ['p(95)<1000'],
    soguk_baslangic_sure: ['p(95)<1500'],
    beklenmeyen_yanit: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const BASLIK = { 'content-type': 'application/json', origin: KOKEN };
const yetki = (s) => ({ ...BASLIK, authorization: `Bearer ${s.sohbet}.${s.belirtec}` });

const SORULAR = [
  'Windows yanına Linux kurulabilir mi?',
  'Raspberry Pi ile Pi-hole kuruyor musunuz?',
  'Minecraft sunucusu için hangi VPS iyi olur?',
  'Domain ve HTTPS ayarı yapıyor musunuz?',
  'Docker ile ev sunucusu kurmak istiyorum.',
];

// Her sanal kullanıcının kendi değişkeni (k6'da her VU ayrı bir JS ortamıdır)
let ilkIstek = true;

/** Yanıtı sınıflandırır: beklenen başarı, beklenen koruma (429) ya da beklenmeyen. */
function degerlendir(yanit, beklenen, islem) {
  if (ilkIstek) {
    sogukBaslangic.add(yanit.timings.duration, { islem });
    ilkIstek = false;
  }
  // Günlük yeni sohbet sınırı 503 + "yogun" döner; o da koruma, hata değil
  let neden = null;
  if (yanit.status === 429 || yanit.status === 503) {
    try { neden = yanit.json('hata'); } catch { /* JSON değil */ }
  }
  if (yanit.status === 429 || (yanit.status === 503 && neden === 'yogun')) {
    sinirReddi.add(1, { islem, neden: neden || '?' });
    beklenmeyen.add(false);
    return null;
  }
  let govde = null;
  try { govde = yanit.json(); } catch { /* aşağıda */ }
  const tamam = check(yanit, {
    [`${islem}: durum ${beklenen}`]: (r) => beklenen.includes(r.status),
    [`${islem}: JSON`]: () => govde !== null,
    [`${islem}: CORS başlığı`]: (r) => r.headers['Access-Control-Allow-Origin'] === KOKEN,
  });
  beklenmeyen.add(!tamam);
  return tamam ? govde : null;
}

function yeniSohbet() {
  const yanit = http.post(`${HEDEF}/v1/mesaj`, JSON.stringify({ metin: SORULAR[exec.vu.idInTest % SORULAR.length], dil: 'tr' }), {
    headers: BASLIK, tags: { islem: 'yeni', name: 'POST /v1/mesaj (yeni)' },
  });
  const govde = degerlendir(yanit, [201], 'yeni');
  return govde && govde.belirtec ? { sohbet: govde.sohbet, belirtec: govde.belirtec } : null;
}

// --- Hazırlık: okuyucuların yoklayacağı sohbet havuzu ---
export function setup() {
  console.log(`hedef ${HEDEF} (${makine}), profil ${PROFIL}, havuz ${HAVUZ}`);
  const havuz = [];
  for (let i = 0; i < HAVUZ; i++) {
    const yanit = http.post(`${HEDEF}/v1/mesaj`, JSON.stringify({ metin: `Havuz sohbeti ${i}`, dil: 'tr' }), { headers: BASLIK, tags: { islem: 'hazirlik' } });
    if (yanit.status !== 201) fail(`havuz kurulamadı: ${yanit.status} ${yanit.body}`);
    havuz.push({ sohbet: yanit.json('sohbet'), belirtec: yanit.json('belirtec') });
  }
  return { havuz };
}

// --- Senaryolar ---
export function okuyucu(veri) {
  const s = veri.havuz[exec.vu.idInTest % veri.havuz.length];
  const yanit = http.get(`${HEDEF}/v1/mesaj`, { headers: yetki(s), tags: { islem: 'oku', name: 'GET /v1/mesaj' } });
  const govde = degerlendir(yanit, [200], 'oku');
  if (govde) check(govde, { 'oku: mesaj listesi': (g) => Array.isArray(g.mesajlar) && g.mesajlar.length > 0 });
  sleep(10); // sitedeki yoklama aralığı
}

export function yazar() {
  const s = yeniSohbet();
  sleep(5 + Math.random() * 10);
  if (!s) return; // günlük sohbet sınırı: koruma çalıştı, yeni sohbet açılamadı
  for (let i = 0; i < 2; i++) {
    const yanit = http.post(`${HEDEF}/v1/mesaj`, JSON.stringify({ metin: `Ek soru ${i + 1}: ${SORULAR[i]}` }), {
      headers: yetki(s), tags: { islem: 'yaz', name: 'POST /v1/mesaj (mevcut)' },
    });
    const govde = degerlendir(yanit, [200], 'yaz');
    if (govde) check(govde, { 'yaz: son mesaj ziyaretçinin ya da asistanın': (g) => ['ziyaretci', 'asistan'].includes(g.mesajlar[g.mesajlar.length - 1].gonderen) });
    sleep(5 + Math.random() * 15);
  }
}

export function insan() {
  const s = yeniSohbet();
  sleep(3 + Math.random() * 5);
  if (!s) return;
  const yanit = http.post(`${HEDEF}/v1/devret`, null, { headers: yetki(s), tags: { islem: 'devret', name: 'POST /v1/devret' } });
  const govde = degerlendir(yanit, [200], 'devret');
  if (govde) check(govde, { 'devret: asistan sustu': (g) => g.asistan === false });
  sleep(20);
}

export function handleSummary(ozet) {
  const m = (ad, alan) => ozet.metrics[ad]?.values?.[alan];
  const satir = (etiket) => {
    const k = `http_req_duration{islem:${etiket}}`;
    return `${etiket.padEnd(7)} p50 ${Math.round(m(k, 'med') ?? 0)} ms  p95 ${Math.round(m(k, 'p(95)') ?? 0)} ms  p99 ${Math.round(m(k, 'p(99)') ?? 0)} ms`;
  };
  const metin = [
    `Profil: ${PROFIL}  Hedef: ${HEDEF}`,
    `İstek: ${m('http_reqs', 'count')}  (${(m('http_reqs', 'rate') ?? 0).toFixed(1)}/sn)`,
    ...['oku', 'yaz', 'yeni', 'devret'].map(satir),
    `Soğuk başlangıç p95: ${Math.round(m('soguk_baslangic_sure', 'p(95)') ?? 0)} ms`,
    `Koruma (429, 503 yogun): ${m('sinir_reddi', 'count') ?? 0}   Beklenmeyen yanıt oranı: ${((m('beklenmeyen_yanit', 'rate') ?? 0) * 100).toFixed(2)}%`,
    '',
  ].join('\n');
  return { stdout: metin, [`yuk/ozet-${PROFIL}.json`]: JSON.stringify(ozet, null, 1) };
}

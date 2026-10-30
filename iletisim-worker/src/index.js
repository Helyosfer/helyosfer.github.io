// İletişim Worker'ı: hizmetler sayfasındaki sohbet penceresi ile yönetim paneli arasındaki köprü.
//
//   Ziyaretçi (sohbet penceresi, yalnızca IZINLI_KOKENLER'den):
//     POST /v1/mesaj   {metin, ad?, iletisim?, dil?}   → mesaj gönderir; ilk mesajda sohbet açılır
//     GET  /v1/mesaj                                   → sohbetin mesajları (cevapları görmek için)
//     POST /v1/devret                                  → "bir insanla konuşmak istiyorum": asistan susar
//     Sohbet açılınca ziyaretçiye bir belirteç verilir; sonraki isteklerde
//     `Authorization: Bearer <sohbet>.<belirteç>` ile gönderilir. Veritabanında yalnızca özeti durur.
//
//   Panel (/admin, yalnızca Cloudflare Access'ten geçen kişi):
//     GET    /admin                          → panel sayfası
//     GET    /admin/api/sohbetler            → sohbet listesi
//     GET    /admin/api/sohbetler/:id        → sohbet ve mesajları (okundu sayılır)
//     POST   /admin/api/sohbetler/:id/yanit  {metin}
//     POST   /admin/api/sohbetler/:id/durum  {durum: "acik" | "kapali"}
//     DELETE /admin/api/sohbetler/:id
//
// - Asistan (src/asistan.js) basit soruları cevaplar. Sohbeti devrettiğinde, çalışamadığında ya da
//   ziyaretçi istediğinde asistan o sohbette susar ve sohbet Helyosfer'e geçer.
// - Sohbet Helyosfer'e geçince ALICI adresine Proton SMTP üzerinden e-posta gider (src/eposta.js) (sonra aynı sohbetten en fazla 15 dakikada bir,
//   günde en fazla 40). Asistan konuşurken e-posta gitmez; sohbetler yine panelde görünür.
//   Ziyaretçi e-posta bıraktıysa e-postaya "yanıtla" denince ona yazılır.
// - İstek sınırları Cloudflare'ın kendi sayacıdır; IP Worker'da saklanmaz, kayda yazılmaz.

import {
  GUNLUK_BILDIRIM_SINIRI,
  GUNLUK_SOHBET_SINIRI,
  GirdiHatasi,
  SOHBET_MESAJ_SINIRI,
  bildirimGerekli,
  bildirimMetni,
  epostaMi,
  esitMi,
  kokenIzinli,
  mesajDenetle,
  ozetle,
  sinirAnahtari,
  yanitDenetle,
  yeniBelirtec,
  yetkiCoz,
} from './dogrula.js';
import { connect } from 'cloudflare:sockets';

import { GUNLUK_ASISTAN_SINIRI, asistanBolgedeUygun, asistanaSor, devirMesaji } from './asistan.js';
import { smtpGonder } from './eposta.js';
import { accessDogrula } from './erisim.js';
import { PANEL_CSS, PANEL_HTML, PANEL_JS } from './panel.js';

const JSON_TURU = 'application/json; charset=utf-8';

function json(govde, durum = 200, ekBasliklar = {}) {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { 'content-type': JSON_TURU, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...ekBasliklar },
  });
}

const hata = (kod, durum, ek) => json({ hata: kod }, durum, ek);

async function sinirda(sinirlayici, anahtar) {
  // Bağlantı tanımlı değilse istek reddedilir: sınırsız bir uç nokta e-posta bombasına açık olur
  if (!sinirlayici) return true;
  try {
    const { success } = await sinirlayici.limit({ key: anahtar });
    return !success;
  } catch {
    return true;
  }
}

const GOVDE_EN_FAZLA = 16_000;

async function govdeOku(istek) {
  if (!(istek.headers.get('content-type') || '').includes('application/json')) throw new GirdiHatasi('gecersiz');
  // Büyük gövde belleğe okunmadan reddedilir; tarayıcı fetch'i her zaman Content-Length gönderir
  const uzunluk = Number(istek.headers.get('content-length'));
  if (!uzunluk) throw new GirdiHatasi('gecersiz');
  if (uzunluk > GOVDE_EN_FAZLA) throw new GirdiHatasi('cok_uzun');
  const metin = await istek.text();
  if (metin.length > GOVDE_EN_FAZLA) throw new GirdiHatasi('cok_uzun');
  try {
    return JSON.parse(metin);
  } catch {
    throw new GirdiHatasi('gecersiz');
  }
}

const mesajSutunlari = 'id, gonderen, metin, zaman';

/** Sohbetin mesajları; `sonra` verilirse yalnızca o numaradan yeniler (pencerenin yoklaması için). */
async function mesajlariGetir(db, sohbetId, sonra = 0) {
  const { results } = await db
    .prepare(`SELECT ${mesajSutunlari} FROM mesajlar WHERE sohbet_id = ? AND id > ? ORDER BY id`)
    .bind(sohbetId, sonra)
    .all();
  return results;
}

// ---------- Ziyaretçi ----------

function corsBasliklari(koken) {
  return {
    'access-control-allow-origin': koken,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

/**
 * Belirteci doğrular; geçerliyse sohbet satırını döner. `mesajSayisi` istenirse ziyaretçinin o sohbetteki mesaj
 * sayısı da aynı sorguda gelir (ayrı bir gidiş-dönüş yerine).
 */
async function sohbetBul(db, yetki, { mesajSayisi = false } = {}) {
  if (!yetki) return null;
  const sayi = mesajSayisi
    ? ", (SELECT COUNT(*) FROM mesajlar WHERE sohbet_id = s.id AND gonderen = 'ziyaretci') AS ziyaretci_mesaj"
    : '';
  const sohbet = await db.prepare(`SELECT s.*${sayi} FROM sohbetler s WHERE s.id = ?`).bind(yetki.id).first();
  if (!sohbet) return null;
  return esitMi(sohbet.belirtec_ozeti, await ozetle(yetki.belirtec)) ? sohbet : null;
}

/** E-postaya konacak son konuşma: kim ne yazdı, en yeni en altta. */
function konusmaOzeti(mesajlar) {
  const adlar = { ziyaretci: 'Ziyaretçi', asistan: 'Asistan', ben: 'Sen' };
  return mesajlar
    .slice(-8)
    .map((m) => `${adlar[m.gonderen] || m.gonderen}: ${m.metin}`)
    .join('\n\n');
}

async function asistanKotasiVar(db, simdi) {
  const { sayi } = await db
    .prepare("SELECT COUNT(*) AS sayi FROM mesajlar WHERE gonderen = 'asistan' AND zaman > ?")
    .bind(simdi - 24 * 60 * 60 * 1000)
    .first();
  return sayi < GUNLUK_ASISTAN_SINIRI;
}

/** Sohbeti Helyosfer'e geçirir: asistanın son sözünü yazar ve asistanı o sohbette kapatır. */
function devretSorgulari(db, sohbetId, metin, simdi) {
  return [
    db.prepare("INSERT INTO mesajlar (sohbet_id, gonderen, metin, zaman) VALUES (?, 'asistan', ?, ?)").bind(sohbetId, metin, simdi),
    db.prepare('UPDATE sohbetler SET asistan = 0, guncelleme = ? WHERE id = ?').bind(simdi, sohbetId),
  ];
}

async function bildir(env, sohbet, metin, simdi) {
  if (!env.SMTP_SIFRESI || !env.ALICI || !env.GONDEREN) return;
  const { sayi } = await env.DB
    .prepare('SELECT COUNT(*) AS sayi FROM sohbetler WHERE son_bildirim > ?')
    .bind(simdi - 24 * 60 * 60 * 1000)
    .first();
  if (sayi >= GUNLUK_BILDIRIM_SINIRI) return;

  await env.DB.prepare('UPDATE sohbetler SET son_bildirim = ? WHERE id = ?').bind(simdi, sohbet.id).run();
  const { konu, metin: govde } = bildirimMetni(sohbet, metin, env.PANEL_ADRESI || '');
  const eposta = {
    gonderen: env.GONDEREN,
    alici: env.ALICI,
    konu,
    metin: govde,
    yanitla: epostaMi(sohbet.iletisim) ? sohbet.iletisim : null,
  };
  const ayar = { kullanici: env.GONDEREN, sifre: env.SMTP_SIFRESI };
  try {
    await Promise.race([
      smtpGonder(ayar, eposta, connect),
      new Promise((_, reddet) => setTimeout(() => reddet(new Error('smtp zaman aşımı')), 20_000)),
    ]);
  } catch (e) {
    // Mesaj zaten kaydedildi; bildirim gitmese de panelde görünür
    console.error('bildirim gönderilemedi', e && e.message);
  }
}

async function mesajAl(istek, env, ctx, cors, url, simdi) {
  const ip = sinirAnahtari(istek.headers.get('cf-connecting-ip'));
  if (await sinirda(env.MESAJ_SINIRI, ip)) return hata('cok_hizli', 429, cors);

  let girdi;
  try {
    girdi = mesajDenetle(await govdeOku(istek));
  } catch (e) {
    if (e instanceof GirdiHatasi) return hata(e.kod, 400, cors);
    throw e;
  }

  const yetki = yetkiCoz(istek.headers.get('authorization'));
  let sohbet = await sohbetBul(env.DB, yetki, { mesajSayisi: true });
  if (yetki && !sohbet) return hata('sohbet_yok', 404, cors);

  let belirtec = null;
  if (!sohbet) {
    if (await sinirda(env.SOHBET_SINIRI, ip)) return hata('cok_hizli', 429, cors);
    // Herkes için toplam sınır: çok sayıda adresten gelen spam paneli doldurup asistan ve e-posta kotasını bitirmesin
    const { sayi } = await env.DB
      .prepare('SELECT COUNT(*) AS sayi FROM sohbetler WHERE olusturma > ?')
      .bind(simdi - 24 * 60 * 60 * 1000)
      .first();
    // 429 değil: ziyaretçi hızlı gitmedi, site yoğun. Sayfa "biraz sonra deneyin ya da e-posta gönderin" der.
    if (sayi >= GUNLUK_SOHBET_SINIRI) return hata('yogun', 503, { ...cors, 'retry-after': '3600' });
    belirtec = yeniBelirtec();
    sohbet = {
      id: crypto.randomUUID(),
      ad: girdi.ad,
      iletisim: girdi.iletisim,
      dil: girdi.dil,
      asistan: 1,
      son_bildirim: null,
    };
    await env.DB
      .prepare(
        `INSERT INTO sohbetler (id, belirtec_ozeti, ad, iletisim, dil, olusturma, guncelleme)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(sohbet.id, await ozetle(belirtec), girdi.ad, girdi.iletisim, girdi.dil, simdi, simdi)
      .run();
  } else {
    if (sohbet.ziyaretci_mesaj >= SOHBET_MESAJ_SINIRI) return hata('sohbet_dolu', 429, cors);
    // Sonradan bırakılan ad ya da iletişim bilgisi eskisinin üstüne yazılır
    sohbet.ad = girdi.ad || sohbet.ad;
    sohbet.iletisim = girdi.iletisim || sohbet.iletisim;
  }

  await env.DB.batch([
    env.DB
      .prepare("INSERT INTO mesajlar (sohbet_id, gonderen, metin, zaman) VALUES (?, 'ziyaretci', ?, ?)")
      .bind(sohbet.id, girdi.metin, simdi),
    env.DB
      .prepare(
        `UPDATE sohbetler SET ad = ?, iletisim = ?, durum = 'acik', okunmamis = okunmamis + 1, guncelleme = ?
         WHERE id = ?`,
      )
      .bind(sohbet.ad, sohbet.iletisim, simdi, sohbet.id),
  ]);

  // Asistan konuşuyorsa geçmiş ve günlük kota aynı anda sorulur (iki ayrı bekleme yerine bir)
  const bolgeUygun = sohbet.asistan && asistanBolgedeUygun(istek.cf?.country, yerelGelistirme(env, url));
  const [mesajlar, kotaVar] = await Promise.all([
    mesajlariGetir(env.DB, sohbet.id),
    bolgeUygun ? asistanKotasiVar(env.DB, simdi) : false,
  ]);
  let devredildi = false;

  // Asistan bu sohbette hâlâ konuşuyorsa cevabını bekle. Bölge uygun değilse, günlük sınır dolduysa
  // ya da Gemini cevap veremezse sohbet hemen Helyosfer'e geçer.
  if (sohbet.asistan) {
    const sonuc = bolgeUygun && kotaVar ? await asistanaSor(mesajlar, env) : null;
    const zaman = Date.now();
    let metin;
    let sonuclar;
    if (sonuc && !sonuc.devret) {
      metin = sonuc.cevap;
      sonuclar = [
        await env.DB
          .prepare("INSERT INTO mesajlar (sohbet_id, gonderen, metin, zaman) VALUES (?, 'asistan', ?, ?)")
          .bind(sohbet.id, metin, zaman)
          .run(),
      ];
    } else {
      metin = sonuc ? sonuc.cevap : devirMesaji(girdi.dil);
      sonuclar = await env.DB.batch(devretSorgulari(env.DB, sohbet.id, metin, zaman));
      sohbet.asistan = 0;
      devredildi = true;
    }
    // Yazılan satırı listeye ekle; geçmişi yeniden sorgulamaya gerek yok
    mesajlar.push({ id: sonuclar[0].meta.last_row_id, gonderen: 'asistan', metin, zaman });
  }

  if (!sohbet.asistan && (devredildi || bildirimGerekli(sohbet.son_bildirim, simdi))) {
    ctx.waitUntil(bildir(env, sohbet, konusmaOzeti(mesajlar), simdi));
  }

  const yanit = { sohbet: sohbet.id, asistan: Boolean(sohbet.asistan), mesajlar };
  if (belirtec) yanit.belirtec = belirtec;
  return json(yanit, belirtec ? 201 : 200, cors);
}

async function insanaBagla(istek, env, ctx, cors, simdi) {
  const ip = sinirAnahtari(istek.headers.get('cf-connecting-ip'));
  if (await sinirda(env.MESAJ_SINIRI, ip)) return hata('cok_hizli', 429, cors);
  const sohbet = await sohbetBul(env.DB, yetkiCoz(istek.headers.get('authorization')));
  if (!sohbet) return hata('sohbet_yok', 404, cors);
  const devredilecek = Boolean(sohbet.asistan);
  if (devredilecek) {
    await env.DB.batch(devretSorgulari(env.DB, sohbet.id, devirMesaji(sohbet.dil), simdi));
    sohbet.asistan = 0;
  }
  const mesajlar = await mesajlariGetir(env.DB, sohbet.id);
  if (devredilecek) ctx.waitUntil(bildir(env, sohbet, konusmaOzeti(mesajlar), simdi));
  return json({ durum: sohbet.durum, asistan: false, mesajlar }, 200, cors);
}

async function mesajlariVer(istek, env, cors, url) {
  const ip = sinirAnahtari(istek.headers.get('cf-connecting-ip'));
  if (await sinirda(env.OKUMA_SINIRI, ip)) return hata('cok_hizli', 429, cors);
  const sohbet = await sohbetBul(env.DB, yetkiCoz(istek.headers.get('authorization')));
  if (!sohbet) return hata('sohbet_yok', 404, cors);
  // ?sonra=<son görülen mesaj numarası>: yalnızca yeni mesajlar döner. Pencere 10 sn'de bir yokladığı için
  // her seferinde bütün geçmişi göndermek gereksiz (en kötü durumda ~350 KB).
  const sonra = Number.parseInt(url.searchParams.get('sonra'), 10);
  const mesajlar = await mesajlariGetir(env.DB, sohbet.id, Number.isSafeInteger(sonra) && sonra > 0 ? sonra : 0);
  return json({ durum: sohbet.durum, asistan: Boolean(sohbet.asistan), mesajlar }, 200, cors);
}

async function ziyaretci(istek, env, ctx, url, simdi) {
  const koken = istek.headers.get('origin');
  if (!kokenIzinli(koken, env.IZINLI_KOKENLER)) return hata('koken', 403);
  const cors = corsBasliklari(koken);
  if (url.pathname !== '/v1/mesaj' && url.pathname !== '/v1/devret') return hata('yok', 404, cors);
  if (istek.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (url.pathname === '/v1/devret') {
    return istek.method === 'POST' ? insanaBagla(istek, env, ctx, cors, simdi) : hata('yontem', 405, cors);
  }
  if (istek.method === 'POST') return mesajAl(istek, env, ctx, cors, url, simdi);
  if (istek.method === 'GET') return mesajlariVer(istek, env, cors, url);
  return hata('yontem', 405, cors);
}

// ---------- Panel ----------

const PANEL_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function panelDosyasi(govde, tur) {
  return new Response(govde, {
    headers: {
      'content-type': tur,
      'cache-control': 'no-store',
      'content-security-policy': PANEL_CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
}

/** Yalnızca yerelde (wrangler dev) ve .dev.vars'ta GELISTIRME=1 iken Access atlanır. */
function yerelGelistirme(env, url) {
  return env.GELISTIRME === '1' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

async function panel(istek, env, url, simdi) {
  const kisi = yerelGelistirme(env, url) ? 'gelistirme' : await accessDogrula(istek, env);
  if (!kisi) return hata('yetki', 403);

  const yol = url.pathname.replace(/\/+$/, '') || '/admin';
  if (istek.method === 'GET' && yol === '/admin') return panelDosyasi(PANEL_HTML, 'text/html; charset=utf-8');
  if (istek.method === 'GET' && yol === '/admin/panel.js') return panelDosyasi(PANEL_JS, 'text/javascript; charset=utf-8');
  if (istek.method === 'GET' && yol === '/admin/panel.css') return panelDosyasi(PANEL_CSS, 'text/css; charset=utf-8');

  // Değiştiren istekler yalnızca panelin kendi sayfasından gelebilir (başka bir sitenin formu Access çerezini kullanamasın)
  if (istek.method !== 'GET') {
    const koken = istek.headers.get('origin');
    if (istek.headers.get('x-panel') !== '1' || (koken && koken !== url.origin)) return hata('yetki', 403);
  }

  // ?durum=acik|kapali|hepsi&adet=N: süzme sunucuda yapılır; "Daha eski sohbetler" adet'i artırır
  if (istek.method === 'GET' && yol === '/admin/api/sohbetler') {
    const durum = url.searchParams.get('durum');
    const suz = durum === 'acik' || durum === 'kapali';
    const adet = Math.min(Math.max(Number.parseInt(url.searchParams.get('adet'), 10) || 100, 1), 1000);
    const { results } = await env.DB
      .prepare(
        // Son mesaj satır başına tek bir alt sorguyla bulunur (mesajlar_sohbet indeksi: sohbet_id, id)
        `SELECT s.id, s.ad, s.iletisim, s.dil, s.durum, s.asistan, s.okunmamis, s.olusturma, s.guncelleme,
                m.metin AS son_mesaj, m.gonderen AS son_gonderen
         FROM sohbetler s
         LEFT JOIN mesajlar m ON m.id = (SELECT MAX(id) FROM mesajlar WHERE sohbet_id = s.id)
         ${suz ? 'WHERE s.durum = ?1' : ''} ORDER BY s.guncelleme DESC LIMIT ${suz ? '?2' : '?1'}`,
      )
      .bind(...(suz ? [durum, adet + 1] : [adet + 1]))
      .all();
    return json({ sohbetler: results.slice(0, adet), devam: results.length > adet });
  }

  const eslesme = /^\/admin\/api\/sohbetler\/([0-9a-f-]{36})(?:\/(yanit|durum))?$/.exec(yol);
  if (!eslesme) return hata('yok', 404);
  const [, id, islem] = eslesme;
  const sohbet = await env.DB
    .prepare('SELECT id, ad, iletisim, dil, durum, asistan, okunmamis, olusturma, guncelleme FROM sohbetler WHERE id = ?')
    .bind(id)
    .first();
  if (!sohbet) return hata('sohbet_yok', 404);

  try {
    if (istek.method === 'GET' && !islem) {
      await env.DB.prepare('UPDATE sohbetler SET okunmamis = 0 WHERE id = ?').bind(id).run();
      return json({ sohbet: { ...sohbet, okunmamis: 0 }, mesajlar: await mesajlariGetir(env.DB, id) });
    }
    if (istek.method === 'POST' && islem === 'yanit') {
      const metin = yanitDenetle(await govdeOku(istek));
      await env.DB.batch([
        env.DB
          .prepare("INSERT INTO mesajlar (sohbet_id, gonderen, metin, zaman) VALUES (?, 'ben', ?, ?)")
          .bind(id, metin, simdi),
        // Sen yazınca asistan o sohbette susar
        env.DB.prepare('UPDATE sohbetler SET guncelleme = ?, okunmamis = 0, asistan = 0 WHERE id = ?').bind(simdi, id),
      ]);
      return json({ mesajlar: await mesajlariGetir(env.DB, id) });
    }
    if (istek.method === 'POST' && islem === 'durum') {
      const govde = await govdeOku(istek);
      const durum = govde && typeof govde === 'object' ? govde.durum : null;
      if (durum !== 'acik' && durum !== 'kapali') throw new GirdiHatasi('gecersiz');
      await env.DB.prepare('UPDATE sohbetler SET durum = ? WHERE id = ?').bind(durum, id).run();
      return json({ durum });
    }
    if (istek.method === 'DELETE' && !islem) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM mesajlar WHERE sohbet_id = ?').bind(id),
        env.DB.prepare('DELETE FROM sohbetler WHERE id = ?').bind(id),
      ]);
      return json({ silindi: true });
    }
  } catch (e) {
    if (e instanceof GirdiHatasi) return hata(e.kod, 400);
    throw e;
  }
  return hata('yontem', 405);
}

export default {
  async fetch(istek, env, ctx) {
    const url = new URL(istek.url);
    const simdi = Date.now();
    try {
      if (url.pathname.startsWith('/v1/')) return await ziyaretci(istek, env, ctx, url, simdi);
      if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await panel(istek, env, url, simdi);
      return hata('yok', 404);
    } catch (e) {
      console.error('beklenmeyen hata', e && e.message);
      return hata('sunucu', 500);
    }
  },
};

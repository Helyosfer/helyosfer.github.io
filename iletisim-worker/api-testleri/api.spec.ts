// İletişim Worker'ı — Modül 5: Arka Uç API, Sınır Değer, Sözleşme (OpenAPI) ve Güvenlik Testleri.
// Çalıştırma: npm run test:api
import { expect, test } from '@playwright/test';

import { DEVRE_MESAJI_EN, DEVRE_MESAJI_TR } from './sabitler.mjs';
import { yanitiSozlesmeyeGoreDogrula } from './openapi-dogrula.mjs';
import { geciciWorkerBaslat, sahteJwksKur } from './ortam.mjs';
import { DESTEK_KONULARI, panelYanitiUret, tohumla, ucDurumlar, ziyaretciGovdesiUret } from './veri-uretici.mjs';

const IZINLI_KOKEN = 'http://127.0.0.1:5500';
const KOKEN_BASLIGI = { Origin: IZINLI_KOKEN };
const PANEL_BASLIGI = { 'x-panel': '1', Origin: 'http://127.0.0.1:8787' };

test.beforeEach(() => {
  tohumla(20261030);
});

test.describe('1. Ziyaretçi API — Fonksiyonel, Sentetik Veri (Faker.js) ve Sözleşme Testleri', () => {
  test('API-01 CORS ön kontrolü (OPTIONS): izinli kökene 204, yabancı kökene 403 döner', async ({ request }) => {
    const izinli = await request.fetch('/v1/mesaj', {
      method: 'OPTIONS',
      headers: {
        Origin: IZINLI_KOKEN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, authorization',
      },
    });
    expect(izinli.status()).toBe(204);
    expect(izinli.headers()['access-control-allow-origin']).toBe(IZINLI_KOKEN);
    expect(izinli.headers()['access-control-allow-methods']).toContain('POST');
    expect(izinli.headers()['access-control-allow-headers']).toContain('authorization');
    expect(izinli.headers()['vary']).toBe('Origin');
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'OPTIONS', durum: 204, govde: null, basliklar: izinli.headers() });

    for (const sahteKoken of ['https://kotu.example', 'null', 'https://helyosfer.me.kotu.example']) {
      const red = await request.fetch('/v1/mesaj', {
        method: 'OPTIONS',
        headers: { Origin: sahteKoken },
      });
      expect(red.status()).toBe(403);
      expect(red.headers()['access-control-allow-origin']).toBeUndefined();
      const govde = await red.json();
      expect(govde).toEqual({ hata: 'koken' });
      yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'OPTIONS', durum: 403, govde, basliklar: red.headers() });
    }
  });

  test('API-02 POST /v1/mesaj: Faker.js ile üretilen 5 destek konusunda (TR ve EN) yeni sohbet açılır', async ({ request }) => {
    for (const konu of DESTEK_KONULARI) {
      const dil = konu === 'domain' || konu === 'sunucu' ? 'en' : 'tr';
      const girdi = ziyaretciGovdesiUret({ konu, dil, iletisimTuru: dil === 'en' ? 'telefon' : 'eposta' });

      const yanit = await request.post('/v1/mesaj', {
        headers: KOKEN_BASLIGI,
        data: girdi,
      });

      expect(yanit.status()).toBe(201);
      expect(yanit.headers()['x-content-type-options']).toBe('nosniff');
      expect(yanit.headers()['cache-control']).toBe('no-store');
      expect(yanit.headers()['access-control-allow-origin']).toBe(IZINLI_KOKEN);

      const govde = await yanit.json();
      yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 201, govde, basliklar: yanit.headers() });

      expect(govde.belirtec).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(govde.asistan).toBe(true);
      expect(govde.mesajlar).toHaveLength(2);
      expect(govde.mesajlar[0]).toMatchObject({ gonderen: 'ziyaretci', metin: girdi.metin });
      expect(govde.mesajlar[1]).toMatchObject({ gonderen: 'asistan' });
    }
  });

  test('API-03 POST /v1/mesaj: mevcut sohbete belirteçle mesaj eklenir, sonradan verilen iletişim bilgisi güncellenir', async ({ request }) => {
    const ilkGirdi = { metin: 'Merhaba, Linux kurulumu için sorum var.', dil: 'tr' };
    const ilkYanit = await request.post('/v1/mesaj', { headers: KOKEN_BASLIGI, data: ilkGirdi });
    expect(ilkYanit.status()).toBe(201);
    const ilkGovde = await ilkYanit.json();
    const yetki = `Bearer ${ilkGovde.sohbet}.${ilkGovde.belirtec}`;

    const ekBilgi = ziyaretciGovdesiUret({ konu: 'linux', dil: 'tr' });
    const ikinciYanit = await request.post('/v1/mesaj', {
      headers: { ...KOKEN_BASLIGI, Authorization: yetki },
      data: ekBilgi,
    });
    expect(ikinciYanit.status()).toBe(200);
    const ikinciGovde = await ikinciYanit.json();
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 200, govde: ikinciGovde, basliklar: ikinciYanit.headers() });

    expect(ikinciGovde.sohbet).toBe(ilkGovde.sohbet);
    expect(ikinciGovde.belirtec).toBeUndefined();
    expect(ikinciGovde.mesajlar).toHaveLength(4);

    // Panel üzerinden ad ve iletişim bilgisinin güncellendiğini doğrula
    const detay = await (await request.get(`/admin/api/sohbetler/${ilkGovde.sohbet}`)).json();
    expect(detay.sohbet).toMatchObject({ ad: ekBilgi.ad, iletisim: ekBilgi.iletisim });
  });

  test('API-04 GET /v1/mesaj ve ?sonra=: tam geçmişi ve yalnızca yeni mesajları getirir, bozuk sonra değerlerini yoksayar', async ({ request }) => {
    const acilis = await (await request.post('/v1/mesaj', { headers: KOKEN_BASLIGI, data: ziyaretciGovdesiUret({ konu: 'minecraft', dil: 'tr' }) })).json();
    const yetki = `Bearer ${acilis.sohbet}.${acilis.belirtec}`;
    const sonMesajId = acilis.mesajlar.at(-1).id;

    // 1) Yeni mesaj yokken ?sonra=sonMesajId boş dizi döner
    const bosYoklama = await request.get(`/v1/mesaj?sonra=${sonMesajId}`, {
      headers: { ...KOKEN_BASLIGI, Authorization: yetki },
    });
    expect(bosYoklama.status()).toBe(200);
    const bosGovde = await bosYoklama.json();
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'GET', durum: 200, govde: bosGovde, basliklar: bosYoklama.headers() });
    expect(bosGovde.mesajlar).toEqual([]);
    expect(bosGovde.durum).toBe('acik');

    // 2) Yeni mesaj eklendikten sonra ?sonra=sonMesajId yalnızca yeni mesajları döner
    await request.post('/v1/mesaj', {
      headers: { ...KOKEN_BASLIGI, Authorization: yetki },
      data: { metin: 'Mod paketi olarak Fabric düşünüyoruz.' },
    });

    const yeniYoklama = await request.get(`/v1/mesaj?sonra=${sonMesajId}`, {
      headers: { ...KOKEN_BASLIGI, Authorization: yetki },
    });
    const yeniGovde = await yeniYoklama.json();
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'GET', durum: 200, govde: yeniGovde });
    expect(yeniGovde.mesajlar).toHaveLength(2);
    expect(yeniGovde.mesajlar.every((m: { id: number }) => m.id > sonMesajId)).toBe(true);

    // 3) Negatif, sıfır, metin veya güvenli olmayan tamsayı ?sonra= değerlerinde tüm geçmiş (4 mesaj) döner
    for (const gecersizSonra of ['-10', '0', 'abc', '9007199254740999']) {
      const tam = await (
        await request.get(`/v1/mesaj?sonra=${gecersizSonra}`, {
          headers: { ...KOKEN_BASLIGI, Authorization: yetki },
        })
      ).json();
      expect(tam.mesajlar).toHaveLength(4);
    }
  });

  test('API-05 POST /v1/devret: sohbeti insana devreder, tekrar çağrıldığında idempotent çalışır ve asistan susar', async ({ request }) => {
    const acilis = await (
      await request.post('/v1/mesaj', {
        headers: KOKEN_BASLIGI,
        data: ziyaretciGovdesiUret({ konu: 'sunucu', dil: 'en' }),
      })
    ).json();
    const yetki = `Bearer ${acilis.sohbet}.${acilis.belirtec}`;

    const devir1 = await request.post('/v1/devret', {
      headers: { ...KOKEN_BASLIGI, Authorization: yetki },
    });
    expect(devir1.status()).toBe(200);
    const devirGovde1 = await devir1.json();
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/devret', yontem: 'POST', durum: 200, govde: devirGovde1, basliklar: devir1.headers() });
    expect(devirGovde1.asistan).toBe(false);
    expect(devirGovde1.mesajlar).toHaveLength(3);
    expect(devirGovde1.mesajlar.at(-1).metin).toBe(DEVRE_MESAJI_EN);

    // İkinci kez devret çağrıldığında yeni mesaj eklenmez
    const devir2 = await request.post('/v1/devret', {
      headers: { ...KOKEN_BASLIGI, Authorization: yetki },
    });
    expect(devir2.status()).toBe(200);
    const devirGovde2 = await devir2.json();
    expect(devirGovde2.mesajlar).toHaveLength(3);

    // Devirden sonra ziyaretçi yazdığında asistan cevap vermez
    const sonraki = await (
      await request.post('/v1/mesaj', {
        headers: { ...KOKEN_BASLIGI, Authorization: yetki },
        data: { metin: 'I am waiting for your reply.', dil: 'en' },
      })
    ).json();
    expect(sonraki.asistan).toBe(false);
    expect(sonraki.mesajlar).toHaveLength(4);
    expect(sonraki.mesajlar.at(-1).gonderen).toBe('ziyaretci');
  });
});

test.describe('2. Ziyaretçi API — Sınır Değer, Uç Durum ve Negatif Testler', () => {
  test('API-06 uç durumlar: emoji korunur; sıfır genişlikli, RTL ve denetim karakterleri temizlenir', async ({ request }) => {
    for (const vaka of [ucDurumlar.emojiMesaji(), ucDurumlar.sifirGenislikliVeDenetimMesaji(), ucDurumlar.rtlMesaji()]) {
      const yanit = await request.post('/v1/mesaj', {
        headers: KOKEN_BASLIGI,
        data: { metin: vaka.girdi, ad: '  Ali\u200B\r\n\u202EVeli  ' },
      });
      expect(yanit.status()).toBe(201);
      const govde = await yanit.json();
      expect(govde.mesajlar[0].metin).toBe(vaka.beklenen);

      const detay = await (await request.get(`/admin/api/sohbetler/${govde.sohbet}`)).json();
      expect(detay.sohbet.ad).toBe('Ali Veli');
    }
  });

  test('API-07 üst sınır değerler (tam sınırda kabul): 2000 krk metin, 80 krk ad, 120 krk iletişim', async ({ request }) => {
    const metin = ucDurumlar.tamSinirMesaj();
    const ad = ucDurumlar.tamSinirAd();
    const iletisim = ucDurumlar.tamSinirIletisim();

    const yanit = await request.post('/v1/mesaj', {
      headers: KOKEN_BASLIGI,
      data: { metin, ad, iletisim, dil: 'tr' },
    });
    expect(yanit.status()).toBe(201);
    const govde = await yanit.json();
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 201, govde });
    expect(govde.mesajlar[0].metin).toHaveLength(2000);

    const detay = await (await request.get(`/admin/api/sohbetler/${govde.sohbet}`)).json();
    expect(detay.sohbet.ad).toHaveLength(80);
    expect(detay.sohbet.iletisim).toHaveLength(120);
  });

  test('API-08 üst sınır aşımı (400 cok_uzun): 2001 krk metin, 81 krk ad, 121 krk iletişim, >16000 bayt gövde', async ({ request }) => {
    const vakalar = [
      { metin: ucDurumlar.sinirUstuMesaj() },
      { metin: 'Merhaba', ad: ucDurumlar.sinirUstuAd() },
      { metin: 'Merhaba', iletisim: ucDurumlar.sinirUstuIletisim() },
    ];

    for (const veri of vakalar) {
      const yanit = await request.post('/v1/mesaj', { headers: KOKEN_BASLIGI, data: veri });
      expect(yanit.status()).toBe(400);
      const govde = await yanit.json();
      expect(govde).toEqual({ hata: 'cok_uzun' });
      yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 400, govde });
    }

    // 16.000 bayt gövde sınırı aşımı
    const buyukYanit = await request.fetch('/v1/mesaj', {
      method: 'POST',
      headers: { ...KOKEN_BASLIGI, 'Content-Type': 'application/json' },
      data: ucDurumlar.buyukGovdeJson(),
    });
    expect(buyukYanit.status()).toBe(400);
    expect(await buyukYanit.json()).toEqual({ hata: 'cok_uzun' });
  });

  test('API-09 negatif girdi doğrulaması: boş metin (bos), bot tuzağı, yanlış tür, bozuk JSON ve yanlış Content-Type (gecersiz)', async ({ request }) => {
    // 1) Boş veya temizlenince boş kalan metinler -> 400 bos
    for (const bosMetin of ['', '   \n\t  ', '\u200B\u200C\uFEFF\u0007']) {
      const yanit = await request.post('/v1/mesaj', { headers: KOKEN_BASLIGI, data: { metin: bosMetin } });
      expect(yanit.status()).toBe(400);
      const govde = await yanit.json();
      expect(govde).toEqual({ hata: 'bos' });
      yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 400, govde });
    }

    // 2) Bot tuzağı (web alanı dolu) ve yanlış veri türleri -> 400 gecersiz
    const gecersizGovdeler = [
      ucDurumlar.botTuzagiGovdesi(),
      { metin: 12345 },
      { metin: ['dizi'] },
      { metin: 'Merhaba', ad: { nesne: true } },
      { metin: 'Merhaba', iletisim: ['eposta@ornek.test'] },
    ];
    for (const veri of gecersizGovdeler) {
      const yanit = await request.post('/v1/mesaj', { headers: KOKEN_BASLIGI, data: veri });
      expect(yanit.status()).toBe(400);
      const govde = await yanit.json();
      expect(govde).toEqual({ hata: 'gecersiz' });
      yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 400, govde });
    }

    // 3) Bozuk JSON gövdesi -> 400 gecersiz
    const bozukJson = await request.fetch('/v1/mesaj', {
      method: 'POST',
      headers: { ...KOKEN_BASLIGI, 'Content-Type': 'application/json' },
      data: '{"metin": "eksik tirnak}',
    });
    expect(bozukJson.status()).toBe(400);
    expect(await bozukJson.json()).toEqual({ hata: 'gecersiz' });

    // 4) Yanlış Content-Type (text/plain) -> 400 gecersiz
    const yanlisTur = await request.fetch('/v1/mesaj', {
      method: 'POST',
      headers: { ...KOKEN_BASLIGI, 'Content-Type': 'text/plain' },
      data: JSON.stringify({ metin: 'Merhaba' }),
    });
    expect(yanlisTur.status()).toBe(400);
    expect(await yanlisTur.json()).toEqual({ hata: 'gecersiz' });
  });

  test('API-10 yetki, köken ve yönlendirme hataları: sohbet_yok (404), koken (403), yontem (405), yok (404)', async ({ request }) => {
    const sahteYetki = `Bearer 00000000-0000-4000-8000-000000000000.${'A'.repeat(43)}`;

    // 1) Var olmayan sohbet belirteci ile POST /v1/mesaj, GET /v1/mesaj ve POST /v1/devret -> 404 sohbet_yok
    for (const istekFn of [
      () => request.post('/v1/mesaj', { headers: { ...KOKEN_BASLIGI, Authorization: sahteYetki }, data: { metin: 'Deneme' } }),
      () => request.get('/v1/mesaj', { headers: { ...KOKEN_BASLIGI, Authorization: sahteYetki } }),
      () => request.get('/v1/mesaj', { headers: { ...KOKEN_BASLIGI, Authorization: 'Bearer bozuk-bicim' } }),
      () => request.get('/v1/mesaj', { headers: KOKEN_BASLIGI }),
      () => request.post('/v1/devret', { headers: { ...KOKEN_BASLIGI, Authorization: sahteYetki } }),
    ]) {
      const yanit = await istekFn();
      expect(yanit.status()).toBe(404);
      expect(await yanit.json()).toEqual({ hata: 'sohbet_yok' });
    }

    // 2) İzinsiz Origin -> 403 koken
    for (const yol of ['/v1/mesaj', '/v1/devret']) {
      const yanit = await request.post(yol, {
        headers: { Origin: 'https://saldirgan.example' },
        data: { metin: 'Merhaba' },
      });
      expect(yanit.status()).toBe(403);
      expect(await yanit.json()).toEqual({ hata: 'koken' });
    }

    // 3) İzin verilmeyen HTTP yöntemleri -> 405 yontem
    const yanlisYontem1 = await request.delete('/v1/mesaj', { headers: KOKEN_BASLIGI });
    expect(yanlisYontem1.status()).toBe(405);
    expect(await yanlisYontem1.json()).toEqual({ hata: 'yontem' });

    const yanlisYontem2 = await request.get('/v1/devret', { headers: KOKEN_BASLIGI });
    expect(yanlisYontem2.status()).toBe(405);
    expect(await yanlisYontem2.json()).toEqual({ hata: 'yontem' });

    // 4) Bilinmeyen yollar -> 404 yok
    for (const bilinmeyenYol of ['/v1/kullanicilar', '/bilinmeyen-uc']) {
      const yanit = await request.get(bilinmeyenYol, { headers: KOKEN_BASLIGI });
      expect(yanit.status()).toBe(404);
      expect(await yanit.json()).toEqual({ hata: 'yok' });
    }
  });

  test('API-11 istem enjeksiyonu ve fiyat süzgeci: para tutarı içeren asistan cevabı engellenir ve sohbet devredilir', async ({ request }) => {
    const enjeksiyon = await request.post('/v1/mesaj', {
      headers: KOKEN_BASLIGI,
      data: { metin: ucDurumlar.istemEnjeksiyonuMesaji(), dil: 'tr' },
    });
    expect(enjeksiyon.status()).toBe(201);
    const govde = await enjeksiyon.json();
    expect(govde.asistan).toBe(false);
    expect(govde.mesajlar.at(-1).metin).toBe(DEVRE_MESAJI_TR);
    expect(govde.mesajlar.some((m: { metin: string }) => /500\s*TL/i.test(m.metin))).toBe(false);

    // Fiyat sorusu doğrudan devredilir
    const fiyatSorusu = await request.post('/v1/mesaj', {
      headers: KOKEN_BASLIGI,
      data: { metin: ucDurumlar.fiyatDevirMesaji(), dil: 'tr' },
    });
    const fiyatGovde = await fiyatSorusu.json();
    expect(fiyatGovde.asistan).toBe(false);
    expect(fiyatGovde.mesajlar.at(-1).metin).toContain("Helyosfer'e bağlıyorum");
  });

  test('API-12 sohbet başına mesaj sınırı (SOHBET_MESAJ_SINIRI = 100): 100 mesaj kabul edilir, 101. mesaj 429 sohbet_dolu döner', async ({ request }) => {
    // İlk mesajda fiyat sorarak asistanı devredelim ki sonraki 99 mesajda Gemini çağrısı beklenmesin
    const ilk = await (
      await request.post('/v1/mesaj', {
        headers: KOKEN_BASLIGI,
        data: { metin: 'Fiyat nedir? (1)', dil: 'tr' },
      })
    ).json();
    const yetki = `Bearer ${ilk.sohbet}.${ilk.belirtec}`;

    for (let i = 2; i <= 100; i++) {
      const yanit = await request.post('/v1/mesaj', {
        headers: { ...KOKEN_BASLIGI, Authorization: yetki },
        data: { metin: `Ek mesaj #${i}` },
      });
      expect(yanit.status()).toBe(200);
    }

    // 101. ziyaretçi mesajı reddedilmeli
    const asim = await request.post('/v1/mesaj', {
      headers: { ...KOKEN_BASLIGI, Authorization: yetki },
      data: { metin: 'Mesaj #101 (sınır aşımı)' },
    });
    expect(asim.status()).toBe(429);
    const asimGovde = await asim.json();
    expect(asimGovde).toEqual({ hata: 'sohbet_dolu' });
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 429, govde: asimGovde, basliklar: asim.headers() });
  });
});

test.describe('3. Panel API — CRUD, Sayfalama, Güvenlik Başlıkları ve CSRF Testleri', () => {
  test('API-13 panel dosyaları (/admin, panel.js, panel.css) katı güvenlik başlıklarıyla sunulur', async ({ request }) => {
    const sayfa = await request.get('/admin');
    expect(sayfa.status()).toBe(200);
    expect(sayfa.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(sayfa.headers()['content-security-policy']).toContain("script-src 'self'");
    expect(sayfa.headers()['x-content-type-options']).toBe('nosniff');
    expect(sayfa.headers()['referrer-policy']).toBe('no-referrer');
    expect(sayfa.headers()['cache-control']).toBe('no-store');

    expect((await request.get('/admin/panel.js')).status()).toBe(200);
    expect((await request.get('/admin/panel.css')).status()).toBe(200);
  });

  test('API-14 panel yaşam döngüsü: listeleme (?durum=&adet=), okuma, cevaplama, kapatma/açma ve silme', async ({ request }) => {
    const yeni = await (
      await request.post('/v1/mesaj', {
        headers: KOKEN_BASLIGI,
        data: ziyaretciGovdesiUret({ konu: 'format', dil: 'tr' }),
      })
    ).json();
    const id = yeni.sohbet;

    // 1) Listeleme ve sayfalama (adet=1 iken devam: true)
    const listeYanit = await request.get('/admin/api/sohbetler?durum=acik&adet=1');
    expect(listeYanit.status()).toBe(200);
    const listeGovde = await listeYanit.json();
    expect(listeGovde.sohbetler).toHaveLength(1);
    expect(typeof listeGovde.devam).toBe('boolean');

    // 2) Sohbet detayı okuma -> okunmamis sıfırlanır
    const detayYanit = await request.get(`/admin/api/sohbetler/${id}`);
    expect(detayYanit.status()).toBe(200);
    const detayGovde = await detayYanit.json();
    expect(detayGovde.sohbet.id).toBe(id);
    expect(detayGovde.sohbet.okunmamis).toBe(0);

    // 3) Panelden cevap yazma -> asistan susar
    const cevapMetni = panelYanitiUret('tr');
    const yanitla = await request.post(`/admin/api/sohbetler/${id}/yanit`, {
      headers: PANEL_BASLIGI,
      data: { metin: cevapMetni },
    });
    expect(yanitla.status()).toBe(200);
    const yanitGovde = await yanitla.json();
    expect(yanitGovde.mesajlar.at(-1)).toMatchObject({ gonderen: 'ben', metin: cevapMetni });

    // 4) Durumu kapatma ve yeniden açma
    const kapat = await request.post(`/admin/api/sohbetler/${id}/durum`, {
      headers: PANEL_BASLIGI,
      data: { durum: 'kapali' },
    });
    expect(kapat.status()).toBe(200);
    expect(await kapat.json()).toEqual({ durum: 'kapali' });

    const kapaliListe = await (await request.get('/admin/api/sohbetler?durum=kapali&adet=50')).json();
    expect(kapaliListe.sohbetler.some((s: { id: string }) => s.id === id)).toBe(true);

    const ac = await request.post(`/admin/api/sohbetler/${id}/durum`, {
      headers: PANEL_BASLIGI,
      data: { durum: 'acik' },
    });
    expect(ac.status()).toBe(200);
    expect(await ac.json()).toEqual({ durum: 'acik' });

    // 5) Sohbeti silme ve sonrasında 404 doğrulaması
    const sil = await request.delete(`/admin/api/sohbetler/${id}`, { headers: PANEL_BASLIGI });
    expect(sil.status()).toBe(200);
    expect(await sil.json()).toEqual({ silindi: true });

    const silinmis = await request.get(`/admin/api/sohbetler/${id}`);
    expect(silinmis.status()).toBe(404);
    expect(await silinmis.json()).toEqual({ hata: 'sohbet_yok' });
  });

  test('API-15 panel CSRF koruması (x-panel ve Origin) ve negatif girdi denetimleri', async ({ request }) => {
    const yeni = await (
      await request.post('/v1/mesaj', {
        headers: KOKEN_BASLIGI,
        data: { metin: 'CSRF deneme sohbeti' },
      })
    ).json();
    const id = yeni.sohbet;

    // 1) x-panel: 1 başlığı olmadan POST ve DELETE -> 403 yetki
    expect((await request.post(`/admin/api/sohbetler/${id}/yanit`, { data: { metin: 'Deneme' } })).status()).toBe(403);
    expect((await request.post(`/admin/api/sohbetler/${id}/durum`, { data: { durum: 'kapali' } })).status()).toBe(403);
    expect((await request.delete(`/admin/api/sohbetler/${id}`)).status()).toBe(403);

    // 2) x-panel: 1 var ama yabancı Origin -> 403 yetki
    const yabanciBaslik = { 'x-panel': '1', Origin: 'https://kotu.example' };
    const csrfYanit = await request.post(`/admin/api/sohbetler/${id}/yanit`, {
      headers: yabanciBaslik,
      data: { metin: 'CSRF' },
    });
    expect(csrfYanit.status()).toBe(403);
    expect(await csrfYanit.json()).toEqual({ hata: 'yetki' });

    // 3) Panel yanıt ve durum doğrulama hataları -> 400
    const bosYanit = await request.post(`/admin/api/sohbetler/${id}/yanit`, {
      headers: PANEL_BASLIGI,
      data: { metin: '   ' },
    });
    expect(bosYanit.status()).toBe(400);
    expect(await bosYanit.json()).toEqual({ hata: 'bos' });

    const uzunYanit = await request.post(`/admin/api/sohbetler/${id}/yanit`, {
      headers: PANEL_BASLIGI,
      data: { metin: ucDurumlar.sinirUstuMesaj() },
    });
    expect(uzunYanit.status()).toBe(400);
    expect(await uzunYanit.json()).toEqual({ hata: 'cok_uzun' });

    const gecersizDurum = await request.post(`/admin/api/sohbetler/${id}/durum`, {
      headers: PANEL_BASLIGI,
      data: { durum: 'arsivlendi' },
    });
    expect(gecersizDurum.status()).toBe(400);
    expect(await gecersizDurum.json()).toEqual({ hata: 'gecersiz' });

    // 4) Var olmayan UUID (404 sohbet_yok), bozuk UUID yolu (404 yok) ve yanlış yöntem (405 yontem)
    const olmayanId = '00000000-0000-4000-8000-000000000099';
    const olmayanYanit = await request.post(`/admin/api/sohbetler/${olmayanId}/yanit`, {
      headers: PANEL_BASLIGI,
      data: { metin: 'Merhaba' },
    });
    expect(olmayanYanit.status()).toBe(404);
    expect(await olmayanYanit.json()).toEqual({ hata: 'sohbet_yok' });

    const bozukYol = await request.get('/admin/api/sohbetler/gecersiz-id');
    expect(bozukYol.status()).toBe(404);
    expect(await bozukYol.json()).toEqual({ hata: 'yok' });

    const yanlisYontem = await request.put(`/admin/api/sohbetler/${id}`, { headers: PANEL_BASLIGI });
    expect(yanlisYontem.status()).toBe(405);
    expect(await yanlisYontem.json()).toEqual({ hata: 'yontem' });
  });
});

test.describe('4. Kilitli Panel (Sahte JWKS + RS256 JWT), Hız Sınırları ve Günlük Kota Testleri', () => {
  let jwks: Awaited<ReturnType<typeof sahteJwksKur>>;
  let geciciWorker: Awaited<ReturnType<typeof geciciWorkerBaslat>>;

  test.beforeAll(async () => {
    jwks = await sahteJwksKur(8791);
    geciciWorker = await geciciWorkerBaslat({
      port: 8789,
      inspectorPort: 9249,
      jwksPort: 8791,
      geminiPort: 8790,
      mesajLimiti: 5,
      sohbetLimiti: 2,
      okumaLimiti: 4,
    });
  });

  test.afterAll(async () => {
    if (geciciWorker) await geciciWorker.kapat();
    if (jwks) await jwks.kapat();
  });

  test('API-16 Cloudflare Access JWT doğrulaması: sahte JWKS ile geçerli, geçersiz ve döndürülmüş (rotated) anahtarlar', async ({ request }) => {
    const taban = geciciWorker.adres;

    // 1) Belirteçsiz erişim reddedilir (403 yetki)
    const kilitsiz = await request.get(`${taban}/admin/api/sohbetler`);
    expect(kilitsiz.status()).toBe(403);
    expect(await kilitsiz.json()).toEqual({ hata: 'yetki' });

    // 2) Geçerli RS256 JWT ile erişim kabul edilir (200) ve JWKS anahtarı önbelleğe alınır
    const gecerliJwt = await jwks.jwtImzala();
    const basarili1 = await request.get(`${taban}/admin/api/sohbetler`, {
      headers: { 'cf-access-jwt-assertion': gecerliJwt },
    });
    expect(basarili1.status()).toBe(200);
    const ilkJwksSayisi = jwks.istekSayisi();
    expect(ilkJwksSayisi).toBe(1);

    const basarili2 = await request.get(`${taban}/admin/api/sohbetler`, {
      headers: { 'cf-access-jwt-assertion': gecerliJwt },
    });
    expect(basarili2.status()).toBe(200);
    expect(jwks.istekSayisi()).toBe(1); // Önbellekten doğrulandı

    // 3) Geçersiz JWT varyasyonları -> 403 yetki
    const simdiSn = Math.floor(Date.now() / 1000);
    const gecersizBelirtecler = [
      await jwks.jwtImzala({ exp: simdiSn - 10 }), // Süresi dolmuş
      await jwks.jwtImzala({ nbf: simdiSn + 300 }), // Henüz başlamamış (>60 sn tolerans dışı)
      await jwks.jwtImzala({ aud: ['yanlis-aud'] }), // Yanlış AUD
      await jwks.jwtImzala({ iss: 'https://kotu.cloudflareaccess.com' }), // Yanlış ISS
      await jwks.jwtImzala({}, { baslik: { alg: 'none', kid: 'anahtar-1' } }), // alg: none
      await jwks.jwtImzala({}, { anahtar: jwks.yabanci }), // JWKS'te olmayan yabancı anahtar
      `${gecerliJwt.split('.').slice(0, 2).join('.')}.bozukImzaVerisi`, // İmzası bozulmuş
    ];

    for (const sahteJwt of gecersizBelirtecler) {
      const red = await request.get(`${taban}/admin/api/sohbetler`, {
        headers: { 'cf-access-jwt-assertion': sahteJwt },
      });
      expect(red.status()).toBe(403);
      expect(await red.json()).toEqual({ hata: 'yetki' });
    }

    // 4) Anahtar rotasyonu: JWKS'e anahtar-2 eklendiğinde Worker JWKS'i tazeleyip yeni anahtarı kabul eder
    jwks.ikincilAnahtariYayinla();
    const yeniAnahtarJwt = await jwks.jwtImzala({}, { anahtar: jwks.ikincil });
    const rotasyonYanit = await request.get(`${taban}/admin/api/sohbetler`, {
      headers: { 'cf-access-jwt-assertion': yeniAnahtarJwt },
    });
    expect(rotasyonYanit.status()).toBe(200);
  });

  test('API-17 IP başına hız sınırları (429 cok_hizli) ve IPv6 /64 alt ağ gruplaması', async ({ request }) => {
    const taban = geciciWorker.adres;

    // 1) SOHBET_SINIRI (limit = 2): aynı IPv4'ten 2 yeni sohbet açılır, 3.'sü 429 cok_hizli alır
    const ipv4Baslik = { ...KOKEN_BASLIGI, 'cf-connecting-ip': '203.0.113.55' };
    const s1 = await request.post(`${taban}/v1/mesaj`, { headers: ipv4Baslik, data: { metin: 'Sohbet 1' } });
    const s2 = await request.post(`${taban}/v1/mesaj`, { headers: ipv4Baslik, data: { metin: 'Sohbet 2' } });
    const s3 = await request.post(`${taban}/v1/mesaj`, { headers: ipv4Baslik, data: { metin: 'Sohbet 3' } });
    expect(s1.status()).toBe(201);
    expect(s2.status()).toBe(201);
    expect(s3.status()).toBe(429);
    expect(await s3.json()).toEqual({ hata: 'cok_hizli' });

    // 2) IPv6 /64 gruplaması: aynı /64 bloğundaki farklı adresler aynı sınırı paylaşır
    const ipv6A = { ...KOKEN_BASLIGI, 'cf-connecting-ip': '2001:db8:abcd:0042::1' };
    const ipv6B = { ...KOKEN_BASLIGI, 'cf-connecting-ip': '2001:db8:abcd:42:ffff:1111:2222:3333' };
    const ipv6C = { ...KOKEN_BASLIGI, 'cf-connecting-ip': '2001:0db8:abcd:0042:1234:5678:9abc:def0' };
    expect((await request.post(`${taban}/v1/mesaj`, { headers: ipv6A, data: { metin: 'IPv6 1' } })).status()).toBe(201);
    expect((await request.post(`${taban}/v1/mesaj`, { headers: ipv6B, data: { metin: 'IPv6 2' } })).status()).toBe(201);
    const ipv6Sinir = await request.post(`${taban}/v1/mesaj`, { headers: ipv6C, data: { metin: 'IPv6 3' } });
    expect(ipv6Sinir.status()).toBe(429);
    expect(await ipv6Sinir.json()).toEqual({ hata: 'cok_hizli' });

    // 3) MESAJ_SINIRI (limit = 5) ve OKUMA_SINIRI (limit = 4)
    const mesajIp = { ...KOKEN_BASLIGI, 'cf-connecting-ip': '198.51.100.77' };
    const acilan = await (await request.post(`${taban}/v1/mesaj`, { headers: mesajIp, data: { metin: 'Fiyat nedir?' } })).json();
    const yetki = `Bearer ${acilan.sohbet}.${acilan.belirtec}`;

    for (let i = 2; i <= 5; i++) {
      const m = await request.post(`${taban}/v1/mesaj`, {
        headers: { ...mesajIp, Authorization: yetki },
        data: { metin: `Mesaj ${i}` },
      });
      expect(m.status()).toBe(200);
    }
    const altinciMesaj = await request.post(`${taban}/v1/mesaj`, {
      headers: { ...mesajIp, Authorization: yetki },
      data: { metin: 'Mesaj 6 (sınırda)' },
    });
    expect(altinciMesaj.status()).toBe(429);
    expect(await altinciMesaj.json()).toEqual({ hata: 'cok_hizli' });

    for (let i = 1; i <= 4; i++) {
      const okuma = await request.get(`${taban}/v1/mesaj`, {
        headers: { ...mesajIp, Authorization: yetki },
      });
      expect(okuma.status()).toBe(200);
    }
    const besinciOkuma = await request.get(`${taban}/v1/mesaj`, {
      headers: { ...mesajIp, Authorization: yetki },
    });
    expect(besinciOkuma.status()).toBe(429);
    const okumaHataGovde = await besinciOkuma.json();
    expect(okumaHataGovde).toEqual({ hata: 'cok_hizli' });
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'GET', durum: 429, govde: okumaHataGovde, basliklar: besinciOkuma.headers() });
  });

  test('API-18 günlük 300 yeni sohbet sınırı (GUNLUK_SOHBET_SINIRI): 503 yogun ve Retry-After: 3600 döner, mevcut sohbet çalışır', async ({ request }) => {
    const taban = geciciWorker.adres;

    // Önce mevcut bir sohbet açalım
    const mevcutIp = { ...KOKEN_BASLIGI, 'cf-connecting-ip': '192.0.2.10' };
    const mevcut = await (await request.post(`${taban}/v1/mesaj`, { headers: mevcutIp, data: { metin: 'Mevcut sohbet' } })).json();
    const mevcutYetki = `Bearer ${mevcut.sohbet}.${mevcut.belirtec}`;

    // Veritabanına son 24 saat içinde oluşturulmuş 300 sohbet kaydı ekleyelim
    const simdi = Date.now();
    geciciWorker.sqlCalistir(`
      WITH RECURSIVE sayac(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM sayac WHERE x < 300)
      INSERT INTO sohbetler (id, belirtec_ozeti, ad, iletisim, dil, olusturma, guncelleme)
      SELECT printf('00000000-0000-4000-8000-%012d', x), 'ozet', NULL, NULL, 'tr', ${simdi}, ${simdi} FROM sayac;
    `);

    // Yeni bir IP'den yeni sohbet açma denemesi 503 yogun ve Retry-After: 3600 dönmeli
    const yeniIp = { ...KOKEN_BASLIGI, 'cf-connecting-ip': '192.0.2.99' };
    const yogunYanit = await request.post(`${taban}/v1/mesaj`, {
      headers: yeniIp,
      data: { metin: 'Yeni sohbet denemesi' },
    });
    expect(yogunYanit.status()).toBe(503);
    expect(yogunYanit.headers()['retry-after']).toBe('3600');
    const yogunGovde = await yogunYanit.json();
    expect(yogunGovde).toEqual({ hata: 'yogun' });
    yanitiSozlesmeyeGoreDogrula({ yol: '/v1/mesaj', yontem: 'POST', durum: 503, govde: yogunGovde, basliklar: yogunYanit.headers() });

    // Ancak mevcut sohbete mesaj gönderme 200 ile çalışmaya devam etmeli
    const mevcutDevam = await request.post(`${taban}/v1/mesaj`, {
      headers: { ...mevcutIp, Authorization: mevcutYetki },
      data: { metin: 'Mevcut sohbette devam ediyorum.' },
    });
    expect(mevcutDevam.status()).toBe(200);
  });
});

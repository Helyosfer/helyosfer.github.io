import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asistanBolgedeUygun, asistanaSor, cevapCoz, devirMesaji, gecmisOlustur, maskele, paraIceriyor } from '../src/asistan.js';

test('maskeleme: e-posta, telefon, IBAN, IP, bağlantı ve adres gizlenir', () => {
  const metin = maskele(
    'Bana ali.veli@ornek.com ya da +90 555 123 45 67 adresinden ulaşın. IBAN TR12 0006 1005 1978 6457 8413 26. ' +
      'Sunucu 192.168.1.20, site https://ornek.com/a. Adres Çiçek Sokak No: 5 daire 3.',
  );
  assert.ok(!metin.includes('ali.veli'));
  assert.ok(!metin.includes('555'));
  assert.ok(!metin.includes('1978'));
  assert.ok(!metin.includes('192.168'));
  assert.ok(!metin.includes('ornek.com/a'));
  assert.ok(!/No: 5/.test(metin));
  assert.match(metin, /\[e-posta\].*\[numara\].*\[IBAN\].*\[IP\].*\[bağlantı\]/s);
});

test('maskeleme: sıradan metne ve kısa sayılara dokunmaz', () => {
  const metin = 'Raspberry Pi 5 üzerinde 20 kişilik Minecraft 1.21 sunucusu, no thanks';
  assert.equal(maskele(metin), metin);
});

test('bölge: Avrupa, İngiltere, İsviçre ve bilinmeyen ülke asistan almaz', () => {
  assert.ok(asistanBolgedeUygun('TR', false));
  assert.ok(asistanBolgedeUygun('US', false));
  for (const ulke of ['DE', 'FR', 'NL', 'GB', 'CH', 'NO', 'IS']) assert.ok(!asistanBolgedeUygun(ulke, false), ulke);
  assert.ok(!asistanBolgedeUygun(undefined, false));
  assert.ok(!asistanBolgedeUygun('T1', false));
  assert.ok(asistanBolgedeUygun(undefined, true));
});

test('geçmiş: roller, birleştirme, maskeleme; Helyosfer\'in mesajları gönderilmez', () => {
  const icerik = gecmisOlustur([
    { gonderen: 'asistan', metin: 'eski' },
    { gonderen: 'ziyaretci', metin: 'Merhaba' },
    { gonderen: 'ziyaretci', metin: 'numaram 0555 123 45 67' },
    { gonderen: 'asistan', metin: 'Buyurun' },
    { gonderen: 'ben', metin: 'insan cevabı' },
  ]);
  assert.deepEqual(icerik, [
    { role: 'user', parts: [{ text: 'Merhaba\n\nnumaram [numara]' }] },
    { role: 'model', parts: [{ text: 'Buyurun' }] },
  ]);
});

test('cevap çözme', () => {
  const yanit = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });
  assert.deepEqual(cevapCoz(yanit('{"cevap":" Evet. ","devret":false}')), { cevap: 'Evet.', devret: false });
  assert.deepEqual(cevapCoz(yanit('{"cevap":"Bağlıyorum","devret":true}')), { cevap: 'Bağlıyorum', devret: true });
  assert.equal(cevapCoz(yanit('düz metin')), null);
  assert.equal(cevapCoz(yanit('{"cevap":"","devret":false}')), null);
  assert.equal(cevapCoz({}), null);
});

test('Gemini isteği: anahtar başlıkta, sistem talimatı ve şema gönderilir', async () => {
  let giden;
  const sahte = async (url, secenek) => {
    giden = { url, secenek, govde: JSON.parse(secenek.body) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"cevap":"Olur","devret":false}' }] } }] }));
  };
  const sonuc = await asistanaSor([{ gonderen: 'ziyaretci', metin: 'Dual boot?' }], { GEMINI_ANAHTARI: 'k', GEMINI_MODEL: 'm' }, sahte);
  assert.deepEqual(sonuc, { cevap: 'Olur', devret: false });
  assert.equal(giden.url, 'https://generativelanguage.googleapis.com/v1beta/models/m:generateContent');
  assert.equal(giden.secenek.headers['x-goog-api-key'], 'k');
  assert.ok(!giden.url.includes('key='));
  assert.match(giden.govde.systemInstruction.parts[0].text, /devret/);
  assert.equal(giden.govde.generationConfig.responseMimeType, 'application/json');
});

test('Gemini hatası, anahtar yokluğu ya da ağ hatası null döner', async () => {
  const mesajlar = [{ gonderen: 'ziyaretci', metin: 'a' }];
  assert.equal(await asistanaSor(mesajlar, {}, async () => assert.fail('istek gitmemeli')), null);
  assert.equal(await asistanaSor(mesajlar, { GEMINI_ANAHTARI: 'k' }, async () => new Response('', { status: 429 })), null);
  assert.equal(await asistanaSor(mesajlar, { GEMINI_ANAHTARI: 'k' }, async () => { throw new TypeError('ağ'); }), null);
});

test('devir mesajı iki dilde', () => {
  assert.match(devirMesaji('tr'), /Helyosfer'e ilettim/);
  assert.match(devirMesaji('en'), /Helyosfer/);
});

test('fiyat süzgeci: para tutarı içeren asistan cevabı gösterilmez', () => {
  for (const metin of ['Format 500 TL olur.', 'Bu iş ₺750', "1.500 lira'ya yapılır", '20 € yeterli', 'It costs $40', '40 USD', '50 tl\'ye']) {
    assert.ok(paraIceriyor(metin), metin);
  }
  for (const metin of ['Ubuntu 24.04 LTS kurulabilir.', '8 GB RAM yeterli', 'Port 25565 açılmalı', 'Tailscale ücretsiz katmanı var']) {
    assert.ok(!paraIceriyor(metin), metin);
  }
  const yanit = (cevap) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ cevap, devret: false }) }] } }] });
  assert.equal(cevapCoz(yanit('Tamam, 50 TL olur.')), null);
  assert.deepEqual(cevapCoz(yanit('Evet, Minecraft sunucusu kurulabilir.')), { cevap: 'Evet, Minecraft sunucusu kurulabilir.', devret: false });
});

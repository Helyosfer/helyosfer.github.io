import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SmtpHatasi, mesajOlustur, smtpGonder } from '../src/eposta.js';

/**
 * Sahte SMTP sunucusu: istemcinin yazdığı her satıra senaryodaki sıradaki yanıtı verir.
 * Cloudflare soketi gibi readable/writable ve startTls() sunar.
 */
function sahteSunucu(senaryo) {
  const gelen = [];
  let tls = false;
  let kanal;
  let veriModu = false;
  let veri = '';
  const yanitlar = [...senaryo];
  const kodlayici = new TextEncoder();
  const cozucu = new TextDecoder();

  function yeniKanal() {
    let denetleyici;
    const readable = new ReadableStream({ start: (d) => { denetleyici = d; } });
    const gonder = (metin) => denetleyici.enqueue(kodlayici.encode(metin));
    const writable = new WritableStream({
      write(parca) {
        const metin = cozucu.decode(parca);
        if (veriModu) {
          veri += metin;
          if (veri.endsWith('\r\n.\r\n')) {
            veriModu = false;
            gelen.push({ veri, tls });
            gonder(yanitlar.shift());
          }
          return;
        }
        gelen.push({ komut: metin.trim(), tls });
        if (metin.trim() === 'DATA') veriModu = true;
        if (yanitlar.length) gonder(yanitlar.shift());
      },
    });
    return { readable, writable, gonder, close: async () => {} };
  }

  kanal = yeniKanal();
  const soket = {
    get readable() { return kanal.readable; },
    get writable() { return kanal.writable; },
    startTls() {
      tls = true;
      kanal = yeniKanal();
      return { readable: kanal.readable, writable: kanal.writable, close: async () => {} };
    },
    close: async () => {},
  };
  const baglan = (adres, secenek) => {
    gelen.push({ baglanti: adres, secenek });
    queueMicrotask(() => kanal.gonder(yanitlar.shift()));
    return soket;
  };
  return { baglan, gelen };
}

const BASARILI = [
  '220 mail.protonmail.ch ESMTP\r\n',
  '250-mail.protonmail.ch\r\n250-STARTTLS\r\n250 8BITMIME\r\n',
  '220 2.0.0 Ready to start TLS\r\n',
  '250-mail.protonmail.ch\r\n250 AUTH PLAIN LOGIN\r\n',
  '235 2.7.0 Authentication successful\r\n',
  '250 2.1.0 Ok\r\n',
  '250 2.1.5 Ok\r\n',
  '354 End data with <CR><LF>.<CR><LF>\r\n',
  '250 2.0.0 Ok: queued\r\n',
  '221 2.0.0 Bye\r\n',
];

const EPOSTA = {
  gonderen: 'mail@helyosfer.me',
  alici: 'mail@helyosfer.me',
  konu: 'Yeni mesaj: Ayşe',
  metin: 'Merhaba\nMinecraft sunucusu',
  yanitla: 'ayse@ornek.com',
};

test('SMTP: STARTTLS sonrası giriş yapar, gönderir; şifre düz kanalda gitmez', async () => {
  const { baglan, gelen } = sahteSunucu(BASARILI);
  await smtpGonder({ kullanici: 'mail@helyosfer.me', sifre: 'token-123' }, EPOSTA, baglan);

  assert.deepEqual(gelen[0].baglanti, { hostname: 'smtp.protonmail.ch', port: 587 });
  assert.equal(gelen[0].secenek.secureTransport, 'starttls');
  const komutlar = gelen.filter((g) => g.komut);
  assert.deepEqual(
    komutlar.map((k) => k.komut.split(' ')[0]),
    ['EHLO', 'STARTTLS', 'EHLO', 'AUTH', 'MAIL', 'RCPT', 'DATA', 'QUIT'],
  );
  const giris = komutlar.find((k) => k.komut.startsWith('AUTH'));
  assert.ok(giris.tls, 'giriş şifreli kanalda olmalı');
  assert.equal(Buffer.from(giris.komut.split(' ')[2], 'base64').toString(), '\0mail@helyosfer.me\0token-123');
  assert.ok(komutlar.filter((k) => !k.tls).every((k) => !k.komut.includes('AUTH')));
  assert.ok(gelen.find((g) => g.veri).veri.endsWith('\r\n.\r\n'));
});

test('SMTP: yanlış token hatası adımıyla birlikte fırlatılır', async () => {
  const senaryo = [...BASARILI.slice(0, 4), '535 5.7.8 Authentication failed\r\n'];
  const { baglan } = sahteSunucu(senaryo);
  await assert.rejects(
    smtpGonder({ kullanici: 'mail@helyosfer.me', sifre: 'yanlis' }, EPOSTA, baglan),
    (e) => e instanceof SmtpHatasi && e.adim === 'giris',
  );
});

test('mesaj: Türkçe konu kodlanır, gövde base64, Reply-To ziyaretçi', () => {
  const ham = mesajOlustur({ ...EPOSTA, tarih: new Date(Date.UTC(2026, 9, 30)), kimlik: 'abc' });
  const [baslik, govde] = ham.split('\r\n\r\n');
  assert.match(baslik, /^Subject: =\?UTF-8\?B\?/m);
  assert.match(baslik, /^Reply-To: <ayse@ornek\.com>$/m);
  assert.match(baslik, /^Message-ID: <abc@helyosfer\.me>$/m);
  assert.equal(Buffer.from(govde.replace(/\r\n/g, ''), 'base64').toString(), 'Merhaba\r\nMinecraft sunucusu');
  assert.ok(!/\r\n\./.test(govde), 'satır başında nokta olmamalı');
});

test('mesaj: konudaki satır sonu yeni başlık açamaz', () => {
  const ham = mesajOlustur({ ...EPOSTA, konu: 'Merhaba\r\nBcc: kotu@ornek.com', yanitla: null });
  assert.ok(!/^Bcc:/m.test(ham));
  assert.ok(!/^Reply-To:/m.test(ham));
});

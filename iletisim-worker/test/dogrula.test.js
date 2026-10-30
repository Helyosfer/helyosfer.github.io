import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BILDIRIM_ARASI_MS,
  GirdiHatasi,
  METIN_EN_FAZLA,
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
} from '../src/dogrula.js';

const hataKodu = (fn) => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof GirdiHatasi);
    return e.kod;
  }
  assert.fail('hata bekleniyordu');
};

test('mesaj: boşluklar ve denetim karakterleri temizlenir', () => {
  const girdi = mesajDenetle({ metin: '  Merhaba\r\n\r\n\r\n\r\nformat​ lazım\u0007  ', ad: '  Ali \n Veli ', dil: 'en' });
  assert.equal(girdi.metin, 'Merhaba\n\nformat lazım');
  assert.equal(girdi.ad, 'Ali Veli');
  assert.equal(girdi.iletisim, null);
  assert.equal(girdi.dil, 'en');
});

test('mesaj: bilinmeyen dil Türkçe sayılır', () => {
  assert.equal(mesajDenetle({ metin: 'a', dil: 'de' }).dil, 'tr');
});

test('mesaj: boş, çok uzun, yanlış türde ya da tuzak alanı dolu olanlar reddedilir', () => {
  assert.equal(hataKodu(() => mesajDenetle({ metin: ' \n ' })), 'bos');
  assert.equal(hataKodu(() => mesajDenetle({})), 'bos');
  assert.equal(hataKodu(() => mesajDenetle({ metin: 'a'.repeat(METIN_EN_FAZLA + 1) })), 'cok_uzun');
  assert.equal(hataKodu(() => mesajDenetle({ metin: 'a', ad: 'x'.repeat(81) })), 'cok_uzun');
  assert.equal(hataKodu(() => mesajDenetle({ metin: 42 })), 'gecersiz');
  assert.equal(hataKodu(() => mesajDenetle({ metin: 'a', web: 'http://spam' })), 'gecersiz');
  assert.equal(hataKodu(() => mesajDenetle(null)), 'gecersiz');
});

test('yanıt: yalnızca metin', () => {
  assert.equal(yanitDenetle({ metin: ' Tamam, cumartesi uygun. ' }), 'Tamam, cumartesi uygun.');
  assert.equal(hataKodu(() => yanitDenetle({ metin: '' })), 'bos');
});

test('e-posta biçimi', () => {
  assert.ok(epostaMi('ali@ornek.com'));
  assert.ok(!epostaMi('0555 555 55 55'));
  assert.ok(!epostaMi('ali@ornek'));
  assert.ok(!epostaMi('a@b.com\nBcc: x@y.com'));
  assert.ok(!epostaMi(null));
});

test('yetki başlığı', () => {
  const belirtec = yeniBelirtec();
  assert.equal(belirtec.length, 43);
  const id = crypto.randomUUID();
  assert.deepEqual(yetkiCoz(`Bearer ${id}.${belirtec}`), { id, belirtec });
  assert.equal(yetkiCoz(`Bearer ${id}`), null);
  assert.equal(yetkiCoz(`Bearer ${id}.${belirtec}x`), null);
  assert.equal(yetkiCoz(null), null);
});

test('özet ve karşılaştırma', async () => {
  const ozet = await ozetle('abc');
  assert.equal(ozet, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.ok(esitMi(ozet, await ozetle('abc')));
  assert.ok(!esitMi(ozet, await ozetle('abd')));
  assert.ok(!esitMi(ozet, ozet.slice(1)));
});

test('köken listesi', () => {
  const liste = 'https://helyosfer.me, http://127.0.0.1:5500';
  assert.ok(kokenIzinli('https://helyosfer.me', liste));
  assert.ok(kokenIzinli('http://127.0.0.1:5500', liste));
  assert.ok(!kokenIzinli('https://helyosfer.me.kotu.com', liste));
  assert.ok(!kokenIzinli(null, liste));
  assert.ok(!kokenIzinli('https://helyosfer.me', ''));
});

test('bildirim aralığı', () => {
  assert.ok(bildirimGerekli(null, 1000));
  assert.ok(!bildirimGerekli(1000, 1000 + BILDIRIM_ARASI_MS - 1));
  assert.ok(bildirimGerekli(1000, 1000 + BILDIRIM_ARASI_MS));
});

test('bildirim metni: konu tek satır, panel bağlantısı sohbete gider', () => {
  const sohbet = { id: 'abc', ad: 'Ayşe\nBcc: x', iletisim: 'ayse@ornek.com', dil: 'tr' };
  const { konu, metin } = bildirimMetni(sohbet, 'Minecraft sunucusu', 'https://iletisim.helyosfer.me/admin');
  assert.ok(!/[\r\n]/.test(konu));
  assert.match(metin, /Minecraft sunucusu/);
  assert.match(metin, /https:\/\/iletisim\.helyosfer\.me\/admin#abc/);
});

test('e-posta: gizli alıcı ya da hazır metin eklenmiş adresler reddedilir', () => {
  assert.ok(epostaMi('ali.veli+is@ornek.com.tr'));
  assert.ok(!epostaMi('a@b.co?bcc=saldirgan@kotu.example'));
  assert.ok(!epostaMi('a@b.co&body=merhaba'));
  assert.ok(!epostaMi('<a@b.co>'));
  assert.ok(!epostaMi('a b@ornek.com'));
});

test('hız sınırı anahtarı: IPv6 /64 bloğuna, IPv4 adresin kendisine uygulanır', () => {
  assert.equal(sinirAnahtari('203.0.113.7'), '203.0.113.7');
  assert.equal(sinirAnahtari(null), 'yerel');
  const blok = '2001:db8:aa:bb::/64';
  assert.equal(sinirAnahtari('2001:db8:aa:bb:1:2:3:4'), blok);
  assert.equal(sinirAnahtari('2001:0db8:00aa:00bb:ffff::1'), blok);
  assert.equal(sinirAnahtari('2001:DB8:AA:BB::'), blok);
  assert.equal(sinirAnahtari('2001:db8::1'), '2001:db8:0:0::/64');
  assert.notEqual(sinirAnahtari('2001:db8:aa:bc::1'), blok);
});

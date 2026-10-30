// Ziyaretçiden gelen girdiyi denetleyen ve biçimleyen saf işlevler. Ağ ve veritabanı yok; testleri test/dogrula.test.js'te.

export const METIN_EN_FAZLA = 2000;
const AD_EN_FAZLA = 80;
const ILETISIM_EN_FAZLA = 120;

/** Bir sohbette ziyaretçinin yazabileceği en fazla mesaj; dolunca yeni sohbet açması gerekir. */
export const SOHBET_MESAJ_SINIRI = 100;

/** Aynı sohbetten iki bildirim e-postası arasında en az bu kadar geçer. */
export const BILDIRIM_ARASI_MS = 15 * 60 * 1000;

/** Son 24 saatte en fazla bu kadar bildirim gider; gerisi yalnızca panelde görünür. */
export const GUNLUK_BILDIRIM_SINIRI = 40;

export class GirdiHatasi extends Error {
  constructor(kod) {
    super(kod);
    this.kod = kod;
  }
}

// Satır sonu ve sekme dışındaki denetim karakterleri, sıfır genişlikli ve yön değiştiren karakterler
const ISTENMEYEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

function temizle(deger, enFazla, cokSatirli) {
  if (deger == null) return '';
  if (typeof deger !== 'string') throw new GirdiHatasi('gecersiz');
  let metin = deger.replace(/\r\n?/g, '\n').replace(ISTENMEYEN, '');
  metin = cokSatirli
    ? metin.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    : metin.replace(/\s+/g, ' ');
  metin = metin.trim();
  if (metin.length > enFazla) throw new GirdiHatasi('cok_uzun');
  return metin;
}

/**
 * Ziyaretçinin gönderdiği gövdeyi denetler.
 * `web` alanı gizli bir tuzaktır (ekranda görünmez); doluysa gönderen büyük olasılıkla bottur.
 */
export function mesajDenetle(govde) {
  if (!govde || typeof govde !== 'object' || Array.isArray(govde)) throw new GirdiHatasi('gecersiz');
  if (typeof govde.web === 'string' && govde.web.trim() !== '') throw new GirdiHatasi('gecersiz');
  const metin = temizle(govde.metin, METIN_EN_FAZLA, true);
  if (!metin) throw new GirdiHatasi('bos');
  return {
    metin,
    ad: temizle(govde.ad, AD_EN_FAZLA, false) || null,
    iletisim: temizle(govde.iletisim, ILETISIM_EN_FAZLA, false) || null,
    dil: govde.dil === 'en' ? 'en' : 'tr',
  };
}

/** Panelden yazılan cevap: yalnızca metin. */
export function yanitDenetle(govde) {
  if (!govde || typeof govde !== 'object' || Array.isArray(govde)) throw new GirdiHatasi('gecersiz');
  const metin = temizle(govde.metin, METIN_EN_FAZLA, true);
  if (!metin) throw new GirdiHatasi('bos');
  return metin;
}

/** Son 24 saatte en fazla bu kadar yeni sohbet açılır; IP değiştirerek panelin spamla dolmasını önler. */
export const GUNLUK_SOHBET_SINIRI = 300;

/**
 * Yalnızca düz adresler: `?`, `&`, `=` gibi karakterler yok. Böylece Reply-To başlığına ya da paneldeki
 * mailto: bağlantısına gizli alıcı (`?bcc=`) ya da hazır metin eklenemez.
 */
export function epostaMi(deger) {
  return typeof deger === 'string' && deger.length <= 254 && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(deger);
}

/**
 * Hız sınırının anahtarı. IPv6'da bir kişinin elinde genelde koca bir /64 bloğu olur; adres değiştirerek
 * sınırı aşamasın diye sınır bloğa uygulanır. IPv4 adresi olduğu gibi kullanılır.
 */
export function sinirAnahtari(ip) {
  if (!ip) return 'yerel';
  if (!ip.includes(':')) return ip;
  const [bas, son = ''] = ip.toLowerCase().split('::');
  const a = bas ? bas.split(':') : [];
  const b = son ? son.split(':') : [];
  const eksik = Math.max(0, 8 - a.length - b.length);
  const tam = [...a, ...Array(eksik).fill('0'), ...b].map((p) => p.replace(/^0+(?=.)/, ''));
  return `${tam.slice(0, 4).join(':')}::/64`;
}

/** `Authorization: Bearer <sohbet>.<belirteç>` başlığını çözer; biçim bozuksa null. */
export function yetkiCoz(baslik) {
  const eslesme = /^Bearer ([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/.exec(baslik || '');
  return eslesme ? { id: eslesme[1], belirtec: eslesme[2] } : null;
}

export function kokenIzinli(koken, liste) {
  if (!koken) return false;
  return String(liste || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .includes(koken);
}

export function bildirimGerekli(sonBildirim, simdi) {
  return sonBildirim == null || simdi - sonBildirim >= BILDIRIM_ARASI_MS;
}

function base64url(baytlar) {
  let ikili = '';
  for (const bayt of baytlar) ikili += String.fromCharCode(bayt);
  return btoa(ikili).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 32 baytlık rastgele belirteç (43 karakter base64url). */
export function yeniBelirtec() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function ozetle(belirtec) {
  const ozet = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(belirtec));
  return [...new Uint8Array(ozet)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** İki özeti, ilk farkta durmadan karşılaştırır. */
export function esitMi(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/** Bildirim e-postasının konusu ve metni. */
export function bildirimMetni(sohbet, metin, panelAdresi) {
  const kim = sohbet.ad || 'Ziyaretçi';
  const satirlar = [
    `${kim} sitedeki sohbet penceresinden yazdı.`,
    '',
    metin,
    '',
    '—',
    `Ad: ${sohbet.ad || '(yok)'}`,
    `İletişim: ${sohbet.iletisim || '(yok)'}`,
    `Dil: ${sohbet.dil === 'en' ? 'İngilizce' : 'Türkçe'}`,
    '',
    `Cevaplamak için: ${panelAdresi}#${sohbet.id}`,
  ];
  return {
    konu: `Yeni mesaj: ${kim}`.replace(/[\r\n]+/g, ' ').slice(0, 120),
    metin: satirlar.join('\n'),
  };
}

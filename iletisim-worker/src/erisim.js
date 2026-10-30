// Yönetim paneli için Cloudflare Access doğrulaması.
//
// Access, panel adresine gelen isteği önce kendi giriş sayfasında durdurur (yalnızca izin verilen e-posta geçer)
// ve geçen isteğe imzalı bir JWT ekler (`Cf-Access-Jwt-Assertion`). Worker bu imzayı Access'in açık anahtarlarıyla
// ayrıca doğrular: Access yanlış yapılandırılsa ya da biri Worker'a başka yoldan ulaşsa bile panel açılmaz.

const ANAHTAR_OMRU_MS = 60 * 60 * 1000;
const anahtarOnbellegi = new Map();

function base64urlBayt(metin) {
  const ikili = atob(metin.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(ikili, (c) => c.charCodeAt(0));
}

function base64urlJson(metin) {
  return JSON.parse(new TextDecoder().decode(base64urlBayt(metin)));
}

async function anahtarlar(takim, fetchFn, simdi, yenile) {
  const onbellek = anahtarOnbellegi.get(takim);
  if (!yenile && onbellek && simdi - onbellek.zaman < ANAHTAR_OMRU_MS) return onbellek.anahtarlar;
  const yanit = await fetchFn(`https://${takim}/cdn-cgi/access/certs`);
  if (!yanit.ok) throw new Error('access_anahtar');
  const { keys } = await yanit.json();
  anahtarOnbellegi.set(takim, { zaman: simdi, anahtarlar: keys || [] });
  return keys || [];
}

/**
 * Geçerli bir Access belirteci varsa içindeki e-postayı, yoksa null döner.
 * Takım ya da AUD tanımlı değilse her istek reddedilir.
 */
export async function accessDogrula(istek, env, fetchFn = fetch, simdi = Date.now()) {
  const takim = env.ACCESS_TAKIM;
  const aud = env.ACCESS_AUD;
  if (!takim || !aud) return null;

  const jwt = istek.headers.get('cf-access-jwt-assertion');
  const parcalar = (jwt || '').split('.');
  if (parcalar.length !== 3) return null;

  try {
    const baslik = base64urlJson(parcalar[0]);
    const yuk = base64urlJson(parcalar[1]);
    if (baslik.alg !== 'RS256') return null;

    const audlar = Array.isArray(yuk.aud) ? yuk.aud : [yuk.aud];
    if (!audlar.includes(aud)) return null;
    if (yuk.iss !== `https://${takim}`) return null;
    if (typeof yuk.exp !== 'number' || yuk.exp * 1000 <= simdi) return null;
    if (typeof yuk.nbf === 'number' && yuk.nbf * 1000 > simdi + 60_000) return null;

    let jwk = (await anahtarlar(takim, fetchFn, simdi, false)).find((k) => k.kid === baslik.kid);
    // Access anahtarlarını düzenli olarak döndürür; bilinmeyen kimlikte listeyi bir kez tazele
    if (!jwk) jwk = (await anahtarlar(takim, fetchFn, simdi, true)).find((k) => k.kid === baslik.kid);
    if (!jwk) return null;

    const anahtar = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const gecerli = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      anahtar,
      base64urlBayt(parcalar[2]),
      new TextEncoder().encode(`${parcalar[0]}.${parcalar[1]}`),
    );
    return gecerli ? yuk.email || 'access' : null;
  } catch {
    return null;
  }
}

/** Testler için: önbellekteki anahtarları temizler. */
export function anahtarOnbelleginiTemizle() {
  anahtarOnbellegi.clear();
}

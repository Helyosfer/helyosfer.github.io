// API testleri için yardımcı ortam:
// 1) Sahte Cloudflare Access JWKS sunucusu ve RS256 JWT imzalayıcı (gerçek Access belirteci kullanılmaz).
// 2) Hız sınırı, günlük sohbet sınırı ve kilitli panel testleri için geçici wrangler yapılandırması kurup
//    test sonunda geçici dosyaları ve süreçleri (PID üzerinden) temizleyen yardımcı.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = join(KOK, 'node_modules', '.bin', 'wrangler');

export const SAHTE_TAKIM = 'sahte-access.test';
export const SAHTE_AUD = 'test-panel-aud-etiketi';

const b64url = (girdi) => Buffer.from(girdi).toString('base64url');

/**
 * RS256 anahtar çifti ve yerel JWKS HTTP sunucusu oluşturur.
 * Anahtar rotasyonu testleri için ikinci bir anahtar (`anahtar-2`) üretip JWKS listesine ekleyebilir.
 */
export async function sahteJwksKur(port = 8791) {
  const anahtarUret = async (kid) => {
    const cift = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    );
    const jwk = { ...(await crypto.subtle.exportKey('jwk', cift.publicKey)), kid, alg: 'RS256', use: 'sig' };
    return { kid, privateKey: cift.privateKey, publicKey: cift.publicKey, jwk };
  };

  const birincil = await anahtarUret('anahtar-1');
  const ikincil = await anahtarUret('anahtar-2');
  const yabanci = await anahtarUret('anahtar-yabanci');

  let aktifJwkListesi = [birincil.jwk];
  let istekSayisi = 0;

  const sunucu = createServer((istek, yanit) => {
    if (istek.url === '/cdn-cgi/access/certs' && istek.method === 'GET') {
      istekSayisi++;
      yanit.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      yanit.end(JSON.stringify({ keys: aktifJwkListesi }));
      return;
    }
    yanit.writeHead(404).end();
  });

  await new Promise((coz, reddet) => {
    sunucu.once('error', reddet);
    sunucu.listen(port, '127.0.0.1', () => coz());
  });

  async function jwtImzala(yukYamasi = {}, { baslik = null, anahtar = birincil } = {}) {
    const simdiSn = Math.floor(Date.now() / 1000);
    const tamBaslik = baslik || { alg: 'RS256', kid: anahtar.kid, typ: 'JWT' };
    const tamYuk = {
      aud: [SAHTE_AUD],
      iss: `https://${SAHTE_TAKIM}`,
      email: 'panel-test@ornek.test',
      exp: simdiSn + 3600,
      nbf: simdiSn - 60,
      iat: simdiSn - 60,
      ...yukYamasi,
    };
    const govde = `${b64url(JSON.stringify(tamBaslik))}.${b64url(JSON.stringify(tamYuk))}`;
    if (tamBaslik.alg === 'none') return `${govde}.`;
    const imza = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', anahtar.privateKey, new TextEncoder().encode(govde));
    return `${govde}.${b64url(new Uint8Array(imza))}`;
  }

  return {
    port,
    birincil,
    ikincil,
    yabanci,
    jwtImzala,
    ikincilAnahtariYayinla() {
      aktifJwkListesi = [birincil.jwk, ikincil.jwk];
    },
    istekSayisi: () => istekSayisi,
    kapat: () => new Promise((coz) => sunucu.close(() => coz())),
  };
}

/**
 * Hız sınırı, günlük sohbet sınırı ve Access JWT doğrulaması için geçici bir wrangler yapılandırması
 * ve yerel Worker süreci başlatır; kapat() çağrıldığında süreci PID üzerinden sonlandırır ve geçici dosyaları siler.
 */
export async function geciciWorkerBaslat({
  port = 8789,
  inspectorPort = 9249,
  jwksPort = 8791,
  geminiPort = 8790,
  mesajLimiti = 5,
  sohbetLimiti = 2,
  okumaLimiti = 4,
} = {}) {
  const geciciToml = join(KOK, `wrangler.api-gecici-${port}.toml`);
  const geciciGiris = join(KOK, `.gecici-api-worker-${port}.mjs`);
  const geciciVeri = join(KOK, '.wrangler', `api-gecici-${port}`);

  const temizle = () => {
    for (const yol of [geciciToml, geciciGiris, geciciVeri]) {
      if (existsSync(yol)) rmSync(yol, { recursive: true, force: true });
    }
  };

  temizle();

  // Yalnızca sahte Access JWKS adresini yerel HTTP JWKS sunucusuna yönlendirir; Worker kaynak koduna dokunmaz.
  const girisKodu = `
const asilFetch = globalThis.fetch;
globalThis.fetch = (girdi, init) => {
  const url = typeof girdi === 'string' ? girdi : girdi?.url;
  if (url === 'https://${SAHTE_TAKIM}/cdn-cgi/access/certs') {
    return asilFetch('http://127.0.0.1:${jwksPort}/cdn-cgi/access/certs', init);
  }
  return asilFetch(girdi, init);
};
export { default } from './src/index.js';
`;
  writeFileSync(geciciGiris, girisKodu, 'utf8');

  let toml = readFileSync(join(KOK, 'wrangler.toml'), 'utf8');
  toml = toml.replace('main = "src/index.js"', `main = ".gecici-api-worker-${port}.mjs"`);
  toml = toml.replace(
    /name = "MESAJ_SINIRI"[\s\S]*?simple = \{ limit = \d+, period = 60 \}/,
    `name = "MESAJ_SINIRI"\nnamespace_id = "1101"\nsimple = { limit = ${mesajLimiti}, period = 60 }`,
  );
  toml = toml.replace(
    /name = "SOHBET_SINIRI"[\s\S]*?simple = \{ limit = \d+, period = 60 \}/,
    `name = "SOHBET_SINIRI"\nnamespace_id = "1102"\nsimple = { limit = ${sohbetLimiti}, period = 60 }`,
  );
  toml = toml.replace(
    /name = "OKUMA_SINIRI"[\s\S]*?simple = \{ limit = \d+, period = 60 \}/,
    `name = "OKUMA_SINIRI"\nnamespace_id = "1103"\nsimple = { limit = ${okumaLimiti}, period = 60 }`,
  );
  writeFileSync(geciciToml, toml, 'utf8');

  const goc = spawnSync(
    WRANGLER,
    ['d1', 'migrations', 'apply', 'iletisim', '--local', '-c', geciciToml, '--persist-to', geciciVeri],
    { cwd: KOK, stdio: 'pipe', env: { ...process.env, CI: '1' } },
  );
  if (goc.status !== 0) {
    temizle();
    throw new Error(`D1 göçü başarısız oldu: ${goc.stderr?.toString()}`);
  }

  const degiskenler = {
    GELISTIRME: '0',
    IZINLI_KOKENLER: 'http://127.0.0.1:5500,https://helyosfer.me',
    ACCESS_TAKIM: SAHTE_TAKIM,
    ACCESS_AUD: SAHTE_AUD,
    GEMINI_ANAHTARI: 'sahte',
    GEMINI_ADRESI: `http://127.0.0.1:${geminiPort}`,
  };

  const surec = spawn(
    WRANGLER,
    [
      'dev',
      '-c',
      geciciToml,
      '--persist-to',
      geciciVeri,
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--inspector-port',
      String(inspectorPort),
      '--local-upstream',
      `127.0.0.1:${port}`,
      ...Object.entries(degiskenler).flatMap(([ad, deger]) => ['--var', `${ad}:${deger}`]),
    ],
    { cwd: KOK, stdio: 'pipe', env: { ...process.env, CI: '1' } },
  );

  const adres = `http://127.0.0.1:${port}`;
  let hazir = false;
  for (let i = 0; i < 80; i++) {
    try {
      const yanit = await fetch(`${adres}/`);
      if (yanit.status === 404) {
        hazir = true;
        break;
      }
    } catch {
      // Henüz başlamadı
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  if (!hazir) {
    if (surec.pid) process.kill(surec.pid, 'SIGTERM');
    temizle();
    throw new Error(`Geçici Worker ${adres} adresinde başlatılamadı`);
  }

  function sqlCalistir(sql) {
    const sonuc = spawnSync(
      WRANGLER,
      ['d1', 'execute', 'iletisim', '--local', '-c', geciciToml, '--persist-to', geciciVeri, '--command', sql],
      { cwd: KOK, stdio: 'pipe', env: { ...process.env, CI: '1' } },
    );
    if (sonuc.status !== 0) {
      throw new Error(`SQL çalıştırılamadı: ${sonuc.stderr?.toString()}`);
    }
  }

  async function kapat() {
    if (surec.pid && surec.exitCode === null) {
      await new Promise((coz) => {
        surec.once('exit', () => coz());
        process.kill(surec.pid, 'SIGTERM');
        setTimeout(() => {
          if (surec.exitCode === null && surec.pid) {
            try {
              process.kill(surec.pid, 'SIGKILL');
            } catch {
              // Süreç zaten kapandı
            }
          }
          coz();
        }, 3000);
      });
    }
    temizle();
  }

  return { adres, port, pid: surec.pid, sqlCalistir, kapat };
}

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { accessDogrula, anahtarOnbelleginiTemizle } from '../src/erisim.js';

const TAKIM = 'helyosfer.cloudflareaccess.com';
const AUD = 'panel-aud';
const env = { ACCESS_TAKIM: TAKIM, ACCESS_AUD: AUD };
const SIMDI = Date.UTC(2026, 9, 30, 12);

const b64url = (baytlar) => Buffer.from(baytlar).toString('base64url');

const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'anahtar-1' };

async function imzala(yuk, baslik = { alg: 'RS256', kid: 'anahtar-1' }) {
  const govde = `${b64url(JSON.stringify(baslik))}.${b64url(JSON.stringify(yuk))}`;
  const imza = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(govde));
  return `${govde}.${b64url(new Uint8Array(imza))}`;
}

const gecerliYuk = () => ({
  aud: [AUD],
  iss: `https://${TAKIM}`,
  email: 'ben@ornek.com',
  exp: SIMDI / 1000 + 3600,
  nbf: SIMDI / 1000 - 60,
});

let istekSayisi = 0;
const sahteFetch = async (url) => {
  istekSayisi++;
  assert.equal(url, `https://${TAKIM}/cdn-cgi/access/certs`);
  return new Response(JSON.stringify({ keys: [jwk] }));
};

const istek = (jwt) => new Request('https://iletisim.helyosfer.me/admin', jwt ? { headers: { 'cf-access-jwt-assertion': jwt } } : {});

beforeEach(() => {
  anahtarOnbelleginiTemizle();
  istekSayisi = 0;
});

test('geçerli belirteç e-postayı döner, anahtarlar önbellekten gelir', async () => {
  const jwt = await imzala(gecerliYuk());
  assert.equal(await accessDogrula(istek(jwt), env, sahteFetch, SIMDI), 'ben@ornek.com');
  assert.equal(await accessDogrula(istek(jwt), env, sahteFetch, SIMDI), 'ben@ornek.com');
  assert.equal(istekSayisi, 1);
});

test('belirteç yoksa ya da yapılandırma eksikse reddedilir', async () => {
  const jwt = await imzala(gecerliYuk());
  assert.equal(await accessDogrula(istek(null), env, sahteFetch, SIMDI), null);
  assert.equal(await accessDogrula(istek(jwt), { ACCESS_TAKIM: TAKIM }, sahteFetch, SIMDI), null);
  assert.equal(await accessDogrula(istek(jwt), { ACCESS_AUD: AUD }, sahteFetch, SIMDI), null);
});

test('yanlış AUD, yayıncı, süresi dolmuş ya da algoritması farklı belirteç reddedilir', async () => {
  assert.equal(await accessDogrula(istek(await imzala({ ...gecerliYuk(), aud: ['baska'] })), env, sahteFetch, SIMDI), null);
  assert.equal(await accessDogrula(istek(await imzala({ ...gecerliYuk(), iss: 'https://kotu.com' })), env, sahteFetch, SIMDI), null);
  assert.equal(await accessDogrula(istek(await imzala({ ...gecerliYuk(), exp: SIMDI / 1000 - 1 })), env, sahteFetch, SIMDI), null);
  assert.equal(await accessDogrula(istek(await imzala(gecerliYuk(), { alg: 'none', kid: 'anahtar-1' })), env, sahteFetch, SIMDI), null);
});

test('imzası bozulmuş ya da bilinmeyen anahtarla imzalanmış belirteç reddedilir', async () => {
  const jwt = await imzala(gecerliYuk());
  const [b, y] = jwt.split('.');
  const sahteYuk = b64url(JSON.stringify({ ...gecerliYuk(), email: 'saldirgan@ornek.com' }));
  assert.equal(await accessDogrula(istek(`${b}.${sahteYuk}.${jwt.split('.')[2]}`), env, sahteFetch, SIMDI), null);
  assert.equal(await accessDogrula(istek(`${b}.${y}.AAAA`), env, sahteFetch, SIMDI), null);
  const bilinmeyen = await imzala(gecerliYuk(), { alg: 'RS256', kid: 'anahtar-2' });
  assert.equal(await accessDogrula(istek(bilinmeyen), env, sahteFetch, SIMDI), null);
});

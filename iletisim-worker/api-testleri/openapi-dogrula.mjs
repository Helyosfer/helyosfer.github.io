// guvenlik/openapi.yaml sözleşmesini ayrıştıran ve gerçek HTTP yanıtlarını (durum kodu, başlıklar, JSON gövdesi)
// OpenAPI 3.0.3 şemalarına karşı doğrulayan modül.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OPENAPI_YOLU = join(KOK, 'guvenlik', 'openapi.yaml');

export const openapiSozlesmesi = parse(readFileSync(OPENAPI_YOLU, 'utf8'));

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function refCoz(kok, dugum) {
  if (!dugum || typeof dugum !== 'object') return dugum;
  if (!dugum.$ref) return dugum;
  const parcalar = dugum.$ref.replace(/^#\//, '').split('/');
  let mevcut = kok;
  for (const p of parcalar) {
    mevcut = mevcut?.[p];
  }
  if (!mevcut) throw new Error(`OpenAPI $ref çözülemedi: ${dugum.$ref}`);
  return refCoz(kok, mevcut);
}

export function semaDogrula(semaGirdisi, deger, yol = 'govde', kok = openapiSozlesmesi) {
  const sema = refCoz(kok, semaGirdisi);
  if (!sema) return [];
  const hatalar = [];

  if (deger === null) {
    if (!sema.nullable) hatalar.push(`${yol}: null olamaz`);
    return hatalar;
  }

  if (deger === undefined) {
    hatalar.push(`${yol}: tanımsız (undefined)`);
    return hatalar;
  }

  if (sema.type === 'object') {
    if (typeof deger !== 'object' || Array.isArray(deger)) {
      hatalar.push(`${yol}: nesne (object) bekleniyordu, gelen: ${Array.isArray(deger) ? 'array' : typeof deger}`);
      return hatalar;
    }
    if (Array.isArray(sema.required)) {
      for (const zorunlu of sema.required) {
        if (!(zorunlu in deger) || deger[zorunlu] === undefined) {
          hatalar.push(`${yol}.${zorunlu}: zorunlu alan eksik`);
        }
      }
    }
    if (sema.properties) {
      for (const [alan, altSema] of Object.entries(sema.properties)) {
        if (alan in deger && deger[alan] !== undefined) {
          hatalar.push(...semaDogrula(altSema, deger[alan], `${yol}.${alan}`, kok));
        }
      }
    }
  } else if (sema.type === 'array') {
    if (!Array.isArray(deger)) {
      hatalar.push(`${yol}: dizi (array) bekleniyordu, gelen: ${typeof deger}`);
      return hatalar;
    }
    if (sema.items) {
      for (let i = 0; i < deger.length; i++) {
        hatalar.push(...semaDogrula(sema.items, deger[i], `${yol}[${i}]`, kok));
      }
    }
  } else if (sema.type === 'string') {
    if (typeof deger !== 'string') {
      hatalar.push(`${yol}: string bekleniyordu, gelen: ${typeof deger}`);
      return hatalar;
    }
    if (typeof sema.minLength === 'number' && deger.length < sema.minLength) {
      hatalar.push(`${yol}: uzunluk (${deger.length}) en az ${sema.minLength} olmalı`);
    }
    if (typeof sema.maxLength === 'number' && deger.length > sema.maxLength) {
      hatalar.push(`${yol}: uzunluk (${deger.length}) en fazla ${sema.maxLength} olmalı`);
    }
    if (Array.isArray(sema.enum) && !sema.enum.includes(deger)) {
      hatalar.push(`${yol}: '${deger}' değeri izinli enum listesinde yok (${sema.enum.join(', ')})`);
    }
    if (sema.format === 'uuid' && !UUID_REGEX.test(deger)) {
      hatalar.push(`${yol}: '${deger}' geçerli bir UUID değil`);
    }
  } else if (sema.type === 'integer') {
    if (typeof deger !== 'number' || !Number.isInteger(deger)) {
      hatalar.push(`${yol}: tamsayı (integer) bekleniyordu, gelen: ${deger}`);
    }
  } else if (sema.type === 'boolean') {
    if (typeof deger !== 'boolean') {
      hatalar.push(`${yol}: boolean bekleniyordu, gelen: ${typeof deger}`);
    }
  }

  return hatalar;
}

/**
 * Bir HTTP yanıtını openapi.yaml'daki ilgili yol, yöntem ve durum koduna karşı doğrular.
 * Hata varsa Error fırlatır.
 */
export function yanitiSozlesmeyeGoreDogrula({ yol, yontem, durum, govde, basliklar = {} }) {
  const yolTanimi = openapiSozlesmesi.paths?.[yol];
  if (!yolTanimi) throw new Error(`OpenAPI sözleşmesinde yol bulunamadı: ${yol}`);

  const islemTanimi = yolTanimi[yontem.toLowerCase()];
  if (!islemTanimi) throw new Error(`OpenAPI sözleşmesinde yöntem bulunamadı: ${yontem.toUpperCase()} ${yol}`);

  const yanitTanimi = islemTanimi.responses?.[String(durum)];
  if (!yanitTanimi) {
    throw new Error(`OpenAPI sözleşmesinde ${yontem.toUpperCase()} ${yol} için ${durum} durum kodu tanımlı değil`);
  }

  const hatalar = [];

  if (yanitTanimi.headers) {
    const kucukBasliklar = Object.fromEntries(Object.entries(basliklar).map(([k, v]) => [k.toLowerCase(), v]));
    for (const [baslikAdi, baslikTanimi] of Object.entries(yanitTanimi.headers)) {
      const hamDeger = kucukBasliklar[baslikAdi.toLowerCase()];
      if (hamDeger === undefined) {
        hatalar.push(`Başlık eksik: ${baslikAdi}`);
        continue;
      }
      const bSema = refCoz(openapiSozlesmesi, baslikTanimi.schema);
      if (bSema?.type === 'integer') {
        const sayi = Number(hamDeger);
        if (!Number.isInteger(sayi)) hatalar.push(`Başlık ${baslikAdi} tamsayı olmalı, gelen: ${hamDeger}`);
      }
    }
  }

  const jsonSemasi = yanitTanimi.content?.['application/json']?.schema;
  if (jsonSemasi) {
    hatalar.push(...semaDogrula(jsonSemasi, govde, `${yontem.toUpperCase()} ${yol} (${durum})`));
  }

  // Hata yanıtlarında şema açıkça belirtilmemişse bile (ör. panel uçlarındaki 400/403/404) Hata şemasına uymalı
  if (!jsonSemasi && durum >= 400 && govde !== null && govde !== undefined) {
    hatalar.push(...semaDogrula({ $ref: '#/components/schemas/Hata' }, govde, `${yontem.toUpperCase()} ${yol} (${durum})`));
  }

  if (hatalar.length > 0) {
    throw new Error(`OpenAPI sözleşme ihlali:\n  - ${hatalar.join('\n  - ')}`);
  }
  return true;
}

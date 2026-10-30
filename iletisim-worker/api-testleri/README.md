# API ve Sözleşme Testleri (Modül 5)

İletişim Worker'ının (`src/index.js`) ziyaretçi (`/v1/*`) ve yönetim paneli (`/admin/api/*`) uç noktalarını fonksiyonel, sınır değer, negatif, sözleşme (`guvenlik/openapi.yaml`) ve güvenlik koşullarında sınayan test takımı.

## Dosyalar

- `api.spec.ts` — Playwright API testleri (18 kapsamlı test, OpenAPI sözleşme doğrulaması, hız sınırı, günlük 300 sohbet sınırı ve sahte JWKS ile Cloudflare Access RS256 JWT doğrulaması).
- `postman-koleksiyonu.json` — Dışa aktarılabilir Postman v2.1.0 koleksiyonu (35 istek, 71 doğrulama kuralı).
- `newman-calistir.mjs` — Yerel sunucuları (Worker + sahte Gemini) otomatik açıp Postman koleksiyonunu Newman CLI ile çalıştıran ve süreçleri PID üzerinden kapatan betik.
- `veri-uretici.mjs` — `@faker-js/faker` (`tr` ve `en` yerel ayarları) ile gerçek kişisel veri kullanmadan bağlama duyarlı destek mesajları (`format`, `linux`, `sunucu`, `minecraft`, `domain`) ve uç durumlar (emoji, sıfır genişlikli karakter, RTL, 2000/2001 sınırları, bot tuzağı, istem enjeksiyonu, para tutarları) üreten modül.
- `openapi-dogrula.mjs` — `guvenlik/openapi.yaml` şemalarını ayrıştırıp gerçek HTTP yanıtlarını doğrulayan sözleşme denetleyicisi.
- `ortam.mjs` — Sahte JWKS sunucusu (`/cdn-cgi/access/certs`), RS256 JWT imzalayıcı ve hız/kota sınırları için geçici `wrangler` yapılandırma yöneticisi.

## Çalıştırma

`iletisim-worker` klasöründe:

```sh
npm run test:api       # Playwright API + OpenAPI sözleşme + sınır/JWKS testleri
npm run test:postman   # Newman ile Postman koleksiyonu
node api-testleri/veri-uretici.mjs  # Örnek sentetik veri çıktısı
```

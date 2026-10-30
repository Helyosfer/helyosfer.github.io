# İletişim Worker'ı (sohbet penceresi + yönetim paneli)

helyosfer.me/hizmetler sayfasındaki sohbet penceresinin arka ucu. Site GitHub Pages'te durduğu için mesaj alamaz; mesajları bu Worker alır.

```
Ziyaretçi ── sohbet penceresi ──► iletisim.helyosfer.me/v1/mesaj ──► D1 (sohbetler, mesajlar)
                                                         │
                                                         ├─► asistan (Google Gemini) basit soruları cevaplar
                                                         │
                                                         └─► devredilince e-posta bildirimi (ALICI)
Sen ── iletisim.helyosfer.me/admin (Cloudflare Access) ──► cevap ──► ziyaretçinin penceresine düşer
```

- **Asistan (`src/asistan.js`):** Önce yapay zekâ asistanı cevap verir; bildikleri `BILGI` metnindedir (sayfadaki hizmetler). Ziyaretçi bir iş, fiyat ya da randevu isterse, bir insanla konuşmak isterse ("Bir insanla konuşun" düğmesi) ya da asistan emin değilse sohbeti sana devreder ve o sohbette bir daha konuşmaz. Sen panelden yazınca da susar. Fiyat, tarih ve söz vermemesi talimatında yazılı.
  - **Ücretsiz Gemini katmanı:** Google gönderilenleri ürünlerini geliştirmek için kullanır ve insanlar okuyabilir. Bu yüzden ad ve iletişim kutuları Gemini'ye hiç gitmez; mesajdaki e-posta, telefon, IBAN, IP, bağlantı ve adres benzeri bilgiler gönderilmeden önce maskelenir. Pencerenin altındaki not bunu ziyaretçiye açıkça söyler.
  - **Avrupa:** Ücretsiz katman Avrupa Ekonomik Alanı, İngiltere ve İsviçre'deki kullanıcılara sunulamaz. Bu ülkelerden (ve ülkesi bilinmeyen) ziyaretçilere asistan çalışmaz; mesaj doğrudan sana gelir.
  - **Sınır ve hata:** Günde en fazla 200 asistan cevabı. Sınır dolarsa, anahtar yoksa ya da Gemini 12 saniyede cevap vermezse sohbet hemen sana geçer.
  - Ücretli katmana geçersen Avrupa kısıtı ve "Google inceleyebilir" notu kaldırılabilir (`asistanBolgedeUygun`, `hizmetler/index.html` → `chat-note`).
- **Ziyaretçi:** İlk mesajda bir sohbet açılır, tarayıcısına bir anahtar verilir (localStorage). Sayfaya döndüğünde cevabını aynı pencerede görür; pencere kapalıyken cevap gelirse sağ alttaki düğmede yeşil nokta yanar. Ad ve iletişim bilgisi isteğe bağlı.
- **Sen:** Sohbet sana devredilince e-posta gelir; içinde son konuşma da vardır. Sonra aynı sohbetten en fazla 15 dakikada bir, günde en fazla 40 e-posta. Asistanın kendi başına yürüttüğü sohbetler için e-posta gelmez, panelde "Asistan" rozetiyle görünür. E-postadaki bağlantı paneli o sohbetle açar. Ziyaretçi e-posta bıraktıysa e-postaya doğrudan "yanıtla" da diyebilirsin.
- **Panel:** `/admin`. Sohbet listesi, okunmamış sayısı, cevap yazma (Enter gönderir, Shift + Enter alt satır), sohbeti kapatma/açma, silme. Yalnızca Cloudflare Access'te izin verdiğin e-postayla açılır; Worker Access'in imzasını ayrıca doğrular.
- **Koruma:** Yalnızca `IZINLI_KOKENLER`'deki siteden mesaj kabul edilir. IP başına dakikada 5 mesaj ve 2 yeni sohbet, sohbet başına en fazla 100 mesaj, mesaj başına 2000 karakter. Gizli bir bot tuzağı alanı var. IP adresi saklanmaz; gözlem ve kayıt kapalı.
- **Veri:** Mesajlar Cloudflare D1'de. Sildiğin sohbet kalıcı olarak gider.

Dosyalar: `src/index.js` (yönlendirme ve uç noktalar), `src/asistan.js` (Gemini, maskeleme, devretme), `src/dogrula.js` (girdi denetimi), `src/erisim.js` (Access doğrulaması), `src/eposta.js` (Proton SMTP), `src/panel.js` (panel sayfası), `migrations/` (veritabanı şeması), `test/`.

## Kurulum (bir kez)

Bu klasörde, terminalde. Cloudflare'a giriş istenirse tarayıcıda onayla.

1. **Paketler ve giriş**

   ```sh
   npm ci
   npx wrangler login
   ```

2. **Veritabanı.** Çıktıdaki `database_id` değerini `wrangler.toml` içindeki `BURAYA-D1-KIMLIGI` yerine yaz, sonra şemayı yükle:

   ```sh
   npx wrangler d1 create iletisim
   npx wrangler d1 migrations apply iletisim --remote
   ```

   `database_id` gizli değildir; depoda durabilir.

3. **E-posta bildirimi (Proton SMTP).** Bildirim, Worker'dan doğrudan Proton Mail'in SMTP sunucusuna (`smtp.protonmail.ch:587`, STARTTLS) bağlanarak `GONDEREN` adresinden `ALICI` adresine gider (`src/eposta.js`). İkisi de `wrangler.toml` → `[vars]` içinde.
   - Proton Mail → **Settings → IMAP/SMTP → SMTP tokens**: `GONDEREN` adresi için bir token oluştur (Proton'un ücretli planı gerekir).
   - Token'ı Worker'a gizli değer olarak ver (depoya girmez):

   ```sh
   npx wrangler secret put SMTP_SIFRESI
   ```

   - Cloudflare'ın **Email Routing / Email Service**'ini bu alan adında AÇMA: MX ve SPF kayıtlarını değiştirip Proton'a gelen postayı bozar.
   - Token verilmezse e-posta gitmez; sohbetler yine panelde görünür.

4. **Panelin kilidi (Cloudflare Access).** Cloudflare panelinde **Zero Trust → Access → Applications → Add an application → Self-hosted**:
   - Uygulama alan adı: `iletisim.helyosfer.me`, yol: `admin`
   - Politika: **Allow**, kural: **Emails** → kendi e-posta adresin
   - **Settings → Authentication**: **One-time PIN** yöntemini ekle; giriş sayfası e-postana tek kullanımlık kod gönderir
   - Kaydettikten sonra uygulamanın **Application Audience (AUD) Tag** değerini `wrangler.toml` → `ACCESS_AUD`'a, takım adresini (`<takım>.cloudflareaccess.com`) `ACCESS_TAKIM`'a yaz.
   - İkisi boş kaldıkça panel kimseye açılmaz.

5. **Asistan.** [Google AI Studio](https://aistudio.google.com/apikey)'da bir API anahtarı oluştur (faturalandırma açmadan ücretsiz katmanda kalır) ve Worker'a ver:

   ```sh
   npx wrangler secret put GEMINI_ANAHTARI
   ```

   Anahtar verilmezse asistan kapalı kalır, her mesaj doğrudan sana gelir. Model `wrangler.toml` → `GEMINI_MODEL`.

6. **Yükle**

   ```sh
   npx wrangler deploy
   ```

   `iletisim.helyosfer.me` alan adını ve sertifikasını Cloudflare kendisi oluşturur.

7. **Dene:** helyosfer.me/hizmetler → sağ alttaki penguen → bir soru sor, asistan cevaplamalı. Sonra "Bir insanla konuşun"a bas: e-posta gelmeli; `https://iletisim.helyosfer.me/admin` Access girişinden sonra sohbeti göstermeli. Cevap yaz, sayfayı yenile: cevap pencerede görünmeli.

## Yerelde çalıştırma

`.dev.vars` (depoya girmez) yerel ayarları tutar: `GELISTIRME=1` paneli Access olmadan açar ve asistanın bölge kısıtını atlar (yalnızca `localhost` / `127.0.0.1` adresinde), `IZINLI_KOKENLER` yerel siteyi izinli yapar. Asistanı yerelde denemek için `GEMINI_ANAHTARI`'na gerçek anahtarı yaz; ya da `GEMINI_ADRESI` ile isteği sahte bir sunucuya yönlendir.

```sh
npx wrangler d1 migrations apply iletisim --local
npx wrangler dev --ip 127.0.0.1 --port 8787 --local-upstream 127.0.0.1:8787 --var ALICI:ben@ornek.test
```

Site deposunun kökünde `python3 -m http.server 5500` çalışırken `http://127.0.0.1:5500/hizmetler/` sohbet penceresi yerel Worker'a bağlanır. Panel: `http://127.0.0.1:8787/admin`. Yerelde e-posta gönderilmez; içeriği `.wrangler/tmp/email/` altına yazılır.

`--local-upstream` gerekli: olmazsa wrangler isteğin adresini `iletisim.helyosfer.me` yapar ve panel yerelde de Access ister.

## Test

```sh
npm test
```

Girdi denetimi, anahtar biçimi, bildirim aralığı, Access doğrulaması (geçerli, süresi dolmuş, yanlış AUD, sahte imza) ve asistan (maskeleme, bölge kısıtı, geçmiş, Gemini isteği ve hataları) sınanır.

## API ve sözleşme testleri

`api-testleri/` klasöründe uç noktaların sınır değerlerini, `guvenlik/openapi.yaml` sözleşmesini, sahte JWKS ile Cloudflare Access JWT doğrulamasını ve hız/kota sınırlarını sınayan Playwright API testleri (`api.spec.ts`), Postman koleksiyonu (`postman-koleksiyonu.json`) ve Faker.js sentetik veri üreticisi (`veri-uretici.mjs`) bulunur:

```sh
npm run test:api       # Playwright API + OpenAPI sözleşme + sınır/JWKS testleri
npm run test:postman   # Newman ile Postman koleksiyonu (35 istek, 71 doğrulama)
```

GitHub Actions'taki "API testleri" iş akışı (`.github/workflows/api-testleri.yml`) bunları yerel Worker üzerinde çalıştırır.

## Uçtan uca testler

`e2e/` klasöründe sohbet penceresi ve panel için Playwright testleri var (10 senaryo, Page Object Model: `e2e/sayfalar/`).
Testler kendi sunucularını açar: siteyi (5500), her çalıştırmada boş veritabanıyla Worker'ı (8787, hız sınırları yükseltilmiş)
ve sahte Gemini'yi (8790). Bu portlar boş olmalı; açık bir `wrangler dev` varsa önce kapat.

```sh
npx playwright install chromium firefox webkit   # bir kez
npm run e2e
```

Arch tabanlı sistemlerde WebKit, Ubuntu kütüphaneleri (libicu74, libflite1) olmadan açılmaz; orada `npm run e2e -- --project=chromium --project=firefox`
çalıştır. Üç tarayıcının hepsi GitHub Actions'taki "Uçtan uca testler" iş akışında (`.github/workflows/uctan-uca.yml`) çalışır.
`e2e/akislar/sohbet-akisi.yaml`, aynı akışların test ajanları (Playwright MCP vb.) için niyet tabanlı hâlidir.

## Yük testi

`yuk/` klasöründe aynı senaryoların (okuyucu %70, yazar %25, "insanla konuş" %5) iki uygulaması var: Grafana k6
(`load-test.js`) ve Locust (`locustfile.py`, dağıtık çalışabilir). İkisi de canlı adresi reddeder: ücretsiz planda
günde 100 bin istek sınırı var, ayrıca gerçek Gemini kotası ve e-posta harcanır. Statik site GitHub Pages'te durduğu için
teste dahil değil (GitHub'ın koşulları yük testini yasaklar).

Yerelde duman testi (önce `node e2e/sunucular/sahte-gemini.mjs` ve `node e2e/sunucular/worker.mjs` açık olmalı):

```sh
docker run --rm --network host -u $(id -u) -v "$PWD:/w" -w /w grafana/k6:2.3.0 run yuk/load-test.js
locust -f yuk/locustfile.py --headless -u 40 -r 10 -t 40s --host http://127.0.0.1:8787
```

10.000 kullanıcılık `tepe` profili tek bir `wrangler dev` ile anlamlı değildir; ayrı bir hazırlık Worker'ı gerekir
(kendi D1'i, `SMTP_SIFRESI` tanımsız, `GEMINI_ADRESI` sahte sunucuda, Workers Paid planı). Uygulamanın kendi korumaları
(günde 300 yeni sohbet, sohbet başına 100 mesaj, IP başına hız sınırları) böyle bir yükte bilerek 429 (günlük sınırda
503 `yogun`) döndürür; betikler
bunları hata değil "koruma" olarak sayar. Eşikler aşılırsa iki betik de 0 dışı kodla çıkar.

İki çalıştırmayı karşılaştırmak (ör. bir değişiklikten önce ve sonra):

```sh
python3 yuk/karsilastir.py yuk/a.csv yuk/b.csv   # k6 --out csv=... çıktıları
```

## Güvenlik taraması

`guvenlik/` klasöründe Nuclei şablonları (`nuclei/`), ZAP planı (`zap-otomasyon.yaml`) ve API tanımı (`openapi.yaml`) var.
GitHub Actions'taki "Güvenlik taraması" iş akışı (`.github/workflows/guvenlik-taramasi.yml`) bunları elle ya da `iletisim-worker/`
değişen her PR'da, CI içinde açılan yerel Worker'a karşı çalıştırır; canlıya, Gemini'ye ve e-postaya dokunmaz.

Şablonlar bir açık bulduğunda sonuç verir; temiz çalıştırma boş çıkar. Canlıya karşı yalnızca veri yazmayan şablonlar çalıştırılır:

```sh
nuclei -t guvenlik/nuclei/ -u https://iletisim.helyosfer.me -tags canli
```

ZAP'ın aktif taraması yüzlerce sohbet açar ve hız sınırlarına takılır; canlıya karşı çalıştırma.

# helyosfer.me — Yol Haritası

Son güncelleme: 30 Ekim 2026

Bu dosya, sitede nerede kaldığımızı ve sırada ne olduğunu tutar. Yeni bir oturumda
önce bunu oku, sonra "Sıradaki işler" bölümünden devam et.

## Nasıl devam edilir

- **Canlı site:** https://helyosfer.me (GitHub Pages; `www` ve `http` buraya yönlenir)
- **Repo:** https://github.com/Helyosfer/helyosfer.github.io — `main` dalına gönderilen her şey 1-2 dakikada yayına girer
- **Bilgisayardaki kopya:** `Belgeler\Helyosfer\helyosfer.github.io` (OneDrive içinde). Çalışılan tek kopya bu; kullanıcı da dosyaları burada elle düzenliyor, o yüzden işe başlamadan önce `git status` ve `git pull` ile bak.
- **Yerelde açmak:** repo klasöründe `py -m http.server 5500`, sonra `http://localhost:5500`
- **Dosyalar:** `index.html` (içerik), `style.css` (görünüm), `script.js` (animasyonlar), `ortak.js` (iki sayfanın ortak kodu: dil, harf bölme, kaydırma çubuğu, menü; sayfa betiğinden önce yüklenir), `favicon.svg` (sekme simgesi), `CNAME` (alan adı; silme)
- **Performans kuralı:** kaydırmada sık değişen CSS değişkenlerini kök öğeye (`<html>`) değil, onu kullanan öğeye yaz; kökte bütün sayfanın stili her karede yeniden hesaplanır (ana sayfada 12,5 ms/kare ölçüldü).
- **Erişilebilirlik kuralı (30 Ekim):** `denetim/erisilebilirlik/` içindeki testler (`npm test`, Pa11y, Lighthouse) her değişiklikte yeşil kalmalı; 5 kırılım noktası (320, 375, 768, 1024, 1440), kısa telefon ekranı, %200 yazı ve klavye gezintisi denetlenir. Yeni bir `aria-label` eklenirse İngilizcesi `data-en-label`'a yazılır. Izgara sütunları `minmax(0, 1fr)` olmalı (`1fr` uzun kelimede sayfayı yana taşırır).
- **DNS:** Cloudflare'de; DNS değişiklikleri Cloudflare panelinden yapılır. Ayrıntılar (kayıtlar, sunucu) yerel `ROADMAP-ozel.md` dosyasında, depoya girmez.

### Çalışma kuralları

- Commit'ler yalnızca Helyosfer adına atılır; **Claude co-author olarak eklenmez**.
- Her görünen metin iki dillidir: Türkçesi etiketin içinde, İngilizcesi `data-en="..."` içinde. Birini değiştirince diğerini de değiştir.
- Kullanıcının kolayca değiştirebileceği yerler dosyalarda `DÜZENLE` notuyla işaretli.
- Değişiklikten sonra hem masaüstünde hem telefon boyutunda (375×812) bak.
- Yerel sunucu CSS/JS'yi önbellekten verebilir; değişiklik görünmüyorsa sert yenile (`Ctrl + F5`).
- Sayfada `<meta>` ile bir Content-Security-Policy var (15 Ekim): betikler yalnızca siteden ve sabitlenmiş KaTeX adresinden, stiller siteden, KaTeX'ten ve Google Fonts'tan yüklenebilir; KaTeX dosyalarında SRI (`integrity`) hash'i var. Yeni bir dış kaynak (betik, yazı tipi, görsel) eklenirse CSP'ye de eklenmeli, yoksa tarayıcı engeller. KaTeX sürümü değişirse hash'ler de değişmeli.

## Şu anki durum

Tek sayfalık, siyah ve sade ("premium") bir portfolyo. Kaydırdıkça sahne sahne ilerler.

| # | Bölüm | Ne var | Geçiş |
|---|---|---|---|
| – | Giriş | Dev "Helyosfer" başlığı, motto, iki düğme | Başlık büyüyerek kaybolur |
| 01 | Hakkımda | "Matematikçi. Yazılım geliştirici." | Kelimeler tek tek yanar |
| 02 | İlham | Gauss, Galileo, Cantor, Hardy, Hilbert sözleri | Dev tırnak işaretinin içinden girilir; sözler sırayla değişir |
| 03 | Matematik | Yetenekler + Navier–Stokes girdabı (Burgers girdabı) | Başlık yazılırken `y = x²` parabolü teğetiyle çizilir |
| 04 | Yazılım | Kod penceresi + yetenekler | Pencere yandan döner, kod satır satır yazılır |
| 05 | Projeler | Dört proje kartı (aşağıdaki tablo) + "Tüm projeler" (GitHub + Codeberg) | Başlık yazılır, çizgi çizilir, kartlar açılır |
| 06 | İletişim | `mail@helyosfer.me` | Adres harf harf yazılır |
| – | Kapanış | "Q.E.D." + "GitHub'da gör" ve "Codeberg'de gör" düğmeleri | Büyüyerek gelir |

Proje kartları:

| Proje | Ne | Dil | Bağlantılar |
|---|---|---|---|
| helyosfer-app | Kişisel finans için yerel çalışan masaüstü çalışma alanı | Python | GitHub |
| Magnetosphere | Kick moderatör ekipleri için ortak ban listesi (tarayıcı eklentisi) | JavaScript | GitHub |
| Voyager | Yapay zekâ destekli Discord botu (soru cevaplama, kanal özeti, görsel denetimi, hazır kurulum, koruma, bildirimler) | JavaScript | Kendi sitesi (https://voyager.helyosfer.me/) + GitHub |
| Heliopause | DPI bypass aracı | C# | Codeberg |

Bir kartta birden fazla bağlantı olacaksa Voyager kartındaki gibi `<div class="card-links">` içine konur.

### Hizmetler sayfası (`/hizmetler/`, 30 Ekim)

Bilgisayar, Linux ve sunucu işleri için ayrı bir tanıtım sayfası: `hizmetler/index.html`, `hizmetler.css`, `hizmetler.js`.
Menü, düğme, kart ve giriş animasyonları için ana sayfanın `style.css`'ini de yükler; orada bir şey değişirse bu sayfaya da bak.

- Giriş: başlık + kendi kendine komut yazan terminal (fastfetch, docker, tailscale, certbot, systemctl) + gözleriyle fareyi izleyen, el sallayan penguen
- Kayan araçlar şeridi (Ubuntu, Debian, Arch, Docker, Raspberry Pi, Proxmox, Pi-hole, Tailscale…)
- 01 Hizmetler: altı kart; ekrana girince arkasından bir penguen başını çıkarır, fareyle üstüne gelince el sallar
- Penguen geçidi: buzun üstünde yürüyen ve karnının üstünde kayan penguenler
- 02 Nasıl çalışırım: uzaktan ve yerinde (İstanbul Anadolu Yakası) kartları + üç adımlı süreç (Yazın → Planlayalım → Kurayım). "Hafta sonu / öğrenciyim" bilgisi kullanıcının isteğiyle kaldırıldı; tekrar ekleme.
- 03 İletişim: "Sohbeti başlat" düğmesi + yedek olarak `mail@helyosfer.me` + el sallayan penguen
- **Sohbet penceresi (30 Ekim):** sağ altta penguenli düğme; "Mesaj gönder" düğmeleri de bunu açar. Mesajlar `iletisim-worker/` (Cloudflare Worker + D1) üzerinden gelir, sana e-postayla bildirilir, cevabı `iletisim.helyosfer.me/admin` panelinden yazarsın, ziyaretçi aynı pencerede görür. Ayrıntılar ve kurulum: `iletisim-worker/README.md`. `_config.yml`, Worker klasörünün GitHub Pages'te yayınlanmasını engeller.
  - **Yapay zekâ asistanı:** önce Google Gemini (ücretsiz katman) basit soruları cevaplar; iş, fiyat, randevu ya da "Bir insanla konuşun" isteğinde sohbeti sana devreder. Ücretsiz katman yüzünden: kişisel bilgiler maskelenir, Avrupa'dan gelenlere asistan çalışmaz, pencerede Google'a gönderildiği yazar. Ayrıntı: `iletisim-worker/README.md`.
  - [x] **Kurulum (30 Ekim):** Worker `iletisim.helyosfer.me`'de çalışıyor; D1, panel kilidi (Cloudflare Access, tek kullanımlık kodla giriş) ve Gemini anahtarı kurulu. Bildirim e-postası Proton SMTP ile gider. Cloudflare Email Routing bu alan adında açılmamalı (Proton'un MX kayıtlarını bozar).
  - [x] Asistanın canlıda gerçekten cevap verdiği Türkiye'den denendi (30 Ekim); Avrupa IP'sinden asistan bilerek çalışmaz.
  - [x] **Denetim modülleri (30 Ekim):** Modül 1 (Güvenlik: Nuclei, ZAP), Modül 2 (E2E: 10 Playwright senaryosu), Modül 3 (Performans: k6, Locust), Modül 4 (Erişilebilirlik: axe, Pa11y, Lighthouse) ve Modül 5 (API testleri: `iletisim-worker/api-testleri/`, Playwright API, OpenAPI sözleşme doğrulaması, Postman/Newman, Faker.js) tamamlandı; sayfa 30 Ekim 2026'da yayına alındı.
  - CSP'de `connect-src` Worker'ın adresini ve yerel deneme için `127.0.0.1:8787`'yi içerir.
- Arka planda kar yağar. Penguen tek bir `<template>` çizimden kopyalanır; hareketi `data-tux` (wave, walk, slide, peek, look) seçer.
- Paylaşım önizlemesi var (Open Graph + Twitter kartı, `hizmetler/og.png`, 1200×630) ve `canonical` adresi tanımlı.
- Ana sayfanın menüsünde "Hizmetler" bağlantısı var.
- Kök dizinde `robots.txt` ve `sitemap.xml` var; yeni sayfa eklenince sitemap'e de yaz.

Bunların dışında:

- Arka planda KaTeX ile dizilmiş kalkülüs formülleri kayar (telefonda daha soluk).
- Sağ üstte TR / EN dil düğmesi; seçim tarayıcıda hatırlanır.
- Üstte ince bir kaydırma ilerleme çubuğu.
- Alt bilgide GitHub ve Instagram (`instagram.com/helyosfer`) bağlantıları.
- Sekme simgesi: siyah zeminde gümüş düz H.
- Hareket azaltma tercihi olanlarda ve çok kısa ekranlarda sahneler sabitlenmez, her şey düz akar.

### Denenip vazgeçilenler

- **Yıldırımlar ve mor/kırmızı tema:** kasıyordu ve "premium" durmuyordu; siyah-gümüş temaya geçildi.
- **Milenyum Problemleri formülleri (arka plan):** tanıdık değildi; kalkülüs formülleriyle değiştirildi.
- **Yazılım bölümünde ekranın içinden geri çekilme (zoom out, dizüstü çerçevesi):** eklendi, sonra kullanıcının isteğiyle geri alındı. Tekrar önerme.

## Sıradaki işler

### Kullanıcıdan cevap bekleyenler

- [ ] `mail@helyosfer.me` adresi Proton'da gerçekten açık mı? Değilse oluşturulmalı ya da sitedeki adres değiştirilmeli.
- [ ] Kullanılan başka programlama dili var mı? Yetenek listesinde ve kod penceresindeki `stack` satırında Python, JavaScript ve C# yazıyor (üçü de projelerden doğrulandı; C# 12 Ekim'de eklendi). Voyager için "Discord Bots" gibi bir yetenek de eklenebilir.
- [ ] "Hakkımda" sahnesinde şimdilik yalnızca "Matematikçi. Yazılım geliştirici." duruyor. Daha kişisel bir cümle istenir mi?
- [ ] Magnetosphere için mağaza bağlantısı (Chrome Web Store vb.) var mı? Şu an yalnızca GitHub'a gidiyor.

### Bilinen kusurlar

- [ ] Girdabın altındaki Navier–Stokes denklemi, arkasından geçen formül satırıyla karışıp zor okunuyor (masaüstü). Çözüm: yazının arkasına koyu zemin ya da o bölgede formülleri soluklaştırmak.
- [ ] Giriş ekranında bir formül satırı tam mottonun arkasından geçiyor.
- [ ] Gerçek bir telefonda dokunarak kaydırma ve akıcılık hiç ölçülmedi; yalnızca tarayıcıda telefon boyutu taklit edildi.
- [ ] `helyosfer.github.io` adresinin `helyosfer.me`'ye yönlendiği doğrulanmadı.
- [ ] Voyager kartındaki iki bağlantı yalnızca dar ekranda gözle görüldü; geniş masaüstünde ve 375 piksellik telefonda bakılmadı.
- [x] Çok kısa ekranlarda (yan çevrilmiş telefon) sayfa yana kayabiliyordu; giriş ışıltısı taşıyordu, düzeltildi (12 Ekim).
- [x] Erişilebilirlik denetimi (30 Ekim): kısa telefon ekranında (360×580, iPhone mini) Matematik ve Yazılım sahneleri kesiliyordu; artık 760 px'ten dar ve 680 px'ten kısa ekranda sahneler sabitlenmiyor. Ayrıca: telefonda sohbet açıkken odak arkadaki sayfaya kaçmıyor (`inert`), sohbet kutularının etiketi var, klavyeyle gelinen kart tam açılmış görünüyor, tablette kartlar sayfayı yana itmiyor, büyük yazı ayarında sayfa yana taşmıyor, "İçeriğe geç" bağlantısı eklendi, formüller yazı tipleri yüklenince görünüyor (yerleşim kayması 0,16 → 0).

### Eksikler

- [x] Site simgesi (favicon): gümüş düz H harfi, `favicon.svg` (Eta denendi, düz H tercih edildi). PNG yedeği yok; SVG simge desteklemeyen eski tarayıcılarda görünmez.
- [ ] Ana sayfada paylaşım önizlemesi yok (hizmetler sayfasında var): bağlantı WhatsApp / X / Discord'da paylaşılınca başlık, açıklama ve görsel çıkmıyor (Open Graph etiketleri).
- [ ] 404 sayfası yok.
- [ ] Repoda README yok.
- [ ] KaTeX ve Inter yazı tipi dış sunuculardan (cdnjs, Google Fonts) yükleniyor; siteye gömülürse daha hızlı ve bağımsız olur. Google Fonts ziyaretçinin IP adresini Google'a da gönderiyor (KVKK); gömülünce CSP'den `fonts.googleapis.com` ve `fonts.gstatic.com` çıkarılır.
- [ ] Kayan şerit, kar ve yürüyen penguenler yalnızca işletim sistemindeki "hareketi azalt" ayarıyla duruyor; WCAG 2.2.2'ye tam uymak için sayfada bir "Hareketi durdur" düğmesi gerekir (tasarım kararı).

### Fikirler

- [ ] Yazılım bölümüne, zoom out yerine geçecek daha sade bir giriş geçişi (istenirse).
- [ ] Yeni projeler eklendikçe Projeler bölümünü büyütmek; gerekirse her projeye ayrı sayfa.
- [ ] Matematik bölümüne ikinci bir görsel (örneğin başka bir denklem ya da eğri).
- [ ] Ziyaretçi sayısını görmek için gizlilik dostu bir analiz aracı.

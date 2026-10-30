# helyosfer.me — Yol Haritası

Son güncelleme: 30 Ekim 2026

Bu dosya, sitede nerede kaldığımızı ve sırada ne olduğunu tutar. Yeni bir oturumda
önce bunu oku, sonra "Sıradaki işler" bölümünden devam et.

## Nasıl devam edilir

- **Canlı site:** https://helyosfer.me (GitHub Pages; `www` ve `http` buraya yönlenir)
- **Repo:** https://github.com/Helyosfer/helyosfer.github.io — `main` dalına gönderilen her şey 1-2 dakikada yayına girer
- **Bilgisayardaki kopya:** `Belgeler\Helyosfer\helyosfer.github.io` (OneDrive içinde). Çalışılan tek kopya bu; kullanıcı da dosyaları burada elle düzenliyor, o yüzden işe başlamadan önce `git status` ve `git pull` ile bak.
- **Yerelde açmak:** repo klasöründe `py -m http.server 5500`, sonra `http://localhost:5500`
- **Dosyalar:** `index.html` (içerik), `style.css` (görünüm), `script.js` (animasyonlar), `ortak.js` (temel kod: dil, harf bölme, kaydırma çubuğu, menü; `script.js`'ten önce yüklenir), `favicon.svg` (sekme simgesi), `CNAME` (alan adı; silme)
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
| – | Helyosfer nedir? | Canvas'ta ~640 tel (telefonda 300): Güneş rüzgârı → helyosfer → H. Üç kısa yazı. NASA'nın "Heliopause Cycle" videosu örnek alındı | Önce dokulu Güneş ve her yöne fırlayan parçacıklar (yanda hilal gezegen); kamera geri çekilir, Güneş noktaya iner, kuyruklu kabarcık açılır (sonlanma şoku halkaları, kuyruğa akan parçacıklar, nefes alan helyopoz); sonra teller sitenin simgesindeki H'ye dönüşür. Hareket azaltılınca helyosfer durur, yazılar alt alta |
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

Bunların dışında:

- Arka planda KaTeX ile dizilmiş kalkülüs formülleri kayar (telefonda daha soluk).
- Sağ üstte TR / EN dil düğmesi; seçim tarayıcıda hatırlanır.
- Üstte ince bir kaydırma ilerleme çubuğu.
- Alt bilgide GitHub ve Instagram (`instagram.com/helyosfer`) bağlantıları.
- Sekme simgesi: siyah zeminde gümüş düz H.
- Hareket azaltma tercihi olanlarda ve çok kısa ekranlarda sahneler sabitlenmez, her şey düz akar.
- Kök dizinde `robots.txt` ve `sitemap.xml` var; yeni sayfa eklenince sitemap'e de yaz.

### Denenip vazgeçilenler

- **Yıldırımlar ve mor/kırmızı tema:** kasıyordu ve "premium" durmuyordu; siyah-gümüş temaya geçildi.
- **Milenyum Problemleri formülleri (arka plan):** tanıdık değildi; kalkülüs formülleriyle değiştirildi.
- **Yazılım bölümünde ekranın içinden geri çekilme (zoom out, dizüstü çerçevesi):** eklendi, sonra kullanıcının isteğiyle geri alındı. Tekrar önerme.
- **Hizmetler sayfası ve sohbet botu (30 Ekim):** `/hizmetler/` sayfası (penguenler, Arch sahnesi, sohbet penceresi), yapay zekâ asistanlı iletişim Worker'ı (`iletisim-worker/`), onun güvenlik, uçtan uca, API ve yük testleri ve üç GitHub iş akışı kullanıcının isteğiyle tamamen silindi. Site yine tek sayfa. Tekrar önerme; eski hâli git geçmişinde (`0e82686`, `009da9a`).

## Sıradaki işler

### Kullanıcıdan cevap bekleyenler

- [ ] `mail@helyosfer.me` adresi Proton'da gerçekten açık mı? Değilse oluşturulmalı ya da sitedeki adres değiştirilmeli.
- [ ] Kullanılan başka programlama dili var mı? Yetenek listesinde ve kod penceresindeki `stack` satırında Python, JavaScript ve C# yazıyor (üçü de projelerden doğrulandı; C# 12 Ekim'de eklendi). Voyager için "Discord Bots" gibi bir yetenek de eklenebilir.
- [ ] "Hakkımda" sahnesinde şimdilik yalnızca "Matematikçi. Yazılım geliştirici." duruyor. Daha kişisel bir cümle istenir mi?
- [ ] Magnetosphere için mağaza bağlantısı (Chrome Web Store vb.) var mı? Şu an yalnızca GitHub'a gidiyor.
- [x] Silinen sohbet botunun Cloudflare tarafı (30 Ekim): Worker, alt alan adının DNS kaydı, Access uygulaması ve kuralı, D1 veritabanı (`iletisim`) silindi. VPS'teki kopyadan Worker klasörü de kaldırıldı. Gemini API anahtarı ve Proton SMTP jetonu kullanıcı tarafından iptal edildi (30 Ekim). Proton MX/SPF kayıtlarına dokunulmamalı.

### Bilinen kusurlar

- [ ] Girdabın altındaki Navier–Stokes denklemi, arkasından geçen formül satırıyla karışıp zor okunuyor (masaüstü). Çözüm: yazının arkasına koyu zemin ya da o bölgede formülleri soluklaştırmak.
- [ ] Giriş ekranında bir formül satırı tam mottonun arkasından geçiyor.
- [ ] Gerçek bir telefonda dokunarak kaydırma ve akıcılık hiç ölçülmedi; yalnızca tarayıcıda telefon boyutu taklit edildi.
- [ ] `helyosfer.github.io` adresinin `helyosfer.me`'ye yönlendiği doğrulanmadı.
- [ ] Voyager kartındaki iki bağlantı yalnızca dar ekranda gözle görüldü; geniş masaüstünde ve 375 piksellik telefonda bakılmadı.
- [x] Çok kısa ekranlarda (yan çevrilmiş telefon) sayfa yana kayabiliyordu; giriş ışıltısı taşıyordu, düzeltildi (12 Ekim).
- [x] Erişilebilirlik denetimi (30 Ekim): kısa telefon ekranında (360×580, iPhone mini) Matematik ve Yazılım sahneleri kesiliyordu; artık 760 px'ten dar ve 680 px'ten kısa ekranda sahneler sabitlenmiyor. Ayrıca: klavyeyle gelinen kart tam açılmış görünüyor, tablette kartlar sayfayı yana itmiyor, büyük yazı ayarında sayfa yana taşmıyor, "İçeriğe geç" bağlantısı eklendi, formüller yazı tipleri yüklenince görünüyor (yerleşim kayması 0,16 → 0).

### Eksikler

- [x] Site simgesi (favicon): gümüş düz H harfi, `favicon.svg` (Eta denendi, düz H tercih edildi). PNG yedeği yok; SVG simge desteklemeyen eski tarayıcılarda görünmez.
- [ ] Paylaşım önizlemesi yok: bağlantı WhatsApp / X / Discord'da paylaşılınca başlık, açıklama ve görsel çıkmıyor (Open Graph etiketleri).
- [ ] 404 sayfası yok.
- [ ] Repoda README yok.
- [ ] KaTeX ve Inter yazı tipi dış sunuculardan (cdnjs, Google Fonts) yükleniyor; siteye gömülürse daha hızlı ve bağımsız olur. Google Fonts ziyaretçinin IP adresini Google'a da gönderiyor (KVKK); gömülünce CSP'den `fonts.googleapis.com` ve `fonts.gstatic.com` çıkarılır.

### Fikirler

- [ ] Yazılım bölümüne, zoom out yerine geçecek daha sade bir giriş geçişi (istenirse).
- [ ] Yeni projeler eklendikçe Projeler bölümünü büyütmek; gerekirse her projeye ayrı sayfa.
- [ ] Matematik bölümüne ikinci bir görsel (örneğin başka bir denklem ya da eğri).
- [ ] Ziyaretçi sayısını görmek için gizlilik dostu bir analiz aracı.

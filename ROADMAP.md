# helyosfer.me — Yol Haritası

Son güncelleme: 11 Ekim 2026

Bu dosya, sitede nerede kaldığımızı ve sırada ne olduğunu tutar. Yeni bir oturumda
önce bunu oku, sonra "Sıradaki işler" bölümünden devam et.

## Nasıl devam edilir

- **Canlı site:** https://helyosfer.me (GitHub Pages; `www` ve `http` buraya yönlenir)
- **Repo:** https://github.com/Helyosfer/helyosfer.github.io — `main` dalına gönderilen her şey 1-2 dakikada yayına girer
- **Yerelde açmak:** repo klasöründe `py -m http.server 5500`, sonra `http://localhost:5500`
- **Dosyalar:** `index.html` (içerik), `style.css` (görünüm), `script.js` (animasyonlar), `CNAME` (alan adı; silme)
- **DNS:** Hosting Dünyam panelinde. Kök için dört GitHub `A` kaydı, `www` için `helyosfer.github.io` `CNAME` kaydı. E-posta (MX) Proton Mail'e bağlı.

### Çalışma kuralları

- Commit'ler yalnızca Helyosfer adına atılır; **Claude co-author olarak eklenmez**.
- Her görünen metin iki dillidir: Türkçesi etiketin içinde, İngilizcesi `data-en="..."` içinde. Birini değiştirince diğerini de değiştir.
- Kullanıcının kolayca değiştirebileceği yerler dosyalarda `DÜZENLE` notuyla işaretli.
- Değişiklikten sonra hem masaüstünde hem telefon boyutunda (375×812) bak.
- Yerel sunucu CSS/JS'yi önbellekten verebilir; değişiklik görünmüyorsa sert yenile (`Ctrl + F5`).

## Şu anki durum

Tek sayfalık, siyah ve sade ("premium") bir portfolyo. Kaydırdıkça sahne sahne ilerler.

| # | Bölüm | Ne var | Geçiş |
|---|---|---|---|
| – | Giriş | Dev "Helyosfer" başlığı, motto, iki düğme | Başlık büyüyerek kaybolur |
| 01 | Hakkımda | "Matematikçi. Yazılım geliştirici." | Kelimeler tek tek yanar |
| 02 | İlham | Gauss, Galileo, Cantor, Hardy, Hilbert sözleri | Dev tırnak işaretinin içinden girilir; sözler sırayla değişir |
| 03 | Matematik | Yetenekler + Navier–Stokes girdabı (Burgers girdabı) | Başlık yazılırken `y = x²` parabolü teğetiyle çizilir |
| 04 | Yazılım | Kod penceresi + yetenekler | Pencere yandan döner, kod satır satır yazılır |
| 05 | Projeler | helyosfer-app, Magnetosphere, "Tüm repolar" | Başlık yazılır, çizgi çizilir, kartlar açılır |
| 06 | İletişim | `mail@helyosfer.me` | Adres harf harf yazılır |
| – | Kapanış | "Q.E.D." | Büyüyerek gelir |

Bunların dışında:

- Arka planda KaTeX ile dizilmiş kalkülüs formülleri kayar (telefonda daha soluk).
- Sağ üstte TR / EN dil düğmesi; seçim tarayıcıda hatırlanır.
- Üstte ince bir kaydırma ilerleme çubuğu.
- Hareket azaltma tercihi olanlarda ve çok kısa ekranlarda sahneler sabitlenmez, her şey düz akar.

### Denenip vazgeçilenler

- **Yıldırımlar ve mor/kırmızı tema:** kasıyordu ve "premium" durmuyordu; siyah-gümüş temaya geçildi.
- **Milenyum Problemleri formülleri (arka plan):** tanıdık değildi; kalkülüs formülleriyle değiştirildi.
- **Yazılım bölümünde ekranın içinden geri çekilme (zoom out, dizüstü çerçevesi):** eklendi, sonra kullanıcının isteğiyle geri alındı. Tekrar önerme.

## Sıradaki işler

### Kullanıcıdan cevap bekleyenler

- [ ] `mail@helyosfer.me` adresi Proton'da gerçekten açık mı? Değilse oluşturulmalı ya da sitedeki adres değiştirilmeli.
- [ ] Kullanılan diğer programlama dilleri neler? Şu an yalnızca Python ve JavaScript yazıyor (ikisi de repolardan doğrulandı); gerisi uydurulmadı.
- [ ] "Hakkımda" sahnesinde şimdilik yalnızca "Matematikçi. Yazılım geliştirici." duruyor. Daha kişisel bir cümle istenir mi?
- [ ] Magnetosphere için mağaza bağlantısı (Chrome Web Store vb.) var mı? Şu an yalnızca GitHub'a gidiyor.

### Bilinen kusurlar

- [ ] Girdabın altındaki Navier–Stokes denklemi, arkasından geçen formül satırıyla karışıp zor okunuyor (masaüstü). Çözüm: yazının arkasına koyu zemin ya da o bölgede formülleri soluklaştırmak.
- [ ] Giriş ekranında bir formül satırı tam mottonun arkasından geçiyor.
- [ ] Gerçek bir telefonda dokunarak kaydırma ve akıcılık hiç ölçülmedi; yalnızca tarayıcıda telefon boyutu taklit edildi.
- [ ] `helyosfer.github.io` adresinin `helyosfer.me`'ye yönlendiği doğrulanmadı.

### Eksikler

- [ ] Site simgesi (favicon) yok.
- [ ] Paylaşım önizlemesi yok: bağlantı WhatsApp / X / Discord'da paylaşılınca başlık, açıklama ve görsel çıkmıyor (Open Graph etiketleri).
- [ ] 404 sayfası yok.
- [ ] Repoda README yok.
- [ ] KaTeX ve Inter yazı tipi dış sunuculardan (cdnjs, Google Fonts) yükleniyor; siteye gömülürse daha hızlı ve bağımsız olur.

### Fikirler

- [ ] Yazılım bölümüne, zoom out yerine geçecek daha sade bir giriş geçişi (istenirse).
- [ ] Yeni projeler eklendikçe Projeler bölümünü büyütmek; gerekirse her projeye ayrı sayfa.
- [ ] Matematik bölümüne ikinci bir görsel (örneğin başka bir denklem ya da eğri).
- [ ] Ziyaretçi sayısını görmek için gizlilik dostu bir analiz aracı.

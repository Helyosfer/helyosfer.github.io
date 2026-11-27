# helyosfer.me
Önce ROADMAP.md'yi oku. Statik site: build yok, framework ekleme.

- Her görünen metin iki dilli: Türkçe etiketin içinde, İngilizcesi data-en="...". İkisini birlikte değiştir.
- Yeni dış kaynak (betik, font, görsel) eklersen CSP <meta> etiketini de güncelle (index.html ve hizmetler/index.html).
- KaTeX sürümü değişirse SRI hash'leri de değişmeli.
- Mor-kırmızı tema (27 Kasım'da kullanıcının isteğiyle geri geldi): --accent (#bf9bff) ana vurgu, --accent-2 (#ff5d7d) ikinci vurgu. Yıldırım hafif kalmalı: yalnızca çaktığı an çizilir, sürekli döngüye çevirme (eskisi kasıyordu).
- Matematik bölümüne parabol geri eklenmez (27 Kasım'da kaldırıldı); girişte Navier–Stokes denklemi var.
- Yazılım bölümünde zoom-out / dizüstü çerçevesi geri alındı. Tekrar önerme.
- Her değişiklikten sonra masaüstü ve 375x812 görünüme bak (Playwright MCP).
- prefers-reduced-motion ve kısa ekranlarda sahneler sabitlenmez; bu davranışı bozma.
- Commit yalnızca Helyosfer adına; co-author ekleme.
- Çalışmadan önce git status/pull. Kullanıcı dosyaları elle de düzenliyor; commit edilmemiş değişikliklerin üzerine yazma.
- Depo herkese açık: sunucu, anahtar, DNS kaydı gibi ayrıntıları dosyaya yazma.

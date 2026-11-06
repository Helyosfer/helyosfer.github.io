# Erişilebilirlik ve duyarlı tasarım denetimi

Site üç araçla denetlenir. Üçü de siteyi bu bilgisayarda ya da CI'da yerel bir sunucudan açar; canlı siteye dokunulmaz. Bu klasör GitHub Pages'te yayınlanmaz (`_config.yml` → `exclude`).

| Araç | Neyi denetler | Komut |
|---|---|---|
| Playwright + axe (`duzen.spec.mjs`) | 5 ekran genişliğinde WCAG 2.2 AA; sayfanın yana taşması, kısa ekranda kesilen içerik, %200 yazı boyutu, klavye odağı | `npm test` |
| Pa11y (`.pa11yci.json`) | HTML_CodeSniffer + axe, 5 ekran genişliğinde | `npm run pa11y` |
| Lighthouse CI (`lighthouserc.json`) | Erişilebilirlik ≥ 95, en iyi uygulamalar ≥ 95, SEO ≥ 90, yerleşim kayması ≤ 0,1 | `npm run lighthouse`, `npm run lighthouse:masaustu` |

Ekran genişlikleri (kırılım noktaları): 320 (WCAG yeniden akış sınırı), 375 (telefon), 768 (dikey tablet), 1024 (yatay tablet ya da küçük dizüstü), 1440 (masaüstü).

## Yerelde çalıştırma

```bash
npm ci
npx playwright install chromium
npm test
```

Pa11y için önce siteyi aç (deponun kökünde `python3 -m http.server 5510 --bind 127.0.0.1`), sonra `npm run pa11y` çalıştır.

## Bilerek yapılan ayarlar

- **Pa11y'de `color-contrast` kapalı.** Pa11y'nin axe çalıştırıcısı, arka planını hesaplayamadığı öğeleri (yarı saydam üst menü) hata sayıyor. Gerçek kontrast hataları zaten iki yerde yakalanır: `npm test` içindeki axe denetiminde (hareket azaltılmış, öğeler son hâlindeyken) ve Lighthouse'ta.
- **Arka plandaki formüller denetlenmez.** Yalnızca süs (`aria-hidden`); WCAG 1.4.3 süs metinlerini kapsamaz.
- **Lighthouse'ta `robots-txt`, `uses-text-compression` ve `uses-long-cache-ttl` kapalı.** Bunlar yerel test sunucusunun eksikleri; GitHub Pages sıkıştırmayı ve önbellek başlıklarını kendisi ekler. Lighthouse robots.txt'yi sayfanın içinden istiyor, sitenin CSP'si de buna izin vermiyor; arama motorları ise dosyayı doğrudan okur.

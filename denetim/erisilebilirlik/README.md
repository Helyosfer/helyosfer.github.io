# Erişilebilirlik ve duyarlılık denetimi

Site için üç denetim. Hepsi siteyi bu bilgisayarda ya da CI'da yerel bir sunucudan açar; canlı siteye dokunmaz. Bu klasör GitHub Pages'te yayınlanmaz (`_config.yml` → `exclude`).

| Araç | Ne denetler | Komut |
|---|---|---|
| Playwright + axe (`duzen.spec.mjs`) | 5 kırılım noktasında WCAG 2.2 AA, yana taşma, kısa ekranda kesilme, %200 yazı, klavye odağı | `npm test` |
| Pa11y (`.pa11yci.json`) | HTML_CodeSniffer + axe, 5 kırılım noktası | `npm run pa11y` |
| Lighthouse CI (`lighthouserc.json`) | Erişilebilirlik ≥ 95, en iyi uygulamalar ≥ 95, SEO ≥ 90, yerleşim kayması ≤ 0,1 | `npm run lighthouse`, `npm run lighthouse:masaustu` |

Kırılım noktaları: 320 (WCAG yeniden akış sınırı), 375 (telefon), 768 (dikey tablet), 1024 (yatay tablet, küçük dizüstü), 1440 (masaüstü).

## Yerelde çalıştırma

```bash
npm ci
npx playwright install chromium
npm test
```

Pa11y için önce siteyi açın (deponun kökünde `python3 -m http.server 5510 --bind 127.0.0.1`), sonra `npm run pa11y`.

## Bilinçli ayarlar

- **Pa11y'de `color-contrast` kapalı.** Pa11y'nin axe çalıştırıcısı, arka planı hesaplanamayan öğeleri (yarı saydam üst menü) hata sayıyor. Gerçek kontrast hataları `npm test` içindeki axe denetiminde (azaltılmış hareketle, öğeler son hâlindeyken) ve Lighthouse'ta yakalanır.
- **Arka plandaki formüller denetim dışı.** Süs (`aria-hidden`); WCAG 1.4.3 süs metnini kapsamaz.
- **Lighthouse'ta `robots-txt`, `uses-text-compression`, `uses-long-cache-ttl` kapalı.** Yerel test sunucusunun eksikleri; GitHub Pages sıkıştırma ve önbellek başlıklarını kendisi ekler. robots.txt'yi Lighthouse sayfanın içinden ister ve sitenin CSP'si buna izin vermez; arama motorları dosyayı doğrudan okur.

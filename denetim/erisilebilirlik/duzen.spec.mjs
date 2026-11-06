// Modül 4 denetiminden kalan kalıcı testler: beş ekran genişliği (kırılım noktası), WCAG 2.2 AA (axe), klavye
// ve büyük yazı. Her test bir bulguya karşılık gelir; ERS-xx, bulgunun denetim raporundaki numarasıdır.
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const SAYFALAR = [['ana sayfa', '/']];
// 320: WCAG 1.4.10 yeniden akış sınırı · 375: telefon · 768: dikey tablet · 1024: yatay tablet ya da küçük dizüstü · 1440: masaüstü
const KIRILIMLAR = [[320, 640], [375, 812], [768, 1024], [1024, 768], [1440, 900]];
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Sayfayı yarım ekranlık adımlarla sonuna kadar kaydırır; her adımda (verildiyse) her(y) çağrılır
async function sonunaKadarKaydir(page, her) {
  const yukseklik = await page.evaluate(() => document.documentElement.scrollHeight);
  const adim = (page.viewportSize().height) / 2;
  for (let y = 0; y <= yukseklik; y += adim) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (her) await her(y);
  }
}

for (const [ad, yol] of SAYFALAR) {
  for (const [w, h] of KIRILIMLAR) {
    test.describe(`${ad} @${w}x${h}`, () => {
      test.use({ viewport: { width: w, height: h } });

      test('ERS-01 axe: WCAG 2.2 AA ihlali yok', async ({ browser }) => {
        // Hareket azaltılınca kaydırmaya bağlı öğeler son hâlinde durur; kontrast, yarı saydam ara renklerle değil
        // gerçek renkle ölçülür
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(yol);
        const sonuc = await new AxeBuilder({ page }).withTags(WCAG).exclude('.formulas').analyze();
        expect(sonuc.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
        await ctx.close();
      });

      test('ERS-02 sayfa hiçbir kaydırma konumunda yana taşmaz', async ({ page }) => {
        await page.goto(yol);
        await sonunaKadarKaydir(page, async (y) => {
          const { sw, vw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth }));
          expect(sw, `y=${y}`).toBeLessThanOrEqual(vw);
        });
      });
    });
  }
}

test.describe('ERS-03 kısa telefon ekranında sabitlenen sahneler kesilmez', () => {
  // Gerçek telefonlarda adres çubuğu yüzünden görünen alan ekrandan kısadır (ör. 360×640 bir cihazda ~360×580)
  for (const [ad, yol] of SAYFALAR) for (const [w, h] of [[320, 568], [360, 580], [375, 635], [390, 664]]) {
    test(`${ad} ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(yol);
      const kesilen = await page.evaluate(async () => {
        const out = [];
        for (const pin of document.querySelectorAll('[data-pin]')) {
          const inner = pin.querySelector('.pin-inner');
          // Sahnenin sonuna git: burada bütün içerik görünür olmalı
          window.scrollTo({ top: pin.getBoundingClientRect().top + scrollY + pin.offsetHeight - innerHeight - 2, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 120));
          const kutu = inner.getBoundingClientRect();
          for (const el of inner.querySelectorAll('h1, h2, p, li, a, figcaption, .terminal')) {
            if (el.closest('.quote')) continue; // sözler bilerek sırayla kaybolur
            const b = el.getBoundingClientRect();
            if (b.height && (b.top < kutu.top - 1 || b.bottom > kutu.bottom + 1)) out.push(`${pin.id || pin.className}: "${el.textContent.trim().slice(0, 24)}"`);
          }
        }
        return out;
      });
      expect(kesilen).toEqual([]);
    });
  }
});

test.describe('ERS-04 yazı boyutu %200 olunca sayfa yana taşmaz', () => {
  // Android'deki "Yazı boyutu" ayarı bu durumu yaratır. Masaüstünde ise tarayıcı yakınlaştırılır; sayfa o zaman
  // zaten telefon düzenine geçer (bunu 320 genişlikte ERS-01/02 sınar).
  for (const [ad, yol] of SAYFALAR) {
    for (const [w, h] of [[375, 812]]) {
      test(`${ad} @${w}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, bypassCSP: true, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(yol);
        await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
        const { sw, vw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth }));
        expect(sw).toBeLessThanOrEqual(vw);
        await ctx.close();
      });
    }
  }
});

test.describe('ERS-05 Tab ile odaklanan öğe tam görünür', () => {
  for (const [ad, yol, w, h] of [['ana sayfa', '/', 1440, 900], ['ana sayfa', '/', 375, 812]]) {
    test(`${ad} @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(yol);
      const sorunlu = [];
      for (let i = 0; i < 24; i++) {
        await page.keyboard.press('Tab');
        // Yumuşak kaydırmanın bitmesini bekle: konum art arda iki ölçümde aynı kalmalı
        for (let onceki = -1, i = 0; i < 40; i++) {
          await page.waitForTimeout(150);
          const y = await page.evaluate(() => scrollY);
          if (y === onceki) break;
          onceki = y;
        }
        const d = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el.closest('.site-header')) return null;
          const b = el.getBoundingClientRect();
          let saydamlik = 1;
          for (let n = el; n && n.nodeType === 1; n = n.parentElement) saydamlik *= parseFloat(getComputedStyle(n).opacity);
          // "İçeriğe geç" bağlantısı üst menünün de üstünde sabit durur; onun menünün altında kalması beklenmez
          const ust = el.classList.contains('skip-link') ? 0 : document.querySelector('.site-header').getBoundingClientRect().bottom;
          return { ad: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), saydamlik, gorunur: b.top >= ust - 1 && b.bottom <= innerHeight + 1, ust: Math.round(b.top) };
        });
        if (d && (d.saydamlik < 0.95 || !d.gorunur)) sorunlu.push(d);
      }
      expect(sorunlu).toEqual([]);
    });
  }
});

test('ERS-08 İngilizcede ekran okuyucu adları da İngilizce', async ({ page }) => {
  await page.goto('/');
  await page.click('.lang-toggle');
  const cevrilmemis = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')]
    .filter((e) => !e.classList.contains('lang-toggle') && !e.hasAttribute('data-en-label'))
    .map((e) => `${e.className}: ${e.getAttribute('aria-label')}`));
  expect(cevrilmemis).toEqual([]);
});

test('ERS-09 Türkçe sayfadaki İngilizce yetenek adları lang="en" ile işaretli', async ({ page }) => {
  await page.goto('/');
  for (const liste of await page.locator('ul.skills').all()) await expect(liste).toHaveAttribute('lang', 'en');
});

test('ERS-10 hareket azaltılınca yanıp sönen imleçler durur', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  for (const sec of ['.typed', '.contact-mail']) {
    expect(await page.locator(sec).first().evaluate((e) => getComputedStyle(e, '::after').animationName), sec).toBe('none');
  }
  await ctx.close();
});

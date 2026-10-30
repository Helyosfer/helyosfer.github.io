// Ziyaretçi ile panel arasındaki akışlar: iki ayrı tarayıcı bağlamı (biri ziyaretçi, biri sen).
import { expect, test } from '@playwright/test';

import { HizmetlerSayfasi } from '../sayfalar/HizmetlerSayfasi';
import { PanelSayfasi } from '../sayfalar/PanelSayfasi';

test('E2E-04 panelden yazılan cevap ziyaretçinin penceresine gelir, asistan susar', async ({ browser }) => {
  const ziyaretciBaglami = await browser.newContext();
  const panelBaglami = await browser.newContext();
  const ziyaretci = new HizmetlerSayfasi(await ziyaretciBaglami.newPage());
  const panel = new PanelSayfasi(await panelBaglami.newPage());

  await ziyaretci.git();
  await ziyaretci.pencereyiAc();
  const { govde: ilk } = await ziyaretci.gonder('Minecraft sunucusu için yardım istiyorum.', { ad: 'Deniz', iletisim: 'deniz@ornek.com' });

  // Panel: sohbet, ziyaretçinin bilgileriyle ve asistan rozetiyle açılır
  const acilan = await panel.sohbetiAc(ilk.sohbet);
  expect(acilan.sohbet).toMatchObject({ ad: 'Deniz', iletisim: 'deniz@ornek.com', asistan: 1 });
  await expect(panel.kisiBilgisi.locator('a[href="mailto:deniz@ornek.com"]')).toBeVisible();
  await expect(panel.mesajlar).toHaveCount(2);

  const { yanit, govde } = await panel.cevapla(ilk.sohbet, 'Merhaba Deniz, hangi sürümü istiyorsunuz?');
  expect(yanit.status()).toBe(200);
  expect(govde.mesajlar.at(-1)).toMatchObject({ gonderen: 'ben', metin: 'Merhaba Deniz, hangi sürümü istiyorsunuz?' });
  await expect(panel.yanitKutusu).toHaveValue('');
  await expect(panel.mesajlar.last()).toHaveClass(/ben/);

  // Ziyaretçi: pencere açıkken 10 sn'de bir yoklar; cevap gelince "Helyosfer" etiketiyle görünür
  const yoklama = await ziyaretci.yoklamaYanitiniBekle((g) => g.mesajlar.some((m) => m.gonderen === 'ben'));
  const yoklamaGovdesi = await yoklama.json();
  expect(yoklamaGovdesi.asistan).toBe(false);
  // Pencere yalnızca bildiği son mesajdan yenilerini ister ve yalnızca senin cevabın gelir
  expect(new URL(yoklama.url()).searchParams.get('sonra')).toBe(String(ilk.mesajlar.at(-1)!.id));
  expect(yoklamaGovdesi.mesajlar.map((m: { gonderen: string }) => m.gonderen)).toEqual(['ben']);
  await expect(ziyaretci.helyosferBalonlari).toHaveCount(1);
  await expect(ziyaretci.helyosferBalonlari.locator('.msg-who')).toHaveText('Helyosfer');
  await expect(ziyaretci.helyosferBalonlari).toContainText('hangi sürümü istiyorsunuz?');
  await expect(ziyaretci.insanDugmesi).toBeHidden();

  // Sen yazdıktan sonra asistan bu sohbette konuşmaz
  const sonraki = await ziyaretci.gonder('Java Edition 1.21.');
  expect(sonraki.yanit.status()).toBe(200);
  expect(sonraki.govde.asistan).toBe(false);
  expect(sonraki.govde.mesajlar.at(-1)!.gonderen).toBe('ziyaretci');
  await expect(ziyaretci.yaziyor).toHaveCount(0);

  await ziyaretciBaglami.close();
  await panelBaglami.close();
});

test('E2E-10 panelden kapatılan sohbet ziyaretçide "kapatıldı" yazar, ziyaretçi yazınca yeniden açılır', async ({ browser }) => {
  const ziyaretciBaglami = await browser.newContext();
  const panelBaglami = await browser.newContext();
  const ziyaretci = new HizmetlerSayfasi(await ziyaretciBaglami.newPage());
  const panel = new PanelSayfasi(await panelBaglami.newPage());

  await ziyaretci.git();
  await ziyaretci.pencereyiAc();
  const { govde: ilk } = await ziyaretci.gonder('Teşekkürler, sorum çözüldü.');

  await panel.sohbetiAc(ilk.sohbet);
  await expect(panel.durumDugmesi).toHaveText('Kapat');
  const kapat = await panel.durumuDegistir(ilk.sohbet);
  expect(kapat.yanit.status()).toBe(200);
  expect(kapat.govde).toEqual({ durum: 'kapali' });
  await expect(panel.durumDugmesi).toHaveText('Yeniden aç');

  const yoklama = await ziyaretci.yoklamaYanitiniBekle((g) => g.durum === 'kapali');
  expect((await yoklama.json()).durum).toBe('kapali');
  await expect(ziyaretci.sistemNotu).toHaveText('Bu sohbet kapatıldı. Yazarsanız yeniden açılır.');

  const yeniden = await ziyaretci.gonder('Bir sorum daha var.');
  expect(yeniden.yanit.status()).toBe(200);
  await expect(ziyaretci.sistemNotu).toHaveCount(0);
  await expect(ziyaretci.giden.last()).toContainText('Bir sorum daha var.');

  // Panelde de yeniden açık görünür
  const tekrar = await panel.sohbetiAc(ilk.sohbet);
  expect(tekrar.sohbet.durum).toBe('acik');
  await expect(panel.durumDugmesi).toHaveText('Kapat');

  await ziyaretciBaglami.close();
  await panelBaglami.close();
});

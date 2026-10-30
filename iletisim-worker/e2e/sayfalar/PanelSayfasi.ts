import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

import { WORKER, type Mesaj } from './HizmetlerSayfasi';

const PANEL_API = `${WORKER}/admin/api/sohbetler`;

/**
 * Yönetim paneli (/admin). Testlerde Worker GELISTIRME=1 ile 127.0.0.1'de çalıştığı için Access girişi atlanır;
 * canlıda aynı sayfa Cloudflare Access arkasındadır.
 */
export class PanelSayfasi {
  readonly yanitKutusu: Locator;
  readonly durumDugmesi: Locator;
  readonly mesajlar: Locator;
  readonly kisiBilgisi: Locator;

  constructor(readonly page: Page) {
    this.yanitKutusu = page.locator('#yanit-metin');
    this.durumDugmesi = page.locator('#durum-dugme');
    this.mesajlar = page.locator('#mesajlar .mesaj');
    this.kisiBilgisi = page.locator('#kisi-bilgi');
  }

  /** E-postadaki bağlantı gibi #sohbet-kimliği ile açar ve sohbetin yüklenmesini bekler. */
  async sohbetiAc(id: string) {
    const yanitSozu = this.page.waitForResponse((r) => r.url() === `${PANEL_API}/${id}` && r.request().method() === 'GET');
    const hedef = `${WORKER}/admin#${id}`;
    // Aynı adrese goto yalnızca hash'e gider ve sayfayı yenilemez; o durumda yenile
    if (this.page.url() === hedef) await this.page.reload();
    else await this.page.goto(hedef);
    const yanit = await yanitSozu;
    expect(yanit.status()).toBe(200);
    await expect(this.page.locator('#sohbet')).toBeVisible();
    return (await yanit.json()) as { sohbet: Record<string, unknown>; mesajlar: Mesaj[] };
  }

  /** Cevabı yazıp Enter ile gönderir. */
  async cevapla(id: string, metin: string) {
    await this.yanitKutusu.fill(metin);
    const yanitSozu = this.page.waitForResponse((r) => r.url() === `${PANEL_API}/${id}/yanit` && r.request().method() === 'POST');
    await this.yanitKutusu.press('Enter');
    const yanit = await yanitSozu;
    return { yanit, govde: (await yanit.json()) as { mesajlar: Mesaj[] } };
  }

  async durumuDegistir(id: string) {
    const yanitSozu = this.page.waitForResponse((r) => r.url() === `${PANEL_API}/${id}/durum` && r.request().method() === 'POST');
    await this.durumDugmesi.click();
    const yanit = await yanitSozu;
    return { yanit, govde: (await yanit.json()) as { durum: string } };
  }

  /** Arayüz dışından (API ile) silme: ziyaretçinin silinmiş bir sohbetle karşılaşmasını hazırlamak için. */
  static sohbetiSil(istek: APIRequestContext, id: string) {
    return istek.delete(`${PANEL_API}/${id}`, { headers: { 'x-panel': '1', origin: WORKER } });
  }
}

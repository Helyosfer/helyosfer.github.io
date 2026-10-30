import { expect, type Locator, type Page, type Response } from '@playwright/test';

export const WORKER = 'http://127.0.0.1:8787';
export const MESAJ_API = `${WORKER}/v1/mesaj`;
export const DEVRET_API = `${WORKER}/v1/devret`;

export type Mesaj = { id: number; gonderen: 'ziyaretci' | 'asistan' | 'ben'; metin: string; zaman: number };
export type MesajYaniti = { sohbet: string; asistan: boolean; belirtec?: string; mesajlar: Mesaj[]; hata?: string };
export type Oturum = { id: string; token: string; seen: number } | null;

export const DEVIR_TR = "Mesajınızı Helyosfer'e ilettim.";
export const DEVIR_EN = "I've passed your message on to Helyosfer.";

/** Ziyaretçinin gördüğü hizmetler sayfası ve sağ alttaki sohbet penceresi. */
export class HizmetlerSayfasi {
  readonly pencere: Locator;
  readonly acmaDugmesi: Locator;
  readonly kapatmaDugmesi: Locator;
  readonly mesajKutusu: Locator;
  readonly adKutusu: Locator;
  readonly iletisimKutusu: Locator;
  readonly iletisimAlani: Locator;
  readonly insanDugmesi: Locator;
  readonly hata: Locator;
  readonly giden: Locator;
  readonly bekleyen: Locator;
  readonly asistanBalonlari: Locator;
  readonly helyosferBalonlari: Locator;
  readonly sistemNotu: Locator;
  readonly yaziyor: Locator;

  constructor(readonly page: Page) {
    this.pencere = page.locator('#chat');
    this.acmaDugmesi = page.locator('.chat-launcher');
    this.kapatmaDugmesi = page.locator('.chat-close');
    this.mesajKutusu = page.locator('#chat textarea[name="metin"]');
    this.adKutusu = page.locator('#chat input[name="ad"]');
    this.iletisimKutusu = page.locator('#chat input[name="iletisim"]');
    this.iletisimAlani = page.locator('#chat .chat-contact');
    this.insanDugmesi = page.locator('#chat .chat-human');
    this.hata = page.locator('#chat .chat-error');
    // Karşılama balonu .chat-thread dışında durur; yalnızca sohbetin kendi balonları sayılır
    const akis = page.locator('#chat .chat-thread');
    this.giden = akis.locator('.msg-out:not(.is-pending)');
    this.bekleyen = akis.locator('.msg-out.is-pending');
    this.asistanBalonlari = akis.locator('.msg-in.msg-bot:not(.msg-typing)');
    this.helyosferBalonlari = akis.locator('.msg-in:not(.msg-bot)');
    this.sistemNotu = akis.locator('.msg-system');
    this.yaziyor = akis.locator('.msg-typing');
  }

  async git() {
    await this.page.goto('/hizmetler/');
  }

  async pencereyiAc() {
    await this.acmaDugmesi.click();
    await expect(this.pencere).toBeVisible();
    await expect(this.mesajKutusu).toBeFocused();
  }

  /** POST /v1/mesaj yanıtını yakalamak için: eylemden ÖNCE çağrılır. */
  mesajYanitiniBekle(): Promise<Response> {
    return this.page.waitForResponse((r) => r.url() === MESAJ_API && r.request().method() === 'POST');
  }

  /** Penceredeki yoklama (GET /v1/mesaj) yanıtını bekler; isteğe bağlı bir koşul sağlanana kadar. */
  yoklamaYanitiniBekle(kosul: (govde: { durum: string; asistan: boolean; mesajlar: Mesaj[] }) => boolean = () => true) {
    return this.page.waitForResponse(
      // Yoklama ?sonra=<son mesaj> ile yalnızca yenileri ister; adresin sorgu kısmı eşleşmeye katılmaz
      async (r) => r.url().split('?')[0] === MESAJ_API && r.request().method() === 'GET' && r.ok() && kosul(await r.json()),
      { timeout: 25_000 },
    );
  }

  /** Mesajı yazar, Enter ile gönderir ve Worker'ın yanıtını döner. */
  async gonder(metin: string, bilgiler: { ad?: string; iletisim?: string } = {}) {
    if (bilgiler.ad !== undefined) await this.adKutusu.fill(bilgiler.ad);
    if (bilgiler.iletisim !== undefined) await this.iletisimKutusu.fill(bilgiler.iletisim);
    await this.mesajKutusu.fill(metin);
    const yanitSozu = this.mesajYanitiniBekle();
    await this.mesajKutusu.press('Enter');
    const yanit = await yanitSozu;
    const govde = (await yanit.json().catch(() => ({}))) as MesajYaniti;
    return { yanit, govde };
  }

  async insanIste() {
    const yanitSozu = this.page.waitForResponse((r) => r.url() === DEVRET_API && r.request().method() === 'POST');
    await this.insanDugmesi.click();
    const yanit = await yanitSozu;
    return { yanit, govde: (await yanit.json()) as { asistan: boolean; mesajlar: Mesaj[] } };
  }

  oturum(): Promise<Oturum> {
    return this.page.evaluate(() => JSON.parse(localStorage.getItem('sohbet') || 'null'));
  }

  /** Sayfa açılmadan önce dili seçer (seçim localStorage'da tutulur). */
  static async diliAyarla(page: Page, dil: 'tr' | 'en') {
    await page.addInitScript((d) => localStorage.setItem('lang', d), dil);
  }
}

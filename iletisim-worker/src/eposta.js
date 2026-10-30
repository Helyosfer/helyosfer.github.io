// Bildirim e-postası: Proton Mail'in SMTP sunucusu üzerinden, kendi adresinden kendine.
//
// helyosfer.me'nin e-postası Proton'da. Cloudflare'in e-posta yönlendirmesi MX kayıtlarını değiştirip Proton'u
// bozacağı için kullanılmaz; Worker doğrudan Proton'a bağlanır (smtp.protonmail.ch:587, STARTTLS).
// Kullanıcı adı alan adındaki adres, şifre Proton'da o adres için oluşturulan SMTP token'ıdır (README).
//
// Soket bağlantısı dışarıdan verilir (`baglan`): Cloudflare'da `cloudflare:sockets`, testlerde sahte bir soket.

const SATIR_SONU = '\r\n';

function base64Utf8(metin) {
  const baytlar = new TextEncoder().encode(metin);
  let ikili = '';
  for (const bayt of baytlar) ikili += String.fromCharCode(bayt);
  return btoa(ikili);
}

/** Başlıktaki Türkçe karakterler için RFC 2047 kodlaması. */
function baslikKodla(metin) {
  const temiz = metin.replace(/[\r\n]+/g, ' ');
  return /^[\x20-\x7E]*$/.test(temiz) ? temiz : `=?UTF-8?B?${base64Utf8(temiz)}?=`;
}

/** Gövdeyi 76 karakterlik base64 satırlarına böler; satır başında nokta olmadığı için DATA'da kaçış gerekmez. */
function govdeKodla(metin) {
  return base64Utf8(metin.replace(/\r?\n/g, SATIR_SONU)).replace(/.{1,76}/g, (satir) => satir + SATIR_SONU);
}

export function mesajOlustur({ gonderen, alici, konu, metin, yanitla, tarih = new Date(), kimlik = crypto.randomUUID() }) {
  const alanAdi = gonderen.split('@')[1];
  const basliklar = [
    `From: ${baslikKodla('Helyosfer sitesi')} <${gonderen}>`,
    `To: <${alici}>`,
    `Subject: ${baslikKodla(konu)}`,
    `Date: ${tarih.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${kimlik}@${alanAdi}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ];
  if (yanitla) basliklar.push(`Reply-To: <${yanitla}>`);
  return basliklar.join(SATIR_SONU) + SATIR_SONU + SATIR_SONU + govdeKodla(metin);
}

export class SmtpHatasi extends Error {
  constructor(adim, yanit) {
    super(`smtp ${adim}: ${String(yanit).slice(0, 120)}`);
    this.adim = adim;
  }
}

/** Akıştan SMTP yanıtlarını okur; çok satırlı yanıtların ("250-…") sonuna kadar bekler. */
function yanitOkuyucu(okunabilir) {
  const okuyucu = okunabilir.getReader();
  const cozucu = new TextDecoder();
  let tampon = '';
  return {
    async oku() {
      const satirlar = [];
      for (;;) {
        const son = tampon.indexOf('\n');
        if (son >= 0) {
          const satir = tampon.slice(0, son).replace(/\r$/, '');
          tampon = tampon.slice(son + 1);
          satirlar.push(satir);
          if (/^\d{3} /.test(satir) || /^\d{3}$/.test(satir)) return { kod: Number(satir.slice(0, 3)), metin: satirlar.join('\n') };
          continue;
        }
        const { value, done } = await okuyucu.read();
        if (done) throw new SmtpHatasi('baglanti', 'sunucu bağlantıyı kapattı');
        tampon += cozucu.decode(value, { stream: true });
      }
    },
    birak() {
      okuyucu.releaseLock();
    },
  };
}

/**
 * SMTP ile tek bir e-posta gönderir.
 * baglan(adres, secenek) Cloudflare'ın `connect` işleviyle aynı biçimde bir soket döner.
 */
export async function smtpGonder(ayar, eposta, baglan) {
  const { sunucu = 'smtp.protonmail.ch', port = 587, kullanici, sifre } = ayar;
  const soket = baglan({ hostname: sunucu, port }, { secureTransport: 'starttls', allowHalfOpen: false });
  let akis = soket;
  let okuyucu = yanitOkuyucu(akis.readable);
  let yazici = akis.writable.getWriter();
  const kodlayici = new TextEncoder();

  const yaz = (metin) => yazici.write(kodlayici.encode(metin + SATIR_SONU));
  const bekle = async (adim, beklenen) => {
    const yanit = await okuyucu.oku();
    if (yanit.kod !== beklenen) throw new SmtpHatasi(adim, yanit.metin);
    return yanit;
  };

  try {
    await bekle('karsilama', 220);
    await yaz('EHLO iletisim.helyosfer.me');
    await bekle('ehlo', 250);
    await yaz('STARTTLS');
    await bekle('starttls', 220);

    // Şifreli kanala geç: eski okuyucu ve yazıcı bırakılır, yenileri şifreli soketten alınır
    okuyucu.birak();
    yazici.releaseLock();
    akis = soket.startTls();
    okuyucu = yanitOkuyucu(akis.readable);
    yazici = akis.writable.getWriter();

    await yaz('EHLO iletisim.helyosfer.me');
    await bekle('ehlo2', 250);
    await yaz(`AUTH PLAIN ${base64Utf8(`\0${kullanici}\0${sifre}`)}`);
    await bekle('giris', 235);
    await yaz(`MAIL FROM:<${eposta.gonderen}>`);
    await bekle('mail_from', 250);
    await yaz(`RCPT TO:<${eposta.alici}>`);
    await bekle('rcpt_to', 250);
    await yaz('DATA');
    await bekle('data', 354);
    await yazici.write(kodlayici.encode(mesajOlustur(eposta) + '.' + SATIR_SONU));
    await bekle('gonderim', 250);
    await yaz('QUIT').catch(() => {});
  } finally {
    try {
      await akis.close();
    } catch {}
  }
}

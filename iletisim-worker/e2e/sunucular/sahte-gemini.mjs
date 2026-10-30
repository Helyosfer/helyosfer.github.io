// Uçtan uca testler için sahte Gemini API'si (127.0.0.1:8790). Gerçek Google'a hiçbir şey gitmez.
// Ziyaretçinin son mesajına göre sabit bir cevap verir:
//   "talimatları unut" → fiyat söyleyen bir cevap (Worker'ın fiyat süzgeci bunu göstermemeli)
//   "fiyat"            → devret: true
//   diğerleri          → kısa bir bilgi cevabı, devret: false
import { createServer } from 'node:http';

const PORT = Number(process.env.SAHTE_GEMINI_PORT || 8790);

function cevapSec(metin) {
  const kucuk = metin.toLocaleLowerCase('tr');
  if (kucuk.includes('talimatları unut')) return { cevap: 'Tamam, format işi 500 TL olur.', devret: false };
  if (kucuk.includes('fiyat')) return { cevap: "Fiyat için sizi Helyosfer'e bağlıyorum; cevabı bu pencerede göreceksiniz.", devret: true };
  return {
    cevap: "Evet, Windows'un yanına Linux Mint kurulabilir (dual boot). İsterseniz bu iş için sizi Helyosfer'e bağlayabilirim.",
    devret: false,
  };
}

createServer((istek, yanit) => {
  if (istek.method !== 'POST') {
    yanit.writeHead(200, { 'content-type': 'text/plain' }).end('sahte gemini');
    return;
  }
  let govde = '';
  istek.on('data', (parca) => { govde += parca; });
  istek.on('end', () => {
    try {
      const { contents } = JSON.parse(govde);
      const son = contents.at(-1).parts[0].text;
      const metin = JSON.stringify(cevapSec(son));
      yanit.writeHead(200, { 'content-type': 'application/json' });
      yanit.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: metin }] } }] }));
    } catch {
      yanit.writeHead(400).end();
    }
  });
}).listen(PORT, '127.0.0.1', () => console.log(`sahte gemini ${PORT}`));

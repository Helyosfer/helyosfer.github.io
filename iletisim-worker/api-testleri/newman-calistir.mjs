// Postman koleksiyonunu (api-testleri/postman-koleksiyonu.json) Newman ile yerel Worker'a karşı çalıştırır.
// Yerel Worker (8787) ve sahte Gemini (8790) açık değilse otomatik başlatır ve iş bitince PID üzerinden kapatır.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const KOLEKSIYON = join(KOK, 'api-testleri', 'postman-koleksiyonu.json');
const NEWMAN = join(KOK, 'node_modules', '.bin', 'newman');

async function acikMi(url) {
  try {
    const yanit = await fetch(url);
    return yanit.status > 0;
  } catch {
    return false;
  }
}

async function hazirOlanaKadarBekle(url, zamanAsimiMs = 60_000) {
  const baslangic = Date.now();
  while (Date.now() - baslangic < zamanAsimiMs) {
    if (await acikMi(url)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Sunucu zamanında açılmadı: ${url}`);
}

const baslatilanlar = [];

function pidKapat(surec) {
  if (!surec || !surec.pid || surec.exitCode !== null) return Promise.resolve();
  return new Promise((coz) => {
    surec.once('exit', () => coz());
    try {
      process.kill(surec.pid, 'SIGTERM');
    } catch {
      coz();
      return;
    }
    setTimeout(() => {
      if (surec.exitCode === null && surec.pid) {
        try {
          process.kill(surec.pid, 'SIGKILL');
        } catch {
          // Kapandı
        }
      }
      coz();
    }, 3000);
  });
}

try {
  if (!(await acikMi('http://127.0.0.1:8790/'))) {
    const gemini = spawn(process.execPath, [join(KOK, 'e2e', 'sunucular', 'sahte-gemini.mjs')], {
      cwd: KOK,
      stdio: 'ignore',
    });
    baslatilanlar.push(gemini);
    await hazirOlanaKadarBekle('http://127.0.0.1:8790/');
  }

  if (!(await acikMi('http://127.0.0.1:8787/admin'))) {
    const worker = spawn(process.execPath, [join(KOK, 'e2e', 'sunucular', 'worker.mjs')], {
      cwd: KOK,
      stdio: 'ignore',
    });
    baslatilanlar.push(worker);
    await hazirOlanaKadarBekle('http://127.0.0.1:8787/admin', 90_000);
  }

  const kod = await new Promise((coz) => {
    const newmanSureci = spawn(NEWMAN, ['run', KOLEKSIYON, '--color', 'on'], {
      cwd: KOK,
      stdio: 'inherit',
    });
    newmanSureci.on('exit', (c) => coz(c ?? 1));
  });

  if (kod !== 0) process.exitCode = kod;
} finally {
  for (const s of baslatilanlar.reverse()) {
    await pidKapat(s);
  }
}

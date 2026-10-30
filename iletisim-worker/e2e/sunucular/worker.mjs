// Uçtan uca testler için yerel Worker (127.0.0.1:8787).
// - Her çalıştırmada boş bir veritabanıyla başlar (.wrangler/e2e), geliştirme verisine dokunmaz.
// - Hız sınırları yükseltilir: üç tarayıcı aynı IP'den paralel çalışır, normal sınırlarla ilk 5 istekten sonra 429 alırdı.
// - Panel kilidi yalnızca 127.0.0.1'de atlanır (GELISTIRME=1), Gemini sahte sunucuya gider, e-posta gönderilmez
//   (SMTP_SIFRESI tanımlı değil).
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ayar = join(kok, 'wrangler.e2e.toml');
const veri = join(kok, '.wrangler', 'e2e');
const wrangler = join(kok, 'node_modules', '.bin', 'wrangler');

writeFileSync(ayar, readFileSync(join(kok, 'wrangler.toml'), 'utf8').replace(/limit = \d+/g, 'limit = 100000'));
rmSync(veri, { recursive: true, force: true });

const goc = spawnSync(wrangler, ['d1', 'migrations', 'apply', 'iletisim', '--local', '-c', ayar, '--persist-to', veri], {
  cwd: kok,
  stdio: 'inherit',
  env: { ...process.env, CI: '1' },
});
if (goc.status !== 0) process.exit(goc.status ?? 1);

const degiskenler = {
  GELISTIRME: '1',
  IZINLI_KOKENLER: 'http://127.0.0.1:5500',
  GEMINI_ANAHTARI: 'sahte',
  GEMINI_ADRESI: 'http://127.0.0.1:8790',
};
const surec = spawn(
  wrangler,
  [
    'dev', '-c', ayar, '--persist-to', veri,
    '--ip', '127.0.0.1', '--port', '8787', '--local-upstream', '127.0.0.1:8787',
    ...Object.entries(degiskenler).flatMap(([ad, deger]) => ['--var', `${ad}:${deger}`]),
  ],
  { cwd: kok, stdio: 'inherit' },
);

for (const sinyal of ['SIGINT', 'SIGTERM']) process.on(sinyal, () => surec.kill(sinyal));
surec.on('exit', (kod) => process.exit(kod ?? 0));

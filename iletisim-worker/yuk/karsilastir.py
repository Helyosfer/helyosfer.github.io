"""İki k6 çalıştırmasını (A: önce, B: sonra) istatistiksel olarak karşılaştırır.

    k6 run --out csv=yuk/a.csv yuk/load-test.js      # değişiklikten önce
    k6 run --out csv=yuk/b.csv yuk/load-test.js      # değişiklikten sonra
    python3 yuk/karsilastir.py yuk/a.csv yuk/b.csv

Her işlem (oku / yaz / yeni / devret) için http_req_duration örneklerini alır ve:
- medyan ile p95 farkı,
- medyan farkı için %95 bootstrap güven aralığı,
- Mann-Whitney U testi (normal yaklaşımı, iki yönlü) p değeri.
Fark yalnızca p < 0,05 VE güven aralığı sıfırı içermiyorsa VE etki %5'ten büyükse "anlamlı" sayılır.
Gürültüyü azaltmak için ilk 60 saniyenin (ısınma, soğuk başlangıç) örnekleri atılır.
Yalnızca standart kütüphane; ek paket gerekmez.
"""

import csv
import math
import random
import sys
from collections import defaultdict

ISINMA_SN = 60
BOOTSTRAP = 2000
ALFA = 0.05
EN_AZ_ETKI = 0.05


def oku(yol):
    """k6 CSV çıktısından {işlem: [süre ms, ...]}. Betiğin `islem` etiketi `extra_tags` sütununda durur."""
    satirlar = []
    with open(yol, newline="") as f:
        for satir in csv.DictReader(f):
            if satir["metric_name"] != "http_req_duration":
                continue
            etiketler = dict(p.split("=", 1) for p in (satir.get("extra_tags") or "").split("&") if "=" in p)
            islem = satir.get("islem") or etiketler.get("islem")
            if islem and islem != "hazirlik":
                satirlar.append((islem, float(satir["timestamp"]), float(satir["metric_value"])))
    sonuc = defaultdict(list)
    if not satirlar:
        return sonuc
    ilk = min(z for _, z, _ in satirlar)
    for islem, zaman, deger in satirlar:
        if zaman - ilk >= ISINMA_SN:
            sonuc[islem].append(deger)
    return sonuc


def yuzdelik(dizi, p):
    s = sorted(dizi)
    k = (len(s) - 1) * p
    a, b = math.floor(k), math.ceil(k)
    return s[a] + (s[b] - s[a]) * (k - a)


def mann_whitney(a, b):
    """İki yönlü Mann-Whitney U, bağ düzeltmeli normal yaklaşım."""
    birlesik = sorted([(v, 0) for v in a] + [(v, 1) for v in b])
    siralar = [0.0] * len(birlesik)
    bag_toplami = 0.0
    i = 0
    while i < len(birlesik):
        j = i
        while j + 1 < len(birlesik) and birlesik[j + 1][0] == birlesik[i][0]:
            j += 1
        ort = (i + j) / 2 + 1
        for k in range(i, j + 1):
            siralar[k] = ort
        t = j - i + 1
        bag_toplami += t ** 3 - t
        i = j + 1
    n1, n2 = len(a), len(b)
    r1 = sum(r for r, (_, g) in zip(siralar, birlesik) if g == 0)
    u = r1 - n1 * (n1 + 1) / 2
    n = n1 + n2
    sigma = math.sqrt(n1 * n2 / 12 * ((n + 1) - bag_toplami / (n * (n - 1))))
    if sigma == 0:
        return 1.0
    z = (u - n1 * n2 / 2) / sigma
    return math.erfc(abs(z) / math.sqrt(2))


def bootstrap_medyan_farki(a, b, rng):
    farklar = []
    for _ in range(BOOTSTRAP):
        ma = yuzdelik([rng.choice(a) for _ in range(min(len(a), 2000))], 0.5)
        mb = yuzdelik([rng.choice(b) for _ in range(min(len(b), 2000))], 0.5)
        farklar.append(mb - ma)
    return yuzdelik(farklar, 0.025), yuzdelik(farklar, 0.975)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    a, b = oku(sys.argv[1]), oku(sys.argv[2])
    rng = random.Random(42)
    anlamli_kotulesme = False
    print(f"{'işlem':8} {'n(A)':>7} {'n(B)':>7} {'med A':>8} {'med B':>8} {'p95 A':>8} {'p95 B':>8} {'%95 GA (ms)':>18} {'p':>8}  sonuç")
    for islem in sorted(set(a) & set(b)):
        x, y = a[islem], b[islem]
        if len(x) < 30 or len(y) < 30:
            print(f"{islem:8} yetersiz örnek")
            continue
        ma, mb = yuzdelik(x, 0.5), yuzdelik(y, 0.5)
        alt, ust = bootstrap_medyan_farki(x, y, rng)
        p = mann_whitney(x, y)
        etki = (mb - ma) / ma if ma else 0
        anlamli = p < ALFA and not (alt <= 0 <= ust) and abs(etki) >= EN_AZ_ETKI
        sonuc = ("daha yavaş" if etki > 0 else "daha hızlı") + f" ({etki:+.0%})" if anlamli else "fark yok"
        anlamli_kotulesme |= anlamli and etki > 0
        print(f"{islem:8} {len(x):7} {len(y):7} {ma:8.1f} {mb:8.1f} {yuzdelik(x, .95):8.1f} {yuzdelik(y, .95):8.1f}"
              f" {f'[{alt:+.1f}, {ust:+.1f}]':>18} {p:8.4f}  {sonuc}")
    sys.exit(1 if anlamli_kotulesme else 0)


if __name__ == "__main__":
    main()

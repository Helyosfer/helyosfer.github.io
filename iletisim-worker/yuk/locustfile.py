"""İletişim Worker'ı için Locust yük testi (k6 betiğiyle aynı senaryolar: okuyucu / yazar / insan, 70/25/5).

Canlıya (iletisim.helyosfer.me) karşı çalışmaz; yerel Worker ya da ayrı bir hazırlık (staging) Worker'ı kullan.

Tek makine, duman testi (yerel Worker açıkken):
    locust -f yuk/locustfile.py --headless -u 20 -r 5 -t 30s --host http://127.0.0.1:8787

10.000 kullanıcı, dağıtık (bir yönetici + birkaç işçi; her işçi ~1.500-2.500 kullanıcı taşır):
    YUK_PROFILI=tepe locust -f yuk/locustfile.py --master --headless --expect-workers 6 \
        --host https://<staging> --csv yuk/locust
    locust -f yuk/locustfile.py --worker --master-host <yönetici adresi>      # her işçi makinesinde

Ortam değişkenleri: KOKEN (izinli Origin, varsayılan http://127.0.0.1:5500), HAVUZ (hazır sohbet sayısı, 150),
YUK_PROFILI (duman | tepe; tepe, kademeli olarak 10.000 kullanıcıya çıkar).
Eşikler aşılırsa süreç 1 ile çıkar (CI için).
"""

import json
import os
import random
import threading
import time
from urllib.parse import urlparse

from locust import HttpUser, LoadTestShape, between, events, task

KOKEN = os.environ.get("KOKEN", "http://127.0.0.1:5500")
HAVUZ_BOYUTU = int(os.environ.get("HAVUZ", "150"))
PROFIL = os.environ.get("YUK_PROFILI", "duman")

# Eşikler (ms) — k6 betiğiyle aynı
ESIKLER = {
    "GET /v1/mesaj": {"p95": 300, "p99": 800},
    "POST /v1/mesaj (mevcut)": {"p95": 800, "p99": 2000},
    "POST /v1/mesaj (yeni)": {"p95": 1000},
    "POST /v1/devret": {"p95": 800},
    "[ilk istek]": {"p95": 1500},
}
BEKLENMEYEN_EN_FAZLA = 0.01

SORULAR = [
    "Windows yanına Linux kurulabilir mi?",
    "Raspberry Pi ile Pi-hole kuruyor musunuz?",
    "Minecraft sunucusu için hangi VPS iyi olur?",
    "Domain ve HTTPS ayarı yapıyor musunuz?",
    "Docker ile ev sunucusu kurmak istiyorum.",
]

BASLIK = {"content-type": "application/json", "origin": KOKEN}
_havuz: list[dict] = []
_havuz_kilidi = threading.Lock()
sayac = {"sinir_reddi": 0, "beklenmeyen": 0, "toplam": 0}


def yetki(s):
    return {**BASLIK, "authorization": f"Bearer {s['sohbet']}.{s['belirtec']}"}


@events.init.add_listener
def hedefi_denetle(environment, **_):
    host = environment.host or ""
    ad = urlparse(host).hostname or ""
    if (ad == "helyosfer.me" or ad.endswith(".helyosfer.me")) and not any(k in host for k in ("staging", "test", "yuk")):
        raise SystemExit(f"Canlıya yük testi yapılmaz: {host}. Yerel ya da ayrı bir hazırlık Worker'ı kullan.")


class SohbetKullanicisi(HttpUser):
    abstract = True

    def on_start(self):
        self.ilk = True

    def istek(self, yontem, yol, ad, beklenen, **kw):
        """İsteği atar ve sınıflandırır: 429 ve 503 yogun = beklenen koruma, beklenmeyen kod/JSON = hata."""
        baslangic = time.perf_counter()
        with self.client.request(yontem, yol, name=ad, catch_response=True, **kw) as yanit:
            sure = (time.perf_counter() - baslangic) * 1000
            if self.ilk:
                # Soğuk başlangıç ayrı bir satırda: ısınmış isteklerin dağılımını bozmasın
                events.request.fire(request_type="İLK", name="[ilk istek]", response_time=sure, response_length=0,
                                    exception=None, context={})
                self.ilk = False
            sayac["toplam"] += 1
            # Günlük yeni sohbet sınırı 503 + "yogun" döner; o da koruma, hata değil
            yogun = False
            if yanit.status_code == 503:
                try:
                    yogun = yanit.json().get("hata") == "yogun"
                except (ValueError, json.JSONDecodeError, AttributeError):
                    yogun = False
            if yanit.status_code == 429 or yogun:
                sayac["sinir_reddi"] += 1
                yanit.success()
                return None
            try:
                govde = yanit.json()
            except (ValueError, json.JSONDecodeError):
                govde = None
            if yanit.status_code not in beklenen or govde is None:
                sayac["beklenmeyen"] += 1
                yanit.failure(f"beklenmeyen {yanit.status_code}")
                return None
            if yanit.headers.get("access-control-allow-origin") != KOKEN:
                sayac["beklenmeyen"] += 1
                yanit.failure("CORS başlığı yok")
                return None
            return govde

    def yeni_sohbet(self):
        govde = self.istek("POST", "/v1/mesaj", "POST /v1/mesaj (yeni)", (201,),
                           json={"metin": random.choice(SORULAR), "dil": "tr"}, headers=BASLIK)
        return {"sohbet": govde["sohbet"], "belirtec": govde["belirtec"]} if govde and "belirtec" in govde else None


class Okuyucu(SohbetKullanicisi):
    """Penceresi açık ziyaretçi: 10 sn'de bir yoklar."""
    weight = 14
    wait_time = between(9, 11)

    def on_start(self):
        super().on_start()
        with _havuz_kilidi:
            if len(_havuz) < HAVUZ_BOYUTU:
                s = self.yeni_sohbet()
                if s:
                    _havuz.append(s)
            self.sohbet = random.choice(_havuz) if _havuz else None

    @task
    def yokla(self):
        if not self.sohbet:
            return
        govde = self.istek("GET", "/v1/mesaj", "GET /v1/mesaj", (200,), headers=yetki(self.sohbet))
        if govde is not None and not govde.get("mesajlar"):
            sayac["beklenmeyen"] += 1


class Yazar(SohbetKullanicisi):
    weight = 5
    wait_time = between(5, 20)

    @task
    def konus(self):
        s = self.yeni_sohbet()
        if not s:
            return  # günlük sohbet sınırı: koruma çalıştı
        for i in range(2):
            time.sleep(random.uniform(5, 15))
            self.istek("POST", "/v1/mesaj", "POST /v1/mesaj (mevcut)", (200,),
                       json={"metin": f"Ek soru {i + 1}: {SORULAR[i]}"}, headers=yetki(s))


class Insan(SohbetKullanicisi):
    weight = 1
    wait_time = between(15, 25)

    @task
    def devret(self):
        s = self.yeni_sohbet()
        if not s:
            return
        time.sleep(random.uniform(3, 8))
        govde = self.istek("POST", "/v1/devret", "POST /v1/devret", (200,), headers=yetki(s))
        if govde is not None and govde.get("asistan") is not False:
            sayac["beklenmeyen"] += 1


class TepeProfili(LoadTestShape):
    """YUK_PROFILI=tepe: 1 dk'da 1.000'e, 2 dk'da 10.000'e çık, 5 dk tut, 1 dk'da in."""
    asamalar = [(60, 1000, 20), (180, 10000, 75), (480, 10000, 75), (540, 0, 200)]

    def tick(self):
        if PROFIL != "tepe":
            return None  # komut satırındaki -u / -r kullanılır
        t = self.get_run_time()
        for bitis, kullanici, hiz in self.asamalar:
            if t < bitis:
                return kullanici, hiz
        return None


if PROFIL != "tepe":
    # Şekil sınıfı tanımlıyken Locust komut satırındaki -u/-r'yi yok sayar; duman profilinde kaldır
    del TepeProfili


@events.quitting.add_listener
def esikleri_denetle(environment, **_):
    stats = environment.stats
    hatalar = []
    for ad, sinir in ESIKLER.items():
        girdi = next((s for (n, _m), s in stats.entries.items() if n == ad), None)
        if not girdi or girdi.num_requests == 0:
            continue
        for yuzde, ms in sinir.items():
            deger = girdi.get_response_time_percentile(int(yuzde[1:]) / 100)
            if deger > ms:
                hatalar.append(f"{ad} {yuzde} {deger:.0f} ms > {ms} ms")
    oran = sayac["beklenmeyen"] / max(sayac["toplam"], 1)
    if oran > BEKLENMEYEN_EN_FAZLA:
        hatalar.append(f"beklenmeyen yanıt oranı {oran:.2%} > {BEKLENMEYEN_EN_FAZLA:.0%}")
    print(f"Koruma (429, 503 yogun): {sayac['sinir_reddi']}  Beklenmeyen: {sayac['beklenmeyen']}/{sayac['toplam']}")
    if hatalar:
        print("EŞİK AŞILDI:\n  " + "\n  ".join(hatalar))
        environment.process_exit_code = 1
    else:
        print("Eşikler sağlandı.")

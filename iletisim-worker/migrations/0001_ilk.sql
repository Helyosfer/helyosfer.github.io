-- Sohbetler ve mesajlar. Zamanlar milisaniye (Date.now()).
-- Ziyaretçinin IP adresi saklanmaz.

CREATE TABLE sohbetler (
  id TEXT PRIMARY KEY,
  -- Ziyaretçinin tarayıcısındaki belirtecin SHA-256 özeti; belirtecin kendisi saklanmaz
  belirtec_ozeti TEXT NOT NULL,
  ad TEXT,
  iletisim TEXT,
  dil TEXT NOT NULL DEFAULT 'tr',
  -- acik | kapali
  durum TEXT NOT NULL DEFAULT 'acik',
  -- Panelde henüz okunmamış ziyaretçi mesajı sayısı
  okunmamis INTEGER NOT NULL DEFAULT 0,
  olusturma INTEGER NOT NULL,
  guncelleme INTEGER NOT NULL,
  son_bildirim INTEGER
);

CREATE TABLE mesajlar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sohbet_id TEXT NOT NULL REFERENCES sohbetler(id) ON DELETE CASCADE,
  -- ziyaretci | ben
  gonderen TEXT NOT NULL,
  metin TEXT NOT NULL,
  zaman INTEGER NOT NULL
);

CREATE INDEX mesajlar_sohbet ON mesajlar (sohbet_id, id);
CREATE INDEX sohbetler_guncelleme ON sohbetler (guncelleme DESC);
CREATE INDEX sohbetler_bildirim ON sohbetler (son_bildirim);

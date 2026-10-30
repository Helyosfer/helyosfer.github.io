-- Günlük yeni sohbet sınırı açılış zamanına göre sayar; panel listesi duruma göre süzülüp sayfalanır.
CREATE INDEX sohbetler_olusturma ON sohbetler (olusturma);
CREATE INDEX sohbetler_durum_guncelleme ON sohbetler (durum, guncelleme DESC);

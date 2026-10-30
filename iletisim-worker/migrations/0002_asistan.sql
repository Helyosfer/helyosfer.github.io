-- Yapay zekâ asistanı. mesajlar.gonderen artık 'asistan' da olabilir.

-- 1: asistan bu sohbette cevap veriyor; 0: sohbet Helyosfer'e devredildi (asistan bir daha konuşmaz)
ALTER TABLE sohbetler ADD COLUMN asistan INTEGER NOT NULL DEFAULT 1;

-- Daha önce cevap yazdığın sohbetlerde asistan konuşmasın
UPDATE sohbetler SET asistan = 0 WHERE id IN (SELECT sohbet_id FROM mesajlar WHERE gonderen = 'ben');

-- Günlük asistan sınırı için son 24 saatteki asistan mesajları sayılır
CREATE INDEX mesajlar_gonderen_zaman ON mesajlar (gonderen, zaman);

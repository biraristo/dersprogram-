# Ders Atölyesi
Şube, öğretmen ve derslik bazında haftalık okul çizelgesi hazırlayan Türkçe uygulama.
## Yerel kullanım
Python 3.10+ ile `python3 server.py` çalıştırın ve http://127.0.0.1:8765 adresini açın. Harici paket gerekmez. SQLite dosyası ilk çalıştırmada oluşturulur. Yerel sunucu tek okul için tasarlanmıştır. Ayrı oturumların aynı değişikliği ezmesi sürüm kontrolüyle engellenir.
## Web sürümü
dist dizinini statik bir HTTPS sunucusunda yayınlayabilirsiniz. Bu modda kayıtlar tarayıcıya özeldir. JSON yedekleri iki sürüm arasında taşınabilir. Okul verilerini depoya eklemeyin.
## Planlama
Aynı atamadaki şubeler ve öğretmenler birlikte yerleştirilir. Haftalık yük bloklardan oluşur. Her blok bir güne sığar. Motor, geçerli seçenek sayısı en az olan bloğa öncelik veren geri izlemeli arama kullanır. Zaman sınırı ve kanıtlanmış çözümsüzlük ayrı sonuçlardır. Günlere yayılma bir tercihtir. Çıktı doğrulandıktan sonra kaydedilir. Python sunucusu sonuçları ayrıca kontrol eder.
## Test
Node.js ile `node test.mjs`. Üretim ve doğrulama kaynak dosyaları dist dizinindedir.

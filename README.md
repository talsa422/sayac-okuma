# Sayaç Okuma

Konvektörü olmayan binalarda, şaft içindeki sıcak su sayaçlarını gözle okurken
kullanılan basit, çevrimdışı çalışan bir uygulama. Sunucu yok, kurulum yok;
telefonun tarayıcısında açılır ve ana ekrana eklenip normal bir uygulama gibi
kullanılabilir. Tüm veriler yalnızca kullandığınız cihazda saklanır.

## Neler yapar

- **Bina ve daire listesi**: Her binaya daireleri (ve isterseniz sayaç seri
  numaralarını) bir kere tanımlarsınız, sonraki dönemlerde tekrar yazmazsınız.
- **Daire numaralarını elle yazmadan oluşturma**: "Daireleri Düzenle"
  ekranında başlangıç/bitiş numarasını girip **Numaraları Oluştur**'a
  basmanız yeterli (ör. 1'den 24'e kadar tek tuşla oluşur). Aynı numaralandırmaya
  sahip başka bir binanız varsa **Başka Binadan Kopyala** ile onun daire
  listesini de tek dokunuşla kopyalayabilirsiniz. Siz sadece okuma
  değerlerini girersiniz.
- **Hızlı okuma girişi**: Her daireye dokunup yeni değeri girersiniz; önceki
  okuma her zaman ekranda görünür.
- **Yanlış eklenen daireyi silme**: Bir daireye dokunduğunuzda açılan
  formda **Bu Daireyi Sil** düğmesi vardır; yanlışlıkla eklenen veya
  gerekmeyen bir daireyi onay isteyerek kaldırır.
- **Binalar arası hızlı geçiş**: Bina ekranının üstündeki **Bina değiştir**
  açılır listesinden, ana ekrana dönmeden doğrudan başka bir binaya
  geçebilirsiniz.
- **Fark bilgisi**: Yeni okuma ile önceki okuma arasındaki fark otomatik
  hesaplanıp gösterilir; herhangi bir onay istemez, sadece bilgi amaçlıdır.
- **İlerleme takibi**: Bina ekranında "X / Y okundu" göstergesi, hangi
  dairelerin kaldığını hemen görmenizi sağlar.
- **Dönemi kapat**: Bir okuma turu bittiğinde tek dokunuşla yeni değerleri
  "önceki okuma" yapar, bir sonraki döneme hazır hale getirir.
- **CSV dışa aktarım**: Her bina için Türkçe Excel'de doğrudan açılacak
  şekilde (noktalı virgülle ayrılmış, ondalık virgüllü, UTF-8) CSV indirir.
  Bunu faturalama sisteminize aktarabilirsiniz.
- **Yedekleme**: Ayarlar ekranından tüm verinizi tek bir JSON dosyası olarak
  indirip saklayabilir, gerekirse geri yükleyebilirsiniz. Tarayıcı verisi
  temizlenirse veri kaybını önlemenin tek yolu düzenli yedek almaktır.
- **Çevrimdışı çalışır**: Şaftlarda genelde internet olmadığı için uygulama
  bir kere yüklendikten sonra internetsiz de açılır ve çalışır.
- **Hem iPhone hem Android**: Arayüz her iki platformda da aynı şekilde
  çalışacak ve görünecek şekilde hazırlandı (çentikli iPhone'larda içerik
  kesilmez, "ana ekrana ekle" sonrası tam ekran açılır, buton/liste
  seçici gibi kontroller iki tarafta da aynı görünür).

## Nasıl kullanılır (ilk kurulum)

Dosyaları doğrudan çift tıklayarak (file://) açmak temel kullanım için
çalışır, ama telefona "uygulama gibi" kurabilmek (ve tam çevrimdışı önbellek)
için basit bir yerel sunucudan servis etmeniz gerekir.

### Bilgisayarda hızlı test

PowerShell'de proje klasöründeyken:

```powershell
python -m http.server 8000
```

veya Node.js kuruluysa:

```powershell
npx serve .
```

Sonra tarayıcıda `http://localhost:8000` adresini açın.

### Telefona kurma

Uygulama yayında, telefonda şu adresten açılabilir:

**https://talsa422.github.io/sayac-okuma/**

1. Bu adresi Chrome (Android) veya Safari (iPhone) ile açın.
2. Chrome'da sağ üst **⋮ menü → Ana ekrana ekle**; Safari'de **Paylaş →
   Ana Ekrana Ekle**.
3. Artık uygulama ikonu ana ekranınızda, normal bir uygulama gibi açılır,
   tam ekran çalışır ve internetsiz de kullanılabilir.

Kod `github.com/talsa422/sayac-okuma` adresinde herkese açık (public) bir
depoda tutuluyor; bu sadece uygulamanın kaynak kodu, hiçbir bina/daire/okuma
verisi değil. Verileriniz her zaman yalnızca kendi telefonunuzda saklanır,
hiçbir sunucuya gönderilmez.

### Uygulamayı güncellemek

İleride kod üzerinde değişiklik yaparsak, güncellemeyi yayına almak için:

```powershell
git add -A
git commit -m "güncelleme açıklaması"
git push
```

Birkaç dakika içinde aynı adres güncel sürümü gösterir; telefonda uygulamayı
kapatıp yeniden açmanız yeterli (arka planda otomatik güncellenir).

## Kullanım akışı

1. **+ Yeni Bina** ile binayı ekleyin.
2. Binaya girip **Daireleri Düzenle**'ye tıklayın. Daire numaralarını tek
   tek yazmak yerine başlangıç/bitiş girip **Numaraları Oluştur**'a basın,
   ya da benzer bir binanız varsa **Başka Binadan Kopyala**'yı kullanın.
   Seri no ve önceki okuma eklemek isterseniz listeyi elle de
   düzenleyebilirsiniz (format: `Daire No; Sayaç Seri No; Önceki Okuma`).
3. Şaftta gezerken her daireye dokunun, yeni değeri girin, **Kaydet ve
   Sonrakine Geç** ile bir sonraki okunmamış daireye otomatik geçin.
4. Tur bitince binadan **CSV Dışa Aktar** ile veriyi indirin.
5. Yeni döneme geçmeden önce **Dönemi Kapat**'a basın.
6. Arada bir Ayarlar'dan **Tüm Verileri Yedekle** ile JSON yedek alın.

## Sınırlamalar / bilinen kısıtlar

- Veriler yalnızca kullanılan cihaz+tarayıcıda saklanır (localStorage);
  birden fazla telefondan aynı veriye erişim şu an desteklenmiyor.
- Fotoğraf kanıtı henüz yok (v1 kapsamı dışında bırakıldı, veri boyutu
  büyümesin diye); gerekirse ikinci sürümde eklenebilir.

## Sonraki adım fikirleri

- Kamerayla sayaç rakamını otomatik okuma (OCR) — hız kazandırır ama doğruluk
  testi gerektirir, faturalama verisi olduğu için dikkatli değerlendirilmeli.
- Birden fazla cihaz arasında senkronizasyon (basit bir bulut deposu ile).
- Bina bazında not/uyarı geçmişi (ör. "bu daire her ay yüksek okunuyor").

# Sayaç Okuma

Konvektörü olmayan binalarda, şaft içindeki sıcak su sayaçlarını gözle okurken
kullanılan basit, çevrimdışı çalışan bir uygulama. Sunucu yok, kurulum yok;
telefonun tarayıcısında açılır ve ana ekrana eklenip normal bir uygulama gibi
kullanılabilir. Varsayılan olarak tüm veriler yalnızca kullandığınız cihazda
saklanır; isterseniz (aşağıdaki "Cihazlar Arası Senkronizasyon Kurulumu"
bölümüne bakın) birden fazla telefon arasında paylaşımlı hale de getirebilirsiniz.

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
- **Yanlış eklenen daireyi silme + geri alma**: Bir daireye dokunduğunuzda
  açılan formda **Bu Daireyi Sil** düğmesi vardır. Sildikten hemen sonra
  çıkan bildirimdeki **Geri Al**'a basarak anında geri getirebilir, ya da
  daha sonra Ayarlar'daki **Son Silinen Daireler** listesinden istediğiniz
  zaman geri getirebilirsiniz. **Tüm Verileri Sil** ile yapılan toplu
  silme de aynı şekilde korumalı: Ayarlar'da beliren **Silinen Tüm
  Verileri Geri Getir** düğmesiyle son silinen her şeyi geri alabilirsiniz.
- **Sesli okuma girişi (Android)**: Okuma alanının yanındaki 🎤 düğmesine
  basıp rakamı söyleyerek girebilirsiniz; elleriniz meşgulken (fener,
  kapı vb.) yazmaktan daha hızlıdır. Bu, tarayıcının konuşma tanıma
  desteğine bağlı olduğu için şu an yalnızca Android/Chrome'da çalışıyor;
  iPhone'da Safari bu özelliği desteklemediğinden düğme görünmez, ama
  iOS'un kendi klavyesindeki mikrofon tuşuyla zaten dikte yapabilirsiniz.
- **Bina notu**: Bina ekranında, daire listesinin üstünde kalıcı bir not
  alanı vardır (ör. "Kapıcı: Ahmet Bey", "Şaft anahtarı yönetimde").
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
- **Yedekleme + hatırlatma**: Ayarlar ekranından tüm verinizi tek bir JSON
  dosyası olarak indirip saklayabilir, gerekirse geri yükleyebilirsiniz.
  Son yedeğinizin üzerinden 7 günden fazla geçtiyse (veya hiç almadıysanız),
  bir dönemi kapattığınızda veya uygulamayı açtığınızda size nazikçe
  hatırlatır. Tarayıcı verisi temizlenirse veri kaybını önlemenin tek yolu
  düzenli yedek almaktır.
- **Çevrimdışı çalışır**: Şaftlarda genelde internet olmadığı için uygulama
  bir kere yüklendikten sonra internetsiz de açılır ve çalışır.
- **Hem iPhone hem Android**: Arayüz her iki platformda da aynı şekilde
  çalışacak ve görünecek şekilde hazırlandı (çentikli iPhone'larda içerik
  kesilmez, "ana ekrana ekle" sonrası tam ekran açılır, buton/liste
  seçici gibi kontroller iki tarafta da aynı görünür).
- **Cihazlar arası senkronizasyon (opsiyonel)**: Kurulumu yaptıktan sonra
  (bkz. aşağıdaki bölüm), Ayarlar'dan bir paylaşım kodu oluşturup başka
  telefonlara girerek aynı bina/daire listesini ve okumaları birden fazla
  cihazdan görebilir, birlikte çalışabilirsiniz. Değişiklikler internet
  bağlantısı olan her cihaza otomatik yansır; şaftta internet yoksa
  okumaya devam edersiniz, bağlantı gelince kendiliğinden senkronize olur.

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

## Cihazlar Arası Senkronizasyon Kurulumu

Bu özellik **opsiyoneldir** ve şu anda kapalı gelir; kurmadığınız sürece
uygulama bugünkü gibi tek cihazda, tamamen yerel çalışmaya devam eder.
Birden fazla telefon/kişi aynı bina listesini görsün istiyorsanız, ücretsiz
bir Google hesabıyla bir kere kurulum yapmanız gerekiyor (yaklaşık 5 dakika):

1. https://console.firebase.google.com adresine gidin, Google hesabınızla
   giriş yapıp **"Add project" / "Proje ekle"** ile yeni bir proje oluşturun
   (kredi kartı istemez, ücretsiz plan yeterli).
2. Sol menüden **Build > Firestore Database** açın, **"Create database"**
   ile bir veritabanı oluşturun (test modunda başlatabilirsiniz).
3. Sol üstteki dişli simgesinden **Project settings** açın, aşağıda
   **"Your apps"** bölümünden **"Add app" > Web (</>)** simgesine tıklayıp
   bir isim verin. Size bir `firebaseConfig` nesnesi gösterecek, örneğin:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "proje-adi.firebaseapp.com",
     projectId: "proje-adi",
     storageBucket: "proje-adi.appspot.com",
     messagingSenderId: "...",
     appId: "...",
   };
   ```
4. Bu nesneyi bana (veya doğrudan [js/sync.js](js/sync.js) dosyasındaki
   `FIREBASE_CONFIG` satırına) iletin, `null` yerine bu değerleri yazıp
   yayına alalım.

Kurulumdan sonra Ayarlar ekranında **"Yeni Paylaşımlı Alan Oluştur"**'a
basan ilk cihaz bir kod alır (ör. `AB3XQZ9K`); bu kodu diğer telefon(lar)da
**"Kodla Bağlan"** alanına girmeniz yeterli. Bağlı cihazlar birbirini
otomatik görür. Not: silinen daireler ve JSON yedekleri hâlâ cihaza özeldir
(sadece bina/daire/okuma verileri paylaşılır); "Tüm Verileri Sil" bir
paylaşımlı alandayken sadece o cihazı sıfırlar, diğer cihazlardaki paylaşılan
veriyi etkilemez.

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

- Senkronizasyon kurulmadığı sürece veriler yalnızca kullanılan
  cihaz+tarayıcıda saklanır (localStorage).
- Senkronizasyon açıkken, aynı dairenin okumasını iki cihazdan TAM AYNI ANDA
  değiştirirseniz son kaydeden kazanır (basit "son yazan kazanır" mantığı).
  Farklı daireler/binalar üzerinde aynı anda çalışmak güvenlidir.
- Fotoğraf kanıtı henüz yok (v1 kapsamı dışında bırakıldı, veri boyutu
  büyümesin diye); gerekirse ikinci sürümde eklenebilir.

## Sonraki adım fikirleri

- Odaklı tam ekran okuma modu (o anki daireyi büyük gösterip kaydırarak
  sıradakine geçen bir mod, liste içi form yerine).
- QR/barkod ile daire eşleştirme (sayaçta barkod varsa, doğru daireyi
  otomatik bulur).
- Fotoğraf kanıtı (itiraz durumunda gösterilebilecek sayaç fotoğrafı).
- İstatistik özeti ve bina etiketleme (ör. "bu ay bitti", "sorunlu").

// bildirim_pwa/sw.js
// ---------------------------------------------------------------------
// Startkey Zeta — bildirim mini-PWA'sının Service Worker'ı.
// AYRI bir origin'de barındırılır — GitHub Pages üzerinde
// https://blumel35.github.io/zeta-bildirim/ altında (bkz. index.html) —
// çünkü Streamlit Community Cloud'un statik dosyaları "text/plain"
// olarak sunması ve /app/static/ yolunun kendi platform arayüzüne
// düşmesi yüzünden ana Karma App origin'inde (startkey-zeta.streamlit.app)
// GÜVENİLİR şekilde register edilemiyordu (bkz. faz1_teknik_karar_ve_
// mimari.md). Bu dosya "/zeta-bildirim/sw.js" adresinde durur, varsayılan
// kapsamı (scope) o dizindir ("/zeta-bildirim/") — sayfanın kendisiyle
// aynı, kapsam belirsizliği yok.
//
// push/showNotification mantığı static/sw.js'ten (Karma App) DEĞİŞMEDEN
// taşındı.
//
// notificationclick (DÜZELTİLDİ — bağımsız incelemenin 3. maddesi):
// v1'de burada, hedef Karma App URL'si FARKLI origin olduğu için
// clients.openWindow()'ın cross-origin URL'leri "güvenilir açmadığı"
// varsayımıyla, önce bu mini-PWA'nın kendi "yönlendirme" sayfasını
// açan bir workaround vardı. Bağımsız inceleme bunu W3C Service Worker
// spesifikasyonunun openWindow() algoritmasına dayanarak düzeltti:
// algoritma, hedef origin ne olursa olsun yeni bir üst-seviye tarama
// bağlamı oluşturup DOĞRUDAN o URL'ye navigasyon yapıyor; storage key/
// origin karşılaştırması yalnızca söz'ün (promise) NE İLE çözüleceğini
// (WindowClient nesnesi mi, null mü) belirliyor — navigasyonun kendisini
// DEĞİL. Biz zaten dönüş değerini kullanmıyoruz (yeni bir client'ı
// odaklamamız gerekmiyor, sadece açılmasını istiyoruz), o yüzden
// doğrudan Karma App URL'sini veriyoruz. Bu hem daha basit hem de
// v1'deki ara sayfanın taşıdığı "denetimsiz hedef URL" (açık
// yönlendirme) riskini ortadan kaldırıyor.

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var veri = {};
  try {
    veri = event.data ? event.data.json() : {};
  } catch (e) {
    veri = { title: 'Startkey Zeta', body: event.data ? event.data.text() : '' };
  }

  var baslik = veri.title || 'Startkey Zeta';
  var secenekler = {
    body: veri.body || '',
    // GitHub Pages'te bu proje bir alt yolda barındırılıyor
    // (https://<kullanici>.github.io/zeta-bildirim/) — kök-göreli
    // ("/icons/...") DEĞİL, bu SW'nin kendi konumuna göreli yol
    // kullanıyoruz, aksi halde ikon 404 olur.
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    // YENİ (26.09.2026, Meltem: "titreşimi güçlendirelim, görsel tasarımı
    // zenginleştirelim"): büyük logo görseli eklendi (Android'de bildirim
    // genişletildiğinde metnin altında büyük bir Startkey Zeta logosu
    // gösteriyor — bildirimin "kimden geldiği" tek bakışta belli oluyor).
    // Ayrı bir banner görseli hazırlamadığımız için mevcut 512px logo
    // kullanıldı; ileride özel bir banner tasarlanırsa burada değişir.
    image: 'icons/icon-512.png',
    // Bildirime dokunmadan da doğrudan aksiyon alınabilsin diye bir
    // kısayol butonu eklendi. notificationclick aşağıda action'a
    // bakmaksızın aynı hedefe gidiyor, bu yüzden ek bir dallanmaya
    // gerek yok — buton da gövdeye dokunmak da aynı sonucu veriyor.
    actions: [
      { action: 'ac', title: 'Panoyu Aç' },
    ],
    // GÜÇLENDİRİLDİ (26.09.2026, Meltem: "titreşimi güçlendirelim") —
    // önceki patern (200-100-200-100-400) yerine daha uzun ve daha
    // belirgin bir patern: iki güçlü vuruş + uzun bir kapanış titreşimi.
    // Android'de ses telefonun KENDİ bildirim kanalı ayarına bağlı (biz
    // kod tarafından özel bir ses dosyası çalamıyoruz, bu web push'un
    // platform sınırı — telefonun Ayarlar > Uygulamalar > Chrome >
    // Bildirimler bölümünden kendi sesini seçebilirsin), ama titreşim
    // JS'ten ayarlanabiliyor ve sessiz modda bile hissediliyor.
    vibrate: [400, 150, 400, 150, 400, 150, 700],
    // requireInteraction: true → bildirim birkaç saniye sonra kendiliğinden
    // kaybolmuyor, kullanıcı elle kapatana/dokunana kadar ekranda kalıyor.
    // "Takip kolaylığı" hedefine (kaçırmamak) bunun sessiz titreşimden
    // daha çok katkısı olur.
    requireInteraction: true,
    // veri.url Karma App'in MUTLAK adresi olmalı
    // (örn. "https://startkey-zeta.streamlit.app/Danisman_Secim") —
    // bkz. push_bildirim_ADAY.py, bildirim_gonder().
    data: { url: veri.url || 'https://startkey-zeta.streamlit.app/Danisman_Secim' },
  };

  event.waitUntil(self.registration.showNotification(baslik, secenekler));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var hedefUrl = (event.notification.data && event.notification.data.url) || 'https://startkey-zeta.streamlit.app/';

  // Gövdeye dokunmak VEYA "Panoyu Aç" butonuna dokunmak aynı hedefe
  // gidiyor (event.action kontrol edilmiyor bilerek) — tek bir aksiyon
  // olduğu için ayrı bir dallanmaya gerek yok.
  // Cross-origin (Karma App) URL'sini doğrudan açıyoruz — bkz. yukarıdaki
  // dosya başı not. Ara "yönlendirme sayfası" YOK artık.
  event.waitUntil(self.clients.openWindow(hedefUrl));
});

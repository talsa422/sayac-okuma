// ============================================================
// Cihazlar arası senkronizasyon (opsiyonel).
//
// Bu dosya KAPALIYKEN (FIREBASE_CONFIG = null iken) hiçbir şey yapmaz;
// uygulama tamamen bugünkü gibi, tek cihazda ve localStorage üzerinde
// çalışmaya devam eder. Birden fazla telefon/kişi aynı bina listesini
// görsün istiyorsanız, aşağıdaki adımları izleyin:
//
//   1. https://console.firebase.google.com adresine gidin, ücretsiz bir
//      hesapla (Google hesabınız) yeni bir proje oluşturun.
//   2. Sol menüden "Build > Firestore Database" açın, "Create database"
//      ile bir veritabanı oluşturun (test modu yeterli).
//   3. Proje ayarlarından ("Project settings") "Add app > Web" ile bir
//      web uygulaması ekleyin; size bir "firebaseConfig" nesnesi verecek.
//   4. O nesneyi aşağıdaki FIREBASE_CONFIG değişkenine kopyalayın.
//
// Bu değerler (apiKey vb.) "gizli anahtar" değildir; istemci tarafı
// uygulamalarda herkese açık şekilde kullanılır, gerçek erişim kontrolü
// Firestore güvenlik kurallarıyla sağlanır. Verileriniz (bina/daire/okuma)
// hiç kimseye bu kod olmadan görünmez; kod tahmin edilemeyecek kadar
// uzun/rastgeledir.
// ============================================================

const FIREBASE_CONFIG = null;
// Örnek:
// const FIREBASE_CONFIG = {
//   apiKey: "AIza...",
//   authDomain: "proje-adi.firebaseapp.com",
//   projectId: "proje-adi",
//   storageBucket: "proje-adi.appspot.com",
//   messagingSenderId: "...",
//   appId: "...",
// };

const WORKSPACE_CODE_KEY = 'sayacDB_workspaceCode';

let firestoreDb = null;
let unsubscribeBuildings = null;

function isFirebaseConfigured() {
  return !!FIREBASE_CONFIG && typeof firebase !== 'undefined';
}

function getWorkspaceCode() {
  return localStorage.getItem(WORKSPACE_CODE_KEY) || '';
}

function setWorkspaceCode(code) {
  if (code) localStorage.setItem(WORKSPACE_CODE_KEY, code);
  else localStorage.removeItem(WORKSPACE_CODE_KEY);
}

/** Kolay okunur/yazılır bir kod üretir (0/O, 1/I gibi karışabilecek karakterler hariç). */
function randomWorkspaceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function ensureFirestore() {
  if (!isFirebaseConfigured()) return null;
  if (!firestoreDb) {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    firestoreDb = firebase.firestore();
    try {
      firestoreDb.enablePersistence({ synchronizeTabs: true }).catch(() => {
        // Birden fazla sekme açıksa veya tarayıcı desteklemiyorsa sessizce
        // çevrimiçi modda devam eder; işlevsellik bozulmaz, sadece
        // çevrimdışı önbellek kapasitesi azalır.
      });
    } catch (e) { /* eski tarayıcılarda enablePersistence olmayabilir */ }
  }
  return firestoreDb;
}

function buildingsCollectionRef(fdb, code) {
  return fdb.collection('workspaces').doc(code).collection('buildings');
}

/**
 * Sayfa açılışında, daha önce bir paylaşım koduna bağlanılmışsa dinlemeyi
 * otomatik başlatır. onBuildingsChanged(buildingsArray) her güncellemede,
 * onStatusChanged({connected, code, error}) durum değiştiğinde çağrılır.
 */
function startSyncIfConfigured(onBuildingsChanged, onStatusChanged) {
  const code = getWorkspaceCode();
  if (!code) { onStatusChanged({ connected: false }); return; }
  const fdb = ensureFirestore();
  if (!fdb) { onStatusChanged({ connected: false, error: 'Firebase yapılandırılmamış' }); return; }
  attachListener(fdb, code, onBuildingsChanged);
  onStatusChanged({ connected: true, code });
}

function attachListener(fdb, code, onBuildingsChanged) {
  if (unsubscribeBuildings) unsubscribeBuildings();
  unsubscribeBuildings = buildingsCollectionRef(fdb, code).onSnapshot(
    snap => {
      const buildings = [];
      snap.forEach(doc => buildings.push({ id: doc.id, ...doc.data() }));
      onBuildingsChanged(buildings);
    },
    err => console.error('Senkronizasyon dinleme hatası', err)
  );
}

/** O binanın güncel halini buluta yazar (senkronizasyon açık değilse sessizce hiçbir şey yapmaz). */
function pushBuildingToCloud(building) {
  const code = getWorkspaceCode();
  const fdb = ensureFirestore();
  if (!code || !fdb) return;
  const { id, ...data } = building;
  buildingsCollectionRef(fdb, code).doc(id).set(data)
    .catch(err => console.error('Bulut yazma hatası', err));
}

/** Yeni bir paylaşımlı alan oluşturur ve mevcut yerel bina listesini oraya yükler. */
async function createWorkspaceFromLocal(buildings) {
  const fdb = ensureFirestore();
  if (!fdb) throw new Error('Senkronizasyon henüz kurulmadı. js/sync.js içindeki FIREBASE_CONFIG değerini doldurmanız gerekiyor.');
  const code = randomWorkspaceCode();
  const col = buildingsCollectionRef(fdb, code);
  const batch = fdb.batch();
  buildings.forEach(b => {
    const { id, ...data } = b;
    batch.set(col.doc(id), data);
  });
  await batch.commit();
  setWorkspaceCode(code);
  return code;
}

/** Var olan bir paylaşım koduna katılır; buluttaki bina listesini indirir. */
async function joinWorkspace(code) {
  const fdb = ensureFirestore();
  if (!fdb) throw new Error('Senkronizasyon henüz kurulmadı. js/sync.js içindeki FIREBASE_CONFIG değerini doldurmanız gerekiyor.');
  const snap = await buildingsCollectionRef(fdb, code).get();
  const buildings = [];
  snap.forEach(doc => buildings.push({ id: doc.id, ...doc.data() }));
  setWorkspaceCode(code);
  return buildings;
}

function disconnectSync() {
  if (unsubscribeBuildings) { unsubscribeBuildings(); unsubscribeBuildings = null; }
  setWorkspaceCode('');
}

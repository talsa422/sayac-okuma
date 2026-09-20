// ============================================================
// Sayaç Okuma - basit, çevrimdışı çalışan bina/daire okuma uygulaması
// Tüm veriler tarayıcının localStorage'ında saklanır (sunucu yok).
// ============================================================

const STORAGE_KEY = 'sayacDB_v1';

/** @typedef {{id:string,no:string,serial:string,previousReading:number|null,previousDate:string|null,currentReading:number|null,currentDate:string|null,note:string}} Apartment */
/** @typedef {{id:string,name:string,apartments:Apartment[]}} Building */

let db = loadDB();
let currentBuildingId = null;
let openApartmentId = null; // hangi dairenin okuma formu açık

// ---------- Depolama ----------

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('DB okunamadı', e);
  }
  return { buildings: [], settings: {} };
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Yardımcılar ----------

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Türkçe girişte hem "," hem "." ondalık ayıracını kabul eder. */
function parseNum(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim().replace(/\./g, '').replace(',', '.'); // 1.234,5 -> 1234.5
  // Eğer kullanıcı doğrudan nokta ile ondalık yazdıysa (örn. 120.5) yukarıdaki
  // "binlik nokta" varsayımı yanlış sonuç verir; bu yüzden basit ve tek nokta/virgül
  // olan yaygın durumu da ayrıca kontrol edip düzeltiyoruz.
  const simple = String(str).trim().replace(',', '.');
  const n1 = parseFloat(s);
  const n2 = parseFloat(simple);
  if (!isNaN(n2) && (String(str).match(/[.,]/g) || []).length <= 1) return n2;
  return isNaN(n1) ? (isNaN(n2) ? null : n2) : n1;
}

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => (t.hidden = true), 2200);
}

function getBuilding(id) {
  return db.buildings.find(b => b.id === id) || null;
}

function apartmentDone(a) {
  return a.currentReading !== null && a.currentReading !== undefined;
}

function buildingProgress(b) {
  const total = b.apartments.length;
  const done = b.apartments.filter(apartmentDone).length;
  return { total, done };
}

// ---------- Ekran yönetimi ----------

const views = ['home', 'building', 'apartments-edit', 'settings'];
let viewStack = ['home'];

function showView(name) {
  views.forEach(v => {
    document.getElementById('view-' + v).hidden = v !== name;
  });
  document.getElementById('btnBack').hidden = viewStack.length <= 1;
  const titles = {
    home: 'Sayaç Okuma',
    building: currentBuildingId ? (getBuilding(currentBuildingId)?.name || 'Bina') : 'Bina',
    'apartments-edit': 'Daireleri Düzenle',
    settings: 'Ayarlar',
  };
  document.getElementById('pageTitle').textContent = titles[name] || 'Sayaç Okuma';
}

function navigate(name) {
  viewStack.push(name);
  showView(name);
}

function goBack() {
  if (viewStack.length > 1) {
    viewStack.pop();
    showView(viewStack[viewStack.length - 1]);
  }
  if (viewStack[viewStack.length - 1] === 'home') {
    renderBuildingList();
  } else if (viewStack[viewStack.length - 1] === 'building') {
    renderApartmentList();
  }
}

// ---------- ANA EKRAN: Bina listesi ----------

function renderBuildingList(filter = '') {
  const ul = document.getElementById('buildingList');
  ul.innerHTML = '';
  const list = db.buildings
    .filter(b => b.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  if (list.length === 0) {
    ul.innerHTML = '<li class="empty-state">Henüz bina eklenmedi.<br>Aşağıdaki "+ Yeni Bina" düğmesiyle başlayın.</li>';
    return;
  }

  list.forEach(b => {
    const { total, done } = buildingProgress(b);
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="building-row" data-id="${b.id}">
        <div>
          <div class="b-name">${escapeHtml(b.name)}</div>
          <div class="b-progress">${total === 0 ? 'Daire eklenmedi' : `${done} / ${total} okundu`}</div>
        </div>
        <div class="chev">›</div>
      </div>`;
    li.querySelector('.building-row').addEventListener('click', () => openBuilding(b.id));
    ul.appendChild(li);
  });
}

function openBuilding(id) {
  currentBuildingId = id;
  openApartmentId = null;
  navigate('building');
  renderApartmentList();
}

/** Bina detayındayken, ana ekrana dönmeden doğrudan başka bir binaya geçer. */
function switchBuilding(id) {
  if (!id || id === currentBuildingId) return;
  currentBuildingId = id;
  openApartmentId = null;
  showView('building'); // basligi gunceller, yigina yeni girdi eklemez
  renderApartmentList();
}

function populateBuildingSwitcher() {
  const sel = document.getElementById('buildingSwitcher');
  if (!sel) return;
  const sorted = [...db.buildings].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  sel.innerHTML = sorted.map(b => {
    const { total, done } = buildingProgress(b);
    const label = total ? `${b.name} (${done}/${total})` : b.name;
    return `<option value="${b.id}">${escapeHtml(label)}</option>`;
  }).join('');
  sel.value = currentBuildingId;
}

document.getElementById('buildingSwitcher').addEventListener('change', e => {
  switchBuilding(e.target.value);
});

document.getElementById('buildingSearch').addEventListener('input', e => {
  renderBuildingList(e.target.value);
});

document.getElementById('btnAddBuilding').addEventListener('click', () => {
  const name = prompt('Yeni bina adı:');
  if (!name || !name.trim()) return;
  const b = { id: uid(), name: name.trim(), apartments: [] };
  db.buildings.push(b);
  saveDB();
  renderBuildingList();
  openBuilding(b.id);
});

// ---------- BİNA DETAY: Daire listesi ----------

function renderApartmentList() {
  const b = getBuilding(currentBuildingId);
  if (!b) { goBack(); return; }
  populateBuildingSwitcher();
  const { total, done } = buildingProgress(b);
  document.getElementById('buildingProgress').textContent =
    total === 0 ? 'Bu binada daire tanımlı değil.' : `${done} / ${total} okundu`;

  const ul = document.getElementById('apartmentList');
  ul.innerHTML = '';

  const sorted = [...b.apartments].sort((x, y) =>
    x.no.localeCompare(y.no, 'tr', { numeric: true }));

  if (sorted.length === 0) {
    ul.innerHTML = '<li class="empty-state">Bu binaya henüz daire eklenmedi.<br>"Daireleri Düzenle" ile ekleyebilirsiniz.</li>';
    return;
  }

  sorted.forEach(a => {
    const li = document.createElement('li');
    const done_ = apartmentDone(a);
    li.innerHTML = `
      <div class="apt-row">
        <div class="apt-head" data-id="${a.id}">
          <div>
            <span class="a-no">Daire ${escapeHtml(a.no)}</span>
            ${a.serial ? `<div class="apt-meta">Seri: ${escapeHtml(a.serial)}</div>` : ''}
          </div>
          <span class="a-status ${done_ ? 'status-done' : 'status-pending'}">
            ${done_ ? fmtNum(a.currentReading) + ' m³' : 'Okunmadı'}
          </span>
        </div>
        <div class="apt-meta">Önceki: ${a.previousReading !== null ? fmtNum(a.previousReading) + ' m³' : 'kayıt yok'}${a.previousDate ? ' (' + a.previousDate + ')' : ''}</div>
        <div class="apt-edit-slot"></div>
      </div>`;
    li.querySelector('.apt-head').addEventListener('click', () => toggleApartmentEdit(a.id, li));
    ul.appendChild(li);
    if (openApartmentId === a.id) {
      renderApartmentEdit(li, a);
    }
  });
}

function toggleApartmentEdit(id, li) {
  if (openApartmentId === id) {
    openApartmentId = null;
    renderApartmentList();
    return;
  }
  openApartmentId = id;
  renderApartmentList();
  // yeni açılan satırı görünür alana kaydır
  setTimeout(() => {
    const head = document.querySelector(`.apt-head[data-id="${id}"]`);
    if (head) head.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = document.getElementById('inp-current-' + id);
    if (input) input.focus();
  }, 50);
}

function renderApartmentEdit(li, a) {
  const slot = li.querySelector('.apt-edit-slot');
  const b = getBuilding(currentBuildingId);
  slot.innerHTML = `
    <div class="apt-edit">
      <div class="row">
        <label>Yeni okuma</label>
        <input id="inp-current-${a.id}" type="text" inputmode="decimal"
               value="${a.currentReading !== null ? String(a.currentReading).replace('.', ',') : ''}"
               placeholder="m³">
      </div>
      <div id="diffline-${a.id}"></div>
      <div class="row">
        <label>Not (ops.)</label>
        <input id="inp-note-${a.id}" type="text" value="${escapeHtml(a.note || '')}" placeholder="ör. sayaç değişti">
      </div>
      <div class="btn-row">
        <button class="btn-primary" id="btn-save-${a.id}">Kaydet ve Sonrakine Geç</button>
        <button class="btn-secondary" id="btn-savestay-${a.id}">Kaydet</button>
      </div>
      <div class="btn-row">
        <button class="btn-danger" id="btn-delete-${a.id}">Bu Daireyi Sil</button>
      </div>
    </div>`;

  slot.querySelector(`#btn-delete-${a.id}`).addEventListener('click', () => {
    const warn = apartmentDone(a)
      ? `Daire ${a.no} silinsin mi? Bu dairenin kayıtlı okuması da silinecek. Bu işlem geri alınamaz.`
      : `Daire ${a.no} silinsin mi? Bu işlem geri alınamaz.`;
    if (!confirm(warn)) return;
    b.apartments = b.apartments.filter(x => x.id !== a.id);
    openApartmentId = null;
    saveDB();
    renderApartmentList();
    toast('Daire ' + a.no + ' silindi');
  });

  const input = slot.querySelector(`#inp-current-${a.id}`);
  const updateDiff = () => {
    const val = parseNum(input.value);
    const diffDiv = slot.querySelector(`#diffline-${a.id}`);
    if (val === null) { diffDiv.innerHTML = ''; return; }
    if (a.previousReading === null || a.previousReading === undefined) {
      diffDiv.innerHTML = `<div class="diff-line diff-ok">İlk okuma olarak kaydedilecek: ${fmtNum(val)} m³</div>`;
      return;
    }
    const diff = val - a.previousReading;
    const sign = diff >= 0 ? '+' : '';
    diffDiv.innerHTML = `<div class="diff-line diff-ok">Fark: ${sign}${fmtNum(diff)} m³</div>`;
  };
  input.addEventListener('input', updateDiff);
  updateDiff();

  const save = (goNext) => {
    const val = parseNum(input.value);
    if (val === null) { toast('Geçerli bir sayı girin'); return; }
    a.currentReading = val;
    a.currentDate = todayISO();
    a.note = slot.querySelector(`#inp-note-${a.id}`).value.trim();
    saveDB();
    toast('Kaydedildi: Daire ' + a.no);

    if (goNext) {
      const sorted = [...b.apartments].sort((x, y) => x.no.localeCompare(y.no, 'tr', { numeric: true }));
      const idx = sorted.findIndex(x => x.id === a.id);
      const next = sorted.slice(idx + 1).find(x => !apartmentDone(x));
      openApartmentId = next ? next.id : null;
    } else {
      openApartmentId = null;
    }
    renderApartmentList();
    if (goNext && openApartmentId) {
      setTimeout(() => {
        const head = document.querySelector(`.apt-head[data-id="${openApartmentId}"]`);
        if (head) head.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inp = document.getElementById('inp-current-' + openApartmentId);
        if (inp) inp.focus();
      }, 50);
    }
  };

  slot.querySelector(`#btn-save-${a.id}`).addEventListener('click', () => save(true));
  slot.querySelector(`#btn-savestay-${a.id}`).addEventListener('click', () => save(false));
}

// ---------- Dönemi kapat ----------

document.getElementById('btnClosePeriod').addEventListener('click', () => {
  const b = getBuilding(currentBuildingId);
  if (!b) return;
  const { total, done } = buildingProgress(b);
  if (done === 0) { toast('Kapatılacak okuma yok'); return; }
  if (done < total) {
    if (!confirm(`${total - done} daire henüz okunmadı. Yine de dönemi kapatmak istiyor musunuz? (Okunmamış daireler önceki değerleriyle kalır)`)) return;
  } else {
    if (!confirm('Bu dönemi kapatıp yeni bir okuma dönemine geçmek istiyor musunuz? Mevcut okumalar "önceki okuma" olarak saklanacak.')) return;
  }
  b.apartments.forEach(a => {
    if (apartmentDone(a)) {
      a.previousReading = a.currentReading;
      a.previousDate = a.currentDate;
      a.currentReading = null;
      a.currentDate = null;
    }
  });
  saveDB();
  renderApartmentList();
  toast('Dönem kapatıldı');
});

// ---------- CSV dışa aktarım (Türkçe Excel uyumlu: ; ayraç, , ondalık, UTF-8 BOM) ----------

document.getElementById('btnExportCsv').addEventListener('click', () => {
  const b = getBuilding(currentBuildingId);
  if (!b) return;
  const rows = [['Daire No', 'Sayaç Seri No', 'Önceki Okuma', 'Önceki Tarih', 'Yeni Okuma', 'Yeni Tarih', 'Fark', 'Not']];
  const sorted = [...b.apartments].sort((x, y) => x.no.localeCompare(y.no, 'tr', { numeric: true }));
  sorted.forEach(a => {
    const diff = (a.currentReading !== null && a.previousReading !== null)
      ? (a.currentReading - a.previousReading) : '';
    rows.push([
      a.no,
      a.serial || '',
      a.previousReading !== null ? csvNum(a.previousReading) : '',
      a.previousDate || '',
      a.currentReading !== null ? csvNum(a.currentReading) : '',
      a.currentDate || '',
      diff !== '' ? csvNum(diff) : '',
      a.note || '',
    ]);
  });
  const csv = rows.map(r => r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = b.name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  link.download = `${safeName}_${todayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

function csvNum(n) {
  return String(n).replace('.', ',');
}
function csvCell(v) {
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ---------- Daireleri düzenle (toplu metin / CSV içe aktarım) ----------

document.getElementById('btnManageApartments').addEventListener('click', () => {
  const b = getBuilding(currentBuildingId);
  if (!b) return;
  const sorted = [...b.apartments].sort((x, y) => x.no.localeCompare(y.no, 'tr', { numeric: true }));
  const text = sorted.map(a => [a.no, a.serial || '', a.previousReading !== null ? csvNum(a.previousReading) : ''].join('; ')).join('\n');
  document.getElementById('apartmentsBulkText').value = text;

  // "Başka binadan kopyala" seçeneğini doldur (bu bina hariç, en az bir dairesi olanlar)
  const select = document.getElementById('copyFromSelect');
  select.innerHTML = '<option value="">-- bina seçin --</option>';
  db.buildings
    .filter(x => x.id !== b.id && x.apartments.length > 0)
    .sort((x, y) => x.name.localeCompare(y.name, 'tr'))
    .forEach(x => {
      const opt = document.createElement('option');
      opt.value = x.id;
      opt.textContent = `${x.name} (${x.apartments.length} daire)`;
      select.appendChild(opt);
    });

  navigate('apartments-edit');
});

/** Var olan metne yeni satırları ekler (bos satirlari atlar, sona ekler). */
function appendToApartmentsText(lines) {
  const ta = document.getElementById('apartmentsBulkText');
  const existing = ta.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  ta.value = existing.concat(lines).join('\n');
}

document.getElementById('btnGenerate').addEventListener('click', () => {
  const start = parseInt(document.getElementById('genStart').value, 10);
  const end = parseInt(document.getElementById('genEnd').value, 10);
  const prefix = document.getElementById('genPrefix').value.trim();
  if (isNaN(start) || isNaN(end)) { toast('Başlangıç ve bitiş numarası girin'); return; }
  if (end < start) { toast('Bitiş, başlangıçtan küçük olamaz'); return; }
  if (end - start > 2000) { toast('Aralık çok geniş, kontrol edin'); return; }
  const lines = [];
  for (let i = start; i <= end; i++) lines.push(`${prefix}${i}`);
  appendToApartmentsText(lines);
  toast(`${lines.length} daire numarası eklendi`);
});

document.getElementById('btnCopyFrom').addEventListener('click', () => {
  const srcId = document.getElementById('copyFromSelect').value;
  if (!srcId) { toast('Kopyalanacak binayı seçin'); return; }
  const src = getBuilding(srcId);
  if (!src) return;
  const sorted = [...src.apartments].sort((x, y) => x.no.localeCompare(y.no, 'tr', { numeric: true }));
  const lines = sorted.map(a => a.no); // sadece daire numaraları kopyalanır (seri no/okuma o binaya özeldir)
  appendToApartmentsText(lines);
  toast(`${lines.length} daire numarası "${src.name}" binasından kopyalandı`);
});

document.getElementById('btnSaveApartments').addEventListener('click', () => {
  const b = getBuilding(currentBuildingId);
  if (!b) return;
  const text = document.getElementById('apartmentsBulkText').value;
  applyBulkApartments(b, text);
  saveDB();
  goBack();
  renderApartmentList();
  toast('Daire listesi güncellendi');
});

function applyBulkApartments(b, text) {
  const existingByNo = new Map(b.apartments.map(a => [a.no, a]));
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const newList = [];
  lines.forEach(line => {
    const parts = line.split(';').map(p => p.trim());
    const no = parts[0];
    if (!no) return;
    const serial = parts[1] || '';
    const prevRaw = parts[2] || '';
    const prev = prevRaw === '' ? null : parseNum(prevRaw);
    const existing = existingByNo.get(no);
    if (existing) {
      existing.serial = serial || existing.serial;
      if (prevRaw !== '') existing.previousReading = prev;
      newList.push(existing);
      existingByNo.delete(no);
    } else {
      newList.push({
        id: uid(), no, serial,
        previousReading: prev, previousDate: prev !== null ? todayISO() : null,
        currentReading: null, currentDate: null, note: '',
      });
    }
  });
  b.apartments = newList;
}

document.getElementById('btnImportCsvFile').addEventListener('click', () => {
  document.getElementById('csvFileInput').click();
});
document.getElementById('csvFileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  // basit CSV -> "no; seri; önceki" formatına çevir (virgül veya noktalı virgülü destekler)
  const converted = text.split(/\r?\n/).filter(Boolean).map(line => {
    const sep = line.includes(';') ? ';' : ',';
    return line.split(sep).map(s => s.trim()).join('; ');
  }).join('\n');
  document.getElementById('apartmentsBulkText').value = converted;
  toast('CSV içeri aktarıldı, kontrol edip Kaydet\'e basın');
  e.target.value = '';
});

// ---------- Ayarlar ----------

document.getElementById('btnSettings').addEventListener('click', () => {
  navigate('settings');
});

document.getElementById('btnBackup').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sayac_yedek_${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btnRestore').addEventListener('click', () => {
  document.getElementById('restoreFileInput').click();
});
document.getElementById('restoreFileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.buildings) throw new Error('Geçersiz yedek dosyası');
    if (!confirm('Mevcut tüm veriler bu yedekle değiştirilecek. Emin misiniz?')) return;
    db = parsed;
    db.settings = db.settings || {};
    saveDB();
    toast('Yedek geri yüklendi');
    renderBuildingList();
  } catch (err) {
    alert('Yedek dosyası okunamadı: ' + err.message);
  }
  e.target.value = '';
});

document.getElementById('btnWipe').addEventListener('click', () => {
  if (!confirm('TÜM binalar ve okumalar silinecek. Bu işlem geri alınamaz. Devam edilsin mi?')) return;
  if (!confirm('Son kez soruyoruz: gerçekten tüm veriler silinsin mi?')) return;
  db = { buildings: [], settings: {} };
  saveDB();
  toast('Tüm veriler silindi');
  goHome();
});

// ---------- Navigasyon ----------

document.getElementById('btnBack').addEventListener('click', goBack);

function goHome() {
  viewStack = ['home'];
  currentBuildingId = null;
  openApartmentId = null;
  showView('home');
  renderBuildingList();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Başlangıç ----------

renderBuildingList();
showView('home');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

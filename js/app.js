// ============================================================
// Sayaç Okuma - basit, çevrimdışı çalışan bina/daire okuma uygulaması
// Tüm veriler tarayıcının localStorage'ında saklanır (sunucu yok).
// ============================================================

const STORAGE_KEY = 'sayacDB_v1';
const WIPE_BACKUP_KEY = 'sayacDB_v1_lastWipeBackup';
const BACKUP_REMINDER_DAYS = 7;

/** @typedef {{id:string,no:string,serial:string,previousReading:number|null,previousDate:string|null,currentReading:number|null,currentDate:string|null,note:string}} Apartment */
/** @typedef {{id:string,name:string,apartments:Apartment[]}} Building */

let db = loadDB();
let currentBuildingId = null;
let openApartmentId = null; // hangi dairenin okuma formu açık

// ---------- Depolama ----------

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.settings = parsed.settings || {};
      parsed.trash = parsed.trash || [];
      return parsed;
    }
  } catch (e) {
    console.error('DB okunamadı', e);
  }
  return { buildings: [], settings: {}, trash: [] };
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

/** actionLabel/actionFn verilirse toast'a bir eylem düğmesi (ör. "Geri Al") eklenir. */
function toast(msg, actionLabel, actionFn) {
  const t = document.getElementById('toast');
  t.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  if (actionLabel && actionFn) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      clearTimeout(toast._h);
      t.hidden = true;
      actionFn();
    });
    t.appendChild(btn);
  }
  t.hidden = false;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => (t.hidden = true), actionLabel ? 6000 : 2200);
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

// ---------- Silinenler / Geri Al ----------

/** Silinen bir daireyi, geri getirilebilmesi için "silinenler" listesine ekler. */
function addToTrash(building, apartment) {
  db.trash = db.trash || [];
  db.trash.unshift({
    id: uid(),
    buildingId: building.id,
    buildingName: building.name,
    apartment: JSON.parse(JSON.stringify(apartment)),
    deletedAt: new Date().toISOString(),
  });
  if (db.trash.length > 30) db.trash.length = 30;
}

function restoreApartmentFromTrash(trashId) {
  const entry = (db.trash || []).find(t => t.id === trashId);
  if (!entry) { toast('Bu daire artık geri getirilemiyor'); return; }
  const building = getBuilding(entry.buildingId);
  if (!building) { toast('Bina bulunamadı, geri getirilemedi'); return; }
  const restored = { ...entry.apartment, id: uid() };
  building.apartments.push(restored);
  db.trash = db.trash.filter(t => t.id !== trashId);
  saveDB();
  if (currentBuildingId === building.id) renderApartmentList();
  toast('Daire ' + restored.no + ' geri getirildi (' + building.name + ')');
}

function renderTrashList() {
  const container = document.getElementById('trashList');
  if (!container) return;
  const trash = db.trash || [];
  if (trash.length === 0) {
    container.innerHTML = '<p class="hint">Silinen daire yok.</p>';
    return;
  }
  container.innerHTML = trash.slice(0, 15).map(t => `
    <div class="trash-row">
      <div>
        <div class="trash-title">Daire ${escapeHtml(t.apartment.no)} — ${escapeHtml(t.buildingName)}</div>
        <div class="apt-meta">${new Date(t.deletedAt).toLocaleString('tr-TR')}</div>
      </div>
      <button type="button" class="btn-secondary btn-restore-trash" data-id="${t.id}">Geri Getir</button>
    </div>
  `).join('');
  container.querySelectorAll('.btn-restore-trash').forEach(btn => {
    btn.addEventListener('click', () => {
      restoreApartmentFromTrash(btn.dataset.id);
      renderTrashList();
    });
  });
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

document.getElementById('buildingNote').addEventListener('change', e => {
  const b = getBuilding(currentBuildingId);
  if (!b) return;
  b.note = e.target.value.trim();
  saveDB();
});

document.getElementById('buildingSearch').addEventListener('input', e => {
  renderBuildingList(e.target.value);
});

document.getElementById('btnAddBuilding').addEventListener('click', () => {
  const name = prompt('Yeni bina adı:');
  if (!name || !name.trim()) return;
  const b = { id: uid(), name: name.trim(), apartments: [], note: '' };
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
  document.getElementById('buildingNote').value = b.note || '';

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

// ---------- Sesli giriş ----------

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

/** Mikrofon düğmesini, tarayıcı destekliyorsa aktif eder; desteklemiyorsa (ör. iOS Safari) gizli kalır. */
function setupMicButton(micBtn, input) {
  if (!micBtn || !input) return;
  if (!SpeechRecognitionCtor) {
    micBtn.remove();
    return;
  }
  micBtn.hidden = false;
  let recognizing = false;
  let recognizer = null;

  micBtn.addEventListener('click', () => {
    if (recognizing) { recognizer && recognizer.stop(); return; }
    try {
      recognizer = new SpeechRecognitionCtor();
    } catch (e) {
      toast('Sesli giriş bu cihazda başlatılamadı');
      return;
    }
    recognizer.lang = 'tr-TR';
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    recognizer.onstart = () => {
      recognizing = true;
      micBtn.classList.add('listening');
    };
    recognizer.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript || '';
      const digits = (transcript.match(/[\d.,]+/g) || []).join('');
      input.value = digits || transcript;
      input.dispatchEvent(new Event('input'));
      input.focus();
      toast('Duyulan: "' + transcript + '"');
    };
    recognizer.onerror = () => {
      toast('Ses tanınamadı, tekrar deneyin veya elle yazın');
    };
    recognizer.onend = () => {
      recognizing = false;
      micBtn.classList.remove('listening');
    };
    recognizer.start();
  });
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
        <button type="button" class="mic-btn" id="mic-${a.id}" title="Sesle söyle" hidden>🎤</button>
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
    if (!confirm(`Daire ${a.no} silinsin mi?`)) return;
    b.apartments = b.apartments.filter(x => x.id !== a.id);
    openApartmentId = null;
    addToTrash(b, a);
    const trashId = db.trash[0].id;
    saveDB();
    renderApartmentList();
    toast('Daire ' + a.no + ' silindi', 'Geri Al', () => restoreApartmentFromTrash(trashId));
  });

  // Sesli giriş: sadece tarayıcı destekliyorsa (bugün için çoğunlukla Android/Chrome;
  // iOS Safari bu web API'sini desteklemiyor ama klavyedeki mikrofon tuşuyla zaten dikte edilebiliyor).
  setupMicButton(slot.querySelector(`#mic-${a.id}`), slot.querySelector(`#inp-current-${a.id}`));

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
  setTimeout(maybeShowBackupReminder, 400);
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
  updateBackupStatus();
  renderTrashList();
  updateWipeRestoreVisibility();
  navigate('settings');
});

function downloadBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sayac_yedek_${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  db.settings.lastBackupAt = new Date().toISOString();
  saveDB();
  updateBackupStatus();
}

document.getElementById('btnBackup').addEventListener('click', downloadBackup);

function updateBackupStatus() {
  const el = document.getElementById('lastBackupInfo');
  if (!el) return;
  const last = db.settings.lastBackupAt;
  el.textContent = last
    ? `Son yedek: ${new Date(last).toLocaleString('tr-TR')}`
    : 'Henüz yedek alınmadı.';
}

/** Belirli günden uzun süredir yedek alınmamışsa, kullanıcıya nazikçe hatırlatır (günde en fazla bir kez). */
function daysSince(isoDateStr) {
  if (!isoDateStr) return Infinity;
  return (Date.now() - new Date(isoDateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function maybeShowBackupReminder() {
  if (db.buildings.length === 0) return;
  if (daysSince(db.settings.lastBackupAt) < BACKUP_REMINDER_DAYS) return;
  if (daysSince(db.settings.lastBackupPromptAt) < 1) return;
  db.settings.lastBackupPromptAt = new Date().toISOString();
  saveDB();
  const last = db.settings.lastBackupAt;
  const msg = last
    ? `Son yedeğiniz ${Math.floor(daysSince(last))} gün önce alınmış. Şimdi yedek almak ister misiniz?`
    : 'Henüz hiç yedek almadınız. Verilerinizi kaybetmemek için şimdi yedek almak ister misiniz?';
  if (confirm(msg)) downloadBackup();
}

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
    db.trash = db.trash || [];
    saveDB();
    toast('Yedek geri yüklendi');
    renderBuildingList();
    updateBackupStatus();
    renderTrashList();
  } catch (err) {
    alert('Yedek dosyası okunamadı: ' + err.message);
  }
  e.target.value = '';
});

function updateWipeRestoreVisibility() {
  const row = document.getElementById('wipeRestoreRow');
  if (!row) return;
  row.hidden = !localStorage.getItem(WIPE_BACKUP_KEY);
}

document.getElementById('btnRestoreWipe').addEventListener('click', () => {
  const raw = localStorage.getItem(WIPE_BACKUP_KEY);
  if (!raw) return;
  if (!confirm('Silinen tüm veriler geri getirilsin mi? Şu anki veriler (varsa) bunun üzerine yazılacak.')) return;
  try {
    db = JSON.parse(raw);
    db.settings = db.settings || {};
    db.trash = db.trash || [];
    saveDB();
    toast('Silinen veriler geri getirildi');
    renderBuildingList();
    updateBackupStatus();
    renderTrashList();
  } catch (err) {
    alert('Geri getirilemedi: ' + err.message);
  }
});

document.getElementById('btnWipe').addEventListener('click', () => {
  if (!confirm('TÜM binalar ve okumalar silinecek. Bu işlem geri alınamaz. Devam edilsin mi?')) return;
  if (!confirm('Son kez soruyoruz: gerçekten tüm veriler silinsin mi?')) return;
  try { localStorage.setItem(WIPE_BACKUP_KEY, JSON.stringify(db)); } catch (e) { /* yer yoksa sessizce geç */ }
  db = { buildings: [], settings: {}, trash: [] };
  saveDB();
  toast('Tüm veriler silindi');
  updateWipeRestoreVisibility();
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
setTimeout(maybeShowBackupReminder, 800);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

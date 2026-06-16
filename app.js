const API = window.API_URL || "https://spk-supplier-backend-production.up.railway.app/api";
let _kriteria = [];

function formatRupiah(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}

const KRITERIA_RUPIAH = ["C4", "C5"];

function isRupiah(kriteria) {
  return KRITERIA_RUPIAH.includes(kriteria.kode_kriteria);
}

function formatNilai(nilai, kriteria) {
  if (nilai === undefined || nilai === null)
    return '<span style="color:var(--text-dim)">—</span>';
  return isRupiah(kriteria) ? formatRupiah(nilai) : nilai;
}

function nowString() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function showSection(name) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`section-${name}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    if (b.getAttribute("onclick")?.includes(name)) b.classList.add("active");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "supplier")    { loadKriteria().then(loadSupplier); }
  if (name === "kriteria")    { loadKriteriaForm(); }
  if (name === "dashboard")   { loadDashboard(); }
}

function setMobileNav(el) {
  document.querySelectorAll(".mnav-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => { t.className = "toast hidden"; }, 3500);
}

async function apiFetch(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const json = await res.json();
    if (!res.ok || json.status === "error")
      throw new Error(json.message || "Terjadi kesalahan server");
    return json.data;
  } catch (e) {
    showToast(e.message, "error");
    throw e;
  }
}

async function loadDashboard() {
  try {
    const [suppliers, kriteria, rekResp] = await Promise.all([
      apiFetch(`${API}/supplier`),
      apiFetch(`${API}/kriteria`),
      apiFetch(`${API}/rekomendasi`).catch(() => null),
    ]);

    document.getElementById("stat-supplier").textContent = suppliers.length;
    document.getElementById("stat-kriteria").textContent = kriteria.filter(k => k.is_aktif).length;
    document.getElementById("last-update").textContent   = "Update: " + nowString();

    const hasil = rekResp?.hasil ?? rekResp ?? [];
    if (Array.isArray(hasil) && hasil.length > 0) {
      const top = hasil[0];
      document.getElementById("stat-terbaik").textContent = top.nama_supplier;
      document.getElementById("stat-skor").textContent    = top.skor_akhir.toFixed(4);
    }

    const tbody = document.getElementById("tbody-kriteria-dash");
    tbody.innerHTML = kriteria.map(k => `
      <tr style="${k.is_aktif ? "" : "opacity:.45"}">
        <td class="mono" style="color:var(--teal);font-weight:600">${k.kode_kriteria}</td>
        <td>${k.nama_kriteria} ${k.is_aktif ? "" : '<span style="font-size:.68rem;color:var(--text-dim)">(nonaktif)</span>'}</td>
        <td><span class="badge-${k.jenis}">${k.jenis}</span></td>
        <td class="mono">${k.bobot}</td>
        <td>
          <div class="score-wrap">
            <div class="score-bar-bg" style="min-width:80px">
              <div class="score-bar-fill" style="width:${k.is_aktif ? (k.bobot * 100).toFixed(0) : 0}%"></div>
            </div>
            <span style="font-size:.78rem;color:var(--text-muted)">${k.is_aktif ? (k.bobot * 100).toFixed(0) + "%" : "—"}</span>
          </div>
        </td>
      </tr>`).join("");

  } catch (_) {}
}

async function loadKriteria() {
  _kriteria = await apiFetch(`${API}/kriteria`);
  return _kriteria;
}

async function loadSupplier() {
  const suppliers = await apiFetch(`${API}/supplier`);
  const k = _kriteria.length ? _kriteria : await loadKriteria();

  const thead = document.getElementById("thead-supplier");
  thead.innerHTML = `<tr>
    <th>#</th>
    <th>Nama Supplier</th>
    <th>Kontak</th>
    <th>Alamat</th>
    ${k.map(kr => `<th title="${kr.nama_kriteria}">
      ${kr.kode_kriteria}<br>
      <span style="font-weight:400;opacity:.6;font-size:.68rem">${kr.nama_kriteria}</span>
    </th>`).join("")}
    <th>Status</th>
    <th>Aksi</th>
  </tr>`;

  const tbody = document.getElementById("tbody-supplier");
  if (!suppliers.length) {
    tbody.innerHTML = `<tr><td colspan="${k.length + 6}" class="empty-state">Belum ada data supplier</td></tr>`;
    return;
  }

  tbody.innerHTML = suppliers.map(s => {
    const nilaiMap = {};
    (s.nilai || []).forEach(n => { nilaiMap[n.kriteria_id] = n.nilai; });

    const lengkap = k.every(kr => nilaiMap[kr.id] !== undefined);

    const nilaiCells = k.map(kr => {
      const v = nilaiMap[kr.id];
      const display = formatNilai(v, kr);
      const style = isRupiah(kr) ? 'style="font-size:.76rem"' : '';
      return `<td class="mono" ${style}>${display}</td>`;
    }).join("");

    const statusBadge = lengkap
      ? `<span class="status-badge ok">✓ Lengkap</span>`
      : `<span class="status-badge warn">⚠ Belum lengkap</span>`;
    const alamat = s.alamat || "—";
    const alamatDisplay = alamat.length > 35
      ? `<span title="${alamat}" style="cursor:default">${alamat.slice(0, 35)}…</span>`
      : alamat;

    return `<tr>
      <td class="mono" style="color:var(--text-muted)">${s.id}</td>
      <td style="font-weight:500">${s.nama_supplier}</td>
      <td style="color:var(--text-muted);font-size:.8rem">${s.kontak || "—"}</td>
      <td style="color:var(--text-muted);font-size:.8rem;max-width:180px">${alamatDisplay}</td>
      ${nilaiCells}
      <td>${statusBadge}</td>
      <td>
        <button class="btn-danger" onclick="deleteSupplier(${s.id}, '${s.nama_supplier}')">Hapus</button>
      </td>
    </tr>`;
  }).join("");
}

async function renderNilaiInputs() {
  const k = _kriteria.length ? _kriteria : await loadKriteria();
  const wrap = document.getElementById("nilai-inputs");
  wrap.innerHTML = k.map(kr => {
    const rupiahHint = isRupiah(kr)
      ? `<span class="input-hint">Masukkan nilai dalam Rupiah penuh. Contoh: 500000</span>`
      : "";
    const satuan = isRupiah(kr) ? " (Rp)" :
                   kr.kode_kriteria === "C2" ? " (%)" :
                   kr.kode_kriteria === "C3" ? " (hari)" : "";
    const placeholder = isRupiah(kr) ? "Contoh: 500000" :
                        kr.kode_kriteria === "C3" ? "Contoh: 45" : "Contoh: 85";
    return `
    <div class="form-group">
      <label>
        <strong>${kr.kode_kriteria}</strong> — ${kr.nama_kriteria}${satuan}
        <span class="badge-${kr.jenis}" style="margin-left:.4rem">${kr.jenis}</span>
      </label>
      <input
        type="number" id="inp-nilai-${kr.id}"
        placeholder="${placeholder}" step="1" min="0"
      />
      ${rupiahHint}
    </div>`;
  }).join("");
}

function toggleForm() {
  const form = document.getElementById("form-supplier");
  const btn  = document.getElementById("toggle-form-btn");
  const isHidden = form.classList.contains("hidden");
  form.classList.toggle("hidden");
  btn.textContent = isHidden ? "✕ Tutup Form" : "+ Buka Form";
  if (isHidden) renderNilaiInputs();
}

async function submitSupplier() {
  const nama = document.getElementById("inp-nama").value.trim();
  if (!nama) { showToast("Nama supplier wajib diisi", "error"); return; }

  const nilai = {};
  let adaKosong = false;
  _kriteria.forEach(kr => {
    const el = document.getElementById(`inp-nilai-${kr.id}`);
    const v  = el?.value?.trim();
    if (!v || isNaN(v) || parseFloat(v) < 0) {
      adaKosong = true;
      el?.classList.add("input-error");
    } else {
      el?.classList.remove("input-error");
      nilai[kr.id] = parseFloat(v);
    }
  });

  if (adaKosong) {
    showToast("Semua nilai kriteria wajib diisi dengan angka positif", "error");
    return;
  }

  const payload = {
    nama_supplier: nama,
    kontak:        document.getElementById("inp-kontak").value.trim(),
    alamat:        document.getElementById("inp-alamat").value.trim(),
    nilai,
  };

  try {
    await apiFetch(`${API}/supplier`, { method: "POST", body: JSON.stringify(payload) });
    showToast(`Supplier "${nama}" berhasil ditambahkan`);
    ["inp-nama","inp-kontak","inp-alamat"].forEach(id => { document.getElementById(id).value = ""; });
    _kriteria.forEach(kr => {
      const el = document.getElementById(`inp-nilai-${kr.id}`);
      if (el) { el.value = ""; el.classList.remove("input-error"); }
    });
    toggleForm();
    loadSupplier();
  } catch (_) {}
}

async function deleteSupplier(id, nama) {
  if (!confirm(`Hapus supplier "${nama}"?\nData nilai terkait juga akan dihapus.`)) return;
  try {
    await apiFetch(`${API}/supplier/${id}`, { method: "DELETE" });
    showToast(`Supplier "${nama}" berhasil dihapus`);
    loadSupplier();
  } catch (_) {}
}

async function loadKriteriaForm() {
  const k = await loadKriteria();
  const wrap = document.getElementById("kriteria-form-wrap");

  const aktif   = k.filter(x => x.is_aktif);
  const nonaktif = k.filter(x => !x.is_aktif);

  wrap.innerHTML = `
    <!-- Form tambah kriteria baru -->
    <div class="kriteria-tambah-wrap" id="form-kriteria-wrap" style="padding:1.25rem;border-bottom:1px solid var(--border-light)">
      <button class="toggle-btn" id="toggle-kriteria-btn" onclick="toggleFormKriteria()">+ Tambah Kriteria Baru</button>
      <div id="form-kriteria-inner" class="hidden" style="margin-top:1rem">
        <div class="form-row">
          <div class="form-group">
            <label>Kode Kriteria <span class="req">*</span></label>
            <input type="text" id="inp-kode" placeholder="Contoh: C6" maxlength="5" style="text-transform:uppercase" />
          </div>
          <div class="form-group">
            <label>Nama Kriteria <span class="req">*</span></label>
            <input type="text" id="inp-nama-kr" placeholder="Contoh: Reputasi Supplier" />
          </div>
          <div class="form-group">
            <label>Jenis <span class="req">*</span></label>
            <select id="inp-jenis" class="bobot-input" style="width:100%;padding:.45rem .6rem">
              <option value="benefit">Benefit</option>
              <option value="cost">Cost</option>
            </select>
          </div>
          <div class="form-group">
            <label>Bobot Awal</label>
            <input type="number" id="inp-bobot-kr" placeholder="0.00" step="0.01" min="0" max="1" value="0" />
          </div>
        </div>
        <div class="form-actions" style="padding-top:0">
          <button class="btn-secondary" onclick="toggleFormKriteria()">Batal</button>
          <button class="btn-primary" onclick="submitKriteria()">Simpan Kriteria</button>
        </div>
      </div>
    </div>

    <!-- Daftar kriteria aktif -->
    <div style="padding:1.25rem 1.25rem 0">
      <p class="form-section-title" style="margin-bottom:.6rem">
        Kriteria Aktif
        <span style="color:var(--text-dim);font-size:.7rem;margin-left:.4rem">(digunakan dalam perhitungan SAW)</span>
      </p>
    </div>
    <div class="kriteria-list" id="kriteria-aktif-list">
      ${aktif.length ? aktif.map(kr => renderKriteriaItem(kr)).join("") : '<p class="loading-text" style="padding:0 1.25rem 1rem">Belum ada kriteria aktif</p>'}
    </div>

    ${nonaktif.length ? `
    <div style="padding:.5rem 1.25rem 0;border-top:1px solid var(--border-light)">
      <p class="form-section-title" style="margin-bottom:.6rem">
        Kriteria Nonaktif
        <span style="color:var(--text-dim);font-size:.7rem;margin-left:.4rem">(tidak masuk perhitungan SAW)</span>
      </p>
    </div>
    <div class="kriteria-list" style="opacity:.6">
      ${nonaktif.map(kr => renderKriteriaItem(kr)).join("")}
    </div>` : ""}
  `;

  updateTotalBobot();
}

function renderKriteriaItem(kr) {
  const nonaktifStyle = kr.is_aktif ? "" : "opacity:.7";
  return `
    <div class="kriteria-item" id="kr-item-${kr.id}" style="${nonaktifStyle}">
      <span class="kriteria-kode">${kr.kode_kriteria}</span>
      <div>
        <span class="kriteria-nama">${kr.nama_kriteria}</span>
        <span class="badge-${kr.jenis}" style="margin-left:.5rem">${kr.jenis}</span>
      </div>
      <input
        class="bobot-input ${kr.is_aktif ? "" : "bobot-nonaktif"}"
        type="number" id="bobot-${kr.id}"
        value="${kr.bobot}" step="0.01" min="0" max="1"
        oninput="updateTotalBobot()"
        ${kr.is_aktif ? "" : "disabled"}
        title="${kr.is_aktif ? "Atur bobot" : "Aktifkan dulu untuk mengubah bobot"}"
      />
      <div class="kr-actions">
        <button class="btn-icon" onclick="openEditKriteria(${kr.id})" title="Edit">✎</button>
        <button class="btn-toggle ${kr.is_aktif ? "btn-toggle-on" : "btn-toggle-off"}"
          onclick="toggleAktifKriteria(${kr.id}, ${!kr.is_aktif})"
          title="${kr.is_aktif ? "Nonaktifkan" : "Aktifkan"}">
          ${kr.is_aktif ? "Aktif" : "Nonaktif"}
        </button>
        <button class="btn-danger" onclick="deleteKriteria(${kr.id}, '${kr.nama_kriteria}')" title="Hapus">✕</button>
      </div>
    </div>`;
}

function toggleFormKriteria() {
  const inner = document.getElementById("form-kriteria-inner");
  const btn   = document.getElementById("toggle-kriteria-btn");
  const hidden = inner.classList.contains("hidden");
  inner.classList.toggle("hidden");
  btn.textContent = hidden ? "✕ Tutup" : "+ Tambah Kriteria Baru";
}

function updateTotalBobot() {
  const inputs = document.querySelectorAll(".bobot-input:not([disabled])");
  const total  = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  const badge  = document.getElementById("total-bobot-display");
  badge.textContent = `Total (aktif): ${total.toFixed(3)}`;
  const isOk = Math.abs(total - 1.0) < 0.001;
  badge.className = `bobot-badge ${isOk ? "ok" : "warn"}`;
}

async function saveBobot() {
  const inputs = document.querySelectorAll(".bobot-input:not([disabled])");
  const total  = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value)||0), 0);
  if (Math.abs(total - 1.0) > 0.001) {
    showToast(`Total bobot kriteria aktif harus 1.0 (sekarang: ${total.toFixed(3)})`, "error");
    return;
  }

  const aktif   = _kriteria.filter(kr => kr.is_aktif);
  const payload = aktif.map(kr => ({
    id:    kr.id,
    bobot: parseFloat(document.getElementById(`bobot-${kr.id}`)?.value) || 0,
  }));
  try {
    await apiFetch(`${API}/kriteria/bobot`, { method: "PUT", body: JSON.stringify(payload) });
    showToast("Bobot berhasil disimpan");
    loadKriteria();
  } catch (_) {}
}

async function submitKriteria() {
  const kode  = document.getElementById("inp-kode")?.value.trim().toUpperCase();
  const nama  = document.getElementById("inp-nama-kr")?.value.trim();
  const jenis = document.getElementById("inp-jenis")?.value;
  const bobot = parseFloat(document.getElementById("inp-bobot-kr")?.value) || 0;

  if (!kode || !nama) { showToast("Kode dan nama kriteria wajib diisi", "error"); return; }

  try {
    await apiFetch(`${API}/kriteria`, {
      method: "POST",
      body: JSON.stringify({ kode_kriteria: kode, nama_kriteria: nama, jenis, bobot }),
    });
    showToast(`Kriteria ${kode} berhasil ditambahkan`);
    toggleFormKriteria();
    await loadKriteria();
    loadKriteriaForm();
  } catch (_) {}
}

function openEditKriteria(id) {
  const kr = _kriteria.find(k => k.id === id);
  if (!kr) return;

  const existing = document.getElementById("modal-edit-kr");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "modal-edit-kr";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Edit Kriteria ${kr.kode_kriteria}</span>
        <button class="btn-icon" onclick="document.getElementById('modal-edit-kr').remove()">✕</button>
      </div>
      <div class="form-group" style="margin-bottom:.85rem">
        <label>Nama Kriteria</label>
        <input type="text" id="edit-nama-kr" value="${kr.nama_kriteria}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Jenis</label>
          <select id="edit-jenis-kr" class="bobot-input" style="width:100%;padding:.45rem .6rem">
            <option value="benefit" ${kr.jenis==="benefit"?"selected":""}>Benefit</option>
            <option value="cost"    ${kr.jenis==="cost"   ?"selected":""}>Cost</option>
          </select>
        </div>
        <div class="form-group">
          <label>Bobot</label>
          <input type="number" id="edit-bobot-kr" value="${kr.bobot}" step="0.01" min="0" max="1" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-secondary" onclick="document.getElementById('modal-edit-kr').remove()">Batal</button>
        <button class="btn-primary" onclick="submitEditKriteria(${id})">Simpan Perubahan</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

async function submitEditKriteria(id) {
  const nama  = document.getElementById("edit-nama-kr")?.value.trim();
  const jenis = document.getElementById("edit-jenis-kr")?.value;
  const bobot = parseFloat(document.getElementById("edit-bobot-kr")?.value);

  if (!nama) { showToast("Nama tidak boleh kosong", "error"); return; }

  try {
    await apiFetch(`${API}/kriteria/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nama_kriteria: nama, jenis, bobot }),
    });
    document.getElementById("modal-edit-kr")?.remove();
    showToast("Kriteria berhasil diperbarui");
    await loadKriteria();
    loadKriteriaForm();
  } catch (_) {}
}

async function toggleAktifKriteria(id, setAktif) {
  const kr = _kriteria.find(k => k.id === id);
  const label = setAktif ? "aktifkan" : "nonaktifkan";
  if (!confirm(`${setAktif ? "Aktifkan" : "Nonaktifkan"} kriteria "${kr?.nama_kriteria}"?\n${setAktif ? "Kriteria akan masuk perhitungan SAW." : "Kriteria tidak akan masuk perhitungan SAW."}`)) return;
  try {
    await apiFetch(`${API}/kriteria/${id}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ is_aktif: setAktif }),
    });
    showToast(`Kriteria berhasil di${label}kan`);
    await loadKriteria();
    loadKriteriaForm();
  } catch (_) {}
}

async function deleteKriteria(id, nama) {
  if (!confirm(`Hapus kriteria "${nama}"?\nKriteria yang sudah dipakai di data nilai tidak bisa dihapus — nonaktifkan saja.`)) return;
  try {
    await apiFetch(`${API}/kriteria/${id}`, { method: "DELETE" });
    showToast(`Kriteria "${nama}" berhasil dihapus`);
    await loadKriteria();
    loadKriteriaForm();
  } catch (_) {}
}

async function loadRekomendasi() {
  const wrap = document.getElementById("rekomendasi-result");
  wrap.innerHTML = `<p class="empty-state">⏳ Menghitung...</p>`;
  ["matriks-section","normalisasi-section","detail-section"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });

  try {
    
    const resp = await apiFetch(`${API}/rekomendasi`);
    const hasil = resp.hasil ?? resp;   
    const meta  = resp.meta ?? {};

    if (!hasil.length) {
      wrap.innerHTML = `<p class="empty-state">Belum ada data cukup untuk dihitung</p>`;
      return;
    }

    document.getElementById("rek-timestamp").textContent = "Dihitung: " + nowString();

    const bannerHtml = meta.bobot_dinormalisasi
      ? `<div class="info-banner">
          ⚠ Ada kriteria nonaktif — bobot ${meta.jumlah_kriteria_aktif} kriteria aktif
          (total asli: ${meta.total_bobot_aktif}) dinormalisasi ulang agar totalnya = 1.0
         </div>`
      : "";

    wrap.innerHTML = bannerHtml + `<div class="rek-podium">${hasil.map(item => {
      const rankClass = item.peringkat === 1 ? "top" : "";
      const emoji = item.peringkat === 1 ? "🥇" : item.peringkat === 2 ? "🥈" : item.peringkat === 3 ? "🥉" : `#${item.peringkat}`;
      const pct = ((item.skor_akhir / hasil[0].skor_akhir) * 100).toFixed(1);
      return `
        <div class="rek-card ${rankClass}">
          <div class="rek-rank">${emoji} Peringkat ${item.peringkat}</div>
          <div class="rek-nama">${item.nama_supplier}</div>
          <div class="rek-skor-label">Skor SAW (V<sub>i</sub>)</div>
          <div class="rek-skor-val">${item.skor_akhir.toFixed(4)}</div>
          <div style="margin-top:.75rem">
            <div class="score-bar-bg">
              <div class="score-bar-fill" style="width:${pct}%"></div>
            </div>
            <span style="font-size:.7rem;color:var(--text-muted)">${pct}% dari skor tertinggi</span>
          </div>
        </div>`;
    }).join("")}</div>`;

    const kriteriaList = hasil[0].detail;
    const thKriteria   = kriteriaList.map(d =>
      `<th>${d.kode_kriteria}<br><span style="opacity:.5;font-weight:400;font-size:.68rem">${d.nama_kriteria}</span></th>`
    ).join("");

    const krObjMap = {};
    _kriteria.forEach(k => { krObjMap[k.kode_kriteria] = k; });

    document.getElementById("matriks-section").classList.remove("hidden");
    document.querySelector("#table-matriks thead").innerHTML = `<tr><th>Supplier</th>${thKriteria}</tr>`;
    document.querySelector("#table-matriks tbody").innerHTML = hasil.map(item => {
      const cells = item.detail.map(d => {
        const kr = krObjMap[d.kode_kriteria] || {};
        const tampil = isRupiah(kr) ? formatRupiah(d.nilai_mentah) : d.nilai_mentah;
        return `<td class="mono" style="${isRupiah(kr)?"font-size:.76rem":""}">${tampil}</td>`;
      }).join("");
      return `<tr><td style="font-weight:500">${item.nama_supplier}</td>${cells}</tr>`;
    }).join("");

    document.getElementById("normalisasi-section").classList.remove("hidden");
    const maxMin = {};
    kriteriaList.forEach(d => {
      const vals = hasil.map(item => item.detail.find(x => x.kode_kriteria === d.kode_kriteria)?.nilai_mentah || 0);
      maxMin[d.kode_kriteria] = { max: Math.max(...vals), min: Math.min(...vals) };
    });
    const thSubKriteria = kriteriaList.map(d => {
      const kr = krObjMap[d.kode_kriteria] || {};
      if (kr.jenis === "benefit") {
        const m = isRupiah(kr) ? formatRupiah(maxMin[d.kode_kriteria].max) : maxMin[d.kode_kriteria].max;
        return `<th style="font-weight:400;color:var(--green);font-size:.7rem">max = ${m}</th>`;
      } else {
        const m = isRupiah(kr) ? formatRupiah(maxMin[d.kode_kriteria].min) : maxMin[d.kode_kriteria].min;
        return `<th style="font-weight:400;color:var(--red);font-size:.7rem">min = ${m}</th>`;
      }
    }).join("");
    document.querySelector("#table-normalisasi thead").innerHTML =
      `<tr><th>Supplier</th>${thKriteria}</tr>
       <tr><th style="color:var(--text-muted);font-size:.7rem">Rumus</th>${thSubKriteria}</tr>`;
    document.querySelector("#table-normalisasi tbody").innerHTML = hasil.map(item => {
      const cells = item.detail.map(d => {
        const color = d.normalisasi >= 0.9 ? "var(--green)" : d.normalisasi >= 0.6 ? "var(--teal)" : "var(--text-muted)";
        return `<td class="mono" style="color:${color};font-weight:600">${d.normalisasi.toFixed(4)}</td>`;
      }).join("");
      return `<tr><td style="font-weight:500">${item.nama_supplier}</td>${cells}</tr>`;
    }).join("");

    document.getElementById("detail-section").classList.remove("hidden");
    const thBobot = kriteriaList.map(d =>
      `<th style="font-weight:400;color:var(--teal);font-size:.7rem">W = ${d.bobot}</th>`
    ).join("");
    document.querySelector("#table-detail thead").innerHTML =
      `<tr><th>#</th><th>Supplier</th>${thKriteria}<th>V<sub>i</sub></th></tr>
       <tr><th></th><th style="color:var(--text-muted);font-size:.7rem">Bobot (W<sub>j</sub>)</th>${thBobot}<th></th></tr>`;
    document.querySelector("#table-detail tbody").innerHTML = hasil.map(item => {
      const rankClass = item.peringkat <= 3 ? `rank-${item.peringkat}` : "rank-other";
      const cells = item.detail.map(d =>
        `<td>
          <span class="mono" style="color:var(--teal)">${d.normalisasi.toFixed(4)}</span>
          <br>
          <span style="font-size:.68rem;color:var(--text-dim)">× ${d.bobot} = ${d.kontribusi.toFixed(4)}</span>
        </td>`
      ).join("");
      return `<tr>
        <td><span class="rank-badge ${rankClass}">${item.peringkat}</span></td>
        <td style="font-weight:500">${item.nama_supplier}</td>
        ${cells}
        <td><span class="score-val">${item.skor_akhir.toFixed(4)}</span></td>
      </tr>`;
    }).join("");

  } catch (_) {}
}


document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadKriteria();

  const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  function updateClock() {
    const now  = new Date();
    const h    = String(now.getHours()).padStart(2, "0");
    const m    = String(now.getMinutes()).padStart(2, "0");
    const s    = String(now.getSeconds()).padStart(2, "0");
    const hari = HARI[now.getDay()];
    const tgl  = now.getDate();
    const bln  = BULAN[now.getMonth()];
    const thn  = now.getFullYear();

    const elTime = document.getElementById("ticker-time");
    const elDate = document.getElementById("ticker-date");
    if (elTime) elTime.textContent = `${h}:${m}:${s}`;
    if (elDate) elDate.textContent = `${hari}, ${tgl} ${bln} ${thn}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
});
/**
 * 僑生返宿系統 - 共用工具函式
 */

// ── Toast 通知 ────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._tid);
  el._tid = setTimeout(() => el.classList.remove('show'), duration);
}

// ── 結果標籤 ──────────────────────────────────
function resultBadge(result) {
  const map = {
    success: ['badge-success', '✓ 返宿成功'],
    late: ['badge-warning', '⚠ 逾時返宿'],
    duplicate: ['badge-info', '↺ 重複掃碼'],
    invalid: ['badge-danger', '✗ 無效'],
    internship: ['badge-secondary', '工場實習'],
  };
  const [cls, text] = map[result] || ['badge-secondary', result];
  return `<span class="badge ${cls}">${text}</span>`;
}

// ── 國籍 Flag emoji ───────────────────────────
function nationalityFlag(nat) {
  const map = { '印尼':'🇮🇩','越南':'🇻🇳','緬甸':'🇲🇲','泰國':'🇹🇭','柬埔寨':'🇰🇭','馬來西亞':'🇲🇾','菲律賓':'🇵🇭' };
  return map[nat] || '🌏';
}

// ── 下載檔案 ──────────────────────────────────
function downloadFile(content, filename, mime = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: mime }));
  a.download = filename;
  a.click();
}

// ── 解析 CSV ──────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
}

// ── 格式化時間 ────────────────────────────────
function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// ── 設定 active nav ───────────────────────────
function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

// ── Modal 控制 ────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// ── 印 QR 名片 ────────────────────────────────
function printQRCards(ids) {
  const students = ids
    ? ids.map(id => DB.students.getById(id)).filter(Boolean)
    : DB.students.getAll();
  if (!students.length) { showToast('尚無學生資料，請先至「匯入資料」頁面匯入', 'warning'); return; }

  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>學生返宿識別卡</title>
  <style>
    body { font-family: 'Microsoft JhengHei', Arial, sans-serif; }
    .grid { display: grid; grid-template-columns: repeat(4, 200px); gap: 8px; padding: 8px; }
    .card { border: 2px solid #1a6b3c; border-radius: 10px; padding: 10px; text-align: center; width: 190px; }
    .school { font-size: 10px; color: #666; }
    .name { font-size: 14px; font-weight: 700; margin: 4px 0 2px; }
    .eng { font-size: 10px; color: #444; }
    .class-room { font-size: 11px; color: #555; margin: 3px 0; }
    .token { font-size: 9px; color: #999; font-family: monospace; margin-top: 4px; }
    .nat { font-size: 12px; }
    @media print { @page { margin: 5mm; } }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  </head><body><div class="grid" id="g"></div><script>
  const data = ${JSON.stringify(students)};
  const g = document.getElementById('g');
  data.forEach(s => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = '<div class="school">僑生住宿識別卡</div>'
      + '<div id="q'+s.id+'"></div>'
      + '<div class="name">' + (s.name || s.engName) + '</div>'
      + '<div class="eng">' + (s.engName || '') + '</div>'
      + '<div class="class-room">' + s.className + '　' + (s.building||'') + (s.roomNo||'') + '-' + (s.bedNo||'') + '</div>'
      + '<div class="nat">' + (s.nationality||'') + '</div>'
      + '<div class="token">' + s.token + '</div>';
    g.appendChild(div);
    new QRCode(document.getElementById('q'+s.id), { text: s.token, width: 120, height: 120, correctLevel: QRCode.CorrectLevel.M });
  });
  setTimeout(() => window.print(), 1200);
  </script></body></html>`);
  w.document.close();
}

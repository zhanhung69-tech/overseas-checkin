/**
 * 僑生返宿系統 - Google Apps Script 後端
 * 部署方式：Apps Script > 部署 > 新增部署 > 網頁應用程式
 *           執行身分：我（管理員），存取對象：所有人
 *
 * 對應的 Google Sheets 結構：
 *   工作表1: students  (學生基本資料)
 *   工作表2: checkin   (返宿紀錄)
 *   工作表3: settings  (系統參數)
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← 換成你的試算表 ID

const SHEET = {
  STUDENTS: 'students',
  CHECKIN:  'checkin',
  SETTINGS: 'settings',
};

// ── 主要 HTTP 入口 ────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || '';
  const res = dispatch('GET', action, e.parameter);
  return respond(res);
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch(_) {}
  const action = body.action || e.parameter.action || '';
  const res = dispatch('POST', action, body);
  return respond(res);
}

function dispatch(method, action, params) {
  try {
    switch(action) {
      case 'ping':              return { ok: true, ts: new Date().toISOString() };
      case 'getStudents':       return getStudents(params);
      case 'getStudent':        return getStudentByToken(params.token);
      case 'checkin':           return doCheckin(params);
      case 'getTodayStats':     return getTodayStats();
      case 'getRecords':        return getRecords(params);
      case 'getMissing':        return getMissing(params.date);
      case 'importStudents':    return importStudents(params.students);
      case 'exportStudents':    return exportStudents();
      default:
        return { ok: false, error: 'Unknown action: ' + action };
    }
  } catch(err) {
    return { ok: false, error: err.message };
  }
}

function respond(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── 工具函式 ──────────────────────────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    students: ['學號','姓名','英文名','班級','國籍','性別','電話','棟','房號','床號','狀態','生日','識別碼','建立時間'],
    checkin:  ['紀錄ID','日期','時間','學號','姓名','英文名','班級','棟房號','國籍','結果','人員','地點','備註'],
    settings: ['參數名稱','參數值'],
  };
  const h = headers[name];
  if (h) {
    sheet.appendRow(h);
    sheet.getRange(1, 1, 1, h.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => h.toString().trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i].toString() : ''; });
    return obj;
  });
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function nowString() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function generateId() {
  return Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
}

// ── 學生 API ──────────────────────────────────────────────────────────────────

function getStudents(params) {
  const sheet = getSheet(SHEET.STUDENTS);
  let students = sheetToObjects(sheet);
  if (params.status) students = students.filter(s => s['狀態'] === params.status);
  if (params.className) students = students.filter(s => s['班級'] === params.className);
  return { ok: true, count: students.length, students };
}

function getStudentByToken(token) {
  if (!token) return { ok: false, error: '缺少 token' };
  const sheet = getSheet(SHEET.STUDENTS);
  const students = sheetToObjects(sheet);
  const s = students.find(st => st['識別碼'] === token.trim());
  if (!s) return { ok: false, error: '查無此識別碼' };
  return { ok: true, student: s };
}

function exportStudents() {
  const sheet = getSheet(SHEET.STUDENTS);
  const students = sheetToObjects(sheet);
  return { ok: true, students };
}

function importStudents(incoming) {
  if (!incoming || !incoming.length) return { ok: false, error: '無資料' };
  const sheet = getSheet(SHEET.STUDENTS);
  const existing = sheetToObjects(sheet);
  const existingIds = new Set(existing.map(s => s['學號']));
  let added = 0, skipped = 0;
  const now = new Date().toISOString();

  incoming.forEach(s => {
    const id = s.id || s['學號'];
    if (!id) return;
    if (existingIds.has(id.toString())) { skipped++; return; }
    sheet.appendRow([
      id, s.name||s['姓名']||'', s.engName||s['英文名']||'',
      s.className||s['班級']||'', s.nationality||s['國籍']||'',
      s.gender||s['性別']||'', s.phone||s['電話']||'',
      s.building||s['棟']||'', s.roomNo||s['房號']||'',
      s.bedNo||s['床號']||'', s.status||s['狀態']||'在住',
      s.birthday||s['生日']||'', s.token||'', now
    ]);
    added++;
  });

  return { ok: true, added, skipped };
}

// ── 返宿 API ──────────────────────────────────────────────────────────────────

function doCheckin(params) {
  const { token, operator, location, note } = params;
  if (!token) return { ok: false, error: '缺少識別碼' };

  const studentRes = getStudentByToken(token);
  if (!studentRes.ok) return studentRes;
  const s = studentRes.student;

  if (s['狀態'] !== '在住') {
    return { ok: false, error: `學生狀態為「${s['狀態']}」，非住宿中`, student: s };
  }

  const today = todayString();
  const time = nowString();

  // Check for duplicate today
  const recSheet = getSheet(SHEET.CHECKIN);
  const recs = sheetToObjects(recSheet);
  const todayRec = recs.find(r => r['日期'] === today && r['學號'] === s['學號']);
  if (todayRec) {
    return {
      ok: true,
      result: 'duplicate',
      message: `今日 ${todayRec['時間']} 已登記過`,
      student: s,
    };
  }

  // Get settings for late threshold
  const settings = getSettingsObj();
  const lateThreshold = settings['lateThreshold'] || '22:30';
  const result = time > lateThreshold ? 'late' : 'success';

  // Write record
  recSheet.appendRow([
    generateId(), today, time,
    s['學號'], s['姓名'], s['英文名'], s['班級'],
    (s['棟']||'') + (s['房號']||'') + '-' + (s['床號']||''),
    s['國籍'], result,
    operator || '管理員', location || '', note || ''
  ]);

  return {
    ok: true,
    result,
    message: result === 'late' ? `逾時返宿 ${time}` : `✓ 返宿登記成功 ${time}`,
    student: s,
    time,
  };
}

function getTodayStats() {
  const today = todayString();
  const studentsSheet = getSheet(SHEET.STUDENTS);
  const recSheet = getSheet(SHEET.CHECKIN);

  const allStudents = sheetToObjects(studentsSheet).filter(s => s['狀態'] === '在住');
  const todayRecs = sheetToObjects(recSheet).filter(r => r['日期'] === today);
  const checkedIds = new Set(todayRecs.filter(r => r['結果'] !== 'invalid').map(r => r['學號']));

  const notIn = allStudents.filter(s => !checkedIds.has(s['學號']));
  const lateCount = todayRecs.filter(r => r['結果'] === 'late').length;

  return {
    ok: true,
    date: today,
    total: allStudents.length,
    checkedIn: checkedIds.size,
    notInCount: notIn.length,
    lateCount,
    notIn,
    records: todayRecs,
  };
}

function getRecords(params) {
  const recSheet = getSheet(SHEET.CHECKIN);
  let recs = sheetToObjects(recSheet);
  if (params.date) recs = recs.filter(r => r['日期'] === params.date);
  return { ok: true, count: recs.length, records: recs };
}

function getMissing(date) {
  const d = date || todayString();
  const studentsSheet = getSheet(SHEET.STUDENTS);
  const recSheet = getSheet(SHEET.CHECKIN);

  const residents = sheetToObjects(studentsSheet).filter(s => s['狀態'] === '在住');
  const dayRecs = sheetToObjects(recSheet).filter(r => r['日期'] === d);
  const checkedIds = new Set(dayRecs.map(r => r['學號']));
  const notIn = residents.filter(s => !checkedIds.has(s['學號']));

  return { ok: true, date: d, count: notIn.length, missing: notIn };
}

// ── 設定 API ──────────────────────────────────────────────────────────────────

function getSettingsObj() {
  const sheet = getSheet(SHEET.SETTINGS);
  const rows = sheetToObjects(sheet);
  const obj = {
    dormReturnStart: '16:00',
    dormReturnEnd: '23:00',
    lateThreshold: '22:30',
    duplicateIntervalMin: '10',
  };
  rows.forEach(r => { if (r['參數名稱']) obj[r['參數名稱']] = r['參數值']; });
  return obj;
}

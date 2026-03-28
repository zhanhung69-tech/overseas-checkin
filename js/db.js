/**
 * 僑生返宿系統 - 資料管理模組
 * 使用 localStorage 儲存，可日後升級為後端 API
 */

const DB = (() => {
  const KEYS = {
    STUDENTS: 'ois_students',
    RECORDS: 'ois_checkin_records',
    SETTINGS: 'ois_settings',
  };

  // ── 預設設定 ──────────────────────────────────
  const DEFAULT_SETTINGS = {
    schoolName: '僑生住宿管理中心',
    dormReturnStart: '16:00',
    dormReturnEnd: '23:00',
    lateThreshold: '22:30',
    duplicateIntervalMin: 10,
    systemVersion: '1.0.0',
  };

  // ── 工具函式 ──────────────────────────────────
  function generateToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let t = 'OIS-';
    for (let i = 0; i < 8; i++) t += chars[Math.floor(Math.random() * chars.length)];
    return t;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function now() {
    const d = new Date();
    return d.toTimeString().slice(0, 5); // HH:MM
  }

  // ── 學生 CRUD ─────────────────────────────────
  const students = {
    getAll() {
      return JSON.parse(localStorage.getItem(KEYS.STUDENTS) || '[]');
    },
    save(list) {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(list));
    },
    getById(id) {
      return this.getAll().find(s => s.id === id);
    },
    getByToken(token) {
      return this.getAll().find(s => s.token === token);
    },
    add(student) {
      const list = this.getAll();
      if (!student.token) student.token = generateToken();
      student._createdAt = Date.now();
      list.push(student);
      this.save(list);
      return student;
    },
    importMany(arr) {
      const existing = this.getAll();
      const existingIds = new Set(existing.map(s => s.id));
      let added = 0, skipped = 0;
      arr.forEach(s => {
        if (!s.token) s.token = generateToken();
        s._createdAt = Date.now();
        if (existingIds.has(s.id)) {
          skipped++;
        } else {
          existing.push(s);
          added++;
        }
      });
      this.save(existing);
      return { added, skipped };
    },
    replaceAll(arr) {
      arr.forEach(s => { if (!s.token) s.token = generateToken(); });
      this.save(arr);
      return arr.length;
    },
    update(id, patch) {
      const list = this.getAll();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) return false;
      list[idx] = { ...list[idx], ...patch };
      this.save(list);
      return true;
    },
    delete(id) {
      const list = this.getAll().filter(s => s.id !== id);
      this.save(list);
    },
    count() { return this.getAll().length; },
    getResident() {
      return this.getAll().filter(s => s.status === '在住');
    },
    getByClass(cls) {
      return this.getAll().filter(s => s.className === cls);
    },
    getClasses() {
      return [...new Set(this.getAll().map(s => s.className))].sort();
    },
    getBuildings() {
      return [...new Set(this.getAll().filter(s=>s.building).map(s => s.building))].sort();
    },
  };

  // ── 返宿紀錄 CRUD ─────────────────────────────
  const records = {
    getAll() {
      return JSON.parse(localStorage.getItem(KEYS.RECORDS) || '[]');
    },
    save(list) {
      localStorage.setItem(KEYS.RECORDS, JSON.stringify(list));
    },
    getByDate(date) {
      return this.getAll().filter(r => r.date === date);
    },
    getTodayByStudent(studentId) {
      return this.getAll().find(r => r.date === today() && r.studentId === studentId);
    },
    add(studentId, extra = {}) {
      const list = this.getAll();
      const student = students.getById(studentId);
      if (!student) return null;

      const settings = DB.settings.get();
      const t = now();
      let result = 'success';
      if (t > settings.lateThreshold) result = 'late';

      // duplicate check
      const dup = this.getTodayByStudent(studentId);
      if (dup) {
        const diffMs = Date.now() - dup._ts;
        if (diffMs < settings.duplicateIntervalMin * 60 * 1000) {
          return { isDuplicate: true, record: dup, student };
        }
        result = 'duplicate';
      }

      const rec = {
        id: generateId(),
        studentId,
        token: student.token,
        name: student.name,
        engName: student.engName,
        className: student.className,
        roomNo: student.roomNo,
        bedNo: student.bedNo,
        building: student.building,
        nationality: student.nationality,
        date: today(),
        time: t,
        result,
        operator: extra.operator || '管理員',
        location: extra.location || '',
        note: extra.note || '',
        _ts: Date.now(),
      };
      list.unshift(rec);
      this.save(list);
      return { isDuplicate: false, record: rec, student };
    },
    getTodayStats() {
      const todayRecs = this.getByDate(today());
      const residents = students.getResident();
      const checkedIds = new Set(todayRecs.filter(r=>r.result!=='invalid').map(r=>r.studentId));
      return {
        total: residents.length,
        checkedIn: checkedIds.size,
        notIn: residents.filter(s => !checkedIds.has(s.id)),
        late: todayRecs.filter(r => r.result === 'late').length,
        records: todayRecs,
      };
    },
    clearDate(date) {
      const list = this.getAll().filter(r => r.date !== date);
      this.save(list);
    },
    exportCSV(date) {
      const recs = date ? this.getByDate(date) : this.getAll();
      const headers = ['日期','時間','學號','姓名','英文名','班級','棟/房號','國籍','結果','人員'];
      const rows = recs.map(r => [
        r.date, r.time, r.studentId, r.name, r.engName,
        r.className, `${r.building||''}${r.roomNo||''}`, r.nationality,
        r.result, r.operator
      ]);
      return [headers, ...rows].map(r => r.map(c=>`"${c||''}"`).join(',')).join('\n');
    },
  };

  // ── 設定 ─────────────────────────────────────
  const settings = {
    get() {
      const saved = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    },
    set(patch) {
      const current = this.get();
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...patch }));
    },
  };

  return { students, records, settings, generateToken, generateId, today, now, KEYS };
})();

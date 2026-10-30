/* PDF import, local question bank and standard paper templates */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const S = YT.S;
  const D = YT.data;

  const TYPE_NAMES = {
    choice: "选择题",
    blank: "填空题",
    solution: "解答题",
    proof: "证明题",
    application: "综合应用题",
    cloze: "完形填空",
    read: "阅读理解",
    newtype: "新题型",
    translate: "翻译",
    writing: "写作",
  };
  const DIFF_NAMES = { 1: "简单", 2: "一般", 3: "困难" };
  YT.typeNames = TYPE_NAMES;
  YT.diffName = (n) => DIFF_NAMES[n] || "一般";

  /* ---------------- standard paper templates (2026 考研) ---------------- */
  const MATH_SECTIONS = [
    { key: "choice", name: "单项选择题", type: "choice", match: ["choice"], count: 10, score: 5 },
    { key: "blank", name: "填空题", type: "blank", match: ["blank"], count: 6, score: 5 },
    {
      key: "solution",
      name: "解答题",
      type: "solution",
      match: ["solution", "proof"],
      count: 6,
      scores: [10, 10, 10, 10, 15, 15],
    },
  ];
  const TEMPLATES = {
    math1: { id: "math1", subject: "math1", name: "数学一 · 标准卷", total: 150, minutes: 180, sections: MATH_SECTIONS },
    math2: { id: "math2", subject: "math2", name: "数学二 · 标准卷", total: 150, minutes: 180, sections: MATH_SECTIONS },
    math3: { id: "math3", subject: "math3", name: "数学三 · 标准卷", total: 150, minutes: 180, sections: MATH_SECTIONS },
    cs408: {
      id: "cs408",
      subject: "cs408",
      name: "408 · 标准卷",
      total: 150,
      minutes: 180,
      sections: [
        { key: "choice", name: "单项选择题", type: "choice", match: ["choice"], count: 40, score: 2 },
        {
          key: "application",
          name: "综合应用题",
          type: "application",
          match: ["application", "solution", "proof"],
          count: 7,
          scores: [10, 15, 8, 13, 7, 8, 9],
        },
      ],
    },
    english1: {
      id: "english1",
      subject: "english1",
      name: "英语一 · 标准卷",
      total: 100,
      minutes: 180,
      sections: [
        { key: "cloze", name: "完形填空", type: "cloze", match: ["cloze"], count: 20, score: 0.5 },
        { key: "read", name: "阅读理解 Part A", type: "read", match: ["read"], count: 20, score: 2 },
        { key: "newtype", name: "新题型 Part B", type: "newtype", match: ["newtype"], count: 5, score: 2 },
        { key: "translate", name: "翻译 Part C", type: "translate", match: ["translate"], count: 5, score: 2 },
        { key: "writingA", name: "写作 Part A（小作文）", type: "writing", match: ["writing"], count: 1, score: 10 },
        { key: "writingB", name: "写作 Part B（大作文）", type: "writing", match: ["writing"], count: 1, score: 20 },
      ],
    },
    english2: {
      id: "english2",
      subject: "english2",
      name: "英语二 · 标准卷",
      total: 100,
      minutes: 180,
      sections: [
        { key: "cloze", name: "完形填空", type: "cloze", match: ["cloze"], count: 20, score: 0.5 },
        { key: "read", name: "阅读理解 Part A", type: "read", match: ["read"], count: 20, score: 2 },
        { key: "newtype", name: "新题型 Part B", type: "newtype", match: ["newtype"], count: 5, score: 2 },
        { key: "translate", name: "翻译", type: "translate", match: ["translate"], count: 1, score: 15 },
        { key: "writingA", name: "写作 Part A（小作文）", type: "writing", match: ["writing"], count: 1, score: 10 },
        { key: "writingB", name: "写作 Part B（大作文）", type: "writing", match: ["writing"], count: 1, score: 15 },
      ],
    },
  };
  YT.templates = TEMPLATES;
  YT.templateFor = (id) => TEMPLATES[id] || null;

  /* ---------------- storage: IndexedDB + localStorage fallback ---------------- */
  const DB_NAME = "yantidao_imports_v1";
  const FALLBACK_KEY = "yantidao_imported_v1";
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("no indexedDB"));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("questions")) db.createObjectStore("questions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("batches")) db.createObjectStore("batches", { keyPath: "id" });
        if (!db.objectStoreNames.contains("images")) db.createObjectStore("images", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("indexedDB open failed"));
    });
    return dbPromise;
  }

  function reqDone(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function readFallback() {
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : { batches: [], questions: [] };
    } catch (e) {
      return { batches: [], questions: [] };
    }
  }
  function writeFallback(data) {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
    } catch (e) {
      /* quota */
    }
  }

  const store = {
    mode: "idb",
    async load() {
      let batches = [];
      let questions = [];
      try {
        const db = await openDB();
        const tx = db.transaction(["batches", "questions"], "readonly");
        batches = await reqDone(tx.objectStore("batches").getAll());
        questions = await reqDone(tx.objectStore("questions").getAll());
        this.mode = "idb";
      } catch (e) {
        const data = readFallback();
        batches = data.batches || [];
        questions = data.questions || [];
        this.mode = "local";
      }
      const ids = {};
      D.questions.forEach((q) => (ids[q.id] = true));
      questions.forEach((q) => {
        if (!ids[q.id]) D.questions.push(q);
      });
      S.importedBatches = batches.slice().sort((a, b) => b.createdAt - a.createdAt);
      U.rebuildIndexes();
      return { batches: S.importedBatches, questions };
    },
    async addBatch(batch, questions, images) {
      if (this.mode === "idb") {
        try {
          const db = await openDB();
          await new Promise((resolve, reject) => {
            const tx = db.transaction(["batches", "questions", "images"], "readwrite");
            tx.objectStore("batches").put(batch);
            questions.forEach((q) => tx.objectStore("questions").put(q));
            (images || []).forEach((im) => tx.objectStore("images").put(im));
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
        } catch (e) {
          this.mode = "local";
        }
      }
      questions.forEach((q) => D.questions.push(q));
      S.importedBatches.unshift(batch);
      if (this.mode === "local") this.persistFallback();
      U.rebuildIndexes();
    },
    persistFallback() {
      const ids = {};
      S.importedBatches.forEach((b) => (ids[b.id] = true));
      writeFallback({
        batches: S.importedBatches,
        questions: D.questions.filter((q) => q.imported && ids[q.batchId]),
      });
    },
    async getImage(id) {
      if (this.mode !== "idb") return null;
      try {
        const db = await openDB();
        const tx = db.transaction("images", "readonly");
        const rec = await reqDone(tx.objectStore("images").get(id));
        return rec ? rec.blob : null;
      } catch (e) {
        return null;
      }
    },
    async deleteBatch(batchId) {
      const removals = D.questions.filter((q) => q.batchId === batchId);
      const ids = {};
      removals.forEach((q) => {
        ids[q.id] = true;
        U.dropImage(q.id);
      });
      if (this.mode === "idb") {
        try {
          const db = await openDB();
          await new Promise((resolve, reject) => {
            const tx = db.transaction(["batches", "questions", "images"], "readwrite");
            tx.objectStore("batches").delete(batchId);
            removals.forEach((q) => {
              tx.objectStore("questions").delete(q.id);
              if (q.imageId) tx.objectStore("images").delete(q.imageId);
            });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
        } catch (e) {
          /* ignore */
        }
      }
      for (let i = D.questions.length - 1; i >= 0; i--) {
        if (D.questions[i].batchId === batchId) D.questions.splice(i, 1);
      }
      const bi = S.importedBatches.findIndex((b) => b.id === batchId);
      if (bi >= 0) S.importedBatches.splice(bi, 1);
      S.wrong = S.wrong.filter((id) => !ids[id]);
      S.favorites = S.favorites.filter((id) => !ids[id]);
      Object.keys(S.mastery).forEach((id) => { if (ids[id]) delete S.mastery[id]; });
      Object.keys(S.notes).forEach((id) => { if (ids[id]) delete S.notes[id]; });
      Object.keys(S.comments).forEach((id) => { if (ids[id]) delete S.comments[id]; });
      if (this.mode === "local") this.persistFallback();
      U.rebuildIndexes();
    },
  };
  YT.importStore = store;

  /* ---------------- PDF text extraction ---------------- */
  const RADICAL_FIX = {
    "⻓": "长", "⻅": "见", "⻔": "门", "⻋": "车", "⻢": "马", "⻜": "飞",
    "⻉": "贝", "⻚": "页", "⻛": "风", "⻥": "鱼", "⻦": "鸟", "⻩": "黄",
    "⻰": "龙", "⻮": "齿", "⻳": "龟", "⻬": "齐", "⻆": "角", "⻊": "足",
    "⻑": "长",
  };
  function normText(s) {
    return String(s || "")
      .normalize("NFKC")
      .replace(/[\u2e80-\u2eff]/g, (ch) => RADICAL_FIX[ch] || ch)
      .replace(/\u0000/g, "")
      .replace(/[\u00a0\u3000]/g, " ")
      .replace(/\ufb01/g, "fi")
      .replace(/\ufb02/g, "fl")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function buildLines(items, width, height) {
    const arr = [];
    items.forEach((it, idx) => {
      if (!it.str || !String(it.str).trim()) return;
      const tr = it.transform || [1, 0, 0, 1, 0, 0];
      const size = Math.hypot(tr[2], tr[3]) || it.height || 10;
      arr.push({
        str: String(it.str),
        x: tr[4],
        y: tr[5],
        w: it.width || 0,
        size: size,
        idx: idx,
      });
    });
    if (!arr.length) return [];

    const left = arr.filter((a) => a.x < width * 0.48).length;
    const right = arr.length - left;
    const crossing = arr.filter((a) => a.x < width * 0.46 && a.x + a.w > width * 0.54).length;
    const midStarts = arr.filter((a) => a.x > width * 0.43 && a.x < width * 0.57).length;
    const twoCol =
      arr.length > 40 &&
      left > arr.length * 0.22 &&
      right > arr.length * 0.22 &&
      Math.min(left, right) / arr.length > 0.28 &&
      crossing < arr.length * 0.04 &&
      midStarts < arr.length * 0.02;

    function group(list) {
      list.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = [];
      list.forEach((it) => {
        const tol = Math.max(1.6, it.size * 0.42);
        let best = null;
        let bestDy = Infinity;
        for (let i = lines.length - 1; i >= 0 && i >= lines.length - 8; i--) {
          const dy = Math.abs(lines[i].y - it.y);
          if (dy <= tol && dy < bestDy) {
            best = lines[i];
            bestDy = dy;
          }
        }
        if (best) {
          best.items.push(it);
          best.y = (best.y * (best.items.length - 1) + it.y) / best.items.length;
          best.size = Math.max(best.size, it.size);
        } else {
          lines.push({ y: it.y, size: it.size, items: [it] });
        }
      });
      const out = [];
      lines.forEach((line) => {
        line.items.sort((a, b) => a.x - b.x);
        let text = "";
        let prev = null;
        let x1 = Infinity;
        let x2 = -Infinity;
        let yTop = -Infinity;
        let yBot = Infinity;
        line.items.forEach((it) => {
          if (prev) {
            const gap = it.x - (prev.x + prev.w);
            if (gap > it.size * 0.3 && !/\s$/.test(text) && !/^\s/.test(it.str)) text += " ";
          }
          text += it.str;
          prev = it;
          x1 = Math.min(x1, it.x);
          x2 = Math.max(x2, it.x + it.w);
          yTop = Math.max(yTop, it.y + it.size * 0.82);
          yBot = Math.min(yBot, it.y - it.size * 0.22);
        });
        text = normText(text).replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1");
        if (!text) return;
        out.push({
          text: text,
          x1: x1,
          x2: x2,
          yTop: yTop,
          yBot: yBot,
          size: line.size,
          col: x1 < width * 0.5 ? 0 : 1,
        });
      });
      return out;
    }

    let lines;
    if (twoCol) {
      const l = group(arr.filter((a) => a.x < width * 0.5));
      const r = group(arr.filter((a) => a.x >= width * 0.5));
      l.forEach((x) => (x.col = 0));
      r.forEach((x) => (x.col = 1));
      lines = l.concat(r);
    } else {
      lines = group(arr);
      lines.forEach((x) => (x.col = 0));
    }
    return lines.filter((l) => !isJunk(l, width, height));
  }

  function isJunk(line, W, H) {
    const t = line.text;
    if (!t) return true;
    if (/^[\s\-—–·]*\d{1,3}[\s\-—–·]*$/.test(t)) return true;
    if (/^\d{1,3}\s*[.．、]\s*$/.test(t)) return true;
    if (/^第\s*\d+\s*页(\s*[/／共]\s*\d+\s*页)?$/.test(t)) return true;
    if (/^(研题岛|研可岸|真题网).{0,18}$/.test(t) && t.length < 24) return true;
    if (line.yTop < H * 0.045 && t.length < 30) return true;
    if (line.yBot > H * 0.965 && t.length < 30) return true;
    return false;
  }

  function sectionType(text) {
    const trimmed = text.trim();
    if (trimmed.length > 45 && !/Part|Section/i.test(trimmed)) return null;
    const headingStart =
      /^(第?[一二三四五六七八九十]+\s*[、.．]|Part\s+[ABCIVX]+|Section\s+[IVXABC]+|I{1,3}\s*[.、]|V?I{0,3}\s*[.、])/i.test(trimmed) ||
      /^(单项选择题|选择题|填空题|解答题|证明题|综合应用题|综合题|完形填空|英语知识运用|阅读理解|新题型|翻译|英译汉|写作|作文|Use\s+of\s+English|Reading\s+Comprehension|Writing)/i.test(trimmed);
    if (!headingStart) return null;
    const t = trimmed.replace(/\s+/g, "");
    if (/Part\s*B/i.test(trimmed) || /新题型/.test(t)) return "newtype";
    if (/Part\s*C/i.test(trimmed) || /英译汉|翻译/.test(t)) return "translate";
    if (/Part\s*A/i.test(trimmed) && /阅读|Reading/i.test(trimmed)) return "read";
    if (/综合应用题|综合题/.test(t)) return "application";
    if (/完形填空|英语知识运用|Use\s*of\s*English/i.test(trimmed)) return "cloze";
    if (/阅读理解|Reading\s*Comprehension/i.test(t)) return "read";
    if (/写作|作文|Writing/i.test(trimmed)) return "writing";
    if (/填空题/.test(t)) return "blank";
    if (/选择题|单项选择/.test(t)) return "choice";
    if (/解答题|计算题|证明题/.test(t)) return "solution";
    if (/^[一二三四五六七八九十]+\s*[、.．]/.test(t) && t.length < 30) return "section";
    if (/^(Section|Part)\s+[IVXABC]+/i.test(trimmed) && t.length < 40) return "section";
    return null;
  }

  function isAnswerHeading(text) {
    const t = text
      .replace(/^\s*第?[一二三四五六七八九十]+\s*[、.．]\s*/, "")
      .replace(/\s+/g, "");
    return t.length < 24 && /^(参考答案|答案与解析|答案解析|答案速查|参考解答)/.test(t);
  }

  function matchStart(text, section, lastNum) {
    let m = text.match(/^\s*第\s*(\d{1,3})\s*题[\s.．、:：]*/);
    if (m) return { num: +m[1], rest: text.slice(m[0].length), end: m[0].length };
    m = text.match(/^\s*(\d{1,3})\s*[.．、]\s*(.*)$/);
    if (m && +m[1] > 0 && !/^\d/.test(m[2])) {
      return { num: +m[1], rest: m[2], end: m[0].length - m[2].length };
    }
    m = text.match(/^\s*[（(]\s*(\d{1,3})\s*[)）]\s*(.*)$/);
    if (m && +m[1] > 0) {
      const n = +m[1];
      if (n === lastNum + 1 || section === "choice" || section === "blank" || section === "cloze") {
        return { num: n, rest: m[2], end: m[0].length - m[2].length };
      }
    }
    return null;
  }

  function joinText(lines) {
    let out = "";
    lines.forEach((l) => {
      const t = l.text.trim();
      if (!t) return;
      if (!out) out = t;
      else if (/[A-Za-z0-9,.;:)\]%]$/.test(out) && /^[A-Za-z0-9([]/.test(t)) out += " " + t;
      else out += t;
    });
    return out.replace(/\s+/g, " ").trim();
  }

  const OPT_RE = /(?:^|[\s　])([A-D])\s*[.．、)]\s*/g;
  function extractOptions(lines) {
    const found = {};
    let firstLine = -1;
    let firstPrefix = "";
    lines.forEach((line, li) => {
      const text = line.text;
      const matches = [];
      let m;
      OPT_RE.lastIndex = 0;
      while ((m = OPT_RE.exec(text))) {
        matches.push({ label: m[1], start: m.index + m[0].length, at: m.index });
      }
      if (!matches.length) return;
      if (matches.length < 2 && !/^\s*[A-D]\s*[.．、)]/.test(text)) return;
      if (firstLine < 0) {
        firstLine = li;
        firstPrefix = text.slice(0, matches[0].at).trim();
      }
      matches.forEach((mt, i) => {
        const end = i + 1 < matches.length ? matches[i + 1].at : text.length;
        const val = text.slice(mt.start, end).trim().replace(/\s+/g, " ");
        if (val && !found[mt.label]) found[mt.label] = val;
      });
    });
    const labels = Object.keys(found).sort();
    if (labels.indexOf("A") < 0 || labels.length < 3) return { options: [], stemLines: lines, firstLine: -1 };
    const options = labels.map((k) => found[k]);
    return { options: options, stemLines: lines.slice(0, firstLine), firstPrefix: firstPrefix, firstLine: firstLine };
  }

  function splitAnswer(text) {
    let answer = "";
    let analysis = "";
    let rest = text;
    const ai = rest.search(/【\s*答案\s*】|答案\s*[:：]/);
    if (ai >= 0) {
      const after = rest.slice(ai).replace(/^【\s*答案\s*】\s*|^答案\s*[:：]\s*/, "");
      const ei = after.search(/【\s*解析\s*】|【\s*分析\s*】|解析\s*[:：]|分析\s*[:：]/);
      if (ei >= 0) {
        answer = after.slice(0, ei).trim();
        analysis = after.slice(ei).replace(/^【\s*解析\s*】\s*|^【\s*分析\s*】\s*|^解析\s*[:：]\s*|^分析\s*[:：]\s*/, "").trim();
      } else {
        answer = after.trim();
      }
      rest = rest.slice(0, ai);
    }
    return { answer: answer, analysis: analysis, rest: rest };
  }

  function parseScore(text, type, subject) {
    let m = text.match(/[（(]\s*本题\s*(?:满分)?\s*(\d+(?:\.\d+)?)\s*分\s*[)）]/);
    if (m) return parseFloat(m[1]);
    m = text.match(/[（(]\s*(\d+(?:\.\d+)?)\s*分\s*[)）]/);
    if (m) return parseFloat(m[1]);
    if (type === "choice") return subject === "cs408" ? 2 : subject.indexOf("english") === 0 ? 2 : 5;
    if (type === "blank") return subject === "cs408" ? 2 : 5;
    if (type === "cloze") return 0.5;
    if (type === "read" || type === "newtype") return 2;
    if (type === "translate") return subject === "english2" ? 15 : 2;
    if (type === "writing") {
      const short = /letter|书信|通知|100\s*words|约\s*100\s*词|Part\s*A/i.test(text);
      if (subject === "english2") return short ? 10 : 15;
      return short ? 10 : 20;
    }
    if (type === "application") return 10;
    return subject === "cs408" ? 10 : 10;
  }

  function guessDifficulty(q) {
    const stem = q.stem || "";
    const len = stem.length;
    let d = 2;
    if (q.type === "choice") d = len < 55 ? 1 : len > 170 ? 3 : 2;
    else if (q.type === "blank") d = len < 55 ? 1 : 2;
    else if (q.type === "cloze") d = 2;
    else if (q.type === "read") d = len > 110 ? 2 : 1;
    else if (q.type === "writing") d = 3;
    else if (q.type === "application") d = 3;
    else d = 2;
    if (/证明|讨论|恒成立|至少存在|参数.{0,6}范围|综合|比较.{0,4}大小/.test(stem)) d = Math.min(3, d + 1);
    if (/求极限|求导|求积分|计算|解方程|求值/.test(stem) && len < 70 && q.type !== "solution") d = Math.max(1, d - 1);
    return d;
  }

  /* ---------------- knowledge point classifier ---------------- */
  const KP_KEYWORDS = {
    "m-calc-1-1": ["极限", "趋于", "lim", "洛必达", "夹逼"],
    "m-calc-1-2": ["无穷小", "阶的比较", "高阶", "同阶", "等价无穷小"],
    "m-calc-1-3": ["连续", "间断", "间断点", "零点定理"],
    "m-calc-2-1": ["导数", "微分", "求导", "切线", "法线"],
    "m-calc-2-2": ["单调", "极值", "极小值", "极大值", "最值", "凹凸", "拐点"],
    "m-calc-2-3": ["中值定理", "罗尔", "拉格朗日", "柯西中值", "证明", "可导", "存在ξ"],
    "m-calc-3-1": ["不定积分", "原函数", "换元积分", "分部积分"],
    "m-calc-3-2": ["定积分", "积分上限", "面积", "旋转体", "弧长", "积分"],
    "m-calc-4-1": ["偏导数", "全微分", "复合函数求导", "隐函数"],
    "m-calc-4-2": ["多元函数极值", "条件极值", "拉格朗日乘数", "最大值", "最小值"],
    "m-calc-5-1": ["二重积分", "三重积分", "极坐标", "积分区域"],
    "m-calc-6-1": ["幂级数", "收敛半径", "收敛域", "收敛区间"],
    "m-calc-6-2": ["级数求和", "傅里叶", "展开式", "和函数"],
    "m-calc-7-1": ["微分方程", "通解", "特解", "一阶线性", "齐次方程"],
    "m-calc-8-1": ["向量", "平面方程", "直线方程", "法向量", "空间解析几何"],
    "m-lin-1": ["行列式", "余子式", "代数余子式"],
    "m-lin-2": ["矩阵", "逆矩阵", "秩", "初等变换", "伴随矩阵"],
    "m-lin-3": ["线性方程组", "向量组", "线性相关", "线性无关", "基础解系", "极大无关组"],
    "m-lin-4": ["特征值", "特征向量", "二次型", "相似对角化", "正定", "正交变换"],
    "m-prob-1": ["随机事件", "概率", "条件概率", "全概率", "贝叶斯"],
    "m-prob-2": ["随机变量", "分布函数", "概率密度", "正态分布", "二项分布"],
    "m-prob-3": ["数学期望", "方差", "协方差", "相关系数", "数字特征"],
    "m-prob-4": ["数理统计", "样本", "估计量", "置信区间", "假设检验", "最大似然"],
    "c-ds-1": ["线性表", "顺序表", "链表", "单链表", "循环链表"],
    "c-ds-2": ["栈", "队列", "出栈", "入栈", "循环队列"],
    "c-ds-3": ["二叉树", "树", "遍历", "哈夫曼", "线索二叉树", "平衡二叉树"],
    "c-ds-4": ["图", "邻接矩阵", "邻接表", "最短路径", "拓扑排序", "最小生成树"],
    "c-ds-5": ["查找", "折半查找", "哈希", "散列表", "B树", "二叉排序树"],
    "c-ds-6": ["排序", "快速排序", "归并排序", "堆排序", "稳定性", "时间复杂度"],
    "c-co-1": ["补码", "原码", "反码", "浮点数", "溢出", "进制"],
    "c-co-2": ["存储", "Cache", "主存", "虚拟存储器", "页表", "TLB"],
    "c-co-3": ["指令", "CPU", "流水线", "控制器", "数据通路", "中断"],
    "c-co-4": ["总线", "I/O", "DMA", "中断方式", "磁盘"],
    "c-os-1": ["进程", "线程", "调度", "同步", "互斥", "PV", "死锁"],
    "c-os-2": ["内存管理", "分页", "分段", "页面置换", "虚拟内存"],
    "c-os-3": ["文件系统", "目录", "索引节点", "inode", "磁盘分配"],
    "c-os-4": ["I/O管理", "设备管理", "缓冲", "SPOOLing"],
    "c-net-1": ["体系结构", "OSI", "TCP/IP", "分层"],
    "c-net-2": ["数据链路层", "以太网", "CSMA", "CRC", "交换机"],
    "c-net-3": ["网络层", "IP", "路由", "子网", "CIDR", "ARP"],
    "c-net-4": ["传输层", "TCP", "UDP", "拥塞控制", "三次握手", "滑动窗口"],
    "c-net-5": ["应用层", "HTTP", "DNS", "SMTP", "FTP"],
    "e-cloze": ["完形填空", "blank", "context"],
    "e-read-1": ["细节", "according", "paragraph", "true", "mentioned"],
    "e-read-2": ["主旨", "main idea", "title", "purpose", "mainly"],
    "e-read-3": ["词义", "means", "word", "phrase", "closest"],
    "e-read-4": ["态度", "tone", "attitude", "author"],
    "e-new": ["新题型", "part b", "paragraph", "heading", "match"],
    "e-trans": ["翻译", "translate", "translation"],
    "e-write": ["写作", "essay", "write", "letter", "composition"],
  };

  function isKpAllowed(id, subject) {
    if (!subject) return true;
    if (subject === "math2") return id.indexOf("m-prob") !== 0 && id.indexOf("m-calc-6") !== 0 && id.indexOf("m-calc-8") !== 0;
    if (subject === "math3") return id.indexOf("m-calc-8") !== 0;
    return true;
  }

  function allowedKps(subject) {
    const s = U.subjectOf(subject);
    if (!s) return [];
    const m = U.treeMap(s.group);
    const out = [];
    Object.keys(m).forEach((id) => {
      const entry = m[id];
      if (entry.node.children && entry.node.children.length) return;
      if (s.group === "math" && !isKpAllowed(id, subject)) return;
      out.push({ id: id, name: entry.path.map((n) => n.name).join(" / "), leaf: entry.node.name });
    });
    return out;
  }

  function classifyKp(q, subject) {
    const group = (U.subjectOf(subject) || {}).group;
    const allowed = {};
    allowedKps(subject).forEach((k) => (allowed[k.id] = true));
    if (group === "en") {
      if (q.type === "cloze") return "e-cloze";
      if (q.type === "newtype") return "e-new";
      if (q.type === "translate") return "e-trans";
      if (q.type === "writing") return "e-write";
      if (q.type === "read" || q.type === "choice") {
        const hay = (q.stem + " " + (q.options || []).join(" ")).toLowerCase();
        if (/main idea|mainly|title|purpose|主旨/.test(hay)) return "e-read-2";
        if (/tone|attitude|态度|语气/.test(hay)) return "e-read-4";
        if (/means|word|phrase|词义|closest/.test(hay)) return "e-read-3";
        return "e-read-1";
      }
      return "e-read-1";
    }
    if (group === "math" && q.type === "proof") return "m-calc-2-3";
    const hay = (q.stem + " " + (q.options || []).join(" ")).toLowerCase();
    let best = "";
    let bestScore = 0;
    Object.keys(KP_KEYWORDS).forEach((id) => {
      if (!allowed[id]) return;
      let sc = 0;
      KP_KEYWORDS[id].forEach((kw) => {
        if (hay.indexOf(kw.toLowerCase()) >= 0) sc += kw.length >= 3 ? 3 : 2;
      });
      if (sc > bestScore) {
        bestScore = sc;
        best = id;
      }
    });
    if (best) return best;
    const list = Object.keys(allowed);
    if (group === "cs") {
      if (q.type === "application") return list[0] || "c-ds-1";
      return list[0] || "c-ds-1";
    }
    if (subject === "math2") return "m-calc-1-1";
    return list[0] || "m-calc-1-1";
  }

  /* ---------------- segmentation ---------------- */
  function finalizeBlock(block, subject, opts) {
    const all = block.lines;
    const splitAt = all.findIndex((l) =>
      /^\s*[【\[]?\s*(答案|解析|分析)\s*[】\]]?\s*[:：]/.test(l.text) || /【\s*(答案|解析|分析)\s*】/.test(l.text)
    );
    const bodyLines = splitAt >= 0 ? all.slice(0, splitAt) : all;
    const tailText = splitAt >= 0 ? joinText(all.slice(splitAt)) : "";
    const opt = extractOptions(bodyLines);
    let stemLines = opt.firstLine >= 0 ? bodyLines.slice(0, opt.firstLine) : bodyLines;
    let stem = joinText(stemLines);
    if (opt.firstPrefix) stem = joinText(stemLines.concat([{ text: opt.firstPrefix }]));
    stem = stem
      .replace(/^\s*[（(]\s*本题\s*满分\s*\d+(?:\.\d+)?\s*分\s*[)）]\s*/, "")
      .replace(/^\s*[（(]\s*\d+(?:\.\d+)?\s*分\s*[)）]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    let type = block.section || "";
    const keepSection = ["cloze", "read", "newtype", "translate", "writing", "application"].indexOf(type) >= 0;
    if (opt.options.length >= 3 && !keepSection) type = "choice";
    if (!stem && type === "cloze") stem = "完形填空第 " + block.num + " 题（见材料）";
    if (!stem && type === "read") stem = "阅读理解第 " + block.num + " 题（见材料）";
    if (!type) {
      if (opt.options.length >= 3) type = "choice";
      else if (/_{2,}|（\s*）/.test(stem)) type = "blank";
      else if (/证明/.test(stem)) type = "proof";
      else type = "solution";
    }
    if (type === "solution" && /证明|求证/.test(stem)) type = "proof";
    if (type === "choice" && opt.options.length < 3) type = "solution";

    const inline = splitAnswer(tailText);
    let answer = inline.answer;
    let analysis = inline.analysis;
    let answerIndex = null;
    if (opt.options.length >= 3 && /^[A-D]$/i.test(answer.trim())) {
      answerIndex = "ABCD".indexOf(answer.trim().toUpperCase());
    }
    if (opt.options.length >= 3 && answerIndex == null) {
      const m = answer.match(/[（(]?\s*([A-D])\s*[)）]?\s*$/);
      if (m) {
        answerIndex = "ABCD".indexOf(m[1]);
        answer = m[1];
      }
    }

    const bboxLines = bodyLines.length ? bodyLines : all;
    let x1 = Infinity, x2 = -Infinity, yBot = Infinity, yTop = -Infinity;
    bboxLines.forEach((l) => {
      x1 = Math.min(x1, l.x1);
      x2 = Math.max(x2, l.x2);
      yBot = Math.min(yBot, l.yBot);
      yTop = Math.max(yTop, l.yTop);
    });
    if (!isFinite(x1)) {
      x1 = 0; x2 = 0; yBot = 0; yTop = 0;
    }

    const q = {
      num: block.num,
      subject: subject,
      subjectName: (U.subjectOf(subject) || {}).name || subject,
      group: (U.subjectOf(subject) || {}).group || "",
      type: type,
      typeName: TYPE_NAMES[type] || "题目",
      score: parseScore(stem + " " + (block.head || ""), type, subject),
      stem: stem || "（未识别到题干）",
      options: opt.options,
      answer: answer,
      analysis: analysis,
      answerIndex: answerIndex,
      difficulty: 0,
      section: block.section || "",
      pageNo: block.pageNo,
      bbox: { x1: x1, x2: x2, y1: yBot, y2: yTop },
      passage: block.passage || "",
      passageTitle: block.passageTitle || "",
      confidence: (stem ? 2 : 0) + (opt.options.length >= 3 ? 2 : 0) + (answer ? 2 : 0),
      raw: joinText(all),
    };
    q.difficulty = guessDifficulty(q);
    q.kpId = classifyKp(q, subject);
    q.difficultyName = DIFF_NAMES[q.difficulty];
    return q;
  }

  function segmentPages(pages, subject) {
    const blocks = [];
    let current = null;
    let section = "";
    let answerMode = false;
    let lastNum = 0;
    let pending = [];
    let sectionPassage = "";
    let sectionPassageTitle = "";
    const answerMap = {};

    function closeBlock() {
      if (current) {
        current.passage = current.passage || "";
        blocks.push(current);
        current = null;
      }
    }

    function takePassage() {
      const isEn = ["cloze", "read", "newtype"].indexOf(section) >= 0;
      if (!isEn) return;
      const titleLine = pending.find((l) => /^Text\s*\d+/i.test(l.text.trim()));
      const body = pending.filter(
        (l) => !/^Directions\s*[:：]/i.test(l.text.trim()) && !/^Text\s*\d+/i.test(l.text.trim())
      );
      const joined = joinText(body);
      if (joined.length >= 60) {
        sectionPassage = joined;
        sectionPassageTitle = titleLine
          ? titleLine.text.trim().slice(0, 30)
          : section === "cloze"
          ? "完形填空材料"
          : "阅读材料";
      }
    }

    pages.forEach((page) => {
      const lines = page.lines.slice().sort((a, b) => (a.col - b.col) || (b.yTop - a.yTop) || (a.x1 - b.x1));
      lines.forEach((line) => {
        const text = line.text;
        const st = sectionType(text);
        if (st && !/^\d/.test(text)) {
          closeBlock();
          if (st !== "section") section = st;
          answerMode = isAnswerHeading(text);
          lastNum = 0;
          pending = [];
          sectionPassage = "";
          sectionPassageTitle = "";
          return;
        }
        if (isAnswerHeading(text)) {
          closeBlock();
          answerMode = true;
          return;
        }
        if (answerMode) {
          // compact answer line: 1.A 2.B 3.C
          const re = /(\d{1,3})\s*[.．、:：]?\s*([A-D])(?=\s|$)/g;
          const compact = [];
          let cm;
          while ((cm = re.exec(text))) compact.push([+cm[1], cm[2]]);
          if (compact.length >= 2) {
            compact.forEach((x) => (answerMap[x[0]] = [x[1]]));
            return;
          }
          const am = text.match(/^\s*(\d{1,3})\s*[.．、:：]?\s*(.*)$/);
          if (am) {
            const n = +am[1];
            if (!answerMap[n]) answerMap[n] = [];
            if (am[2]) answerMap[n].push(am[2]);
            lastNum = n;
          } else if (lastNum && answerMap[lastNum]) {
            answerMap[lastNum].push(text);
          }
          return;
        }
        const start = matchStart(text, section, lastNum);
        if (start) {
          closeBlock();
          takePassage();
          if (!section) section = "";
          current = {
            num: start.num,
            section: section,
            pageNo: page.pageNo,
            head: text,
            lines: [],
            passage: ["cloze", "read", "newtype"].indexOf(section) >= 0 ? sectionPassage : "",
            passageTitle: sectionPassageTitle,
          };
          lastNum = start.num;
          pending = [];
          if (start.rest) current.lines.push(Object.assign({}, line, { text: start.rest }));
          return;
        }
        if (current) {
          current.lines.push(line);
        } else if (!answerMode) {
          pending.push(line);
        }
      });
    });
    closeBlock();

    const out = blocks.map((b) => finalizeBlock(b, subject));
    out.forEach((q) => {
      const ans = answerMap[q.num];
      if (ans && ans.length) {
        const text = joinText(ans.map((t) => ({ text: t })));
        const sp = splitAnswer(text);
        if (!q.answer && sp.answer) q.answer = sp.answer;
        if (!q.analysis && sp.analysis) q.analysis = sp.analysis;
        if (!q.answer && !sp.answer && text) q.answer = text;
        if (q.options && q.options.length >= 3 && /^[A-D]$/i.test(String(q.answer).trim())) {
          q.answerIndex = "ABCD".indexOf(String(q.answer).trim().toUpperCase());
        }
      }
      if (q.answer) q.confidence += 2;
      if (q.passage) q.passageTitle = q.passageTitle || "阅读材料（自动提取）";
    });
    return out.filter((q) => q.stem.length > 3 && q.num > 0);
  }

  async function parsePdf(file, subject, onProgress) {
    if (!window.pdfjsLib) throw new Error("PDF 解析组件未加载");
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/js/vendor/pdf.worker.min.js";
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: data, useSystemFonts: true }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress && onProgress({ phase: "read", page: i, pages: pdf.numPages, pct: Math.round((i / pdf.numPages) * 70) });
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      pages.push({
        pageNo: i,
        width: vp.width,
        height: vp.height,
        lines: buildLines(tc.items, vp.width, vp.height),
      });
      await new Promise((r) => setTimeout(r, 0));
    }
    const questions = segmentPages(pages, subject);
    return { pdf: pdf, pages: pages, questions: questions };
  }

  async function cropQuestionImages(pdf, rows, onProgress) {
    const byPage = {};
    rows.forEach((r, i) => {
      if (!r.bbox || !r.pageNo) return;
      (byPage[r.pageNo] = byPage[r.pageNo] || []).push({ row: r, index: i });
    });
    const pageNos = Object.keys(byPage).map(Number);
    const out = {};
    const scale = 2.7;
    for (let pi = 0; pi < pageNos.length; pi++) {
      const pageNo = pageNos[pi];
      onProgress && onProgress({ phase: "crop", page: pi + 1, pages: pageNos.length, pct: Math.round(70 + ((pi + 1) / pageNos.length) * 28) });
      const page = await pdf.getPage(pageNo);
      const vp = page.getViewport({ scale: scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const items = byPage[pageNo];
      for (let k = 0; k < items.length; k++) {
        const row = items[k].row;
        const b = row.bbox;
        const p1 = vp.convertToViewportPoint(b.x1, b.y2);
        const p2 = vp.convertToViewportPoint(b.x2, b.y1);
        let sx = Math.max(0, Math.min(p1[0], p2[0]) - 10);
        let sy = Math.max(0, Math.min(p1[1], p2[1]) - 8);
        let sw = Math.min(canvas.width - sx, Math.abs(p2[0] - p1[0]) + 20);
        let sh = Math.min(canvas.height - sy, Math.abs(p2[1] - p1[1]) + 16);
        if (sw < 30 || sh < 18) continue;
        const tmp = document.createElement("canvas");
        const ratio = Math.min(1, 1300 / sw);
        tmp.width = Math.round(sw * ratio);
        tmp.height = Math.round(sh * ratio);
        tmp.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
        const blob = await new Promise((resolve) => tmp.toBlob(resolve, "image/jpeg", 0.82));
        if (blob) out[items[k].index] = blob;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    onProgress && onProgress({ phase: "crop", page: pageNos.length, pages: pageNos.length, pct: 99 });
    return out;
  }

  /* ---------------- import page ---------------- */
  function kpOptionsFor(subject) {
    return allowedKps(subject);
  }
  function typeOptionsFor(subject) {
    const group = (U.subjectOf(subject) || {}).group;
    if (group === "en") return ["choice", "cloze", "read", "newtype", "translate", "writing"];
    if (group === "cs") return ["choice", "application", "solution", "proof"];
    return ["choice", "blank", "solution", "proof"];
  }

  YT.components.ImportView = {
    data() {
      const year = new Date().getFullYear();
      return {
        S: S,
        D: D,
        U: U,
        typeNames: TYPE_NAMES,
        subjectId: "math2",
        year: year,
        difficultyMode: "auto",
        keepImage: true,
        fileName: "",
        fileSize: 0,
        dragging: false,
        parsing: false,
        importing: false,
        progress: 0,
        progressText: "",
        rows: [],
        parsedPdf: null,
        parseWarning: "",
        expanded: {},
        bulkType: "",
        bulkDiff: "",
        batches: S.importedBatches,
        error: "",
      };
    },
    computed: {
      subject() {
        return U.subjectOf(this.subjectId);
      },
      group() {
        return this.subject ? this.subject.group : "math";
      },
      kpOptions() {
        return kpOptionsFor(this.subjectId);
      },
      typeOptions() {
        return typeOptionsFor(this.subjectId);
      },
      selectedRows() {
        return this.rows.filter((r) => r.include);
      },
      selectedCount() {
        return this.selectedRows.length;
      },
      lowConfidenceCount() {
        return this.rows.filter((r) => r.confidence < 4).length;
      },
      yearOptions() {
        const out = [];
        for (let y = new Date().getFullYear(); y >= 2000; y--) out.push(y);
        return out;
      },
      hasFile() {
        return !!this.fileName;
      },
      canKeepImage() {
        return this.group !== "en";
      },
    },
    watch: {
      subjectId(v) {
        const s = U.subjectOf(v);
        if (s && s.group === "en") this.keepImage = false;
      },
    },
    methods: {
      go: U.go,
      pickFile() {
        this.$refs.fileInput && this.$refs.fileInput.click();
      },
      onDrop(e) {
        this.dragging = false;
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this.handleFile(f);
      },
      onFile(e) {
        const f = e.target.files && e.target.files[0];
        if (f) this.handleFile(f);
        e.target.value = "";
      },
      async handleFile(file) {
        this.error = "";
        this.parseWarning = "";
        if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
          this.error = "请选择 PDF 文件";
          return;
        }
        if (file.size > 30 * 1024 * 1024) {
          this.error = "文件超过 30MB，建议先在本地压缩或拆分后再上传。";
          return;
        }
        this.fileName = file.name;
        this.fileSize = file.size;
        this.rows = [];
        this.expanded = {};
        this.parsing = true;
        this.progress = 2;
        this.progressText = "正在读取 PDF…";
        try {
          const res = await parsePdf(file, this.subjectId, (p) => {
            this.progress = p.pct;
            this.progressText = p.phase === "read" ? "正在提取文字 " + p.page + " / " + p.pages + " 页" : "正在生成原题截图…";
          });
          this.parsedPdf = Vue.markRaw(res.pdf);
          const qs = res.questions;
          if (!qs.length) {
            this.parseWarning = "没有识别到题目。这个 PDF 可能是扫描版（没有文字层），纯前端无法直接解析；请先用 OCR 工具转成带文字层的 PDF，或换一份电子版。";
            this.rows = [];
          } else {
            const fnameYear = (file.name.match(/20\d{2}/) || [])[0];
            if (fnameYear && +fnameYear >= 2000) this.year = +fnameYear;
            else {
              const firstLines = res.pages && res.pages[0] ? res.pages[0].lines.slice(0, 6).map((l) => l.text).join(" ") : "";
              const titleYear = firstLines.match(/(20\d{2})\s*年/);
              if (titleYear) this.year = +titleYear[1];
            }
            this.rows = qs.map((q, i) => {
              const diff = this.difficultyMode === "auto" ? q.difficulty : +this.difficultyMode;
              return {
                key: "r" + i,
                include: true,
                num: q.num,
                type: q.type,
                kpId: q.kpId,
                difficulty: diff,
                score: q.score,
                stem: q.stem,
                optionsText: (q.options || []).join("\n"),
                answer: q.answer || "",
                analysis: q.analysis || "",
                passage: q.passage || "",
                passageTitle: q.passageTitle || "",
                confidence: q.confidence,
                pageNo: q.pageNo,
                bbox: q.bbox,
                answerIndex: q.answerIndex,
              };
            });
          }
          this.progress = 100;
          this.progressText = "解析完成";
        } catch (e) {
          console.error(e);
          this.error = "解析失败：" + (e && e.message ? e.message : "未知错误");
        } finally {
          this.parsing = false;
        }
      },
      toggleRow(key) {
        this.expanded[key] = !this.expanded[key];
      },
      toggleAll(v) {
        this.rows.forEach((r) => (r.include = v));
      },
      invertAll() {
        this.rows.forEach((r) => (r.include = !r.include));
      },
      applyBulkType() {
        if (!this.bulkType) return;
        this.selectedRows.forEach((r) => (r.type = this.bulkType));
      },
      applyBulkDiff() {
        if (!this.bulkDiff) return;
        this.selectedRows.forEach((r) => (r.difficulty = +this.bulkDiff));
      },
      removeRow(row) {
        const i = this.rows.indexOf(row);
        if (i >= 0) this.rows.splice(i, 1);
      },
      resetParse() {
        if (this.parsedPdf) {
          try { this.parsedPdf.destroy(); } catch (e) { /* ignore */ }
        }
        this.parsedPdf = null;
        this.fileName = "";
        this.fileSize = 0;
        this.rows = [];
        this.progress = 0;
        this.error = "";
        this.parseWarning = "";
      },
      fmtSize(n) {
        if (!n) return "";
        return (n / 1024 / 1024).toFixed(1) + " MB";
      },
      kpLabel(id) {
        return U.kpName(id);
      },
      typeLabel(t) {
        return TYPE_NAMES[t] || t;
      },
      diffLabel(d) {
        return DIFF_NAMES[d] || "一般";
      },
      async doImport() {
        const rows = this.selectedRows.filter((r) => r.stem && r.stem.trim());
        if (!rows.length) {
          this.error = "请至少勾选一道题目";
          return;
        }
        this.importing = true;
        this.error = "";
        this.progress = 0;
        this.progressText = "";
        try {
          let images = {};
          if (this.keepImage && this.canKeepImage && this.parsedPdf) {
            const croppedRows = rows.map((r, i) => ({ bbox: r.bbox, pageNo: r.pageNo, index: i }));
            const map = await cropQuestionImages(this.parsedPdf, croppedRows, (p) => {
              this.progress = p.pct;
              this.progressText = "正在生成原题截图 " + p.page + " / " + p.pages;
            });
            images = map;
          }
          const batchId = "b" + Date.now();
          const questions = [];
          const imageRecords = [];
          rows.forEach((r, i) => {
            const qid = "imp-" + batchId + "-" + (i + 1);
            const imageId = images[i] ? "img-" + qid : "";
            if (images[i]) imageRecords.push({ id: imageId, blob: images[i] });
            const opts = String(r.optionsText || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
            const hasOptions = ["choice", "cloze", "read", "newtype"].indexOf(r.type) >= 0;
            let answerIndex = null;
            if (hasOptions && /^[A-D]$/i.test(String(r.answer).trim())) {
              answerIndex = "ABCD".indexOf(String(r.answer).trim().toUpperCase());
            }
            questions.push({
              id: qid,
              subject: this.subjectId,
              subjectName: this.subject.name,
              group: this.subject.group,
              kpId: r.kpId,
              year: this.year,
              indexNo: r.num,
              type: r.type,
              typeName: TYPE_NAMES[r.type] || "题目",
              score: +r.score || 0,
              stem: r.stem.trim(),
              options: hasOptions ? opts : [],
              answerIndex: answerIndex,
              answer: r.answer.trim(),
              analysis: r.analysis.trim(),
              difficulty: +r.difficulty || 2,
              difficultyName: DIFF_NAMES[+r.difficulty || 2],
              passage: r.passage || "",
              passageTitle: r.passage ? r.passageTitle || "阅读材料" : "",
              source: "PDF 导入",
              imported: true,
              batchId: batchId,
              imageId: imageId,
              pageNo: r.pageNo,
              questionNo: r.num,
            });
          });
          const batch = {
            id: batchId,
            name: this.fileName.replace(/\.pdf$/i, ""),
            fileName: this.fileName,
            subject: this.subjectId,
            subjectName: this.subject.name,
            year: this.year,
            count: questions.length,
            createdAt: Date.now(),
            withImages: !!this.keepImage,
          };
          await YT.importStore.addBatch(batch, questions, imageRecords);
          this.batches = S.importedBatches;
          U.toast("已导入 " + questions.length + " 道题");
          this.resetParse();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
          console.error(e);
          this.error = "导入失败：" + (e && e.message ? e.message : "存储空间不足");
        } finally {
          this.importing = false;
        }
      },
      deleteBatch(b) {
        U.askConfirm("删除这批导入题？", "「" + b.name + "」的 " + b.count + " 道题、错题记录和收藏都会一并删除，无法恢复。", async () => {
          await YT.importStore.deleteBatch(b.id);
          this.batches = S.importedBatches;
          U.toast("已删除导入批次");
        });
      },
      goAssembly() {
        U.go("/assembly");
      },
    },
    beforeUnmount() {
      if (this.parsedPdf) {
        try { this.parsedPdf.destroy(); } catch (e) { /* ignore */ }
      }
    },
    template: `
    <main class="import-page">
      <div class="container">
        <div class="page-head">
          <div class="page-head-left">
            <div class="crumb"><a href="#/" @click.prevent="go('/')">首页</a><span>/</span><b>导入题库</b></div>
            <h1>上传 PDF，自动拆题</h1>
            <p>文字层 PDF 本地解析 · 自动分配题型、考点与难度 · 可逐题校对后再入库</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn-ghost" @click="goAssembly"><Icon name="layers" :size="15" /> 去组卷</button>
          </div>
        </div>

        <section class="import-note card">
          <div class="import-note-icon"><Icon name="scan" :size="20" /></div>
          <div>
            <b>纯浏览器解析，文件不会上传到服务器</b>
            <p>支持带文字层的 PDF（大多数电子版真题）。扫描版需要先 OCR；数学公式和图形建议勾选「保留原题截图」，显示时以原卷为准。</p>
          </div>
        </section>

        <div class="import-layout">
          <section class="import-config card">
            <h2>1. 选择文件与归属</h2>
            <div class="import-drop" :class="{ dragging: dragging, filled: hasFile }"
              @click="pickFile" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
              <input ref="fileInput" type="file" accept="application/pdf,.pdf" hidden @change="onFile" />
              <span class="drop-icon"><Icon name="upload" :size="26" /></span>
              <b>{{ hasFile ? fileName : '点击选择或拖入 PDF' }}</b>
              <span>{{ hasFile ? fmtSize(fileSize) : '单个文件不超过 30 MB' }}</span>
              <em v-if="hasFile">重新选择</em>
            </div>

            <div class="form-row">
              <div class="form-item">
                <label>科目</label>
                <select class="select-input" v-model="subjectId" :disabled="parsing || importing">
                  <option v-for="s in D.subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="form-item">
                <label>年份</label>
                <select class="select-input" v-model="year" :disabled="parsing || importing">
                  <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
                </select>
              </div>
            </div>
            <p class="field-hint" v-if="subjectId === 'math2'">数学二只保留高数与线代考点，自动过滤概率论、无穷级数与空间解析几何。</p>

            <div class="form-item">
              <label>默认难度</label>
              <div class="segmented">
                <button :class="{on: difficultyMode === 'auto'}" @click="difficultyMode = 'auto'">自动判断</button>
                <button :class="{on: difficultyMode === '1'}" @click="difficultyMode = '1'">易</button>
                <button :class="{on: difficultyMode === '2'}" @click="difficultyMode = '2'">中</button>
                <button :class="{on: difficultyMode === '3'}" @click="difficultyMode = '3'">难</button>
              </div>
            </div>

            <label class="check-line" v-if="canKeepImage">
              <input type="checkbox" v-model="keepImage" />
              <span>保留原题截图（推荐数学）<em>公式、图形、表格以原卷呈现</em></span>
            </label>
            <p class="field-hint" v-else style="margin-top:2px">英语按文字与选项排版，不生成截图。</p>

            <div class="import-progress" v-if="parsing || importing">
              <div class="ip-head"><span>{{ progressText }}</span><b>{{ progress }}%</b></div>
              <div class="ip-bar"><i :style="{ width: progress + '%' }"></i></div>
            </div>

            <p class="import-error" v-if="error">{{ error }}</p>
            <p class="import-warn" v-if="parseWarning">{{ parseWarning }}</p>
          </section>

          <section class="import-batches card">
            <h2>我的导入 <span>{{ S.importedBatches.length }} 批</span></h2>
            <div v-if="S.importedBatches.length" class="batch-list">
              <div class="batch-item" v-for="b in S.importedBatches" :key="b.id">
                <span class="batch-ico"><Icon name="file" :size="18" /></span>
                <div class="batch-txt">
                  <b>{{ b.name }}</b>
                  <span>{{ b.subjectName }} · {{ b.year }} 年 · {{ b.count }} 题 · {{ U.timeStr(b.createdAt) }}</span>
                </div>
                <button class="btn btn-ghost btn-sm" @click="goAssembly">组卷</button>
                <button class="icon-btn" title="删除" @click="deleteBatch(b)"><Icon name="trash" :size="14" /></button>
              </div>
            </div>
            <div v-else class="batch-empty">
              <Icon name="file" :size="22" />
              <p>还没有导入过试卷。上传一份 PDF，拆好的题目会出现在智能组卷里。</p>
            </div>
          </section>
        </div>

        <section class="review-card card" v-if="rows.length">
          <div class="review-head">
            <div>
              <h2>2. 校对题目 <span>{{ rows.length }} 道</span></h2>
              <p>默认全部导入。题型、考点、难度、分值都可以直接改；低置信度的题建议重点检查。</p>
            </div>
            <div class="review-bulk">
              <button class="btn btn-ghost btn-sm" @click="toggleAll(true)">全选</button>
              <button class="btn btn-ghost btn-sm" @click="toggleAll(false)">全不选</button>
              <button class="btn btn-ghost btn-sm" @click="invertAll">反选</button>
            </div>
          </div>

          <div class="review-toolbar">
            <span>已选 <b>{{ selectedCount }}</b> 道</span>
            <span v-if="lowConfidenceCount" class="warn-dot">{{ lowConfidenceCount }} 道待确认</span>
            <div class="bulk-set">
              <select class="select-input" v-model="bulkType">
                <option value="">批量题型</option>
                <option v-for="t in typeOptions" :key="t" :value="t">{{ typeLabel(t) }}</option>
              </select>
              <button class="btn btn-ghost btn-sm" @click="applyBulkType">应用</button>
              <select class="select-input" v-model="bulkDiff">
                <option value="">批量难度</option>
                <option value="1">易</option>
                <option value="2">中</option>
                <option value="3">难</option>
              </select>
              <button class="btn btn-ghost btn-sm" @click="applyBulkDiff">应用</button>
            </div>
          </div>

          <div class="review-list">
            <article class="review-item" v-for="(r, i) in rows" :key="r.key" :class="{ off: !r.include, low: r.confidence < 4 }">
              <div class="review-top">
                <label class="review-check">
                  <input type="checkbox" v-model="r.include" />
                  <b>{{ r.num }}</b>
                </label>
                <div class="review-summary">
                  <p>{{ r.stem }}</p>
                  <div class="review-tags">
                    <span>{{ typeLabel(r.type) }}</span>
                    <span>{{ kpLabel(r.kpId) }}</span>
                    <span>{{ diffLabel(r.difficulty) }} · {{ r.score }} 分</span>
                    <span v-if="r.confidence < 4" class="tag-warn">待确认</span>
                    <span v-if="r.pageNo">第 {{ r.pageNo }} 页</span>
                  </div>
                </div>
                <button class="icon-btn" :title="expanded[r.key] ? '收起' : '编辑'" @click="toggleRow(r.key)">
                  <Icon :name="expanded[r.key] ? 'chev-down' : 'edit'" :size="15" />
                </button>
                <button class="icon-btn" title="移除" @click="removeRow(r)"><Icon name="x" :size="14" /></button>
              </div>

              <div class="review-edit" v-if="expanded[r.key]">
                <div class="form-item">
                  <label>题干</label>
                  <textarea class="comment-input" rows="3" v-model="r.stem"></textarea>
                </div>
                <div class="review-fields">
                  <div class="form-item">
                    <label>题型</label>
                    <select class="select-input" v-model="r.type">
                      <option v-for="t in typeOptions" :key="t" :value="t">{{ typeLabel(t) }}</option>
                    </select>
                  </div>
                  <div class="form-item">
                    <label>考点</label>
                    <select class="select-input" v-model="r.kpId">
                      <option v-for="k in kpOptions" :key="k.id" :value="k.id">{{ k.name }}</option>
                    </select>
                  </div>
                  <div class="form-item">
                    <label>难度</label>
                    <select class="select-input" v-model.number="r.difficulty">
                      <option :value="1">易</option>
                      <option :value="2">中</option>
                      <option :value="3">难</option>
                    </select>
                  </div>
                  <div class="form-item">
                    <label>分值</label>
                    <input class="text-input" type="number" step="0.5" min="0" v-model.number="r.score" />
                  </div>
                </div>
                <div class="form-item" v-if="r.type === 'choice'">
                  <label>选项（每行一个，按 A/B/C/D 顺序）</label>
                  <textarea class="comment-input" rows="4" v-model="r.optionsText"></textarea>
                </div>
                <div class="form-item">
                  <label>答案</label>
                  <input class="text-input" v-model="r.answer" placeholder="选择题填 A/B/C/D；主观题填参考答案" />
                </div>
                <div class="form-item">
                  <label>解析</label>
                  <textarea class="comment-input" rows="3" v-model="r.analysis"></textarea>
                </div>
                <p class="review-raw" v-if="r.passage">已提取阅读材料，共 {{ r.passage.length }} 字符</p>
              </div>
            </article>
          </div>

          <div class="review-foot">
            <p>导入后可在「智能组卷」中按标准卷型、难度和题型抽题。</p>
            <button class="btn btn-primary btn-lg" :disabled="importing || !selectedCount" @click="doImport">
              <Icon name="upload" :size="16" /> {{ importing ? '正在导入…' : '导入 ' + selectedCount + ' 道题' }}
            </button>
          </div>
        </section>

        <section class="import-guide card" v-if="!rows.length && !parsing">
          <h2>解析规则与边界</h2>
          <div class="guide-grid">
            <div><b>题型</b><p>按「选择题 / 填空题 / 解答题 / 综合应用题 / 完形 / 阅读 / 新题型 / 翻译 / 写作」识别。选择题优先看 A-D 选项，其次看大题标题。</p></div>
            <div><b>考点</b><p>用题干关键词匹配现有考点树。数学二会自动排除概率论、无穷级数和空间解析几何。</p></div>
            <div><b>难度</b><p>按题型、题干长度和关键词粗判易/中/难；导入前可以逐题改，组卷时再按难度筛选。</p></div>
            <div><b>答案</b><p>能识别【答案】【解析】和卷末「参考答案」；识别不到时留空，不会编造答案。</p></div>
          </div>
        </section>
      </div>
    </main>`,
  };
})();

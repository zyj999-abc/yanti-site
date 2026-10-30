/* Core: data helpers, store, router, shared UI */
(function () {
  const D = window.APP_DATA;
  const YT = (window.YT = window.YT || { components: {} });
  YT.data = D;

  /* ---------------- utils ---------------- */
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const fmt = (s) => esc(s).replace(/\n/g, "<br>");
  const para = (s) =>
    String(s || "")
      .split(/\n{2,}/)
      .map((p) => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>")
      .join("");

  const plain = (s) =>
    String(s || "")
      .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
      .replace(/\\cdot/g, "·")
      .replace(/\\times/g, "×")
      .replace(/\\leq?/g, "≤")
      .replace(/\\geq?/g, "≥")
      .replace(/\\infty/g, "∞")
      .replace(/\\to/g, "→")
      .replace(/\\pm/g, "±")
      .replace(/\$[^$]*\$/g, (m) => m.replace(/\$/g, " "))
      .replace(/\\[a-zA-Z]+/g, " ")
      .replace(/[{}\\]/g, " ")
      .replace(/[\^_]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad = (n) => String(n).padStart(2, "0");

  function dateStr(ts) {
    const d = new Date(ts || Date.now());
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function timeStr(ts) {
    const d = new Date(ts || Date.now());
    return dateStr(ts) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function relTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + " 天前";
    return dateStr(ts);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------------- indexes ---------------- */
  const subjectMap = {};
  D.subjects.forEach((s) => (subjectMap[s.id] = s));

  const treeCache = {};
  function flattenTree(tree) {
    const map = {};
    function walk(nodes, chain) {
      nodes.forEach((n) => {
        const path = chain.concat(n);
        map[n.id] = { node: n, path: path };
        if (n.children) walk(n.children, path);
      });
    }
    walk(tree, []);
    return map;
  }
  function treeMap(group) {
    if (!treeCache[group]) treeCache[group] = flattenTree(D.groups[group].tree);
    return treeCache[group];
  }
  function nodeMapFor(subject) {
    const s = subjectMap[subject];
    return s ? treeMap(s.group) : {};
  }
  function descendants(node) {
    if (!node) return [];
    let out = [node.id];
    (node.children || []).forEach((c) => (out = out.concat(descendants(c))));
    return out;
  }
  function kpName(id) {
    for (const g of Object.keys(D.groups)) {
      const m = treeMap(g);
      if (m[id]) return m[id].node.name;
    }
    return id;
  }
  function kpPath(id) {
    for (const g of Object.keys(D.groups)) {
      const m = treeMap(g);
      if (m[id]) return m[id].path.map((n) => n.name);
    }
    return [];
  }

  function wrapMath(s) {
    if (!s) return s;
    if (s.indexOf("$") >= 0) return s;
    if (/[\\^_]/.test(s)) return "$" + s + "$";
    return s;
  }

  const qBySubject = {};
  const qById = {};

  function rebuildIndexes() {
    Object.keys(qBySubject).forEach((k) => delete qBySubject[k]);
    Object.keys(qById).forEach((k) => delete qById[k]);
    D.questions.forEach((q) => {
      q.kpName = kpName(q.kpId);
      if (q.group === "math" && !q.imported) {
        if (q.options && q.options.length) q.options = q.options.map(wrapMath);
        q.answer = wrapMath(q.answer);
      }
      (qBySubject[q.subject] = qBySubject[q.subject] || []).push(q);
      qById[q.id] = q;
    });
    Object.keys(qBySubject).forEach((k) =>
      qBySubject[k].sort((a, b) => b.year - a.year || a.indexNo - b.indexNo)
    );
    return D.questions.length;
  }
  rebuildIndexes();

  function questionsOf(subject) {
    return qBySubject[subject] || [];
  }
  function questionById(id) {
    return qById[id] || null;
  }
  function subjectOf(id) {
    return subjectMap[id] || null;
  }
  function groupOf(subject) {
    const s = subjectMap[subject];
    return s ? D.groups[s.group] : null;
  }
  function questionsForNode(subject, nodeId) {
    const m = nodeMapFor(subject);
    const entry = m[nodeId];
    const ids = entry ? descendants(entry.node) : [nodeId];
    return questionsOf(subject).filter((q) => ids.indexOf(q.kpId) >= 0);
  }
  function nodeCount(subject, nodeId) {
    return questionsForNode(subject, nodeId).length;
  }
  function yearsOf(subject) {
    const ys = questionsOf(subject).map((q) => q.year);
    if (!ys.length) return [];
    const min = Math.min.apply(null, ys);
    const max = Math.max.apply(null, ys);
    const out = [];
    for (let y = min; y <= max; y++) out.push(y);
    return out;
  }
  function paperFullTitle(subjectId, year) {
    const s = subjectMap[subjectId];
    if (!s) return year + " 年真题";
    if (s.group === "math") {
      return year + " 年全国硕士研究生招生考试 数学（" + s.name.slice(-1) + "）";
    }
    if (s.group === "cs") return year + " 年全国硕士研究生招生考试 计算机学科专业基础（408）";
    return year + " 年全国硕士研究生招生考试 英语（" + (s.id === "english1" ? "一" : "二") + "）";
  }

  /* ---------------- route ---------------- */
  function parseRoute() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const qIndex = raw.indexOf("?");
    const path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const qs = qIndex >= 0 ? raw.slice(qIndex + 1) : "";
    const query = {};
    new URLSearchParams(qs).forEach((v, k) => (query[k] = v));
    const parts = path.split("/").filter(Boolean);
    return { path: path || "/", parts: parts, query: query };
  }
  function go(path) {
    if (("#" + path) === location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    location.hash = path;
  }

  /* ---------------- store ---------------- */
  const KEY = "yantidao_state_v1";
  const defaults = {
    user: { name: "", createdAt: null },
    wrong: [],
    mastery: {},
    favorites: [],
    practice: [],
    papers: [],
    comments: {},
    notes: {},
    lastSubject: "math1",
  };
  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      const saved = JSON.parse(raw);
      const out = JSON.parse(JSON.stringify(defaults));
      Object.keys(out).forEach((k) => {
        if (saved[k] != null) out[k] = saved[k];
      });
      if (!Array.isArray(out.wrong)) out.wrong = [];
      if (!Array.isArray(out.favorites)) out.favorites = [];
      if (!Array.isArray(out.practice)) out.practice = [];
      if (!Array.isArray(out.papers)) out.papers = [];
      if (typeof out.mastery !== "object" || Array.isArray(out.mastery)) out.mastery = {};
      if (typeof out.comments !== "object" || Array.isArray(out.comments)) out.comments = {};
      if (typeof out.notes !== "object" || Array.isArray(out.notes)) out.notes = {};
      return out;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  const S = Vue.reactive(
    Object.assign(loadState(), {
      route: parseRoute(),
      searchOpen: false,
      loginOpen: false,
      toast: { show: false, text: "" },
      confirm: { show: false, title: "", text: "", ok: null },
      menuOpen: false,
      printPaper: null,
      imageUrls: {},
      importedBatches: [],
      ready: true,
    })
  );

  function saveState() {
    try {
      const out = {};
      Object.keys(defaults).forEach((k) => (out[k] = S[k]));
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch (e) {
      /* ignore quota errors */
    }
  }
  Vue.watch(
    () => [S.user, S.wrong, S.mastery, S.favorites, S.practice, S.papers, S.comments, S.notes, S.lastSubject],
    saveState,
    { deep: true }
  );

  let toastTimer = null;
  function toast(text) {
    S.toast.text = text;
    S.toast.show = true;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (S.toast.show = false), 2400);
  }

  function askConfirm(title, text, ok) {
    S.confirm.title = title;
    S.confirm.text = text;
    S.confirm.ok = ok;
    S.confirm.show = true;
  }

  /* ---------------- user data mutations ---------------- */
  function isWrong(id) {
    return S.wrong.indexOf(id) >= 0;
  }
  function toggleWrong(id) {
    const i = S.wrong.indexOf(id);
    if (i >= 0) {
      S.wrong.splice(i, 1);
      toast("已移出错题本");
    } else {
      S.wrong.unshift(id);
      toast("已加入错题本");
    }
  }
  function addWrong(id) {
    if (!isWrong(id)) S.wrong.unshift(id);
  }
  function removeWrong(id) {
    const i = S.wrong.indexOf(id);
    if (i >= 0) S.wrong.splice(i, 1);
  }
  function isFav(id) {
    return S.favorites.indexOf(id) >= 0;
  }
  function toggleFav(id) {
    const i = S.favorites.indexOf(id);
    if (i >= 0) {
      S.favorites.splice(i, 1);
      toast("已取消收藏");
    } else {
      S.favorites.unshift(id);
      toast("已收藏");
    }
  }
  function setMastery(id, level) {
    if (level) {
      S.mastery[id] = level;
      if (level === 3) addWrong(id);
    } else {
      delete S.mastery[id];
    }
  }
  function addComment(id, text) {
    const name = S.user.name || "匿名研友";
    if (!S.comments[id]) S.comments[id] = [];
    S.comments[id].unshift({ name: name, text: text, at: Date.now() });
  }
  function saveNote(id, text) {
    if (text && text.trim()) S.notes[id] = text;
    else delete S.notes[id];
  }

  function addPractice(record) {
    S.practice.unshift(record);
    if (S.practice.length > 60) S.practice.length = 60;
  }
  function savePaper(paper) {
    S.papers.unshift(paper);
    if (S.papers.length > 30) S.papers.length = 30;
  }

  function startPractice(ids, meta) {
    if (!ids || !ids.length) {
      toast("当前条件下没有题目");
      return;
    }
    try {
      sessionStorage.setItem("yt_queue", JSON.stringify({ ids: ids, meta: meta || {} }));
    } catch (e) {
      /* ignore */
    }
    go("/practice");
  }
  function readQueue() {
    try {
      return JSON.parse(sessionStorage.getItem("yt_queue") || "null");
    } catch (e) {
      return null;
    }
  }

  function searchQuestions(keyword) {
    const k = keyword.trim().toLowerCase();
    if (!k) return [];
    const out = [];
    for (let i = 0; i < D.questions.length; i++) {
      const q = D.questions[i];
      const hay = (
        q.stem +
        " " +
        q.analysis +
        " " +
        q.passage +
        " " +
        kpName(q.kpId) +
        " " +
        q.subjectName +
        " " +
        q.year +
        " 第" +
        q.indexNo +
        "题"
      ).toLowerCase();
      if (hay.indexOf(k) >= 0) out.push(q);
      if (out.length >= 40) break;
    }
    return out;
  }

  /* ---------------- imported question images ---------------- */
  const imgLoading = {};
  function imageUrl(q) {
    if (!q || !q.imageId) return "";
    if (S.imageUrls[q.id]) return S.imageUrls[q.id];
    if (imgLoading[q.id]) return "";
    imgLoading[q.id] = true;
    const store = YT.importStore;
    if (!store) return "";
    store
      .getImage(q.imageId)
      .then((blob) => {
        if (!blob) return;
        S.imageUrls[q.id] = URL.createObjectURL(blob);
      })
      .catch(() => {})
      .then(() => {
        imgLoading[q.id] = false;
      });
    return "";
  }
  function dropImage(qid) {
    if (S.imageUrls[qid]) {
      try { URL.revokeObjectURL(S.imageUrls[qid]); } catch (e) { /* ignore */ }
      delete S.imageUrls[qid];
    }
  }

  /* ---------------- math rendering ---------------- */
  function renderMath(el) {
    if (!el || !window.renderMathInElement) return;
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
      });
    } catch (e) {
      /* ignore */
    }
  }

  /* ---------------- icon ---------------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 21c.7-4 3.7-6 7.5-6s6.8 2 7.5 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    "chev-down": '<path d="m6 9 6 6 6-6"/>',
    "chev-right": '<path d="m9 6 6 6-6 6"/>',
    "chev-left": '<path d="m15 6-6 6 6 6"/>',
    "arrow-right": '<path d="M4 12h16"/><path d="m14 6 6 6-6 6"/>',
    "arrow-left": '<path d="M20 12H4"/><path d="m10 18-6-6 6-6"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23.5z" transform="translate(0 -1)"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="m7.5 15 3.4-4.2 3 2.6L20 6.5"/>',
    check: '<path d="m4.5 12.5 5 5L20 6.5"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7L16.5 9"/>',
    "x-circle": '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.9z"/>',
    bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
    printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 21h16"/>',
    rotate: '<path d="M20 8V4h-4"/><path d="M20 4a9 9 0 1 0 1 9"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5"/><circle cx="12" cy="17.2" r=".8" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none"/>',
    filter: '<path d="M3.5 5h17l-6.5 7.5V20l-4-2v-5.5z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    play: '<path d="M8 5.5 19 12 8 18.5z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    folder: '<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 10.6a7 7 0 0 0 0 2L3 14.2l2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.6h5l.4-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5H5V6h5"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7"/>',
    zap: '<path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z"/>',
    flag: '<path d="M5 21V4"/><path d="M5 5c4-3 8 3 14 0v9c-6 3-10-3-14 0"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    graduation: '<path d="m12 4 9 4.5-9 4.5-9-4.5z"/><path d="M6.5 10.5V16c0 2 2.5 3.3 5.5 3.3s5.5-1.3 5.5-3.3v-5.5"/><path d="M21 8.5V15"/>',
    "arrow-up": '<path d="M12 20V4"/><path d="m6 10 6-6 6 6"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 17h5"/>',
    spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5 19.3 18l2.2.8-2.2.7-.8 2.5-.7-2.5-2.3-.7 2.3-.8z"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M7 12h10"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };

  YT.components.Icon = {
    props: { name: String, size: { type: [Number, String], default: 18 } },
    computed: {
      path() {
        return ICONS[this.name] || ICONS.info;
      },
    },
    template:
      '<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="path"></svg>',
  };

  /* ---------------- header ---------------- */
  YT.components.SiteHeader = {
    data() {
      return { S: S, menuOpen: false, D: D };
    },
    computed: {
      initial() {
        return (S.user.name || "研").slice(0, 1);
      },
      lastSubject() {
        return S.lastSubject || "math1";
      },
      isHome() {
        return S.route.path === "/";
      },
      studyYear() {
        const now = new Date();
        return now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
      },
      navItems() {
        return [
          { key: "home", label: "总览", en: "OVERVIEW", path: "/", icon: "home" },
          { key: "dashboard", label: "考点地图", en: "SYLLABUS MAP", path: "/dashboard/" + this.lastSubject, icon: "target" },
          { key: "papers", label: "年份档案", en: "YEAR ARCHIVE", path: "/papers/" + this.lastSubject, icon: "calendar" },
          { key: "assembly", label: "智能组卷", en: "PAPER BUILDER", path: "/assembly", icon: "layers" },
          { key: "import", label: "PDF 导入", en: "INGEST", path: "/import", icon: "upload" },
          { key: "wrong-book", label: "错题本", en: "ERROR LOG", path: "/wrong-book", icon: "flag" },
        ];
      },
      mobileItems() {
        const keep = ["home", "dashboard", "assembly", "import", "wrong-book"];
        const short = { home: "总览", dashboard: "考点", assembly: "组卷", import: "导入", "wrong-book": "错题" };
        return this.navItems
          .filter((i) => keep.indexOf(i.key) >= 0)
          .map((i) => Object.assign({}, i, { label: short[i.key] || i.label }));
      },
      activeKey() {
        const p = S.route.parts;
        if (!p.length) return "home";
        if (p[0] === "question") return "dashboard";
        if (p[0] === "practice") return "";
        if (p[0] === "assembly") return "assembly";
        if (p[0] === "import") return "import";
        if (p[0] === "wrong-book") return "wrong-book";
        if (p[0] === "papers") return "papers";
        if (p[0] === "dashboard") return "dashboard";
        return "";
      },
      pageContext() {
        const p = S.route.parts;
        if (!p.length) return { code: "01", en: "OVERVIEW", title: "学习总览" };
        const subjectId = p[1] || S.lastSubject || "math1";
        const subj = D.subjects.find((s) => s.id === subjectId);
        const sname = subj ? subj.name : "题库";
        if (p[0] === "dashboard") return { code: "02", en: "SYLLABUS MAP", title: sname + " · 考点地图" };
        if (p[0] === "papers") return { code: "03", en: "YEAR ARCHIVE", title: sname + " · 年份档案" };
        if (p[0] === "assembly") return { code: "04", en: "PAPER BUILDER", title: "智能组卷" };
        if (p[0] === "import") return { code: "05", en: "INGEST", title: "PDF 导入" };
        if (p[0] === "wrong-book") return { code: "06", en: "ERROR LOG", title: "错题本" };
        if (p[0] === "question") return { code: "07", en: "QUESTION", title: "题目详情" };
        if (p[0] === "practice") return { code: "08", en: "PRACTICE", title: "组合练习" };
        if (p[0] === "profile") return { code: "09", en: "PROFILE", title: "学习档案" };
        return { code: "00", en: "ATLAS", title: "研题岛" };
      },
    },
    methods: {
      num(n) {
        return String(n).padStart(2, "0");
      },
      go(path) {
        this.menuOpen = false;
        go(path);
      },
      openSearch() {
        S.searchOpen = true;
        this.menuOpen = false;
      },
    },
    template: `
    <header class="app-rail">
      <svg class="rail-topo" viewBox="0 0 240 420" fill="none" aria-hidden="true">
        <g stroke="#d9ff59" stroke-width="1">
          <path d="M-20 360c42-15 44-62 84-62 46 0 44 54 91 54 45 0 48-45 104-45" opacity=".16"/>
          <path d="M-24 382c46-12 50-56 88-56 44 0 46 50 89 50 43 0 48-39 103-39" opacity=".1"/>
          <path d="M-7 337c35-18 39-73 78-73 43 0 45 60 92 60 41 0 47-50 92-50" opacity=".08"/>
        </g>
        <path d="M26 90h16M34 82v16" stroke="#d9ff59" stroke-width="1" opacity=".32"/>
      </svg>
      <a class="rail-brand" href="#/" @click.prevent="go('/')" aria-label="研题岛 ATLAS 首页">
        <img src="assets/img/logo.svg" alt="" />
        <span class="rail-brand-text"><b>研题岛</b><em>ATLAS</em></span>
      </a>
      <p class="rail-caption">考研真题 · 学习地图系统</p>
      <div class="rail-index"><span>INDEX</span><i></i><em>{{ studyYear }} ED.</em></div>
      <nav class="rail-nav" aria-label="主导航">
        <a v-for="(item, i) in navItems" :key="item.key" :href="'#' + item.path" class="rail-link" :class="{active: activeKey === item.key}" @click.prevent="go(item.path)">
          <span class="rl-num">{{ num(i + 1) }}</span>
          <span class="rl-text"><b>{{ item.label }}</b><em>{{ item.en }}</em></span>
          <span class="rl-badge" v-if="item.key === 'wrong-book' && S.wrong.length">{{ S.wrong.length > 99 ? '99+' : S.wrong.length }}</span>
        </a>
      </nav>
      <div class="rail-bottom">
        <div class="rail-quote"><span>“</span><p>每一道题，<br />都有它的坐标。</p></div>
        <a class="rail-profile" href="#/profile" @click.prevent="go('/profile')">
          <span class="rail-avatar">{{ initial }}</span>
          <span class="rail-profile-text"><b>{{ S.user.name || '本地访客' }}</b><em>{{ S.practice.length ? '已留下 ' + S.practice.length + ' 条轨迹' : '建立你的学习档案' }}</em></span>
          <Icon name="chev-right" :size="15" />
        </a>
        <p class="rail-note"><i></i>LOCAL STORAGE / NO SERVER</p>
      </div>
    </header>

    <div class="workspace-bar">
      <div class="wb-context">
        <span class="wb-code">{{ pageContext.code }}</span>
        <div class="wb-title"><span>{{ pageContext.en }}</span><b>{{ pageContext.title }}</b></div>
      </div>
      <div class="wb-tools">
        <button class="wb-search" title="搜索题目（Ctrl / ⌘ + K）" @click="openSearch">
          <Icon name="search" :size="16" /><span>搜索题目 / 考点</span><kbd><i>⌘</i>K</kbd>
        </button>
        <button class="wb-import" @click="go('/import')"><Icon name="upload" :size="15" /><span>导入 PDF</span></button>
        <button class="wb-avatar" v-if="S.user.name" @click="go('/profile')" :title="S.user.name">{{ initial }}</button>
        <button class="wb-avatar is-empty" v-else @click="S.loginOpen = true" title="设置本地昵称"><Icon name="user" :size="16" /></button>
      </div>
    </div>

    <header class="mobile-bar">
      <a class="mobile-brand" href="#/" @click.prevent="go('/')">
        <img src="assets/img/logo.svg" alt="" />
        <span><b>研题岛</b><em>ATLAS</em></span>
      </a>
      <div class="mobile-bar-actions">
        <button @click="openSearch" aria-label="搜索"><Icon name="search" :size="19" /></button>
        <button @click="menuOpen = true" aria-label="菜单"><Icon name="menu" :size="20" /></button>
      </div>
    </header>

    <nav class="mobile-tabs" aria-label="快捷导航">
      <a v-for="item in mobileItems" :key="item.key" :href="'#' + item.path" :class="{active: activeKey === item.key}" @click.prevent="go(item.path)">
        <span class="mt-icon"><Icon :name="item.icon" :size="19" /><i v-if="item.key === 'wrong-book' && S.wrong.length">{{ S.wrong.length > 9 ? '9+' : S.wrong.length }}</i></span>
        <span>{{ item.label }}</span>
      </a>
    </nav>

    <Teleport to="body">
      <transition name="fade">
        <div class="mobile-mask" v-if="menuOpen" @click.self="menuOpen = false">
          <div class="mobile-drawer">
            <div class="mobile-drawer-head">
              <div class="rail-brand">
                <img src="assets/img/logo.svg" alt="" />
                <span class="rail-brand-text"><b>研题岛</b><em>ATLAS</em></span>
              </div>
              <button class="icon-btn drawer-close" @click="menuOpen = false" aria-label="关闭"><Icon name="x" :size="18" /></button>
            </div>
            <div class="mobile-drawer-index"><span>INDEX</span><i></i><em>{{ studyYear }} EDITION</em></div>
            <a v-for="(item, i) in navItems" :key="item.key" class="mobile-nav-link" :class="{active: activeKey === item.key}" :href="'#' + item.path" @click.prevent="go(item.path)">
              <span class="md-num">{{ num(i + 1) }}</span>
              <span class="md-label">{{ item.label }}<em>{{ item.en }}</em></span>
              <span v-if="item.key === 'wrong-book' && S.wrong.length" class="md-badge">{{ S.wrong.length }}</span>
              <Icon name="chev-right" :size="15" />
            </a>
            <div class="mobile-drawer-sub">
              <a href="#/profile" @click.prevent="go('/profile')"><Icon name="user" :size="16" />{{ S.user.name || '本地学习档案' }}</a>
              <a href="#/papers/math1" @click.prevent="go('/papers/' + lastSubject)"><Icon name="calendar" :size="16" />年份试卷</a>
            </div>
            <p class="mobile-drawer-note"><i></i>学习数据只保存在本机浏览器</p>
          </div>
        </div>
      </transition>
    </Teleport>`,
  };

  YT.components.SiteFooter = {
    data() {
      return { S: S, year: new Date().getFullYear() };
    },
    methods: {
      go: go,
      top() {
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
    template: `
    <footer class="site-footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <img src="assets/img/logo.svg" alt="" />
          <div><b>研题岛 <em>ATLAS</em></b><span>每一道题，都有它的坐标。</span></div>
        </div>
        <nav class="footer-nav" aria-label="页脚导航">
          <a href="#/dashboard/math1" @click.prevent="go('/dashboard/math1')">数学</a>
          <a href="#/dashboard/cs408" @click.prevent="go('/dashboard/cs408')">408</a>
          <a href="#/dashboard/english1" @click.prevent="go('/dashboard/english1')">英语</a>
          <a href="#/papers/math1" @click.prevent="go('/papers/math1')">年份</a>
          <a href="#/assembly" @click.prevent="go('/assembly')">组卷</a>
        </nav>
        <div class="footer-meta">
          <p>纯前端学习工具 · 原创示例内容</p>
          <p>错题、笔记与练习记录只存于当前浏览器。</p>
        </div>
      </div>
      <div class="container footer-base">
        <span>© {{ year }} 研题岛 ATLAS</span>
        <span>LOCAL-FIRST / NO SERVER / GITHUB PAGES</span>
        <button @click="top">回到顶部 <span>↑</span></button>
      </div>
    </footer>`,
  };

  /* ---------------- export ---------------- */
  YT.util = {
    esc: esc, fmt: fmt, para: para, plain: plain, clamp: clamp,
    dateStr: dateStr, timeStr: timeStr, relTime: relTime, shuffle: shuffle,
    subjectMap: subjectMap, treeMap: treeMap, nodeMapFor: nodeMapFor,
    kpName: kpName, kpPath: kpPath, questionsOf: questionsOf,
    questionById: questionById, rebuildIndexes: rebuildIndexes,
    imageUrl: imageUrl, dropImage: dropImage,
    subjectOf: subjectOf, groupOf: groupOf, questionsForNode: questionsForNode,
    nodeCount: nodeCount, yearsOf: yearsOf, paperFullTitle: paperFullTitle,
    parseRoute: parseRoute, go: go, toast: toast, askConfirm: askConfirm,
    isWrong: isWrong, toggleWrong: toggleWrong, addWrong: addWrong, removeWrong: removeWrong,
    isFav: isFav, toggleFav: toggleFav, setMastery: setMastery,
    addComment: addComment, saveNote: saveNote, addPractice: addPractice, savePaper: savePaper,
    startPractice: startPractice, readQueue: readQueue, searchQuestions: searchQuestions,
    renderMath: renderMath,
  };
  YT.S = S;
  window.go = go;
})();

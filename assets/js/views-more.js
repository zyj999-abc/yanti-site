/* Papers / Wrong book / Assembly / Profile / 404 */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;
  const S = YT.S;
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

  /* ================= Papers ================= */
  YT.components.PapersView = {
    props: { subjectId: String },
    data() {
      return { S: S, D: D, U: U, typeNames: TYPE_NAMES };
    },
    computed: {
      subject() {
        return U.subjectOf(this.subjectId) || U.subjectOf("math1");
      },
      years() {
        return U.yearsOf(this.subject.id);
      },
      selectedYear() {
        const y = parseInt(YT.S.route.query.year, 10);
        if (this.years.indexOf(y) >= 0) return y;
        return this.years[this.years.length - 1];
      },
      allYearQuestions() {
        return U.questionsOf(this.subject.id);
      },
      yearQuestions() {
        return this.allYearQuestions
          .filter((q) => q.year === this.selectedYear)
          .sort((a, b) => a.indexNo - b.indexNo);
      },
      yearCount() {
        const m = {};
        this.allYearQuestions.forEach((q) => (m[q.year] = (m[q.year] || 0) + 1));
        return m;
      },
      totalScore() {
        return this.yearQuestions.reduce((n, q) => n + q.score, 0);
      },
      answeredCount() {
        return this.yearQuestions.filter((q) => S.mastery[q.id]).length;
      },
      typesInYear() {
        const set = [];
        this.yearQuestions.forEach((q) => {
          if (set.indexOf(q.typeName) < 0) set.push(q.typeName);
        });
        return set;
      },
      prevYear() {
        const i = this.years.indexOf(this.selectedYear);
        return i > 0 ? this.years[i - 1] : null;
      },
      nextYear() {
        const i = this.years.indexOf(this.selectedYear);
        return i >= 0 && i < this.years.length - 1 ? this.years[i + 1] : null;
      },
      subjectIds() {
        const g = U.groupOf(this.subject.id);
        return g ? g.subjects : [this.subject.id];
      },
    },
    watch: {
      subjectId() {
        const y = this.years[this.years.length - 1];
        S.lastSubject = this.subject.id;
        if (String(this.selectedYear) !== String(YT.S.route.query.year)) {
          U.go("/papers/" + this.subject.id + "?year=" + y);
        }
      },
    },
    mounted() {
      S.lastSubject = this.subject.id;
      if (!YT.S.route.query.year) {
        U.go("/papers/" + this.subject.id + "?year=" + this.selectedYear);
      }
    },
    methods: {
      go: U.go,
      pad(n) {
        return String(n || 0).padStart(2, "0");
      },
      subjectCode(id) {
        return { math1: "M-01", math2: "M-02", math3: "M-03", cs408: "CS-408", english1: "E-01", english2: "E-02" }[id] || "A-00";
      },
      chooseYear(y) {
        U.go("/papers/" + this.subject.id + "?year=" + y);
      },
      switchSubject(id) {
        U.go("/papers/" + id + "?year=" + U.yearsOf(id).slice(-1)[0]);
      },
      openQuestion(q) {
        U.go("/question/" + q.id);
      },
      startFull() {
        const ids = this.yearQuestions.map((q) => q.id);
        U.startPractice(ids, {
          title: this.selectedYear + " 年 " + this.subject.name + " · 整卷练习",
          subject: this.subject.id,
          subjectName: this.subject.name,
          mode: "paper",
        });
      },
      printPaper() {
        YT.printPaper({
          title: this.subject.name + " · " + this.selectedYear + " 年真题（示例）",
          subtitle: "研题岛 ATLAS · 共 " + this.yearQuestions.length + " 题 · 满分 " + this.totalScore + " 分",
          questions: this.yearQuestions,
          answers: false,
        });
      },
      yearShift(d) {
        const i = this.years.indexOf(this.selectedYear);
        const y = this.years[i + d];
        if (y) this.chooseYear(y);
      },
    },
    template: `
    <main class="plate-page papers-page">
      <div class="container plate-frame">
        <header class="plate-mast">
          <div class="plate-no"><span>PLATE</span><b>03</b><em>YEAR ARCHIVE</em></div>
          <div class="plate-title">
            <span class="plate-kicker">BOUND VOLUMES / {{ subject.name }}</span>
            <h1>年份档案</h1>
            <p>{{ allYearQuestions.length }} 道真题 · {{ years.length }} 个年份 · 按原卷题号编排</p>
          </div>
          <div class="plate-actions">
            <button class="btn btn-ghost" @click="printPaper"><Icon name="printer" :size="15" /> 打印试卷</button>
            <button class="btn btn-primary" @click="startFull"><Icon name="play" :size="15" /> 整卷练习</button>
          </div>
        </header>

        <div class="terrain-switch" role="tablist" aria-label="切换科目">
          <button v-for="id in subjectIds" :key="id" class="terrain-switch-item" :class="{ active: id === subject.id }" @click="switchSubject(id)">
            <span>{{ subjectCode(id) }}</span>
            <b>{{ D.subjects.find(s => s.id === id).name }}</b>
            <em>{{ U.yearsOf(id).length }} YR</em>
          </button>
          <span class="terrain-switch-note">整卷模拟，也可以单题精刷</span>
        </div>

        <div class="year-ribbon" role="tablist" aria-label="选择年份">
          <button v-for="(y, i) in years.slice().reverse()" :key="y" class="year-cell" :class="{ active: y === selectedYear }" @click="chooseYear(y)">
            <span class="yc-index">{{ pad(years.length - i) }}</span>
            <b>{{ y }}</b>
            <em>{{ yearCount[y] || 0 }} 题</em>
          </button>
        </div>

        <div class="paper-desk">
          <aside class="paper-spec">
            <div class="spec-year">{{ selectedYear }}</div>
            <p class="spec-en">NATIONAL ENTRANCE EXAMINATION / SAMPLE</p>
            <dl class="spec-list">
              <div><dt>科目</dt><dd>{{ subject.name }}</dd></div>
              <div><dt>题量</dt><dd>{{ yearQuestions.length }} 题</dd></div>
              <div><dt>满分</dt><dd>{{ totalScore }} 分</dd></div>
              <div><dt>题型</dt><dd>{{ typesInYear.join(' / ') || '—' }}</dd></div>
              <div><dt>已掌握</dt><dd>{{ answeredCount }} 题</dd></div>
            </dl>
            <div class="spec-actions">
              <button class="btn btn-primary" @click="startFull"><Icon name="play" :size="14" /> 整卷练习</button>
              <button class="btn btn-ghost" @click="printPaper"><Icon name="printer" :size="14" /> 打印</button>
            </div>
            <div class="spec-shift">
              <button :disabled="!prevYear" @click="yearShift(-1)"><Icon name="chev-left" :size="13" /> {{ prevYear || '—' }}</button>
              <button :disabled="!nextYear" @click="yearShift(1)">{{ nextYear || '—' }} <Icon name="chev-right" :size="13" /></button>
            </div>
            <p class="spec-note">示例卷：按年份与题号编排，用于演示整卷刷题与打印流程。</p>
          </aside>

          <section class="paper-sheet">
            <header class="paper-sheet-head">
              <div>
                <span class="ps-kicker">PAPER SPECIMEN / {{ subject.name }}</span>
                <h2>{{ selectedYear }} 年全国硕士研究生招生考试<br />{{ subject.name }}（示例卷）</h2>
              </div>
              <div class="ps-stamp"><b>{{ selectedYear }}</b><span>ATLAS · SAMPLE</span><em>{{ yearQuestions.length }} Q / {{ totalScore }} P</em></div>
            </header>

            <div class="paper-meta-line">
              <span>{{ yearQuestions.length }} QUESTIONS</span>
              <span>{{ totalScore }} POINTS</span>
              <span>{{ typesInYear.join(' / ') || 'NO DATA' }}</span>
              <span>已掌握 {{ answeredCount }}</span>
            </div>

            <section class="answer-grid-section">
              <header class="sheet-subhead">
                <span class="ps-kicker">01 / ANSWER GRID</span>
                <span>点击题号直接进入单题</span>
              </header>
              <div class="score-grid" v-if="yearQuestions.length">
                <a v-for="q in yearQuestions" :key="q.id" class="score-cell" :class="{ done: S.mastery[q.id] }" :href="'#/question/' + q.id" @click.prevent="openQuestion(q)" :title="q.typeName + ' · ' + q.kpName">
                  <b>{{ pad(q.indexNo) }}</b>
                  <span>{{ q.typeName.slice(0, 2) }}</span>
                </a>
              </div>
              <p class="score-empty" v-else>该年份暂无题目。</p>
              <div class="score-legend">
                <span><i class="on"></i>已标记掌握</span>
                <span><i></i>未作答</span>
                <span class="score-legend-note">GRID = 原卷题号</span>
              </div>
            </section>

            <section class="paper-ledger">
              <header class="sheet-subhead">
                <span class="ps-kicker">02 / QUESTION LEDGER</span>
                <button class="sheet-link" @click="startFull"><Icon name="play" :size="12" /> 从第 1 题开始</button>
              </header>
              <div class="paper-q-list" v-if="yearQuestions.length">
                <a v-for="q in yearQuestions" :key="q.id" class="paper-q-row" :href="'#/question/' + q.id" @click.prevent="openQuestion(q)">
                  <span class="pq-no">{{ pad(q.indexNo) }}</span>
                  <span class="pq-main"><b>{{ q.kpName }}</b><span>{{ q.typeName }} · {{ q.score }} 分 · {{ q.difficultyName }}</span></span>
                  <span class="pq-section">{{ q.typeName }}</span>
                  <span class="pq-mark" v-if="S.mastery[q.id]">已掌握</span>
                  <span class="pq-mark empty" v-else>—</span>
                  <Icon name="arrow-right" :size="14" />
                </a>
              </div>
              <p class="score-empty" v-else>该年份暂无题目，换一年看看。</p>
            </section>
          </section>
        </div>
      </div>
    </main>`,
  };

  /* ================= Wrong book / Favorites ================= */
  YT.components.WrongBookView = {
    data() {
      return {
        S: S,
        U: U,
        typeNames: TYPE_NAMES,
        filters: { subject: "all", type: "all", keyword: "" },
        visible: 12,
      };
    },
    computed: {
      tab() {
        return YT.S.route.query.tab === "fav" ? "fav" : "wrong";
      },
      rawIds() {
        return this.tab === "fav" ? S.favorites : S.wrong;
      },
      allItems() {
        return this.rawIds.map((id) => D.questions.find((q) => q.id === id)).filter(Boolean);
      },
      subjectOptions() {
        const seen = {};
        this.allItems.forEach((q) => (seen[q.subject] = q.subjectName));
        return Object.keys(seen).map((id) => ({ id: id, name: seen[id] }));
      },
      filtered() {
        const f = this.filters;
        const k = f.keyword.trim().toLowerCase();
        return this.allItems.filter((q) => {
          if (f.subject !== "all" && q.subject !== f.subject) return false;
          if (f.type !== "all" && q.type !== f.type) return false;
          if (k) {
            const hay = (q.stem + " " + q.kpName + " " + q.year).toLowerCase();
            if (hay.indexOf(k) < 0) return false;
          }
          return true;
        });
      },
      visibleItems() {
        return this.filtered.slice(0, this.visible);
      },
      pageTitle() {
        return this.tab === "fav" ? "我的收藏" : "错题本";
      },
      pageDesc() {
        return this.tab === "fav" ? "收藏的好题都在这里，随时回看解析" : "做错的题自动收进来，集中回刷更高效";
      },
      typeFilterOptions() {
        const out = [];
        this.allItems.forEach((q) => {
          if (out.indexOf(q.type) < 0) out.push(q.type);
        });
        return out;
      },
    },
    watch: {
      tab() {
        this.visible = 12;
        this.filters.keyword = "";
      },
      "filters.subject"() {
        this.visible = 12;
      },
      "filters.type"() {
        this.visible = 12;
      },
      "filters.keyword"() {
        this.visible = 12;
      },
    },
    methods: {
      go: U.go,
      pad(n) {
        return String(n || 0).padStart(2, "0");
      },
      switchTab(tab) {
        U.go("/wrong-book" + (tab === "fav" ? "?tab=fav" : ""));
      },
      resetFilters() {
        this.filters = { subject: "all", type: "all", keyword: "" };
      },
      remove(q) {
        if (this.tab === "fav") {
          U.toggleFav(q.id);
        } else {
          U.removeWrong(q.id);
          U.toast("已移出错题本");
        }
      },
      openQuestion(q) {
        U.go("/question/" + q.id);
      },
      startAll() {
        U.startPractice(this.filtered.map((q) => q.id), {
          title: this.pageTitle + " · 集中重刷",
          subject: this.filters.subject === "all" ? "" : this.filters.subject,
          subjectName: this.filters.subject === "all" ? "全部科目" : U.subjectOf(this.filters.subject).name,
          mode: this.tab === "fav" ? "favorites" : "wrong",
        });
      },
    },
    template: `
    <main class="plate-page wrong-page">
      <div class="container plate-frame">
        <header class="plate-mast">
          <div class="plate-no"><span>PLATE</span><b>06</b><em>ERROR LOG</em></div>
          <div class="plate-title">
            <span class="plate-kicker">CORRECTIONS / {{ tab === 'fav' ? 'FAVORITES' : 'MISTAKE LEDGER' }}</span>
            <h1>{{ pageTitle }}</h1>
            <p>{{ pageDesc }} · 共 {{ allItems.length }} 条记录</p>
          </div>
          <div class="plate-actions">
            <button class="btn btn-primary" @click="startAll" :disabled="!filtered.length"><Icon name="play" :size="15" /> 重刷这 {{ filtered.length }} 题</button>
          </div>
        </header>

        <div class="log-tabs" role="tablist">
          <button class="log-tab" :class="{ active: tab === 'wrong' }" @click="switchTab('wrong')">
            <span>01</span><b>错题本</b><em>{{ S.wrong.length }}</em>
          </button>
          <button class="log-tab" :class="{ active: tab === 'fav' }" @click="switchTab('fav')">
            <span>02</span><b>收藏夹</b><em>{{ S.favorites.length }}</em>
          </button>
          <span class="log-tabs-note">LOCAL / 记录只保存在当前浏览器</span>
        </div>

        <div class="log-filter">
          <label><span>科目</span><select class="bare-select" v-model="filters.subject">
            <option value="all">全部科目</option>
            <option v-for="s in subjectOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select></label>
          <label><span>题型</span><select class="bare-select" v-model="filters.type">
            <option value="all">全部题型</option>
            <option v-for="t in typeFilterOptions" :key="t" :value="t">{{ typeNames[t] }}</option>
          </select></label>
          <label class="log-search"><span>检索</span><input class="bare-input" v-model="filters.keyword" placeholder="题干 / 考点 / 年份" /></label>
          <button class="log-reset" v-if="filters.subject !== 'all' || filters.type !== 'all' || filters.keyword" @click="resetFilters">清除筛选</button>
          <span class="log-count">{{ filtered.length }} ENTRIES</span>
        </div>

        <section class="correction-sheet" v-math>
          <header class="correction-head">
            <span class="ps-kicker">LEDGER / {{ tab === 'fav' ? 'FAVORITE QUESTIONS' : 'MISTAKES TO REVISIT' }}</span>
            <span class="correction-head-note">按最近加入排序</span>
          </header>

          <div class="correction-list" v-if="visibleItems.length">
            <article class="correction-row" v-for="(q, i) in visibleItems" :key="q.id">
              <div class="cr-no">{{ pad(i + 1) }}</div>
              <div class="cr-main">
                <div class="cr-meta">
                  <span>{{ q.subjectName }}</span><i>·</i>
                  <span>{{ q.year }} 年 第 {{ q.indexNo }} 题</span><i>·</i>
                  <span>{{ q.kpName }}</span>
                </div>
                <a :href="'#/question/' + q.id" @click.prevent="openQuestion(q)" class="cr-stem" v-html="U.fmt(q.stem)"></a>
                <div class="cr-tags">
                  <span>{{ q.typeName }}</span><i>·</i>
                  <span>{{ q.difficultyName }}</span>
                  <b v-if="S.mastery[q.id]"><Icon name="check-circle" :size="11" /> {{ ['','简单','一般','不会'][S.mastery[q.id]] }}</b>
                  <b class="none" v-else>未标记掌握</b>
                </div>
              </div>
              <div class="cr-side">
                <span class="cr-state" :class="{ done: S.mastery[q.id] }">{{ tab === 'fav' ? 'COLLECTED' : 'REVISIT' }}</span>
                <button class="cr-open" @click="openQuestion(q)">查看 <Icon name="arrow-right" :size="12" /></button>
                <button class="cr-remove" :title="tab === 'fav' ? '取消收藏' : '移出错题本'" @click="remove(q)"><Icon :name="tab === 'fav' ? 'star' : 'trash'" :size="14" /></button>
              </div>
            </article>
          </div>

          <div class="correction-empty" v-else>
            <div class="ce-index">{{ allItems.length ? '00' : '—' }}</div>
            <span class="ps-kicker">{{ allItems.length ? 'NO MATCH' : (tab === 'fav' ? 'NO FAVORITES YET' : 'LOG IS CLEAR') }}</span>
            <h3>{{ allItems.length ? '这些筛选条件下没有题目' : (tab === 'fav' ? '还没有收藏题目' : '错题本还是空的') }}</h3>
            <p>{{ allItems.length ? '换一个科目或题型试试。' : (tab === 'fav' ? '刷题时点击题目右上角的星标，就能把好题收进来。' : '答错的题会自动进入这里；也可以手动标记，方便集中回刷。') }}</p>
            <div class="ce-actions">
              <button class="btn btn-ghost" v-if="allItems.length" @click="resetFilters">清除筛选</button>
              <button class="btn btn-primary" v-else @click="go('/dashboard/math1')">去刷题</button>
            </div>
          </div>
        </section>

        <div class="log-more" v-if="filtered.length > visible">
          <button class="btn btn-ghost btn-sm" @click="visible += 12">加载更多 · 还有 {{ filtered.length - visible }} 条 <Icon name="chev-down" :size="14" /></button>
        </div>
      </div>
    </main>`,
  };

  /* ================= Assembly ================= */
  const PAPER_TYPE_OPTIONS = [
    { value: "free", label: "自由组卷（按题型/考点）" },
    { value: "math1", label: "数学一 · 最新标准卷" },
    { value: "math2", label: "数学二 · 最新标准卷" },
    { value: "math3", label: "数学三 · 最新标准卷" },
    { value: "cs408", label: "408 · 最新标准卷" },
    { value: "english1", label: "英语一 · 最新标准卷" },
    { value: "english2", label: "英语二 · 最新标准卷" },
  ];
  const DIFF_FILTERS = [
    { value: "all", label: "全部" },
    { value: "1", label: "易" },
    { value: "2", label: "中" },
    { value: "3", label: "难" },
  ];

  YT.components.AssemblyView = {
    data() {
      return {
        S: S,
        U: U,
        typeNames: YT.typeNames || TYPE_NAMES,
        paperTypes: PAPER_TYPE_OPTIONS,
        diffFilters: DIFF_FILTERS,
        paperType: "free",
        subjectId: "math1",
        checkedKps: [],
        types: ["choice", "blank", "solution", "proof"],
        year: "all",
        count: 15,
        difficulty: "all",
        source: "all",
        title: "",
        preview: [],
        generated: false,
      };
    },
    computed: {
      template() {
        return this.paperType === "free" ? null : YT.templateFor(this.paperType);
      },
      effectiveSubject() {
        return this.template ? this.template.subject : this.subjectId === "all" ? "" : this.subjectId;
      },
      subject() {
        return this.effectiveSubject ? U.subjectOf(this.effectiveSubject) : null;
      },
      subjectOptions() {
        return D.subjects;
      },
      group() {
        return this.subject ? this.subject.group : "math";
      },
      freeTypeOptions() {
        if (this.group === "en") return ["choice", "cloze", "read", "newtype", "translate", "writing", "solution"];
        if (this.group === "cs") return ["choice", "application", "solution", "proof"];
        return ["choice", "blank", "solution", "proof"];
      },
      years() {
        if (!this.effectiveSubject) {
          const ys = D.questions.map((q) => q.year);
          return Array.from(new Set(ys)).sort();
        }
        return U.yearsOf(this.effectiveSubject);
      },
      kpNodes() {
        if (!this.subject) return [];
        const out = [];
        const walk = (nodes, depth) => {
          nodes.forEach((n) => {
            out.push({ node: n, depth: depth });
            if (depth < 1 && n.children) walk(n.children, depth + 1);
          });
        };
        walk(U.groupOf(this.subject.id).tree, 0);
        return out;
      },
      kpIds() {
        if (!this.subject) return [];
        const m = U.nodeMapFor(this.subject.id);
        const set = {};
        this.checkedKps.forEach((id) => {
          const entry = m[id];
          if (!entry) return;
          const walk = (n) => {
            set[n.id] = true;
            (n.children || []).forEach(walk);
          };
          walk(entry.node);
        });
        return Object.keys(set);
      },
      basePool() {
        let list = D.questions;
        if (this.source === "imported") list = list.filter((q) => q.imported);
        else if (this.source === "builtin") list = list.filter((q) => !q.imported);
        if (this.year !== "all") list = list.filter((q) => String(q.year) === String(this.year));
        return list;
      },
      diffPool() {
        if (this.difficulty === "all") return this.basePool;
        return this.basePool.filter((q) => q.difficulty === +this.difficulty);
      },
      pool() {
        let list = this.effectiveSubject ? this.diffPool.filter((q) => q.subject === this.effectiveSubject) : this.diffPool;
        if (this.kpIds.length) {
          const set = {};
          this.kpIds.forEach((id) => (set[id] = true));
          list = list.filter((q) => set[q.kpId]);
        }
        if (this.types.length < this.freeTypeOptions.length) list = list.filter((q) => this.types.indexOf(q.type) >= 0);
        return list;
      },
      takeCount() {
        return this.count === 0 ? this.pool.length : Math.min(this.count, this.pool.length);
      },
      difficultyLabel() {
        const x = DIFF_FILTERS.find((d) => d.value === this.difficulty);
        return x && x.value !== "all" ? x.label : "";
      },
      defaultTitle() {
        if (this.template) {
          return this.template.name.replace("标准卷", "标准卷") + (this.difficultyLabel ? " · " + this.difficultyLabel : "");
        }
        const sub = this.subject ? this.subject.name : "全科";
        const kp = this.checkedKps.length && this.subject ? U.kpName(this.checkedKps[0]) : "";
        return sub + (kp ? " · " + kp : "") + " 智能组卷" + (this.difficultyLabel ? " · " + this.difficultyLabel : "");
      },
      previewQuestions() {
        return this.preview
          .map((it) => {
            const q = D.questions.find((x) => x.id === it.id);
            if (!q) return null;
            return it.score != null && it.score !== q.score ? Object.assign({}, q, { score: it.score }) : q;
          })
          .filter(Boolean);
      },
      previewScore() {
        return this.preview.reduce((n, it) => {
          if (it.score != null) return n + it.score;
          const q = D.questions.find((x) => x.id === it.id);
          return n + (q ? q.score : 0);
        }, 0);
      },
      previewSections() {
        const out = [];
        const map = {};
        this.preview.forEach((it, i) => {
          const key = it.section || "free";
          if (!map[key]) {
            map[key] = { key: key, name: it.sectionName || "", items: [] };
            out.push(map[key]);
          }
          const q = D.questions.find((x) => x.id === it.id);
          if (q) map[key].items.push({ it: it, q: q, index: i });
        });
        return out;
      },
      templateSections() {
        if (!this.template) return [];
        const all = this.basePool.filter((q) => q.subject === this.template.subject);
        return this.template.sections.map((sec) => {
          const exact = all.filter((q) => this.matchSection(q, sec) && (this.difficulty === "all" || q.difficulty === +this.difficulty));
          const total = all.filter((q) => this.matchSection(q, sec));
          return {
            sec: sec,
            exact: exact.length,
            total: total.length,
            enough: exact.length >= sec.count,
            fallback: total.length >= sec.count,
          };
        });
      },
      templateShortage() {
        return this.templateSections.filter((x) => !x.fallback);
      },
      importedCount() {
        return D.questions.filter((q) => q.imported).length;
      },
    },
    watch: {
      paperType(v) {
        const tpl = YT.templateFor(v);
        if (tpl) this.subjectId = tpl.subject;
        this.checkedKps = [];
        this.preview = [];
        this.generated = false;
        if (v !== "free") this.year = "all";
      },
      subjectId() {
        this.checkedKps = [];
        this.year = "all";
        this.preview = [];
        this.generated = false;
        this.types = this.freeTypeOptions.slice();
      },
      difficulty() {
        this.preview = [];
        this.generated = false;
      },
      source() {
        this.preview = [];
        this.generated = false;
      },
    },
    methods: {
      go: U.go,
      pad(n) {
        return String(n || 0).padStart(2, "0");
      },
      sectionPoints(group) {
        return group.items.reduce((a, x) => a + (x.it.score != null ? x.it.score : x.q.score), 0);
      },
      matchSection(q, sec) {
        if (sec.match.indexOf(q.type) >= 0) return true;
        const kp = q.kpId || "";
        if (sec.key === "cloze" && kp === "e-cloze") return true;
        if (sec.key === "read" && kp.indexOf("e-read") === 0) return true;
        if (sec.key === "newtype" && kp === "e-new") return true;
        if (sec.key === "translate" && kp === "e-trans") return true;
        if ((sec.key === "writingA" || sec.key === "writingB") && kp === "e-write") return true;
        return false;
      },
      toggleKp(id) {
        const i = this.checkedKps.indexOf(id);
        if (i >= 0) this.checkedKps.splice(i, 1);
        else this.checkedKps.push(id);
        this.preview = [];
        this.generated = false;
      },
      allKps() {
        this.checkedKps = this.kpNodes.filter((n) => n.depth === 0).map((n) => n.node.id);
        this.preview = [];
        this.generated = false;
      },
      clearKps() {
        this.checkedKps = [];
        this.preview = [];
        this.generated = false;
      },
      toggleType(t) {
        const i = this.types.indexOf(t);
        if (i >= 0) {
          if (this.types.length === 1) {
            U.toast("至少保留一种题型");
            return;
          }
          this.types.splice(i, 1);
        } else this.types.push(t);
        this.preview = [];
        this.generated = false;
      },
      buildStandard() {
        const tpl = this.template;
        const secs = tpl.sections;
        const used = {};
        const items = [];
        let looseCount = 0;
        const allSubject = this.basePool.filter((q) => q.subject === tpl.subject);
        secs.forEach((sec) => {
          let list = allSubject.filter((q) => this.matchSection(q, sec) && !used[q.id]);
          if (this.difficulty !== "all") list = list.filter((q) => q.difficulty === +this.difficulty);
          let loose = false;
          if (list.length < sec.count && this.difficulty !== "all") {
            const extra = allSubject.filter((q) => this.matchSection(q, sec) && !used[q.id] && list.indexOf(q) < 0);
            list = list.concat(U.shuffle(extra));
            loose = true;
          }
          list = U.shuffle(list).slice(0, sec.count);
          list.forEach((q, i) => {
            used[q.id] = true;
            const score = sec.scores ? sec.scores[i] != null ? sec.scores[i] : sec.scores[sec.scores.length - 1] : sec.score;
            if (loose && this.difficulty !== "all" && q.difficulty !== +this.difficulty) looseCount++;
            items.push({
              id: q.id,
              score: score,
              section: sec.key,
              sectionName: sec.name,
              loose: loose && q.difficulty !== +this.difficulty,
            });
          });
        });
        return { items: items, looseCount: looseCount };
      },
      generate() {
        if (this.template) {
          const res = this.buildStandard();
          if (!res.items.length) {
            U.toast("当前题库没有匹配的题目，先导入对应科目的 PDF");
            return;
          }
          this.preview = res.items;
          this.generated = true;
          const missing = this.template.sections.length - this.previewSections.filter((s) => s.items.length).length;
          let msg = "已按 " + this.template.name + " 生成 " + res.items.length + " 题";
          if (missing > 0) msg += "，有 " + missing + " 个题型题库不足";
          else if (res.looseCount) msg += "，部分题目放宽了难度";
          U.toast(msg);
          return;
        }
        if (!this.pool.length) {
          U.toast("当前条件下没有题目");
          return;
        }
        const picked = U.shuffle(this.pool).slice(0, this.takeCount);
        this.preview = picked.map((q) => ({ id: q.id, score: q.score, section: "", sectionName: "" }));
        this.generated = true;
        U.toast("已生成 " + picked.length + " 道题的试卷");
      },
      removePreview(i) {
        this.preview.splice(i, 1);
      },
      save() {
        if (!this.preview.length) {
          U.toast("请先生成试卷");
          return;
        }
        U.savePaper({
          id: "p" + Date.now(),
          title: this.title.trim() || this.defaultTitle,
          at: Date.now(),
          subject: this.effectiveSubject || "all",
          subjectName: this.subject ? this.subject.name : "全科",
          count: this.preview.length,
          score: this.previewScore,
          paperType: this.paperType,
          template: this.template ? this.template.name : "",
          difficulty: this.difficulty,
          ids: this.preview.map((x) => x.id),
        });
        U.toast("试卷已保存，可在「学习档案」中查看");
      },
      start() {
        if (!this.preview.length) {
          U.toast("请先生成试卷");
          return;
        }
        U.startPractice(this.preview.map((x) => x.id), {
          title: this.title.trim() || this.defaultTitle,
          subject: this.effectiveSubject || "",
          subjectName: this.subject ? this.subject.name : "全科",
          mode: "assembly",
        });
      },
      print() {
        if (!this.preview.length) {
          U.toast("请先生成试卷");
          return;
        }
        YT.printPaper({
          title: (this.title.trim() || this.defaultTitle) + "（示例）",
          subtitle:
            "研题岛 ATLAS · 共 " +
            this.preview.length +
            " 题 · 满分 " +
            this.previewScore +
            " 分" +
            (this.template ? " · 按 " + this.template.name + " 题型结构" : ""),
          questions: this.previewQuestions,
          answers: false,
        });
      },
      startRecord(p) {
        if (!p.ids || !p.ids.length) {
          U.toast("这份试卷没有题目");
          return;
        }
        U.startPractice(p.ids, { title: p.title, subject: p.subject, subjectName: p.subjectName, mode: "paper" });
      },
      removeRecord(p) {
        U.askConfirm("删除这份试卷？", "「" + p.title + "」将从组卷记录中移除。", () => {
          const i = S.papers.findIndex((x) => x.id === p.id);
          if (i >= 0) S.papers.splice(i, 1);
          U.toast("已删除试卷");
        });
      },
      plain(s) {
        return U.plain(s);
      },
      sectionName(key) {
        const sec = this.template && this.template.sections.find((x) => x.key === key);
        return sec ? sec.name : "";
      },
    },
    template: `
    <main class="plate-page assembly-page">
      <div class="container plate-frame">
        <header class="plate-mast">
          <div class="plate-no"><span>PLATE</span><b>04</b><em>PAPER BUILDER</em></div>
          <div class="plate-title">
            <span class="plate-kicker">DRAFTING TABLE / 2026 SYLLABUS</span>
            <h1>组卷台</h1>
            <p>按最新考研题型结构拼整卷，或按考点自由抽题；支持易 / 中 / 难筛选</p>
          </div>
          <div class="plate-actions">
            <button class="btn btn-ghost" @click="go('/import')"><Icon name="upload" :size="15" /> 导入 PDF</button>
          </div>
        </header>

        <div class="assembly-desk">
          <aside class="assembly-spec">
            <header class="spec-head"><span>SPECIFICATION</span><b>组卷参数</b><em>{{ template ? 'STANDARD' : 'FREE' }}</em></header>

            <div class="spec-block">
              <span class="spec-no">01</span>
              <div class="spec-field">
                <label>卷型</label>
                <select class="bare-select" v-model="paperType">
                  <option v-for="t in paperTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
            </div>

            <div class="spec-block">
              <span class="spec-no">02</span>
              <div class="spec-field">
                <label>科目</label>
                <select class="bare-select" v-model="subjectId" :disabled="!!template">
                  <option v-for="s in subjectOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
                  <option v-if="!template" value="all">全科混合</option>
                </select>
                <span class="spec-hint" v-if="importedCount">题库含 {{ importedCount }} 道 PDF 导入题</span>
              </div>
            </div>

            <div class="spec-block" v-if="template">
              <span class="spec-no">03</span>
              <div class="spec-field">
                <label>标准卷结构</label>
                <div class="tpl-ledger">
                  <div class="tpl-row" v-for="x in templateSections" :key="x.sec.key">
                    <div><b>{{ x.sec.name }}</b><span>{{ x.sec.count }} 题 · {{ x.sec.scores ? x.sec.scores.reduce((a,b)=>a+b,0) : x.sec.count * x.sec.score }} 分</span></div>
                    <em :class="{ bad: !x.exact, warn: x.exact && !x.enough }">{{ x.exact ? '可用 ' + x.exact : '不足' }}/{{ x.sec.count }}</em>
                  </div>
                </div>
                <p class="spec-warn" v-if="templateShortage.length">有 {{ templateShortage.length }} 个题型题库不足，生成时会尽量放宽或留空。</p>
              </div>
            </div>

            <div class="spec-block">
              <span class="spec-no">{{ template ? '04' : '03' }}</span>
              <div class="spec-field">
                <label>难度</label>
                <div class="spec-segs">
                  <button v-for="d in diffFilters" :key="d.value" :class="{ on: difficulty === d.value }" @click="difficulty = d.value">{{ d.label }}</button>
                </div>
                <span class="spec-hint">标准卷也按此难度抽题；不足时自动放宽并在校样中标出。</span>
              </div>
            </div>

            <div class="spec-block">
              <span class="spec-no">{{ template ? '05' : '04' }}</span>
              <div class="spec-field">
                <label>题源</label>
                <select class="bare-select" v-model="source">
                  <option value="all">全部题目（内置 + 导入）</option>
                  <option value="builtin">仅内置示例题</option>
                  <option value="imported">仅我导入的 PDF 题</option>
                </select>
              </div>
            </div>

            <div class="spec-block" v-if="!template && subject">
              <span class="spec-no">05</span>
              <div class="spec-field">
                <label>考点范围 <span v-if="checkedKps.length">· 已选 {{ checkedKps.length }}</span></label>
                <div class="kp-select-box">
                  <label v-for="item in kpNodes" :key="item.node.id" class="kp-select-row" :class="'depth-' + item.depth">
                    <input type="checkbox" :checked="checkedKps.indexOf(item.node.id) >= 0" @change="toggleKp(item.node.id)" />
                    <span>{{ item.node.name }}</span>
                  </label>
                </div>
                <div class="spec-inline">
                  <button @click="allKps">选大类</button>
                  <button @click="clearKps">清空</button>
                </div>
              </div>
            </div>

            <div class="spec-block" v-if="!template">
              <span class="spec-no">06</span>
              <div class="spec-field">
                <label>题型</label>
                <div class="spec-chips">
                  <button v-for="t in freeTypeOptions" :key="t" :class="{ on: types.indexOf(t) >= 0 }" @click="toggleType(t)">{{ typeNames[t] }}</button>
                </div>
              </div>
            </div>

            <div class="spec-block">
              <span class="spec-no">{{ template ? '06' : '07' }}</span>
              <div class="spec-field spec-field-pair">
                <div><label>年份</label><select class="bare-select" v-model="year">
                  <option value="all">全部年份</option>
                  <option v-for="y in years.slice().reverse()" :key="y" :value="y">{{ y }} 年</option>
                </select></div>
                <div><label>试卷名称</label><input class="bare-input" v-model="title" maxlength="30" placeholder="留空自动命名" /></div>
              </div>
            </div>

            <div class="spec-block" v-if="!template">
              <span class="spec-no">08</span>
              <div class="spec-field">
                <label>题量</label>
                <div class="spec-segs">
                  <button v-for="n in [10,15,20,30,0]" :key="n" :class="{ on: count === n }" @click="count = n">{{ n === 0 ? '全部' : n + ' 题' }}</button>
                </div>
              </div>
            </div>

            <div class="spec-submit">
              <p v-if="!template">当前条件 <b>{{ pool.length }}</b> 道可用 · 抽取 {{ takeCount }} 道</p>
              <p v-else>标准卷 {{ template.sections.reduce((a,s)=>a+s.count,0) }} 个题位 · 总分 {{ template.total }} 分</p>
              <button class="btn btn-primary btn-block" @click="generate"><Icon name="spark" :size="15" /> 生成试卷</button>
            </div>
          </aside>

          <section class="assembly-proof">
            <header class="proof-head">
              <div class="proof-title">
                <span class="ps-kicker">PROOF / 试卷校样</span>
                <h2>{{ title.trim() || defaultTitle }}</h2>
                <p v-if="preview.length">共 {{ preview.length }} 题 · 合计 {{ previewScore }} 分 · {{ U.timeStr(Date.now()) }}</p>
                <p v-else>{{ template ? '选择难度与题源，按 2026 标准结构生成校样' : '在左侧设定条件，生成一张自由拼合的校样' }}</p>
              </div>
              <div class="proof-status" :class="{ ready: preview.length }">
                <span>{{ preview.length ? 'READY' : 'DRAFT' }}</span>
                <b>{{ pad(preview.length) }}</b>
                <em>Q · {{ previewScore }} P</em>
              </div>
            </header>

            <div class="proof-toolbar" v-if="preview.length">
              <span>{{ preview.length }} 题 · {{ previewScore }} 分</span>
              <div class="proof-actions">
                <button class="proof-action" @click="print"><Icon name="printer" :size="13" /> 打印</button>
                <button class="proof-action" @click="save"><Icon name="bookmark" :size="13" /> 保存</button>
                <button class="proof-action primary" @click="start"><Icon name="play" :size="13" /> 开始练习</button>
              </div>
            </div>

            <div class="proof-body" v-if="previewQuestions.length">
              <section class="proof-section" v-for="group in previewSections" :key="group.key">
                <header class="proof-section-head">
                  <b>{{ group.name || '自由组题' }}</b>
                  <span>{{ group.items.length }} 题 · {{ sectionPoints(group) }} 分</span>
                </header>
                <div class="proof-row" v-for="row in group.items" :key="row.q.id">
                  <span class="pr-no">{{ pad(row.index + 1) }}</span>
                  <span class="pr-main">
                    <b>{{ row.q.kpName }}</b>
                    <span>{{ row.q.year }} 年 · {{ row.q.typeName }} · {{ row.it.score != null ? row.it.score : row.q.score }} 分</span>
                  </span>
                  <span class="pr-loose" v-if="row.it.loose">难度放宽</span>
                  <button class="pr-remove" title="移除此题" @click="removePreview(row.index)"><Icon name="x" :size="13" /></button>
                </div>
              </section>
            </div>

            <div class="proof-empty" v-else>
              <div class="pe-cross" aria-hidden="true"><i></i><i></i><span></span></div>
              <span class="ps-kicker">NO PROOF YET / 待生成</span>
              <h3>校样还是空白</h3>
              <p>{{ template ? '题库越足，标准卷越完整；缺题时先导入对应科目的 PDF。' : '条件越具体，组出来的卷子越贴近你的薄弱点。' }}</p>
              <button class="proof-action" @click="go('/import')"><Icon name="upload" :size="13" /> 去导入题库</button>
            </div>

            <section class="proof-records" v-if="S.papers.length">
              <header class="proof-section-head">
                <b>组卷记录</b><span>{{ S.papers.length }} 份 · 保存在本机</span>
              </header>
              <div class="record-row" v-for="p in S.papers" :key="p.id">
                <span class="rr-date">{{ U.relTime(p.at) }}</span>
                <span class="rr-main"><b>{{ p.title }}</b><em>{{ p.count }} 题 · {{ p.score }} 分</em></span>
                <button class="pr-action" title="开始练习" @click="startRecord(p)"><Icon name="play" :size="13" /></button>
                <button class="pr-action" title="删除" @click="removeRecord(p)"><Icon name="trash" :size="13" /></button>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>`,
  };

  /* ================= Profile ================= */
  YT.components.ProfileView = {
    data() {
      return {
        S: S,
        U: U,
        editing: false,
        nameInput: S.user.name || "",
      };
    },
    computed: {
      initial() {
        return (S.user.name || "研").slice(0, 1);
      },
      practiceCount() {
        return S.practice.length;
      },
      answeredTotal() {
        return S.practice.reduce((n, p) => n + (p.total || 0), 0);
      },
      avgAccuracy() {
        const list = S.practice.filter((p) => p.accuracy != null);
        if (!list.length) return 0;
        return Math.round(list.reduce((n, p) => n + p.accuracy, 0) / list.length);
      },
      studyDays() {
        const days = {};
        S.practice.forEach((p) => (days[U.dateStr(p.at)] = true));
        return Object.keys(days).length;
      },
      masteryCounts() {
        const c = { 1: 0, 2: 0, 3: 0 };
        Object.keys(S.mastery).forEach((id) => {
          const lv = S.mastery[id];
          if (c[lv] != null) c[lv] += 1;
        });
        return c;
      },
      markedTotal() {
        return this.masteryCounts[1] + this.masteryCounts[2] + this.masteryCounts[3];
      },
      masteryBars() {
        const t = Math.max(1, this.markedTotal);
        return [
          { key: 1, label: "简单", count: this.masteryCounts[1], color: "#16a34a" },
          { key: 2, label: "一般", count: this.masteryCounts[2], color: "#eab308" },
          { key: 3, label: "不会", count: this.masteryCounts[3], color: "#e0483a" },
        ].map((x) => Object.assign({}, x, { pct: Math.round((x.count / t) * 100) }));
      },
      subjectStats() {
        const m = {};
        S.practice.forEach((p) => {
          const key = p.subjectName || "综合";
          m[key] = (m[key] || 0) + (p.total || 0);
        });
        return Object.keys(m)
          .map((k) => ({ name: k, count: m[k] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);
      },
    },
    methods: {
      go: U.go,
      pad(n) {
        return String(n || 0).padStart(2, "0");
      },
      openLogin() {
        S.loginOpen = true;
      },
      editName() {
        this.nameInput = S.user.name || "";
        this.editing = true;
      },
      saveName() {
        const v = this.nameInput.trim().slice(0, 12);
        S.user.name = v;
        if (v && !S.user.createdAt) S.user.createdAt = Date.now();
        this.editing = false;
        U.toast(v ? "昵称已更新" : "已切换为访客身份");
      },
      cancelName() {
        this.editing = false;
      },
      exportData() {
        const data = {
          exportedAt: new Date().toISOString(),
          site: "研题岛 ATLAS",
          user: S.user,
          wrong: S.wrong,
          favorites: S.favorites,
          mastery: S.mastery,
          notes: S.notes,
          comments: S.comments,
          practice: S.practice,
          papers: S.papers,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "yantidao-progress.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        U.toast("学习数据已导出");
      },
      clearPractice() {
        if (!S.practice.length) {
          U.toast("还没有练习记录");
          return;
        }
        U.askConfirm("清空练习记录？", "错题、收藏、笔记和掌握标记不会被删除。", () => {
          S.practice = [];
          U.toast("练习记录已清空");
        });
      },
      resetAll() {
        U.askConfirm("清空全部本地数据？", "错题、收藏、笔记、练习记录和昵称都会被删除，且无法恢复。", () => {
          try { localStorage.removeItem("yantidao_state_v1"); } catch (e) { /* ignore */ }
          location.hash = "#/";
          location.reload();
        });
      },
      startPaper(p) {
        if (!p.ids || !p.ids.length) {
          U.toast("这份试卷没有题目");
          return;
        }
        U.startPractice(p.ids, { title: p.title, subject: p.subject, subjectName: p.subjectName, mode: "paper" });
      },
      deletePaper(p) {
        U.askConfirm("删除这份试卷？", "「" + p.title + "」将从组卷记录中移除。", () => {
          const i = S.papers.findIndex((x) => x.id === p.id);
          if (i >= 0) S.papers.splice(i, 1);
          U.toast("已删除试卷");
        });
      },
      openFav() {
        U.go("/wrong-book?tab=fav");
      },
      openWrong() {
        U.go("/wrong-book");
      },
      fmtDuration(sec) {
        const m = Math.floor((sec || 0) / 60);
        const s = Math.floor((sec || 0) % 60);
        return m + ":" + String(s).padStart(2, "0");
      },
    },
    template: `
    <main class="plate-page profile-page">
      <div class="container plate-frame">
        <header class="plate-mast">
          <div class="plate-no"><span>PLATE</span><b>09</b><em>FIELD RECORD</em></div>
          <div class="plate-title">
            <span class="plate-kicker">PERSONAL ARCHIVE / LOCAL ONLY</span>
            <h1>学习档案</h1>
            <p>所有数据仅保存在当前浏览器 · 换设备不会同步</p>
          </div>
        </header>

        <section class="record-identity">
          <div class="record-avatar">{{ initial }}</div>
          <div class="record-id">
            <div v-if="!editing">
              <span class="ps-kicker">FIELD RECORD OWNER</span>
              <h2>{{ S.user.name || '访客研友' }}</h2>
              <p>{{ S.user.name ? (S.user.createdAt ? '加入于 ' + U.dateStr(S.user.createdAt) : '本地昵称') : '设置一个昵称，让学习记录更有归属感' }}</p>
            </div>
            <div v-else class="record-edit">
              <input class="bare-input" v-model="nameInput" maxlength="12" placeholder="输入昵称（12 字内）" @keyup.enter="saveName" />
              <button class="btn btn-primary btn-sm" @click="saveName">保存</button>
              <button class="btn btn-ghost btn-sm" @click="cancelName">取消</button>
            </div>
          </div>
          <div class="record-actions">
            <button class="record-action-inline" @click="editName" v-if="!editing"><Icon name="edit" :size="14" /> {{ S.user.name ? '修改昵称' : '设置昵称' }}</button>
            <button class="record-action-inline" @click="openFav"><Icon name="star" :size="14" /> 收藏 {{ S.favorites.length }}</button>
            <span class="record-stamp">LOCAL<br />ARCHIVE</span>
          </div>
        </section>

        <div class="record-grid">
          <aside class="record-side">
            <section class="record-block">
              <header class="record-block-head"><span class="ps-kicker">MEASUREMENTS</span><span>累计</span></header>
              <div class="record-figures">
                <div><span>练习组数</span><b>{{ practiceCount }}</b><em>SESSIONS</em></div>
                <div><span>累计答题</span><b>{{ answeredTotal }}</b><em>QUESTIONS</em></div>
                <div><span>平均正确率</span><b>{{ avgAccuracy }}</b><em>PERCENT</em></div>
                <div><span>错题本</span><b>{{ S.wrong.length }}</b><em>TO REVISIT</em></div>
              </div>
            </section>

            <section class="record-block">
              <header class="record-block-head"><span class="ps-kicker">MASTERY PROFILE</span><span>已标记 {{ markedTotal }}</span></header>
              <div class="mastery-strip" v-if="markedTotal">
                <i v-for="b in masteryBars" :key="b.key" :style="{ width: b.pct + '%', background: b.color }" :title="b.label + ' ' + b.count + ' 题'"></i>
              </div>
              <div class="mastery-strip empty" v-else></div>
              <div class="mastery-rows">
                <div class="mastery-row" v-for="b in masteryBars" :key="b.key">
                  <span class="mr-dot" :style="{ background: b.color }"></span>
                  <b>{{ b.label }}</b>
                  <em>{{ b.count }}</em>
                  <small>{{ markedTotal ? b.pct : 0 }}%</small>
                </div>
              </div>
              <p class="record-block-foot" v-if="!markedTotal">做题后标记「简单 / 一般 / 不会」，这里会生成掌握度画像。</p>
              <p class="record-block-foot" v-else>学习 {{ studyDays }} 天 · 收藏 {{ S.favorites.length }} 题</p>
            </section>

            <section class="record-block">
              <header class="record-block-head"><span class="ps-kicker">DATA & SETTINGS</span><span>本机</span></header>
              <div class="record-links">
                <button @click="openWrong"><span>错题本</span><em>{{ S.wrong.length }} 题</em><Icon name="arrow-right" :size="12" /></button>
                <button @click="openFav"><span>收藏夹</span><em>{{ S.favorites.length }} 题</em><Icon name="arrow-right" :size="12" /></button>
                <button @click="exportData"><span>导出学习数据</span><em>JSON</em><Icon name="download" :size="12" /></button>
                <button @click="clearPractice"><span>清空练习记录</span><em>保留错题</em><Icon name="rotate" :size="12" /></button>
                <button class="danger" @click="resetAll"><span>清空全部本地数据</span><em>不可恢复</em><Icon name="trash" :size="12" /></button>
              </div>
              <p class="record-note">本站为纯静态演示：没有账号系统，也不会上传任何数据。清除浏览器缓存会同时丢失这些记录。</p>
            </section>
          </aside>

          <section class="record-main">
            <section class="record-log">
              <header class="record-log-head">
                <div><span class="ps-kicker">01 / SESSION LOG</span><h3>最近练习</h3></div>
                <span>{{ S.practice.length }} 条记录</span>
              </header>
              <div v-if="S.practice.length">
                <div class="session-row" v-for="(p, i) in S.practice.slice(0, 10)" :key="i">
                  <span class="session-no">{{ pad(i + 1) }}</span>
                  <div class="session-main">
                    <b>{{ p.title }}</b>
                    <span>{{ U.timeStr(p.at) }} · {{ p.total }} 题 · 用时 {{ fmtDuration(p.duration) }}</span>
                  </div>
                  <span class="session-acc" :class="{ low: p.accuracy < 60 }">{{ p.accuracy }}<em>%</em></span>
                </div>
              </div>
              <div class="record-empty" v-else>
                <span class="ps-kicker">NO SESSIONS YET</span>
                <p>还没有练习记录，去考点页刷一组吧。</p>
                <button class="proof-action" @click="go('/dashboard/math1')">开始刷题</button>
              </div>
            </section>

            <section class="record-log">
              <header class="record-log-head">
                <div><span class="ps-kicker">02 / SAVED PAPERS</span><h3>我的试卷</h3></div>
                <button class="sheet-link" @click="go('/assembly')"><Icon name="layers" :size="12" /> 去组卷</button>
              </header>
              <div v-if="S.papers.length">
                <div class="session-row" v-for="p in S.papers.slice(0, 6)" :key="p.id">
                  <span class="session-no">{{ p.count }}</span>
                  <div class="session-main">
                    <b>{{ p.title }}</b>
                    <span>{{ U.relTime(p.at) }} · {{ p.score }} 分</span>
                  </div>
                  <button class="row-icon" title="开始练习" @click="startPaper(p)"><Icon name="play" :size="13" /></button>
                  <button class="row-icon" title="删除" @click="deletePaper(p)"><Icon name="trash" :size="13" /></button>
                </div>
              </div>
              <div class="record-empty small" v-else>
                <p>还没有保存的试卷，去「智能组卷」拼一份。</p>
              </div>
            </section>

            <section class="record-log" v-if="subjectStats.length">
              <header class="record-log-head">
                <div><span class="ps-kicker">03 / SUBJECT VOLUME</span><h3>科目练习量</h3></div>
                <span>题次</span>
              </header>
              <div class="subject-bars">
                <div class="subject-row" v-for="s in subjectStats" :key="s.name">
                  <span>{{ s.name }}</span>
                  <span class="subject-track"><i :style="{ width: Math.min(100, (s.count / Math.max(1, subjectStats[0].count)) * 100) + '%' }"></i></span>
                  <b>{{ s.count }}</b>
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>`,
  };

  /* ================= 404 ================= */
  YT.components.NotFoundView = {
    data() {
      return {
        U: U,
        routes: [
          { no: "01", name: "总览", path: "/" },
          { no: "02", name: "题库", path: "/papers" },
          { no: "03", name: "组卷", path: "/assembly" },
          { no: "04", name: "导入", path: "/import" },
          { no: "05", name: "错题", path: "/wrong-book" }
        ]
      };
    },
    template: `
    <main class="void-page">
      <div class="void-sheet">
        <header class="void-mast">
          <span class="plate-kicker">PLATE ∅ / UNFILED SHEET</span>
          <span class="void-code">ERR · 404 · VOID</span>
        </header>
        <div class="void-body">
          <div class="void-figure">
            <span class="void-num">404</span>
            <span class="void-stamp">NOT FILED</span>
          </div>
          <div class="void-copy">
            <p class="void-kicker">ROUTE NOT REGISTERED / 路径未登记</p>
            <h1>这一页不在卷宗里</h1>
            <p class="void-note">这个地址没有被归档，可能是链接过期、拼写有误，或者这一页已经被抽出卷宗。</p>
            <div class="void-actions">
              <button class="btn btn-primary" @click="U.go('/')">回到总览</button>
              <button class="btn btn-ghost" @click="U.go('/papers')">去题库</button>
            </div>
          </div>
        </div>
        <div class="void-index">
          <span class="void-index-label">AVAILABLE ROUTES / 已收录路径</span>
          <button v-for="r in routes" :key="r.no" class="void-route" @click="U.go(r.path)">
            <span class="void-route-no">{{ r.no }}</span>
            <span class="void-route-name">{{ r.name }}</span>
            <span class="void-route-path">{{ r.path }}</span>
            <span class="void-route-arrow">→</span>
          </button>
        </div>
        <footer class="void-foot">
          <span>研题岛 ATLAS</span>
          <span>LOCAL-FIRST / NO SERVER</span>
        </footer>
      </div>
    </main>`,
  };
})();

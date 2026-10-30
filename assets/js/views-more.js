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
          subtitle: "研题岛真题网 · 共 " + this.yearQuestions.length + " 题 · 满分 " + this.totalScore + " 分",
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
    <main class="papers-page">
      <div class="container">
        <div class="page-head">
          <div class="page-head-left">
            <div class="crumb"><a href="#/" @click.prevent="go('/')">首页</a><span>/</span><span>{{ subject.name }}</span><span>/</span><b>年份试卷</b></div>
            <h1>{{ subject.name }} · 年份汇总</h1>
            <p>按年份整理真题 · 共 {{ allYearQuestions.length }} 题 / {{ years.length }} 个年份</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn-ghost" @click="printPaper"><Icon name="printer" :size="16" /> 打印试卷</button>
            <button class="btn btn-primary" @click="startFull"><Icon name="play" :size="16" /> 整卷练习</button>
          </div>
        </div>

        <div class="subject-pills">
          <button v-for="id in subjectIds" :key="id" class="subject-pill" :class="{active: id === subject.id}" @click="switchSubject(id)">
            {{ D.subjects.find(s => s.id === id).name }}
          </button>
          <span class="subject-pills-note">年份试卷用于整卷模拟，也可以单题精刷</span>
        </div>

        <div class="papers-layout">
          <aside class="year-panel card">
            <h3>选择年份</h3>
            <button v-for="y in years.slice().reverse()" :key="y" class="year-item" :class="{active: y === selectedYear}" @click="chooseYear(y)">
              <span>{{ y }} 年</span><i>{{ yearCount[y] || 0 }} 题</i>
            </button>
            <p class="year-note">试卷为原创示例题，按年份与题号编排，用于演示整卷刷题流程。</p>
          </aside>

          <div class="paper-main">
            <section class="paper-head-card card">
              <div>
                <h1>{{ selectedYear }} 年全国硕士研究生招生考试<br />{{ subject.name }}（示例卷）</h1>
                <div class="paper-meta">
                  <span class="chip">共 {{ yearQuestions.length }} 题</span>
                  <span class="chip">满分 {{ totalScore }} 分</span>
                  <span class="chip">{{ typesInYear.join(' / ') }}</span>
                  <span class="chip">已掌握 {{ answeredCount }} 题</span>
                </div>
              </div>
              <div class="paper-head-actions">
                <button class="btn btn-ghost btn-sm" @click="yearShift(-1)"><Icon name="chev-left" :size="14" /> 上一年</button>
                <button class="btn btn-ghost btn-sm" @click="yearShift(1)">下一年 <Icon name="chev-right" :size="14" /></button>
              </div>
            </section>

            <section class="paper-section card">
              <div class="paper-section-head">
                <h3><Icon name="grid" :size="15" /> 题号导航</h3>
                <span style="font-size:11.5px;color:#b3a998">点击题号直接进入题目</span>
              </div>
              <div class="qnum-grid" v-if="yearQuestions.length">
                <a v-for="q in yearQuestions" :key="q.id" class="qnum" :class="{answered: S.mastery[q.id]}" :href="'#/question/' + q.id" @click.prevent="openQuestion(q)" :title="q.typeName + ' · ' + q.kpName">
                  {{ q.indexNo }}<span class="qnum-dot" v-if="S.mastery[q.id]"></span>
                </a>
              </div>
              <div class="empty-state" v-else style="padding:24px">
                <p>该年份暂无题目。</p>
              </div>
              <div class="paper-legend">
                <span><i></i>已标记掌握</span>
                <span><i class="gray"></i>未作答</span>
              </div>
            </section>

            <section class="paper-section card">
              <div class="paper-section-head">
                <h3><Icon name="list" :size="15" /> 题目清单</h3>
                <button class="btn btn-soft btn-sm" @click="startFull"><Icon name="play" :size="13" /> 从第 1 题开始</button>
              </div>
              <div class="paper-list" v-if="yearQuestions.length">
                <a class="paper-list-item" v-for="q in yearQuestions" :key="q.id" :href="'#/question/' + q.id" @click.prevent="openQuestion(q)">
                  <span class="no">{{ q.indexNo }}</span>
                  <div class="txt">
                    <b>{{ q.kpName }}</b>
                    <span>{{ q.typeName }} · {{ q.score }} 分 · {{ q.difficultyName }}</span>
                  </div>
                  <span class="tag tag-type" :class="'type-' + q.type">{{ q.typeName }}</span>
                  <Icon name="chev-right" :size="15" class="go-icon" />
                </a>
              </div>
              <div class="empty-state" v-else style="padding:24px">
                <p>该年份暂无题目，换一年看看。</p>
              </div>
            </section>
          </div>
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
    <main class="wrong-page">
      <div class="container">
        <div class="page-head">
          <div class="page-head-left">
            <div class="crumb"><a href="#/" @click.prevent="go('/')">首页</a><span>/</span><b>学习空间</b></div>
            <h1>{{ pageTitle }}</h1>
            <p>{{ pageDesc }} · 共 {{ allItems.length }} 题</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn-primary" @click="startAll" :disabled="!filtered.length"><Icon name="play" :size="16" /> 重刷这 {{ filtered.length }} 题</button>
          </div>
        </div>

        <div class="wrong-toolbar">
          <div class="filter-group">
            <button class="filter-chip mode" :class="{active: tab === 'wrong'}" @click="switchTab('wrong')">错题本 {{ S.wrong.length }}</button>
            <button class="filter-chip mode" :class="{active: tab === 'fav'}" @click="switchTab('fav')">收藏夹 {{ S.favorites.length }}</button>
          </div>
          <div class="filter-group">
            <select class="select-input" v-model="filters.subject">
              <option value="all">全部科目</option>
              <option v-for="s in subjectOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <select class="select-input" v-model="filters.type">
              <option value="all">全部题型</option>
              <option v-for="t in typeFilterOptions" :key="t" :value="t">{{ typeNames[t] }}</option>
            </select>
            <input class="text-input" v-model="filters.keyword" placeholder="搜索题干 / 考点" style="width:160px" />
          </div>
        </div>

        <div class="wrong-list" v-if="visibleItems.length" v-math>
          <article class="wrong-item card" v-for="q in visibleItems" :key="q.id">
            <div class="wrong-main">
              <div class="wrong-meta">
                <span>{{ q.subjectName }}</span><span>·</span>
                <span>{{ q.year }} 年 第 {{ q.indexNo }} 题</span><span>·</span>
                <span>{{ q.kpName }}</span>
              </div>
              <a :href="'#/question/' + q.id" @click.prevent="openQuestion(q)" class="wrong-stem" v-html="U.fmt(q.stem)"></a>
              <div class="wrong-foot">
                <span class="tag tag-type" :class="'type-' + q.type">{{ q.typeName }}</span>
                <span class="diff" :class="'diff-' + q.difficulty">{{ q.difficultyName }}</span>
                <span v-if="S.mastery[q.id]" style="font-size:11px;color:#0f7a38;display:inline-flex;align-items:center;gap:3px"><Icon name="check-circle" :size="12" /> {{ ['','简单','一般','不会'][S.mastery[q.id]] }}</span>
                <span v-else style="font-size:11px;color:#b3a998">未标记掌握</span>
              </div>
            </div>
            <div class="wrong-actions">
              <button class="icon-btn" title="查看题目" @click="openQuestion(q)"><Icon name="arrow-right" :size="16" /></button>
              <button class="icon-btn" :title="tab === 'fav' ? '取消收藏' : '移出错题本'" @click="remove(q)"><Icon :name="tab === 'fav' ? 'star' : 'trash'" :size="16" /></button>
            </div>
          </article>
        </div>

        <div class="load-more" v-if="filtered.length > visible">
          <button class="btn btn-ghost" @click="visible += 12">加载更多（还有 {{ filtered.length - visible }} 题）<Icon name="chev-down" :size="15" /></button>
        </div>

        <div class="empty-state card" v-if="!filtered.length">
          <span class="empty-icon"><Icon :name="tab === 'fav' ? 'star' : 'flag'" :size="28" /></span>
          <h3>{{ allItems.length ? '这些筛选条件下没有题目' : (tab === 'fav' ? '还没有收藏题目' : '错题本还是空的') }}</h3>
          <p>{{ allItems.length ? '换一个科目或题型试试。' : (tab === 'fav' ? '刷题时点击题目右上角的星标，就能把好题收进来。' : '答错的题会自动进入这里；也可以手动标记，方便集中回刷。') }}</p>
          <button class="btn btn-ghost" v-if="allItems.length" @click="resetFilters">清除筛选</button>
          <button class="btn btn-primary" v-else @click="go('/dashboard/math1')">去刷题</button>
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
        U.toast("试卷已保存，可在「学习报告」中查看");
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
            "研题岛真题网 · 共 " +
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
    <main class="assembly-page">
      <div class="container">
        <div class="page-head">
          <div class="page-head-left">
            <div class="crumb"><a href="#/" @click.prevent="go('/')">首页</a><span>/</span><b>智能组卷</b></div>
            <h1>智能组卷</h1>
            <p>按最新考研题型结构拼整卷，或按考点自由抽题；支持易 / 中 / 难筛选</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn-ghost" @click="go('/import')"><Icon name="upload" :size="15" /> 导入 PDF 题库</button>
          </div>
        </div>

        <div class="assembly-layout">
          <section class="assembly-form card">
            <h2>组卷条件</h2>
            <p>标准卷按 2026 考研题型与分值生成；题库不足时会提示并放宽难度补题。</p>

            <div class="form-item">
              <label>卷型</label>
              <select class="select-input" v-model="paperType">
                <option v-for="t in paperTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>

            <div class="form-item">
              <label>科目</label>
              <select class="select-input" v-model="subjectId" :disabled="!!template">
                <option v-for="s in subjectOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
                <option v-if="!template" value="all">全科混合</option>
              </select>
              <span class="field-hint" v-if="importedCount">题库含 {{ importedCount }} 道 PDF 导入题</span>
            </div>

            <div class="form-item" v-if="template">
              <label>标准卷结构</label>
              <div class="tpl-structure">
                <div class="tpl-sec" v-for="x in templateSections" :key="x.sec.key">
                  <span>{{ x.sec.name }}</span>
                  <b>{{ x.sec.count }} 题 · {{ x.sec.scores ? x.sec.scores.reduce((a,b)=>a+b,0) : x.sec.count * x.sec.score }} 分</b>
                  <em :class="{bad: !x.exact, warn: x.exact && !x.enough}">{{ x.exact ? '可用 ' + x.exact : '同难度不足' }} / {{ x.sec.count }}{{ x.exact < x.sec.count && x.fallback ? ' · 可放宽' : '' }}</em>
                </div>
              </div>
              <p class="tpl-tip" v-if="templateShortage.length">有 {{ templateShortage.length }} 个题型当前题库不足，生成时会尽量放宽难度或留空。</p>
            </div>

            <div class="form-item">
              <label>难度</label>
              <div class="segmented">
                <button v-for="d in diffFilters" :key="d.value" :class="{on: difficulty === d.value}" @click="difficulty = d.value">{{ d.label }}</button>
              </div>
              <span class="field-hint">标准卷也按此难度抽题；不足时自动放宽并在预览中标出。</span>
            </div>

            <div class="form-item">
              <label>题源</label>
              <select class="select-input" v-model="source">
                <option value="all">全部题目（内置 + 导入）</option>
                <option value="builtin">仅内置示例题</option>
                <option value="imported">仅我导入的 PDF 题</option>
              </select>
            </div>

            <div class="form-item" v-if="!template && subject">
              <label>考点范围（不选则全科）</label>
              <div class="kp-select-box">
                <label v-for="item in kpNodes" :key="item.node.id" class="kp-select-row" :class="'depth-' + item.depth">
                  <input type="checkbox" :checked="checkedKps.indexOf(item.node.id) >= 0" @change="toggleKp(item.node.id)" />
                  <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ item.node.name }}</span>
                </label>
              </div>
              <div style="display:flex;gap:10px;margin-top:6px">
                <button class="btn btn-sm btn-ghost" style="height:26px" @click="allKps">选大类</button>
                <button class="btn btn-sm btn-ghost" style="height:26px" @click="clearKps">清空</button>
                <span class="field-hint" style="margin:0;line-height:26px">已选 {{ checkedKps.length }} 项</span>
              </div>
            </div>

            <div class="form-item" v-if="!template">
              <label>题型</label>
              <div class="check-chips">
                <button v-for="t in freeTypeOptions" :key="t" class="check-chip" :class="{on: types.indexOf(t) >= 0}" @click="toggleType(t)">{{ typeNames[t] }}</button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-item">
                <label>年份</label>
                <select class="select-input" v-model="year">
                  <option value="all">全部年份</option>
                  <option v-for="y in years.slice().reverse()" :key="y" :value="y">{{ y }} 年</option>
                </select>
              </div>
              <div class="form-item">
                <label>试卷名称</label>
                <input class="text-input" v-model="title" maxlength="30" placeholder="留空自动命名" />
              </div>
            </div>

            <div class="form-item" v-if="!template">
              <label>题量</label>
              <div class="segmented">
                <button v-for="n in [10,15,20,30,0]" :key="n" :class="{on: count === n}" @click="count = n">{{ n === 0 ? '全部' : n + ' 题' }}</button>
              </div>
            </div>

            <p class="modal-hint" style="margin-bottom:13px" v-if="!template">当前条件共 {{ pool.length }} 道可用题目，将随机抽取 {{ takeCount }} 道。</p>
            <p class="modal-hint" style="margin-bottom:13px" v-else>标准卷将生成 {{ template.sections.reduce((a,s)=>a+s.count,0) }} 个题位，总分 {{ template.total }} 分。</p>
            <button class="btn btn-primary btn-block btn-lg" @click="generate"><Icon name="spark" :size="16" /> 生成试卷</button>
          </section>

          <div class="assembly-preview">
            <section class="preview-head card">
              <div>
                <h2>{{ title.trim() || defaultTitle }}</h2>
                <p v-if="preview.length">共 {{ preview.length }} 题 · 合计 {{ previewScore }} 分 · {{ U.timeStr(Date.now()) }}</p>
                <p v-else>{{ template ? '选择难度和题源，点击「生成试卷」按标准结构组卷' : '在左侧设置条件，点击「生成试卷」预览题目' }}</p>
              </div>
              <div class="preview-actions">
                <button class="btn btn-ghost btn-sm" @click="print" :disabled="!preview.length"><Icon name="printer" :size="14" /> 打印</button>
                <button class="btn btn-ghost btn-sm" @click="save" :disabled="!preview.length"><Icon name="bookmark" :size="14" /> 保存</button>
                <button class="btn btn-primary btn-sm" @click="start" :disabled="!preview.length"><Icon name="play" :size="14" /> 开始练习</button>
              </div>
            </section>

            <section class="paper-section card" v-if="previewQuestions.length">
              <div class="paper-section-head">
                <h3><Icon name="list" :size="15" /> 试卷预览</h3>
                <span style="font-size:11.5px;color:#b3a998">可移除不想做的题</span>
              </div>
              <div class="tpl-preview" v-for="group in previewSections" :key="group.key">
                <div class="tpl-preview-head" v-if="group.name">
                  <b>{{ group.name }}</b>
                  <span>{{ group.items.length }} 题 · {{ group.items.reduce((a,x)=>a+(x.it.score!=null?x.it.score:x.q.score),0) }} 分</span>
                </div>
                <div class="assembled-list">
                  <div class="assembled-item" v-for="row in group.items" :key="row.q.id">
                    <span class="no">{{ row.index + 1 }}</span>
                    <span class="tag tag-type" :class="'type-' + row.q.type">{{ row.q.typeName }}</span>
                    <span class="stem" :title="plain(row.q.stem)">{{ row.q.year }} · {{ row.q.kpName }} · {{ row.q.typeName }} · {{ row.it.score != null ? row.it.score : row.q.score }} 分</span>
                    <span class="loose-tag" v-if="row.it.loose">难度放宽</span>
                    <button class="icon-btn" style="width:27px;height:27px" title="移除" @click="removePreview(row.index)"><Icon name="x" :size="13" /></button>
                  </div>
                </div>
              </div>
            </section>

            <section class="empty-state card" v-else style="padding:40px 22px">
              <span class="empty-icon"><Icon name="layers" :size="28" /></span>
              <h3>还没有生成试卷</h3>
              <p>{{ template ? '先导入对应科目的 PDF，题库越足，标准卷越完整。' : '条件越具体，组出来的卷子越贴近你的薄弱点。' }}</p>
              <button class="btn btn-ghost btn-sm" style="margin-top:12px" @click="go('/import')"><Icon name="upload" :size="14" /> 去导入题库</button>
            </section>

            <section class="records-card card" v-if="S.papers.length">
              <h3><Icon name="folder" :size="15" /> 组卷记录 <span style="font-weight:500;font-size:11px;color:#b3a998">（{{ S.papers.length }}）</span></h3>
              <div class="record-item" v-for="p in S.papers" :key="p.id">
                <span class="ico" style="width:28px;height:28px;border-radius:8px;background:#fff6ed;color:#bc520a;display:flex;align-items:center;justify-content:center;flex:none"><Icon name="book" :size="14" /></span>
                <b>{{ p.title }}</b>
                <span>{{ p.count }} 题 · {{ U.relTime(p.at) }}</span>
                <button class="icon-btn" title="开始练习" @click="startRecord(p)"><Icon name="play" :size="14" /></button>
                <button class="icon-btn" title="删除" @click="removeRecord(p)"><Icon name="trash" :size="14" /></button>
              </div>
            </section>
          </div>
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
          site: "研题岛真题网",
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
    <main class="profile-page">
      <div class="container">
        <div class="page-head">
          <div class="page-head-left">
            <div class="crumb"><a href="#/" @click.prevent="go('/')">首页</a><span>/</span><b>学习空间</b></div>
            <h1>学习报告</h1>
            <p>所有数据仅保存在当前浏览器 · 换设备不会同步</p>
          </div>
        </div>

        <section class="profile-head card">
          <div class="profile-avatar">{{ initial }}</div>
          <div class="profile-id">
            <div v-if="!editing">
              <h1>{{ S.user.name || '访客研友' }}</h1>
              <p>{{ S.user.name ? (S.user.createdAt ? '加入于 ' + U.dateStr(S.user.createdAt) : '本地昵称') : '设置一个昵称，让学习记录更有归属感' }}</p>
            </div>
            <div v-else style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
              <input class="text-input" v-model="nameInput" maxlength="12" placeholder="输入昵称（12 字内）" style="height:36px;width:190px" @keyup.enter="saveName" />
              <button class="btn btn-primary btn-sm" @click="saveName">保存</button>
              <button class="btn btn-ghost btn-sm" @click="cancelName">取消</button>
            </div>
          </div>
          <div class="profile-head-actions">
            <button class="btn btn-ghost" @click="editName" v-if="!editing"><Icon name="edit" :size="15" /> {{ S.user.name ? '修改昵称' : '设置昵称' }}</button>
            <button class="btn btn-soft" @click="openFav"><Icon name="star" :size="15" /> 收藏 {{ S.favorites.length }}</button>
          </div>
        </section>

        <div class="profile-grid">
          <div class="metric-card card">
            <div class="k"><Icon name="zap" :size="13" /> 累计练习</div>
            <div class="v">{{ practiceCount }}<em>组</em></div>
          </div>
          <div class="metric-card card">
            <div class="k"><Icon name="check-circle" :size="13" /> 累计答题</div>
            <div class="v">{{ answeredTotal }}<em>题</em></div>
          </div>
          <div class="metric-card card">
            <div class="k"><Icon name="target" :size="13" /> 平均正确率</div>
            <div class="v">{{ avgAccuracy }}<em>%</em></div>
          </div>
          <div class="metric-card card">
            <div class="k"><Icon name="flag" :size="13" /> 错题本</div>
            <div class="v">{{ S.wrong.length }}<em>题</em></div>
          </div>
        </div>

        <div class="profile-cols">
          <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
            <section class="panel-card card">
              <h3><Icon name="chart" :size="16" /> 掌握程度分布</h3>
              <div class="mastery-bars" v-if="markedTotal">
                <div class="mbar-row" v-for="b in masteryBars" :key="b.key">
                  <span class="lbl">{{ b.label }}</span>
                  <span class="mbar"><i :style="{ width: b.pct + '%', background: b.color }"></i></span>
                  <b>{{ b.count }}</b>
                </div>
              </div>
              <p class="comment-empty" v-else>做题后标记「简单 / 一般 / 不会」，这里会生成你的掌握度画像。</p>
              <div style="display:flex;gap:16px;margin-top:12px;font-size:11.5px;color:#b3a998;flex-wrap:wrap">
                <span>已标记 {{ markedTotal }} 题</span>
                <span>·</span>
                <span>已收藏 {{ S.favorites.length }} 题</span>
                <span>·</span>
                <span>学习 {{ studyDays }} 天</span>
              </div>
            </section>

            <section class="panel-card card">
              <h3><Icon name="clock" :size="16" /> 最近练习</h3>
              <div class="history-list" v-if="S.practice.length">
                <div class="history-row" v-for="(p, i) in S.practice.slice(0, 10)" :key="i">
                  <span class="ico"><Icon name="play" :size="14" /></span>
                  <div class="txt">
                    <b>{{ p.title }}</b>
                    <span>{{ U.timeStr(p.at) }} · {{ p.total }} 题 · 用时 {{ fmtDuration(p.duration) }}</span>
                  </div>
                  <span class="score" :style="{ color: p.accuracy >= 60 ? '#0f7a38' : '#e0483a' }">{{ p.accuracy }}%</span>
                </div>
              </div>
              <div class="empty-state" v-else style="padding:26px 10px">
                <p style="margin:0">还没有练习记录，去考点页刷一组吧。</p>
                <button class="btn btn-ghost btn-sm" style="margin-top:10px" @click="go('/dashboard/math1')">开始刷题</button>
              </div>
            </section>

            <section class="panel-card card" v-if="subjectStats.length">
              <h3><Icon name="grid" :size="16" /> 科目练习量</h3>
              <div class="mbar-row" v-for="s in subjectStats" :key="s.name">
                <span class="lbl" style="width:74px">{{ s.name }}</span>
                <span class="mbar"><i :style="{ width: Math.min(100, (s.count / Math.max(1, subjectStats[0].count)) * 100) + '%', background: 'linear-gradient(90deg,#fdba74,#f97316)' }"></i></span>
                <b>{{ s.count }}</b>
              </div>
            </section>
          </div>

          <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
            <section class="panel-card card">
              <h3><Icon name="folder" :size="16" /> 我的试卷 <span style="font-weight:500;font-size:11px;color:#b3a998">（{{ S.papers.length }}）</span></h3>
              <div class="history-list" v-if="S.papers.length">
                <div class="history-row" v-for="p in S.papers.slice(0, 5)" :key="p.id">
                  <span class="ico"><Icon name="book" :size="14" /></span>
                  <div class="txt">
                    <b>{{ p.title }}</b>
                    <span>{{ p.count }} 题 · {{ U.relTime(p.at) }}</span>
                  </div>
                  <button class="icon-btn" style="width:28px;height:28px" title="开始" @click="startPaper(p)"><Icon name="play" :size="13" /></button>
                  <button class="icon-btn" style="width:28px;height:28px" title="删除" @click="deletePaper(p)"><Icon name="trash" :size="13" /></button>
                </div>
              </div>
              <p class="comment-empty" v-else>还没有保存的试卷，去「智能组卷」拼一份。</p>
              <button class="btn btn-ghost btn-sm btn-block" style="margin-top:11px" @click="go('/assembly')"><Icon name="layers" :size="14" /> 去组卷</button>
            </section>

            <section class="panel-card card">
              <h3><Icon name="settings" :size="16" /> 数据与设置</h3>
              <div class="profile-actions">
                <button class="profile-action" @click="openWrong"><Icon name="flag" :size="16" /> 错题本 <span style="margin-left:auto;color:#b3a998">{{ S.wrong.length }} 题</span></button>
                <button class="profile-action" @click="openFav"><Icon name="star" :size="16" /> 收藏夹 <span style="margin-left:auto;color:#b3a998">{{ S.favorites.length }} 题</span></button>
                <button class="profile-action" @click="exportData"><Icon name="download" :size="16" /> 导出学习数据（JSON）</button>
                <button class="profile-action" @click="clearPractice"><Icon name="rotate" :size="16" /> 清空练习记录</button>
                <button class="profile-action danger" @click="resetAll"><Icon name="trash" :size="16" /> 清空全部本地数据</button>
              </div>
              <p style="font-size:10.5px;color:#b3a998;line-height:1.7;margin-top:11px">本站为纯静态演示：没有账号系统，也不会上传任何数据。清除浏览器缓存会同时丢失这些记录。</p>
            </section>
          </div>
        </div>
      </div>
    </main>`,
  };

  /* ================= 404 ================= */
  YT.components.NotFoundView = {
    data() {
      return { U: U };
    },
    template: `
    <main class="question-page">
      <div class="container">
        <div class="empty-state card" style="margin-top:34px;padding:64px 24px">
          <span class="empty-icon"><Icon name="alert" :size="28" /></span>
          <h3>页面走丢了</h3>
          <p>这个地址没有对应的内容，回到首页继续刷题吧。</p>
          <button class="btn btn-primary" @click="U.go('/')">返回首页</button>
        </div>
      </div>
    </main>`,
  };
})();

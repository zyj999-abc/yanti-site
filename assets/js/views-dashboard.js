/* Dashboard: ATLAS plate — index margin, focus field, strata, ledger */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;
  const S = YT.S;

  const TYPE_META = {
    choice: { name: "选择题", short: "选择", color: "#bf6741" },
    blank: { name: "填空题", short: "填空", color: "#747b95" },
    solution: { name: "解答题", short: "解答", color: "#537c8d" },
    proof: { name: "证明题", short: "证明", color: "#5f8c70" },
  };

  YT.components.KpNode = {
    name: "KpNode",
    props: {
      node: Object,
      depth: { type: Number, default: 0 },
      counts: Object,
      openMap: Object,
      selected: String,
    },
    computed: {
      hasChildren() {
        return this.node.children && this.node.children.length > 0;
      },
      count() {
        return (this.counts && this.counts[this.node.id]) || 0;
      },
      isOpen() {
        return !!this.openMap[this.node.id];
      },
    },
    emits: ["select", "toggle"],
    template: `
    <div class="idx-node">
      <div class="idx-row" :class="['idx-depth-' + Math.min(depth, 3), { active: selected === node.id, muted: count === 0 }]" @click="$emit('select', node.id)">
        <button v-if="hasChildren" class="idx-chev" :class="{ open: isOpen }" @click.stop="$emit('toggle', node.id)" tabindex="-1" aria-label="展开">
          <Icon name="chev-right" :size="11" />
        </button>
        <span v-else class="idx-tick"></span>
        <span class="idx-label">{{ node.name }}</span>
        <span class="idx-count">{{ count || '—' }}</span>
      </div>
      <div class="idx-children" v-if="hasChildren && isOpen">
        <KpNode v-for="child in node.children" :key="child.id" :node="child" :depth="depth + 1" :counts="counts" :open-map="openMap" :selected="selected" @select="$emit('select', $event)" @toggle="$emit('toggle', $event)" />
      </div>
    </div>`,
  };

  YT.components.DashboardView = {
    props: { subjectId: String },
    data() {
      return {
        D: D, S: S, U: U, activeType: "all", visible: 14, drawerOpen: false, startOpen: false,
        startCount: 10, startTypes: ["choice", "blank", "solution", "proof"],
        openMap: {}, selectedKp: "",
        sortMode: "year", diffFilter: 0, onlyUnmarked: false, ledgerQuery: "",
      };
    },
    computed: {
      subject() {
        return U.subjectOf(this.subjectId) || U.subjectOf("math2");
      },
      group() {
        return this.subject ? D.groups[this.subject.group] : null;
      },
      subjectIds() {
        return this.group ? this.group.subjects : [];
      },
      tree() {
        return this.group ? this.group.tree : [];
      },
      qAll() {
        return U.questionsOf(this.subject.id);
      },
      counts() {
        const m = U.nodeMapFor(this.subject.id);
        const out = {};
        Object.keys(m).forEach((id) => {
          out[id] = U.nodeCount(this.subject.id, id);
        });
        return out;
      },
      selectedNode() {
        const m = U.nodeMapFor(this.subject.id);
        return m[this.selectedKp] ? m[this.selectedKp].node : this.tree[0];
      },
      selectedPath() {
        return U.kpPath(this.selectedKp);
      },
      nodeCode() {
        let i = 0;
        let found = 0;
        const walk = (nodes) => {
          for (let k = 0; k < nodes.length; k++) {
            i += 1;
            if (nodes[k].id === this.selectedKp) { found = i; return; }
            if (nodes[k].children) walk(nodes[k].children);
            if (found) return;
          }
        };
        walk(this.tree);
        return String(found || 1).padStart(2, "0");
      },
      nodeQuestions() {
        if (!this.selectedKp) return this.qAll;
        return U.questionsForNode(this.subject.id, this.selectedKp);
      },
      typeCounts() {
        const c = { all: this.nodeQuestions.length, choice: 0, blank: 0, solution: 0, proof: 0 };
        this.nodeQuestions.forEach((q) => (c[q.type] = (c[q.type] || 0) + 1));
        return c;
      },
      types() {
        return [
          { id: "all", name: "全部", count: this.typeCounts.all },
          { id: "choice", name: "选择题", count: this.typeCounts.choice },
          { id: "blank", name: "填空题", count: this.typeCounts.blank },
          { id: "solution", name: "解答题", count: this.typeCounts.solution },
          { id: "proof", name: "证明题", count: this.typeCounts.proof },
        ];
      },
      available() {
        return this.qAll.length > 0;
      },
      filtered() {
        let list = this.activeType === "all" ? this.nodeQuestions.slice() : this.nodeQuestions.filter((q) => q.type === this.activeType);
        if (this.diffFilter) list = list.filter((q) => q.difficulty === this.diffFilter);
        if (this.onlyUnmarked) list = list.filter((q) => !S.mastery[q.id]);
        const k = this.ledgerQuery.trim().toLowerCase();
        if (k) list = list.filter((q) => (U.qTitle(q) + " " + q.kpName + " " + q.year).toLowerCase().indexOf(k) >= 0);
        if (this.sortMode === "year") list.sort((a, b) => b.year - a.year || a.indexNo - b.indexNo);
        else if (this.sortMode === "old") list.sort((a, b) => a.year - b.year || a.indexNo - b.indexNo);
        else if (this.sortMode === "hard") list.sort((a, b) => b.difficulty - a.difficulty || b.year - a.year);
        else if (this.sortMode === "easy") list.sort((a, b) => a.difficulty - b.difficulty || b.year - a.year);
        return list;
      },
      diffCounts() {
        const c = { 1: 0, 2: 0, 3: 0 };
        this.nodeQuestions.forEach((q) => (c[q.difficulty] = (c[q.difficulty] || 0) + 1));
        return c;
      },
      unmarkedCount() {
        return this.nodeQuestions.filter((q) => !S.mastery[q.id]).length;
      },
      markedCount() {
        return this.nodeQuestions.filter((q) => !!S.mastery[q.id]).length;
      },
      keyedCount() {
        return this.nodeQuestions.filter((q) => U.hasKey(q)).length;
      },
      visibleQuestions() {
        return this.filtered.slice(0, this.visible);
      },
      years() {
        return U.yearsOf(this.subject.id);
      },
      latestYear() {
        return this.years.length ? this.years[this.years.length - 1] : "—";
      },
      yearSeries() {
        const map = {};
        this.nodeQuestions.forEach((q) => (map[q.year] = (map[q.year] || 0) + 1));
        return U.yearsOf(this.subject.id).map((y) => ({ year: y, count: map[y] || 0 }));
      },
      yearMax() {
        return Math.max(1, ...this.yearSeries.map((r) => r.count));
      },
      typeSegments() {
        const total = this.nodeQuestions.length || 1;
        return ["choice", "blank", "solution", "proof"].map((t) => {
          const count = this.typeCounts[t] || 0;
          return {
            type: t,
            name: TYPE_META[t].name,
            short: TYPE_META[t].short,
            color: TYPE_META[t].color,
            count: count,
            pct: Math.round((count / total) * 100),
          };
        });
      },
      stats() {
        const qs = this.nodeQuestions;
        const have = new Set(qs.map((q) => q.year));
        const totalScore = qs.reduce((n, q) => n + q.score, 0);
        const totalAll = this.qAll.length || 1;
        return {
          total: qs.length,
          years: have.size,
          avg: totalScore / Math.max(1, this.years.length),
          totalPct: Math.min(100, Math.round((qs.length / totalAll) * 100)),
        };
      },
      startPool() {
        return this.nodeQuestions.filter((q) => this.startTypes.indexOf(q.type) >= 0);
      },
      examDays() {
        const now = new Date();
        const exam = new Date(now.getFullYear() + "-12-26T08:30:00");
        if (exam < now) exam.setFullYear(exam.getFullYear() + 1);
        return Math.max(0, Math.ceil((exam - now) / 86400000));
      },
    },
    watch: {
      subjectId: {
        immediate: true,
        handler() {
          this.resetKp();
        },
      },
      selectedKp() {
        this.activeType = "all";
        this.visible = 14;
        this.ledgerQuery = "";
      },
      activeType() { this.visible = 14; },
      diffFilter() { this.visible = 14; },
      onlyUnmarked() { this.visible = 14; },
      sortMode() { this.visible = 14; },
      ledgerQuery() { this.visible = 14; },
    },
    mounted() {
      if (this.subject) S.lastSubject = this.subject.id;
      this.resetKp();
    },
    methods: {
      t: U,
      go: U.go,
      pad(n) {
        return String(n || 0).padStart(2, "0");
      },
      rowPct(n) {
        if (!n) return 0;
        return Math.max(2, Math.round((n / this.yearMax) * 100));
      },
      subjectName(id) {
        const s = D.subjects.find((x) => x.id === id);
        return s ? s.name : id;
      },
      subjectQ(id) {
        return U.questionsOf(id).length;
      },
      subjectCode(id) {
        return { math1: "M-01", math2: "M-02", math3: "M-03", cs408: "CS-408", english1: "E-01", english2: "E-02" }[id] || "A-00";
      },
      resetKp() {
        if (!this.subject) return;
        const tree = this.tree;
        const first = tree[0];
        const firstSub = first && first.children && first.children[0] ? first.children[0] : first;
        this.selectedKp = firstSub ? firstSub.id : "";
        this.openMap = {};
        if (first) this.openMap[first.id] = true;
        if (firstSub && firstSub.children) this.openMap[firstSub.id] = true;
      },
      toggleNode(id) {
        this.openMap[id] = !this.openMap[id];
      },
      selectKp(id) {
        this.selectedKp = id;
        this.drawerOpen = false;
        this.$nextTick(() => {
          const el = document.querySelector(".field-focus");
          if (el && window.scrollY > 220) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
      switchSubject(id) {
        S.lastSubject = id;
        U.go("/dashboard/" + id);
      },
      openQuestion(q) {
        S.lastSubject = q.subject;
        U.go("/question/" + q.id);
      },
      setType(id) {
        this.activeType = id;
        this.visible = 14;
      },
      setDiff(n) {
        this.diffFilter = this.diffFilter === n ? 0 : n;
      },
      resetFilters() {
        this.activeType = "all";
        this.diffFilter = 0;
        this.onlyUnmarked = false;
        this.ledgerQuery = "";
        this.sortMode = "year";
        this.visible = 14;
      },
      hasFilters() {
        return this.activeType !== "all" || !!this.diffFilter || this.onlyUnmarked || !!this.ledgerQuery.trim();
      },
      startFromFiltered() {
        const ids = this.filtered.map((q) => q.id);
        if (!ids.length) return U.toast("当前筛选下没有题目");
        S.lastSubject = this.subject.id;
        U.startPractice(ids, {
          title: this.selectedNode.name + " · 筛选练习（" + ids.length + " 题）",
          subject: this.subject.id, subjectName: this.subject.name, mode: "filter",
        });
      },
      loadMore() {
        this.visible += 14;
      },
      openStart() {
        this.startTypes = this.activeType === "all" ? ["choice", "blank", "solution", "proof"] : [this.activeType];
        this.startCount = Math.min(10, this.nodeQuestions.length);
        this.startOpen = true;
      },
      toggleStartType(t) {
        const i = this.startTypes.indexOf(t);
        if (i >= 0) {
          if (this.startTypes.length === 1) return U.toast("至少保留一种题型");
          this.startTypes.splice(i, 1);
        } else this.startTypes.push(t);
      },
      begin() {
        const pool = U.shuffle(this.startPool);
        const count = this.startCount === 0 ? pool.length : Math.min(this.startCount, pool.length);
        const ids = pool.slice(0, count).map((q) => q.id);
        this.startOpen = false;
        S.lastSubject = this.subject.id;
        U.startPractice(ids, {
          title: this.selectedNode.name + " · 组合练习",
          subject: this.subject.id,
          subjectName: this.subject.name,
          mode: "kp",
        });
      },
      typeName(t) {
        return TYPE_META[t] ? TYPE_META[t].name : "题目";
      },
      goPapers() {
        U.go("/papers/" + this.subject.id);
      },
    },
    template: `
    <main class="plate-page dashboard-page">
      <div class="container plate-frame">
        <header class="plate-mast">
          <div class="plate-no"><span>PLATE</span><b>02</b><em>SYLLABUS MAP</em></div>
          <div class="plate-title">
            <span class="plate-kicker">KNOWLEDGE FIELD / {{ subjectCode(subject.id) }}</span>
            <h1>考点地图</h1>
            <p v-if="available">{{ subject.name }} · {{ qAll.length }} 道真题 · {{ U.papersOf(subject.id).length }} 套原卷 · {{ years.length }} 个年份归档</p>
            <p v-else>{{ subject.name }} · 尚未收录真题，导入 PDF 后这里会自动生成考点地图</p>
          </div>
          <div class="plate-actions">
            <button class="btn btn-ghost" @click="goPapers"><Icon name="calendar" :size="15" /> 年份档案</button>
            <button class="btn btn-primary" v-if="available" @click="openStart"><Icon name="spark" :size="15" /> 组合练习</button>
            <button class="btn btn-primary" v-else @click="go('/import')"><Icon name="upload" :size="15" /> 导入真题 PDF</button>
          </div>
        </header>

        <div class="terrain-switch" role="tablist" aria-label="切换科目">
          <button v-for="id in subjectIds" :key="id" class="terrain-switch-item" :class="{ active: id === subject.id }" @click="switchSubject(id)">
            <span>{{ subjectCode(id) }}</span>
            <b>{{ subjectName(id) }}</b>
            <em>{{ subjectQ(id) }} Q</em>
          </button>
          <span class="terrain-switch-note">切换科目不会丢失学习记录</span>
        </div>

        <button class="index-trigger" @click="drawerOpen = true">
          <span><Icon name="list" :size="16" /><em>INDEX</em><b>{{ selectedNode.name }}</b></span>
          <span>{{ nodeQuestions.length }} 题 <Icon name="chev-down" :size="15" /></span>
        </button>

        <section class="plate-empty" v-if="!available">
          <span class="pe-stamp">NO ARCHIVE YET</span>
          <h2>{{ subject.name }} 还没有真题</h2>
          <p>本站已内置 2010–2023 年数学二真题原卷。其他科目需要你自己上传真题 PDF：解析、分题型、分配考点后即可在此生成考点地图，并参与组卷与练习。</p>
          <div class="pe-actions">
            <button class="btn btn-primary" @click="go('/import')"><Icon name="upload" :size="15" /> 去导入 PDF</button>
            <button class="btn btn-ghost" @click="switchSubject('math2')"><Icon name="target" :size="15" /> 先看数学二考点地图</button>
          </div>
          <ul class="pe-steps">
            <li><i>01</i><span>上传真题 PDF，浏览器内逐页渲染</span></li>
            <li><i>02</i><span>框选题目区域，指定题型与分值</span></li>
            <li><i>03</i><span>分配考点，入库后长期保存在本机</span></li>
          </ul>
        </section>

        <div class="dash-sheet" v-else>
          <aside class="dash-index">
            <header class="index-head">
              <div><span>INDEX / 考点索引</span><b>目录</b></div>
              <em>{{ qAll.length }} Q</em>
            </header>
            <div class="index-scroll">
              <KpNode v-for="node in tree" :key="node.id" :node="node" :depth="0" :counts="counts" :open-map="openMap" :selected="selectedKp" @select="selectKp" @toggle="toggleNode" />
            </div>
            <footer class="index-foot">
              <a class="index-link" href="#/wrong-book" @click.prevent="go('/wrong-book')">
                <Icon name="flag" :size="14" /><span>错题本</span><em>{{ S.wrong.length }}</em>
              </a>
              <a class="index-link" href="#/assembly" @click.prevent="go('/assembly')">
                <Icon name="layers" :size="14" /><span>智能组卷</span><em>→</em>
              </a>
              <a class="index-link" href="#/profile" @click.prevent="go('/profile')">
                <Icon name="chart" :size="14" /><span>学习档案</span><em>→</em>
              </a>
              <div class="index-count">
                <span>距 27 考研</span>
                <b>{{ examDays }}</b><em>天</em>
              </div>
            </footer>
          </aside>

          <section class="dash-field">
            <header class="field-focus">
              <div class="field-focus-main">
                <div class="field-coord">
                  <span>{{ subjectCode(subject.id) }} / NODE {{ nodeCode }}</span>
                  <i></i>
                  <span>{{ selectedPath.slice(0, -1).join(' / ') || 'ROOT / 全部考点' }}</span>
                </div>
                <h2>{{ selectedNode.name }}</h2>
                <p class="field-path">{{ selectedPath.join(' / ') }}</p>
              </div>
              <div class="field-focus-side">
                <span>QUESTIONS ON THIS NODE</span>
                <b>{{ nodeQuestions.length }}</b>
                <em>道题</em>
                <button class="field-start" @click="openStart"><Icon name="play" :size="13" /> 开始这组练习</button>
              </div>
            </header>

            <div class="field-stats">
              <div class="fs-cell">
                <span>OCCURRENCE / 出现年份</span>
                <b>{{ stats.years }}</b><em>年 / 共 {{ years.length }} 年</em>
              </div>
              <div class="fs-cell">
                <span>AVERAGE / 年均分值</span>
                <b>{{ stats.avg.toFixed(1) }}</b><em>分 / 年</em>
              </div>
              <div class="fs-cell">
                <span>SHARE / 题库占比</span>
                <b>{{ stats.totalPct }}</b><em>%</em>
              </div>
              <div class="fs-cell">
                <span>PROGRESS / 已标记</span>
                <b>{{ markedCount }}</b><em>/ {{ nodeQuestions.length }} 题</em>
              </div>
              <div class="fs-note">
                <span>ARCHIVE RANGE</span>
                <b>{{ years[0] }}—{{ latestYear }}</b>
                <em>最近一次出现：{{ latestYear }} 年</em>
              </div>
            </div>

            <div class="field-profile">
              <section class="year-strata-panel">
                <header class="fp-head">
                  <span class="fp-kicker">01 / ANNUAL DENSITY</span>
                  <h3>历年出现次数</h3>
                </header>
                <div class="year-strata">
                  <div class="stratum" v-for="row in yearSeries" :key="row.year" :class="{ peak: row.count === yearMax, zero: !row.count }">
                    <b>{{ row.year }}</b>
                    <span class="stratum-track"><i :style="{ width: rowPct(row.count) + '%' }"></i></span>
                    <em>{{ row.count }}</em>
                  </div>
                </div>
              </section>

              <section class="type-mix-panel">
                <header class="fp-head">
                  <span class="fp-kicker">02 / TYPE COMPOSITION</span>
                  <h3>题型构成</h3>
                </header>
                <div class="type-band" v-if="nodeQuestions.length" aria-hidden="true">
                  <i v-for="s in typeSegments" :key="s.type" :style="{ width: s.pct + '%', background: s.color }" :title="s.name + ' ' + s.count + ' 题'"></i>
                </div>
                <div class="type-band-empty" v-else>NO DATA</div>
                <ul class="type-key">
                  <li v-for="s in typeSegments" :key="s.type" :class="{ muted: !s.count }">
                    <span class="tk-dot" :style="{ background: s.color }"></span>
                    <b>{{ s.name }}</b>
                    <em>{{ s.count }}</em>
                    <small>{{ s.pct }}%</small>
                  </li>
                </ul>
                <p class="type-foot">共 {{ nodeQuestions.length }} 题 · 其中 {{ keyedCount }} 题附官方答案</p>
              </section>
            </div>

            <section class="field-ledger" id="ledger">
              <div class="ledger-toolbar">
                <div class="ledger-tabs" role="tablist">
                  <button v-for="t in types" :key="t.id" class="ledger-tab" :class="{ active: activeType === t.id }" @click="setType(t.id)">
                    {{ t.name }}<i>{{ t.count }}</i>
                  </button>
                </div>
                <span class="ledger-count">SHOWING {{ visibleQuestions.length }} / {{ filtered.length }}</span>
              </div>
              <div class="ledger-filters">
                <label class="ledger-search">
                  <Icon name="search" :size="14" />
                  <input v-model="ledgerQuery" placeholder="在本考点内搜索题目…" />
                  <button v-if="ledgerQuery" class="ls-clear" @click="ledgerQuery = ''" aria-label="清空"><Icon name="x" :size="12" /></button>
                </label>
                <div class="diff-chips">
                  <button class="diff-chip" :class="{ on: diffFilter === 1 }" @click="setDiff(1)">易 <i>{{ diffCounts[1] }}</i></button>
                  <button class="diff-chip" :class="{ on: diffFilter === 2 }" @click="setDiff(2)">中 <i>{{ diffCounts[2] }}</i></button>
                  <button class="diff-chip" :class="{ on: diffFilter === 3 }" @click="setDiff(3)">难 <i>{{ diffCounts[3] }}</i></button>
                </div>
                <button class="ledger-toggle" :class="{ on: onlyUnmarked }" @click="onlyUnmarked = !onlyUnmarked">
                  <Icon name="target" :size="13" /> 只看未标记 <i>{{ unmarkedCount }}</i>
                </button>
                <select class="ledger-sort" v-model="sortMode" aria-label="排序">
                  <option value="year">年份 新→旧</option>
                  <option value="old">年份 旧→新</option>
                  <option value="hard">难度 难→易</option>
                  <option value="easy">难度 易→难</option>
                </select>
                <button class="ledger-reset" v-if="hasFilters()" @click="resetFilters">重置</button>
                <button class="ledger-drill" @click="startFromFiltered"><Icon name="play" :size="13" /> 练这 {{ filtered.length }} 题</button>
              </div>
              <div class="ledger-columns" aria-hidden="true">
                <span>NO.</span><span>YEAR</span><span>ITEM / 题目</span><span>TYPE</span><span></span>
              </div>
              <div class="ledger-list" v-if="visibleQuestions.length">
                <a v-for="q in visibleQuestions" :key="q.id" class="ledger-row" :href="'#/question/' + q.id" @click.prevent="openQuestion(q)">
                  <span class="lr-no">{{ pad(q.indexNo) }}</span>
                  <span class="lr-year">{{ q.year }}</span>
                  <span class="lr-main">
                    <b>{{ U.qTitle(q) }}</b>
                    <span>{{ q.kpName }} · {{ q.score }} 分 · {{ q.difficultyName }}<i class="lr-key" v-if="U.hasKey(q)">附答案</i><i class="lr-done" v-if="S.mastery[q.id]">已标记</i><i class="lr-err" v-if="S.wrong.indexOf(q.id) >= 0">错题</i></span>
                  </span>
                  <span class="lr-type">{{ q.typeName }}</span>
                  <span class="lr-go"><Icon name="arrow-right" :size="15" /></span>
                </a>
              </div>
              <div class="ledger-empty" v-else>
                <span class="le-mark">—</span>
                <div><b>这个筛选下还没有题目</b><p>放宽题型、难度或搜索词，再试一次。</p></div>
                <button class="btn btn-ghost btn-sm" @click="resetFilters">重置全部筛选</button>
              </div>
              <div class="ledger-more" v-if="filtered.length > visible">
                <button class="btn btn-ghost btn-sm" @click="loadMore">加载更多 · 还有 {{ filtered.length - visible }} 题 <Icon name="chev-down" :size="14" /></button>
              </div>
            </section>
          </section>
        </div>
      </div>

      <div class="kp-drawer-mask" v-if="drawerOpen" @click.self="drawerOpen = false">
        <div class="kp-drawer">
          <div class="kp-drawer-head"><b>INDEX / 选择考点</b><button class="icon-btn" @click="drawerOpen = false"><Icon name="x" :size="17" /></button></div>
          <div class="kp-drawer-tree">
            <KpNode v-for="node in tree" :key="node.id" :node="node" :depth="0" :counts="counts" :open-map="openMap" :selected="selectedKp" @select="selectKp" @toggle="toggleNode" />
          </div>
        </div>
      </div>

      <div class="modal-mask" v-if="startOpen" @click.self="startOpen = false">
        <div class="modal plate-modal">
          <div class="modal-head">
            <div><span class="modal-eyebrow">DRILL / 组合练习</span><h3>{{ selectedNode.name }}</h3></div>
            <button class="icon-btn" @click="startOpen = false"><Icon name="x" :size="17" /></button>
          </div>
          <div class="field">
            <label>题型范围</label>
            <div class="check-chips">
              <button v-for="t in ['choice','blank','solution','proof']" :key="t" class="check-chip" :class="{on: startTypes.indexOf(t) >= 0}" @click="toggleStartType(t)">{{ typeName(t) }}</button>
            </div>
          </div>
          <div class="field">
            <label>题量</label>
            <div class="segmented">
              <button v-for="n in [10,15,20,0]" :key="n" :class="{on: startCount === n}" @click="startCount = n">{{ n === 0 ? '全部' : n + ' 题' }}</button>
            </div>
          </div>
          <p class="modal-hint">当前条件下共 {{ startPool.length }} 道题，将随机抽取 {{ startCount === 0 ? startPool.length : Math.min(startCount, startPool.length) }} 道。</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="startOpen = false">取消</button>
            <button class="btn btn-primary" @click="begin"><Icon name="play" :size="15" /> 开始刷题</button>
          </div>
        </div>
      </div>
    </main>`,
  };
})();

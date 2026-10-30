/* Dashboard: knowledge tree, stats, charts, question list */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;
  const S = YT.S;

  const TYPE_META = {
    choice: { name: "选择题", color: "#bf6741" },
    blank: { name: "填空题", color: "#747b95" },
    solution: { name: "解答题", color: "#537c8d" },
    proof: { name: "证明题", color: "#5f8c70" },
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
    <div class="tree-node" :class="'depth-' + depth">
      <div class="tree-row" :class="{active: selected === node.id, muted: count === 0}" @click="$emit('select', node.id)">
        <button v-if="hasChildren" class="tree-chev" :class="{open: isOpen}" @click.stop="$emit('toggle', node.id)" tabindex="-1" aria-label="展开">
          <Icon name="chev-right" :size="12" />
        </button>
        <span v-else class="tree-spacer"></span>
        <span class="tree-dot" :class="'tone-' + Math.min(count, 3)"></span>
        <span class="tree-label">{{ node.name }}</span>
        <span class="tree-count" v-if="count">{{ count }}</span>
      </div>
      <transition name="tree">
        <div class="tree-children" v-if="hasChildren && isOpen">
          <KpNode v-for="child in node.children" :key="child.id" :node="child" :depth="depth + 1" :counts="counts" :open-map="openMap" :selected="selected" @select="$emit('select', $event)" @toggle="$emit('toggle', $event)" />
        </div>
      </transition>
    </div>`,
  };

  YT.components.LineChart = {
    props: { series: Array, color: { type: String, default: "#bf6741" } },
    data() {
      return { width: 760, height: 224, hover: -1 };
    },
    computed: {
      n() {
        return this.series.length;
      },
      pad() {
        return { l: 36, r: 16, t: 20, b: 30 };
      },
      max() {
        return Math.max(1, ...this.series.map((d) => d.count));
      },
      baseY() {
        return this.height - this.pad.b;
      },
      points() {
        const n = this.n;
        const innerW = this.width - this.pad.l - this.pad.r;
        const innerH = this.height - this.pad.t - this.pad.b;
        return this.series.map((d, i) => ({
          x: this.pad.l + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1)),
          y: this.pad.t + innerH - (d.count / this.max) * innerH,
          count: d.count,
          year: d.year,
        }));
      },
      linePath() {
        const p = this.points;
        if (!p.length) return "";
        let d = "M " + p[0].x + " " + p[0].y;
        for (let i = 1; i < p.length; i++) {
          const prev = p[i - 1];
          const cur = p[i];
          const mx = (prev.x + cur.x) / 2;
          d += " C " + mx + " " + prev.y + ", " + mx + " " + cur.y + ", " + cur.x + " " + cur.y;
        }
        return d;
      },
      areaPath() {
        const p = this.points;
        if (!p.length) return "";
        return this.linePath + " L " + p[p.length - 1].x + " " + this.baseY + " L " + p[0].x + " " + this.baseY + " Z";
      },
      yTicks() {
        const max = this.max;
        const ticks = [0, Math.ceil(max / 2), max];
        return Array.from(new Set(ticks));
      },
      xLabels() {
        const n = this.n;
        const every = n > 9 ? Math.ceil(n / 7) : 1;
        return this.points.map((p, i) => ({ x: p.x, year: p.year, show: i % every === 0 || i === n - 1 }));
      },
      hoverPoint() {
        return this.hover >= 0 ? this.points[this.hover] : null;
      },
      tooltipX() {
        return U.clamp(this.hoverPoint.x - 38, 4, this.width - 80);
      },
    },
    methods: {
      resize() {
        if (!this.$refs.wrap) return;
        const w = this.$refs.wrap.clientWidth;
        if (w && Math.abs(w - this.width) > 2) this.width = w;
      },
      move(i) {
        this.hover = i;
      },
    },
    mounted() {
      this.resize();
      if (window.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.$refs.wrap);
      } else {
        window.addEventListener("resize", this.resize);
      }
    },
    beforeUnmount() {
      if (this.ro) this.ro.disconnect();
      else window.removeEventListener("resize", this.resize);
    },
    template: `
    <div class="line-chart" ref="wrap" @mouseleave="hover = -1">
      <svg :width="width" :height="height" :viewBox="'0 0 ' + width + ' ' + height" role="img" aria-label="历年考察频率">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" :stop-color="color" stop-opacity=".22" />
            <stop offset="1" :stop-color="color" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="chart-grid">
          <g v-for="t in yTicks" :key="t">
            <line :x1="pad.l" :x2="width - pad.r" :y1="baseY - (t / max) * (height - pad.t - pad.b)" :y2="baseY - (t / max) * (height - pad.t - pad.b)" />
            <text :x="pad.l - 10" :y="baseY - (t / max) * (height - pad.t - pad.b) + 4" text-anchor="end">{{ t }}</text>
          </g>
        </g>
        <path :d="areaPath" fill="url(#areaGrad)" />
        <path :d="linePath" fill="none" :stroke="color" stroke-width="2.4" stroke-linecap="round" />
        <g v-for="(p, i) in points" :key="p.year">
          <circle :cx="p.x" :cy="p.y" r="8" fill="transparent" @mouseenter="move(i)" />
          <circle :cx="p.x" :cy="p.y" r="3.2" :fill="hover === i ? '#fff' : color" :stroke="color" stroke-width="2" />
          <text v-if="!hover || hover === i" :x="p.x" :y="p.y - 10" text-anchor="middle" class="point-label">{{ p.count }}</text>
        </g>
        <line v-if="hoverPoint" :x1="hoverPoint.x" :x2="hoverPoint.x" :y1="pad.t" :y2="baseY" class="hover-line" />
        <g v-if="hoverPoint" class="chart-tooltip">
          <rect :x="tooltipX" :y="Math.max(4, hoverPoint.y - 44)" width="76" height="28" rx="8" />
          <text :x="tooltipX + 38" :y="Math.max(4, hoverPoint.y - 44) + 18" text-anchor="middle">{{ hoverPoint.year }} 年 · {{ hoverPoint.count }} 题</text>
        </g>
        <g class="chart-x">
          <text v-for="(l, i) in xLabels" :key="i" v-show="l.show" :x="l.x" :y="height - 9" text-anchor="middle">{{ l.year }}</text>
        </g>
      </svg>
    </div>`,
  };

  YT.components.DonutChart = {
    props: { segments: Array, total: Number },
    computed: {
      radius() {
        return 34;
      },
      circ() {
        return 2 * Math.PI * this.radius;
      },
      arcs() {
        let offset = 0;
        return this.segments
          .filter((s) => s.count > 0)
          .map((s) => {
            const frac = this.total ? s.count / this.total : 0;
            const dash = frac * this.circ;
            const arc = { color: s.color, dash: dash - 2.5, gap: this.circ - dash + 2.5, offset: -offset };
            offset += dash;
            return arc;
          });
      },
    },
    template: `
    <div class="donut">
      <svg viewBox="0 0 92 92" class="donut-svg">
        <circle cx="46" cy="46" :r="radius" fill="none" stroke="#deded2" stroke-width="10" />
        <circle v-for="(a, i) in arcs" :key="i" cx="46" cy="46" :r="radius" fill="none" :stroke="a.color" stroke-width="10"
          :stroke-dasharray="a.dash + ' ' + a.gap" :stroke-dashoffset="a.offset" transform="rotate(-90 46 46)" stroke-linecap="butt" />
        <text x="46" y="43" text-anchor="middle" class="donut-num">{{ total }}</text>
        <text x="46" y="57" text-anchor="middle" class="donut-label">题</text>
      </svg>
    </div>`,
  };

  YT.components.DashboardView = {
    props: { subjectId: String },
    data() {
      return {
        D: D, S: S, activeType: "all", visible: 12, drawerOpen: false, startOpen: false,
        startCount: 10, startTypes: ["choice", "blank", "solution", "proof"],
        openMap: {}, selectedKp: "",
      };
    },
    computed: {
      subject() {
        return U.subjectOf(this.subjectId) || U.subjectOf("math1");
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
      filtered() {
        if (this.activeType === "all") return this.nodeQuestions;
        return this.nodeQuestions.filter((q) => q.type === this.activeType);
      },
      visibleQuestions() {
        return this.filtered.slice(0, this.visible);
      },
      years() {
        return U.yearsOf(this.subject.id);
      },
      yearSeries() {
        const map = {};
        this.nodeQuestions.forEach((q) => (map[q.year] = (map[q.year] || 0) + 1));
        return U.yearsOf(this.subject.id).map((y) => ({ year: y, count: map[y] || 0 }));
      },
      stats() {
        const qs = this.nodeQuestions;
        const years = new Set(qs.map((q) => q.year));
        const span = Math.max(1, this.years.length);
        const totalScore = qs.reduce((n, q) => n + q.score, 0);
        const avg = span ? totalScore / span : 0;
        const totalAll = this.qAll.length || 1;
        return {
          total: qs.length,
          years: years.size,
          avg: avg,
          totalPct: Math.min(100, Math.round((qs.length / totalAll) * 100)),
          yearPct: Math.min(100, Math.round((years.size / span) * 100)),
          avgPct: Math.min(100, Math.round((avg / 25) * 100)),
        };
      },
      donutSegments() {
        return ["choice", "blank", "solution", "proof"].map((t) => ({
          type: t, name: TYPE_META[t].name, color: TYPE_META[t].color, count: this.typeCounts[t] || 0,
        }));
      },
      donutTotal() {
        return this.nodeQuestions.length;
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
        this.visible = 12;
      },
    },
    mounted() {
      if (this.subject) S.lastSubject = this.subject.id;
      this.resetKp();
    },
    methods: {
      t: U,
      go: U.go,
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
          const el = document.querySelector(".kp-hero");
          if (el && window.scrollY > 160) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
        this.visible = 12;
      },
      loadMore() {
        this.visible += 12;
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
    <main class="dashboard-page">
      <div class="container">
        <div class="page-head">
          <div class="page-head-left">
            <div class="crumb"><a href="#/" @click.prevent="go('/')">首页</a><span>/</span><span>{{ group.name }}</span><span>/</span><b>考点地图</b></div>
            <h1>{{ subject.name }} · 考点地图</h1>
            <p>按考点归类 {{ qAll.length }} 道真题 · 覆盖 {{ years.length }} 个年份</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn-ghost" @click="goPapers"><Icon name="calendar" :size="16" /> 年份试卷</button>
            <button class="btn btn-primary" @click="openStart"><Icon name="spark" :size="16" /> 组合练习</button>
          </div>
        </div>

        <div class="subject-pills">
          <button v-for="id in subjectIds" :key="id" class="subject-pill" :class="{active: id === subject.id}" @click="switchSubject(id)">
            {{ D.subjects.find(s => s.id === id).name }}
          </button>
          <span class="subject-pills-note">切换科目不会丢失学习记录</span>
        </div>

        <button class="mobile-kp-trigger" @click="drawerOpen = true">
          <span class="mkt-left"><Icon name="list" :size="17" /><span>考点：<b>{{ selectedNode.name }}</b></span></span>
          <span class="mkt-right">{{ nodeQuestions.length }} 题 <Icon name="chev-down" :size="16" /></span>
        </button>

        <div class="dash-layout">
          <aside class="kp-panel card">
            <div class="kp-panel-head">
              <div><Icon name="layers" :size="17" /><b>考点目录</b></div>
              <span class="kp-panel-sub">{{ qAll.length }} 题</span>
            </div>
            <div class="kp-tree">
              <KpNode v-for="node in tree" :key="node.id" :node="node" :depth="0" :counts="counts" :open-map="openMap" :selected="selectedKp" @select="selectKp" @toggle="toggleNode" />
            </div>
            <div class="kp-panel-foot">
              <a class="side-link" href="#/wrong-book" @click.prevent="go('/wrong-book')">
                <span class="side-link-icon"><Icon name="flag" :size="17" /></span>
                <span><b>错题本</b><em>把不会的题集中刷</em></span>
                <i v-if="S.wrong.length">{{ S.wrong.length }}</i>
              </a>
              <a class="side-link" href="#/assembly" @click.prevent="go('/assembly')">
                <span class="side-link-icon"><Icon name="layers" :size="17" /></span>
                <span><b>智能组卷</b><em>按考点自由拼一套</em></span>
              </a>
              <a class="side-link" href="#/profile" @click.prevent="go('/profile')">
                <span class="side-link-icon"><Icon name="chart" :size="17" /></span>
                <span><b>学习档案</b><em>练习与掌握情况</em></span>
              </a>
              <div class="exam-countdown">
                <span class="countdown-label">距离 27 考研</span>
                <b>{{ examDays }}<em>天</em></b>
                <span class="countdown-sub">今天也刷几道吧</span>
              </div>
            </div>
          </aside>

          <section class="dash-main">
            <div class="kp-hero card">
              <div class="kp-hero-head">
                <div>
                  <div class="kp-tagline"><span class="kp-tag">考点</span><span class="kp-path">{{ selectedPath.slice(0, -1).join(' / ') || '全部考点' }}</span></div>
                  <h2>{{ selectedNode.name }}</h2>
                </div>
                <div class="kp-hero-actions">
                  <span class="kp-total">共 <b>{{ nodeQuestions.length }}</b> 题</span>
                  <button class="btn btn-soft" @click="openStart"><Icon name="spark" :size="15" /> 组合练习</button>
                </div>
              </div>

              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-label">该考点历史总计题数 <Icon name="info" :size="13" /></div>
                  <div class="stat-value">{{ stats.total }}<em>题</em></div>
                  <div class="stat-bar"><i :style="{ width: stats.totalPct + '%' }"></i></div>
                  <div class="stat-foot">占{{ subject.name }}题库 {{ stats.totalPct }}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">出现该考点的年份数量 <Icon name="info" :size="13" /></div>
                  <div class="stat-value">{{ stats.years }}<em>年</em></div>
                  <div class="stat-bar tone-purple"><i :style="{ width: stats.yearPct + '%' }"></i></div>
                  <div class="stat-foot">出现率 {{ stats.yearPct }}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">每年平均考察分值 <Icon name="info" :size="13" /></div>
                  <div class="stat-value">{{ stats.avg.toFixed(1) }}<em>分/年</em></div>
                  <div class="stat-bar tone-blue"><i :style="{ width: stats.avgPct + '%' }"></i></div>
                  <div class="stat-foot">按 {{ years.length }} 个年份计算</div>
                </div>
                <div class="stat-donut">
                  <div class="stat-donut-title">题型分布</div>
                  <div class="stat-donut-body">
                    <DonutChart :segments="donutSegments" :total="donutTotal" />
                    <ul class="donut-legend">
                      <li v-for="s in donutSegments" :key="s.type" :class="{muted: !s.count}">
                        <span class="dot" :style="{ background: s.color }"></span>{{ s.name }}<b>{{ s.count }}</b>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div class="chart-card card">
              <div class="chart-head">
                <div><h3>历年考察频率分布</h3><p>该考点在 {{ years[0] }}–{{ years[years.length - 1] }} 年间每年出现的题目数量</p></div>
                <span class="legend-dot"><i></i>{{ selectedNode.name }}</span>
              </div>
              <LineChart :series="yearSeries" color="#bf6741" />
            </div>

            <div class="q-section">
              <div class="q-toolbar">
                <div class="q-tabs">
                  <button v-for="t in types" :key="t.id" class="q-tab" :class="{active: activeType === t.id}" @click="setType(t.id)">
                    {{ t.name }}<i>{{ t.count }}</i>
                  </button>
                </div>
                <button class="btn btn-primary q-start" @click="openStart"><Icon name="play" :size="15" /> 组合练习</button>
              </div>
              <div class="q-list-head">
                <span>题目列表</span>
                <span class="q-list-sort">按年份排序 <Icon name="chev-down" :size="13" /></span>
              </div>
              <div class="q-grid" v-if="visibleQuestions.length">
                <a v-for="q in visibleQuestions" :key="q.id" class="q-card" :href="'#/question/' + q.id" @click.prevent="openQuestion(q)">
                  <div class="q-card-top">
                    <span class="q-year">{{ q.year }}</span>
                    <span class="q-no">第 {{ q.indexNo }} 题</span>
                    <span class="q-arrow"><Icon name="chev-right" :size="15" /></span>
                  </div>
                  <div class="q-card-bottom">
                    <span class="tag tag-type" :class="'type-' + q.type">{{ q.typeName }}</span>
                    <span class="diff" :class="'diff-' + q.difficulty">{{ q.difficultyName }}</span>
                    <span class="mastered-mark" v-if="S.mastery[q.id]" title="已标记掌握"><Icon name="check" :size="12" /></span>
                  </div>
                </a>
              </div>
              <div class="empty-state card" v-else>
                <span class="empty-icon"><Icon name="folder" :size="28" /></span>
                <h3>这个筛选下还没有题目</h3>
                <p>换一个题型，或回到「全部」看看。</p>
                <button class="btn btn-ghost" @click="setType('all')">查看全部题型</button>
              </div>
              <div class="load-more" v-if="filtered.length > visible">
                <button class="btn btn-ghost" @click="loadMore">加载更多（还有 {{ filtered.length - visible }} 题）<Icon name="chev-down" :size="15" /></button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="kp-drawer-mask" v-if="drawerOpen" @click.self="drawerOpen = false">
        <div class="kp-drawer card">
          <div class="kp-drawer-head"><b>选择考点</b><button class="icon-btn" @click="drawerOpen = false"><Icon name="x" :size="17" /></button></div>
          <div class="kp-drawer-tree">
            <KpNode v-for="node in tree" :key="node.id" :node="node" :depth="0" :counts="counts" :open-map="openMap" :selected="selectedKp" @select="selectKp" @toggle="toggleNode" />
          </div>
        </div>
      </div>

      <div class="modal-mask" v-if="startOpen" @click.self="startOpen = false">
        <div class="modal card">
          <div class="modal-head">
            <div><span class="modal-eyebrow">组合练习</span><h3>{{ selectedNode.name }}</h3></div>
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

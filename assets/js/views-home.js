/* Home — ATLAS overview */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;

  YT.components.HomeView = {
    data() {
      return { D: D, S: YT.S, U: U };
    },
    computed: {
      studyYear() {
        const now = new Date();
        return now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
      },
      cards() {
        const conf = [
          {
            group: "math",
            subject: "math1",
            code: "01",
            title: "数学",
            en: "MATHEMATICS",
            desc: "高等数学 · 线性代数 · 概率统计",
            tone: "clay",
          },
          {
            group: "cs",
            subject: "cs408",
            code: "02",
            title: "408",
            en: "COMPUTER SCIENCE",
            desc: "数据结构 · 计算机组成 · 操作系统 · 计算机网络",
            tone: "sage",
          },
          {
            group: "en",
            subject: "english1",
            code: "03",
            title: "英语",
            en: "ENGLISH",
            desc: "完形 · 阅读 · 新题型 · 翻译 · 写作",
            tone: "slate",
          },
        ];
        return conf.map((c) => {
          const group = D.groups[c.group];
          let qs = [];
          group.subjects.forEach((id) => {
            qs = qs.concat(U.questionsOf(id));
          });
          const kpSet = {};
          qs.forEach((q) => (kpSet[q.kpId] = true));
          const marked = qs.filter((q) => YT.S.mastery[q.id]).length;
          const years = qs.map((q) => q.year);
          return Object.assign({}, c, {
            count: qs.length,
            kp: Object.keys(kpSet).length,
            coverage: qs.length ? Math.round((marked / qs.length) * 100) : 0,
            range: years.length ? Math.min.apply(null, years) + "—" + Math.max.apply(null, years) : "—",
            path: "/dashboard/" + c.subject,
          });
        });
      },
      currentSubject() {
        return U.subjectOf(YT.S.lastSubject) || U.subjectOf("math1");
      },
      currentEn() {
        const map = {
          math1: "MATHEMATICS I",
          math2: "MATHEMATICS II",
          math3: "MATHEMATICS III",
          cs408: "COMPUTER SCIENCE 408",
          english1: "ENGLISH I",
          english2: "ENGLISH II",
        };
        return map[this.currentSubject.id] || "SUBJECT";
      },
      currentCode() {
        const map = {
          math1: "M · 01",
          math2: "M · 02",
          math3: "M · 03",
          cs408: "CS · 408",
          english1: "E · 01",
          english2: "E · 02",
        };
        return map[this.currentSubject.id] || "A · 00";
      },
      questionCount() {
        return D.questions.length;
      },
      kpCount() {
        return new Set(D.questions.map((q) => q.kpId)).size;
      },
      latestYear() {
        return Math.max.apply(null, D.questions.map((q) => q.year));
      },
      markedCount() {
        return Object.keys(YT.S.mastery).length;
      },
      lastPractice() {
        return YT.S.practice[0] || null;
      },
      lastPracticeTime() {
        return this.lastPractice ? U.relTime(this.lastPractice.at) : "";
      },
      yearBands() {
        const qs = U.questionsOf(this.currentSubject.id);
        const counts = {};
        const scores = {};
        qs.forEach((q) => {
          counts[q.year] = (counts[q.year] || 0) + 1;
          scores[q.year] = (scores[q.year] || 0) + (q.score || 0);
        });
        return U.yearsOf(this.currentSubject.id)
          .slice(-4)
          .reverse()
          .map((y, i) => ({ year: y, count: counts[y] || 0, score: scores[y] || 0, index: String(i + 1).padStart(2, "0") }));
      },
      archiveTotal() {
        return U.questionsOf(this.currentSubject.id).length;
      },
    },
    methods: {
      go: U.go,
      resume() {
        const queue = U.readQueue();
        if (queue && queue.ids && queue.ids.length) {
          U.go("/practice");
          return;
        }
        this.warmup();
      },
      warmup() {
        const qs = U.questionsOf(this.currentSubject.id);
        if (!qs.length) return;
        const picked = U.shuffle(qs).slice(0, Math.min(10, qs.length));
        U.startPractice(
          picked.map((q) => q.id),
          {
            title: "随机热身 · " + this.currentSubject.name,
            subject: this.currentSubject.id,
            subjectName: this.currentSubject.name,
            mode: "warmup",
          }
        );
      },
      openYears() {
        this.go("/papers/" + this.currentSubject.id);
      },
      openYear(y) {
        this.go("/papers/" + this.currentSubject.id + "?year=" + y);
      },
    },
    template: `
    <main class="home atlas-home">
      <section class="home-hero container">
        <div class="hero-copy">
          <div class="hero-kicker">
            <span class="kicker-dot"></span>
            <span>{{ studyYear }} 考研 · 学习地图系统</span>
            <em>ED. 01</em>
          </div>
          <h1>把真题，<br />变成你的<span class="hero-mark">地形图</span><i>。</i></h1>
          <p class="hero-lead">按考点给每道题一个坐标。看清重点、盲区和自己的位置，再决定下一步往哪走。</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" @click="go('/dashboard/' + currentSubject.id)">
              进入考点地图 <Icon name="arrow-right" :size="17" />
            </button>
            <button class="btn btn-ghost btn-lg" @click="go('/import')">
              <Icon name="upload" :size="16" /> 导入我的 PDF
            </button>
          </div>
          <div class="hero-metrics">
            <div><b>{{ questionCount }}</b><span>道示例题</span></div>
            <i></i>
            <div><b>{{ kpCount }}</b><span>个考点</span></div>
            <i></i>
            <div><b>{{ D.subjects.length }}</b><span>个科目</span></div>
            <i></i>
            <div><b>{{ latestYear }}</b><span>最新年份</span></div>
          </div>
        </div>

        <aside class="position-card">
          <div class="pos-top">
            <span>POSITION / 当前坐标</span>
            <span class="pos-live"><i></i>LOCAL</span>
          </div>
          <div class="pos-subject">
            <span class="pos-code">{{ currentCode }}</span>
            <div>
              <span class="pos-en">{{ currentEn }}</span>
              <h2>{{ currentSubject.name }}</h2>
            </div>
          </div>
          <div class="pos-map" aria-hidden="true">
            <svg viewBox="0 0 460 190" fill="none">
              <g stroke="#d9ff59" stroke-width="1">
                <path d="M-20 150c40-33 64-6 104-28 38-20 40-69 85-69 47 0 58 56 103 56 42 0 56-38 103-38 34 0 59 20 99 3" opacity=".18"/>
                <path d="M-30 168c46-30 72-2 111-24 37-21 39-64 82-64 45 0 61 51 106 51 43 0 56-35 103-35 32 0 57 16 101 0" opacity=".12"/>
                <path d="M-18 132c37-31 56 3 96-20 34-20 35-55 78-55 42 0 53 43 97 43 45 0 54-29 98-29 36 0 59 14 101-5" opacity=".08"/>
              </g>
              <path d="M356 38h26M369 25v26" stroke="#d9ff59" stroke-width="1" opacity=".32"/>
              <path d="M40 156h46" stroke="#d9ff59" stroke-width="1" opacity=".22"/>
              <path d="M40 151v10M63 151v10M86 151v10" stroke="#d9ff59" stroke-width="1" opacity=".18"/>
            </svg>
            <span class="pos-marker"><i></i></span>
            <span class="pos-coord pos-coord-a">E 121°28′</span>
            <span class="pos-coord pos-coord-b">N 31°14′</span>
          </div>
          <div class="pos-stats">
            <div><b>{{ markedCount }}</b><span>已标记</span></div>
            <div><b>{{ S.wrong.length }}</b><span>错题</span></div>
            <div><b>{{ S.favorites.length }}</b><span>收藏</span></div>
          </div>
          <button class="pos-foot" @click="resume">
            <span class="pos-foot-text">
              <b v-if="lastPractice">上次 · {{ lastPractice.title }}</b>
              <b v-else>还没有练习记录</b>
              <em v-if="lastPractice">{{ lastPractice.accuracy }}% 正确率 · {{ lastPracticeTime }}</em>
              <em v-else>从 10 道随机题开始，建立第一条轨迹</em>
            </span>
            <span class="pos-foot-go"><Icon name="arrow-right" :size="17" /></span>
          </button>
        </aside>
      </section>

      <section class="home-section container">
        <header class="section-head">
          <div class="section-title">
            <span class="section-kicker">01 / TERRAIN</span>
            <h2>选择你的地形</h2>
          </div>
          <p class="section-note">三套知识系统，按考点密度重新组织。<br />从最想攻克的一块开始。</p>
        </header>

        <div class="terrain-list">
          <a v-for="card in cards" :key="card.group" class="terrain-row" :class="'tone-' + card.tone" :href="'#' + card.path" @click.prevent="go(card.path)">
            <span class="terrain-index">{{ card.code }}</span>
            <div class="terrain-name">
              <h3>{{ card.title }}</h3>
              <em>{{ card.en }}</em>
            </div>
            <p class="terrain-desc">{{ card.desc }}</p>
            <div class="terrain-count">
              <b>{{ card.count }}</b>
              <span>题 · {{ card.kp }} 个考点</span>
            </div>
            <div class="terrain-progress">
              <div><span :style="{ width: card.coverage + '%' }"></span></div>
              <small>{{ card.coverage }}% 已标记 <i>·</i> {{ card.range }}</small>
            </div>
            <span class="terrain-go"><Icon name="arrow-right" :size="19" /></span>
          </a>
        </div>
      </section>

      <section class="home-section container home-lower">
        <div class="year-archive">
          <header class="section-head section-head-sm">
            <div class="section-title">
              <span class="section-kicker">02 / ARCHIVE</span>
              <h2>年份档案</h2>
            </div>
            <button class="section-link" @click="openYears">全部年份 <Icon name="arrow-right" :size="14" /></button>
          </header>
          <div class="year-bands">
            <a v-for="band in yearBands" :key="band.year" class="year-band" href="#" @click.prevent="openYear(band.year)">
              <span class="year-index">{{ band.index }}</span>
              <span class="year-year">{{ band.year }}</span>
              <span class="year-info">{{ band.count }} 题 · {{ band.score }} 分</span>
              <span class="year-go"><Icon name="chev-right" :size="16" /></span>
            </a>
          </div>
          <p class="archive-note"><span></span>当前归档：{{ currentSubject.name }} · 共 {{ archiveTotal }} 题 · {{ yearBands.length }} 个年份</p>
        </div>

        <aside class="workbench">
          <header class="workbench-head">
            <span class="section-kicker">03 / WORKBENCH</span>
            <h2>操作台</h2>
            <p>把今天要做的动作，压到一次点击。</p>
          </header>
          <div class="work-list">
            <button class="work-row" @click="go('/import')">
              <span class="work-icon"><Icon name="upload" :size="17" /></span>
              <span class="work-text"><b>导入 PDF</b><em>浏览器内拆题、标注题型</em></span>
              <span class="work-tag">LOCAL</span>
              <Icon name="arrow-right" :size="15" />
            </button>
            <button class="work-row" @click="go('/assembly')">
              <span class="work-icon"><Icon name="layers" :size="17" /></span>
              <span class="work-text"><b>智能组卷</b><em>按最新卷型与难度生成</em></span>
              <span class="work-tag">AUTO</span>
              <Icon name="arrow-right" :size="15" />
            </button>
            <button class="work-row" @click="warmup">
              <span class="work-icon"><Icon name="zap" :size="17" /></span>
              <span class="work-text"><b>随机热身</b><em>从当前科目抽 10 道题</em></span>
              <span class="work-tag">10 Q</span>
              <Icon name="arrow-right" :size="15" />
            </button>
            <button class="work-row" @click="go('/wrong-book')">
              <span class="work-icon"><Icon name="flag" :size="17" /></span>
              <span class="work-text"><b>错题回看</b><em>重做、标记、写笔记</em></span>
              <span class="work-tag">{{ S.wrong.length }} ERR</span>
              <Icon name="arrow-right" :size="15" />
            </button>
          </div>
        </aside>
      </section>

      <p class="home-footnote container"><span>ATLAS NOTE</span> 站内题目为原创示例内容，用于展示考点统计、刷题、PDF 拆题与组卷流程。所有学习数据只保存在当前浏览器。</p>
    </main>`,
  };
})();

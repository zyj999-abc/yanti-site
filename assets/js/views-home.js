/* Home */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;

  YT.components.HomeView = {
    data() {
      return { D: D, S: YT.S };
    },
    computed: {
      cards() {
        const conf = [
          { group: "math", subject: "math1", icon: "chart", color: "orange", title: "数学", tag: "高数 · 线代 · 概率" },
          { group: "cs", subject: "cs408", icon: "grid", color: "purple", title: "408", tag: "数据结构 · 计组 · OS · 计网" },
          { group: "en", subject: "english1", icon: "book", color: "blue", title: "英语", tag: "英语一 · 英语二" },
        ];
        return conf.map((c) => {
          const subj = U.subjectOf(c.subject);
          const count = D.groups[c.group].subjects.reduce((n, id) => n + U.questionsOf(id).length, 0);
          return Object.assign({}, c, {
            desc: subj.desc,
            features: subj.features,
            path: "/dashboard/" + c.subject,
            count: count,
          });
        });
      },
      questionCount() {
        return D.questions.length;
      },
      kpCount() {
        return new Set(D.questions.map((q) => q.kpId)).size;
      },
      latestYears() {
        const ys = D.questions.map((q) => q.year);
        const max = Math.max.apply(null, ys);
        return max;
      },
    },
    methods: {
      go: U.go,
    },
    template: `
    <main class="home">
      <div class="hero-deco" aria-hidden="true" v-math>
        <svg class="deco-curve deco-curve-a" viewBox="0 0 420 260" fill="none">
          <path d="M8 230C96 230 86 46 180 46c88 0 58 152 150 152 48 0 70-36 82-74" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="180" cy="46" r="5" fill="currentColor"/>
          <path d="M8 230h404" stroke="currentColor" stroke-width="1" stroke-dasharray="3 7" opacity=".5"/>
        </svg>
        <svg class="deco-curve deco-curve-b" viewBox="0 0 320 220" fill="none">
          <path d="M6 190c54-4 60-70 108-70 52 0 52 62 98 62 44 0 58-44 102-44" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M6 12v192h308" stroke="currentColor" stroke-width="1.4" opacity=".5"/>
        </svg>
        <div class="formula-chip chip-a">$\\lim\\limits_{x\\to 0}\\dfrac{\\sin x}{x}=1$</div>
        <div class="formula-chip chip-b">$\\displaystyle\\int_0^1 x^2\\,dx=\\dfrac{1}{3}$</div>
        <div class="formula-chip chip-c"><span class="chip-tag">408</span><span>TCP · Cache · 二叉树</span></div>
        <div class="formula-chip chip-d"><span class="chip-tag blue">EN</span><span>Reading · Cloze</span></div>
        <div class="deco-square sq-a"></div>
        <div class="deco-square sq-b"></div>
        <div class="deco-square sq-c"></div>
      </div>

      <div class="container home-inner">
        <div class="hero-eyebrow"><span class="pulse-dot"></span>2027 考研 · 真题按考点刷</div>
        <div class="hero-brand">
          <img src="assets/img/logo.svg" alt="研题岛" class="hero-logo" />
          <h1>研题岛<span>真题网</span></h1>
        </div>
        <p class="hero-slogan">把历年真题，拆成一张可执行的复习地图</p>
        <p class="hero-sub">按考点归类 · 看考察频率 · 组合刷题 · 自动沉淀错题</p>
        <div class="hero-metrics">
          <div><b>{{ D.subjects.length }}</b><span>个科目</span></div>
          <i></i>
          <div><b>{{ questionCount }}</b><span>道示例真题</span></div>
          <i></i>
          <div><b>{{ kpCount }}</b><span>个考点</span></div>
          <i></i>
          <div><b>{{ latestYears }}</b><span>最新年份</span></div>
        </div>

        <div class="subject-cards">
          <a v-for="card in cards" :key="card.group" class="subject-card" :class="'theme-' + card.color" :href="'#' + card.path" @click.prevent="go(card.path)">
            <div class="subject-card-head">
              <span class="subject-icon"><Icon :name="card.icon" :size="24" /></span>
              <div class="subject-head-text">
                <div class="subject-title-row"><h2>{{ card.title }}</h2><span class="free-badge">免费</span></div>
                <p>{{ card.tag }}</p>
              </div>
              <span class="subject-arrow"><Icon name="chev-right" :size="18" /></span>
            </div>
            <div class="subject-card-body">
              <p class="subject-desc">{{ card.desc }}</p>
              <ul class="feature-list">
                <li v-for="f in card.features" :key="f"><span class="feature-dot"></span>{{ f }}</li>
              </ul>
              <div class="subject-card-foot">
                <span class="subject-count">已收录 <b>{{ card.count }}</b> 道</span>
                <span class="subject-enter">进入题库 <Icon name="arrow-right" :size="16" /></span>
              </div>
            </div>
          </a>
        </div>

        <div class="home-trust card">
          <div class="trust-item">
            <span class="trust-icon"><Icon name="zap" :size="18" /></span>
            <div><b>无需注册</b><span>打开即刷，学习进度自动保存</span></div>
          </div>
          <div class="trust-item">
            <span class="trust-icon"><Icon name="bookmark" :size="18" /></span>
            <div><b>数据在本地</b><span>错题 / 收藏 / 笔记只存你的浏览器</span></div>
          </div>
          <div class="trust-item">
            <span class="trust-icon"><Icon name="layers" :size="18" /></span>
            <div><b>纯静态部署</b><span>可直接托管到 GitHub Pages</span></div>
          </div>
          <button class="btn btn-primary trust-cta" @click="go('/dashboard/math1')">开始刷题 <Icon name="arrow-right" :size="16" /></button>
        </div>

        <p class="home-demo-note"><Icon name="info" :size="14" /> 演示站题目为原创示例内容，用于展示考点统计、刷题、组卷与错题本的完整流程。</p>
      </div>
    </main>`,
  };
})();

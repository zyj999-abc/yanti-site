/* App bootstrap: root, routing, global overlays, print */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;
  const S = YT.S;

  /* ---------- print helper ---------- */
  YT.printPaper = function (paper) {
    const root = document.getElementById("print-root");
    if (!root) return;
    const list = paper.questions || [];
    const imageUrls = {};
    const jobs = list.map((q) => {
      if (!q.imageId || !YT.importStore) return Promise.resolve();
      return YT.importStore
        .getImage(q.imageId)
        .then((blob) => {
          if (blob) imageUrls[q.id] = URL.createObjectURL(blob);
        })
        .catch(() => {});
    });
    Promise.all(jobs).then(() => {
      let html =
        '<h1>' + U.esc(paper.title) + "</h1>" +
        '<div class="print-sub">' + U.esc(paper.subtitle || "") + "</div>";
      list.forEach((q, i) => {
        html += '<div class="print-q">';
        html +=
          '<div class="print-q-head">' +
          (i + 1) + ". " + U.esc(q.typeName) + "（" + q.score + " 分） · " + U.esc(q.kpName) +
          "</div>";
        if (q.passage) html += '<div class="passage-text">' + U.para(q.passage) + "</div>";
        if (imageUrls[q.id]) {
          html += '<img class="print-shot" src="' + imageUrls[q.id] + '" alt="原题截图" />';
        } else {
          html += "<div>" + U.fmt(q.stem) + "</div>";
          if (q.options && q.options.length && ["choice", "cloze", "read", "newtype"].indexOf(q.type) >= 0) {
            html += '<div class="print-opts">';
            html += q.options
              .map((o, j) => "<span>" + U.esc(String.fromCharCode(65 + j)) + ". " + U.esc(o) + "</span>")
              .join("");
            html += "</div>";
          }
        }
        if (paper.answers) {
          html += '<div class="print-answer"><b>答案：</b>' + U.esc(q.answer) + "</div>";
        }
        html += "</div>";
      });
      root.innerHTML = html;
      U.renderMath(root);
      const imgs = Array.prototype.slice.call(root.querySelectorAll("img"));
      const loaded = imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            })
      );
      Promise.all(loaded).then(() => {
        const clear = () => {
          root.innerHTML = "";
          Object.keys(imageUrls).forEach((k) => URL.revokeObjectURL(imageUrls[k]));
          window.removeEventListener("afterprint", clear);
        };
        window.addEventListener("afterprint", clear);
        setTimeout(() => window.print(), 160);
      });
    });
  };

  /* ---------- search overlay ---------- */
  const SearchOverlay = {
    data() {
      return { S: S, D: D, keyword: "", hot: ["极限", "特征值", "二叉树", "TCP", "概率", "作文"], U: U };
    },
    computed: {
      results() {
        return U.searchQuestions(this.keyword).slice(0, 20);
      },
    },
    mounted() {
      this.$nextTick(() => {
        if (this.$refs.input) this.$refs.input.focus();
      });
    },
    methods: {
      close() {
        S.searchOpen = false;
      },
      pick(k) {
        this.keyword = k;
        this.$nextTick(() => this.$refs.input && this.$refs.input.focus());
      },
      open(q) {
        S.searchOpen = false;
        U.go("/question/" + q.id);
      },
      openFirst() {
        if (this.results.length) this.open(this.results[0]);
      },
      plain(s) {
        return U.plain(s).slice(0, 110);
      },
      typeName(t) {
        return { choice: "选择题", blank: "填空题", solution: "解答题", proof: "证明题" }[t] || "题目";
      },
    },
    template: `
    <div class="search-overlay" @click.self="close">
      <div class="search-panel" role="dialog" aria-label="搜索题目">
        <div class="search-bar">
          <Icon name="search" :size="19" />
          <input ref="input" v-model="keyword" placeholder="搜索题干、考点、年份…" @keyup.esc="close" @keyup.enter="openFirst" />
          <button class="search-close" @click="close">ESC</button>
        </div>
        <div class="search-tips" v-if="!keyword.trim()">
          <span>试试：</span>
          <button v-for="k in hot" :key="k" @click="pick(k)">{{ k }}</button>
        </div>
        <div class="search-results" v-if="keyword.trim()">
          <template v-if="results.length">
            <a v-for="q in results" :key="q.id" class="search-result" :href="'#/question/' + q.id" @click.prevent="open(q)">
              <span class="sr-icon"><Icon name="book" :size="14" /></span>
              <div class="sr-body">
                <div class="sr-meta">
                  <b>{{ q.subjectName }}</b>
                  <span>{{ q.year }} 年 · 第 {{ q.indexNo }} 题</span>
                  <span>{{ typeName(q.type) }}</span>
                  <span>{{ q.kpName }}</span>
                </div>
                <div class="sr-stem">{{ plain(q.stem) || q.kpName }}</div>
              </div>
              <Icon name="chev-right" :size="15" style="color:#d8ccbb;flex:none;margin-top:4px" />
            </a>
          </template>
          <div class="search-empty" v-else>没有找到相关题目，换个关键词试试。</div>
        </div>
        <div class="search-foot">
          <span><kbd>Enter</kbd> 打开 · <kbd>Esc</kbd> 关闭</span>
          <span>搜索在本地题库中完成</span>
        </div>
      </div>
    </div>`,
  };

  /* ---------- login (local nickname) ---------- */
  const LoginModal = {
    data() {
      return { S: S, name: S.user.name || "" };
    },
    mounted() {
      this.$nextTick(() => {
        if (this.$refs.name) this.$refs.name.focus();
      });
    },
    methods: {
      close() {
        S.loginOpen = false;
      },
      save() {
        const v = this.name.trim().slice(0, 12);
        if (!v) {
          U.toast("输入一个昵称再继续");
          return;
        }
        S.user.name = v;
        if (!S.user.createdAt) S.user.createdAt = Date.now();
        S.loginOpen = false;
        U.toast("欢迎，" + v);
      },
      guest() {
        S.loginOpen = false;
        U.toast("已继续以访客身份使用");
      },
    },
    template: `
    <div class="modal-mask" @click.self="close">
      <div class="modal login-card" role="dialog" aria-label="登录">
        <div class="modal-head">
          <div class="login-brand">
            <img src="assets/img/logo.svg" alt="" />
            <div><b>研题岛</b> <span>ATLAS</span></div>
          </div>
          <button class="icon-btn" @click="close"><Icon name="x" :size="17" /></button>
        </div>
        <h3>进入研题岛</h3>
        <p>本站是纯静态演示站，没有服务器与账号体系。设置一个本地昵称即可使用全部功能，数据只保存在当前浏览器。</p>
        <div class="field">
          <label>你的昵称</label>
          <input ref="name" class="text-input" v-model="name" maxlength="12" placeholder="例如：冲刺 408" style="width:100%;height:42px" @keyup.enter="save" />
        </div>
        <button class="btn btn-primary btn-block btn-lg login-btn" @click="save"><Icon name="user" :size="16" /> 进入研题岛</button>
        <button class="btn btn-ghost btn-block" style="margin-top:8px" @click="guest">先随便看看</button>
        <p class="login-note"><Icon name="info" :size="13" /> 昵称、错题、笔记与练习记录保存在 localStorage；清除浏览器数据会一并丢失。</p>
      </div>
    </div>`,
  };

  /* ---------- confirm ---------- */
  const ConfirmModal = {
    data() {
      return { S: S };
    },
    methods: {
      close() {
        S.confirm.show = false;
        S.confirm.ok = null;
      },
      ok() {
        const fn = S.confirm.ok;
        S.confirm.show = false;
        S.confirm.ok = null;
        if (typeof fn === "function") fn();
      },
    },
    template: `
    <div class="modal-mask" @click.self="close" v-if="S.confirm.show">
      <div class="modal confirm-card" role="alertdialog">
        <h3>{{ S.confirm.title }}</h3>
        <p>{{ S.confirm.text }}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="close">取消</button>
          <button class="btn btn-primary" @click="ok">确定</button>
        </div>
      </div>
    </div>`,
  };

  /* ---------- root ---------- */
  const App = {
    data() {
      return { S: S };
    },
    computed: {
      route() {
        return S.route;
      },
      viewComp() {
        const p = this.route.parts;
        if (!p.length) return "HomeView";
        switch (p[0]) {
          case "dashboard":
            return "DashboardView";
          case "papers":
            return "PapersView";
          case "question":
            return "QuestionView";
          case "practice":
            return "PracticeView";
          case "wrong-book":
            return "WrongBookView";
          case "assembly":
            return "AssemblyView";
          case "import":
            return "ImportView";
          case "profile":
            return "ProfileView";
          default:
            return "NotFoundView";
        }
      },
      viewProps() {
        const p = this.route.parts;
        if (p[0] === "dashboard") return { subjectId: p[1] || S.lastSubject || "math1" };
        if (p[0] === "papers") return { subjectId: p[1] || S.lastSubject || "math1" };
        if (p[0] === "question") return { questionId: p[1] || "" };
        return {};
      },
      viewKey() {
        return this.route.path;
      },
      focusMode() {
        return this.route.parts[0] === "practice";
      },
      pageTitle() {
        const p = this.route.parts;
        if (!p.length) return "研题岛 ATLAS · 考研真题学习地图";
        if (p[0] === "dashboard") {
          const s = U.subjectOf(p[1]);
          return (s ? s.name : "题库") + " · 考点地图 · 研题岛 ATLAS";
        }
        if (p[0] === "papers") {
          const s = U.subjectOf(p[1]);
          return (s ? s.name : "题库") + " · 年份档案 · 研题岛 ATLAS";
        }
        if (p[0] === "question") {
          const q = D.questions.find((x) => x.id === p[1]);
          return q ? q.kpName + " · " + q.year + " 年真题 · 研题岛 ATLAS" : "题目详情 · 研题岛 ATLAS";
        }
        if (p[0] === "practice") return "组合练习 · 研题岛 ATLAS";
        if (p[0] === "wrong-book") return "错题本 · 研题岛 ATLAS";
        if (p[0] === "assembly") return "智能组卷 · 研题岛 ATLAS";
        if (p[0] === "import") return "PDF 导入 · 研题岛 ATLAS";
        if (p[0] === "profile") return "学习档案 · 研题岛 ATLAS";
        return "研题岛 ATLAS";
      },
    },
    watch: {
      "S.route.path"() {
        document.title = this.pageTitle;
        S.searchOpen = false;
        S.menuOpen = false;
        S.loginOpen = false;
        window.scrollTo({ top: 0, behavior: "auto" });
      },
      pageTitle() {
        document.title = this.pageTitle;
      },
    },
    mounted() {
      document.title = this.pageTitle;
      this.onHash = () => {
        S.route = U.parseRoute();
      };
      window.addEventListener("hashchange", this.onHash);
      this.onKey = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
          e.preventDefault();
          S.searchOpen = true;
        } else if (e.key === "Escape") {
          if (S.searchOpen) S.searchOpen = false;
          else if (S.loginOpen) S.loginOpen = false;
          else if (S.confirm.show) {
            S.confirm.show = false;
            S.confirm.ok = null;
          }
        }
      };
      window.addEventListener("keydown", this.onKey);
    },
    beforeUnmount() {
      window.removeEventListener("hashchange", this.onHash);
      window.removeEventListener("keydown", this.onKey);
    },
    template: `
    <div class="app-root" :class="{ 'is-focus': focusMode }">
      <SiteHeader />
      <component :is="viewComp" v-bind="viewProps" :key="viewKey" />
      <SiteFooter />
      <transition name="fade">
        <SearchOverlay v-if="S.searchOpen" />
      </transition>
      <transition name="fade">
        <LoginModal v-if="S.loginOpen" />
      </transition>
      <ConfirmModal />
      <transition name="toast">
        <div class="toast" v-if="S.toast.show">
          <Icon name="check-circle" :size="15" />{{ S.toast.text }}
        </div>
      </transition>
    </div>`,
  };

  const app = Vue.createApp(App);
  Object.keys(YT.components).forEach((name) => app.component(name, YT.components[name]));
  app.component("SearchOverlay", SearchOverlay);
  app.component("LoginModal", LoginModal);
  app.component("ConfirmModal", ConfirmModal);
  app.directive("math", {
    mounted(el) {
      U.renderMath(el);
    },
    updated(el) {
      U.renderMath(el);
    },
  });
  (async function boot() {
    try {
      if (YT.importStore) await YT.importStore.load();
    } catch (e) {
      console.warn("导入题库加载失败", e);
    }
    app.mount("#app");
  })();
})();

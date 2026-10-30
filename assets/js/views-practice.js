/* Practice */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;
  const S = YT.S;

  function durationText(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  YT.components.PracticeView = {
    data() {
      return {
        S: S,
        queue: null,
        questions: [],
        idx: 0,
        selected: null,
        revealed: false,
        marks: [],
        finished: false,
        startedAt: Date.now(),
        now: Date.now(),
        timer: null,
        grading: false,
        U: U,
      };
    },
    computed: {
      current() {
        return this.questions[this.idx] || null;
      },
      total() {
        return this.questions.length;
      },
      answeredCount() {
        return this.marks.filter((m) => m === "right" || m === "wrong").length;
      },
      rightCount() {
        return this.marks.filter((m) => m === "right").length;
      },
      wrongCount() {
        return this.marks.filter((m) => m === "wrong").length;
      },
      accuracy() {
        const done = this.rightCount + this.wrongCount;
        return done ? Math.round((this.rightCount / done) * 100) : 0;
      },
      elapsed() {
        return Math.max(0, Math.floor((this.now - this.startedAt) / 1000));
      },
      elapsedText() {
        return durationText(this.elapsed);
      },
      progressPct() {
        return this.total ? Math.round(((this.idx + (this.revealed ? 1 : 0)) / this.total) * 100) : 0;
      },
      isChoice() {
        return this.current && ["choice", "cloze", "read", "newtype"].indexOf(this.current.type) >= 0;
      },
      imageUrl() {
        return this.current ? U.imageUrl(this.current) : "";
      },
      correctIndex() {
        return this.current ? this.current.answerIndex : -1;
      },
      isRight() {
        return this.isChoice && this.selected === this.correctIndex;
      },
      title() {
        return (this.queue && this.queue.meta && this.queue.meta.title) || "组合刷题";
      },
      subjectName() {
        if (this.current) return this.current.subjectName;
        return (this.queue && this.queue.meta && this.queue.meta.subjectName) || "";
      },
      lastOne() {
        return this.idx >= this.total - 1;
      },
      summary() {
        return this.questions.map((q, i) => ({
          q: q,
          mark: this.marks[i] || "none",
        }));
      },
      canNext() {
        if (!this.revealed) return false;
        if (!this.isChoice) return this.grading === false && (this.marks[this.idx] === "right" || this.marks[this.idx] === "wrong");
        return true;
      },
    },
    mounted() {
      const queue = U.readQueue();
      if (queue && Array.isArray(queue.ids)) {
        this.queue = queue;
        this.questions = queue.ids.map((id) => D.questions.find((q) => q.id === id)).filter(Boolean);
        this.marks = this.questions.map(() => "none");
        this.startedAt = Date.now();
        this.now = Date.now();
        this.timer = setInterval(() => (this.now = Date.now()), 1000);
      }
      if (this.current && this.current.subject) S.lastSubject = this.current.subject;
    },
    beforeUnmount() {
      if (this.timer) clearInterval(this.timer);
    },
    methods: {
      fmt(s) {
        return U.fmt(s);
      },
      para(s) {
        return U.para(s);
      },
      choose(i) {
        if (this.revealed) return;
        this.selected = i;
      },
      submit() {
        if (this.isChoice && this.selected == null) {
          U.toast("请先选择一个选项");
          return;
        }
        this.revealed = true;
        if (this.isChoice) {
          if (this.isRight) {
            this.marks[this.idx] = "right";
            U.toast("回答正确");
          } else {
            this.marks[this.idx] = "wrong";
            U.addWrong(this.current.id);
            U.toast("答错了，已加入错题本");
          }
        }
      },
      reveal() {
        this.revealed = true;
      },
      selfGrade(ok) {
        if (!this.current) return;
        this.marks[this.idx] = ok ? "right" : "wrong";
        if (ok) {
          U.setMastery(this.current.id, 1);
          U.toast("本题记为答对");
        } else {
          U.setMastery(this.current.id, 3);
          U.addWrong(this.current.id);
          U.toast("本题记为答错，已加入错题本");
        }
        if (this.lastOne) this.finish();
        else this.next();
      },
      next() {
        if (this.idx < this.total - 1) {
          this.idx += 1;
          this.selected = null;
          this.revealed = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          this.finish();
        }
      },
      finish() {
        if (this.finished) return;
        this.finished = true;
        if (this.timer) clearInterval(this.timer);
        const right = this.rightCount;
        const wrong = this.wrongCount;
        const done = right + wrong;
        const acc = done ? Math.round((right / done) * 100) : 0;
        U.addPractice({
          at: Date.now(),
          title: this.title,
          subject: this.current ? this.current.subject : (this.queue && this.queue.meta && this.queue.meta.subject) || "",
          subjectName: this.subjectName,
          total: this.total,
          right: right,
          wrong: wrong,
          accuracy: acc,
          duration: this.elapsed,
          mode: (this.queue && this.queue.meta && this.queue.meta.mode) || "custom",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      restart() {
        this.questions = U.shuffle(this.questions);
        this.marks = this.questions.map(() => "none");
        this.idx = 0;
        this.selected = null;
        this.revealed = false;
        this.finished = false;
        this.startedAt = Date.now();
        this.now = Date.now();
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => (this.now = Date.now()), 1000);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      exit() {
        if (this.finished) {
          U.go("/dashboard/" + (S.lastSubject || "math1"));
          return;
        }
        U.askConfirm("退出本次练习？", "当前进度不会保存为练习记录，错题仍会保留。", () => {
          U.go("/dashboard/" + (S.lastSubject || "math1"));
        });
      },
      go(path) {
        U.go(path);
      },
      openQuestion(q) {
        U.go("/question/" + q.id);
      },
      dotClass(i) {
        const m = this.marks[i];
        return {
          done: m === "right" || m === "wrong",
          right: m === "right",
          wrong: m === "wrong",
          cur: i === this.idx && !this.finished,
        };
      },
      masteryName(m) {
        return m === "right" ? "答对" : m === "wrong" ? "答错" : "未答";
      },
      durationText: durationText,
    },
    template: `
    <main class="practice-page" v-if="!finished && total">
      <div class="container practice-shell">
        <div class="practice-head">
          <div>
            <h1>{{ title }}</h1>
            <p>{{ subjectName }} · 共 {{ total }} 题 · 已答 {{ answeredCount }} 题 · 用时 {{ elapsedText }}</p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="exit"><Icon name="x" :size="15" /> 退出</button>
        </div>

        <div class="practice-progress card">
          <div class="pp-top">
            <span>第 <b>{{ idx + 1 }}</b> / {{ total }} 题</span>
            <span>正确 <b style="color:#0f7a38">{{ rightCount }}</b> · 错误 <b style="color:#e0483a">{{ wrongCount }}</b></span>
          </div>
          <div class="pp-bar"><i :style="{ width: progressPct + '%' }"></i></div>
          <div class="pp-dots">
            <span v-for="(m, i) in marks" :key="i" class="pp-dot" :class="dotClass(i)"></span>
          </div>
        </div>

        <article class="practice-card card" v-if="current" v-math>
          <div class="q-topline">
            <span class="tag tag-type" :class="'type-' + current.type">{{ current.typeName }}</span>
            <span class="chip chip-orange">{{ current.year }} 年</span>
            <span class="diff" :class="'diff-' + current.difficulty">{{ current.difficultyName }}</span>
            <span class="tag" style="background:#faf6ee;color:#8a8175">{{ current.score }} 分</span>
            <span class="crumb" style="margin-left:auto;font-size:11px"><Icon name="target" :size="12" /> {{ current.kpName }}</span>
          </div>
          <div class="q-title-row">
            <h1>{{ current.kpName }}</h1>
          </div>
          <div class="q-submeta">
            <span>{{ current.year }} 年 · 第 {{ current.indexNo }} 题</span>
            <span>考点：<b>{{ current.kpName }}</b></span>
          </div>

          <div class="passage-box" v-if="current.passage">
            <h4>{{ current.passageTitle || '阅读材料' }}</h4>
            <div class="passage-text" v-html="para(current.passage)"></div>
          </div>

          <div class="q-shot-wrap" v-if="imageUrl">
            <img class="q-shot" :src="imageUrl" alt="原题截图" loading="lazy" />
            <span class="q-shot-note">原题截图 · 公式与图形以原卷为准</span>
          </div>

          <div class="q-stem" v-if="!imageUrl" v-html="fmt(current.stem)"></div>

          <div class="q-options compact" v-if="imageUrl && current.options && current.options.length">
            <button v-for="(opt, i) in current.options" :key="'s' + i" class="q-option"
              :class="{
                selected: selected === i && !revealed,
                correct: revealed && i === correctIndex,
                wrong: revealed && selected === i && i !== correctIndex
              }"
              :disabled="revealed" @click="choose(i)" :title="opt">
              <span class="opt-key">{{ 'ABCDEF'[i] }}</span>
            </button>
          </div>

          <div class="q-options" v-if="!imageUrl && current.options && current.options.length">
            <button v-for="(opt, i) in current.options" :key="i" class="q-option"
              :class="{
                selected: selected === i && !revealed,
                correct: revealed && i === correctIndex,
                wrong: revealed && selected === i && i !== correctIndex
              }"
              :disabled="revealed" @click="choose(i)">
              <span class="opt-key">{{ 'ABCDEF'[i] }}</span>
              <span class="opt-text" v-html="fmt(opt)"></span>
              <span class="opt-result" v-if="revealed && i === correctIndex">正确答案</span>
              <span class="opt-result" v-else-if="revealed && selected === i">你的选择</span>
            </button>
          </div>

          <div class="answer-box" v-if="revealed" style="margin-top:20px">
            <div class="answer-box-head"><Icon name="check-circle" :size="15" /> 参考答案</div>
            <div class="answer-main" v-html="fmt(current.answer)"></div>
          </div>
          <div class="analysis-box" v-if="revealed">
            <h4><Icon name="spark" :size="14" /> 题目解析</h4>
            <div class="analysis-text" v-html="para(current.analysis)"></div>
          </div>

          <div class="self-grade" v-if="revealed && !isChoice && marks[idx] === 'none'">
            <span>对照答案，这道题你做对了吗？</span>
            <div class="self-grade-actions">
              <button class="btn btn-ghost grade-btn ok" @click="selfGrade(true)"><Icon name="check" :size="14" /> 做对了</button>
              <button class="btn btn-ghost grade-btn bad" @click="selfGrade(false)"><Icon name="x" :size="14" /> 做错了</button>
            </div>
          </div>

          <div class="practice-actions">
            <span class="practice-hint" v-if="!revealed">{{ isChoice ? '选择你的答案后提交' : '建议先在纸上作答，再查看解析' }}</span>
            <span class="practice-hint" v-else>{{ isChoice ? (isRight ? '回答正确' : '已自动加入错题本') : (marks[idx] !== 'none' ? '已记录本题结果' : '请标记做对或做错') }}</span>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" v-if="!revealed && isChoice" @click="submit"><Icon name="check-circle" :size="16" /> 提交答案</button>
              <button class="btn btn-ghost" v-if="!revealed" @click="reveal"><Icon name="eye" :size="16" /> 查看解析</button>
              <button class="btn btn-primary" v-if="canNext" @click="next">
                {{ lastOne ? '完成练习' : '下一题' }} <Icon name="arrow-right" :size="15" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </main>

    <main class="practice-page" v-else-if="finished">
      <div class="container practice-shell">
        <div class="practice-result card">
          <div class="result-badge"><Icon name="award" :size="38" /></div>
          <h2>本组练习完成</h2>
          <p>{{ title }} · 共 {{ total }} 题</p>
          <div class="result-stats">
            <div class="result-stat"><b>{{ accuracy }}<em>%</em></b><span>正确率</span></div>
            <div class="result-stat"><b>{{ rightCount }}<em>题</em></b><span>答对</span></div>
            <div class="result-stat"><b>{{ wrongCount }}<em>题</em></b><span>答错</span></div>
            <div class="result-stat"><b>{{ durationText(elapsed) }}</b><span>用时</span></div>
          </div>
          <div class="result-actions">
            <button class="btn btn-primary" @click="restart"><Icon name="rotate" :size="15" /> 再刷一遍</button>
            <button class="btn btn-ghost" @click="go('/wrong-book')"><Icon name="flag" :size="15" /> 去错题本</button>
            <button class="btn btn-ghost" @click="go('/dashboard/' + (S.lastSubject || 'math1'))"><Icon name="target" :size="15" /> 继续按考点刷</button>
          </div>
          <div class="result-notes">
            <div class="result-note-row" v-for="(s, i) in summary" :key="s.q.id">
              <span style="width:22px;color:#b3a998">{{ i + 1 }}</span>
              <b>{{ s.q.year }} · {{ s.q.typeName }}</b>
              <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ s.q.kpName }}</span>
              <span :class="s.mark === 'right' ? 'ok' : 'no'">{{ masteryName(s.mark) }}</span>
              <button class="icon-btn" style="width:26px;height:26px" @click="openQuestion(s.q)"><Icon name="chev-right" :size="14" /></button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <main class="practice-page" v-else>
      <div class="container practice-shell">
        <div class="empty-state card">
          <span class="empty-icon"><Icon name="play" :size="28" /></span>
          <h3>还没有待练习的题目</h3>
          <p>去考点页选一个考点，点击「组合刷题」生成一组练习。</p>
          <button class="btn btn-primary" @click="go('/dashboard/math1')">去考点页</button>
        </div>
      </div>
    </main>`,
  };
})();

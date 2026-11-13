/* Practice — focused drill mode */
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
        answerText: "",
        zoom: 1,
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
      keys() {
        return this.current ? U.choiceKeys(this.current) : [];
      },
      hasTextOptions() {
        return !!(this.current && this.current.options && this.current.options.length);
      },
      hasKey() {
        return U.hasKey(this.current);
      },
      correctKey() {
        const q = this.current;
        if (!q) return "";
        if (q.answerIndex != null && q.answerIndex >= 0) return "ABCDEF"[q.answerIndex];
        const m = String(q.answer || "").trim().match(/^([A-F])$/);
        return m ? m[1] : "";
      },
      correctIndex() {
        if (!this.current) return -1;
        if (this.current.answerIndex != null && this.current.answerIndex >= 0) return this.current.answerIndex;
        return this.correctKey ? "ABCDEF".indexOf(this.correctKey) : -1;
      },
      autoGrade() {
        return this.isChoice && this.correctIndex >= 0;
      },
      isRight() {
        return this.autoGrade && this.selected === this.correctIndex;
      },
      qTitle() {
        return U.qTitle(this.current);
      },
      answerImageUrl() {
        return this.current ? this.current.answerImage || "" : "";
      },
      savedAnswer() {
        return this.current ? U.myAnswer(this.current.id) : null;
      },
      title() {
        return (this.queue && this.queue.meta && this.queue.meta.title) || "组合练习";
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
        if (!this.autoGrade) return this.marks[this.idx] === "right" || this.marks[this.idx] === "wrong";
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
      this.syncAnswer();
    },
    beforeUnmount() {
      if (this.timer) clearInterval(this.timer);
    },
    methods: {
      pad(n) {
        return String(n || 0).padStart(2, "0");
      },
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
      syncAnswer() {
        const a = this.current ? U.myAnswer(this.current.id) : null;
        this.answerText = a ? a.text : "";
      },
      saveMyAnswer() {
        const t = this.answerText.trim();
        if (!t) {
          U.toast("先写下你的答案或结论");
          return;
        }
        U.saveAnswer(this.current.id, t);
        U.toast("已记录你的作答");
      },
      setZoom(v) {
        this.zoom = U.clamp(Math.round(v * 100) / 100, 0.6, 2.4);
      },
      submit() {
        if (this.isChoice && this.selected == null) {
          U.toast("请先选择一个选项");
          return;
        }
        this.revealed = true;
        if (this.autoGrade) {
          if (this.isRight) {
            this.marks[this.idx] = "right";
            U.setMastery(this.current.id, 1);
            U.toast("回答正确");
          } else {
            this.marks[this.idx] = "wrong";
            U.setMastery(this.current.id, 3);
            U.addWrong(this.current.id);
            U.toast("与参考答案不一致，已加入错题本");
          }
        } else {
          U.saveAnswer(this.current.id, "ABCDEF"[this.selected]);
          this.syncAnswer();
          U.toast("已记录你的选择：" + "ABCDEF"[this.selected]);
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
          this.zoom = 1;
          this.syncAnswer();
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
        this.zoom = 1;
        this.finished = false;
        this.startedAt = Date.now();
        this.now = Date.now();
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => (this.now = Date.now()), 1000);
        this.syncAnswer();
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      exit() {
        if (this.finished) {
          U.go("/dashboard/" + (S.lastSubject || "math2"));
          return;
        }
        U.askConfirm("退出本次练习？", "当前进度不会保存为练习记录，错题仍会保留。", () => {
          U.go("/dashboard/" + (S.lastSubject || "math2"));
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
    <main class="drill-page" v-if="!finished && total">
      <div class="drill-frame">
        <header class="drill-bar">
          <div class="drill-id">
            <span class="drill-badge"><Icon name="play" :size="15" /></span>
            <div class="drill-id-text">
              <span>DRILL MODE / 专注练习</span>
              <b>{{ title }}</b>
            </div>
          </div>
          <div class="drill-clocks">
            <div class="drill-clock"><span>TIME</span><b>{{ elapsedText }}</b></div>
            <div class="drill-counter">
              <span class="dc-right">RIGHT <b>{{ rightCount }}</b></span>
              <span class="dc-wrong">WRONG <b>{{ wrongCount }}</b></span>
            </div>
          </div>
          <button class="drill-exit" @click="exit"><Icon name="x" :size="14" /> 退出</button>
        </header>

        <div class="drill-ruler">
          <div class="ruler-line">
            <span v-for="(m, i) in marks" :key="i" class="ruler-tick" :class="dotClass(i)"><i></i></span>
          </div>
          <div class="ruler-read">
            <span>ITEM <b>{{ pad(idx + 1) }}</b> <em>/ {{ pad(total) }}</em></span>
            <span>{{ subjectName }}</span>
            <span>{{ progressPct }}% MARKED</span>
          </div>
        </div>

        <div class="drill-body">
          <aside class="drill-margin">
            <div class="drill-qno">
              <span>QUESTION</span>
              <b>{{ pad(idx + 1) }}</b>
            </div>
            <dl class="drill-meta">
              <div><dt>科目</dt><dd>{{ current.subjectName }}</dd></div>
              <div><dt>年份</dt><dd>{{ current.year }}</dd></div>
              <div><dt>题号</dt><dd>{{ pad(current.indexNo) }}</dd></div>
              <div><dt>题型</dt><dd>{{ current.typeName }}</dd></div>
              <div><dt>分值</dt><dd>{{ current.score }} 分</dd></div>
              <div>
                <dt>难度</dt>
                <dd class="drill-diff">
                  <i v-for="n in 3" :key="n" :class="{ lit: current.difficulty >= n }"></i>
                  <em>{{ current.difficultyName }}</em>
                </dd>
              </div>
            </dl>
            <div class="drill-kp">
              <span>FOCUS</span>
              <p>{{ current.kpName }}</p>
            </div>
            <button class="drill-quit" @click="exit">放弃本组</button>
          </aside>

          <article class="drill-sheet" v-math>
            <header class="drill-sheet-head">
              <span class="drill-type">{{ current.typeName }}</span>
              <span class="drill-origin">{{ current.year }} · NO.{{ pad(current.indexNo) }} · {{ current.score }} PTS</span>
            </header>
            <h2 class="drill-title">{{ qTitle }}</h2>

            <section class="spec-passage" v-if="current.passage">
              <span class="spec-label">{{ current.passageTitle || '阅读材料' }}</span>
              <div class="spec-passage-text" v-html="para(current.passage)"></div>
            </section>

            <section class="spec-shot" v-if="imageUrl">
              <div class="shot-bar">
                <span class="spec-label">ORIGINAL SCAN / 原卷影像</span>
                <div class="shot-tools">
                  <button class="tool-btn" @click="setZoom(zoom - 0.2)" :disabled="zoom <= 0.6">−</button>
                  <span class="shot-scale">{{ Math.round(zoom * 100) }}%</span>
                  <button class="tool-btn" @click="setZoom(zoom + 0.2)" :disabled="zoom >= 2.4">+</button>
                  <button class="tool-btn" @click="setZoom(1)">原尺寸</button>
                </div>
              </div>
              <div class="shot-frame">
                <img :src="imageUrl" :style="{ width: (zoom * 100) + '%' }" :alt="qTitle + ' 原卷影像'" />
              </div>
              <span class="spec-shot-note">按原卷逐题精切 · 公式与图形以原卷为准</span>
            </section>

            <section class="spec-stem" v-if="!imageUrl" v-html="fmt(current.stem)"></section>

            <div class="spec-choices" v-if="imageUrl && isChoice && keys.length">
              <span class="spec-label">MY CHOICE / 我的选择</span>
              <div class="spec-choice-keys">
                <button v-for="(k, i) in keys" :key="'s' + i" class="spec-key"
                  :class="{
                    picked: selected === i && !revealed,
                    'key-correct': revealed && i === correctIndex,
                    'key-wrong': revealed && autoGrade && selected === i && i !== correctIndex
                  }"
                  :disabled="revealed" @click="choose(i)" :title="'选择 ' + k">{{ k }}</button>
              </div>
              <p class="spec-choice-note" v-if="!hasKey">选项内容见上方原卷影像。本卷未附官方答案，请在开卷后自行判定对错。</p>
            </div>

            <section class="spec-choices" v-if="!imageUrl && isChoice && hasTextOptions">
              <div class="spec-choice" v-for="(opt, i) in current.options" :key="i">
                <button class="spec-choice-key"
                  :class="{
                    picked: selected === i && !revealed,
                    'key-correct': revealed && i === correctIndex,
                    'key-wrong': revealed && autoGrade && selected === i && i !== correctIndex
                  }"
                  :disabled="revealed" @click="choose(i)">{{ 'ABCDEF'[i] }}</button>
                <div class="spec-choice-text" v-html="fmt(opt)"></div>
                <span class="spec-choice-mark" v-if="revealed && i === correctIndex">正确答案</span>
                <span class="spec-choice-mark wrong-mark" v-else-if="revealed && selected === i">你的选择</span>
              </div>
            </section>

            <section class="spec-work" v-if="!isChoice">
              <span class="spec-label">MY WORK / 我的作答</span>
              <textarea v-model="answerText" maxlength="1200" placeholder="把关键结论写在这里：最终结果、用到的定理、卡住的一步…"></textarea>
              <div class="work-foot">
                <em>{{ answerText.length }}/1200</em>
                <button class="tool-btn" @click="saveMyAnswer"><Icon name="check" :size="12" /> 记录作答</button>
              </div>
            </section>

            <section class="drill-ref" v-if="revealed">
              <div class="drill-ref-head">
                <span class="spec-label">REFERENCE / 参考答案</span>
                <span class="drill-ref-stamp">{{ hasKey ? 'OFFICIAL KEY' : 'SELF CHECK' }}</span>
              </div>
              <template v-if="hasKey">
                <div class="spec-answer-official" v-if="correctKey">
                  <span class="ans-key">{{ correctKey }}</span><span class="ans-key-note">正确选项</span>
                </div>
                <div class="spec-answer" v-if="current.answer" v-html="fmt(current.answer)"></div>
                <div class="spec-answer-shot" v-if="answerImageUrl">
                  <img :src="answerImageUrl" alt="原卷参考答案" />
                  <span class="spec-shot-note">{{ current.answerSource || '原卷附参考答案' }}</span>
                </div>
                <div class="spec-analysis" v-if="current.analysis">
                  <span class="spec-label">ANALYSIS / 解析</span>
                  <div class="spec-analysis-text" v-html="para(current.analysis)"></div>
                </div>
              </template>
              <div class="spec-nokey compact" v-else>
                <span class="nokey-stamp">NO OFFICIAL KEY</span>
                <p>{{ current.year }} 年原卷未附答案。请对照教材或课程核对你的结论，然后在下面判定对错。</p>
                <div class="nokey-mine" v-if="savedAnswer">
                  <span class="spec-label">MY RECORDED ANSWER</span>
                  <p>{{ savedAnswer.text }}</p>
                </div>
              </div>
            </section>

            <div class="drill-grade" v-if="revealed && !autoGrade && marks[idx] === 'none'">
              <span>{{ hasKey ? '对照答案，这道题你做对了吗？' : '核对完成后，判定这道题的结果' }}</span>
              <div class="drill-grade-actions">
                <button @click="selfGrade(true)"><Icon name="check" :size="13" /> 做对了</button>
                <button @click="selfGrade(false)"><Icon name="x" :size="13" /> 做错了</button>
              </div>
            </div>

            <footer class="drill-foot">
              <span class="drill-status" v-if="!revealed">{{ isChoice ? '选择你的答案后提交' : '建议先在纸上作答，再开卷核对' }}</span>
              <span class="drill-status" v-else-if="autoGrade">
                <b :class="isRight ? 'is-ok' : 'is-bad'">{{ isRight ? '回答正确' : '与参考答案不一致，已收进错题本' }}</b>
              </span>
              <span class="drill-status" v-else-if="marks[idx] !== 'none'">
                <b :class="marks[idx] === 'right' ? 'is-ok' : 'is-bad'">{{ marks[idx] === 'right' ? '已记为做对' : '已记为做错，收进错题本' }}</b>
              </span>
              <span class="drill-status" v-else>
                <b v-if="marks[idx] !== 'none'" class="is-ok">已记录本题结果</b>
                <b v-else>请标记做对或做错</b>
              </span>
              <div class="drill-buttons">
                <button class="drill-btn primary" v-if="!revealed && isChoice" @click="submit">
                  {{ hasKey ? '提交答案' : '记录我的选择' }} <Icon name="check-circle" :size="15" />
                </button>
                <button class="drill-btn ghost" v-if="!revealed" @click="reveal">
                  <Icon name="eye" :size="14" /> {{ hasKey ? '参考答案' : '开卷自查' }}
                </button>
                <button class="drill-btn primary" v-if="canNext" @click="next">
                  {{ lastOne ? '完成练习' : '下一题' }} <Icon name="arrow-right" :size="15" />
                </button>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </main>

    <main class="drill-page" v-else-if="finished">
      <div class="report-frame">
        <header class="report-mast">
          <div class="report-kicker"><span>PLATE 08</span> DRILL REPORT / 练习记录</div>
          <h1>本组练习完成</h1>
          <p>{{ title }} · {{ subjectName }} · 共 {{ total }} 题</p>
        </header>

        <div class="report-score">
          <div class="report-acc">
            <span>ACCURACY</span>
            <b>{{ accuracy }}<em>%</em></b>
          </div>
          <div class="report-cells">
            <div><span>答对</span><b>{{ rightCount }}</b></div>
            <div><span>答错</span><b>{{ wrongCount }}</b></div>
            <div><span>题量</span><b>{{ total }}</b></div>
            <div><span>用时</span><b>{{ durationText(elapsed) }}</b></div>
          </div>
        </div>

        <div class="report-sheet">
          <div class="report-head">
            <span>NO.</span><span>题目</span><span>结果</span><span></span>
          </div>
          <div class="report-row" v-for="(s, i) in summary" :key="s.q.id">
            <span class="rr-no">{{ pad(i + 1) }}</span>
            <span class="rr-title">
              <b>{{ U.qTitle(s.q) }}</b>
              <em>{{ s.q.year }} · {{ s.q.typeName }} · {{ s.q.score }} 分</em>
            </span>
            <span class="rr-mark" :class="s.mark">{{ masteryName(s.mark) }}</span>
            <button class="rr-open" @click="openQuestion(s.q)" title="打开题目"><Icon name="chev-right" :size="14" /></button>
          </div>
        </div>

        <div class="report-actions">
          <button class="drill-btn primary" @click="restart"><Icon name="rotate" :size="15" /> 再刷一遍</button>
          <button class="drill-btn ghost" @click="go('/wrong-book')"><Icon name="flag" :size="15" /> 去错题本</button>
          <button class="drill-btn ghost" @click="go('/dashboard/' + (S.lastSubject || 'math2'))"><Icon name="target" :size="15" /> 继续按考点刷</button>
        </div>
      </div>
    </main>

    <main class="drill-page" v-else>
      <div class="drill-empty">
        <span class="margin-label">DRILL MODE / NO QUEUE</span>
        <h1>还没有待练习的题目</h1>
        <p>去考点页选一个考点，点击「组合练习」生成一组练习。</p>
        <button class="drill-btn primary" @click="go('/dashboard/math2')">去考点页 <Icon name="arrow-right" :size="15" /></button>
      </div>
    </main>`,
  };
})();

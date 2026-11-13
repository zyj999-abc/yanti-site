/* Question detail — specimen sheet */
(function () {
  const YT = window.YT;
  const U = YT.util;
  const D = YT.data;
  const S = YT.S;

  YT.components.QuestionView = {
    props: { questionId: String },
    data() {
      return {
        S: S,
        selected: null,
        revealed: false,
        noteText: "",
        commentText: "",
        answerText: "",
        zoom: 1,
        U: U,
      };
    },
    computed: {
      question() {
        return D.questions.find((x) => x.id === this.questionId);
      },
      subject() {
        return this.question ? U.subjectOf(this.question.subject) : null;
      },
      kpNames() {
        return this.question ? U.kpPath(this.question.kpId) : [];
      },
      related() {
        if (!this.question) return [];
        const q = this.question;
        let list = U.questionsOf(q.subject).filter((x) => x.kpId === q.kpId && x.id !== q.id);
        if (list.length < 4) {
          list = list.concat(U.questionsOf(q.subject).filter((x) => x.id !== q.id && x.type === q.type && x.kpId !== q.kpId));
        }
        return list.slice(0, 5);
      },
      siblings() {
        return this.question ? U.questionsOf(this.question.subject) : [];
      },
      index() {
        if (!this.question) return -1;
        return this.siblings.findIndex((x) => x.id === this.question.id);
      },
      prevQ() {
        return this.index > 0 ? this.siblings[this.index - 1] : null;
      },
      nextQ() {
        return this.index >= 0 && this.index < this.siblings.length - 1 ? this.siblings[this.index + 1] : null;
      },
      comments() {
        return (this.question && S.comments[this.question.id]) || [];
      },
      isChoice() {
        return this.question && ["choice", "cloze", "read", "newtype"].indexOf(this.question.type) >= 0;
      },
      keys() {
        return this.question ? U.choiceKeys(this.question) : [];
      },
      hasTextOptions() {
        return !!(this.question && this.question.options && this.question.options.length);
      },
      hasKey() {
        return U.hasKey(this.question);
      },
      correctKey() {
        const q = this.question;
        if (!q) return "";
        if (q.answerIndex != null && q.answerIndex >= 0) return "ABCDEF"[q.answerIndex];
        const m = String(q.answer || "").trim().match(/^([A-F])$/);
        return m ? m[1] : "";
      },
      correctIndex() {
        if (!this.question) return -1;
        if (this.question.answerIndex != null && this.question.answerIndex >= 0) return this.question.answerIndex;
        const k = this.correctKey;
        return k ? "ABCDEF".indexOf(k) : -1;
      },
      isRight() {
        return this.isChoice && this.correctIndex >= 0 && this.selected === this.correctIndex;
      },
      savedAnswer() {
        return this.question ? U.myAnswer(this.question.id) : null;
      },
      answerImageUrl() {
        return this.question ? this.question.answerImage || "" : "";
      },
      title() {
        return U.qTitle(this.question);
      },
      paper() {
        return this.question ? U.paperOf(this.question.subject, this.question.year) : null;
      },
      mastery() {
        return this.question ? S.mastery[this.question.id] || 0 : 0;
      },
      initial() {
        return (S.user.name || "研").slice(0, 1);
      },
      imageUrl() {
        return this.question ? U.imageUrl(this.question) : "";
      },
      specimenCode() {
        if (!this.question) return "";
        return (this.subject.code || this.question.subject.toUpperCase()) + " · " + String(this.question.year).slice(2) + " · " + this.pad(this.question.indexNo);
      },
      isFav() {
        return !!this.question && S.favorites.indexOf(this.question.id) >= 0;
      },
      isWrong() {
        return !!this.question && S.wrong.indexOf(this.question.id) >= 0;
      },
    },
    watch: {
      questionId: {
        immediate: true,
        handler() {
          this.reset();
        },
      },
    },
    mounted() {
      if (this.subject) S.lastSubject = this.subject.id;
      this.syncNote();
    },
    methods: {
      reset() {
        this.selected = null;
        this.revealed = false;
        this.commentText = "";
        this.zoom = 1;
        this.syncNote();
        this.syncAnswer();
        window.scrollTo({ top: 0, behavior: "auto" });
      },
      syncNote() {
        this.noteText = (this.question && S.notes[this.question.id]) || "";
      },
      syncAnswer() {
        const a = this.question ? U.myAnswer(this.question.id) : null;
        this.answerText = a ? a.text : "";
      },
      saveMyAnswer() {
        const t = this.answerText.trim();
        if (!t) {
          U.toast("先写下你的答案或结论");
          return;
        }
        U.saveAnswer(this.question.id, t);
        this.revealed = true;
        U.toast("已记录你的答案（保存在本机）");
      },
      clearMyAnswer() {
        U.saveAnswer(this.question.id, "");
        this.answerText = "";
        U.toast("已清除自记答案");
      },
      setZoom(v) {
        this.zoom = U.clamp(Math.round(v * 100) / 100, 0.6, 2.4);
      },
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
      submit() {
        if (this.isChoice && this.selected == null) {
          U.toast("请先选择一个选项");
          return;
        }
        this.revealed = true;
        if (this.isChoice && this.correctIndex >= 0) {
          if (this.isRight) U.toast("回答正确");
          else {
            U.addWrong(this.question.id);
            U.toast("与参考答案不一致，已加入错题本");
          }
        } else if (this.isChoice) {
          U.saveAnswer(this.question.id, "ABCDEF"[this.selected]);
          this.syncAnswer();
          U.toast("已记录你的选择：" + "ABCDEF"[this.selected]);
        }
      },
      reveal() {
        this.revealed = true;
      },
      grade(level) {
        U.setMastery(this.question.id, level);
        if (level === 1) U.toast("已标记为「简单」");
        else if (level === 2) U.toast("已标记为「一般」");
        else U.toast("已标记为「不会」，并加入错题本");
      },
      toggleWrong() {
        U.toggleWrong(this.question.id);
      },
      toggleFav() {
        U.toggleFav(this.question.id);
      },
      saveNote() {
        U.saveNote(this.question.id, this.noteText);
        U.toast(this.noteText.trim() ? "笔记已保存" : "已清空笔记");
      },
      addComment() {
        const text = this.commentText.trim();
        if (!text) {
          U.toast("写点什么再发布吧");
          return;
        }
        U.addComment(this.question.id, text);
        this.commentText = "";
        U.toast("评论已发布（保存在本机）");
      },
      go(path) {
        U.go(path);
      },
      goPapers() {
        U.go("/papers/" + this.question.subject + "?year=" + this.question.year);
      },
      printOne() {
        YT.printPaper({
          title: this.title + "（" + this.question.year + " 年 第 " + this.question.indexNo + " 题）",
          subtitle: this.question.subjectName + " · " + this.question.typeName + " · " + this.question.score + " 分 · 研题岛 ATLAS",
          questions: [this.question],
          answers: true,
        });
      },
      openQuestion(q) {
        U.go("/question/" + q.id);
      },
      masteryName() {
        return ["未标记", "简单", "一般", "不会"][this.mastery];
      },
    },
    template: `
    <main class="specimen-page" v-if="question">
      <div class="container">
        <header class="plate-mast specimen-mast">
          <div class="plate-no"><span>PLATE</span><b>07</b></div>
          <div class="plate-title">
            <span class="plate-kicker">QUESTION SPECIMEN / 单题标本</span>
            <div class="specimen-crumb">
              <a href="#/" @click.prevent="go('/')">总览</a><i>/</i>
              <a :href="'#/dashboard/' + question.subject" @click.prevent="go('/dashboard/' + question.subject)">{{ subject.name }}</a><i>/</i>
              <a :href="'#/papers/' + question.subject + '?year=' + question.year" @click.prevent="goPapers">{{ question.year }} 年卷</a><i>/</i>
              <b>第 {{ question.indexNo }} 题</b>
            </div>
          </div>
          <div class="mast-tools">
            <a href="#/" class="bare-link" @click.prevent="go('/dashboard/' + question.subject)">返回考点图</a>
            <button class="tool-btn" :class="{ on: isFav }" @click="toggleFav">
              <Icon name="star" :size="13" /> {{ isFav ? '已收藏' : '收藏' }}
            </button>
            <button class="tool-btn" :class="{ on: isWrong }" @click="toggleWrong">
              <Icon name="flag" :size="13" /> {{ isWrong ? '在错题本' : '记错题' }}
            </button>
            <button class="tool-btn" @click="printOne"><Icon name="printer" :size="13" /> 打印</button>
          </div>
        </header>

        <div class="specimen-sheet">
          <aside class="specimen-margin">
            <div class="specimen-code">
              <span class="margin-label">SPECIMEN NO.</span>
              <b>{{ specimenCode }}</b>
              <span class="code-sub">ITEM {{ pad(index + 1) }} OF {{ pad(siblings.length) }}</span>
            </div>

            <dl class="specimen-meta">
              <div><dt>科目</dt><dd>{{ question.subjectName }}</dd></div>
              <div><dt>年份</dt><dd>{{ question.year }}</dd></div>
              <div><dt>题号</dt><dd>{{ pad(question.indexNo) }}</dd></div>
              <div><dt>题型</dt><dd>{{ question.typeName }}</dd></div>
              <div><dt>分值</dt><dd>{{ question.score }} 分</dd></div>
              <div>
                <dt>难度</dt>
                <dd class="meta-diff">
                  <em v-for="n in 3" :key="n" :class="{ lit: question.difficulty >= n }"></em>
                  <span>{{ question.difficultyName }}</span>
                </dd>
              </div>
              <div><dt>掌握</dt><dd :class="{ 'meta-alert': mastery === 3 }">{{ masteryName() }}</dd></div>
            </dl>

            <div class="specimen-path">
              <span class="margin-label">INDEX PATH</span>
              <ol>
                <li v-for="(n, i) in kpNames" :key="i"><i>{{ pad(i + 1) }}</i><span>{{ n }}</span></li>
              </ol>
            </div>

            <label class="specimen-note">
              <span class="margin-label">FIELD NOTE / 批注</span>
              <textarea v-model="noteText" maxlength="800" placeholder="记录易错点、解题步骤、公式…"></textarea>
              <span class="note-foot">
                <em>{{ noteText.length }}/800</em>
                <button class="tool-btn" @click="saveNote"><Icon name="check" :size="12" /> 保存批注</button>
              </span>
            </label>

            <div class="specimen-jump">
              <button @click="goPapers"><Icon name="calendar" :size="13" /> {{ question.year }} 年整卷</button>
              <button @click="go('/dashboard/' + question.subject)"><Icon name="target" :size="13" /> 回到考点图</button>
            </div>
          </aside>

          <article class="specimen-main" v-math>
            <header class="specimen-head">
              <div class="specimen-head-top">
                <span class="specimen-kicker">{{ question.typeName }} · {{ question.score }} PTS</span>
                <span class="specimen-source">{{ question.source }}</span>
              </div>
              <h1>{{ title }}</h1>
              <p class="specimen-kp"><span>考点</span>{{ kpNames.join(' / ') }}</p>
              <div class="specimen-rule">
                <span>{{ question.year }} 年第 {{ question.indexNo }} 题</span>
                <span class="difficulty-label"><i v-for="n in 3" :key="'h' + n" :class="{ lit: question.difficulty >= n }"></i>{{ question.difficultyName }}</span>
                <span v-if="mastery" class="mastery-flag" :class="'m-' + mastery">掌握：{{ masteryName() }}</span>
              </div>
            </header>

            <div class="specimen-body">
              <section class="spec-passage" v-if="question.passage">
                <span class="spec-label">{{ question.passageTitle || '阅读材料' }}</span>
                <div class="spec-passage-text" v-html="para(question.passage)"></div>
              </section>

              <section class="spec-shot" v-if="imageUrl">
                <div class="shot-bar">
                  <span class="spec-label">ORIGINAL SCAN / 原卷影像</span>
                  <div class="shot-tools">
                    <button class="tool-btn" @click="setZoom(zoom - 0.2)" :disabled="zoom <= 0.6" title="缩小">−</button>
                    <span class="shot-scale">{{ Math.round(zoom * 100) }}%</span>
                    <button class="tool-btn" @click="setZoom(zoom + 0.2)" :disabled="zoom >= 2.4" title="放大">+</button>
                    <button class="tool-btn" @click="setZoom(1)">原尺寸</button>
                    <a class="tool-btn" :href="imageUrl" target="_blank" rel="noopener">新窗口看原图</a>
                  </div>
                </div>
                <div class="shot-frame">
                  <img :src="imageUrl" :style="{ width: (zoom * 100) + '%' }" :alt="title + ' 原卷影像'" />
                </div>
                <span class="spec-shot-note">按原卷逐题精切 · 公式与图形以原卷为准</span>
              </section>

              <section class="spec-stem" v-if="!imageUrl" v-html="fmt(question.stem)"></section>

              <div class="spec-choices" v-if="imageUrl && isChoice && keys.length">
                <span class="spec-label">MY CHOICE / 我的选择</span>
                <div class="spec-choice-keys">
                  <button v-for="(k, i) in keys" :key="'s' + i" class="spec-key"
                    :class="{
                      picked: selected === i && !revealed,
                      'key-correct': revealed && i === correctIndex,
                      'key-wrong': revealed && selected === i && i !== correctIndex
                    }"
                    :disabled="revealed" @click="choose(i)" :title="'选择 ' + k">
                    {{ k }}
                  </button>
                </div>
                <p class="spec-choice-note" v-if="!hasKey">选项内容见上方原卷影像。本卷未附官方答案，选择将被记录为你的作答。</p>
              </div>

              <section class="spec-choices" v-if="!imageUrl && isChoice && hasTextOptions">
                <div class="spec-choice" v-for="(opt, i) in question.options" :key="i">
                  <button class="spec-choice-key"
                    :class="{
                      picked: selected === i && !revealed,
                      'key-correct': revealed && i === correctIndex,
                      'key-wrong': revealed && selected === i && i !== correctIndex
                    }"
                    :disabled="revealed" @click="choose(i)">{{ 'ABCDEF'[i] }}</button>
                  <div class="spec-choice-text" v-html="fmt(opt)"></div>
                  <span class="spec-choice-mark" v-if="revealed && i === correctIndex">正确答案</span>
                  <span class="spec-choice-mark wrong-mark" v-else-if="revealed && selected === i">你的选择</span>
                </div>
              </section>

              <section class="spec-work" v-if="!isChoice">
                <span class="spec-label">MY WORK / 我的作答</span>
                <textarea v-model="answerText" maxlength="1200" placeholder="在纸上完成后，把关键结论写在这里：最终结果、用到的定理、卡住的一步…"></textarea>
                <div class="work-foot">
                  <em>{{ answerText.length }}/1200</em>
                  <button class="spec-submit small" @click="saveMyAnswer"><span>记录作答</span><Icon name="check" :size="14" /></button>
                  <button class="tool-btn" v-if="savedAnswer" @click="clearMyAnswer">清除</button>
                </div>
              </section>

              <div class="spec-actions" v-if="!revealed">
                <button class="spec-submit" @click="submit" v-if="isChoice">
                  <span>{{ hasKey ? '提交答案' : '记录我的选择' }}</span><Icon name="check-circle" :size="15" />
                </button>
                <button class="spec-reveal" @click="reveal">
                  <Icon name="eye" :size="15" /><span>{{ hasKey ? '查看参考答案' : '开卷自查' }}</span>
                </button>
                <p class="spec-hint">{{ isChoice ? (hasKey ? '选择后提交，与参考答案不一致会自动收进错题本' : '本卷未附官方答案，先记录你的选择，再对照教材或课程核对') : '解答题先在纸上完整作答，再开卷自查并标记掌握程度' }}</p>
              </div>

              <section class="spec-ref">
                <div class="spec-ref-head">
                  <span class="spec-label">REFERENCE / 参考答案</span>
                  <span class="ref-stamp" v-if="revealed">{{ hasKey ? 'OFFICIAL KEY' : 'SELF CHECK' }}</span>
                </div>
                <template v-if="revealed">
                  <template v-if="hasKey">
                    <div class="spec-answer-official" v-if="correctKey">
                      <span class="ans-key">{{ correctKey }}</span>
                      <span class="ans-key-note">正确选项</span>
                    </div>
                    <div class="spec-answer" v-if="question.answer" v-html="fmt(question.answer)"></div>
                    <div class="spec-answer-shot" v-if="answerImageUrl">
                      <img :src="answerImageUrl" alt="原卷参考答案" />
                      <span class="spec-shot-note">{{ question.answerSource || '原卷附参考答案' }}</span>
                    </div>
                    <div class="spec-analysis" v-if="question.analysis">
                      <span class="spec-label">ANALYSIS / 解析</span>
                      <div class="spec-analysis-text" v-html="para(question.analysis)"></div>
                    </div>
                  </template>
                  <div class="spec-nokey" v-else>
                    <span class="nokey-stamp">NO OFFICIAL KEY</span>
                    <h3>本卷未附官方答案</h3>
                    <p>{{ question.year }} 年数学二真题原卷只提供试题，不含答案与解析。本站不会编造答案，请按下面的方式完成自查。</p>
                    <ol class="nokey-steps">
                      <li><i>01</i><span>对照上面的原卷影像重做一遍，确认每一步的依据。</span></li>
                      <li><i>02</i><span>把最终结论写进「我的作答」，与你参考的教材 / 课程答案核对。</span></li>
                      <li><i>03</i><span>标记掌握程度；标记「不会」会自动进入错题本，便于集中回刷。</span></li>
                    </ol>
                    <div class="nokey-mine" v-if="savedAnswer">
                      <span class="spec-label">MY RECORDED ANSWER / 我的记录</span>
                      <p>{{ savedAnswer.text }}</p>
                      <em>{{ U.timeStr(savedAnswer.at) }}</em>
                    </div>
                  </div>
                  <div class="spec-grade">
                    <span>这道题掌握得怎么样？</span>
                    <div class="spec-grade-actions">
                      <button :class="{ on: mastery === 1 }" @click="grade(1)">简单</button>
                      <button :class="{ on: mastery === 2 }" @click="grade(2)">一般</button>
                      <button :class="{ on: mastery === 3 }" @click="grade(3)">不会</button>
                    </div>
                  </div>
                  <div class="spec-result-line" v-if="isChoice">
                    <span v-if="correctIndex >= 0" :class="isRight ? 'res-ok' : 'res-bad'">
                      {{ isRight ? '回答正确，保持节奏' : '与参考答案不一致，已放入错题本' }}
                    </span>
                    <span v-else class="res-neutral">已记录你的选择{{ selected != null ? '：' + 'ABCDEF'[selected] : '' }}，请对照教材核对</span>
                    <button class="tool-btn" @click="toggleWrong">
                      <Icon name="flag" :size="12" /> {{ isWrong ? '移出错题本' : '加入错题本' }}
                    </button>
                  </div>
                </template>
                <p class="spec-ref-locked" v-else>{{ hasKey ? '答案封存中。作答或点击「查看参考答案」后开卷。' : '本卷无官方答案。作答后开卷，进入自查流程。' }}</p>
              </section>
            </div>
          </article>
        </div>

        <footer class="specimen-foot">
          <section class="margin-notes">
            <header class="foot-head">
              <span class="margin-label">MARGIN NOTES / 研友批注</span>
              <b>{{ comments.length }}</b>
            </header>
            <div class="margin-note-input">
              <span class="note-sign">{{ initial }}</span>
              <div class="note-field">
                <textarea v-model="commentText" maxlength="300" placeholder="说说你的思路，或留下复习提醒…"></textarea>
                <button class="tool-btn" @click="addComment">写入批注</button>
              </div>
            </div>
            <div class="margin-note-list" v-if="comments.length">
              <div class="margin-note" v-for="(c, i) in comments" :key="i">
                <span class="note-no">{{ pad(i + 1) }}</span>
                <div class="note-body">
                  <div class="note-meta"><b>{{ c.name }}</b><span>{{ U.relTime(c.at) }}</span></div>
                  <p>{{ c.text }}</p>
                </div>
              </div>
            </div>
            <p class="margin-note-empty" v-else>还没有批注。第一条思路，从这里写下。</p>
          </section>

          <section class="cross-ref">
            <header class="foot-head">
              <span class="margin-label">CROSS REFERENCE / 相关题</span>
              <a href="#/" class="bare-link" @click.prevent="go('/dashboard/' + question.subject)">考点图 →</a>
            </header>
            <div class="cross-ref-list" v-if="related.length">
              <a class="cross-ref-row" v-for="r in related" :key="r.id" :href="'#/question/' + r.id" @click.prevent="openQuestion(r)">
                <span class="xref-year">{{ r.year }}</span>
                <span class="xref-main">{{ U.qTitle(r) }}</span>
                <span class="xref-type">{{ r.typeName }}</span>
                <span class="xref-no">{{ pad(r.indexNo) }}</span>
              </a>
            </div>
            <p class="cross-ref-empty" v-else>暂无关联题目。</p>
          </section>
        </footer>

        <nav class="specimen-pager">
          <button class="pager-btn" v-if="prevQ" @click="openQuestion(prevQ)">
            <span class="pager-dir"><Icon name="arrow-left" :size="12" /> PREV</span>
            <b>{{ prevQ.year }} 年 第 {{ prevQ.indexNo }} 题</b>
            <em>{{ U.qTitle(prevQ) }}</em>
          </button>
          <span class="pager-gap" v-else></span>
          <button class="pager-btn next" v-if="nextQ" @click="openQuestion(nextQ)">
            <span class="pager-dir">NEXT <Icon name="arrow-right" :size="12" /></span>
            <b>{{ nextQ.year }} 年 第 {{ nextQ.indexNo }} 题</b>
            <em>{{ U.qTitle(nextQ) }}</em>
          </button>
          <span class="pager-gap" v-else></span>
        </nav>
      </div>
    </main>

    <main class="specimen-page" v-else>
      <div class="container">
        <div class="specimen-missing">
          <span class="margin-label">SPECIMEN NOT FOUND</span>
          <h2>这道题不在标本册里</h2>
          <p>题目链接可能已经失效，回到考点图继续找题。</p>
          <button class="spec-submit" @click="go('/dashboard/math2')"><span>回到题库</span><Icon name="arrow-right" :size="15" /></button>
        </div>
      </div>
    </main>`,
  };
})();

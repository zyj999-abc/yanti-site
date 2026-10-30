/* Question detail */
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
        return list.slice(0, 6);
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
      correctIndex() {
        return this.question ? this.question.answerIndex : -1;
      },
      isRight() {
        return this.isChoice && this.selected === this.correctIndex;
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
        this.syncNote();
        window.scrollTo({ top: 0, behavior: "auto" });
      },
      syncNote() {
        this.noteText = (this.question && S.notes[this.question.id]) || "";
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
        if (this.isChoice) {
          if (this.isRight) U.toast("回答正确");
          else {
            U.addWrong(this.question.id);
            U.toast("已自动加入错题本");
          }
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
          title: this.question.kpName + "（" + this.question.year + " 年 第 " + this.question.indexNo + " 题）",
          subtitle: this.question.subjectName + " · " + this.question.typeName + " · " + this.question.score + " 分 · 研题岛真题网",
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
    <main class="question-page" v-if="question">
      <div class="container">
        <div class="bare-crumb">
          <div class="crumb">
            <a href="#/" @click.prevent="go('/')">首页</a><span>/</span>
            <a :href="'#/dashboard/' + question.subject" @click.prevent="go('/dashboard/' + question.subject)">{{ subject.name }}</a><span>/</span>
            <a :href="'#/papers/' + question.subject" @click.prevent="go('/papers/' + question.subject)">{{ question.year }} 年试卷</a><span>/</span>
            <b>第 {{ question.indexNo }} 题</b>
          </div>
        </div>

        <div class="q-detail-layout">
          <div class="q-main">
            <article class="q-detail-card card" v-math>
              <div class="q-topline">
                <span class="tag tag-type" :class="'type-' + question.type">{{ question.typeName }}</span>
                <span class="chip chip-orange">{{ question.year }} 年</span>
                <span class="diff" :class="'diff-' + question.difficulty">{{ question.difficultyName }}</span>
                <span class="tag" style="background:#faf6ee;color:#8a8175">{{ question.score }} 分</span>
                <span class="crumb"><Icon name="book" :size="12" /> {{ question.subjectName }}</span>
              </div>

              <div class="q-title-row">
                <h1>{{ question.kpName }}</h1>
                <div class="q-tools">
                  <button class="icon-btn" :class="{on: S.favorites.indexOf(question.id) >= 0}" :title="S.favorites.indexOf(question.id) >= 0 ? '取消收藏' : '收藏'" @click="toggleFav">
                    <Icon name="star" :size="17" />
                  </button>
                  <button class="icon-btn" :class="{on: S.wrong.indexOf(question.id) >= 0}" :title="S.wrong.indexOf(question.id) >= 0 ? '移出错题本' : '加入错题本'" @click="toggleWrong">
                    <Icon name="flag" :size="17" />
                  </button>
                  <button class="icon-btn" title="打印本题" @click="printOne">
                    <Icon name="printer" :size="17" />
                  </button>
                </div>
              </div>
              <div class="q-submeta">
                <span>{{ question.year }} 年 · 第 {{ question.indexNo }} 题</span>
                <span>考点：<b>{{ kpNames.slice(-1)[0] }}</b></span>
                <span>来源：<b>{{ question.source }}</b></span>
                <span v-if="mastery" style="display:inline-flex;align-items:center;gap:4px;color:#0f7a38">
                  <Icon name="check-circle" :size="12" /> {{ masteryName() }}
                </span>
              </div>

              <div class="passage-box" v-if="question.passage">
                <h4>{{ question.passageTitle || '阅读材料' }}</h4>
                <div class="passage-text" v-html="para(question.passage)"></div>
              </div>

              <div class="q-shot-wrap" v-if="imageUrl">
                <img class="q-shot" :src="imageUrl" alt="原题截图" loading="lazy" />
                <span class="q-shot-note">原题截图 · 公式与图形以原卷为准</span>
              </div>

              <div class="q-stem" v-if="!imageUrl" v-html="fmt(question.stem)"></div>

              <div class="q-options compact" v-if="imageUrl && question.options && question.options.length">
                <button v-for="(opt, i) in question.options" :key="'s' + i" class="q-option"
                  :class="{
                    selected: selected === i && !revealed,
                    correct: revealed && i === correctIndex,
                    wrong: revealed && selected === i && i !== correctIndex
                  }"
                  :disabled="revealed" @click="choose(i)" :title="opt">
                  <span class="opt-key">{{ 'ABCDEF'[i] }}</span>
                </button>
              </div>

              <div class="q-options" v-if="!imageUrl && question.options && question.options.length">
                <button v-for="(opt, i) in question.options" :key="i" class="q-option"
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

              <div class="q-answer-row" v-if="!revealed">
                <button class="btn btn-primary" @click="submit" v-if="isChoice"><Icon name="check-circle" :size="16" /> 提交答案</button>
                <button class="btn btn-ghost" @click="reveal"><Icon name="eye" :size="16" /> 查看答案与解析</button>
                <span class="q-reveal-note">{{ isChoice ? '选择后提交，答错会自动加入错题本' : '主观题建议先在纸上作答，再核对解析' }}</span>
              </div>

              <div class="answer-box" v-if="revealed">
                <div class="answer-box-head"><Icon name="check-circle" :size="15" /> 参考答案</div>
                <div class="answer-main" v-html="fmt(question.answer)"></div>
              </div>

              <div class="analysis-box" v-if="revealed">
                <h4><Icon name="spark" :size="14" /> 题目解析</h4>
                <div class="analysis-text" v-html="para(question.analysis)"></div>
              </div>

              <div class="self-grade" v-if="revealed">
                <span>这道题你掌握得怎么样？</span>
                <div class="self-grade-actions">
                  <button class="btn btn-ghost grade-btn ok" :class="{on: mastery === 1}" @click="grade(1)">简单</button>
                  <button class="btn btn-ghost grade-btn mid" :class="{on: mastery === 2}" @click="grade(2)">一般</button>
                  <button class="btn btn-ghost grade-btn bad" :class="{on: mastery === 3}" @click="grade(3)">不会</button>
                </div>
              </div>

              <div class="q-mastery-bar">
                <span v-if="isChoice && revealed" :style="{ color: isRight ? '#0f7a38' : '#e0483a' }">
                  {{ isRight ? '回答正确，继续保持' : '回答错误，已放入错题本，记得回刷' }}
                </span>
                <span v-else>做完记得标记掌握程度，学习报告会更准确</span>
                <button class="btn btn-soft btn-sm" v-if="isChoice && revealed" @click="toggleWrong">
                  <Icon name="flag" :size="14" /> {{ S.wrong.indexOf(question.id) >= 0 ? '移出错题本' : '加入错题本' }}
                </button>
              </div>
            </article>

            <div class="q-nav">
              <button class="q-nav-btn" v-if="prevQ" @click="openQuestion(prevQ)">
                <span><Icon name="arrow-left" :size="12" /> 上一题</span>
                <b>{{ prevQ.year }} 年第 {{ prevQ.indexNo }} 题</b>
              </button>
              <span v-else></span>
              <button class="q-nav-btn next" v-if="nextQ" @click="openQuestion(nextQ)">
                <span>下一题 <Icon name="arrow-right" :size="12" /></span>
                <b>{{ nextQ.year }} 年第 {{ nextQ.indexNo }} 题</b>
              </button>
            </div>

            <section class="comments-card card">
              <h3><Icon name="edit" :size="16" /> 研友讨论 <span style="font-weight:500;font-size:11px;color:#b3a998">（{{ comments.length }}）</span></h3>
              <div class="comment-input-row">
                <span class="comment-avatar">{{ initial }}</span>
                <div style="flex:1;min-width:0">
                  <textarea class="comment-input" v-model="commentText" maxlength="300" placeholder="说说你的思路，或留下复习提醒…"></textarea>
                  <div style="display:flex;justify-content:flex-end;margin-top:7px">
                    <button class="btn btn-primary btn-sm" @click="addComment">发布评论</button>
                  </div>
                </div>
              </div>
              <div class="comment-list" v-if="comments.length">
                <div class="comment-item" v-for="(c, i) in comments" :key="i">
                  <span class="comment-avatar">{{ c.name.slice(0, 1) }}</span>
                  <div class="comment-body">
                    <div class="comment-meta"><b>{{ c.name }}</b><span>{{ U.relTime(c.at) }}</span></div>
                    <div class="comment-text">{{ c.text }}</div>
                  </div>
                </div>
              </div>
              <p class="comment-empty" v-else>还没有评论，来说说你的解法吧。评论仅保存在本机浏览器。</p>
            </section>
          </div>

          <aside class="q-side">
            <section class="side-card card">
              <h3><Icon name="info" :size="15" /> 题目信息</h3>
              <div class="side-stat-row"><span>所属科目</span><b>{{ question.subjectName }}</b></div>
              <div class="side-stat-row"><span>年份</span><b>{{ question.year }} 年</b></div>
              <div class="side-stat-row"><span>题号</span><b>第 {{ question.indexNo }} 题</b></div>
              <div class="side-stat-row"><span>题型 / 分值</span><b>{{ question.typeName }} · {{ question.score }} 分</b></div>
              <div class="side-stat-row"><span>难度</span><b>{{ question.difficultyName }}</b></div>
              <div class="side-stat-row"><span>掌握程度</span><b>{{ masteryName() }}</b></div>
              <div style="margin-top:9px">
                <div class="side-stat-row" style="padding-bottom:4px"><span>考点路径</span></div>
                <div class="side-kp-path">
                  <span v-for="(n, i) in kpNames" :key="i">{{ n }}</span>
                </div>
              </div>
              <div style="margin-top:12px;display:flex;gap:7px">
                <button class="btn btn-soft btn-sm" style="flex:1" @click="goPapers"><Icon name="calendar" :size="14" /> 本年份试卷</button>
                <button class="btn btn-ghost btn-sm" style="flex:1" @click="go('/dashboard/' + question.subject)"><Icon name="target" :size="14" /> 同考点</button>
              </div>
            </section>

            <section class="side-card card">
              <h3><Icon name="edit" :size="15" /> 我的笔记</h3>
              <textarea class="note-area" v-model="noteText" maxlength="800" placeholder="记录易错点、解题步骤、公式…"></textarea>
              <div class="note-actions">
                <button class="btn btn-ghost btn-sm" @click="saveNote"><Icon name="check" :size="13" /> 保存笔记</button>
              </div>
            </section>

            <section class="side-card card" v-if="related.length">
              <h3><Icon name="layers" :size="15" /> 相关题目</h3>
              <div class="related-grid" style="grid-template-columns:1fr">
                <a class="related-item" v-for="r in related" :key="r.id" :href="'#/question/' + r.id" @click.prevent="openQuestion(r)">
                  <b>{{ r.year }}</b><span>第 {{ r.indexNo }} 题 · {{ r.typeName }}</span>
                </a>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>

    <main class="question-page" v-else>
      <div class="container">
        <div class="empty-state card" style="margin-top:30px">
          <span class="empty-icon"><Icon name="alert" :size="28" /></span>
          <h3>没有找到这道题</h3>
          <p>题目链接可能已经失效，去题库里继续找题吧。</p>
          <button class="btn btn-primary" @click="go('/dashboard/math1')">回到题库</button>
        </div>
      </div>
    </main>`,
  };
})();

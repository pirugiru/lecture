/**
 * reflection.js - 수업 전후 생각 기록 및 비교
 */

class ReflectionManager {
  constructor() {
    this.preData = {
      kw1: '',
      kw2: '',
      kw3: '',
      thought: ''
    };
    this.postData = {
      newField: '',
      difference: '',
      nextQuestion: ''
    };
  }

  init() {
    this.loadFromStorage();
    this.bindInputs();
    this.renderSummary();
  }

  loadFromStorage() {
    const pre = localStorage.getItem('cs_pre_reflection');
    if (pre) {
      try { this.preData = JSON.parse(pre); } catch (e) {}
    }
    const post = localStorage.getItem('cs_post_reflection');
    if (post) {
      try { this.postData = JSON.parse(post); } catch (e) {}
    }
  }

  save() {
    localStorage.setItem('cs_pre_reflection', JSON.stringify(this.preData));
    localStorage.setItem('cs_post_reflection', JSON.stringify(this.postData));
    this.renderSummary();
  }

  escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  bindInputs() {
    // 수업 전 필드
    const p1 = document.getElementById('pre-kw1');
    const p2 = document.getElementById('pre-kw2');
    const p3 = document.getElementById('pre-kw3');
    const pTh = document.getElementById('pre-thought');

    if (p1) { p1.value = this.preData.kw1; p1.oninput = (e) => { this.preData.kw1 = e.target.value; this.save(); }; }
    if (p2) { p2.value = this.preData.kw2; p2.oninput = (e) => { this.preData.kw2 = e.target.value; this.save(); }; }
    if (p3) { p3.value = this.preData.kw3; p3.oninput = (e) => { this.preData.kw3 = e.target.value; this.save(); }; }
    if (pTh) { pTh.value = this.preData.thought; pTh.oninput = (e) => { this.preData.thought = e.target.value; this.save(); }; }

    // 수업 후 필드
    const postF = document.getElementById('post-field');
    const postD = document.getElementById('post-diff');
    const postQ = document.getElementById('post-q');

    if (postF) { postF.value = this.postData.newField; postF.oninput = (e) => { this.postData.newField = e.target.value; this.save(); }; }
    if (postD) { postD.value = this.postData.difference; postD.oninput = (e) => { this.postData.difference = e.target.value; this.save(); }; }
    if (postQ) { postQ.value = this.postData.nextQuestion; postQ.oninput = (e) => { this.postData.nextQuestion = e.target.value; this.save(); }; }
  }

  renderSummary() {
    const summaryContainer = document.getElementById('reflection-compare-view');
    if (!summaryContainer) return;

    const keywords = [this.preData.kw1, this.preData.kw2, this.preData.kw3];
    const hasKeywords = keywords.some(value => String(value || '').trim());
    const initialThought = String(this.preData.thought || '').trim();

    summaryContainer.innerHTML = `
      <div class="reflection-before-content">
        <h4>컴퓨터공학에서 떠올린 것</h4>
        <div class="keyword-tags">
          ${hasKeywords
            ? keywords.filter(value => String(value || '').trim()).map(value => `<span class="kw-tag">${this.escapeHtml(value)}</span>`).join('')
            : '<span class="reflection-empty">처음 화면에 작성한 키워드가 없습니다.</span>'}
        </div>
        <h4>컴퓨터공학자가 해결한다고 생각한 문제</h4>
        <p class="quote-box">${initialThought ? this.escapeHtml(initialThought) : '처음 화면에 작성한 문장이 없습니다.'}</p>
      </div>
    `;

    const progress = document.getElementById('reflection-post-progress');
    if (progress) {
      const completed = [this.postData.newField, this.postData.difference, this.postData.nextQuestion]
        .filter(value => String(value || '').trim()).length;
      progress.textContent = completed === 3
        ? '세 가지 생각을 모두 남겼습니다.'
        : `세 가지 중 ${completed}가지를 작성했습니다.`;
    }
  }
}

window.ReflectionManager = ReflectionManager;

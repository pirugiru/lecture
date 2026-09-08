/** 학습 변화와 수업 피드백을 분리해 Google Sheets로 전송 */
class SurveyManager {
  constructor(reflectionManager) {
    this.reflectionManager = reflectionManager;
    this.config = window.CS_SURVEY_CONFIG || {};
    this.answers = this.loadJson('cs_survey_answers', {});
    this.respondentId = localStorage.getItem('cs_survey_respondent_id') || this.createRespondentId();
    localStorage.setItem('cs_survey_respondent_id', this.respondentId);
  }
  createRespondentId() {
    const random = globalThis.crypto?.getRandomValues
      ? [...crypto.getRandomValues(new Uint8Array(5))].map(n => n.toString(36)).join('').slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    return `S-${random.toUpperCase()}`;
  }
  loadJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch (_) { return fallback; }
  }
  init() { this.renderPre(); this.renderPost(); this.bindInputs(); }
  scaleQuestion(phase, key, text, low, high) {
    const name = `${phase}_${key}`;
    return `<div class="survey-question" data-required="true" role="group" aria-labelledby="${name}-label">
      <p id="${name}-label">${text}</p>
      <div class="survey-scale-labels"><span>${low}</span><span>${high}</span></div>
      <div class="survey-scale">${[1,2,3,4,5].map(value => `<label><input type="radio" name="${name}" value="${value}" data-survey-field="${name}" ${String(this.answers[name]) === String(value) ? 'checked' : ''}><span>${value}</span></label>`).join('')}</div>
    </div>`;
  }
  selectField(key, label, options) {
    return `<label class="survey-field"><span>${label} <b>*</b></span><select class="form-input" data-survey-field="${key}" data-required="true">
      <option value="">선택하세요</option>${options.map(option => `<option value="${option}">${option}</option>`).join('')}
    </select></label>`;
  }
  renderHeader(title, description) {
    return `<div class="survey-heading"><div><h3>${title}</h3><p>${description}</p></div></div>`;
  }
  renderPre() {
    const root = document.getElementById('survey-pre');
    if (!root) return;
    root.innerHTML = `${this.renderHeader('수업 전 확인', '현재 상태와 가장 가까운 번호를 선택하세요.')}
      <div class="survey-question-grid">
        ${this.scaleQuestion('pre','fields','컴퓨터공학의 여러 분야를 알고 있는 정도','거의 모른다','여러 분야를 설명할 수 있다')}
        ${this.scaleQuestion('pre','systems','컴퓨터가 여러 작업을 처리하는 원리를 알고 있는 정도','거의 모른다','다른 사람에게 설명할 수 있다')}
        ${this.scaleQuestion('pre','interest','컴퓨터공학에 대한 현재 관심 정도','관심이 없다','매우 관심이 있다')}
      </div>
      <div class="survey-submit-row"><span id="survey-pre-status" class="survey-status" aria-live="polite"></span><button type="button" id="survey-pre-submit" class="btn-primary">수업 전 응답 제출</button></div>`;
  }
  renderPost() {
    const root = document.getElementById('survey-post');
    if (!root) return;
    root.innerHTML = `${this.renderHeader('수업 후 확인', '수업 전과 같은 기준으로 현재 상태를 표시하세요.')}
      <div class="survey-question-grid">
        ${this.scaleQuestion('post','fields','컴퓨터공학의 여러 분야를 알고 있는 정도','거의 모른다','여러 분야를 설명할 수 있다')}
        ${this.scaleQuestion('post','systems','컴퓨터가 여러 작업을 처리하는 원리를 알고 있는 정도','거의 모른다','다른 사람에게 설명할 수 있다')}
        ${this.scaleQuestion('post','interest','컴퓨터공학에 대한 현재 관심 정도','관심이 없다','매우 관심이 있다')}
      </div>
      <h4 class="survey-subtitle">수업 구성 평가</h4>
      <div class="survey-select-grid">
        ${this.selectField('post_pace','수업 속도',['매우 느렸다','조금 느렸다','적당했다','조금 빨랐다','매우 빨랐다'])}
        ${this.selectField('post_difficulty','내용 난이도',['매우 쉬웠다','조금 쉬웠다','적당했다','조금 어려웠다','매우 어려웠다'])}
        ${this.selectField('post_amount','내용의 양',['매우 적었다','조금 적었다','적당했다','조금 많았다','매우 많았다'])}
        ${this.selectField('post_depth','내용의 깊이',['핵심만 더 쉽게 다루면 좋겠다','지금 정도가 좋다','원리와 사례를 더 깊게 다루면 좋겠다'])}
        ${this.selectField('post_balance','설명과 활동의 비율',['설명이 더 많으면 좋겠다','지금 정도가 좋다','활동이 더 많으면 좋겠다'])}
        ${this.selectField('post_follow','수업 내용을 따라간 정도',['거의 따라가기 어려웠다','놓친 부분이 많았다','절반 정도 따라갔다','대부분 따라갔다','전체 흐름을 따라갔다'])}
        ${this.selectField('post_helpful_part','가장 의미 있었던 부분',['교사의 설명','작업 순서 실험','작업 나누기 실험','공유 자원 실험','서비스와 분야 연결','친구와 이야기한 시간'])}
        ${this.selectField('post_less_useful_part','줄이거나 빼도 된다고 느낀 부분',['없음','교사의 설명','작업 순서 실험','작업 나누기 실험','공유 자원 실험','서비스와 분야 연결','친구와 이야기한 시간'])}
      </div>
      <div class="survey-open-grid">
        <label class="survey-field"><span>일주일 뒤에도 기억에 남을 것</span><textarea class="form-input" rows="3" data-survey-field="post_memorable" placeholder="내용, 활동, 질문 중 무엇이든 적어 주세요."></textarea></label>
        <label class="survey-field"><span>한 가지만 바꾼다면</span><textarea class="form-input" rows="3" data-survey-field="post_improve" placeholder="없다면 비워 두어도 됩니다."></textarea></label>
        <label class="survey-field survey-field-wide"><span>더 듣고 싶었던 내용</span><textarea class="form-input" rows="3" data-survey-field="post_more" placeholder="더 깊게 알고 싶은 내용이 있다면 적어 주세요."></textarea></label>
      </div>
      <div class="survey-submit-row"><span id="survey-post-status" class="survey-status" aria-live="polite"></span><button type="button" id="survey-post-submit" class="btn-primary">수업 후 응답 제출</button></div>`;
  }
  bindInputs() {
    document.querySelectorAll('[data-survey-field]').forEach(input => {
      const key = input.dataset.surveyField;
      if (input.type !== 'radio' && this.answers[key] != null) input.value = this.answers[key];
      input.addEventListener('input', event => {
        if (event.target.type === 'radio' && !event.target.checked) return;
        this.answers[key] = event.target.value;
        localStorage.setItem('cs_survey_answers', JSON.stringify(this.answers));
      });
    });
    document.getElementById('survey-pre-submit')?.addEventListener('click', () => this.submit('pre'));
    document.getElementById('survey-post-submit')?.addEventListener('click', () => this.submit('post'));
  }
  validate(phase) {
    const root = document.getElementById(`survey-${phase}`);
    const missing = [...root.querySelectorAll('[data-required="true"]')].filter(group => {
      if (group.querySelector('input[type="radio"]')) return !group.querySelector('input:checked');
      return !String(group.value || '').trim();
    });
    missing.forEach(item => item.classList.add('survey-missing'));
    setTimeout(() => missing.forEach(item => item.classList.remove('survey-missing')), 1800);
    return missing.length === 0;
  }
  buildPayload(phase) {
    const reflection = phase === 'pre' ? this.reflectionManager.preData : this.reflectionManager.postData;
    const phaseAnswers = Object.fromEntries(Object.entries(this.answers).filter(([key]) => key.startsWith(`${phase}_`)));
    return { schema_version: this.config.schemaVersion || 2, lecture_code: this.config.lectureCode || 'GOJAN-CS-2026-09-08', respondent_id: this.respondentId, phase, submitted_at: new Date().toISOString(), seed: localStorage.getItem('cs_current_seed') || 'CS-DEMO-01', ...reflection, ...phaseAnswers };
  }
  async submit(phase) {
    const status = document.getElementById(`survey-${phase}-status`);
    const button = document.getElementById(`survey-${phase}-submit`);
    if (!this.validate(phase)) { status.textContent = '표시된 필수 문항을 작성해 주세요.'; status.className = 'survey-status error'; return; }
    const endpoint = String(this.config.endpointUrl || '').trim();
    if (!endpoint) { status.textContent = '제출 주소가 설정되지 않았습니다. 답변은 이 브라우저에 저장되어 있습니다.'; status.className = 'survey-status error'; return; }
    button.disabled = true;
    status.textContent = '응답을 보내는 중입니다…';
    status.className = 'survey-status';
    try {
      const body = new URLSearchParams({ payload: JSON.stringify(this.buildPayload(phase)) });
      await fetch(endpoint, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body });
      localStorage.setItem(`cs_survey_submitted_${phase}`, new Date().toISOString());
      status.textContent = '응답을 제출했습니다. 감사합니다.';
      status.className = 'survey-status success';
      button.textContent = '제출 완료';
    } catch (_) {
      status.textContent = '전송하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.';
      status.className = 'survey-status error';
      button.disabled = false;
    }
  }
}
window.SurveyManager = SurveyManager;

/**
 * module3_shared_resource.js - 공유 값과 사용 중 표시 교육용 시뮬레이션
 */

class SharedResourceLab {
  constructor() {
    this.mode = 'unlocked';
    this.stepIndex = 0;
    this.timer = null;
    this.prediction = localStorage.getItem('cs_mod3_prediction') || '';
    this.reflection = localStorage.getItem('cs_mod3_reflection') || '';
  }

  init() {
    this.setupEvents();
    this.render();
  }

  getScenario() {
    if (this.mode === 'locked') {
      return [
        { worker: 'A', kind: 'read', message: 'A가 사용 중 표시를 켜고 10점을 읽습니다.' },
        { worker: 'B', kind: 'wait', message: 'B는 A가 끝날 때까지 기다립니다.' },
        { worker: 'A', kind: 'calculate', message: 'A가 10 + 1을 계산해 11을 준비합니다.' },
        { worker: 'A', kind: 'write', message: 'A가 11점을 저장하고 사용 중 표시를 끕니다.' },
        { worker: 'B', kind: 'read', message: 'B가 사용 중 표시를 켜고 새 값 11을 읽습니다.' },
        { worker: 'B', kind: 'calculate', message: 'B가 11 + 1을 계산해 12를 준비합니다.' },
        { worker: 'B', kind: 'write', message: 'B가 12점을 저장하고 사용 중 표시를 끕니다.' }
      ];
    }

    return [
      { worker: 'A', kind: 'read', message: 'A가 현재 점수 10을 읽습니다.' },
      { worker: 'B', kind: 'read', message: 'B도 같은 점수 10을 읽습니다.' },
      { worker: 'A', kind: 'calculate', message: 'A가 10 + 1을 계산해 11을 준비합니다.' },
      { worker: 'B', kind: 'calculate', message: 'B도 10 + 1을 계산해 11을 준비합니다.' },
      { worker: 'A', kind: 'write', message: 'A가 계산한 11을 공동 점수에 저장합니다.' },
      { worker: 'B', kind: 'write', message: 'B도 11을 저장해 A의 결과를 덮어씁니다.' }
    ];
  }

  getTimelineRows() {
    if (this.mode === 'locked') {
      return [
        {
          worker: 'A',
          cells: [
            { label: '읽기 10', note: '🔒 잠금', kind: 'read locked' },
            { label: '잠금 유지', note: 'B 대기 중', kind: 'locked' },
            { label: '계산 11', note: '🔒 잠금', kind: 'calculate locked' },
            { label: '쓰기 11', note: '🔓 해제', kind: 'write' },
            { label: '완료', note: '', kind: 'done' },
            { label: '완료', note: '', kind: 'done' },
            { label: '완료', note: '', kind: 'done' }
          ]
        },
        {
          worker: 'B',
          cells: [
            { label: '준비', note: '', kind: 'idle' },
            { label: '대기', note: 'A가 사용 중', kind: 'wait' },
            { label: '대기', note: 'A가 사용 중', kind: 'wait' },
            { label: '대기', note: '잠금 해제까지', kind: 'wait' },
            { label: '읽기 11', note: '🔒 잠금', kind: 'read locked' },
            { label: '계산 12', note: '🔒 잠금', kind: 'calculate locked' },
            { label: '쓰기 12', note: '🔓 해제', kind: 'write' }
          ]
        }
      ];
    }

    return [
      {
        worker: 'A',
        cells: [
          { label: '읽기 10', note: '', kind: 'read' },
          { label: '—', note: '', kind: 'idle' },
          { label: '계산 11', note: '', kind: 'calculate' },
          { label: '—', note: '', kind: 'idle' },
          { label: '쓰기 11', note: '', kind: 'write' },
          { label: '완료', note: '', kind: 'done' }
        ]
      },
      {
        worker: 'B',
        cells: [
          { label: '—', note: '', kind: 'idle' },
          { label: '읽기 10', note: '', kind: 'read' },
          { label: '—', note: '', kind: 'idle' },
          { label: '계산 11', note: '', kind: 'calculate' },
          { label: '—', note: '', kind: 'idle' },
          { label: '쓰기 11', note: '', kind: 'write' }
        ]
      }
    ];
  }

  getState() {
    const state = {
      shared: 10,
      lockOwner: null,
      waitCount: 0,
      workers: {
        A: { read: null, calculated: null, written: false, status: '준비' },
        B: { read: null, calculated: null, written: false, status: '준비' }
      }
    };

    const events = this.getScenario();
    events.slice(0, this.stepIndex).forEach((event) => {
      const worker = state.workers[event.worker];

      if (this.mode === 'locked' && event.kind === 'read') state.lockOwner = event.worker;

      if (event.kind === 'read') {
        worker.read = state.shared;
        worker.status = `${state.shared} 읽음`;
      } else if (event.kind === 'calculate') {
        worker.calculated = worker.read + 1;
        worker.status = `${worker.read} + 1 계산`;
      } else if (event.kind === 'write') {
        state.shared = worker.calculated;
        worker.written = true;
        worker.status = `${worker.calculated} 저장 완료`;
        if (this.mode === 'locked') state.lockOwner = null;
      } else if (event.kind === 'wait') {
        worker.status = '기다리는 중';
        state.waitCount += 1;
      }
    });

    return state;
  }

  setupEvents() {
    document.querySelectorAll('.mod3-prediction-btn').forEach((button) => {
      button.onclick = () => {
        this.prediction = button.dataset.value;
        localStorage.setItem('cs_mod3_prediction', this.prediction);
        this.renderPrediction();
      };
    });

    document.querySelectorAll('.mod3-mode-btn').forEach((button) => {
      button.onclick = () => this.setMode(button.dataset.mode);
    });

    document.getElementById('mod3-step-btn')?.addEventListener('click', () => this.step());
    document.getElementById('mod3-auto-btn')?.addEventListener('click', () => this.startAuto());
    document.getElementById('mod3-pause-btn')?.addEventListener('click', () => this.pause());
    document.getElementById('mod3-reset-btn')?.addEventListener('click', () => this.reset());

    const reflectionInput = document.getElementById('mod3-reflection-input');
    if (reflectionInput) {
      reflectionInput.value = this.reflection;
      reflectionInput.oninput = (event) => {
        this.reflection = event.target.value;
        localStorage.setItem('cs_mod3_reflection', this.reflection);
      };
    }
  }

  setMode(mode) {
    this.pause();
    this.mode = mode;
    this.stepIndex = 0;
    document.querySelectorAll('.mod3-mode-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
    this.render();
  }

  step() {
    const total = this.getScenario().length;
    if (this.stepIndex < total) {
      this.stepIndex += 1;
      this.render();
    }
    if (this.stepIndex >= total) this.pause();
  }

  startAuto() {
    if (this.stepIndex >= this.getScenario().length || this.timer) return;
    this.setRunningButtons(true);
    this.timer = window.setInterval(() => this.step(), 850);
  }

  pause() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.setRunningButtons(false);
  }

  reset() {
    this.pause();
    this.stepIndex = 0;
    this.render();
  }

  setRunningButtons(isRunning) {
    const stepButton = document.getElementById('mod3-step-btn');
    const autoButton = document.getElementById('mod3-auto-btn');
    const pauseButton = document.getElementById('mod3-pause-btn');
    const complete = this.stepIndex >= this.getScenario().length;
    if (stepButton) stepButton.disabled = isRunning || complete;
    if (autoButton) autoButton.disabled = isRunning || complete;
    if (pauseButton) pauseButton.disabled = !isRunning;
  }

  renderPrediction() {
    document.querySelectorAll('.mod3-prediction-btn').forEach((button) => {
      const selected = button.dataset.value === this.prediction;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  renderWorker(id, data, currentEvent) {
    const isCurrent = currentEvent?.worker === id;
    const panel = document.getElementById(`mod3-worker-${id.toLowerCase()}`);
    if (!panel) return;

    panel.classList.toggle('current', isCurrent);
    panel.classList.toggle('waiting', data.status === '기다리는 중');
    panel.innerHTML = `
      <div class="mod3-worker-title">
        <span class="mod3-worker-avatar">${id === 'A' ? '🧑‍💻' : '👩‍💻'}</span>
        <div><strong>작업자 ${id}</strong><span>${data.status}</span></div>
      </div>
      <div class="mod3-worker-values">
        <div><span>읽은 값</span><strong>${data.read ?? '—'}</strong></div>
        <div><span>저장할 값</span><strong>${data.calculated ?? '—'}</strong></div>
      </div>
      <div class="mod3-mini-steps" aria-label="작업자 ${id}의 진행 단계">
        <span class="${data.read !== null ? 'done' : ''}">읽기</span>
        <span class="${data.calculated !== null ? 'done' : ''}">계산</span>
        <span class="${data.written ? 'done' : ''}">저장</span>
      </div>
    `;
  }

  render() {
    const events = this.getScenario();
    const state = this.getState();
    const currentEvent = this.stepIndex > 0 ? events[this.stepIndex - 1] : null;
    const complete = this.stepIndex >= events.length;

    this.renderPrediction();
    this.renderWorker('A', state.workers.A, currentEvent);
    this.renderWorker('B', state.workers.B, currentEvent);

    const value = document.getElementById('mod3-shared-value');
    if (value) value.textContent = state.shared;

    const lockState = document.getElementById('mod3-lock-state');
    if (lockState) {
      lockState.className = `mod3-lock-state ${state.lockOwner ? 'locked' : ''}`;
      lockState.textContent = this.mode === 'unlocked'
        ? '🔓 사용 중 표시 없음'
        : state.lockOwner
          ? `🔒 작업자 ${state.lockOwner}가 사용 중`
          : '🔓 지금은 사용 가능';
    }

    const message = document.getElementById('mod3-mode-message');
    if (message) {
      message.innerHTML = this.mode === 'unlocked'
        ? '<strong>규칙 없음:</strong> A와 B가 같은 값을 동시에 읽을 수 있습니다.'
        : '<strong>사용 중 표시:</strong> 한 작업자가 읽기·계산·저장을 마칠 때까지 다른 작업자는 기다립니다.';
    }

    const counter = document.getElementById('mod3-step-counter');
    if (counter) counter.textContent = `${this.stepIndex} / ${events.length}단계`;

    const table = document.getElementById('mod3-timeline-table');
    if (table) {
      const rows = this.getTimelineRows();
      table.innerHTML = `
        <thead><tr><th scope="col">작업자</th>${events.map((_, index) => `<th scope="col">${index + 1}단계</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `
          <tr>
            <th scope="row">${row.worker === 'A' ? '🧑‍💻' : '👩‍💻'} 작업자 ${row.worker}</th>
            ${row.cells.map((cell, index) => {
              const progress = this.stepIndex === 0 || index >= this.stepIndex
                ? 'future'
                : index === this.stepIndex - 1 ? 'current' : 'past';
              return `<td class="${cell.kind} ${progress}"><strong>${cell.label}</strong>${cell.note ? `<span>${cell.note}</span>` : ''}</td>`;
            }).join('')}
          </tr>
        `).join('')}</tbody>
      `;
    }

    const currentAction = document.getElementById('mod3-current-action');
    if (currentAction) {
      currentAction.textContent = currentEvent
        ? `${this.stepIndex}단계 · ${currentEvent.message}`
        : '한 단계 실행을 누르면 시간표가 진행됩니다.';
    }

    const resultBox = document.getElementById('mod3-result-box');
    if (resultBox) {
      resultBox.classList.toggle('hidden', !complete);
      if (complete) {
        resultBox.className = `mod3-result-box ${this.mode === 'locked' ? 'success' : 'warning'}`;
        resultBox.innerHTML = this.mode === 'locked'
          ? `<strong>결과: ${state.shared}점 ✓</strong><span>B가 기다렸지만 두 번의 더하기가 모두 반영되었습니다.</span>`
          : `<strong>결과: ${state.shared}점</strong><span>두 번 더했지만 두 작업자가 같은 10을 읽어 한 번의 결과가 사라졌습니다. 이제 사용 중 표시를 켜고 비교해 보세요.</span>`;
      }
    }

    const conceptDetails = document.getElementById('mod3-concept-details');
    if (conceptDetails && complete) conceptDetails.classList.remove('hidden');

    const stepButton = document.getElementById('mod3-step-btn');
    const autoButton = document.getElementById('mod3-auto-btn');
    if (stepButton) stepButton.disabled = complete || Boolean(this.timer);
    if (autoButton) autoButton.disabled = complete || Boolean(this.timer);
  }
}

window.SharedResourceLab = SharedResourceLab;

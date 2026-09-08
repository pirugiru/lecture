/**
 * teacher_mode.js - 강사용 활동 설정, 대형 타이머, 시드 관리 및 데이터 초기화
 */

class TeacherMode {
  constructor() {
    this.timerSeconds = 300;
    this.timerInitial = 300;
    this.timerInterval = null;
    this.isTimerRunning = false;
  }

  init() {
    this.setupEvents();
    this.renderTimer();
  }

  setupEvents() {
    const btnOpenTeacher = document.getElementById('btn-open-teacher-modal');
    const modal = document.getElementById('teacher-modal');
    const btnClose = document.getElementById('btn-close-teacher-modal');

    if (btnOpenTeacher && modal) {
      btnOpenTeacher.onclick = () => {
        const seedInput = document.getElementById('teacher-seed-input');
        if (seedInput && window.CS_APP) seedInput.value = window.CS_APP.seed;
        modal.classList.remove('hidden');
        btnClose?.focus();
      };
    }
    if (btnClose && modal) {
      btnClose.onclick = () => {
        modal.classList.add('hidden');
      };
    }
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.add('hidden');
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        btnOpenTeacher?.focus();
      }
    });

    // 타이머 컨트롤
    document.querySelectorAll('.btn-timer-preset').forEach(btn => {
      btn.onclick = () => {
        const mins = parseInt(btn.dataset.mins, 10);
        this.setTimerMinutes(mins);
      };
    });

    const btnStart = document.getElementById('teacher-timer-start');
    const btnPause = document.getElementById('teacher-timer-pause');
    const btnReset = document.getElementById('teacher-timer-reset');
    const btnApplyTimer = document.getElementById('teacher-timer-apply');
    const timerMinutes = document.getElementById('teacher-timer-minutes');

    if (btnStart) btnStart.onclick = () => this.startTimer();
    if (btnPause) btnPause.onclick = () => this.pauseTimer();
    if (btnReset) btnReset.onclick = () => this.resetTimer();
    if (btnApplyTimer && timerMinutes) {
      btnApplyTimer.onclick = () => {
        const mins = Math.min(99, Math.max(1, parseInt(timerMinutes.value, 10) || 5));
        timerMinutes.value = mins;
        this.setTimerMinutes(mins);
      };
    }

    // 시드 생성 및 적용
    const btnGenSeed = document.getElementById('teacher-btn-gen-seed');
    const btnApplySeed = document.getElementById('teacher-btn-apply-seed');
    const seedInput = document.getElementById('teacher-seed-input');

    if (btnGenSeed && seedInput) {
      btnGenSeed.onclick = () => {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const digits = '23456789';
        const randL = () => letters[Math.floor(Math.random() * letters.length)];
        const randD = () => digits[Math.floor(Math.random() * digits.length)];
        const newSeed = `CS-${randL()}${randL()}-${randD()}${randD()}`;
        seedInput.value = newSeed;
      };
    }

    if (btnApplySeed && seedInput) {
      btnApplySeed.onclick = () => {
        const seedVal = seedInput.value.trim().toUpperCase() || 'CS-DEFAULT';
        window.CS_APP.applySeed(seedVal);
        this.showStatus(`문제 번호 ${seedVal}을 적용했습니다.`);
      };
    }

    const btnResetCurrent = document.getElementById('teacher-btn-reset-current');
    if (btnResetCurrent) {
      btnResetCurrent.onclick = () => this.resetCurrentActivity();
    }

    // 데이터 초기화
    const btnResetAll = document.getElementById('teacher-btn-reset-all');
    if (btnResetAll) {
      btnResetAll.onclick = () => {
        if (confirm('이 브라우저에 저장된 이번 수업의 모든 답과 진행 상태를 지울까요?')) {
          Object.keys(localStorage)
            .filter(key => key.startsWith('cs_'))
            .forEach(key => localStorage.removeItem(key));
          location.reload();
        }
      };
    }

    // 빠른 화면 이동
    document.querySelectorAll('.btn-quick-nav').forEach(btn => {
      btn.onclick = () => {
        const targetView = btn.dataset.target;
        window.CS_APP.navigate(targetView);
        if (modal) modal.classList.add('hidden');
      };
    });
  }

  setTimerMinutes(mins) {
    this.pauseTimer();
    this.timerInitial = mins * 60;
    this.timerSeconds = this.timerInitial;
    this.renderTimer();
  }

  showStatus(message) {
    const status = document.getElementById('teacher-action-status');
    if (status) status.textContent = message;
  }

  resetCurrentActivity() {
    const currentView = window.CS_APP?.currentView || 'pre';
    const keysByView = {
      pre: ['cs_pre_reflection'],
      mod1: ['cs_team_criteria', 'cs_team_discussion', 'cs_mod1_reason', 'cs_mod1_order'],
      mod2: ['cs_mod2_prediction', 'cs_mod2_reflection'],
      mod3: ['cs_mod3_prediction', 'cs_mod3_reflection'],
      post: ['cs_post_reflection']
    };
    const labelByView = {
      pre: '첫 생각', mod1: '작업 순서', mod2: '작업 나누기',
      mod3: '공유 자원', mod4: '분야 연결', post: '생각 비교'
    };
    const label = labelByView[currentView] || '현재 활동';
    if (!confirm(`${label}에서 작성한 답과 진행 상태를 지울까요?`)) return;

    if (currentView === 'mod4') {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cs_mod4_'))
        .forEach(key => localStorage.removeItem(key));
    } else {
      (keysByView[currentView] || []).forEach(key => localStorage.removeItem(key));
    }
    if (currentView === 'pre' || currentView === 'post') {
      try {
        const answers = JSON.parse(localStorage.getItem('cs_survey_answers') || '{}');
        Object.keys(answers).filter(key => key.startsWith(`${currentView}_`)).forEach(key => delete answers[key]);
        localStorage.setItem('cs_survey_answers', JSON.stringify(answers));
      } catch (_) {
        localStorage.removeItem('cs_survey_answers');
      }
      localStorage.removeItem(`cs_survey_submitted_${currentView}`);
    }
    location.reload();
  }

  startTimer() {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.renderTimer();
    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.renderTimer();
      } else {
        this.pauseTimer();
        this.onTimerComplete();
      }
    }, 1000);
  }

  pauseTimer() {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.renderTimer();
  }

  resetTimer() {
    this.pauseTimer();
    this.timerSeconds = this.timerInitial;
    this.renderTimer();
  }

  onTimerComplete() {
    const timerDisplay = document.getElementById('teacher-timer-display');
    if (timerDisplay) {
      timerDisplay.classList.add('timer-finished-pulse');
      setTimeout(() => timerDisplay.classList.remove('timer-finished-pulse'), 3000);
    }
  }

  renderTimer() {
    const timerDisplay = document.getElementById('teacher-timer-display');
    if (!timerDisplay) return;
    const m = Math.floor(this.timerSeconds / 60);
    const s = this.timerSeconds % 60;
    timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const startButton = document.getElementById('teacher-timer-start');
    const pauseButton = document.getElementById('teacher-timer-pause');
    if (startButton) startButton.disabled = this.isTimerRunning || this.timerSeconds === 0;
    if (pauseButton) pauseButton.disabled = !this.isTimerRunning;
  }
}

window.TeacherMode = TeacherMode;

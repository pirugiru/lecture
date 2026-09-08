/**
 * module1_scheduling.js - 1920x1080 원스크린 핏 스케줄러 (빨간선 단일정렬, 전역 오버헤드, 인라인 타임퀀텀)
 */

class SchedulingLab {
  constructor() {
    this.tasks = [];
    this.currentOrder = []; // task IDs
    this.reason = '';
    this.activeMode = 'our'; // 'our', 'fcfs', 'rr', 'sjf'
    
    // 라운드로빈 전용 타임 퀀텀 (q)
    this.slotSize = 2; // 1, 2, 3, 4, 6

    // 전역 문맥 교환 오버헤드 (모든 알고리즘에 독립 적용: 0s, 0.1s, 0.2s)
    this.overheadSec = 0;

    // 팀 토론 데이터
    this.teamCriteria = localStorage.getItem('cs_team_criteria') || 'response';
    this.teamDiscussion = localStorage.getItem('cs_team_discussion') || '';

    // 시뮬레이션 타임라인
    this.currentTime = 0;
    this.maxTime = 20;
    this.history = [];
    this.allModes = {};

    // 재생
    this.isPlaying = false;
    this.timer = null;
    this.autoSpeedMs = 300;
    this.soundEnabled = true;
    this.audioCtx = null;
  }

  init(initialTasks) {
    this.tasks = JSON.parse(JSON.stringify(initialTasks));
    this.currentOrder = this.tasks.map(t => t.id);
    try {
      const savedOrder = JSON.parse(localStorage.getItem('cs_mod1_order') || '[]');
      const validIds = new Set(this.currentOrder);
      if (savedOrder.length === this.currentOrder.length && savedOrder.every(id => validIds.has(id))) {
        this.currentOrder = savedOrder;
      }
    } catch (_) {}
    this.reason = localStorage.getItem('cs_mod1_reason') || '';

    this.setupAudio();
    this.setupEvents();
    this.recalculateAllModes();

    // 학생이 먼저 순서를 정할 수 있도록 편집 영역을 설명 바로 아래로 이동한다.
    const banner = document.getElementById('sched-mode-desc-banner');
    const orderEditor = document.getElementById('sched-order-editor-box');
    if (banner && orderEditor) banner.insertAdjacentElement('afterend', orderEditor);

    this.selectMode('our');
  }

  setTasks(newTasks) {
    this.tasks = JSON.parse(JSON.stringify(newTasks));
    this.currentOrder = this.tasks.map(t => t.id);
    this.pause();
    this.recalculateAllModes();
    this.selectMode(this.activeMode);
  }

  setupAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    } catch (e) {}
  }

  beep(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.05) {
    if (!this.soundEnabled || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  playPop() { this.beep(520, 'sine', 0.05, 0.07); }
  playSwitch() {
    this.beep(280, 'sine', 0.08, 0.06);
    setTimeout(() => this.beep(420, 'sine', 0.1, 0.06), 50);
  }
  playDone() {
    this.beep(523.25, 'triangle', 0.12, 0.08);
    setTimeout(() => this.beep(659.25, 'triangle', 0.15, 0.08), 60);
    setTimeout(() => this.beep(783.99, 'triangle', 0.25, 0.09), 120);
  }

  // --- 이벤트 설정 ---
  setupEvents() {
    // 4개 모드 탭
    document.querySelectorAll('.sched-mode-tab').forEach(btn => {
      btn.onclick = () => {
        this.selectMode(btn.dataset.mode);
      };
    });

    // 전역 문맥 교환 오버헤드 토글 (모든 알고리즘 공통 적용!)
    const btnOverhead = document.getElementById('sched-btn-overhead-toggle');
    if (btnOverhead) {
      btnOverhead.onclick = () => {
        if (this.overheadSec === 0) this.overheadSec = 0.1;
        else if (this.overheadSec === 0.1) this.overheadSec = 0.2;
        else this.overheadSec = 0;

        btnOverhead.classList.toggle('active', this.overheadSec > 0);
        if (this.overheadSec > 0) {
          btnOverhead.innerHTML = `⚡ 문맥 교환: <b>+${this.overheadSec}s</b>`;
        } else {
          btnOverhead.innerHTML = `⚡ 문맥 교환: <b>없음 (0s)</b>`;
        }
        this.pause();
        this.recalculateAllModes();
        this.selectMode(this.activeMode);
      };
    }

    // 스텝 및 재생 제어
    const btnNext = document.getElementById('sched-btn-next');
    const btnPrev = document.getElementById('sched-btn-prev');
    const btnPlay = document.getElementById('sched-btn-play');
    const btnPause = document.getElementById('sched-btn-pause');
    const btnReset = document.getElementById('sched-btn-reset');
    const btnFastFinish = document.getElementById('sched-btn-fast-finish');
    const btnToggleExtra = document.getElementById('sched-btn-toggle-extra');
    const speedSelect = document.getElementById('sched-speed-select');
    const soundToggle = document.getElementById('sched-sound-toggle');

    if (btnNext) btnNext.onclick = () => this.stepForward();
    if (btnPrev) btnPrev.onclick = () => this.stepBackward();
    if (btnPlay) btnPlay.onclick = () => this.play();
    if (btnPause) btnPause.onclick = () => this.pause();
    if (btnReset) btnReset.onclick = () => this.resetSimulation();
    if (btnFastFinish) btnFastFinish.onclick = () => this.skipToEnd();
    if (btnToggleExtra) {
      btnToggleExtra.onclick = () => {
        const section = document.getElementById('section-mod1');
        const isOpen = section?.classList.toggle('show-extra-controls') || false;
        btnToggleExtra.setAttribute('aria-expanded', String(isOpen));
        btnToggleExtra.textContent = isOpen ? '⚙ 추가 조작 닫기' : '⚙ 추가 조작';
      };
    }

    if (speedSelect) {
      speedSelect.onchange = (e) => {
        this.autoSpeedMs = parseInt(e.target.value, 10);
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      };
    }

    if (soundToggle) {
      soundToggle.onclick = () => {
        this.soundEnabled = !this.soundEnabled;
        soundToggle.classList.toggle('active', this.soundEnabled);
        soundToggle.textContent = this.soundEnabled ? '🔊 효과음' : '🔇 음소거';
      };
    }

    // 팀 토론 기준 칩
    document.querySelectorAll('.btn-criteria-chip').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.btn-criteria-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.teamCriteria = btn.dataset.criteria;
        localStorage.setItem('cs_team_criteria', this.teamCriteria);
      };
    });

    const discInput = document.getElementById('mod1-team-discussion-input');
    if (discInput) {
      discInput.value = this.teamDiscussion;
      discInput.oninput = (e) => {
        this.teamDiscussion = e.target.value;
        localStorage.setItem('cs_team_discussion', this.teamDiscussion);
      };
    }

    const reasonInput = document.getElementById('mod1-reason-input');
    if (reasonInput) {
      reasonInput.value = this.reason;
      reasonInput.oninput = (e) => {
        this.reason = e.target.value;
        localStorage.setItem('cs_mod1_reason', this.reason);
      };
    }

    // 키보드 단축키
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (document.getElementById('section-mod1')?.classList.contains('hidden')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          document.activeElement.blur();
        }
        this.stepForward();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.stepBackward();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        this.isPlaying ? this.pause() : this.play();
      }
    });
  }

  // --- 4개 모드 사전 계산 (전역 오버헤드 지원) ---
  recalculateAllModes() {
    this.allModes = {
      'fcfs': this.simulateMode('fcfs', 2, this.overheadSec),
      'sjf': this.simulateMode('sjf', 2, this.overheadSec),
      'rr': this.simulateMode('rr', this.slotSize, this.overheadSec),
      'our': this.simulateMode('our', 2, this.overheadSec)
    };
  }

  simulateMode(mode, quantum = 2, overhead = 0) {
    const tasks = this.tasks.map(t => ({
      id: t.id,
      label: t.label,
      icon: t.icon,
      color: t.color,
      arrival: t.arrivalTime,
      duration: t.duration,
      remaining: t.duration,
      firstRun: -1,
      finish: -1,
      totalWait: 0
    }));

    const rawGantt = []; // { id, label, color, duration, isSwitch }
    const matrix = {};
    tasks.forEach(t => { matrix[t.id] = []; });
    const frames = [];

    let time = 0;
    let completedCount = 0;
    const maxSafety = 120;
    let currentCpuTask = null;
    let lastExecutedTaskId = null;
    let quantumUsed = 0;
    let queue = [];
    let switchCount = 0;

    while (completedCount < tasks.length && time < maxSafety) {
      // 1. time 시점에 새로 도착한 프로세스 큐에 추가
      const arrivedNow = tasks.filter(t => t.arrival === time && t.remaining > 0);
      arrivedNow.forEach(t => {
        if (!queue.includes(t) && t !== currentCpuTask) {
          queue.push(t);
        }
      });

      // 2. CPU 스케줄러 선택 로직
      let eventNotice = 'tick';

      if (mode === 'rr') {
        if (currentCpuTask && (quantumUsed >= quantum || currentCpuTask.remaining <= 0)) {
          if (currentCpuTask.remaining > 0) {
            queue.push(currentCpuTask); // 큐 뒤로 회송
            eventNotice = 'rr_rotate';
          }
          currentCpuTask = null;
          quantumUsed = 0;
        }

        if (!currentCpuTask && queue.length > 0) {
          const nextTask = queue.shift();
          if (lastExecutedTaskId !== null && lastExecutedTaskId !== nextTask.id) {
            switchCount++;
            if (overhead > 0) {
              rawGantt.push({
                id: 'SWITCH',
                label: `문맥교환 (+${overhead}s)`,
                color: '#ea580c',
                isSwitch: true,
                duration: overhead
              });
            }
          }
          currentCpuTask = nextTask;
          lastExecutedTaskId = currentCpuTask.id;
          quantumUsed = 0;
          if (eventNotice === 'tick') eventNotice = 'cpu_in';
        }
      } else {
        // 비선점 모드 (FCFS, SJF, OUR)
        if (!currentCpuTask || currentCpuTask.remaining <= 0) {
          currentCpuTask = null;
          if (queue.length > 0) {
            if (mode === 'fcfs') {
              queue.sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id));
            } else if (mode === 'sjf') {
              queue.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
            } else if (mode === 'our') {
              queue.sort((a, b) => this.currentOrder.indexOf(a.id) - this.currentOrder.indexOf(b.id));
            }
            const nextTask = queue.shift();
            if (lastExecutedTaskId !== null && lastExecutedTaskId !== nextTask.id) {
              switchCount++;
              if (overhead > 0) {
                rawGantt.push({
                  id: 'SWITCH',
                  label: `문맥교환 (+${overhead}s)`,
                  color: '#ea580c',
                  isSwitch: true,
                  duration: overhead
                });
              }
            }
            currentCpuTask = nextTask;
            lastExecutedTaskId = currentCpuTask.id;
            eventNotice = 'cpu_in';
          }
        }
      }

      // 3. 실행 기록
      if (currentCpuTask && currentCpuTask.firstRun === -1) {
        currentCpuTask.firstRun = time;
      }

      queue.forEach(q => { q.totalWait++; });

      // Gantt 세그먼트 누적
      if (currentCpuTask) {
        const last = rawGantt[rawGantt.length - 1];
        if (last && last.id === currentCpuTask.id && !last.isSwitch) {
          last.duration++;
        } else {
          rawGantt.push({
            id: currentCpuTask.id,
            label: currentCpuTask.label,
            color: currentCpuTask.color,
            isSwitch: false,
            duration: 1
          });
        }
      } else {
        const last = rawGantt[rawGantt.length - 1];
        if (last && last.id === 'IDLE') {
          last.duration++;
        } else {
          rawGantt.push({
            id: 'IDLE',
            label: '대기(IDLE)',
            color: '#cbd5e1',
            isSwitch: false,
            duration: 1
          });
        }
      }

      // 4. 2D 매트릭스 상태 기록
      tasks.forEach(t => {
        if (time < t.arrival) {
          matrix[t.id][time] = 'NOT_ARRIVED';
        } else if (time === t.arrival) {
          if (currentCpuTask && currentCpuTask.id === t.id) {
            matrix[t.id][time] = 'ARRIVED_RUNNING';
          } else {
            matrix[t.id][time] = 'ARRIVED';
          }
        } else if (currentCpuTask && currentCpuTask.id === t.id) {
          matrix[t.id][time] = 'RUNNING';
        } else if (t.finish !== -1 && time === t.finish) {
          matrix[t.id][time] = 'JUST_FINISHED';
        } else if (t.finish !== -1 && time > t.finish) {
          matrix[t.id][time] = 'FINISHED';
        } else {
          matrix[t.id][time] = 'WAITING';
        }
      });

      // 해설 메시지
      let commentary = '';
      if (currentCpuTask) {
        const doneSec = currentCpuTask.duration - currentCpuTask.remaining + 1;
        if (mode === 'rr') {
          commentary = `⚡ <b>${currentCpuTask.id}</b> 실행 중 (${doneSec}/${currentCpuTask.duration}s) | 이번 차례: <b>${quantumUsed+1}/${quantum}s</b>`;
        } else {
          commentary = `⚙️ <b>${currentCpuTask.id}</b> 집중 실행 중 (${doneSec}/${currentCpuTask.duration}s)`;
        }
      } else {
        commentary = `☕ CPU가 쉬는 중`;
      }

      // 프레임 저장
      frames.push({
        time: time,
        cpu: currentCpuTask ? { ...currentCpuTask } : null,
        quantumUsed: quantumUsed,
        quantum: quantum,
        queue: queue.map(t => ({ ...t })),
        completed: tasks.filter(t => t.remaining === 0).map(t => ({ ...t })),
        commentary: commentary,
        event: eventNotice
      });

      // 5. 1초 연산 소모 및 완료 처리
      if (currentCpuTask) {
        currentCpuTask.remaining--;
        quantumUsed++;
        if (currentCpuTask.remaining <= 0) {
          currentCpuTask.finish = time + 1;
          completedCount++;
          currentCpuTask = null; // 완료된 작업은 즉시 CPU에서 퇴장
          quantumUsed = 0;
        }
      }

      time++;
    }

    // 최종 완료 상태 기록
    tasks.forEach(t => {
      if (t.finish === time) {
        matrix[t.id][time] = 'JUST_FINISHED';
      } else if (t.finish < time) {
        matrix[t.id][time] = 'FINISHED';
      }
    });

    frames.push({
      time: time,
      cpu: null,
      quantumUsed: 0,
      quantum: quantum,
      queue: [],
      completed: tasks.map(t => ({ ...t })),
      commentary: `🎉 <b>[${time}초]</b> 모든 프로세스의 연산이 완료되었습니다!`,
      event: 'all_done'
    });

    // 지표 산출
    let totalWait = 0;
    let totalResponse = 0;
    let maxWait = -1;
    let maxWaitId = '';

    tasks.forEach(t => {
      const wait = (t.finish - t.arrival - t.duration);
      const resp = (t.firstRun - t.arrival);
      totalWait += wait;
      totalResponse += resp;
      if (wait > maxWait) {
        maxWait = wait;
        maxWaitId = t.id;
      }
    });

    const avgWait = (totalWait / tasks.length).toFixed(1);
    const avgResponse = (totalResponse / tasks.length).toFixed(1);
    const waitFormula = `(${tasks.map(t => t.finish - t.arrival - t.duration).join('+')}) ÷ ${tasks.length} = ${avgWait}초`;

    const overheadTotal = Number((switchCount * overhead).toFixed(2));
    const finalTotalTime = Number((time + overheadTotal).toFixed(1));

    return {
      mode,
      baseTime: time,
      totalTime: finalTotalTime,
      avgWait,
      avgResponse,
      waitFormula,
      maxWait,
      maxWaitId,
      switchCount,
      overheadTotal,
      overheadUnit: overhead,
      tasks,
      ganttSegments: rawGantt,
      matrix,
      history: frames
    };
  }

  // --- 모드 선택 ---
  selectMode(modeKey) {
    this.pause();
    this.activeMode = modeKey;

    document.querySelectorAll('.sched-mode-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeKey);
    });

    const modeData = this.allModes[modeKey];
    this.history = modeData.history;
    this.maxTime = modeData.baseTime; // 정수 초 단위 기준 동기화
    this.currentTime = 0;

    this.renderModeHeaderBanner(modeKey);
    this.renderMetricsSummaryGrid();
    this.renderCurrentState();

    const ourBox = document.getElementById('sched-order-editor-box');
    if (ourBox) {
      ourBox.style.display = (modeKey === 'our') ? 'block' : 'none';
      if (modeKey === 'our') this.renderOurOrderList();
    }
  }

  // --- 개념 브리핑 카드 (라운드로빈 시 인라인 퀀텀 조절기 탑재!) ---
  renderModeHeaderBanner(modeKey) {
    const banner = document.getElementById('sched-mode-desc-banner');
    if (!banner) return;

    const BRIEFINGS = {
      'fcfs': {
        name: '먼저 들어온 작업부터 (FCFS)',
        badge: '먼저 들어온 순서',
        rule: '기다리는 줄에 먼저 들어온 작업부터 끝까지 처리합니다.',
        feature: '단순하고 공평하나 앞선 긴 작업으로 인해 <b>호위 효과(Convoy Effect)</b>가 발생합니다.',
        observation: 'P1(5s)이 실행되는 동안 뒤 프로세스들의 대기가 누적되는 현상을 관찰하세요.'
      },
      'sjf': {
        name: '짧은 작업부터 (SJF)',
        badge: '더 알아보기',
        rule: '기다리는 작업 중 처리 시간이 가장 짧은 작업부터 실행합니다.',
        feature: '주어진 작업들에 대해 <b>평균 대기 시간을 수학적으로 최소화</b>합니다.',
        observation: 'P3(1s), P5(2s) 등 짧은 작업들이 먼저 털려나가며 큐가 빠르게 비는 모습을 확인하세요.'
      },
      'rr': {
        name: '조금씩 번갈아 (Round Robin)',
        badge: '차례를 나누는 방법',
        rule: `각 작업을 ${this.slotSize}초씩 처리한 뒤, 끝나지 않은 작업은 기다리는 줄의 뒤로 보냅니다.`,
        feature: '모든 프로세스가 빠르게 기회를 얻어 <b>응답 시간이 극대화</b>됩니다. 1초만 남은 작업은 조기 반납합니다.',
        observation: `타임 퀀텀(${this.slotSize}초)마다 블록이 분할 실행되고 조기 반납되는 모습을 확인하세요.`
      },
      'our': {
        name: '우선순위 직접 정하기 (Priority)',
        badge: '직접 정한 우선순위',
        rule: '아래 작업을 살펴보고 먼저 처리할 작업부터 우선순위를 정합니다.',
        feature: '같은 작업도 무엇을 중요하게 보느냐에 따라 순서를 다르게 정할 수 있습니다.',
        observation: '카드를 끌어서 순위를 정한 뒤 실행 결과를 확인해 보세요.'
      }
    };

    const b = BRIEFINGS[modeKey] || BRIEFINGS['fcfs'];

    // 라운드로빈일 때만 브리핑 카드 안에 타임 퀀텀 조절기를 인라인 배치!
    let quantumInlineHtml = '';
    if (modeKey === 'rr') {
      quantumInlineHtml = `
        <div class="cbc-quantum-row">
          <span class="cqr-label">⏱ <b>타임 퀀텀(Time Quantum, q) 조절:</b></span>
          <div class="quantum-btn-group">
            <button type="button" class="btn-quantum-opt ${this.slotSize===1?'active':''}" data-quantum="1">q = 1s</button>
            <button type="button" class="btn-quantum-opt ${this.slotSize===2?'active':''}" data-quantum="2">q = 2s (표준)</button>
            <button type="button" class="btn-quantum-opt ${this.slotSize===3?'active':''}" data-quantum="3">q = 3s</button>
            <button type="button" class="btn-quantum-opt ${this.slotSize===4?'active':''}" data-quantum="4">q = 4s</button>
            <button type="button" class="btn-quantum-opt ${this.slotSize===6?'active':''}" data-quantum="6">q = 6s</button>
          </div>
          <small style="color: var(--text-secondary); margin-left: 0.5rem;">* 퀀텀을 바꿔도 모드가 튕기지 않고 타임라인만 실시간 리사이징됩니다.</small>
        </div>
      `;
    }

    banner.innerHTML = `
      <div class="cs-concept-briefing-card collapsed">
        <div class="cbc-header">
          <div class="cbc-title-group">
            <span class="cbc-tag-badge">${b.badge}</span>
            <h4 class="cbc-title">${b.name}</h4>
          </div>
          <button type="button" class="btn-toggle-briefing" onclick="this.closest('.cs-concept-briefing-card').classList.toggle('collapsed')">
            📖 처리 방식 설명 보기
          </button>
        </div>
        <div class="cbc-body">
          <div class="cbc-grid">
            <div class="cbc-col">
              <span class="cbc-lbl">📌 동작 규칙</span>
              <p>${b.rule}</p>
            </div>
            <div class="cbc-col">
              <span class="cbc-lbl">⚡ 핵심 특징</span>
              <p>${b.feature}</p>
            </div>
            <div class="cbc-col cbc-highlight">
              <span class="cbc-lbl">🎯 관찰 포인트</span>
              <p>${b.observation}</p>
            </div>
          </div>
          ${quantumInlineHtml}
        </div>
      </div>
    `;

    // 인라인 타임 퀀텀 버튼 이벤트 바인딩 (모드 자동 튕김 완전 제거!)
    if (modeKey === 'rr') {
      banner.querySelectorAll('.btn-quantum-opt').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const newQ = parseInt(btn.dataset.quantum, 10);
          this.slotSize = newQ;
          this.pause();
          this.recalculateAllModes();
          // 현재 'rr' 모드 유지한 채 데이터만 갱신!
          const modeData = this.allModes['rr'];
          this.history = modeData.history;
          this.maxTime = modeData.baseTime;
          this.currentTime = 0;
          this.renderModeHeaderBanner('rr');
          this.renderMetricsSummaryGrid();
          this.renderCurrentState();
        };
      });
    }
  }

  // --- 스텝 제어 ---
  stepForward() {
    this.pause();
    if (this.currentTime < this.history.length - 1) {
      this.currentTime++;
      this.renderCurrentState();
    }
  }

  stepBackward() {
    this.pause();
    if (this.currentTime > 0) {
      this.currentTime--;
      this.renderCurrentState();
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    if (this.currentTime >= this.history.length - 1) {
      this.currentTime = 0;
    }

    this.timer = setInterval(() => {
      this.currentTime++;
      this.renderCurrentState();
      if (this.currentTime >= this.history.length - 1) {
        this.pause();
      }
    }, this.autoSpeedMs);

    document.getElementById('sched-btn-play')?.classList.add('active');
    document.getElementById('sched-btn-pause')?.classList.remove('active');
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    document.getElementById('sched-btn-play')?.classList.remove('active');
    document.getElementById('sched-btn-pause')?.classList.add('active');
  }

  resetSimulation() {
    this.pause();
    this.currentTime = 0;
    this.renderCurrentState();
  }

  skipToEnd() {
    this.pause();
    this.currentTime = this.history.length - 1;
    this.renderCurrentState();
  }

  // --- 렌더링: 1920x1080 화면 원스크린 핏 (빨간선 단일정렬) ---
  renderCurrentState() {
    const frame = this.history[this.currentTime] || this.history[0];
    const modeData = this.allModes[this.activeMode];
    if (!frame || !modeData) return;

    if (frame.event === 'cpu_in') this.playPop();
    else if (frame.event === 'rr_rotate') this.playSwitch();
    else if (frame.event === 'all_done') this.playDone();
    else if (this.isPlaying) this.beep(360, 'sine', 0.02, 0.03);

    // 시계
    const clockEl = document.getElementById('sched-clock-val');
    if (clockEl) {
      clockEl.innerHTML = `<b>${frame.time}초</b> <small style="font-weight: normal; color: #94a3b8;">/ ${modeData.baseTime}초</small>`;
    }

    // 해설
    const commEl = document.getElementById('sched-live-commentary');
    if (commEl) commEl.innerHTML = frame.commentary;

    // 1. [상단] 2D 프로세스 매트릭스
    this.render2DProcessMatrix(modeData.matrix, frame.time);

    // 2. [중간] CPU 코어 및 Ready Queue 실시간 상태 (간트 차트 상단 배치!)
    this.renderDedicatedReadyQueue(frame);

    // 3. [하단] CPU 단일 코어 통합 간트 바 (완벽히 좌측 200px 라벨 열 정렬!)
    this.renderUnifiedGanttBar(modeData.ganttSegments, frame.time);

    // 4. 스크롤 포커스 동기화
    this.syncScrollFocus(frame.time);
  }

  syncScrollFocus(currentSimTime) {
    const targetTick = document.querySelector(`.m-time-tick[data-sec="${currentSimTime}"]`);
    const targetX = targetTick ? targetTick.offsetLeft : (200 + currentSimTime * 54);

    const matrixWrapper = document.querySelector('.matrix-scroll-wrapper');
    if (matrixWrapper) {
      const viewW = matrixWrapper.clientWidth;
      const desiredScroll = Math.max(0, targetX - (viewW / 2) + 100);
      matrixWrapper.scrollLeft = desiredScroll;
    }

    const ganttWrapper = document.querySelector('.gantt-scroll-wrapper');
    if (ganttWrapper) {
      const viewW = ganttWrapper.clientWidth;
      const desiredScroll = Math.max(0, targetX - (viewW / 2) + 100);
      ganttWrapper.scrollLeft = desiredScroll;
    }
  }

  // --- 2D 프로세스 매트릭스 (높이 컴팩트 34px, 좌측 라벨 200px 고정) ---
  render2DProcessMatrix(matrix, currentSimTime) {
    const container = document.getElementById('sched-2d-matrix-container');
    if (!container) return;

    const totalSecs = this.maxTime;
    const CELL_WIDTH = 52;
    const LABEL_WIDTH = 200; // 좌측 고정 라벨 너비 (간트와 1:1 일치!)

    let timeHeaderHtml = `<div class="matrix-time-header"><div class="row-label-sticky" style="width: ${LABEL_WIDTH}px; min-width: ${LABEL_WIDTH}px;">프로세스 (PID)</div><div class="matrix-cells-track">`;
    for (let t = 0; t <= totalSecs; t++) {
      const isCur = (t === currentSimTime);
      timeHeaderHtml += `<div class="m-time-tick ${isCur ? 'active-tick' : ''}" data-sec="${t}" style="min-width: ${CELL_WIDTH}px; width: ${CELL_WIDTH}px;">${t}s</div>`;
    }
    timeHeaderHtml += '</div></div>';

    const rowsHtml = this.tasks.map(t => {
      const states = matrix[t.id] || [];
      let cellsHtml = '';

      for (let s = 0; s <= totalSecs; s++) {
        const state = states[s] || 'NOT_ARRIVED';
        const isCurCol = (s === currentSimTime);
        const isPastOrCur = (s <= currentSimTime);

        let cellClass = 'm-cell';
        let style = '';
        let content = '';

        if (isPastOrCur) {
          if (state === 'ARRIVED_RUNNING') {
            cellClass += ' state-running state-arrived-run';
            style = `background-color: ${t.color}; border-color: ${t.color};`;
            content = `<span class="cell-tag arrived">도착</span><span class="cell-sec">1s</span>`;
          } else if (state === 'ARRIVED') {
            cellClass += ' state-arrived';
            content = `<span class="cell-badge-arrived">도착!</span>`;
          } else if (state === 'RUNNING') {
            cellClass += ' state-running';
            style = `background-color: ${t.color}; border-color: ${t.color};`;
            content = `<span class="cell-sec">1s</span>`;
          } else if (state === 'WAITING') {
            cellClass += ' state-waiting';
            content = `<span class="cell-wait-label">대기</span>`;
          } else if (state === 'JUST_FINISHED') {
            cellClass += ' state-just-finished';
            content = `<span class="cell-badge-done">완료✓</span>`;
          } else if (state === 'FINISHED') {
            cellClass += ' state-finished';
            content = `<span class="cell-done-check">✓</span>`;
          } else {
            cellClass += ' state-not-arrived';
            content = `<span class="cell-dash">—</span>`;
          }
        } else {
          cellClass += ' state-future';
          content = `<span class="cell-dash">—</span>`;
        }

        if (isCurCol) cellClass += ' col-highlight';

        cellsHtml += `<div class="${cellClass}" style="${style} min-width: ${CELL_WIDTH}px; width: ${CELL_WIDTH}px;" title="${t.id} - ${s}초 상태: ${state}">${content}</div>`;
      }

      return `
        <div class="matrix-proc-row">
          <div class="row-label-sticky" style="width: ${LABEL_WIDTH}px; min-width: ${LABEL_WIDTH}px;">
            <span class="proc-badge sm" style="background: ${t.color};">${t.id}</span>
            <div class="proc-meta">
              <span class="p-name">${t.icon} <b>${t.label}</b></span>
              <span class="p-specs">AT: <b>${t.arrivalTime}s</b> | BT: <b>${t.duration}s</b></span>
            </div>
          </div>
          <div class="matrix-cells-track">
            ${cellsHtml}
          </div>
        </div>
      `;
    }).join('');

    // 초기 계산값
    const initialLeft = LABEL_WIDTH + (currentSimTime * (CELL_WIDTH + 2));

    container.innerHTML = `
      <div class="matrix-scroll-wrapper">
        <div class="matrix-scroll-board" style="min-width: ${LABEL_WIDTH + 10 + (totalSecs + 1) * (CELL_WIDTH + 2)}px; position: relative;">
          ${timeHeaderHtml}
          <div class="matrix-rows-body">${rowsHtml}</div>
          <div class="matrix-vertical-cursor" style="left: ${initialLeft}px;"></div>
        </div>
      </div>
    `;

    // DOM 기반 오차 0px 실시간 스냅 (화면 크기나 폰트 상관없이 완벽하게 일치!)
    const targetTick = container.querySelector(`.m-time-tick[data-sec="${currentSimTime}"]`);
    const cursorEl = container.querySelector('.matrix-vertical-cursor');
    if (targetTick && cursorEl) {
      cursorEl.style.left = `${targetTick.offsetLeft}px`;
    }
  }

  // --- CPU 단일 코어 통합 간트 바 (좌측 200px 라벨 추가로 빨간선 단일 수직 정렬 완료!) ---
  renderUnifiedGanttBar(ganttSegments, currentSimTime) {
    const container = document.getElementById('sched-unified-gantt-container');
    if (!container) return;

    const totalSecs = this.maxTime;
    const CELL_WIDTH = 52;
    const LABEL_WIDTH = 200; // 2D 매트릭스와 100% 동일한 라벨 폭!
    const totalWidthPx = (totalSecs + 1) * (CELL_WIDTH + 2);

    const segsHtml = ganttSegments.map(seg => {
      let blockWidthPx = seg.duration * (CELL_WIDTH + 2);
      const isSwitch = (seg.id === 'SWITCH' || seg.isSwitch);
      const isIdle = (seg.id === 'IDLE');

      let segClass = 'gantt-seg-block';
      if (isIdle) segClass += ' idle-seg';
      if (isSwitch) {
        segClass += ' switch-seg-slim';
        blockWidthPx = 12; // 슬림한 12px 주황 구분선
      }

      return `
        <div class="${segClass}" 
             style="width: ${blockWidthPx}px; min-width: ${blockWidthPx}px; background-color: ${seg.color};"
             title="${seg.label || seg.id}">
          ${isSwitch ? '<span class="switch-icon">⚡</span>' : `<span class="seg-id">${seg.id}</span><span class="seg-dur">${seg.duration}s</span>`}
        </div>
      `;
    }).join('');

    let ticksHtml = '';
    for (let t = 0; t <= totalSecs; t++) {
      const leftPx = t * (CELL_WIDTH + 2);
      ticksHtml += `
        <div class="gantt-tick-mark" style="left: ${leftPx}px;">
          <div class="tick-line"></div>
          <span class="tick-num">${t}s</span>
        </div>
      `;
    }

    
    container.innerHTML = `
      <div class="gantt-scroll-wrapper">
        <div class="gantt-scroll-board" style="min-width: ${LABEL_WIDTH + 10 + totalWidthPx}px; position: relative;">
          <div class="gantt-row-with-label">
            <div class="row-label-sticky" style="width: ${LABEL_WIDTH}px; min-width: ${LABEL_WIDTH}px; font-weight: 800; font-size: 0.85rem; color: #2563eb;">
              <span>⚡ CPU 간트 차트</span>
            </div>
            <div class="gantt-bar-track">${segsHtml}</div>
          </div>
          <div class="gantt-axis-track" style="margin-left: ${LABEL_WIDTH}px;">${ticksHtml}</div>
        </div>
      </div>
    `;
  }

  // --- 독립된 실시간 대기 큐 (Ready Queue) 보드 ---
  renderDedicatedReadyQueue(frame) {
    const container = document.getElementById('sched-dedicated-queue-board');
    if (!container) return;

    let cpuContent = `
      <div class="cpu-idle-box">
        <span style="font-size: 1.4rem;">☕</span>
        <div style="line-height: 1.2;">
          <b>CPU가 쉬는 중</b>
          <small>현재 처리할 작업 없음</small>
        </div>
      </div>
    `;

    if (frame.cpu) {
      const t = frame.cpu;
      const progressSec = t.duration - t.remaining + 1;
      const pct = Math.round((progressSec / t.duration) * 100);

      cpuContent = `
        <div class="cpu-active-chip" style="border-left-color: ${t.color};">
          <span class="proc-badge sm" style="background: ${t.color};">${t.id}</span>
          <div class="cac-info">
            <b>${t.icon} ${t.label}</b>
            <span class="cac-sub">진행: <b>${progressSec}/${t.duration}s</b> (${pct}%) | 남은 시간: <b>${Math.max(0, t.remaining - 1)}s</b></span>
          </div>
          ${this.activeMode === 'rr' ? `
            <span class="rr-slice-badge">⏱ 이번 차례: ${frame.quantumUsed + 1}/${frame.quantum}s</span>
          ` : '<span class="cac-live-badge">⚡ 연산 중</span>'}
        </div>
      `;
    }

    let queueContent = '';
    if (frame.queue.length === 0) {
      queueContent = `
        <div class="queue-empty-box">
          <span style="font-size: 1.3rem;">✨</span>
          <span>기다리는 작업이 없습니다.</span>
        </div>
      `;
    } else {
      queueContent = `
        <div class="queue-chips-scroll">
          ${frame.queue.map((t, idx) => `
            <div class="ready-queue-chip" style="border-top-color: ${t.color};">
              <span class="rq-rank">${idx + 1}번째</span>
              <span class="proc-badge sm" style="background: ${t.color};">${t.id}</span>
              <span class="rq-name">${t.icon} <b>${t.label}</b></span>
              <span class="rq-bt">남은 시간: <b>${t.remaining}s</b></span>
              <span class="rq-wt">기다린 시간: <b>${t.totalWait}s</b></span>
            </div>
          `).join('<span class="queue-arrow-sep">➔</span>')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="compact-queue-strip">
        <div class="cqs-cpu-side">
          <span class="cqs-label">🧑‍🍳 CPU가 처리 중:</span>
          ${cpuContent}
        </div>
        <div class="cqs-queue-side">
          <span class="cqs-label">🚶 기다리는 줄 [${frame.queue.length}개]:</span>
          ${queueContent}
        </div>
      </div>
    `;
  }

  // --- 4개 모드 지표 카드 렌더링 ---
  renderMetricsSummaryGrid() {
    const container = document.getElementById('sched-metrics-compare-row');
    if (!container) return;

    const modes = [
      { key: 'fcfs', name: 'FCFS (선입 선처리)', sub: '비선점형 기본' },
      { key: 'sjf', name: 'SJF (최단 작업 우선)', sub: '최소 평균 대기시간' },
      { key: 'rr', name: `Round Robin (${this.slotSize}s 퀀텀)`, sub: '시분할 대화형' },
      { key: 'our', name: 'Priority (우선순위)', sub: '직접 정한 우선순위' }
    ];

    container.innerHTML = modes.map(m => {
      const data = this.allModes[m.key];
      const isCurrent = (m.key === this.activeMode);

      return `
        <div class="metric-card-widescreen ${isCurrent ? 'active-card' : ''}" onclick="window.CS_APP.schedLab.selectMode('${m.key}')">
          <div class="mc-head">
            <span class="mc-sub">${m.sub}</span>
            <h4 class="mc-title">${m.name}</h4>
          </div>
          <div class="mc-body">
            <div class="mc-row">
              <span>총 반환 시간(TT):</span>
              <b>${data.totalTime}초</b>
            </div>
            <div class="mc-row">
              <span>평균 대기 시간(AWT):</span>
              <b class="${parseFloat(data.avgWait) <= 3.5 ? 'best-val' : ''}">${data.avgWait}초</b>
            </div>
            <div class="mc-formula-box">
              <small>대기 시간 산출 공식:</small>
              <code>${data.waitFormula}</code>
            </div>
            <div class="mc-row">
              <span>평균 응답 시간:</span>
              <b class="${parseFloat(data.avgResponse) <= 1.5 ? 'best-val' : ''}">${data.avgResponse}초</b>
            </div>
            ${data.overheadTotal > 0 ? `
              <div class="mc-row" style="color: #c2410c; background: #fff7ed; padding: 0.15rem 0.35rem; border-radius: 4px;">
                <span>문맥 교환 지연 (+${data.overheadUnit}s):</span>
                <b>+${data.overheadTotal}초 (${data.switchCount}회)</b>
              </div>
            ` : ''}
            <div class="mc-victim">
              최대 대기 프로세스: <b>${data.maxWaitId} (${data.maxWait}초 대기)</b>
            </div>
          </div>
          ${isCurrent ? '<div class="mc-badge-active">현재 선택된 모드 ◀</div>' : '<div class="mc-badge-hover">클릭하여 이 방식으로 전환 ➔</div>'}
        </div>
      `;
    }).join('');
  }

  // --- 우선순위 변경 리스트 렌더링 ---
  renderOurOrderList() {
    const listEl = document.getElementById('sched-our-order-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    this.currentOrder.forEach((taskId, idx) => {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) return;

      const item = document.createElement('div');
      item.className = 'our-order-chip';
      item.draggable = true;
      item.dataset.taskId = task.id;
      item.setAttribute('aria-label', `${task.label}, 현재 ${idx + 1}순위. 드래그하거나 화살표 버튼으로 이동`);
      item.innerHTML = `
        <span class="order-drag-handle" aria-hidden="true">⠿</span>
        <span class="order-rank">${idx + 1}순위</span>
        <span class="proc-badge sm" style="background: ${task.color};">${task.id}</span>
        <span class="order-name">${task.icon} <b>${task.label}</b> (필요: ${task.duration}초)</span>
        <div class="order-btns">
          <button type="button" class="btn-sm" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-sm" ${idx === this.currentOrder.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      `;

      item.querySelectorAll('.btn-sm')[0].onclick = () => this.swapOrder(idx, -1);
      item.querySelectorAll('.btn-sm')[1].onclick = () => this.swapOrder(idx, 1);

      item.addEventListener('dragstart', (event) => {
        this.draggedTaskId = task.id;
        item.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
      });

      item.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (!this.draggedTaskId || this.draggedTaskId === task.id) return;
        listEl.querySelectorAll('.our-order-chip').forEach(chip => {
          chip.classList.remove('drop-before', 'drop-after');
        });
        const rect = item.getBoundingClientRect();
        item.classList.add(event.clientX < rect.left + rect.width / 2 ? 'drop-before' : 'drop-after');
        event.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('drop', (event) => {
        event.preventDefault();
        const draggedId = this.draggedTaskId || event.dataTransfer.getData('text/plain');
        const rect = item.getBoundingClientRect();
        this.moveOrder(draggedId, task.id, event.clientX >= rect.left + rect.width / 2);
      });

      item.addEventListener('dragend', () => {
        this.draggedTaskId = null;
        listEl.querySelectorAll('.our-order-chip').forEach(chip => {
          chip.classList.remove('dragging', 'drop-before', 'drop-after');
        });
      });

      listEl.appendChild(item);
    });
  }

  moveOrder(draggedId, targetId, placeAfter = false) {
    const from = this.currentOrder.indexOf(draggedId);
    const target = this.currentOrder.indexOf(targetId);
    if (from < 0 || target < 0 || from === target) return;

    let insertAt = target + (placeAfter ? 1 : 0);
    const [moved] = this.currentOrder.splice(from, 1);
    if (from < insertAt) insertAt -= 1;
    this.currentOrder.splice(insertAt, 0, moved);
    this.saveOrderAndRefresh();
  }

  swapOrder(idx, delta) {
    const target = idx + delta;
    if (target < 0 || target >= this.currentOrder.length) return;
    const temp = this.currentOrder[idx];
    this.currentOrder[idx] = this.currentOrder[target];
    this.currentOrder[target] = temp;
    this.saveOrderAndRefresh();
  }

  saveOrderAndRefresh() {
    localStorage.setItem('cs_mod1_order', JSON.stringify(this.currentOrder));

    this.recalculateAllModes();
    this.selectMode('our');
  }
}

window.SchedulingLab = SchedulingLab;

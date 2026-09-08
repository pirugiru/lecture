/**
 * module2_workers.js - 작업자 수 실험실 (시뮬레이션 & 브라우저 실제 측정)
 */

class WorkerLab {
  constructor() {
    this.simType = 'independent'; // 'independent', 'sequential', 'mixed'
    this.simWorkerCount = 2; // 1, 2, 4
    this.activeWorkers = [];
    this.isBenchmarking = false;
    this.benchmarkCancelled = false;
    this.benchmarkResults = { 1: null, 2: null, 4: null };
    this.userPrediction = localStorage.getItem('cs_mod2_prediction') || '';
    this.userReflection = localStorage.getItem('cs_mod2_reflection') || '';
  }

  init() {
    this.setupEvents();
    this.renderSimControls();
    this.runEducationalSimulation();
    this.updateHardwareInfo();
  }

  setupEvents() {
    // 탭 전환 (시뮬레이션 vs 브라우저 실제 측정)
    const tabSim = document.getElementById('mod2-tab-sim');
    const tabReal = document.getElementById('mod2-tab-real');
    const viewSim = document.getElementById('mod2-view-sim');
    const viewReal = document.getElementById('mod2-view-real');

    if (tabSim && tabReal) {
      tabSim.onclick = () => {
        tabSim.classList.add('active');
        tabReal.classList.remove('active');
        viewSim.classList.remove('hidden');
        viewReal.classList.add('hidden');
      };
      tabReal.onclick = () => {
        tabReal.classList.add('active');
        tabSim.classList.remove('active');
        viewReal.classList.remove('hidden');
        viewSim.classList.add('hidden');
      };
    }

    // 예측 및 고찰 입력
    const predInput = document.getElementById('mod2-prediction-input');
    if (predInput) {
      predInput.value = this.userPrediction;
      predInput.oninput = (e) => {
        this.userPrediction = e.target.value;
        localStorage.setItem('cs_mod2_prediction', this.userPrediction);
      };
    }

    const refInput = document.getElementById('mod2-reflection-input');
    if (refInput) {
      refInput.value = this.userReflection;
      refInput.oninput = (e) => {
        this.userReflection = e.target.value;
        localStorage.setItem('cs_mod2_reflection', this.userReflection);
      };
    }

    // 벤치마크 시작 / 취소 버튼
    const btnStartBench = document.getElementById('mod2-btn-start-bench');
    const btnCancelBench = document.getElementById('mod2-btn-cancel-bench');

    if (btnStartBench) btnStartBench.onclick = () => this.startRealBenchmark();
    if (btnCancelBench) btnCancelBench.onclick = () => this.cancelRealBenchmark();
  }

  renderSimControls() {
    const typeButtons = document.querySelectorAll('.mod2-type-btn');
    typeButtons.forEach(btn => {
      btn.onclick = () => {
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.simType = btn.dataset.type;
        this.runEducationalSimulation();
      };
    });

    const workerButtons = document.querySelectorAll('.mod2-worker-btn');
    workerButtons.forEach(btn => {
      btn.onclick = () => {
        workerButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.simWorkerCount = parseInt(btn.dataset.workers, 10);
        this.runEducationalSimulation();
      };
    });
  }

  // --- 1. 교육용 시뮬레이션 ---
  runEducationalSimulation() {
    const container = document.getElementById('mod2-sim-stage');
    const statsContainer = document.getElementById('mod2-sim-metrics');
    if (!container || !statsContainer) return;

    // 작업 정의
    let tasks = [];
    let title = '';
    let desc = '';

    if (this.simType === 'independent') {
      title = '서로 기다리지 않는 작업';
      desc = '각 사진은 다른 사진의 결과 없이 처리할 수 있습니다. 이런 일은 여러 작업자에게 나눌 수 있습니다.';
      for (let i = 1; i <= 12; i++) {
        tasks.push({ id: `T${i}`, name: `사진 #${i}`, cost: 2, deps: [], icon: '🖼️' });
      }
    } else if (this.simType === 'sequential') {
      title = '앞의 결과가 필요한 작업';
      desc = '앞 계산이 끝나야 다음 계산을 시작할 수 있습니다. 작업자가 남아도 먼저 시작할 수 없습니다.';
      for (let i = 1; i <= 8; i++) {
        tasks.push({ id: `T${i}`, name: `계산 릴레이 #${i}`, cost: 3, deps: i > 1 ? [`T${i-1}`] : [], icon: '🔗' });
      }
    } else { // mixed
      title = '일부만 나눌 수 있는 작업';
      desc = '자료를 읽은 뒤 네 부분을 함께 분석하고, 모든 분석이 끝나면 결과를 하나로 합칩니다.';
      tasks = [
        { id: 'T1', name: '원본 데이터 읽기', cost: 3, deps: [], icon: '📂' },
        { id: 'T2', name: '구간 1 분석', cost: 4, deps: ['T1'], icon: '📊' },
        { id: 'T3', name: '구간 2 분석', cost: 4, deps: ['T1'], icon: '📊' },
        { id: 'T4', name: '구간 3 분석', cost: 4, deps: ['T1'], icon: '📊' },
        { id: 'T5', name: '구간 4 분석', cost: 4, deps: ['T1'], icon: '📊' },
        { id: 'T6', name: '최종 보고서 병합', cost: 3, deps: ['T2', 'T3', 'T4', 'T5'], icon: '📑' }
      ];
    }

    // 일꾼 배분 시뮬레이션 계산
    const numWorkers = this.simWorkerCount;
    const workerTracks = Array.from({ length: numWorkers }, (_, i) => ({ id: i + 1, tasks: [], busyUntil: 0 }));
    const taskFinishes = {};
    const remainingTasks = [...tasks];
    let simCurrentTime = 0;
    const maxSafety = 200;

    // 분배 및 모음 오버헤드 (작업자가 늘어날 때 발생하는 지연 비용)
    const splitOverhead = (numWorkers > 1) ? (numWorkers * 0.5) : 0;
    const mergeOverhead = (numWorkers > 1) ? (numWorkers * 0.5) : 0;

    while (remainingTasks.length > 0 && simCurrentTime < maxSafety) {
      // 실행 가능한 작업(의존성이 모두 완료된 작업) 찾기
      const readyIndices = [];
      remainingTasks.forEach((t, idx) => {
        const canRun = t.deps.every(depId => taskFinishes[depId] !== undefined && taskFinishes[depId] <= simCurrentTime);
        if (canRun) readyIndices.push(idx);
      });

      // 가용한 일꾼 찾기
      let anyWorkerAssigned = false;
      for (const idx of readyIndices) {
        const task = remainingTasks[idx];
        const freeWorker = workerTracks.find(w => w.busyUntil <= simCurrentTime);
        if (freeWorker) {
          const start = simCurrentTime;
          const end = start + task.cost;
          freeWorker.tasks.push({ ...task, start, end });
          freeWorker.busyUntil = end;
          taskFinishes[task.id] = end;
          remainingTasks.splice(idx, 1);
          anyWorkerAssigned = true;
          break; // 다음 틱에서 재탐색
        }
      }

      if (!anyWorkerAssigned) {
        // 시간이 지나야 일꾼이 비거나 작업이 해제됨
        const nextTimePoints = workerTracks.map(w => w.busyUntil).filter(t => t > simCurrentTime);
        if (nextTimePoints.length > 0) {
          simCurrentTime = Math.min(...nextTimePoints);
        } else {
          simCurrentTime++;
        }
      }
    }

    const rawComputeTime = Math.max(...workerTracks.map(w => w.busyUntil));
    const totalSimTime = rawComputeTime + (numWorkers > 1 ? (splitOverhead + mergeOverhead) : 0);

    // 1명 기준 대비 속도 배율 계산
    const base1WorkerTime = tasks.reduce((sum, t) => sum + t.cost, 0);
    const speedup = (base1WorkerTime / totalSimTime).toFixed(2);

    // 렌더링
    container.innerHTML = `
      <div class="sim-header">
        <h4>${title}</h4>
        <p class="sim-desc">${desc}</p>
      </div>

      <div class="sim-workers-grid workers-${numWorkers}">
        ${workerTracks.map(w => `
          <div class="worker-card">
            <div class="worker-title">
              <span class="w-avatar">👷 일꾼 ${w.id}</span>
              <span class="w-task-count">${w.tasks.length}개 작업 수행</span>
            </div>
            <div class="worker-lane">
              ${w.tasks.map(t => `
                <div class="w-task-pill" style="flex: ${t.cost};" title="${t.name} (${t.cost}초, ${t.start}~${t.end}s)">
                  ${t.icon} ${t.name} <span class="cost-tag">${t.cost}s</span>
                </div>
              `).join('')}
              ${w.tasks.length === 0 ? '<div class="w-idle-pill">맡을 수 있는 작업을 기다리는 중</div>' : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${numWorkers > 1 ? `
        <div class="overhead-banner">
          <span>📦 작업을 나누는 시간: <b>+${splitOverhead}초</b></span>
          <span>🤝 결과를 모으는 시간: <b>+${mergeOverhead}초</b></span>
        </div>
      ` : ''}
    `;

    statsContainer.innerHTML = `
      <div class="metric-col our-col">
        <div class="metric-header">
          <span class="metric-badge our-badge">비교 결과</span>
          <h4>작업자 ${numWorkers}명</h4>
        </div>
        <div class="metric-body">
          <div class="metric-item">
            <span class="m-label">작업 처리 시간</span>
            <span class="m-val">${rawComputeTime.toFixed(1)}초</span>
          </div>
          ${numWorkers > 1 ? `
            <div class="metric-item">
              <span class="m-label">나누고 모으는 시간</span>
              <span class="m-val highlight">+${(splitOverhead + mergeOverhead).toFixed(1)}초</span>
            </div>
          ` : ''}
          <div class="metric-item">
            <span class="m-label">총 걸린 시간</span>
            <span class="m-val highlight">${totalSimTime.toFixed(1)}초</span>
          </div>
          <div class="metric-item">
            <span class="m-label">1명일 때와 비교</span>
            <span class="m-val speedup-badge">${speedup}배</span>
          </div>
          <p class="metric-sub">
            ${numWorkers === 1 ? '한 명이 모든 작업을 차례로 처리했습니다.' : 
              (speedup < numWorkers * 0.7 ? '작업자가 늘어난 비율만큼 빨라지지는 않았습니다. 일의 순서와 나누고 모으는 시간이 영향을 줍니다.' : '서로 기다리지 않는 일이 많아 여러 작업자가 함께 처리할 수 있었습니다.')}
          </p>
        </div>
      </div>
    `;
  }

  // --- 2. 실제 브라우저 Web Worker 벤치마크 ---
  updateHardwareInfo() {
    const hwEl = document.getElementById('mod2-hw-info');
    const btnStart = document.getElementById('mod2-btn-start-bench');
    if (hwEl) {
      if (typeof Worker === 'undefined') {
        hwEl.textContent = '이 브라우저에서는 Web Worker를 사용할 수 없습니다. 앞의 교육용 비교 활동은 그대로 진행할 수 있습니다.';
        if (btnStart) btnStart.disabled = true;
        return;
      }
      const logicalCores = navigator.hardwareConcurrency || '확인불가';
      hwEl.innerHTML = `
        이 브라우저가 확인한 논리 처리 장치: <b>${logicalCores}개</b><br>
        <small>논리 처리 장치 수는 실제 CPU 물리 코어 수와 다를 수 있습니다.</small>
      `;
    }
  }

  async startRealBenchmark() {
    if (this.isBenchmarking || typeof Worker === 'undefined') return;
    this.isBenchmarking = true;
    this.benchmarkCancelled = false;

    const btnStart = document.getElementById('mod2-btn-start-bench');
    const btnCancel = document.getElementById('mod2-btn-cancel-bench');
    const statusBox = document.getElementById('mod2-bench-status');
    const progressFill = document.getElementById('mod2-bench-progress-fill');

    if (btnStart) btnStart.disabled = true;
    if (btnCancel) btnCancel.disabled = false;

    // 1회당 대략 0.8~1.5초가 걸리도록 사전 캘리브레이션
    statusBox.textContent = '이 컴퓨터에 맞게 계산량을 준비하고 있습니다.';
    if (progressFill) progressFill.style.width = '10%';

    const iterationsPerWorker = await this.calibrateWorkload();
    if (this.benchmarkCancelled) return this.cleanupBenchmark();

    const workerOptions = [1, 2, 4];
    const results = {};

    for (let i = 0; i < workerOptions.length; i++) {
      if (this.benchmarkCancelled) break;
      const count = workerOptions[i];
      statusBox.innerHTML = `<b>${count}개 Web Worker</b>로 계산 중...`;
      
      const runs = [];
      for (let run = 1; run <= 3; run++) {
        if (this.benchmarkCancelled) break;
        statusBox.innerHTML = `<b>${count}개 Web Worker</b> · ${run}/3회 측정 중...`;
        const elapsed = await this.executeWorkerCompute(count, iterationsPerWorker);
        runs.push(elapsed);
        const overallProgress = 20 + ((i * 3 + run) / 9) * 75;
        if (progressFill) progressFill.style.width = `${overallProgress}%`;
      }

      runs.sort((a, b) => a - b);
      results[count] = runs[1]; // 중앙값 (Median)
    }

    if (!this.benchmarkCancelled) {
      this.benchmarkResults = results;
      statusBox.innerHTML = '✅ 측정 완료. 예상과 실제 결과를 비교해 보세요.';
      if (progressFill) progressFill.style.width = '100%';
      this.renderBenchmarkChart();
    }

    this.cleanupBenchmark();
  }

  cancelRealBenchmark() {
    this.benchmarkCancelled = true;
    this.terminateAllWorkers();
    const statusBox = document.getElementById('mod2-bench-status');
    if (statusBox) statusBox.textContent = '측정을 중단했습니다.';
    this.cleanupBenchmark();
  }

  cleanupBenchmark() {
    this.isBenchmarking = false;
    this.terminateAllWorkers();
    const btnStart = document.getElementById('mod2-btn-start-bench');
    const btnCancel = document.getElementById('mod2-btn-cancel-bench');
    if (btnStart) btnStart.disabled = false;
    if (btnCancel) btnCancel.disabled = true;
  }

  terminateAllWorkers() {
    this.activeWorkers.forEach(w => w.terminate());
    this.activeWorkers = [];
  }

  // 캘리브레이션: 단일 워커로 짧게 돌려 기본 연산량 책정
  calibrateWorkload() {
    return new Promise((resolve) => {
      const testIters = 2000000;
      const t0 = performance.now();
      const worker = this.createInlineWorker();
      this.activeWorkers.push(worker);

      worker.onmessage = () => {
        const t1 = performance.now();
        const elapsed = t1 - t0;
        worker.terminate();
        this.activeWorkers = [];
        // 목표: 1개 워커 기준 약 1000ms (1초) 걸리도록 스케일링
        let target = Math.round(testIters * (1000 / Math.max(elapsed, 50)));
        target = Math.min(Math.max(target, 1000000), 50000000); // 1백만 ~ 5천만 반복 제한
        resolve(target);
      };

      worker.postMessage({ iterations: testIters });
    });
  }

  // 실제 워커 병렬 실행
  executeWorkerCompute(workerCount, totalIterations) {
    return new Promise((resolve) => {
      const workers = [];
      const itersPerWorker = Math.floor(totalIterations / workerCount);
      let finished = 0;
      const t0 = performance.now();

      for (let i = 0; i < workerCount; i++) {
        const w = this.createInlineWorker();
        workers.push(w);
        this.activeWorkers.push(w);

        w.onmessage = () => {
          finished++;
          if (finished === workerCount) {
            const t1 = performance.now();
            workers.forEach(worker => worker.terminate());
            this.activeWorkers = this.activeWorkers.filter(item => !workers.includes(item));
            resolve(t1 - t0);
          }
        };

        w.postMessage({ iterations: itersPerWorker });
      }
    });
  }

  createInlineWorker() {
    const code = `
      self.onmessage = function(e) {
        var iterations = e.data.iterations;
        var sum = 0;
        for (var i = 0; i < iterations; i++) {
          sum += Math.sqrt((i % 1000) * 3.14159) * Math.sin(i);
        }
        self.postMessage({ done: true, sum: sum });
      };
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return new Worker(url);
  }

  renderBenchmarkChart() {
    const container = document.getElementById('mod2-bench-chart');
    if (!container) return;

    const res = this.benchmarkResults;
    if (!res[1]) return;

    const baseT = res[1];
    const maxT = Math.max(res[1], res[2] || 0, res[4] || 0);

    const speedup2 = (baseT / res[2]).toFixed(2);
    const speedup4 = (baseT / res[4]).toFixed(2);

    const barHtml = (count, timeMs, speedup) => {
      const widthPct = ((timeMs / maxT) * 100).toFixed(1);
      return `
        <div class="bench-bar-row">
          <div class="bench-label"><b>${count}개 Worker</b></div>
          <div class="bench-track">
            <div class="bench-bar count-${count}" style="width: ${widthPct}%;">
              <span class="bar-val">${(timeMs / 1000).toFixed(2)}초</span>
            </div>
          </div>
          <div class="bench-speedup"><b>${speedup}배</b></div>
        </div>
      `;
    };

    container.innerHTML = `
      <div class="bench-chart-wrapper">
        ${barHtml(1, res[1], '1.00')}
        ${barHtml(2, res[2], speedup2)}
        ${barHtml(4, res[4], speedup4)}
      </div>
      <div class="bench-summary-note">
        <p>📊 <b>이 컴퓨터에서 나온 결과</b></p>
        <ul>
          <li>1개 ➔ 2개: <b>${speedup2}배</b> (${(res[1]/1000).toFixed(2)}초 ➔ ${(res[2]/1000).toFixed(2)}초)</li>
          <li>1개 ➔ 4개: <b>${speedup4}배</b> (${(res[1]/1000).toFixed(2)}초 ➔ ${(res[4]/1000).toFixed(2)}초)</li>
        </ul>
        <p class="disclaimer">
          브라우저 상태, 다른 프로그램, CPU 온도 등에 따라 결과가 달라질 수 있습니다. 정확히 2배·4배가 나오지 않아도 오류가 아닙니다.
        </p>
      </div>
    `;
  }
}

window.WorkerLab = WorkerLab;

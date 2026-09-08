/**
 * app.js - 메인 애플리케이션 진입점 및 전역 라우터
 */

class CSApp {
  constructor() {
    this.currentView = 'pre'; // 'pre', 'mod1', 'mod2', 'mod3', 'mod4', 'post'
    this.seed = localStorage.getItem('cs_current_seed') || 'CS-DEMO-01';
    this.schedLab = null;
    this.workerLab = null;
    this.sharedResourceLab = null;
    this.serviceMapLab = null;
    this.reflectionMgr = null;
    this.surveyMgr = null;
    this.teacherMode = null;
  }

  init() {
    // 서브 모듈 초기화
    this.reflectionMgr = new ReflectionManager();
    this.reflectionMgr.init();
    this.surveyMgr = new SurveyManager(this.reflectionMgr);
    this.surveyMgr.init();

    const tasks = window.CS_SEED.PRESETS_MODULE1["odd-burst"] ? window.CS_SEED.PRESETS_MODULE1["odd-burst"].tasks : window.CS_SEED.generateTasksFromSeed(this.seed);
    this.schedLab = new SchedulingLab();
    this.schedLab.init(tasks);

    this.workerLab = new WorkerLab();
    this.workerLab.init();

    this.sharedResourceLab = new SharedResourceLab();
    this.sharedResourceLab.init();

    this.serviceMapLab = new ServiceMapLab();
    this.serviceMapLab.init();

    this.teacherMode = new TeacherMode();
    this.teacherMode.init();

    this.setupNavigation();
    this.setupSeedControl();

    // 저장된 뷰 복구
    const savedView = localStorage.getItem('cs_active_view') || 'pre';
    this.navigate(savedView);
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-step-item');
    navItems.forEach(item => {
      item.onclick = () => {
        const targetView = item.dataset.view;
        this.navigate(targetView);
      };
    });

    // 다음/이전 단계 버튼
    document.querySelectorAll('.btn-next-step').forEach(btn => {
      btn.onclick = () => {
        const target = btn.dataset.target;
        this.navigate(target);
      };
    });
  }

  setupSeedControl() {
    const seedDisplay = document.getElementById('top-seed-display');
    const seedInput = document.getElementById('top-seed-input');
    const btnApply = document.getElementById('btn-apply-top-seed');
    const btnCopy = document.getElementById('btn-copy-seed');

    if (seedDisplay) seedDisplay.textContent = this.seed;
    if (seedInput) seedInput.value = this.seed;

    if (btnApply && seedInput) {
      btnApply.onclick = () => {
        const val = seedInput.value.trim().toUpperCase();
        if (val) {
          this.applySeed(val);
        }
      };
    }

    if (btnCopy) {
      btnCopy.onclick = () => {
        navigator.clipboard.writeText(this.seed).then(() => {
          alert(`현재 시드 [${this.seed}]가 클립보드에 복사되었습니다!`);
        });
      };
    }

    // 프리셋 선택기
    const presetSelect = document.getElementById('mod1-preset-select');
    if (presetSelect) {
      presetSelect.onchange = (e) => {
        const key = e.target.value;
        if (key === 'seed') {
          const tasks = window.CS_SEED.PRESETS_MODULE1["odd-burst"] ? window.CS_SEED.PRESETS_MODULE1["odd-burst"].tasks : window.CS_SEED.generateTasksFromSeed(this.seed);
          this.schedLab.setTasks(tasks);
        } else if (window.CS_SEED.PRESETS_MODULE1[key]) {
          this.schedLab.setTasks(window.CS_SEED.PRESETS_MODULE1[key].tasks);
        }
      };
    }
  }

  applySeed(newSeed) {
    this.seed = newSeed;
    localStorage.setItem('cs_current_seed', this.seed);

    const seedDisplay = document.getElementById('top-seed-display');
    const seedInput = document.getElementById('top-seed-input');
    if (seedDisplay) seedDisplay.textContent = this.seed;
    if (seedInput) seedInput.value = this.seed;

    // 모듈 1 작업 재성성
    const tasks = window.CS_SEED.PRESETS_MODULE1["odd-burst"] ? window.CS_SEED.PRESETS_MODULE1["odd-burst"].tasks : window.CS_SEED.generateTasksFromSeed(this.seed);
    if (this.schedLab) {
      this.schedLab.setTasks(tasks);
    }
  }

  navigate(viewName) {
    this.currentView = viewName;
    localStorage.setItem('cs_active_view', viewName);

    // 섹션 전환
    document.querySelectorAll('.app-section').forEach(sec => {
      sec.classList.add('hidden');
    });
    const targetSec = document.getElementById(`section-${viewName}`);
    if (targetSec) targetSec.classList.remove('hidden');

    // 네비게이션 탭 하이라이트
    document.querySelectorAll('.nav-step-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // 뷰별 새로고침/재렌더링
    if (viewName === 'mod1' && this.schedLab) {
      this.schedLab.renderCurrentState(); this.schedLab.renderMetricsSummaryGrid();
    } else if (viewName === 'mod2' && this.workerLab) {
      this.workerLab.runEducationalSimulation();
    } else if (viewName === 'mod3' && this.sharedResourceLab) {
      this.sharedResourceLab.render();
    } else if (viewName === 'mod4' && this.serviceMapLab) {
      this.serviceMapLab.renderCanvas();
    } else if (viewName === 'post' && this.reflectionMgr) {
      this.reflectionMgr.renderSummary();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.CS_APP = new CSApp();
  window.CS_APP.init();
});

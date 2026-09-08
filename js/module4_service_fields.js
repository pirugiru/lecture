/**
 * module4_service_fields.js - 서비스 역할과 컴퓨터공학 분야 연결 활동
 */

class ServiceMapLab {
  constructor() {
    this.fields = [
      { id: 'ux', icon: '🖥️', name: '사용자 경험·소프트웨어' },
      { id: 'os', icon: '⚙️', name: '운영체제·시스템' },
      { id: 'network', icon: '🌐', name: '네트워크' },
      { id: 'security', icon: '🔒', name: '정보보안' },
      { id: 'server', icon: '🖧', name: '서버·분산 시스템' },
      { id: 'database', icon: '🗄️', name: '데이터베이스' },
      { id: 'ai', icon: '🧠', name: '알고리즘·인공지능' },
      { id: 'hardware', icon: '🔧', name: '컴퓨터구조·하드웨어' }
    ];
    this.currentScenario = localStorage.getItem('cs_mod4_scenario') || 'game';
    this.selectedRoleId = null;
    this.links = {};
    this.showExamples = false;
  }

  getScenarios() {
    return {
      game: {
        roles: [
          { id: 'screen', icon: '🎨', text: '게임 화면과 버튼을 보여 주기', examples: ['ux'] },
          { id: 'login', icon: '🔐', text: '로그인 정보와 계정을 지키기', examples: ['security', 'server', 'database'] },
          { id: 'connect', icon: '🌍', text: '친구의 컴퓨터와 움직임을 주고받기', examples: ['network', 'server'] },
          { id: 'players', icon: '👥', text: '많은 플레이어의 요청을 함께 처리하기', examples: ['server', 'network', 'os'] },
          { id: 'save', icon: '💾', text: '캐릭터와 게임 기록을 저장하기', examples: ['database', 'server'] },
          { id: 'run', icon: '⚡', text: '그래픽과 게임 계산을 빠르게 처리하기', examples: ['hardware', 'ai', 'os'] }
        ]
      },
      video: {
        roles: [
          { id: 'screen', icon: '▶️', text: '검색창과 재생 화면을 보여 주기', examples: ['ux'] },
          { id: 'search', icon: '🔎', text: '원하는 영상을 빠르게 찾기', examples: ['ai', 'database'] },
          { id: 'recommend', icon: '✨', text: '관심 있을 영상을 추천하기', examples: ['ai', 'database'] },
          { id: 'stream', icon: '📡', text: '영상이 끊기지 않게 보내기', examples: ['network', 'server'] },
          { id: 'users', icon: '👥', text: '많은 사람의 재생 요청을 처리하기', examples: ['server', 'network', 'os'] },
          { id: 'protect', icon: '🔒', text: '계정과 유료 영상을 지키기', examples: ['security', 'server'] }
        ]
      },
      shopping: {
        roles: [
          { id: 'screen', icon: '🛍️', text: '상품과 주문 화면을 보여 주기', examples: ['ux'] },
          { id: 'search', icon: '🔎', text: '상품을 검색하고 추천하기', examples: ['ai', 'database'] },
          { id: 'stock', icon: '📦', text: '남은 상품 수를 정확하게 관리하기', examples: ['database', 'server', 'os'] },
          { id: 'payment', icon: '💳', text: '결제 정보를 안전하게 주고받기', examples: ['security', 'network', 'server'] },
          { id: 'orders', icon: '🧾', text: '주문 기록을 저장하고 다시 찾기', examples: ['database', 'server'] },
          { id: 'rush', icon: '👥', text: '할인 시간의 많은 요청을 처리하기', examples: ['server', 'network', 'os'] }
        ]
      },
      photo: {
        roles: [
          { id: 'screen', icon: '📱', text: '사진 선택과 결과 화면을 보여 주기', examples: ['ux'] },
          { id: 'upload', icon: '☁️', text: '사진을 다른 컴퓨터로 보내기', examples: ['network', 'server'] },
          { id: 'protect', icon: '🔒', text: '다른 사람이 내 사진을 보지 못하게 하기', examples: ['security'] },
          { id: 'save', icon: '🗄️', text: '사진과 사용자 정보를 저장하기', examples: ['database', 'server'] },
          { id: 'calculate', icon: '🧠', text: '사진을 분석하고 결과를 계산하기', examples: ['ai', 'hardware'] },
          { id: 'resources', icon: '⚙️', text: '여러 계산이 컴퓨터를 나누어 쓰게 하기', examples: ['os', 'hardware'] }
        ]
      }
    };
  }

  init() {
    this.setupEvents();
    this.loadScenario(this.currentScenario);
    this.fillInterestOptions();
  }

  getRoles() {
    return this.getScenarios()[this.currentScenario].roles;
  }

  storageKey(kind) {
    return `cs_mod4_${kind}_${this.currentScenario}`;
  }

  loadScenario(scenario) {
    this.currentScenario = scenario;
    localStorage.setItem('cs_mod4_scenario', scenario);
    const roles = this.getRoles();
    this.selectedRoleId = roles[0]?.id || null;
    try {
      this.links = JSON.parse(localStorage.getItem(this.storageKey('links')) || '{}');
    } catch (_) {
      this.links = {};
    }

    const select = document.getElementById('mod4-scenario-select');
    if (select) select.value = scenario;
    const reason = document.getElementById('mod4-reason-input');
    if (reason) reason.value = localStorage.getItem(this.storageKey('reason')) || '';
    const interest = document.getElementById('mod4-interest-select');
    if (interest) interest.value = localStorage.getItem(this.storageKey('interest')) || '';
    this.renderCanvas();
  }

  setupEvents() {
    document.getElementById('mod4-scenario-select')?.addEventListener('change', (event) => {
      this.loadScenario(event.target.value);
    });

    document.getElementById('mod4-random-btn')?.addEventListener('click', () => {
      const keys = Object.keys(this.getScenarios()).filter((key) => key !== this.currentScenario);
      this.loadScenario(keys[Math.floor(Math.random() * keys.length)]);
    });

    document.getElementById('mod4-example-btn')?.addEventListener('click', () => {
      this.showExamples = !this.showExamples;
      this.renderCanvas();
    });

    document.getElementById('mod4-reset-btn')?.addEventListener('click', () => {
      this.links = {};
      localStorage.removeItem(this.storageKey('links'));
      this.renderCanvas();
    });

    document.getElementById('mod4-reason-input')?.addEventListener('input', (event) => {
      localStorage.setItem(this.storageKey('reason'), event.target.value);
    });

    document.getElementById('mod4-interest-select')?.addEventListener('change', (event) => {
      localStorage.setItem(this.storageKey('interest'), event.target.value);
    });
  }

  fillInterestOptions() {
    const select = document.getElementById('mod4-interest-select');
    if (!select || select.options.length > 1) return;
    this.fields.forEach((field) => {
      const option = document.createElement('option');
      option.value = field.id;
      option.textContent = `${field.icon} ${field.name}`;
      select.appendChild(option);
    });
    select.value = localStorage.getItem(this.storageKey('interest')) || '';
  }

  selectRole(roleId) {
    this.selectedRoleId = roleId;
    this.renderCanvas();
  }

  toggleField(fieldId) {
    if (!this.selectedRoleId) return;
    const current = new Set(this.links[this.selectedRoleId] || []);
    if (current.has(fieldId)) current.delete(fieldId);
    else current.add(fieldId);
    this.links[this.selectedRoleId] = [...current];
    localStorage.setItem(this.storageKey('links'), JSON.stringify(this.links));
    this.renderCanvas();
  }

  renderCanvas() {
    const roles = this.getRoles();
    const selectedRole = roles.find((role) => role.id === this.selectedRoleId) || roles[0];
    if (!selectedRole) return;
    this.selectedRoleId = selectedRole.id;

    const roleList = document.getElementById('mod4-role-list');
    if (roleList) {
      roleList.innerHTML = roles.map((role) => {
        const linkedFields = (this.links[role.id] || [])
          .map((id) => this.fields.find((field) => field.id === id)?.name)
          .filter(Boolean);
        return `
          <button class="mod4-role-card ${role.id === this.selectedRoleId ? 'active' : ''}" data-role="${role.id}">
            <span class="mod4-role-icon">${role.icon}</span>
            <span class="mod4-role-copy"><strong>${role.text}</strong><small>${linkedFields.length ? linkedFields.join(' · ') : '아직 연결하지 않음'}</small></span>
            <span class="mod4-role-count">${linkedFields.length}</span>
          </button>
        `;
      }).join('');
      roleList.querySelectorAll('.mod4-role-card').forEach((button) => {
        button.onclick = () => this.selectRole(button.dataset.role);
      });
    }

    const selectedFields = new Set(this.links[this.selectedRoleId] || []);
    const fieldList = document.getElementById('mod4-field-list');
    if (fieldList) {
      fieldList.innerHTML = this.fields.map((field) => {
        const selected = selectedFields.has(field.id);
        const suggested = this.showExamples && selectedRole.examples.includes(field.id);
        return `
          <button class="mod4-field-card ${selected ? 'selected' : ''} ${suggested ? 'suggested' : ''}" data-field="${field.id}" aria-pressed="${selected}">
            <span>${field.icon}</span>
            <strong>${field.name}</strong>
            ${suggested ? '<small>가능한 예시</small>' : ''}
          </button>
        `;
      }).join('');
      fieldList.querySelectorAll('.mod4-field-card').forEach((button) => {
        button.onclick = () => this.toggleField(button.dataset.field);
      });
    }

    const instruction = document.getElementById('mod4-link-instruction');
    if (instruction) instruction.innerHTML = `<strong>선택한 일:</strong> ${selectedRole.icon} ${selectedRole.text}`;

    const allConnectionCount = Object.values(this.links).reduce((sum, ids) => sum + ids.length, 0);
    const count = document.getElementById('mod4-connection-count');
    if (count) count.textContent = `${allConnectionCount}개`;

    const summary = document.getElementById('mod4-connection-summary');
    if (summary) {
      const names = [...selectedFields]
        .map((id) => this.fields.find((field) => field.id === id)?.name)
        .filter(Boolean);
      summary.textContent = names.length
        ? `${selectedRole.text} → ${names.join(', ')}`
        : '오른쪽에서 관련 있다고 생각하는 분야를 선택하세요.';
    }

    const completedRoles = roles.filter((role) => (this.links[role.id] || []).length > 0).length;
    const overviewProgress = document.getElementById('mod4-overview-progress');
    if (overviewProgress) {
      overviewProgress.textContent = completedRoles === roles.length
        ? `모두 연결됨 ✓ · ${roles.length} / ${roles.length}`
        : `${completedRoles} / ${roles.length}개 연결`;
      overviewProgress.classList.toggle('complete', completedRoles === roles.length);
    }

    const overviewGrid = document.getElementById('mod4-overview-grid');
    if (overviewGrid) {
      overviewGrid.innerHTML = roles.map((role) => {
        const linked = (this.links[role.id] || [])
          .map((id) => this.fields.find((field) => field.id === id))
          .filter(Boolean);
        return `
          <article class="mod4-overview-item ${linked.length ? 'connected' : 'empty'} ${role.id === this.selectedRoleId ? 'current' : ''}">
            <div class="mod4-overview-role"><span>${role.icon}</span><strong>${role.text}</strong></div>
            <div class="mod4-overview-fields">
              ${linked.length
                ? linked.map((field) => `<span>${field.icon} ${field.name}</span>`).join('')
                : '<span class="empty-label">아직 분야를 연결하지 않음</span>'}
            </div>
          </article>
        `;
      }).join('');
    }

    const exampleButton = document.getElementById('mod4-example-btn');
    if (exampleButton) {
      exampleButton.textContent = this.showExamples ? '가능한 구성 예시 숨기기' : '가능한 구성 예시 보기';
      exampleButton.setAttribute('aria-pressed', String(this.showExamples));
    }
  }
}

window.ServiceMapLab = ServiceMapLab;

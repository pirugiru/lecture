/**
 * seed.js - 수업용 결정적 난수 생성기 및 작업 프리셋
 */

function xfnv1a(k) {
  for (var h = 2166136261 >>> 0, i = 0; i < k.length; i++) {
    h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  }
  return function() {
    h += h << 13; h ^= h >>> 7;
    h += h << 3;  h ^= h >>> 17;
    return (h += h << 5) >>> 0;
  };
}

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function createRng(seedStr) {
  const seed = xfnv1a(seedStr)();
  return mulberry32(seed);
}

const TASK_TEMPLATES = [
  { label: '대용량 압축 풀기', icon: '📦', color: '#2563eb' },
  { label: '메신저 알림 수신', icon: '💬', color: '#059669' },
  { label: '마우스 클릭 반응', icon: '🖱️', color: '#d97706' },
  { label: '사진 필터 적용', icon: '📸', color: '#7c3aed' },
  { label: '음악 스트리밍', icon: '🎵', color: '#e11d48' },
  { label: '웹페이지 로딩', icon: '🌐', color: '#0891b2' }
];

const PRESETS_MODULE1 = {
  'odd-burst': {
    name: '⭐ [추천] 홀수 버스트 & 조기 반납 (1s, 3s, 5s 혼합)',
    desc: '홀수 버스트(1, 3, 5s)가 섞여 있어 라운드로빈(q=2s) 시 1초만 남은 작업이 CPU를 즉시 반납하고 완료되는 과정을 명확히 관찰할 수 있습니다.',
    tasks: [
      { id: 'P1', label: '대용량 압축 풀기', icon: '📦', color: '#2563eb', arrivalTime: 0, duration: 5 },
      { id: 'P2', label: '메신저 메시지 수신', icon: '💬', color: '#059669', arrivalTime: 1, duration: 3 },
      { id: 'P3', label: '마우스 클릭 반응', icon: '🖱️', color: '#d97706', arrivalTime: 2, duration: 1 },
      { id: 'P4', label: '사진 필터 적용', icon: '📸', color: '#7c3aed', arrivalTime: 3, duration: 4 },
      { id: 'P5', label: '음악 스트리밍', icon: '🎵', color: '#e11d48', arrivalTime: 4, duration: 2 }
    ]
  },
  'all-at-zero': {
    name: '📌 동시 도착 (0초에 1, 2, 3, 4, 5s 도착)',
    desc: '모든 프로세스가 0초에 동시 도착하여 1초~5초 크기를 가집니다. FCFS, SJF, RR의 순수 스케줄링 차이를 가장 깔끔하게 비교합니다.',
    tasks: [
      { id: 'P1', label: '웹페이지 로딩', icon: '🌐', color: '#2563eb', arrivalTime: 0, duration: 5 },
      { id: 'P2', label: '알림음 재생', icon: '🔔', color: '#059669', arrivalTime: 0, duration: 3 },
      { id: 'P3', label: '키보드 입력', icon: '⌨️', color: '#d97706', arrivalTime: 0, duration: 1 },
      { id: 'P4', label: '화면 스크롤', icon: '📱', color: '#7c3aed', arrivalTime: 0, duration: 2 },
      { id: 'P5', label: '데이터 백업', icon: '💾', color: '#e11d48', arrivalTime: 0, duration: 4 }
    ]
  },
  'convoy-odd': {
    name: '📌 호위 효과 (7s 긴 작업 뒤 1s, 3s 대기)',
    desc: '7초짜리 긴 프로세스 뒤에 1초, 3초짜리 작업들이 줄줄이 대기하며 FCFS의 병목(Convoy Effect)을 극단적으로 체감합니다.',
    tasks: [
      { id: 'P1', label: '영상 렌더링', icon: '🎬', color: '#2563eb', arrivalTime: 0, duration: 7 },
      { id: 'P2', label: '메신저 알림', icon: '💬', color: '#059669', arrivalTime: 1, duration: 1 },
      { id: 'P3', label: '문서 저장', icon: '📄', color: '#d97706', arrivalTime: 2, duration: 3 },
      { id: 'P4', label: '클릭 반응', icon: '🖱️', color: '#7c3aed', arrivalTime: 3, duration: 1 },
      { id: 'P5', label: '음악 재생', icon: '🎵', color: '#e11d48', arrivalTime: 4, duration: 2 }
    ]
  },
  'classic-textbook': {
    name: '📌 OS 교과서 표준 예제 (Silberschatz)',
    desc: '운영체제 전공 교과서의 대표적인 표준 예제 조합입니다 (5s, 3s, 1s, 2s, 3s).',
    tasks: [
      { id: 'P1', label: '프로세스 P1', icon: '⚙️', color: '#2563eb', arrivalTime: 0, duration: 5 },
      { id: 'P2', label: '프로세스 P2', icon: '⚙️', color: '#059669', arrivalTime: 1, duration: 3 },
      { id: 'P3', label: '프로세스 P3', icon: '⚙️', color: '#d97706', arrivalTime: 2, duration: 1 },
      { id: 'P4', label: '프로세스 P4', icon: '⚙️', color: '#7c3aed', arrivalTime: 3, duration: 2 },
      { id: 'P5', label: '프로세스 P5', icon: '⚙️', color: '#e11d48', arrivalTime: 4, duration: 3 }
    ]
  },
  'dynamic-staggered': {
    name: '📌 시간차 도착 (0s, 2s, 4s, 5s, 7s 도착)',
    desc: '도착 시간이 제각각이라 실행 중에 새로운 프로세스가 대기열에 끼어드는 동적 스케줄링 상황입니다.',
    tasks: [
      { id: 'P1', label: '프로그램 실행 준비', icon: '🚀', color: '#2563eb', arrivalTime: 0, duration: 3 },
      { id: 'P2', label: '파일 다운로드', icon: '📥', color: '#059669', arrivalTime: 2, duration: 5 },
      { id: 'P3', label: '화면 밝기 조절', icon: '🔆', color: '#d97706', arrivalTime: 4, duration: 1 },
      { id: 'P4', label: '백신 검사', icon: '🛡️', color: '#7c3aed', arrivalTime: 5, duration: 4 },
      { id: 'P5', label: '알림 수신', icon: '🔔', color: '#e11d48', arrivalTime: 7, duration: 2 }
    ]
  },
  'interactive-short': {
    name: '📌 초단타 대화형 UI 작업 (1s, 2s 위주)',
    desc: '대부분 1초~3초 내에 끝나는 가벼운 UI 인터랙션 프로세스 모음입니다.',
    tasks: [
      { id: 'P1', label: '버튼 터치 반응', icon: '👆', color: '#2563eb', arrivalTime: 0, duration: 1 },
      { id: 'P2', label: '알림창 팝업', icon: '💬', color: '#059669', arrivalTime: 0, duration: 3 },
      { id: 'P3', label: '햅틱 진동', icon: '📳', color: '#d97706', arrivalTime: 1, duration: 1 },
      { id: 'P4', label: '화면 회전', icon: '🔄', color: '#7c3aed', arrivalTime: 2, duration: 2 },
      { id: 'P5', label: '음량 조절', icon: '🔊', color: '#e11d48', arrivalTime: 2, duration: 1 }
    ]
  }
};

function generateTasksFromSeed(seedStr, count = 5) {
  const rng = createRng(seedStr);
  const taskIds = ['P1', 'P2', 'P3', 'P4', 'P5'];
  
  const pool = [...TASK_TEMPLATES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const tasks = [];
  // 교육적 제약조건: 홀수 버스트(1, 3, 5)가 적어도 2개 이상 포함되도록 보장!
  const oddPool = [1, 3, 5];
  const mixedPool = [1, 2, 3, 4, 5, 6];

  for (let i = 0; i < count; i++) {
    const tmpl = pool[i % pool.length];
    let duration;
    if (i === 0) {
      duration = rng() > 0.5 ? 5 : 3; // 첫 작업도 3 또는 5 홀수 적극 활용
    } else if (i === 1) {
      duration = oddPool[Math.floor(rng() * oddPool.length)];
    } else {
      duration = mixedPool[Math.floor(rng() * mixedPool.length)];
    }

    let arrivalTime = (i === 0) ? 0 : Math.floor(rng() * 5); // 0 ~ 4

    tasks.push({
      id: taskIds[i],
      label: tmpl.label,
      icon: tmpl.icon,
      color: tmpl.color,
      arrivalTime: arrivalTime,
      duration: duration
    });
  }

  return tasks;
}

window.CS_SEED = {
  createRng,
  generateTasksFromSeed,
  PRESETS_MODULE1
};

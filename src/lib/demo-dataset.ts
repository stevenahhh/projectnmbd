/**
 * 데모 데이터셋 — 방문자별 복제 (A.10 개정, G3).
 *
 * 모든 시각은 부트스트랩 기준 상대 시각 { day, hour, minute } 로 정의한다.
 * day < 0 과거, day > 0 미래. 절대 시각 환산은 buildDemoDataset(bootstrap) 이 유일하게 수행한다.
 *
 * 방문자 uid 는 김민지(팀장) 자리를 차지한다 — 심사위원이 방문만으로
 * 자기 전용 1개월치 팀플 기록을 받는다. 데모 팀에는 초대 링크를 만들지 않는다.
 *
 * Spark 쓰기 한도 방어: 1회 부트스트랩당 쓰기 약 250~350건.
 * DEMO_DATASET_WRITE_CAP 을 초과하는 항목을 만들지 않는다 (무한 증식 방지).
 */
import type { EventType, ContributionWeights } from './types';
import { DEFAULT_WEIGHTS } from './types';

export const DEMO_TEAM_NAME = '인공지능공학과 · 기계학습 팀프로젝트 4조';
export const DEMO_COURSE_LABEL = '기계학습';
export const DEMO_GOAL = '캠퍼스 혼잡도 예측 모델 개발 및 발표';
export const DEMO_ARCHIVED_TEAM_NAME = '데이터베이스 · 텀프로젝트 2조';

/** Spark 2만/일 기준 방문자 약 60명 이상 수용 — 실측 약 230건, 상한 300. */
export const DEMO_DATASET_WRITE_CAP = 300;

/** 학번 창작물 — 실제 유저 수집 항목이 아니다 (C6). yyyy 2022~2026, nnnn 2001~6099, 중복 금지. */
export const DEMO_STUDENT_IDS = ['20234127', '20223845', '20242158', '20255301'];

export interface DemoMemberDef {
  nickname: string;
  roleLabel: string;
  /** 0 번이 방문자(팀장) 자리다. */
  placeholderUid: string;
  studentId: string;
}

export const DEMO_MEMBERS: DemoMemberDef[] = [
  { nickname: '김민지', roleLabel: '팀장 · 데이터', placeholderUid: 'demo-minji', studentId: DEMO_STUDENT_IDS[0] },
  { nickname: '박준호', roleLabel: '모델링', placeholderUid: 'demo-junho', studentId: DEMO_STUDENT_IDS[1] },
  { nickname: '이서연', roleLabel: '문서 · 발표', placeholderUid: 'demo-seoyeon', studentId: DEMO_STUDENT_IDS[2] },
  { nickname: '최태윤', roleLabel: '평가 · 실험', placeholderUid: 'demo-taeyun', studentId: DEMO_STUDENT_IDS[3] },
];

export interface RelativeStamp {
  /** 부트스트랩 기준 일 오프셋. 음수 과거. */
  day: number;
  hour: number;
  minute?: number;
}

export interface DemoChatLine extends RelativeStamp {
  /** DEMO_MEMBERS 인덱스 */
  speaker: number;
  text: string;
}

/** 대화 40줄 — Spark 쓰기 한도 방어(사용자 축소 결정). */
export const DEMO_CHAT: DemoChatLine[] = [
  { day: -29, hour: 10, speaker: 0, text: '4조 채팅방 개설했어요! 주제는 캠퍼스 혼잡도 예측으로 갔죠?' },
  { day: -29, hour: 10, speaker: 1, text: '네! 저 모델링 맡을게요. 일단 데이터부터 모으죠' },
  { day: -29, hour: 11, speaker: 2, text: '저 문서랑 발표 담당할게요. 데이터는 교시별 강의실 예약 데이터로 해요' },
  { day: -29, hour: 14, speaker: 0, text: '사무실에 데이터 요청해뒀어요. 세 소스 정리해서 서연님이 문서로 남겨주세요' },
  { day: -28, hour: 16, speaker: 1, text: '카드 데이터는 KST인데 예약 데이터는 UTC더라고요. 전처리 때 통일해야 해요' },
  { day: -27, hour: 10, speaker: 2, text: '데이터셋 정리 문서 만들었어요. 확인 부탁드려요' },
  { day: -26, hour: 13, speaker: 1, text: '수요일 오후가 유독 비어있네요. 점검일이었나 봐요. 보간 처리할게요' },
  { day: -24, hour: 15, speaker: 1, text: '전처리 파이프라인 1차 완성 — 보간 + 시간대 통일 + 이상치 제거까지요' },
  { day: -23, hour: 10, speaker: 0, text: '화요일 3교시가 제일 붐비네요. 히트맵 직관적이다' },
  { day: -20, hour: 9, speaker: 0, text: '데이터 수집 마일스톤 완료! 모델 학습 단계 갑니다' },
  { day: -20, hour: 10, speaker: 1, text: 'baseline은 XGBoost로 잡아요. 시계열 특성은 lag 피처로 넣고요' },
  { day: -20, hour: 10, speaker: 2, text: 'LSTM은요? 딥러닝이 더 나을 것 같은데' },
  { day: -19, hour: 14, speaker: 1, text: 'baseline_model.ipynb 올렸어요. MAE 18.7명' },
  { day: -16, hour: 15, speaker: 1, text: 'lag 1, 2, 7일 피처 추가했더니 MAE 16.2로 떨어졌어요' },
  { day: -15, hour: 10, speaker: 0, text: '내일 2시 공학관 401호 회의! 다들 가능하죠?' },
  { day: -14, hour: 14, speaker: 2, text: '중간 회의 자료 정리해서 올렸어요. 참석 체크 부탁드려요' },
  { day: -12, hour: 11, speaker: 2, text: '참고논문 3편 요약해서 pdf로 올릴게요' },
  { day: -11, hour: 13, speaker: 0, text: 'LSTM 비교 실험 이번 주 안에 가능할까요?' },
  { day: -9, hour: 14, speaker: 1, text: 'LSTM 초기 결과 MAE 17.1. 아직은 XGBoost가 나아요' },
  { day: -8, hour: 10, speaker: 2, text: '모델 비교 문서 표로 업데이트했어요' },
  { day: -7, hour: 9, speaker: 1, text: 'Optuna로 100 trials 튜닝 시작했어요' },
  { day: -6, hour: 15, speaker: 1, text: '튜닝 결과 MAE 14.8! 목표 15명 이하 달성했어요' },
  { day: -6, hour: 15, speaker: 2, text: '최종 보고서 초안 쓸게요' },
  { day: -5, hour: 10, speaker: 2, text: '발표는 제가 할게요. 자료도 제가 정리할게요' },
  { day: -4, hour: 11, speaker: 1, text: '혼잡도 지도 시각화 png 새로 만들었어요' },
  { day: -3, hour: 9, speaker: 0, text: '결과 분석 마일스톤 시작! ablation 실험 누가 할래요?' },
  { day: -3, hour: 9, speaker: 1, text: '저 할게요. 이번 주 과제가 세 개라 좀 밀려요' },
  { day: -2, hour: 20, speaker: 3, text: '안녕하세요, 최태윤이에요. 늦어서 미안해요. 이제 합류했어요' },
  { day: -2, hour: 20, speaker: 0, text: '오 안녕하세요! 평가·실험 파트 부탁드려요' },
  { day: -2, hour: 21, speaker: 1, text: '피처 하나씩 빼보면서 MAE 변화 보면 돼요. 노트북 공유해요' },
  { day: -2, hour: 21, speaker: 3, text: '받았습니다. 내일 아침에 결과 올릴게요' },
  { day: -1, hour: 9, speaker: 3, text: 'lag_7을 빼면 MAE가 15.3으로 올라가요. 7일 lag이 제일 중요한 피처네요' },
  { day: -1, hour: 9, speaker: 1, text: '오 저도 같은 결과! ablation 정리됐어요' },
  { day: -1, hour: 10, speaker: 2, text: '발표자료 v1 올렸어요. 첨삭 부탁드려요' },
  { day: -1, hour: 10, speaker: 1, text: '3페이지 수치 14.8로 바꿔요' },
  { day: -1, hour: 14, speaker: 0, text: '최종 보고서 초안 거의 다 됐어요. 각자 파트 확인해주세요' },
  { day: -1, hour: 14, speaker: 3, text: '실험 파트 확인했어요. 오타 하나 고쳤어요' },
  { day: -1, hour: 16, speaker: 2, text: '발표 리허설 대본 10분 분량 맞췄어요' },
  { day: 0, hour: 8, speaker: 0, text: '오늘 오후 발표 리허설 할게요. 다들 참석해주세요' },
  { day: 0, hour: 9, speaker: 2, text: '발표자료 최종본 올렸어요. 첨삭 환영해요' },
];

export interface DemoTaskDef {
  title: string;
  desc?: string;
  assignee: number;
  due: RelativeStamp;
  status: 'done' | 'todo';
  done?: RelativeStamp;
  /** 마일스톤 막대 — milestoneStartAt 이 있으면 간트 막대로 렌더한다. */
  milestoneStartAt?: RelativeStamp;
  milestoneId?: string;
  order: number;
}

/** 마감 알림 3단계가 각각 정확히 1회 트리거되는 3건 (부트스트랩+20h·+2h·+30m). */
export const DEMO_DEADLINE_TASKS: DemoTaskDef[] = [
  { title: 'ablation 실험 결과 보고서 작성', assignee: 1, due: { day: 0, hour: 20 }, status: 'todo', order: 21 },
  { title: '발표 슬라이드 최종본 업로드', assignee: 2, due: { day: 0, hour: 2 }, status: 'todo', order: 22 },
  { title: '리허설 피드백 반영', assignee: 0, due: { day: 0, hour: 0, minute: 30 }, status: 'todo', order: 23 },
];

export const DEMO_TASKS: DemoTaskDef[] = [
  { title: '데이터 소스 조사·요청', assignee: 0, due: { day: -28, hour: 18 }, status: 'done', done: { day: -28, hour: 9 }, order: 1 },
  { title: '예약 데이터 스키마 정리', assignee: 1, due: { day: -27, hour: 18 }, status: 'done', done: { day: -27, hour: 10 }, order: 2 },
  { title: '데이터셋 정리 문서 초안', assignee: 2, due: { day: -26, hour: 18 }, status: 'done', done: { day: -27, hour: 10 }, order: 3 },
  { title: '전처리 코드 작성', desc: '결측 보간 + 시간대 통일 + 이상치 제거', assignee: 1, due: { day: -24, hour: 18 }, status: 'done', done: { day: -24, hour: 15 }, order: 4 },
  { title: '요일별 혼잡도 히트맵', assignee: 2, due: { day: -22, hour: 18 }, status: 'done', done: { day: -23, hour: 10 }, order: 5 },
  { title: 'baseline 모델(XGBoost) 구축', assignee: 1, due: { day: -19, hour: 18 }, status: 'done', done: { day: -19, hour: 14 }, order: 6 },
  { title: 'baseline 성능표 문서 반영', assignee: 2, due: { day: -18, hour: 18 }, status: 'done', done: { day: -18, hour: 10 }, order: 7 },
  { title: '중간보고 목차 정리', assignee: 2, due: { day: -16, hour: 18 }, status: 'done', done: { day: -17, hour: 11 }, order: 8 },
  { title: 'lag 피처 추가 실험', assignee: 1, due: { day: -15, hour: 18 }, status: 'done', done: { day: -16, hour: 15 }, order: 9 },
  { title: '중간 회의 자료 공유', assignee: 2, due: { day: -13, hour: 18 }, status: 'done', done: { day: -14, hour: 14 }, order: 10 },
  { title: '피처 엔지니어링 정리 문서', assignee: 1, due: { day: -12, hour: 18 }, status: 'done', done: { day: -13, hour: 9 }, order: 11 },
  { title: '참고논문 3편 요약', assignee: 2, due: { day: -11, hour: 18 }, status: 'done', done: { day: -12, hour: 11 }, order: 12 },
  { title: 'LSTM 비교 실험', assignee: 1, due: { day: -9, hour: 18 }, status: 'done', done: { day: -9, hour: 14 }, order: 13 },
  { title: '하이퍼파라미터 튜닝(Optuna)', desc: '지연 완료 — 마감 2일 초과', assignee: 1, due: { day: -8, hour: 18 }, status: 'done', done: { day: -6, hour: 15 }, order: 14 },
  { title: '모델 비교 문서 업데이트', assignee: 2, due: { day: -8, hour: 12 }, status: 'done', done: { day: -8, hour: 10 }, order: 15 },
  { title: '혼잡도 지도 시각화', assignee: 1, due: { day: -4, hour: 18 }, status: 'done', done: { day: -4, hour: 11 }, order: 16 },
  { title: '최종 보고서 초안 작성', assignee: 2, due: { day: -2, hour: 18 }, status: 'done', done: { day: -1, hour: 14 }, order: 17 },
  { title: 'ablation 실험(피처 제거)', assignee: 3, due: { day: -1, hour: 12 }, status: 'done', done: { day: -1, hour: 9 }, order: 18 },
  { title: '발표자료 v1 작성', assignee: 2, due: { day: -1, hour: 12 }, status: 'done', done: { day: -1, hour: 10 }, order: 19 },
  { title: '발표 리허설', assignee: 2, due: { day: 0, hour: 15 }, status: 'todo', order: 20 },
  ...DEMO_DEADLINE_TASKS,
];

/** 간트 마일스톤 4개 — 부트스트랩 시점에 2개 진행 중. */
export const DEMO_MILESTONES: DemoTaskDef[] = [
  { title: '데이터 수집', assignee: 0, due: { day: -18, hour: 23 }, status: 'done', done: { day: -20, hour: 9 }, milestoneStartAt: { day: -28, hour: 9 }, milestoneId: 'ms1', order: 31 },
  { title: '모델 학습', assignee: 1, due: { day: 1, hour: 23 }, status: 'todo', milestoneStartAt: { day: -20, hour: 9 }, milestoneId: 'ms2', order: 32 },
  { title: '결과 분석', assignee: 1, due: { day: 3, hour: 23 }, status: 'todo', milestoneStartAt: { day: -3, hour: 9 }, milestoneId: 'ms3', order: 33 },
  { title: '발표 준비', assignee: 2, due: { day: 6, hour: 23 }, status: 'todo', milestoneStartAt: { day: 3, hour: 9 }, milestoneId: 'ms4', order: 34 },
];

export interface DemoDocDef {
  title: string;
  /** [day, hour, actor, body, charsDelta] — 버전 순서대로. */
  versions: [number, number, number, string, number][];
}

export const DEMO_DOCS: DemoDocDef[] = [
  {
    title: '데이터셋 정리',
    versions: [
      [-27, 10, 2, '# 데이터셋 정리\n\n## 소스\n1. 강의실 예약 데이터 (사무실 제공)\n2. 셔틀버스 카드 태그 데이터\n3. 건물별 유동인구 API\n', 120],
      [-26, 13, 1, '# 데이터셋 정리\n\n## 소스\n1. 강의실 예약 데이터 (사무실 제공)\n2. 셔틀버스 카드 태그 데이터\n3. 건물별 유동인구 API\n\n## 주의\n- 카드 데이터는 KST, 예약 데이터는 UTC — 전처리에서 통일한다.\n- 수요일 오후는 점검일 결측 → 선형 보간.\n', 320],
      [-24, 16, 1, '# 데이터셋 정리\n\n## 소스\n1. 강의실 예약 데이터 (사무실 제공)\n2. 셔틀버스 카드 태그 데이터\n3. 건물별 유동인구 API\n\n## 주의\n- 카드 데이터는 KST, 예약 데이터는 UTC — 전처리에서 통일한다.\n- 수요일 오후는 점검일 결측 → 선형 보간.\n\n## 전처리 파이프라인 1차 완성\n- 결측 보간: 수요일 오후 시간대 선형 보간\n- 시간대 통일: 전부 KST로 환산\n- 이상치: 공휴일·휴강일 제외\n', 380],
      [-12, 12, 1, '# 데이터셋 정리\n\n## 소스\n1. 강의실 예약 데이터 (사무실 제공)\n2. 셔틀버스 카드 태그 데이터\n3. 건물별 유동인구 API\n\n## 주의\n- 카드 데이터는 KST, 예약 데이터는 UTC — 전처리에서 통일한다.\n- 수요일 오후는 점검일 결측 → 선형 보간.\n\n## 전처리 파이프라인 1차 완성\n- 결측 보간: 수요일 오후 시간대 선형 보간\n- 시간대 통일: 전부 KST로 환산\n- 이상치: 공휴일·휴강일 제외\n\n## 피처\n- 수용인원 대비 예약율 (예측력 최고)\n- lag 1·2·7일 혼잡도\n- 교시 원-핫 + 요일 임베딩\n', 460],
    ],
  },
  {
    title: '모델 비교 LSTM vs XGBoost',
    versions: [
      [-19, 15, 1, '# 모델 비교\n\n| 모델 | MAE | 비고 |\n|---|---|---|\n| XGBoost (baseline) | 18.7 | lag 피처 없음 |\n', 90],
      [-16, 16, 1, '# 모델 비교\n\n| 모델 | MAE | 비고 |\n|---|---|---|\n| XGBoost (baseline) | 18.7 | lag 피처 없음 |\n| XGBoost + lag(1,2,7) | 16.2 | 채택 후보 |\n| LSTM | 진행중 | 12주치 과적합 주의 |\n', 220],
      [-9, 15, 1, '# 모델 비교\n\n| 모델 | MAE | 비고 |\n|---|---|---|\n| XGBoost (baseline) | 18.7 | lag 피처 없음 |\n| XGBoost + lag(1,2,7) | 16.2 | 채택 후보 |\n| LSTM | 17.1 | 초기 결과, 과적합 경향 |\n\nLSTM은 데이터량 대비 파라미터가 많아 과적합이 빠르다. XGBoost 튜닝으로 간다.\n', 340],
      [-6, 16, 1, '# 모델 비교\n\n| 모델 | MAE | 비고 |\n|---|---|---|\n| XGBoost (baseline) | 18.7 | lag 피처 없음 |\n| XGBoost + lag(1,2,7) | 16.2 | 채택 후보 |\n| LSTM | 17.1 | 초기 결과, 과적합 경향 |\n| XGBoost + Optuna 튜닝 | 14.8 | **최종 채택** |\n\nLSTM은 데이터량 대비 파라미터가 많아 과적합이 빠르다. XGBoost 튜닝으로 간다.\n\n## 최종 설정\n- depth 8, lr 0.05, 100 trials (Optuna)\n- lag 7 피처가 ablation 최고 기여\n', 520],
    ],
  },
  {
    title: '최종 보고서 초안',
    versions: [
      [-6, 16, 2, '# 캠퍼스 혼잡도 예측 모델 개발 및 발표\n\n## 1. 서론\n\n(작성 중)\n', 60],
      [-3, 10, 2, '# 캠퍼스 혼잡도 예측 모델 개발 및 발표\n\n## 1. 서론\n교시별 강의실 혼잡도를 사전에 예측해 학생들이 빈 강의실을 찾는 시간을 줄인다.\n\n## 2. 데이터\n세 소스를 통합해 12주치 시계열을 구축했다.\n\n## 3. 방법\nXGBoost와 LSTM을 비교 실험했다.\n\n## 4. 결과\n\n(작성 중)\n', 480],
      [-1, 14, 2, '# 캠퍼스 혼잡도 예측 모델 개발 및 발표\n\n## 1. 서론\n교시별 강의실 혼잡도를 사전에 예측해 학생들이 빈 강의실을 찾는 시간을 줄인다.\n\n## 2. 데이터\n세 소스를 통합해 12주치 시계열을 구축했다.\n\n## 3. 방법\nXGBoost와 LSTM을 비교 실험하고 Optuna로 튜닝했다.\n\n## 4. 결과\n최종 MAE 14.8명. lag 7 피처가 가장 큰 기여 (ablation 실험 참조).\n\n## 5. 결론 및 한계\n학기 유형(계절학기) 일반화는 추가 검증이 필요하다.\n', 760],
    ],
  },
];

export interface DemoFileDef {
  name: string;
  contentType: string;
  sizeBytes: number;
  uploaded: RelativeStamp;
  actor: number;
  caption: string;
}

export const DEMO_FILES: DemoFileDef[] = [
  { name: 'dataset_v2.csv', contentType: 'text/csv', sizeBytes: 1_842_000, uploaded: { day: -24, hour: 16 }, actor: 1, caption: '전처리 1차 완료본 — 결측 보간·시간대 통일' },
  { name: 'baseline_model.ipynb', contentType: 'application/json', sizeBytes: 320_000, uploaded: { day: -19, hour: 14 }, actor: 1, caption: 'XGBoost baseline 노트북' },
  { name: '혼잡도_시각화.png', contentType: 'image/png', sizeBytes: 890_000, uploaded: { day: -4, hour: 11 }, actor: 1, caption: '지도 오버레이 버전' },
  { name: '참고논문_요약.pdf', contentType: 'application/pdf', sizeBytes: 1_210_000, uploaded: { day: -12, hour: 11 }, actor: 2, caption: '3편 요약본' },
  { name: '발표자료_v1.pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', sizeBytes: 3_400_000, uploaded: { day: -1, hour: 10 }, actor: 2, caption: '첨삭 부탁드려요' },
];

export interface DemoFileCommentDef {
  fileIndex: number;
  at: RelativeStamp;
  actor: number;
  text: string;
}

export const DEMO_FILE_COMMENTS: DemoFileCommentDef[] = [
  { fileIndex: 0, at: { day: -23, hour: 10 }, actor: 2, text: '보간 처리한 결측 표시 컬럼도 추가해주면 시각화 때 좋을 것 같아요' },
  { fileIndex: 1, at: { day: -18, hour: 10 }, actor: 0, text: 'train/test 분리 기준 주차를 문서에도 남겨주세요' },
  { fileIndex: 3, at: { day: -11, hour: 12 }, actor: 1, text: '2번 논문 표 3 수치 참고해서 lag 피처 구성 바꿔볼게요' },
  { fileIndex: 4, at: { day: -1, hour: 10 }, actor: 0, text: '전체적으로 깔끔해요. 3페이지 수치만 최신으로 부탁해요' },
  { fileIndex: 4, at: { day: -1, hour: 10 }, actor: 1, text: '수치 14.8로 바꿔뒀습니다' },
  { fileIndex: 4, at: { day: 0, hour: 9 }, actor: 1, text: '5페이지 실험 표 제가 정리한 버전으로 교체했어요' },
];

export interface DemoMeetingDef {
  title: string;
  started: RelativeStamp;
  durationMin: number;
  place: string;
  online: boolean;
  attendees: number[];
  summary3: string;
  body: string;
}

export const DEMO_MEETINGS: DemoMeetingDef[] = [
  {
    title: '1주차 회의 — 주제 확정과 역할 분배',
    started: { day: -30, hour: 14 },
    durationMin: 60,
    place: '공학관 401호',
    online: false,
    attendees: [0, 1, 2],
    summary3: [
      '과제 주제를 「캠퍼스 혼잡도 예측」으로 확정했다.',
      '역할은 김민지 데이터·박준호 모델링·이서연 문서와 발표로 나눴다.',
      '데이터 세 소스를 조사해 다음 회의 전까지 공유하기로 했다.',
    ].join('\n'),
    body: [
      '## 논의',
      '- 주제 후보 세 개(혼잡도 예측 / 강의 추천 / 셔틀 배차)를 비교했다. 데이터를 실제로 구할 수 있는지가 기준이었고, 강의 추천은 수강 데이터를 못 구해 탈락, 셔틀 배차는 범위가 너무 커서 접었다.',
      '- 혼잡도 예측은 강의실 예약·카드 태그·건물 유동인구 세 소스를 조합하면 12주치 시계열을 만들 수 있다고 판단했다.',
      '',
      '## 결정',
      '- 주제: 캠퍼스 혼잡도 예측 모델 개발 및 발표.',
      '- 역할: 김민지(데이터 수집·팀 운영) / 박준호(전처리·모델링) / 이서연(문서·발표).',
      '- 최태윤은 아직 연락이 닿지 않아 합류 후 실험·평가 파트를 맡기기로 했다.',
      '',
      '## 문제',
      '- 학과 사무실 데이터 제공 절차가 불투명하다. 승인까지 얼마나 걸릴지 모른다.',
      '',
      '## 다음까지 할 일',
      '- 김민지: 사무실에 데이터 요청 메일 보내기(이번 주 안).',
      '- 박준호: 받은 샘플의 스키마 정리.',
      '- 이서연: 세 소스 비교표를 문서로 정리.',
    ].join('\n'),
  },
  {
    title: '2주차 회의 — 데이터 리뷰와 전처리 기준',
    started: { day: -22, hour: 14 },
    durationMin: 90,
    place: '공학관 401호',
    online: false,
    attendees: [0, 1, 2],
    summary3: [
      '결측치가 수요일 오후에 몰려 있는 원인이 시스템 점검일임을 확인했다.',
      '전처리 기준(시간대 통일·선형 보간·공휴일 제외)을 확정했다.',
      'baseline은 XGBoost로 잡고 lag 피처는 다음 스프린트로 미뤘다.',
    ].join('\n'),
    body: [
      '## 논의',
      '- 박준호가 전처리 1차 파이프라인을 시연했다. 히트맵으로 보니 결측이 수요일 오후에 규칙적으로 뚫려 있었다.',
      '- 사무실 확인 결과 그 시간이 정기 시스템 점검이었다. 무작위 결측이 아니라 규칙적 결측이라 삭제 대신 보간이 맞다고 정리했다.',
      '- 카드 데이터는 KST, 예약 데이터는 UTC라 그대로 합치면 9시간이 어긋난다는 점을 다시 확인했다.',
      '',
      '## 결정',
      '- 시간대는 전부 KST로 환산한 뒤 합친다.',
      '- 점검일 결측은 선형 보간, 공휴일·휴강일은 학습에서 제외한다.',
      '- baseline 모델은 XGBoost. lag 피처는 baseline 성능을 본 뒤에 붙인다.',
      '',
      '## 문제',
      '- 12주치는 딥러닝을 쓰기엔 적다. LSTM은 과적합 위험이 있어 비교 실험으로만 다루기로 했다.',
      '',
      '## 다음까지 할 일',
      '- 박준호: baseline 노트북과 성능표 올리기.',
      '- 이서연: 전처리 기준을 데이터셋 정리 문서에 반영.',
      '- 김민지: 중간보고 일정 확인.',
    ].join('\n'),
  },
  {
    title: '3주차 회의 — 중간 결과 점검 (비대면)',
    started: { day: -14, hour: 20 },
    durationMin: 60,
    place: 'ZOOM',
    online: true,
    attendees: [0, 1, 2],
    summary3: [
      'lag 1·2·7일 피처를 넣어 MAE가 18.7에서 16.2로 떨어졌다.',
      'LSTM 초기 결과는 17.1로 아직 XGBoost가 낫다고 판단했다.',
      '중간보고 슬라이드는 이서연이 맡고 목차를 먼저 공유하기로 했다.',
    ].join('\n'),
    body: [
      '## 논의',
      '- 화면 공유로 성능표를 함께 봤다. lag 7일 피처가 가장 크게 기여했고, 수용인원 대비 예약율도 예측력이 좋았다.',
      '- LSTM은 학습은 되지만 검증 손실이 일찍 튀어 오른다. 데이터량 대비 파라미터가 많다는 쪽으로 의견이 모였다.',
      '',
      '## 결정',
      '- 주 모델은 XGBoost로 간다. LSTM은 비교 대상으로만 문서에 남긴다.',
      '- 다음 단계는 하이퍼파라미터 튜닝이고 목표는 MAE 15명 이하.',
      '',
      '## 문제',
      '- 박준호가 이번 주 다른 과제와 겹쳐 튜닝 시작이 며칠 밀릴 수 있다.',
      '- 최태윤이 아직 합류하지 않아 실험 파트가 비어 있다.',
      '',
      '## 다음까지 할 일',
      '- 박준호: Optuna 튜닝 100 trials 실행.',
      '- 이서연: 중간보고 목차와 슬라이드 초안.',
      '- 김민지: 최태윤에게 다시 연락.',
    ].join('\n'),
  },
  {
    title: '4주차 회의 — 발표 리허설과 최종 점검',
    started: { day: 0, hour: 15 },
    durationMin: 120,
    place: '공학관 401호',
    online: false,
    attendees: [0, 1, 2, 3],
    summary3: [
      '튜닝 결과 MAE 14.8로 목표치를 달성했고 최종 모델로 확정했다.',
      '발표 리허설을 1회 돌려 10분 분량을 맞췄다.',
      '남은 것은 실험 표 반영과 예상 질문 준비 두 가지다.',
    ].join('\n'),
    body: [
      '## 논의',
      '- 최태윤이 합류해 진행한 ablation 결과를 공유했다. lag_7을 빼면 MAE가 15.3으로 올라가 이 피처의 기여가 가장 컸다.',
      '- 이서연이 발표 리허설을 진행했다. 도입이 길어 결과 슬라이드에서 시간이 부족했다.',
      '',
      '## 결정',
      '- 최종 모델: XGBoost + Optuna 튜닝(depth 8, lr 0.05), MAE 14.8.',
      '- 발표 구성은 문제 2분 · 방법 3분 · 결과 4분 · 한계 1분으로 재배분한다.',
      '',
      '## 문제',
      '- 슬라이드 3페이지 수치가 튜닝 전 값으로 남아 있었다. 반영 필요.',
      '- 시연용 노트북에서 그래프 폰트가 깨지는 문제가 있었다.',
      '',
      '## 다음까지 할 일',
      '- 이서연: 슬라이드 수치 갱신과 대본 최종본.',
      '- 최태윤: 실험 표 정리본 업로드.',
      '- 박준호: 시연 환경 폰트 문제 확인.',
      '- 김민지: 예상 질문 5개와 답변 정리.',
    ].join('\n'),
  },
];

export interface DemoDataset {
  teamId: string;
  archivedTeamId: string;
  team: {
    name: string;
    courseLabel: string;
    goal: string;
    startAt: Date;
    dueAt: Date;
    leaderUid: string;
    members: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }>;
    weights: ContributionWeights;
    archived: boolean;
    deleted: boolean;
    createdAt: Date;
  };
  archivedTeam: {
    name: string;
    courseLabel: string;
    goal: string;
    startAt: Date;
    dueAt: Date;
    leaderUid: string;
    members: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }>;
    weights: ContributionWeights;
    archived: boolean;
    deleted: boolean;
    createdAt: Date;
  };
  events: { type: EventType; actorUid: string; payload: Record<string, unknown>; at: Date }[];
  messages: { actorUid: string; text: string; at: Date }[];
  tasks: { title: string; desc?: string; actorUid: string; assigneeUid: string; dueAt: Date; status: 'done' | 'todo'; doneAt?: Date; milestoneId?: string; milestoneStartAt?: Date; order: number }[];
  docs: { title: string; versions: { body: string; charsDelta: number; actorUid: string; at: Date; version: number }[] }[];
  files: { name: string; contentType: string; sizeBytes: number; actorUid: string; caption: string; uploadedAt: Date }[];
  fileComments: { fileIndex: number; actorUid: string; text: string; at: Date }[];
  meetings: { title: string; startedAt: Date; durationMin: number; place: string; online: boolean; attendeeUids: string[]; summary3: string; body: string; actorUid: string }[];
}

export function estimateDemoWrites(ds: DemoDataset): number {
  return (
    1 /* team */ +
    1 /* archived team */ +
    1 /* users/{uid} 갱신 */ +
    ds.events.length +
    ds.messages.length +
    ds.tasks.length +
    ds.docs.length +
    ds.docs.reduce((n, d) => n + d.versions.length, 0) +
    ds.files.length +
    ds.fileComments.length +
    ds.meetings.length
  );
}

/**
 * 상대 시각 → 절대 시각 환산. 방문자 uid 가 민지(0번) 자리를 차지한다.
 * placeholderUid 는 유령 uid — 어떤 인증 사용자와도 연결되지 않는다.
 */
export function buildDemoDataset(visitorUid: string, bootstrap: Date): DemoDataset {
  const at = (rel: RelativeStamp): Date =>
    new Date(
      bootstrap.getTime() + rel.day * 86400000 + (rel.hour ?? 0) * 3600000 + (rel.minute ?? 0) * 60000,
    );

  const uids = DEMO_MEMBERS.map((m, i) => (i === 0 ? visitorUid : m.placeholderUid));
  const uidOf = (i: number): string => uids[i];
  const teamId = 'demo-' + visitorUid;
  const archivedTeamId = 'demo-archive-' + visitorUid;

  const teamStart = at({ day: -30, hour: 0 });
  const teamDue = at({ day: 6, hour: 23, minute: 59 });

  const memberEntries: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }> = {};
  DEMO_MEMBERS.forEach((m, i) => {
    memberEntries[uidOf(i)] = {
      nickname: m.nickname,
      roleLabel: m.roleLabel,
      joinedAt: i === 0 ? teamStart : at({ day: -29, hour: 9 }),
      // 데모 전용 창작물 — 실제 유저 수집 항목이 아니다 (C6)
      studentId: m.studentId,
    };
  });

  const archivedMembers: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }> = {
    [uidOf(0)]: { nickname: '김민지', roleLabel: '팀장', joinedAt: at({ day: -200, hour: 9 }), studentId: DEMO_STUDENT_IDS[0] },
    [uidOf(1)]: { nickname: '박준호', roleLabel: '모델링', joinedAt: at({ day: -200, hour: 9 }), studentId: DEMO_STUDENT_IDS[1] },
    [uidOf(2)]: { nickname: '이서연', roleLabel: '발표', joinedAt: at({ day: -200, hour: 9 }), studentId: DEMO_STUDENT_IDS[2] },
  };

  const events: DemoDataset['events'] = [];

  // 팀 생성 + 보관 팀의 과거 활동
  events.push({ type: 'team.create', actorUid: visitorUid, payload: { name: DEMO_TEAM_NAME }, at: teamStart });
  const archivedStart = at({ day: -200, hour: 9 });
  events.push({ type: 'doc.edit', actorUid: uidOf(0), payload: { docTitle: 'ERD 설계', charsDelta: 2100 }, at: at({ day: -190, hour: 11 }) });
  events.push({ type: 'task.complete', actorUid: uidOf(1), payload: { title: '정규화 과제 완료', onTime: true }, at: at({ day: -180, hour: 15 }) });
  events.push({ type: 'meeting.attend', actorUid: uidOf(2), payload: {}, at: at({ day: -170, hour: 14 }) });
  events.push({ type: 'message.post', actorUid: uidOf(0), payload: { chars: 42 }, at: at({ day: -165, hour: 10 }) });

  // 대화 — message + message.post 2벌
  const messages: DemoDataset['messages'] = [];
  for (const line of DEMO_CHAT) {
    const when = at(line);
    messages.push({ actorUid: uidOf(line.speaker), text: line.text, at: when });
    events.push({ type: 'message.post', actorUid: uidOf(line.speaker), payload: { chars: line.text.length }, at: when });
  }

  // 회의 + 참석
  const meetings: DemoDataset['meetings'] = [];
  DEMO_MEETINGS.forEach((m) => {
    meetings.push({
      title: m.title,
      startedAt: at(m.started),
      durationMin: m.durationMin,
      place: m.place,
      online: m.online,
      attendeeUids: m.attendees.map(uidOf),
      summary3: m.summary3,
      body: m.body,
      actorUid: uidOf(0),
    });
    events.push({ type: 'meeting.create', actorUid: uidOf(0), payload: { title: m.title }, at: at(m.started) });
    for (const attendeeIndex of m.attendees) {
      events.push({ type: 'meeting.attend', actorUid: uidOf(attendeeIndex), payload: { title: m.title }, at: at(m.started) });
    }
  });

  // 할 일 + 생성·완료 이벤트
  const tasks: DemoDataset['tasks'] = [];
  for (const t of [...DEMO_TASKS, ...DEMO_MILESTONES]) {
    const dueAt = at(t.due);
    // admin Firestore 는 undefined 를 거부한다 — 선택 필드는 값이 있을 때만 실린다
    const task: DemoDataset['tasks'][number] = {
      title: t.title,
      actorUid: uidOf(0),
      assigneeUid: uidOf(t.assignee),
      dueAt,
      status: t.status,
      order: t.order,
    };
    if (t.desc !== undefined) task.desc = t.desc;
    if (t.done) task.doneAt = at(t.done);
    if (t.milestoneId) task.milestoneId = t.milestoneId;
    if (t.milestoneStartAt) task.milestoneStartAt = at(t.milestoneStartAt);
    tasks.push(task);
    events.push({
      type: 'task.create',
      actorUid: uidOf(0),
      payload: { title: t.title, assigneeUid: uidOf(t.assignee), milestoneId: t.milestoneId ?? null },
      at: at({ day: Math.min(t.due.day - 1, t.milestoneStartAt?.day ?? t.due.day - 1), hour: 9 }),
    });
    if (t.status === 'done' && t.done) {
      const doneAt = at(t.done);
      // 정시 판정의 진실은 원장 at > task.dueAt 대조다 — payload.onTime 은 참고용
      const onTime = doneAt.getTime() <= dueAt.getTime();
      events.push({ type: 'task.complete', actorUid: uidOf(t.assignee), payload: { title: t.title, onTime }, at: doneAt });
    }
  }

  // 문서 + 버전 + doc.edit
  const docs: DemoDataset['docs'] = [];
  DEMO_DOCS.forEach((d) => {
    const versions = d.versions.map(([day, hour, actor, body, charsDelta], index) => {
      events.push({
        type: 'doc.edit',
        actorUid: uidOf(actor),
        payload: { docTitle: d.title, charsDelta, version: index + 1 },
        at: at({ day, hour }),
      });
      return { body, charsDelta, actorUid: uidOf(actor), at: at({ day, hour }), version: index + 1 };
    });
    docs.push({ title: d.title, versions });
  });

  // 파일 + file.upload, 첨삭 + file.comment
  const files: DemoDataset['files'] = [];
  DEMO_FILES.forEach((f) => {
    files.push({
      name: f.name,
      contentType: f.contentType,
      sizeBytes: f.sizeBytes,
      actorUid: uidOf(f.actor),
      caption: f.caption,
      uploadedAt: at(f.uploaded),
    });
    events.push({ type: 'file.upload', actorUid: uidOf(f.actor), payload: { fileName: f.name, sizeBytes: f.sizeBytes }, at: at(f.uploaded) });
  });
  const fileComments: DemoDataset['fileComments'] = [];
  DEMO_FILE_COMMENTS.forEach((c) => {
    fileComments.push({ fileIndex: c.fileIndex, actorUid: uidOf(c.actor), text: c.text, at: at(c.at) });
    events.push({ type: 'file.comment', actorUid: uidOf(c.actor), payload: { fileName: DEMO_FILES[c.fileIndex].name, chars: c.text.length }, at: at(c.at) });
  });

  // 오프라인 기여 수동 기록 1건 (팀 확인 하에)
  events.push({
    type: 'note.add',
    actorUid: uidOf(2),
    payload: { text: '발표장 예약·장비 대여·인쇄물 준비를 대행함', verifierUids: [uidOf(0), uidOf(1)] },
    at: at({ day: -2, hour: 17 }),
  });

  return {
    teamId,
    archivedTeamId,
    team: {
      name: DEMO_TEAM_NAME,
      courseLabel: DEMO_COURSE_LABEL,
      goal: DEMO_GOAL,
      startAt: teamStart,
      dueAt: teamDue,
      leaderUid: visitorUid,
      members: memberEntries,
      weights: { ...DEFAULT_WEIGHTS },
      archived: false,
      deleted: false,
      createdAt: teamStart,
    },
    archivedTeam: {
      name: DEMO_ARCHIVED_TEAM_NAME,
      courseLabel: '데이터베이스',
      goal: '도서관 대출 예약 시스템 설계',
      startAt: archivedStart,
      dueAt: at({ day: -160, hour: 23, minute: 59 }),
      leaderUid: visitorUid,
      members: archivedMembers,
      weights: { ...DEFAULT_WEIGHTS },
      archived: true,
      deleted: false,
      createdAt: archivedStart,
    },
    events,
    messages,
    tasks,
    docs,
    files,
    fileComments,
    meetings,
  };
}

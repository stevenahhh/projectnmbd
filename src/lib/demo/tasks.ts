/** 데모 할 일 — 마감만 있는 항목과 기간이 있는 마일스톤을 나눠 둔다. */
import type { RelativeStamp } from './stamp';

export interface DemoTaskDef {
  title: string;
  desc?: string;
  assignee: number;
  due: RelativeStamp;
  status: 'done' | 'todo';
  done?: RelativeStamp;
  /** 마일스톤 막대 — milestoneStartAt 이 있으면 간트 막대로 렌더한다. */
  milestoneStartAt?: RelativeStamp;
  /** 문서 id 로 쓸 고정 키 — 다른 항목이 부모로 가리킬 수 있게 한다. */
  key?: string;
  /** 상위 항목의 key. 타임라인에서 한 단 안으로 들어간다. */
  parentKey?: string;
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

/** 간트 마일스톤 — 큰 단계 4개와 그 아래 하위 구간 3개. */
export const DEMO_MILESTONES: DemoTaskDef[] = [
  { title: '데이터 수집', assignee: 0, due: { day: -18, hour: 23 }, status: 'done', done: { day: -20, hour: 9 }, milestoneStartAt: { day: -28, hour: 9 }, key: 'ms1', order: 31 },
  { title: '모델 학습', assignee: 1, due: { day: 1, hour: 23 }, status: 'todo', milestoneStartAt: { day: -20, hour: 9 }, key: 'ms2', order: 32 },
  { title: '결과 분석', assignee: 1, due: { day: 3, hour: 23 }, status: 'todo', milestoneStartAt: { day: -3, hour: 9 }, key: 'ms3', order: 33 },
  { title: '발표 준비', assignee: 2, due: { day: 6, hour: 23 }, status: 'todo', milestoneStartAt: { day: 3, hour: 9 }, key: 'ms4', order: 34 },
  { title: '전처리 파이프라인', assignee: 1, due: { day: -14, hour: 23 }, status: 'done', done: { day: -15, hour: 15 }, milestoneStartAt: { day: -20, hour: 9 }, key: 'ms2a', parentKey: 'ms2', order: 35 },
  { title: 'baseline 학습·튜닝', assignee: 1, due: { day: 1, hour: 12 }, status: 'todo', milestoneStartAt: { day: -13, hour: 9 }, key: 'ms2b', parentKey: 'ms2', order: 36 },
  { title: '슬라이드 작성', assignee: 2, due: { day: 5, hour: 23 }, status: 'todo', milestoneStartAt: { day: 3, hour: 9 }, key: 'ms4a', parentKey: 'ms4', order: 37 },
];

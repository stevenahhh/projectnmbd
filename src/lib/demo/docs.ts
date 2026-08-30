/** 데모 문서·자료와 첨삭 댓글. */
import type { RelativeStamp } from './stamp';

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

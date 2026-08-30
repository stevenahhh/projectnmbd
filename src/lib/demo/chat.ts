/** 데모 대화 — Spark 쓰기 한도 방어로 40줄까지만 둔다. */
import type { RelativeStamp } from './stamp';

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

/** 데모 픽스처의 시각 표기 — 절대 시각 환산은 buildDemoDataset 이 유일하게 수행한다. */
export interface RelativeStamp {
  /** 부트스트랩 기준 일 오프셋. 음수 과거. */
  day: number;
  hour: number;
  minute?: number;
}

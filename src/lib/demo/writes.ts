/** 부트스트랩 1회가 만드는 쓰기 건수 추정 — Spark 한도(DEMO_DATASET_WRITE_CAP) 방어용. */
import type { DemoDataset } from '../demo-dataset';

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

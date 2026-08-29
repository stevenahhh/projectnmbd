import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type UpdateData,
  type WithFieldValue,
} from 'firebase/firestore';
import type { EventType } from './types';

/**
 * 원장에 함께 실리는 상태 문서 변경.
 * 이벤트와 상태 변경은 반드시 같은 배치 1회로 나간다 (결정 D7).
 */
export type LedgerMutation =
  | { kind: 'set'; ref: DocumentReference; data: WithFieldValue<DocumentData>; merge?: boolean }
  | { kind: 'update'; ref: DocumentReference; data: UpdateData<DocumentData> };

export interface LedgerWrite {
  teamId: string;
  actorUid: string;
  type: EventType;
  payload?: Record<string, unknown>;
  mutations?: LedgerMutation[];
}

/**
 * writeEvent — 이벤트 1건과 상태 변경을 원자적으로 커밋한다.
 *
 * at 은 serverTimestamp() 센티널로만 쓴다. 클라이언트 시각 경로는 이 모듈에 존재하지 않으며,
 * 규칙(at == request.time)이 그 계약을 서버에서 다시 강제한다 (S7).
 */
export async function writeEvent(db: Firestore, write: LedgerWrite): Promise<string> {
  const batch = writeBatch(db);
  const eventRef = doc(collection(db, 'teams', write.teamId, 'events'));

  batch.set(eventRef, {
    actorUid: write.actorUid,
    type: write.type,
    payload: write.payload ?? {},
    at: serverTimestamp(),
  });

  for (const mutation of write.mutations ?? []) {
    if (mutation.kind === 'set') {
      batch.set(mutation.ref, mutation.data, { merge: mutation.merge ?? false });
    } else {
      batch.update(mutation.ref, mutation.data);
    }
  }

  await batch.commit();
  return eventRef.id;
}

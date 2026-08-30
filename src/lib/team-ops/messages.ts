/**
 * 팀 대화 — 구독과 전송 (S11 — 팀 스코프 단독 리스너).
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';
import type { Message } from '@/lib/types';

export function subscribeMessages(teamId: string, onData: (messages: Message[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'teams', teamId, 'messages'), orderBy('at', 'asc'), limit(300)),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })));
    },
    (err) => onError?.(err),
  );
}

export async function postMessage(teamId: string, uid: string, text: string): Promise<void> {
  const db = getDb();
  const msgRef = doc(collection(db, 'teams', teamId, 'messages'));
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'message.post',
    payload: { chars: text.length },
    mutations: [
      { kind: 'set', ref: msgRef, data: { actorUid: uid, text, at: serverTimestamp() } },
    ],
  });
}

/**
 * 대화 수정 — 보낸 지 5분 안, 본인만(규칙이 강제).
 * 이전 텍스트는 메시지 문서에 남는다. 원장에는 새 이벤트를 만들지 않는다 —
 * 메시지 이벤트는 400개 기여 창의 예산을 이미 크게 쓰기 때문.
 */
export async function editMessage(teamId: string, uid: string, message: Message, newText: string): Promise<void> {
  await updateDoc(doc(getDb(), 'teams', teamId, 'messages', message.id), {
    text: newText,
    prevText: message.text,
    editedAt: serverTimestamp(),
  });
}

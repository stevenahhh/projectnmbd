/**
 * 팀 대화 — 구독과 전송 (S11 — 팀 스코프 단독 리스너).
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
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

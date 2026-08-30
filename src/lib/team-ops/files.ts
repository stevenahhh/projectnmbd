/**
 * 자료 — 업로드 등록과 첨삭 댓글.
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';

export async function registerFile(
  teamId: string,
  uid: string,
  input: { name: string; blobUrl: string; contentType: string; sizeBytes: number; caption: string },
): Promise<void> {
  const db = getDb();
  const fileRef = doc(collection(db, 'teams', teamId, 'files'));
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'file.upload',
    payload: { fileId: fileRef.id, fileName: input.name, sizeBytes: input.sizeBytes },
    mutations: [
      {
        kind: 'set',
        ref: fileRef,
        data: { ...input, actorUid: uid, uploadedAt: serverTimestamp() },
      },
    ],
  });
}

export async function commentOnFile(teamId: string, uid: string, fileId: string, text: string): Promise<void> {
  const db = getDb();
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'file.comment',
    payload: { fileId, chars: text.length },
    mutations: [
      {
        kind: 'set',
        ref: doc(collection(db, 'teams', teamId, 'files', fileId, 'comments')),
        data: { actorUid: uid, text, at: serverTimestamp() },
      },
    ],
  });
}

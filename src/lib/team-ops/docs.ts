/**
 * 팀 문서 — 저장 1회가 버전 1개다.
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';
import type { TeamDoc } from '@/lib/types';

export async function createTeamDoc(teamId: string, uid: string, title: string, body: string): Promise<string> {
  const db = getDb();
  const docRef = doc(collection(db, 'teams', teamId, 'docs'));
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'doc.edit',
    payload: { docId: docRef.id, docTitle: title, charsDelta: body.length, version: 1 },
    mutations: [
      { kind: 'set', ref: docRef, data: { title, body, latestVersion: 1, lockedBy: null, lockedAt: null } },
      {
        kind: 'set',
        ref: doc(collection(docRef, 'versions')),
        data: { body, charsDelta: body.length, actorUid: uid, at: serverTimestamp(), version: 1 },
      },
    ],
  });
  return docRef.id;
}

/** 저장 1회 = 버전 1개 + doc.edit 이벤트 1건. charsDelta 는 증가분만 집계한다(음수 허용·집계 제외). */
export async function saveTeamDoc(teamId: string, uid: string, teamDoc: TeamDoc, body: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'teams', teamId, 'docs', teamDoc.id);
  const version = teamDoc.latestVersion + 1;
  const charsDelta = body.length - teamDoc.body.length;
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'doc.edit',
    payload: { docId: teamDoc.id, docTitle: teamDoc.title, charsDelta, version },
    mutations: [
      { kind: 'update', ref: docRef, data: { body, latestVersion: version } },
      {
        kind: 'set',
        ref: doc(collection(docRef, 'versions')),
        data: { body, charsDelta, actorUid: uid, at: serverTimestamp(), version },
      },
    ],
  });
}

export async function setDocLock(teamId: string, docId: string, uid: string | null): Promise<void> {
  await updateDoc(doc(getDb(), 'teams', teamId, 'docs', docId), {
    lockedBy: uid,
    lockedAt: uid ? serverTimestamp() : null,
  });
}

/**
 * 회의록 — 작성과 참석 체크.
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';
import type { Meeting } from '@/lib/types';

export async function createMeeting(
  teamId: string,
  uid: string,
  input: { title: string; startedAt: Date; durationMin: number; place: string; online: boolean; attendeeUids: string[]; summary3: string; body: string },
): Promise<void> {
  const db = getDb();
  const meetingRef = doc(collection(db, 'teams', teamId, 'meetings'));
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'meeting.create',
    payload: { meetingId: meetingRef.id, title: input.title },
    mutations: [
      {
        kind: 'set',
        ref: meetingRef,
        data: { ...input, actorUid: uid },
      },
    ],
  });
}

/**
 * 회의록 수정 — 옛 전문은 버전으로 남는다. 저장 1회 = 버전 1개 (문서 saveTeamDoc 과 동일).
 */
export async function updateMeeting(
  teamId: string,
  uid: string,
  meeting: Meeting,
  input: { title: string; startedAt: Date; durationMin: number; place: string; online: boolean; attendeeUids: string[]; summary3: string; body: string },
): Promise<void> {
  const db = getDb();
  const meetingRef = doc(db, 'teams', teamId, 'meetings', meeting.id);
  const version = (meeting.latestVersion ?? 1) + 1;
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'meeting.update',
    payload: { meetingId: meeting.id, title: input.title, version },
    mutations: [
      {
        kind: 'update',
        ref: meetingRef,
        data: { ...input, latestVersion: version, editedAt: serverTimestamp() },
      },
      {
        kind: 'set',
        ref: doc(collection(meetingRef, 'versions')),
        data: { body: input.body, actorUid: uid, at: serverTimestamp(), version },
      },
    ],
  });
}

/** 삭제된 회의록 복원 — 팀장 전용(규칙이 가드). 옛 버전 문서들은 그대로 남는다. */
export async function restoreMeeting(teamId: string, uid: string, meeting: Meeting): Promise<void> {
  const db = getDb();
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'meeting.restore',
    payload: { meetingId: meeting.id, title: meeting.title },
    mutations: [{ kind: 'update', ref: doc(db, 'teams', teamId, 'meetings', meeting.id), data: { deleted: false, deletedAt: null } }],
  });
}

/** 참석 체크 — attendeeUids 에 본인이 없으면 추가한다. */
export async function checkAttend(teamId: string, uid: string, meeting: Meeting): Promise<void> {
  const db = getDb();
  const meetingRef = doc(db, 'teams', teamId, 'meetings', meeting.id);
  const already = meeting.attendeeUids.includes(uid);
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'meeting.attend',
    payload: { meetingId: meeting.id },
    mutations: [
      {
        kind: 'update',
        ref: meetingRef,
        data: {
          attendeeUids: already ? meeting.attendeeUids : [...meeting.attendeeUids, uid],
        },
      },
    ],
  });
}

/** 회의록 삭제(보관) — 작성자·팀장만(규칙이 가드). 원본은 그대로 있고 '삭제된 회의록'에 남는다. */
export async function softDeleteMeeting(teamId: string, uid: string, meeting: Meeting): Promise<void> {
  const db = getDb();
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'meeting.delete',
    payload: { meetingId: meeting.id, title: meeting.title },
    mutations: [
      { kind: 'update', ref: doc(db, 'teams', teamId, 'meetings', meeting.id), data: { deleted: true, deletedAt: serverTimestamp() } },
    ],
  });
}

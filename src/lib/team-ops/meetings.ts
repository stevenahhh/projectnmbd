/**
 * 회의록 — 작성과 참석 체크.
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { collection, doc } from 'firebase/firestore';
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

/**
 * 팀 스코프 상태 변경 — 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 * 서브컬렉션 컬렉션명은 규칙의 명시 매치와 일치해야 한다 (S8).
 */
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';
import type { Meeting, Message, TeamDoc, TeamTask } from '@/lib/types';

// ── 할 일 ────────────────────────────────────────────────

export async function createTask(
  teamId: string,
  uid: string,
  input: { title: string; desc?: string; assigneeUid: string; dueAt: Date; milestoneId?: string | null; milestoneStartAt?: Date | null },
): Promise<void> {
  const db = getDb();
  const taskRef = doc(collection(db, 'teams', teamId, 'tasks'));
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'task.create',
    payload: { taskId: taskRef.id, title: input.title, assigneeUid: input.assigneeUid },
    mutations: [
      {
        kind: 'set',
        ref: taskRef,
        data: {
          title: input.title,
          desc: input.desc ?? '',
          actorUid: uid,
          assigneeUid: input.assigneeUid,
          dueAt: input.dueAt,
          status: 'todo',
          doneAt: null,
          milestoneId: input.milestoneId ?? null,
          milestoneStartAt: input.milestoneStartAt ?? null,
          order: Date.now(),
        },
      },
    ],
  });
}

export async function completeTask(teamId: string, uid: string, task: TeamTask): Promise<void> {
  const db = getDb();
  // onTime 은 payload 에 기록하되 집계는 원장 at > dueAt 대조로 판정한다 (결정 D6)
  const onTime = task.dueAt.toDate().getTime() >= Date.now();
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'task.complete',
    payload: { taskId: task.id, title: task.title, onTime },
    mutations: [
      {
        kind: 'update',
        ref: doc(db, 'teams', teamId, 'tasks', task.id),
        data: { status: 'done', doneAt: serverTimestamp() },
      },
    ],
  });
}

export async function reopenTask(teamId: string, uid: string, taskId: string): Promise<void> {
  const db = getDb();
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'task.create',
    payload: { taskId, reopened: true },
    mutations: [
      {
        kind: 'update',
        ref: doc(db, 'teams', teamId, 'tasks', taskId),
        data: { status: 'todo', doneAt: null },
      },
    ],
  });
}

// ── 대화 (S11 — 팀 스코프 단독 리스너) ─────────────────────

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

// ── 회의록 ───────────────────────────────────────────────

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

// ── 문서 ────────────────────────────────────────────────

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

// ── 파일 ────────────────────────────────────────────────

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

// ── 역할 · 팀 삭제 ────────────────────────────────────────

/** 팀장만 roleLabel 배정 — UI 숨김이 아니라 규칙이 팀장만 통과시킨다 (S5). */
export async function assignRole(teamId: string, leaderUid: string, memberUid: string, roleLabel: string): Promise<void> {
  const db = getDb();
  await writeEvent(db, {
    teamId,
    actorUid: leaderUid,
    type: 'role.assign',
    payload: { memberUid, roleLabel },
    mutations: [
      {
        kind: 'update',
        ref: doc(db, 'teams', teamId),
        data: { [`members.${memberUid}.roleLabel`]: roleLabel },
      },
    ],
  });
}

/** 팀 소프트 삭제 — 팀장 전용, 물리·재귀 삭제 없음 (G4). */
export async function softDeleteTeam(teamId: string, leaderUid: string): Promise<void> {
  await writeEvent(getDb(), {
    teamId,
    actorUid: leaderUid,
    type: 'team.archive',
    payload: { deleted: true },
    mutations: [
      { kind: 'update', ref: doc(getDb(), 'teams', teamId), data: { deleted: true, archived: true } },
    ],
  });
}

// ── 수동 기여 기록 (note.add) ─────────────────────────────

export async function addNote(teamId: string, uid: string, text: string, verifierUids: string[]): Promise<void> {
  await writeEvent(getDb(), {
    teamId,
    actorUid: uid,
    type: 'note.add',
    payload: { text, verifierUids },
  });
}

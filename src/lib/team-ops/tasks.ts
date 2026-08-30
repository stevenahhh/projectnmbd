/**
 * 할 일과 타임라인 항목 — 생성·완료·되돌리기·기간 수정.
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';
import type { TeamTask } from '@/lib/types';

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

/** 타임라인 항목(마일스톤·할 일)의 제목·기간 수정 — 수정 이력이 이벤트로 남는다. */
export async function updateMilestone(
  teamId: string,
  uid: string,
  task: TeamTask,
  input: { title: string; startAt?: Date | null; dueAt: Date },
): Promise<void> {
  const db = getDb();
  const data: Record<string, unknown> = { title: input.title, dueAt: input.dueAt };
  if (input.startAt) data.milestoneStartAt = input.startAt;
  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'milestone.update',
    payload: {
      taskId: task.id,
      title: input.title,
      startAt: input.startAt ? input.startAt.toISOString() : null,
      dueAt: input.dueAt.toISOString(),
      prevDueAt: task.dueAt.toDate().toISOString(),
    },
    mutations: [{ kind: 'update', ref: doc(db, 'teams', teamId, 'tasks', task.id), data }],
  });
}

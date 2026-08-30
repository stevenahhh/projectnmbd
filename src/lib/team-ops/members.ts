/**
 * 팀 운영 — 역할 배정·보관·수동 기여 기록.
 * 상태 변경은 전부 writeEvent 로 원장과 같은 배치로 나간다 (결정 D7).
 */
import { doc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';

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

export async function addNote(teamId: string, uid: string, text: string, verifierUids: string[]): Promise<void> {
  await writeEvent(getDb(), {
    teamId,
    actorUid: uid,
    type: 'note.add',
    payload: { text, verifierUids },
  });
}

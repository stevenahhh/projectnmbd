import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { writeEvent } from '@/lib/ledger';
import type { Team, UserProfile } from '@/lib/types';


export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(getDb(), 'teams', teamId));
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Team, 'id'>;
  return { id: snap.id, ...data };
}

/** 팀장이 팀을 만든다 — members 에 본인만 있고 leaderUid 는 본인 (규칙 teams create 계약). */
export async function createTeam(
  uid: string,
  nickname: string,
  input: { name: string; courseLabel: string; goal: string; dueAt: Date; startAt?: Date },
): Promise<string> {
  const db = getDb();
  const teamRef = doc(db, 'teams');
  const startAt = input.startAt ?? new Date();

  await writeEvent(db, {
    teamId: teamRef.id,
    actorUid: uid,
    type: 'team.create',
    payload: { name: input.name },
    mutations: [
      {
        kind: 'set',
        ref: teamRef,
        data: {
          name: input.name,
          courseLabel: input.courseLabel,
          goal: input.goal,
          startAt,
          dueAt: input.dueAt,
          leaderUid: uid,
          members: { [uid]: { nickname, roleLabel: '팀장', joinedAt: serverTimestamp() } },
          weights: { doc: 1, file: 1, task: 1, meeting: 1, note: 1 },
          archived: false,
          deleted: false,
        },
      },
      {
        kind: 'set',
        ref: doc(db, 'users', uid),
        data: { [`teams.${teamRef.id}`]: '팀장' },
        merge: true,
      },
    ],
  });

  return teamRef.id;
}

/** 초대 토큰 발급 — 멤버만 가능 (규칙 invites create 계약). */
export async function createInvite(teamId: string, uid: string): Promise<string> {
  const db = getDb();
  const inviteRef = doc(collection(db, 'invites'));
  await setDoc(inviteRef, {
    teamId,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return inviteRef.id;
}

/**
 * 합류 — 클라이언트 트랜잭션 (A.7).
 * 규칙 ⑨: 변경 키가 members[본인] 추가 하나뿐 + 본인이 들고 온 유효한 토큰.
 */
export async function joinTeam(uid: string, token: string): Promise<string> {
  const db = getDb();
  const inviteSnap = await getDoc(doc(db, 'invites', token));
  if (!inviteSnap.exists()) throw new Error('유효하지 않은 초대 링크예요');
  const teamId = inviteSnap.data().teamId as string;

  const teamRef = doc(db, 'teams', teamId);
  const profileRef = doc(db, 'users', uid);
  const profileSnap = await getDoc(profileRef);
  const nickname = (profileSnap.data() as UserProfile | undefined)?.nickname ?? '새 멤버';

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(teamRef);
    if (!snap.exists()) throw new Error('팀을 찾을 수 없어요');
    const team = snap.data() as Team;
    if (team.archived || team.deleted) throw new Error('활동이 종료된 팀이에요');
    if (uid in team.members) throw new Error('이미 합류한 팀이에요');
    tx.update(teamRef, {
      [`members.${uid}`]: { nickname, roleLabel: '', joinedAt: serverTimestamp(), inviteToken: token },
    });
    tx.set(profileRef, { [`teams.${teamId}`]: '' }, { merge: true });
  });

  await writeEvent(db, {
    teamId,
    actorUid: uid,
    type: 'member.join',
    payload: { nickname },
  });

  return teamId;
}

/** 팀장 지정 요청 생성 (S6 — teams/{id}/leaderRequests/{targetUid}). */
export async function requestLeadership(teamId: string, requesterUid: string, targetUid: string): Promise<void> {
  const db = getDb();
  const reqRef = doc(db, 'teams', teamId, 'leaderRequests', targetUid);
  await setDoc(reqRef, {
    targetUid,
    requesterUid,
    status: 'pending',
    at: serverTimestamp(),
  });
  await writeEvent(db, {
    teamId,
    actorUid: requesterUid,
    type: 'leader.request',
    payload: { targetUid },
  });
}

/** 팀장 지정 대상자의 승인 → 팀 문서 leaderUid 교체는 트랜잭션으로 (동시 승인 시 1인만). */
export async function approveLeadership(teamId: string, targetUid: string): Promise<void> {
  const db = getDb();
  const reqRef = doc(db, 'teams', teamId, 'leaderRequests', targetUid);
  const teamRef = doc(db, 'teams', teamId);

  await updateDoc(reqRef, { status: 'approved' });
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(teamRef);
    if (!snap.exists()) throw new Error('팀을 찾을 수 없어요');
    const team = snap.data() as Team;
    if (team.leaderUid) throw new Error('팀장이 이미 있어요');
    tx.update(teamRef, { leaderUid: targetUid });
  });

  // 나머지 요청 무효화 — 팀장이 된 본인이 진행
  await writeEvent(db, {
    teamId,
    actorUid: targetUid,
    type: 'leader.approve',
    payload: { targetUid },
  });
}

/** 팀장의 보관(archive) — 읽기 전용 전환 (규칙 팀장 절). */
export async function archiveTeam(teamId: string, leaderUid: string): Promise<void> {
  await writeEvent(getDb(), {
    teamId,
    actorUid: leaderUid,
    type: 'team.archive',
    payload: {},
    mutations: [{ kind: 'update', ref: doc(getDb(), 'teams', teamId), data: { archived: true } }],
  });
}

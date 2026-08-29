/**
 * 규칙 13케이스 — 프로젝트 첫 게이트 (S10).
 * 이 스위트가 통과하기 전에는 어떤 기능 코드도 쓰지 않는다.
 *
 * 실행: bun run test:rules  (Firestore 에뮬레이터 위)
 */
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const LEADER = 'uid_leader';
const MEMBER = 'uid_member';
const OUTSIDER = 'uid_outsider';
const CANDIDATE_B = 'uid_b';
const CANDIDATE_C = 'uid_c';

const TEAM = 'team_active';
const ARCHIVED_TEAM = 'team_archived';
const NO_LEADER_TEAM = 'team_no_leader';
const OTHER_TEAM = 'team_other';

const TOKEN = 'invite_token_active';
const OTHER_TOKEN = 'invite_token_other';

let env: RulesTestEnvironment;

const memberEntry = (nickname: string) => ({
  nickname,
  roleLabel: '',
  joinedAt: Timestamp.fromDate(new Date('2026-08-01T00:00:00Z')),
});

beforeAll(async () => {
  setLogLevel('error');
  env = await initializeTestEnvironment({
    projectId: 'demo-teamledger',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const baseTeam = {
      name: '인공지능공학과 · 기계학습 팀프로젝트 4조',
      courseLabel: '기계학습',
      goal: '캠퍼스 혼잡도 예측 모델 개발 및 발표',
      startAt: Timestamp.fromDate(new Date('2026-08-01T00:00:00Z')),
      dueAt: Timestamp.fromDate(new Date('2026-09-05T00:00:00Z')),
      weights: { doc: 1, file: 1, task: 1, meeting: 1, note: 1 },
      archived: false,
      deleted: false,
    };

    await setDoc(doc(db, 'teams', TEAM), {
      ...baseTeam,
      leaderUid: LEADER,
      members: { [LEADER]: memberEntry('팀장'), [MEMBER]: memberEntry('멤버') },
    });

    await setDoc(doc(db, 'teams', ARCHIVED_TEAM), {
      ...baseTeam,
      archived: true,
      leaderUid: LEADER,
      members: { [LEADER]: memberEntry('팀장'), [MEMBER]: memberEntry('멤버') },
    });

    await setDoc(doc(db, 'teams', NO_LEADER_TEAM), {
      ...baseTeam,
      leaderUid: null,
      members: {
        [MEMBER]: memberEntry('멤버'),
        [CANDIDATE_B]: memberEntry('B'),
        [CANDIDATE_C]: memberEntry('C'),
      },
    });

    await setDoc(doc(db, 'teams', OTHER_TEAM), {
      ...baseTeam,
      leaderUid: OUTSIDER,
      members: { [OUTSIDER]: memberEntry('외부인') },
    });

    await setDoc(doc(db, 'invites', TOKEN), {
      teamId: TEAM,
      createdBy: LEADER,
      createdAt: Timestamp.fromDate(new Date('2026-08-02T00:00:00Z')),
    });
    await setDoc(doc(db, 'invites', OTHER_TOKEN), {
      teamId: OTHER_TEAM,
      createdBy: OUTSIDER,
      createdAt: Timestamp.fromDate(new Date('2026-08-02T00:00:00Z')),
    });

    await setDoc(doc(db, 'teams', TEAM, 'events', 'seeded_event'), {
      actorUid: LEADER,
      type: 'doc.edit',
      payload: { docId: 'd1', charsDelta: 100 },
      at: Timestamp.fromDate(new Date('2026-08-10T00:00:00Z')),
    });

    for (const uid of [CANDIDATE_B, CANDIDATE_C]) {
      await setDoc(doc(db, 'teams', NO_LEADER_TEAM, 'leaderRequests', uid), {
        targetUid: uid,
        requesterUid: MEMBER,
        status: 'pending',
        at: Timestamp.fromDate(new Date('2026-08-11T00:00:00Z')),
      });
    }
  });
});

// rules-unit-testing 이 번들한 Firestore 타입 선언과 앱이 쓰는 firebase v12 의 선언이
// 서로 다른 사본이라 구조적으로 호환되지 않는다. 런타임 객체는 동일하므로
// 경계 한 곳에서만 앱 쪽 타입으로 맞추고, 테스트 본문은 실제 API 로 타입 검사한다.
const asUser = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const asAnonymousVisitor = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

describe('firestore.rules — strict 다중사용자 13케이스', () => {
  it('① 미인증 사용자는 팀 문서를 읽지도 쓰지도 못한다', async () => {
    const db = asAnonymousVisitor();
    await assertFails(getDoc(doc(db, 'teams', TEAM)));
    await assertFails(
      setDoc(doc(db, 'teams', TEAM, 'events', 'x'), {
        actorUid: 'anyone',
        type: 'message.post',
        payload: {},
        at: serverTimestamp(),
      }),
    );
    await assertFails(getDoc(doc(db, 'users', MEMBER)));
  });

  it('② 비멤버는 팀 문서·서브컬렉션을 읽지 못한다 (get·list 모두)', async () => {
    const db = asUser(OUTSIDER);
    await assertFails(getDoc(doc(db, 'teams', TEAM)));
    await assertFails(getDocs(collection(db, 'teams', TEAM, 'events')));
    await assertFails(getDocs(collection(db, 'teams', TEAM, 'messages')));
    // 「로그인만 하면 보인다」 금지 — 전역 teams 열거도 차단
    await assertFails(getDocs(collection(db, 'teams')));
  });

  it('③ 비멤버는 팀 서브컬렉션에 쓰지 못한다', async () => {
    const db = asUser(OUTSIDER);
    await assertFails(
      setDoc(doc(db, 'teams', TEAM, 'tasks', 't1'), {
        title: '침입',
        actorUid: OUTSIDER,
        assigneeUid: OUTSIDER,
        status: 'todo',
      }),
    );
    await assertFails(
      setDoc(doc(db, 'teams', TEAM, 'events', 'e_intruder'), {
        actorUid: OUTSIDER,
        type: 'message.post',
        payload: {},
        at: serverTimestamp(),
      }),
    );
  });

  it('④ invites 는 list 로 열거할 수 없다 (get 은 토큰을 알아야 가능)', async () => {
    const db = asUser(MEMBER);
    await assertFails(getDocs(collection(db, 'invites')));
    await assertSucceeds(getDoc(doc(db, 'invites', TOKEN)));
  });

  it('⑤ invites 는 삭제할 수 없다', async () => {
    await assertFails(deleteDoc(doc(asUser(MEMBER), 'invites', TOKEN)));
    await assertFails(deleteDoc(doc(asUser(LEADER), 'invites', TOKEN)));
  });

  it('⑥ events 는 update·delete 가 막혀 있다 (append-only)', async () => {
    const db = asUser(LEADER);
    await assertFails(updateDoc(doc(db, 'teams', TEAM, 'events', 'seeded_event'), { type: '조작됨' }));
    await assertFails(deleteDoc(doc(db, 'teams', TEAM, 'events', 'seeded_event')));
  });

  it('⑦ events 의 at 이 서버 시각이 아니면 거부된다', async () => {
    const db = asUser(MEMBER);
    await assertFails(
      setDoc(doc(db, 'teams', TEAM, 'events', 'e_client_time'), {
        actorUid: MEMBER,
        type: 'message.post',
        payload: { chars: 10 },
        at: Timestamp.fromDate(new Date('2026-07-01T00:00:00Z')),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, 'teams', TEAM, 'events', 'e_server_time'), {
        actorUid: MEMBER,
        type: 'message.post',
        payload: { chars: 10 },
        at: serverTimestamp(),
      }),
    );
  });

  it('⑧ events 의 actorUid 가 본인이 아니면 거부된다', async () => {
    const db = asUser(MEMBER);
    await assertFails(
      setDoc(doc(db, 'teams', TEAM, 'events', 'e_spoof'), {
        actorUid: LEADER,
        type: 'doc.edit',
        payload: { charsDelta: 9999 },
        at: serverTimestamp(),
      }),
    );
  });

  it('⑨ 합류 절은 members[본인] 추가 하나만 허용한다', async () => {
    const db = asUser(OUTSIDER);

    // 다른 필드를 함께 바꾸면 거부
    await assertFails(
      updateDoc(doc(db, 'teams', TEAM), {
        [`members.${OUTSIDER}`]: { ...memberEntry('새 멤버'), inviteToken: TOKEN },
        name: '탈취된 팀 이름',
      }),
    );

    // 다른 팀을 가리키는 토큰으로는 합류 불가
    await assertFails(
      updateDoc(doc(db, 'teams', TEAM), {
        [`members.${OUTSIDER}`]: { ...memberEntry('새 멤버'), inviteToken: OTHER_TOKEN },
      }),
    );

    // 토큰 없이 합류 불가
    await assertFails(
      updateDoc(doc(db, 'teams', TEAM), {
        [`members.${OUTSIDER}`]: memberEntry('새 멤버'),
      }),
    );

    // 남의 uid 를 끼워 넣을 수 없다
    await assertFails(
      updateDoc(doc(db, 'teams', TEAM), {
        [`members.${OUTSIDER}`]: { ...memberEntry('새 멤버'), inviteToken: TOKEN },
        [`members.uid_stranger`]: { ...memberEntry('유령'), inviteToken: TOKEN },
      }),
    );

    // 유효한 토큰 + 본인 추가 단일 변경만 통과
    await assertSucceeds(
      updateDoc(doc(db, 'teams', TEAM), {
        [`members.${OUTSIDER}`]: { ...memberEntry('새 멤버'), inviteToken: TOKEN },
      }),
    );
  });

  it('⑩ 타인의 members 항목을 지울 수 없다', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER), 'teams', TEAM), { [`members.${LEADER}`]: deleteField() }),
    );
    // 팀장도 members 키 집합은 바꿀 수 없다 (강제 탈퇴 금지)
    await assertFails(
      updateDoc(doc(asUser(LEADER), 'teams', TEAM), { [`members.${MEMBER}`]: deleteField() }),
    );
  });

  it('⑪ 비팀장은 보관·역할 배정·기간 변경을 할 수 없다', async () => {
    const db = asUser(MEMBER);
    await assertFails(updateDoc(doc(db, 'teams', TEAM), { archived: true }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM), { deleted: true }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM), { [`members.${MEMBER}.roleLabel`]: '발표' }));
    await assertFails(
      updateDoc(doc(db, 'teams', TEAM), {
        dueAt: Timestamp.fromDate(new Date('2026-12-31T00:00:00Z')),
      }),
    );

    // 팀장은 통과한다 (같은 계약의 반대편)
    const leaderDb = asUser(LEADER);
    await assertSucceeds(updateDoc(doc(leaderDb, 'teams', TEAM), { [`members.${MEMBER}.roleLabel`]: '발표' }));
    await assertSucceeds(updateDoc(doc(leaderDb, 'teams', TEAM), { archived: true }));
  });

  it('⑫ 팀장 승인으로 교체되고, 동시 요청이 둘이어도 팀장은 1인이다', async () => {
    const bDb = asUser(CANDIDATE_B);
    const cDb = asUser(CANDIDATE_C);

    // 대상자 본인만 자기 요청을 승인할 수 있다
    await assertFails(updateDoc(doc(cDb, 'teams', NO_LEADER_TEAM, 'leaderRequests', CANDIDATE_B), { status: 'approved' }));
    await assertSucceeds(updateDoc(doc(bDb, 'teams', NO_LEADER_TEAM, 'leaderRequests', CANDIDATE_B), { status: 'approved' }));
    await assertSucceeds(updateDoc(doc(cDb, 'teams', NO_LEADER_TEAM, 'leaderRequests', CANDIDATE_C), { status: 'approved' }));

    // 승인받지 않은 사람은 팀장이 될 수 없다
    await assertFails(updateDoc(doc(asUser(MEMBER), 'teams', NO_LEADER_TEAM), { leaderUid: MEMBER }));

    // 먼저 도착한 승인 1건만 팀장이 된다
    await assertSucceeds(updateDoc(doc(bDb, 'teams', NO_LEADER_TEAM), { leaderUid: CANDIDATE_B }));
    await assertFails(updateDoc(doc(cDb, 'teams', NO_LEADER_TEAM), { leaderUid: CANDIDATE_C }));
  });

  it('⑬ 보관된 팀에는 쓸 수 없다', async () => {
    const db = asUser(MEMBER);
    await assertFails(
      setDoc(doc(db, 'teams', ARCHIVED_TEAM, 'events', 'e_after_archive'), {
        actorUid: MEMBER,
        type: 'message.post',
        payload: { chars: 1 },
        at: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, 'teams', ARCHIVED_TEAM, 'tasks', 't_after_archive'), {
        title: '보관 후 추가',
        actorUid: MEMBER,
        assigneeUid: MEMBER,
        status: 'todo',
      }),
    );
    // 읽기는 계속 가능 — 보관함의 목적
    await assertSucceeds(getDoc(doc(db, 'teams', ARCHIVED_TEAM)));
  });
});

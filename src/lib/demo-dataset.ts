/**
 * 데모 데이터셋 — 방문자별 복제 (A.10 개정, G3).
 *
 * 모든 시각은 부트스트랩 기준 상대 시각 { day, hour, minute } 로 정의한다.
 * day < 0 과거, day > 0 미래. 절대 시각 환산은 buildDemoDataset(bootstrap) 이 유일하게 수행한다.
 *
 * 방문자 uid 는 김민지(팀장) 자리를 차지한다 — 심사위원이 방문만으로
 * 자기 전용 1개월치 팀플 기록을 받는다. 데모 팀에는 초대 링크를 만들지 않는다.
 *
 * Spark 쓰기 한도 방어: 1회 부트스트랩당 쓰기 약 250~350건.
 * DEMO_DATASET_WRITE_CAP 을 초과하는 항목을 만들지 않는다 (무한 증식 방지).
 */
import type { EventType, ContributionWeights } from './types';
import { DEFAULT_WEIGHTS } from './types';
import { DEMO_CHAT, type DemoChatLine } from './demo/chat';
import { DEMO_DOCS, DEMO_FILES, DEMO_FILE_COMMENTS, type DemoDocDef, type DemoFileDef, type DemoFileCommentDef } from './demo/docs';
import { DEMO_MEETINGS, type DemoMeetingDef } from './demo/meetings';
import {
  DEMO_ARCHIVED_TEAM_NAME,
  DEMO_COURSE_LABEL,
  DEMO_DATASET_WRITE_CAP,
  DEMO_GOAL,
  DEMO_MEMBERS,
  DEMO_STUDENT_IDS,
  DEMO_TEAM_NAME,
  type DemoMemberDef,
} from './demo/people';
import { DEMO_DEADLINE_TASKS, DEMO_MILESTONES, DEMO_TASKS, type DemoTaskDef } from './demo/tasks';
import type { RelativeStamp } from './demo/stamp';
import { estimateDemoWrites } from './demo/writes';

export { estimateDemoWrites };
export {
  DEMO_ARCHIVED_TEAM_NAME,
  DEMO_CHAT,
  DEMO_COURSE_LABEL,
  DEMO_DATASET_WRITE_CAP,
  DEMO_DEADLINE_TASKS,
  DEMO_DOCS,
  DEMO_FILES,
  DEMO_FILE_COMMENTS,
  DEMO_GOAL,
  DEMO_MEETINGS,
  DEMO_MEMBERS,
  DEMO_MILESTONES,
  DEMO_STUDENT_IDS,
  DEMO_TASKS,
  DEMO_TEAM_NAME,
};
export type {
  DemoChatLine,
  DemoDocDef,
  DemoFileCommentDef,
  DemoFileDef,
  DemoMeetingDef,
  DemoMemberDef,
  DemoTaskDef,
  RelativeStamp,
};

export interface DemoDataset {
  teamId: string;
  archivedTeamId: string;
  team: {
    name: string;
    courseLabel: string;
    goal: string;
    startAt: Date;
    dueAt: Date;
    leaderUid: string;
    members: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }>;
    weights: ContributionWeights;
    archived: boolean;
    deleted: boolean;
    createdAt: Date;
  };
  archivedTeam: {
    name: string;
    courseLabel: string;
    goal: string;
    startAt: Date;
    dueAt: Date;
    leaderUid: string;
    members: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }>;
    weights: ContributionWeights;
    archived: boolean;
    deleted: boolean;
    createdAt: Date;
  };
  events: { type: EventType; actorUid: string; payload: Record<string, unknown>; at: Date }[];
  messages: { actorUid: string; text: string; at: Date }[];
  tasks: { id: string; title: string; desc?: string; actorUid: string; assigneeUid: string; dueAt: Date; status: 'done' | 'todo'; doneAt?: Date; milestoneId?: string; milestoneStartAt?: Date; order: number }[];
  docs: { title: string; versions: { body: string; charsDelta: number; actorUid: string; at: Date; version: number }[] }[];
  files: { name: string; contentType: string; sizeBytes: number; actorUid: string; caption: string; uploadedAt: Date }[];
  fileComments: { fileIndex: number; actorUid: string; text: string; at: Date }[];
  meetings: { title: string; startedAt: Date; durationMin: number; place: string; online: boolean; attendeeUids: string[]; summary3: string; body: string; actorUid: string }[];
}

export function buildDemoDataset(visitorUid: string, bootstrap: Date): DemoDataset {
  const at = (rel: RelativeStamp): Date =>
    new Date(
      bootstrap.getTime() + rel.day * 86400000 + (rel.hour ?? 0) * 3600000 + (rel.minute ?? 0) * 60000,
    );

  const uids = DEMO_MEMBERS.map((m, i) => (i === 0 ? visitorUid : m.placeholderUid));
  const uidOf = (i: number): string => uids[i];
  const teamId = 'demo-' + visitorUid;
  const archivedTeamId = 'demo-archive-' + visitorUid;

  const teamStart = at({ day: -30, hour: 0 });
  const teamDue = at({ day: 6, hour: 23, minute: 59 });

  const memberEntries: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }> = {};
  DEMO_MEMBERS.forEach((m, i) => {
    memberEntries[uidOf(i)] = {
      nickname: m.nickname,
      roleLabel: m.roleLabel,
      joinedAt: i === 0 ? teamStart : at({ day: -29, hour: 9 }),
      // 데모 전용 창작물 — 실제 유저 수집 항목이 아니다 (C6)
      studentId: m.studentId,
    };
  });

  const archivedMembers: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }> = {
    [uidOf(0)]: { nickname: '김민지', roleLabel: '팀장', joinedAt: at({ day: -200, hour: 9 }), studentId: DEMO_STUDENT_IDS[0] },
    [uidOf(1)]: { nickname: '박준호', roleLabel: '모델링', joinedAt: at({ day: -200, hour: 9 }), studentId: DEMO_STUDENT_IDS[1] },
    [uidOf(2)]: { nickname: '이서연', roleLabel: '발표', joinedAt: at({ day: -200, hour: 9 }), studentId: DEMO_STUDENT_IDS[2] },
  };

  const events: DemoDataset['events'] = [];

  // 팀 생성 + 보관 팀의 과거 활동
  events.push({ type: 'team.create', actorUid: visitorUid, payload: { name: DEMO_TEAM_NAME }, at: teamStart });
  const archivedStart = at({ day: -200, hour: 9 });
  events.push({ type: 'doc.edit', actorUid: uidOf(0), payload: { docTitle: 'ERD 설계', charsDelta: 2100 }, at: at({ day: -190, hour: 11 }) });
  events.push({ type: 'task.complete', actorUid: uidOf(1), payload: { title: '정규화 과제 완료', onTime: true }, at: at({ day: -180, hour: 15 }) });
  events.push({ type: 'meeting.attend', actorUid: uidOf(2), payload: {}, at: at({ day: -170, hour: 14 }) });
  events.push({ type: 'message.post', actorUid: uidOf(0), payload: { chars: 42 }, at: at({ day: -165, hour: 10 }) });

  // 대화 — message + message.post 2벌
  const messages: DemoDataset['messages'] = [];
  for (const line of DEMO_CHAT) {
    const when = at(line);
    messages.push({ actorUid: uidOf(line.speaker), text: line.text, at: when });
    events.push({ type: 'message.post', actorUid: uidOf(line.speaker), payload: { chars: line.text.length }, at: when });
  }

  // 회의 + 참석
  const meetings: DemoDataset['meetings'] = [];
  DEMO_MEETINGS.forEach((m) => {
    meetings.push({
      title: m.title,
      startedAt: at(m.started),
      durationMin: m.durationMin,
      place: m.place,
      online: m.online,
      attendeeUids: m.attendees.map(uidOf),
      summary3: m.summary3,
      body: m.body,
      actorUid: uidOf(0),
    });
    events.push({ type: 'meeting.create', actorUid: uidOf(0), payload: { title: m.title }, at: at(m.started) });
    for (const attendeeIndex of m.attendees) {
      events.push({ type: 'meeting.attend', actorUid: uidOf(attendeeIndex), payload: { title: m.title }, at: at(m.started) });
    }
  });

  // 할 일 + 생성·완료 이벤트
  const tasks: DemoDataset['tasks'] = [];
  for (const t of [...DEMO_TASKS, ...DEMO_MILESTONES]) {
    const dueAt = at(t.due);
    // admin Firestore 는 undefined 를 거부한다 — 선택 필드는 값이 있을 때만 실린다
    const task: DemoDataset['tasks'][number] = {
      id: t.key ?? `task-${t.order}`,
      title: t.title,
      actorUid: uidOf(0),
      assigneeUid: uidOf(t.assignee),
      dueAt,
      status: t.status,
      order: t.order,
    };
    if (t.desc !== undefined) task.desc = t.desc;
    if (t.done) task.doneAt = at(t.done);
    if (t.parentKey) task.milestoneId = t.parentKey;
    if (t.milestoneStartAt) task.milestoneStartAt = at(t.milestoneStartAt);
    tasks.push(task);
    events.push({
      type: 'task.create',
      actorUid: uidOf(0),
      payload: { title: t.title, assigneeUid: uidOf(t.assignee), milestoneId: t.parentKey ?? null },
      at: at({ day: Math.min(t.due.day - 1, t.milestoneStartAt?.day ?? t.due.day - 1), hour: 9 }),
    });
    if (t.status === 'done' && t.done) {
      const doneAt = at(t.done);
      // 정시 판정의 진실은 원장 at > task.dueAt 대조다 — payload.onTime 은 참고용
      const onTime = doneAt.getTime() <= dueAt.getTime();
      events.push({ type: 'task.complete', actorUid: uidOf(t.assignee), payload: { title: t.title, onTime }, at: doneAt });
    }
  }

  // 문서 + 버전 + doc.edit
  const docs: DemoDataset['docs'] = [];
  DEMO_DOCS.forEach((d) => {
    const versions = d.versions.map(([day, hour, actor, body, charsDelta], index) => {
      events.push({
        type: 'doc.edit',
        actorUid: uidOf(actor),
        payload: { docTitle: d.title, charsDelta, version: index + 1 },
        at: at({ day, hour }),
      });
      return { body, charsDelta, actorUid: uidOf(actor), at: at({ day, hour }), version: index + 1 };
    });
    docs.push({ title: d.title, versions });
  });

  // 파일 + file.upload, 첨삭 + file.comment
  const files: DemoDataset['files'] = [];
  DEMO_FILES.forEach((f) => {
    files.push({
      name: f.name,
      contentType: f.contentType,
      sizeBytes: f.sizeBytes,
      actorUid: uidOf(f.actor),
      caption: f.caption,
      uploadedAt: at(f.uploaded),
    });
    events.push({ type: 'file.upload', actorUid: uidOf(f.actor), payload: { fileName: f.name, sizeBytes: f.sizeBytes }, at: at(f.uploaded) });
  });
  const fileComments: DemoDataset['fileComments'] = [];
  DEMO_FILE_COMMENTS.forEach((c) => {
    fileComments.push({ fileIndex: c.fileIndex, actorUid: uidOf(c.actor), text: c.text, at: at(c.at) });
    events.push({ type: 'file.comment', actorUid: uidOf(c.actor), payload: { fileName: DEMO_FILES[c.fileIndex].name, chars: c.text.length }, at: at(c.at) });
  });

  // 오프라인 기여 수동 기록 1건 (팀 확인 하에)
  events.push({
    type: 'note.add',
    actorUid: uidOf(2),
    payload: { text: '발표장 예약·장비 대여·인쇄물 준비를 대행함', verifierUids: [uidOf(0), uidOf(1)] },
    at: at({ day: -2, hour: 17 }),
  });

  return {
    teamId,
    archivedTeamId,
    team: {
      name: DEMO_TEAM_NAME,
      courseLabel: DEMO_COURSE_LABEL,
      goal: DEMO_GOAL,
      startAt: teamStart,
      dueAt: teamDue,
      leaderUid: visitorUid,
      members: memberEntries,
      weights: { ...DEFAULT_WEIGHTS },
      archived: false,
      deleted: false,
      createdAt: teamStart,
    },
    archivedTeam: {
      name: DEMO_ARCHIVED_TEAM_NAME,
      courseLabel: '데이터베이스',
      goal: '도서관 대출 예약 시스템 설계',
      startAt: archivedStart,
      dueAt: at({ day: -160, hour: 23, minute: 59 }),
      leaderUid: visitorUid,
      members: archivedMembers,
      weights: { ...DEFAULT_WEIGHTS },
      archived: true,
      deleted: false,
      createdAt: archivedStart,
    },
    events,
    messages,
    tasks,
    docs,
    files,
    fileComments,
    meetings,
  };
}

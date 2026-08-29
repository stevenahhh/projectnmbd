import { describe, expect, it } from 'vitest';
import {
  DEMO_CHAT,
  DEMO_DATASET_WRITE_CAP,
  DEMO_DEADLINE_TASKS,
  DEMO_FILE_COMMENTS,
  DEMO_MEMBERS,
  DEMO_MILESTONES,
  DEMO_STUDENT_IDS,
  DEMO_TASKS,
  buildDemoDataset,
  estimateDemoWrites,
} from '@/lib/demo-dataset';

const BOOTSTRAP = new Date('2026-08-30T03:00:00Z');
const VISITOR = 'uid_visitor_abc';

describe('데모 데이터셋 (A.10 개정)', () => {
  it('대화는 80~120줄이다', () => {
    expect(DEMO_CHAT.length).toBeGreaterThanOrEqual(80);
    expect(DEMO_CHAT.length).toBeLessThanOrEqual(120);
  });

  it('팀원 4인 — 가상 실명·학번 형식·중복 금지', () => {
    expect(DEMO_MEMBERS.length).toBe(4);
    const ids = DEMO_STUDENT_IDS;
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) {
      expect(id).toMatch(/^20(2[2-6])([2-6]\d{3})$/);
    }
  });

  it('상대 시각이 절대 환산되고, dueAt은 부트스트랩 기준 D-6이다', () => {
    const ds = buildDemoDataset(VISITOR, BOOTSTRAP);
    expect(ds.team.dueAt.getTime() - BOOTSTRAP.getTime()).toBeCloseTo(6 * 86400000 + (23 * 60 + 59) * 60000, -2);
    expect(ds.team.startAt.getTime()).toBeLessThan(BOOTSTRAP.getTime());
    for (const msg of ds.messages) {
      // day 0 대화는 부트스트랩 당일이므로 실행 시각과 무관하게 부트스트랩+1일 이내다
      expect(msg.at.getTime()).toBeLessThanOrEqual(BOOTSTRAP.getTime() + 86400000);
    }
  });

  it('방문자가 민지(팀장) 자리를 차지하고 유령 uid는 방문자가 아니다', () => {
    const ds = buildDemoDataset(VISITOR, BOOTSTRAP);
    expect(ds.team.leaderUid).toBe(VISITOR);
    expect(ds.team.members[VISITOR].nickname).toBe('민지');
    expect(Object.keys(ds.team.members).length).toBe(4);
    for (const uid of Object.keys(ds.team.members)) {
      if (uid !== VISITOR) expect(uid.startsWith('demo-')).toBe(true);
    }
  });

  it('할 일 20건 이상, 완료·지연 완료·미완·마감 임박이 섞여 있다', () => {
    expect(DEMO_TASKS.length).toBeGreaterThanOrEqual(20);
    const statuses = DEMO_TASKS.map((t) => t.status);
    expect(statuses).toContain('done');
    expect(statuses).toContain('todo');
    // 지연 완료 — 완료가 마감보다 늦은 케이스 존재
    const lateDone = DEMO_TASKS.some((t) => t.status === 'done' && t.done && (t.done.day > t.due.day || (t.done.day === t.due.day && t.done.hour > t.due.hour)));
    expect(lateDone).toBe(true);
  });

  it('마감 알림 3단계가 각각 정확히 1회 트리거되는 dueAt 3건이다', () => {
    expect(DEMO_DEADLINE_TASKS.length).toBe(3);
    const hours = DEMO_DEADLINE_TASKS.map((t) => t.due.day * 24 + t.due.hour + (t.due.minute ?? 0) / 60);
    expect(hours).toEqual([20, 2, 0.5]);
  });

  it('문서 3개 × 버전 3~4, 파일 5개 + 첨삭, 회의 4건(오프라인 3·비대면 1), 마일스톤 4개 중 2개 진행 중', () => {
    const ds = buildDemoDataset(VISITOR, BOOTSTRAP);
    expect(ds.docs.length).toBe(3);
    for (const doc of ds.docs) {
      expect(doc.versions.length).toBeGreaterThanOrEqual(3);
      expect(doc.versions.length).toBeLessThanOrEqual(4);
    }
    expect(ds.files.length).toBe(5);
    expect(ds.fileComments.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_FILE_COMMENTS.length).toBeGreaterThan(0);
    expect(ds.meetings.length).toBe(4);
    expect(ds.meetings.filter((m) => !m.online).length).toBe(3);
    expect(ds.meetings.filter((m) => m.online).length).toBe(1);

    const bootstrap = BOOTSTRAP.getTime();
    const inProgress = DEMO_MILESTONES.filter((m) => {
      const start = m.milestoneStartAt!;
      const end = m.due;
      const startTime = BOOTSTRAP.getTime() + start.day * 86400000;
      const endTime = BOOTSTRAP.getTime() + end.day * 86400000;
      return startTime <= bootstrap && bootstrap < endTime;
    });
    expect(DEMO_MILESTONES.length).toBe(4);
    expect(inProgress.length).toBe(2);
  });

  it('태윤의 활동은 마지막 2일에 몰려 있다', () => {
    const taeyunUid = 'demo-taeyun';
    const ds = buildDemoDataset(VISITOR, BOOTSTRAP);
    const taeyunEvents = ds.events.filter((e) => e.actorUid === taeyunUid);
    expect(taeyunEvents.length).toBeGreaterThan(0);
    for (const e of taeyunEvents) {
      expect(e.at.getTime()).toBeGreaterThanOrEqual(BOOTSTRAP.getTime() - 2 * 86400000);
    }
  });

  it('총 쓰기 건수가 DEMO_DATASET_WRITE_CAP 이하다', () => {
    const ds = buildDemoDataset(VISITOR, BOOTSTRAP);
    const writes = estimateDemoWrites(ds);
    expect(writes).toBeLessThanOrEqual(DEMO_DATASET_WRITE_CAP);
    expect(writes).toBeGreaterThan(200);
  });

  it('보관된 지난 학기 팀이 1개 있다', () => {
    const ds = buildDemoDataset(VISITOR, BOOTSTRAP);
    expect(ds.archivedTeam.name).toContain('데이터베이스');
    expect(ds.archivedTeam.archived).toBe(true);
  });

  it('uid 마다 서로 다른 사본을 만든다 (방문자 간 격리)', () => {
    const a = buildDemoDataset('uid_a', BOOTSTRAP);
    const b = buildDemoDataset('uid_b', BOOTSTRAP);
    expect(a.teamId).not.toBe(b.teamId);
    expect(a.team.members['uid_a']).toBeDefined();
    expect(a.team.members['uid_b']).toBeUndefined();
  });
});

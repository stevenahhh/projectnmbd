import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Timestamp } from 'firebase/firestore';
import { ContributionPie } from '@/components/team/contribution-pie';
import { GanttPanel } from '@/components/team/gantt-panel';
import { PhraseRoller } from '@/components/phrase-roller';
import { LogsPanel } from '@/components/team/logs-panel';
import type { MemberContribution } from '@/lib/contribution';
import { DEFAULT_WEIGHTS, type LedgerEvent, type Team, type TeamTask } from '@/lib/types';

/** Firestore Timestamp 대역 — 화면은 toDate() 만 쓴다. */
const ts = (iso: string) => ({ toDate: () => new Date(iso) }) as Timestamp;

const TEAM: Team = {
  id: 'team1',
  name: '4조',
  courseLabel: '기계학습',
  goal: '발표',
  leaderUid: 'u1',
  members: {
    u1: { nickname: '김민지', roleLabel: '팀장 · 데이터', joinedAt: ts('2026-08-01T00:00:00Z') },
    u2: { nickname: '박준호', roleLabel: '모델링', joinedAt: ts('2026-08-01T00:00:00Z') },
  },
  weights: DEFAULT_WEIGHTS,
  startAt: ts('2026-08-01T00:00:00Z'),
  dueAt: ts('2026-09-01T00:00:00Z'),
  createdAt: ts('2026-08-01T00:00:00Z'),
  archived: false,
} as unknown as Team;

const raw = {
  docChars: 1200,
  fileCount: 2,
  commentCount: 1,
  taskAssigned: 4,
  taskDone: 3,
  taskOnTime: 3,
  meetingAttend: 2,
  noteCount: 0,
  messageCount: 9,
  activeDays: 6,
};

const member = (uid: string, percent: number): MemberContribution => ({
  uid,
  axes: { doc: 0, file: 0, task: 0, meeting: 0, note: 0 },
  raw,
  score: percent,
  percent,
  lastActiveAt: new Date('2026-08-28T00:00:00Z'),
  inactiveDays: null,
  inactive: false,
});

const event = (id: string, type: string, iso: string): LedgerEvent =>
  ({ id, actorUid: 'u1', type, payload: { title: '실험 표' }, at: ts(iso) }) as unknown as LedgerEvent;

describe('새 화면 렌더 스모크', () => {
  it('기여도 원 그래프는 이름과 비중을 그린다', () => {
    const html = renderToStaticMarkup(
      createElement(ContributionPie, { team: TEAM, members: [member('u1', 60), member('u2', 40)] }),
    );
    expect(html).toContain('김민지');
    expect(html).toContain('박준호');
    expect(html).toContain('60%');
    expect(html).toContain('<path');
  });

  it('기여 기록이 없으면 빈 상태를 알린다', () => {
    const html = renderToStaticMarkup(
      createElement(ContributionPie, { team: TEAM, members: [member('u1', 0), member('u2', 0)] }),
    );
    expect(html).toContain('아직 기여 기록이 없어요');
  });

  it('활동 로그는 건수와 사람·문장을 함께 보여준다', () => {
    const html = renderToStaticMarkup(
      createElement(LogsPanel, {
        team: TEAM,
        events: [event('e1', 'file.upload', '2026-08-28T02:00:00Z'), event('e2', 'task.complete', '2026-08-29T02:00:00Z')],
      }),
    );
    expect(html).toContain('활동 로그 2건');
    expect(html).toContain('김민지');
    expect(html).toContain('실험 표');
  });

  it('로그는 첫 묶음만 그리고 나머지는 스크롤로 이어붙인다', () => {
    const many = Array.from({ length: 70 }, (_, index) =>
      event(`e${index}`, 'file.upload', `2026-08-29T${String(index % 24).padStart(2, '0')}:00:00Z`),
    );
    const html = renderToStaticMarkup(createElement(LogsPanel, { team: TEAM, events: many }));
    expect(html).toContain('활동 로그 70건');
    expect(html.match(/실험 표/g) ?? []).toHaveLength(60);
    expect(html).toContain('남은 10건');
    expect(html).not.toContain('더 보기');
  });

  it('타임라인은 하위 항목을 들여쓰고 같은 날 마감을 점 하나로 묶는다', () => {
    const bar = (id: string, title: string, start: string, due: string, parent?: string) =>
      ({
        id,
        title,
        actorUid: 'u1',
        assigneeUid: 'u1',
        status: 'todo',
        order: 1,
        dueAt: ts(due),
        milestoneStartAt: ts(start),
        ...(parent ? { milestoneId: parent } : {}),
      }) as unknown as TeamTask;
    const deadline = (id: string, title: string, due: string) =>
      ({ id, title, actorUid: 'u1', assigneeUid: 'u1', status: 'todo', order: 2, dueAt: ts(due) }) as unknown as TeamTask;

    const html = renderToStaticMarkup(
      createElement(GanttPanel, {
        team: TEAM,
        uid: 'u1',
        events: [],
        tasks: [
          bar('ms2', '모델 학습', '2026-08-05T00:00:00Z', '2026-08-25T00:00:00Z'),
          bar('ms2b', 'baseline 학습', '2026-08-10T00:00:00Z', '2026-08-20T00:00:00Z', 'ms2'),
          deadline('t1', '리허설', '2026-08-18T02:00:00Z'),
          deadline('t2', '슬라이드', '2026-08-18T09:00:00Z'),
        ],
      }),
    );
    expect(html).toContain('모델 학습');
    expect(html).toContain('baseline 학습');
    // 자식 항목은 거터에서 이음선과 함께 들여쓴다
    expect(html).toContain('└');
    // 같은 날 마감 둘은 점 하나로 묶이고, 라벨 자리가 없으면 개수가 점 안에 들어간다
    expect(html).toMatch(/>2<\/text>/);
    // 제목은 막대 안에 흰 글씨로 들어간다
    expect(html).toMatch(/fill="#ffffff"[^>]*>모델 학습/);
  });

  it('완료된 마감은 기본으로 타임라인에서 빠진다', () => {
    const done = (id: string, title: string, due: string) =>
      ({
        id,
        title,
        actorUid: 'u1',
        assigneeUid: 'u1',
        status: 'done',
        order: 2,
        dueAt: ts(due),
      }) as unknown as TeamTask;
    const html = renderToStaticMarkup(
      createElement(GanttPanel, {
        team: TEAM,
        uid: 'u1',
        events: [],
        tasks: [
          done('d1', '끝난 일', '2026-08-10T02:00:00Z'),
          done('d2', '끝난 일 둘', '2026-08-12T02:00:00Z'),
        ],
      }),
    );
    // 마감 점(반지름 6~7)이 하나도 그려지지 않는다 — 아이콘의 원과 구분해 반지름으로 본다
    expect(html).not.toMatch(/<circle[^>]*r="[67]"/);
    expect(html).toContain('완료 포함');
  });

  it('기록이 없으면 로그도 빈 상태를 알린다', () => {
    const html = renderToStaticMarkup(createElement(LogsPanel, { team: TEAM, events: [] }));
    expect(html).toContain('해당하는 기록이 없어요');
  });
});

describe('캐치프레이즈 굴림', () => {
  it('모든 문구를 한 칸에 겹쳐 두고 하나만 보인다', () => {
    const html = renderToStaticMarkup(createElement(PhraseRoller, {}));
    // 겹쳐 둔 칸이 가장 긴 문구로 너비를 잡아야 뒷말이 흔들리지 않는다
    const stacked = html.match(/col-start-1 row-start-1/g) ?? [];
    expect(stacked.length).toBeGreaterThan(1);
    expect((html.match(/opacity-100/g) ?? [])).toHaveLength(1);
    // 강조는 정확히 한 줄에만
    expect((html.match(/phrase-shine/g) ?? [])).toHaveLength(1);
  });
});

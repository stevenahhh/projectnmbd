import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Timestamp } from 'firebase/firestore';
import { ContributionPie } from '@/components/team/contribution-pie';
import { LogsPanel } from '@/components/team/logs-panel';
import type { MemberContribution } from '@/lib/contribution';
import { DEFAULT_WEIGHTS, type LedgerEvent, type Team } from '@/lib/types';

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

  it('기록이 없으면 로그도 빈 상태를 알린다', () => {
    const html = renderToStaticMarkup(createElement(LogsPanel, { team: TEAM, events: [] }));
    expect(html).toContain('해당하는 기록이 없어요');
  });
});

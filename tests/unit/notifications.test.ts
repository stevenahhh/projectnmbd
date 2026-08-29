import { describe, expect, it } from 'vitest';
import { buildNotifications, inactiveThresholdDays, stageFor } from '@/lib/notifications';

const NOW = new Date('2026-08-29T09:00:00Z');

describe('stageFor — 3단계 경계', () => {
  const due = (msFromNow: number) => new Date(NOW.getTime() + msFromNow);

  it('24시간 이내면 내일 단계', () => {
    expect(stageFor(due(24 * 3600_000), NOW)).toBe('tomorrow');
    expect(stageFor(due(23 * 3600_000), NOW)).toBe('tomorrow');
  });

  it('24시간 초과는 알림 없음', () => {
    expect(stageFor(due(24 * 3600_000 + 1), NOW)).toBeNull();
    expect(stageFor(due(72 * 3600_000), NOW)).toBeNull();
  });

  it('3시간 경계', () => {
    expect(stageFor(due(3 * 3600_000), NOW)).toBe('hours3');
    expect(stageFor(due(3 * 3600_000 + 1), NOW)).toBe('tomorrow');
  });

  it('1시간 경계', () => {
    expect(stageFor(due(3600_000), NOW)).toBe('hour1');
    expect(stageFor(due(3600_000 + 1), NOW)).toBe('hours3');
  });

  it('마감 지나면 알림 없음 — 경과는 렌더 계산이다', () => {
    expect(stageFor(due(0), NOW)).toBeNull();
    expect(stageFor(due(-3600_000), NOW)).toBeNull();
  });
});

describe('buildNotifications', () => {
  it('단계별로 항목당 정확히 1건씩 만든다', () => {
    const items = [
      { id: 't1', title: '전처리 코드', dueAt: new Date(NOW.getTime() + 20 * 3600_000), status: 'todo' },
      { id: 't2', title: '실험', dueAt: new Date(NOW.getTime() + 2 * 3600_000), status: 'todo' },
      { id: 't3', title: '발표 자료', dueAt: new Date(NOW.getTime() + 30 * 60_000), status: 'todo' },
    ];
    const out = buildNotifications(items, NOW);
    expect(out.map((n) => n.stage)).toEqual(['hour1', 'hours3', 'tomorrow']);
    expect(out.filter((n) => n.itemId === 't1').length).toBe(1);
  });

  it('완료된 할 일은 알림을 만들지 않는다', () => {
    const items = [{ id: 't1', title: '끝난 일', dueAt: new Date(NOW.getTime() + 3600_000), status: 'done' }];
    expect(buildNotifications(items, NOW)).toEqual([]);
  });
});

describe('inactiveThresholdDays — 팀플 기간의 20%, 최소 1일', () => {
  it('2주 팀플이면 3일', () => {
    expect(inactiveThresholdDays(new Date('2026-08-01'), new Date('2026-08-15'))).toBe(3);
  });

  it('3일짜리 팀플이면 1일', () => {
    expect(inactiveThresholdDays(new Date('2026-08-01'), new Date('2026-08-04'))).toBe(1);
  });

  it('5주 팀플이면 7일', () => {
    expect(inactiveThresholdDays(new Date('2026-08-01'), new Date('2026-09-05'))).toBe(7);
  });
});

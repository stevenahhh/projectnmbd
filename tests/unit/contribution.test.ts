import { describe, expect, it } from 'vitest';
import { aggregateContribution, type AggregatableEvent, type AggregatableTask } from '@/lib/contribution';
import { DEFAULT_WEIGHTS } from '@/lib/types';

const START = new Date('2026-08-01T00:00:00Z');
const DUE = new Date('2026-09-05T00:00:00Z');
const NOW = new Date('2026-08-29T09:00:00Z');

const UIDS = ['u_mindy', 'u_junho', 'u_seoyeon', 'u_taeyun'];

function event(uid: string, type: AggregatableEvent['type'], at: string | null, payload: Record<string, unknown> = {}): AggregatableEvent {
  return { actorUid: uid, type, payload, at: at ? new Date(at) : null };
}

function task(id: string, assignee: string, dueAt: string, status: 'todo' | 'done'): AggregatableTask {
  return { id, assigneeUid: assignee, dueAt: new Date(dueAt), status };
}

describe('기여도 집계 (A.6)', () => {
  it('정규화 축의 가중치 합으로 % 가 나오고, 4인 합이 100이다', () => {
    const events: AggregatableEvent[] = [
      event('u_mindy', 'doc.edit', '2026-08-10T05:00:00Z', { charsDelta: 2400 }),
      event('u_junho', 'doc.edit', '2026-08-11T05:00:00Z', { charsDelta: 1200 }),
      event('u_mindy', 'file.upload', '2026-08-12T05:00:00Z', {}),
      event('u_junho', 'meeting.attend', '2026-08-12T06:00:00Z', {}),
      event('u_seoyeon', 'note.add', '2026-08-13T05:00:00Z', {}),
    ];
    const result = aggregateContribution({
      memberUids: UIDS,
      events,
      tasks: [],
      weights: DEFAULT_WEIGHTS,
      startAt: START,
      dueAt: DUE,
      now: NOW,
    });

    const sum = result.members.reduce((acc, m) => acc + m.percent, 0);
    expect(sum).toBeCloseTo(100, 5);
    expect(result.members[0].uid).toBe('u_mindy');
  });

  it('doc 축은 감소분을 합산하지 않는다 — 복붙 게이밍 방지', () => {
    const events: AggregatableEvent[] = [
      event('u_mindy', 'doc.edit', '2026-08-10T05:00:00Z', { charsDelta: 3000 }),
      event('u_mindy', 'doc.edit', '2026-08-10T06:00:00Z', { charsDelta: -2800 }),
      event('u_junho', 'doc.edit', '2026-08-11T05:00:00Z', { charsDelta: 1500 }),
    ];
    const result = aggregateContribution({
      memberUids: ['u_mindy', 'u_junho'],
      events,
      tasks: [],
      weights: DEFAULT_WEIGHTS,
      startAt: START,
      dueAt: DUE,
      now: NOW,
    });

    const mindy = result.members.find((m) => m.uid === 'u_mindy')!;
    expect(mindy.raw.docChars).toBe(3000);
  });

  it('정시 판정은 원장 at > task.dueAt 대조가 이긴다 — payload.onTime 을 신뢰하지 않는다', () => {
    const events: AggregatableEvent[] = [
      // 마감 후 완료인데 payload 는 onTime: true 로 위조
      event('u_mindy', 'task.complete', '2026-08-20T13:00:00Z', { taskId: 't1', onTime: true }),
      event('u_junho', 'task.complete', '2026-08-15T09:00:00Z', { taskId: 't2', onTime: true }),
    ];
    const tasks: AggregatableTask[] = [
      task('t1', 'u_mindy', '2026-08-20T10:00:00Z', 'done'), // 3시간 지연
      task('t2', 'u_junho', '2026-08-16T00:00:00Z', 'done'),
    ];
    const result = aggregateContribution({
      memberUids: ['u_mindy', 'u_junho'],
      events,
      tasks,
      weights: DEFAULT_WEIGHTS,
      startAt: START,
      dueAt: DUE,
      now: NOW,
    });

    expect(result.members.find((m) => m.uid === 'u_mindy')!.raw.taskOnTime).toBe(0);
    expect(result.members.find((m) => m.uid === 'u_junho')!.raw.taskOnTime).toBe(1);
  });

  it('활동일은 참고축 — 종합 점수에 들어가지 않는다', () => {
    // u_mindy 는 10일 매일 접속(메시지만), u_junho 는 1일 접속 + 문서 3000자
    const events: AggregatableEvent[] = [
      ...Array.from({ length: 10 }, (_, i) => event('u_mindy', 'message.post', `2026-08-${10 + i}T05:00:00Z`, { chars: 5 })),
      event('u_junho', 'doc.edit', '2026-08-12T05:00:00Z', { charsDelta: 3000 }),
    ];
    const result = aggregateContribution({
      memberUids: ['u_mindy', 'u_junho'],
      events,
      tasks: [],
      weights: DEFAULT_WEIGHTS,
      startAt: START,
      dueAt: DUE,
      now: NOW,
    });

    expect(result.members.find((m) => m.uid === 'u_mindy')!.raw.activeDays).toBe(10);
    expect(result.members.find((m) => m.uid === 'u_mindy')!.percent).toBe(0);
    expect(result.members.find((m) => m.uid === 'u_junho')!.percent).toBe(100);
  });

  it('최대 기여자가 60% 이상이면 쏠림 분포 표시 대상이다 — 판단어는 없다', () => {
    const events: AggregatableEvent[] = [
      event('u_mindy', 'doc.edit', '2026-08-10T05:00:00Z', { charsDelta: 9000 }),
      event('u_junho', 'doc.edit', '2026-08-11T05:00:00Z', { charsDelta: 1000 }),
    ];
    const result = aggregateContribution({
      memberUids: ['u_mindy', 'u_junho'],
      events,
      tasks: [],
      weights: DEFAULT_WEIGHTS,
      startAt: START,
      dueAt: DUE,
      now: NOW,
    });

    expect(result.concentrated).toBe(true);
    expect(result.topShare).toBeGreaterThanOrEqual(0.6);
  });

  it('태윤이 마지막 2일에 몰면 시간축 타임라인에 그대로 보인다', () => {
    const events: AggregatableEvent[] = [
      event('u_taeyun', 'doc.edit', '2026-08-27T05:00:00Z', { charsDelta: 100 }),
      event('u_taeyun', 'doc.edit', '2026-08-28T05:00:00Z', { charsDelta: 100 }),
      event('u_taeyun', 'doc.edit', '2026-08-28T07:00:00Z', { charsDelta: 100 }),
      event('u_mindy', 'doc.edit', '2026-08-05T05:00:00Z', { charsDelta: 100 }),
    ];
    const result = aggregateContribution({
      memberUids: ['u_taeyun', 'u_mindy'],
      events,
      tasks: [],
      weights: DEFAULT_WEIGHTS,
      startAt: START,
      dueAt: DUE,
      now: NOW,
    });

    const taeyun = result.timeline.u_taeyun;
    const taeyunDays = Object.keys(taeyun);
    expect(taeyunDays.length).toBe(2);
    expect(taeyunDays.every((d) => d >= '2026-08-27')).toBe(true);
  });

  it('비활동 경고는 사실만 — 임계 이상 활동 없는 멤버에게 표시된다', () => {
    const events: AggregatableEvent[] = [
      event('u_mindy', 'doc.edit', '2026-08-10T05:00:00Z', { charsDelta: 100 }),
      event('u_junho', 'doc.edit', '2026-08-27T05:00:00Z', { charsDelta: 100 }),
    ];
    const result = aggregateContribution({
      memberUids: ['u_mindy', 'u_junho'],
      events,
      tasks: [],
      weights: DEFAULT_WEIGHTS,
      startAt: START,
      dueAt: DUE,
      now: NOW,
    });

    const mindy = result.members.find((m) => m.uid === 'u_mindy')!;
    expect(mindy.inactive).toBe(true);
    expect(mindy.inactiveDays).toBeGreaterThanOrEqual(result.inactiveThreshold);
    expect(result.members.find((m) => m.uid === 'u_junho')!.inactive).toBe(false);
  });
});

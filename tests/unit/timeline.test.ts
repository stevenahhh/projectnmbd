import { describe, expect, it } from 'vitest';
import { SNAP_MS, dragRange, groupByDay, monthTicks, snapToHalfHour, stamp, toLocalInputValue } from '@/lib/timeline';

const at = (iso: string) => new Date(iso).getTime();

describe('타임라인 좌표·시간 계산', () => {
  it('30분 격자로 스냅한다', () => {
    expect(snapToHalfHour(at('2026-08-01T19:14:00'))).toBe(at('2026-08-01T19:00:00'));
    expect(snapToHalfHour(at('2026-08-01T19:16:00'))).toBe(at('2026-08-01T19:30:00'));
  });

  it('말풍선 표기는 2026/08/01 19:00 형식이다', () => {
    expect(stamp(at('2026-08-01T19:00:00'))).toBe('2026/08/01 19:00');
  });

  it('datetime-local 입력값은 로컬 시각 그대로다', () => {
    expect(toLocalInputValue(new Date('2026-08-01T09:05:00'))).toBe('2026-08-01T09:05');
    expect(toLocalInputValue(null)).toBe('');
  });

  describe('드래그', () => {
    const start = at('2026-08-01T10:00:00');
    const end = at('2026-08-03T10:00:00');

    it('이동은 기간 길이를 그대로 유지한다', () => {
      const moved = dragRange('move', start, end, 3 * 3600_000 + 5 * 60_000);
      expect(moved.endMs - moved.startMs).toBe(end - start);
      expect(moved.startMs).toBe(at('2026-08-01T13:00:00'));
    });

    it('시작 끝을 끌면 마감보다 최소 30분 앞에서 멈춘다', () => {
      const resized = dragRange('start', start, end, 10 * 86400_000);
      expect(resized.startMs).toBe(end - SNAP_MS);
      expect(resized.endMs).toBe(end);
    });

    it('마감 끝을 끌면 시작보다 최소 30분 뒤에서 멈춘다', () => {
      const resized = dragRange('end', start, end, -10 * 86400_000);
      expect(resized.endMs).toBe(start + SNAP_MS);
      expect(resized.startMs).toBe(start);
    });
  });

  it('월 눈금은 구간에 걸친 매월 1일만 만든다', () => {
    const ticks = monthTicks(at('2026-08-10T00:00:00'), at('2026-10-05T00:00:00'));
    expect(ticks.map((tick) => tick.label)).toEqual(['9월', '10월']);
    expect(ticks[0].x).toBeGreaterThan(0);
  });

  it('같은 날 마감은 하나로 묶고 오래된 날짜가 앞에 온다', () => {
    const groups = groupByDay([
      { ms: at('2026-08-31T23:00:00'), item: 'b' },
      { ms: at('2026-08-30T09:00:00'), item: 'a' },
      { ms: at('2026-08-31T09:00:00'), item: 'c' },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toEqual(['a']);
    expect(groups[1].items).toEqual(['b', 'c']);
  });
});

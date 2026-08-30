import { describe, expect, it } from 'vitest';
import { canReparent, layoutTree } from '@/lib/timeline-tree';
import {
  DAY_MS,
  HOUR_MS,
  SNAP_MS,
  dragRange,
  generateTicks,
  groupByDay,
  niceStep,
  packMarkers,
  snapStepFor,
  snapToHalfHour,
  stamp,
  toLocalInputValue,
  zoomRange,
} from '@/lib/timeline';

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
      const moved = dragRange('move', start, end, 3 * HOUR_MS + 5 * 60_000);
      expect(moved.endMs - moved.startMs).toBe(end - start);
      expect(moved.startMs).toBe(at('2026-08-01T13:00:00'));
    });

    it('시작 끝을 끌면 마감보다 최소 한 칸 앞에서 멈춘다', () => {
      const resized = dragRange('start', start, end, 10 * DAY_MS);
      expect(resized.startMs).toBe(end - SNAP_MS);
      expect(resized.endMs).toBe(end);
    });

    it('마감 끝을 끌면 시작보다 최소 한 칸 뒤에서 멈춘다', () => {
      const resized = dragRange('end', start, end, -10 * DAY_MS);
      expect(resized.endMs).toBe(start + SNAP_MS);
      expect(resized.startMs).toBe(start);
    });

    it('스냅 폭을 넘기면 그 격자로 잡힌다', () => {
      const moved = dragRange('move', start, end, 5 * HOUR_MS, DAY_MS);
      expect(moved.startMs).toBe(at('2026-08-01T09:00:00'));
    });
  });

  describe('줌', () => {
    it('축소해도 커서 아래 시각은 제자리다', () => {
      const view = { startMs: 0, endMs: 100 };
      const zoomed = zoomRange(view, 2, 25, 10, 1000);
      expect(zoomed.endMs - zoomed.startMs).toBe(200);
      // 앵커가 구간의 25% 지점이었으니 확대 후에도 25% 지점이다
      expect((25 - zoomed.startMs) / (zoomed.endMs - zoomed.startMs)).toBeCloseTo(0.25);
    });

    it('최소·최대 구간을 넘지 않는다', () => {
      const view = { startMs: 0, endMs: 100 };
      expect(zoomRange(view, 0.01, 50, 40, 1000).endMs - zoomRange(view, 0.01, 50, 40, 1000).startMs).toBe(40);
      expect(zoomRange(view, 100, 50, 40, 150).endMs - zoomRange(view, 100, 50, 40, 150).startMs).toBe(150);
    });

    it('구간이 넓을수록 눈금과 스냅이 성글어진다', () => {
      expect(niceStep(2 * DAY_MS, 960, 78)).toBeLessThan(niceStep(120 * DAY_MS, 960, 78));
      expect(snapStepFor(6 * HOUR_MS, 960)).toBe(SNAP_MS);
      expect(snapStepFor(400 * DAY_MS, 960)).toBeGreaterThan(SNAP_MS);
    });
  });

  it('눈금은 날짜가 바뀌는 자리를 굵게 표시한다', () => {
    const ticks = generateTicks(at('2026-08-31T00:00:00'), at('2026-09-03T00:00:00'), DAY_MS);
    expect(ticks.map((tick) => tick.label)).toEqual(['8/31', '9월', '9/2', '9/3']);
    expect(ticks.find((tick) => tick.label === '9월')?.major).toBe(true);
    expect(ticks.find((tick) => tick.label === '9/2')?.major).toBe(false);
  });

  describe('마감 점 배치', () => {
    const entry = (ms: number, item: string, labelWidth = 20) => ({ ms, item, labelWidth });

    it('박스가 겹치면 한 줄 아래로 내린다', () => {
      const packed = packMarkers([entry(10, 'a'), entry(16, 'b')], (ms) => ms, 100);
      expect(packed.markers.map((marker) => marker.row)).toEqual([0, 1]);
      expect(packed.rows).toBe(2);
    });

    it('충분히 떨어져 있으면 같은 줄에 남는다', () => {
      const packed = packMarkers([entry(10, 'a'), entry(60, 'b')], (ms) => ms, 100);
      expect(packed.markers.map((marker) => marker.row)).toEqual([0, 0]);
      expect(packed.rows).toBe(1);
    });

    it('오른쪽 끝에서는 라벨을 왼쪽으로 뒤집는다', () => {
      const packed = packMarkers([entry(95, 'a')], (ms) => ms, 100);
      expect(packed.markers[0].flip).toBe(true);
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

  describe('중첩', () => {
    const node = (id: string, parentId: string | null, order: number) => ({ id, parentId, order });

    it('부모 바로 뒤에 자식을 놓고 깊이와 걸침 수를 센다', () => {
      const rows = layoutTree([node('a', null, 2), node('b', 'a', 1), node('c', null, 1), node('d', 'b', 1)]);
      expect(rows.map((row) => row.item.id)).toEqual(['c', 'a', 'b', 'd']);
      expect(rows.map((row) => row.depth)).toEqual([0, 0, 1, 2]);
      expect(rows.map((row) => row.span)).toEqual([1, 3, 2, 1]);
    });

    it('부모가 없거나 순환이면 최상위로 되돌려 행이 사라지지 않는다', () => {
      const orphan = layoutTree([node('a', 'missing', 1)]);
      expect(orphan).toHaveLength(1);
      expect(orphan[0].depth).toBe(0);

      const cycle = layoutTree([node('a', 'b', 1), node('b', 'a', 2)]);
      expect(cycle).toHaveLength(2);
      expect(cycle.every((row) => row.depth === 0)).toBe(true);
    });

    it('자기 자신이나 자기 자손 아래로는 못 들어간다', () => {
      const items = [node('a', null, 1), node('b', 'a', 1), node('c', 'b', 1)];
      expect(canReparent(items, 'a', 'a')).toBe(false);
      expect(canReparent(items, 'a', 'c')).toBe(false);
      expect(canReparent(items, 'c', 'a')).toBe(true);
      expect(canReparent(items, 'b', null)).toBe(true);
    });
  });
});

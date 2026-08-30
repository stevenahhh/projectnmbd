import { describe, expect, it } from 'vitest';
import {
  deadlineBucketMs,
  groupByDay,
  groupDeadlines,
  markerLabelShown,
  packMarkers,
} from '@/lib/timeline-markers';
import { canReparent, layoutTree } from '@/lib/timeline-tree';
import {
  DAY_MS,
  HOUR_MS,
  SNAP_MS,
  dragRange,
  estimateTextPx,
  generateTicks,
  gutterTextWidth,
  niceStep,
  snapStepFor,
  snapToHalfHour,
  stamp,
  toLocalInputValue,
  truncateToWidth,
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
    const group = (ms: number, count = 1) => ({ ms, items: Array.from({ length: count }, (_, i) => `${ms}-${i}`) });
    const identity = (ms: number) => ms;

    it('박스가 겹치면 한 줄 아래로 내린다', () => {
      const packed = packMarkers([group(10), group(16)], identity, 100, { maxRows: 2 });
      expect(packed.markers.map((marker) => marker.row)).toEqual([0, 1]);
      expect(packed.rows).toBe(2);
    });

    it('충분히 떨어져 있으면 같은 줄에 남는다', () => {
      const packed = packMarkers([group(10), group(60)], identity, 100, { maxRows: 2 });
      expect(packed.markers.map((marker) => marker.row)).toEqual([0, 0]);
      expect(packed.rows).toBe(1);
    });

    it('오른쪽 끝에서는 라벨을 왼쪽으로 뒤집는다', () => {
      expect(packMarkers([group(95)], identity, 100).markers[0].flip).toBe(true);
    });

    it('라벨을 끄면 박스가 점 크기로 줄어 한 줄에 들어간다', () => {
      const crowded = Array.from({ length: 18 }, (_, i) => group(20 + i * 25));
      expect(packMarkers(crowded, identity, 960, { showLabel: true }).rows).toBeGreaterThan(1);
      expect(packMarkers(crowded, identity, 960, { showLabel: false }).rows).toBe(1);
    });

    it('줄 상한을 넘으면 왼쪽 점에 합치고 개수는 잃지 않는다', () => {
      const dense = Array.from({ length: 30 }, (_, i) => group(10 + i * 20, 2));
      const packed = packMarkers(dense, identity, 300, { maxRows: 2 });
      expect(packed.rows).toBeLessThanOrEqual(2);
      expect(packed.markers.reduce((sum, marker) => sum + marker.items.length, 0)).toBe(60);
      expect(packed.markers.some((marker) => marker.merged)).toBe(true);
    });
  });

  describe('마감 묶기', () => {
    it('버킷을 하루로 두면 날짜별 묶기와 같다', () => {
      const entries = [
        { ms: at('2026-08-31T23:00:00'), item: 'b' },
        { ms: at('2026-08-30T09:00:00'), item: 'a' },
        { ms: at('2026-08-31T09:00:00'), item: 'c' },
      ];
      expect(groupDeadlines(entries, DAY_MS)).toEqual(groupByDay(entries));
    });

    it('같은 날 마감은 하나로 묶고 점은 가장 늦은 마감을 가리킨다', () => {
      const groups = groupByDay([
        { ms: at('2026-08-31T09:00:00'), item: 'c' },
        { ms: at('2026-08-31T23:00:00'), item: 'b' },
        { ms: at('2026-08-30T09:00:00'), item: 'a' },
      ]);
      expect(groups).toHaveLength(2);
      expect(groups[0].items).toEqual(['a']);
      expect(groups[1].items).toEqual(['c', 'b']);
      expect(groups[1].ms).toBe(at('2026-08-31T23:00:00'));
    });

    it('버킷을 넓히면 여러 날이 한 점으로 묶인다', () => {
      const week = groupDeadlines(
        [
          { ms: at('2026-08-30T09:00:00'), item: 'a' },
          { ms: at('2026-09-01T09:00:00'), item: 'b' },
          { ms: at('2026-09-20T09:00:00'), item: 'c' },
        ],
        7 * DAY_MS,
      );
      expect(week.length).toBeLessThan(3);
      expect(week.reduce((sum, group) => sum + group.items.length, 0)).toBe(3);
    });

    it('버킷은 하루보다 좁아지지 않고, 축소할수록 넓어진다', () => {
      expect(deadlineBucketMs(2 * DAY_MS, 800)).toBe(DAY_MS);
      expect(deadlineBucketMs(400 * DAY_MS, 800)).toBeGreaterThan(DAY_MS);
    });

    it('버킷 폭이 라벨을 담을 만할 때만 라벨을 띄운다', () => {
      // 39일을 800px 에 담으면 하루가 20px — 라벨이 못 들어간다
      expect(markerLabelShown(39 * DAY_MS, DAY_MS, 800)).toBe(false);
      expect(markerLabelShown(5 * DAY_MS, DAY_MS, 800)).toBe(true);
    });
  });

  describe('거터 제목', () => {
    it('한글은 넓게, 라틴·숫자는 좁게 센다', () => {
      expect(estimateTextPx('가나')).toBe(22);
      expect(estimateTextPx('ab12')).toBe(24);
    });

    it('폭을 넘으면 말줄임하고, 들어가면 그대로 둔다', () => {
      expect(truncateToWidth('데이터 수집', 200)).toBe('데이터 수집');
      const cut = truncateToWidth('아주 긴 마일스톤 제목입니다', 40);
      expect(cut.endsWith('…')).toBe(true);
      expect(estimateTextPx(cut)).toBeLessThanOrEqual(40);
    });

    it('깊이가 깊을수록 제목에 쓸 폭이 줄어든다', () => {
      expect(gutterTextWidth(1)).toBeLessThan(gutterTextWidth(0));
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

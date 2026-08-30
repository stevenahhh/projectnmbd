/**
 * 위쪽 축의 마감 점 — 묶기와 겹침 회피.
 * 좌표 계산과 분리해 둔다. 점이 몇 줄까지 쌓이는지가 화면 밀도를 좌우한다.
 */
import { DAY_MS, FONT, SCALE, niceStep, startOfDayMs } from './timeline';

export const MARKER_RADIUS = Math.round(6 * SCALE);
/** 점이 이만큼 벌어져야 'N개' 라벨을 띄운다. 좁으면 점만 찍는다. */
export const MARKER_LABEL_MIN_PX = Math.round(40 * SCALE);
/** 점이 쌓일 수 있는 최대 줄. 넘치면 왼쪽 점에 합산해 개수를 잃지 않는다. */
export const MARKER_MAX_ROWS = 2;

/** 점 하나가 라벨까지 포함해 차지하는 가로폭 — 겹침 판정에 쓰는 가상 박스의 너비. */
export function markerLabelWidth(count: number): number {
  return 8 + `${count}개`.length * FONT.marker;
}

/** 한 버킷이 차지하는 폭이 라벨을 담을 만한지. */
export function markerLabelShown(rangeMs: number, bucketMs: number, viewWidth: number): boolean {
  if (rangeMs <= 0 || viewWidth <= 0) return false;
  return (bucketMs / rangeMs) * viewWidth >= MARKER_LABEL_MIN_PX;
}

/** 점끼리 최소 간격이 나오도록 묶는 시간 폭 — 축소할수록 넓어진다. */
export function deadlineBucketMs(rangeMs: number, viewWidth: number): number {
  return Math.max(DAY_MS, niceStep(rangeMs, viewWidth, MARKER_RADIUS * 2 + 8));
}

/**
 * 마감을 버킷 폭으로 묶는다. 점이 가리키는 시각은 버킷 안에서 가장 늦은 마감이다.
 * 하루보다 좁게는 묶지 않는다 — 같은 날 마감은 늘 한 점이다.
 */
export function groupDeadlines<T>(entries: { ms: number; item: T }[], bucketMs: number): { ms: number; items: T[] }[] {
  const width = Math.max(DAY_MS, bucketMs);
  const groups = new Map<number, { ms: number; items: T[] }>();
  for (const entry of entries) {
    const key = Math.floor(startOfDayMs(entry.ms) / width);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.items.push(entry.item);
      bucket.ms = Math.max(bucket.ms, entry.ms);
    } else {
      groups.set(key, { ms: entry.ms, items: [entry.item] });
    }
  }
  return [...groups.values()].sort((a, b) => a.ms - b.ms);
}

/** 같은 날 마감을 하나로 묶는다. 오래된 날짜가 앞이다. */
export function groupByDay<T>(entries: { ms: number; item: T }[]): { ms: number; items: T[] }[] {
  return groupDeadlines(entries, DAY_MS);
}

export interface PackedMarker<T> {
  items: T[];
  ms: number;
  x: number;
  row: number;
  /** 오른쪽 끝에 붙어 라벨을 왼쪽으로 뒤집은 경우. */
  flip: boolean;
  /** 자리가 없어 이 점에 다른 그룹이 합쳐진 경우. */
  merged: boolean;
}

/**
 * 점 + 라벨이 차지할 가상의 박스를 만들고, 앞선 박스와 겹치면 한 줄 아래로 내린다.
 * 첫 줄부터 자리를 찾는 first-fit이라 왼쪽 점이 늘 위에 남는다.
 * 줄 상한까지 찼는데도 자리가 없으면 마지막 줄의 왼쪽 점에 합친다 — 개수는 잃지 않는다.
 */
export function packMarkers<T>(
  groups: { ms: number; items: T[] }[],
  xOf: (ms: number) => number,
  viewWidth: number,
  options: { showLabel?: boolean; gapPx?: number; maxRows?: number } = {},
): { markers: PackedMarker<T>[]; rows: number } {
  const { showLabel = true, gapPx = 6, maxRows = MARKER_MAX_ROWS } = options;
  const rowRight: number[] = [];
  const markers: PackedMarker<T>[] = [];

  const boxOf = (x: number, count: number) => {
    const label = showLabel ? markerLabelWidth(count) : 0;
    const flip = x + MARKER_RADIUS + label > viewWidth;
    return {
      flip,
      left: flip ? x - MARKER_RADIUS - label : x - MARKER_RADIUS,
      right: flip ? x + MARKER_RADIUS : x + MARKER_RADIUS + label,
    };
  };

  for (const group of [...groups].sort((a, b) => a.ms - b.ms)) {
    const x = xOf(group.ms);
    const box = boxOf(x, group.items.length);
    const row = rowRight.findIndex((edge) => edge + gapPx <= box.left);

    if (row >= 0) {
      rowRight[row] = Math.max(rowRight[row], box.right);
      markers.push({ items: group.items, ms: group.ms, x, row, flip: box.flip, merged: false });
      continue;
    }
    if (rowRight.length < maxRows) {
      rowRight.push(box.right);
      markers.push({ items: group.items, ms: group.ms, x, row: rowRight.length - 1, flip: box.flip, merged: false });
      continue;
    }

    // 줄이 다 찼다 — 마지막 줄 가장 오른쪽 점에 합쳐 개수만이라도 남긴다
    const lastRow = rowRight.length - 1;
    const target = markers.filter((marker) => marker.row === lastRow).at(-1);
    if (!target) continue;
    target.items = [...target.items, ...group.items];
    target.merged = true;
    const merged = boxOf(target.x, target.items.length);
    target.flip = merged.flip;
    rowRight[lastRow] = Math.max(rowRight[lastRow], merged.right);
  }

  return { markers, rows: rowRight.length };
}

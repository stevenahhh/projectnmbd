/**
 * 타임라인 좌표·시간 계산 — 화면에 의존하지 않는 부분만 모아 둔다.
 * 드래그로 기간을 바꾸는 규칙(30분 스냅, 최소 폭)이 여기 있고 테스트로 고정된다.
 */

export const SNAP_MS = 30 * 60 * 1000;
export const VIEW_WIDTH = 960;
export const AXIS_HEIGHT = 46;
export const BAR_HEIGHT = 26;
export const ROW_GAP = 12;
export const HANDLE_PX = 10;

export const TIMELINE_COLORS = {
  todo: '#4b5bd6',
  done: '#3f9e78',
  late: '#c4453c',
  muted: '#9aa0aa',
  bars: ['#4b5bd6', '#7c5cd6', '#2f8fbf', '#3f9e78', '#c07b2f', '#5b6478'],
};

export type DragMode = 'move' | 'start' | 'end';

export interface DragState {
  taskId: string;
  mode: DragMode;
  pointerX: number;
  baseStart: number;
  baseEnd: number;
  startMs: number;
  endMs: number;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 말풍선 표기 — 2026/08/01 19:00 형식. */
export function stamp(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function snapToHalfHour(ms: number): number {
  return Math.round(ms / SNAP_MS) * SNAP_MS;
}

/** datetime-local 입력값 — 로컬 시각 기준이라 ISO 문자열을 쓸 수 없다. */
export function toLocalInputValue(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 드래그 결과 기간 — 이동은 길이를 지키고, 끝을 끌 때는 최소 30분을 지킨다. */
export function dragRange(
  mode: DragMode,
  baseStart: number,
  baseEnd: number,
  deltaMs: number,
): { startMs: number; endMs: number } {
  if (mode === 'move') {
    const startMs = snapToHalfHour(baseStart + deltaMs);
    return { startMs, endMs: startMs + (baseEnd - baseStart) };
  }
  if (mode === 'start') {
    return { startMs: Math.min(snapToHalfHour(baseStart + deltaMs), baseEnd - SNAP_MS), endMs: baseEnd };
  }
  return { startMs: baseStart, endMs: Math.max(snapToHalfHour(baseEnd + deltaMs), baseStart + SNAP_MS) };
}

/** 축 위 월 눈금 — 구간에 걸치는 매월 1일. */
export function monthTicks(startMs: number, endMs: number): { x: number; label: string }[] {
  const span = Math.max(1, endMs - startMs);
  const ticks: { x: number; label: string }[] = [];
  const cursor = new Date(startMs);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= endMs) {
    if (cursor.getTime() >= startMs) {
      ticks.push({ x: ((cursor.getTime() - startMs) / span) * VIEW_WIDTH, label: `${cursor.getMonth() + 1}월` });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

/** 같은 날 마감을 하나의 점으로 묶는다. 오래된 날짜가 앞이다. */
export function groupByDay<T>(entries: { ms: number; item: T }[]): { ms: number; items: T[] }[] {
  const groups = new Map<string, { ms: number; items: T[] }>();
  for (const entry of entries) {
    const date = new Date(entry.ms);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const bucket = groups.get(key);
    if (bucket) bucket.items.push(entry.item);
    else groups.set(key, { ms: entry.ms, items: [entry.item] });
  }
  return [...groups.values()].sort((a, b) => a.ms - b.ms);
}

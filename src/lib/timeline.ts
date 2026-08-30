/**
 * 타임라인 좌표·시간 계산 — 화면에 의존하지 않는 부분만 모아 둔다.
 *
 * 보이는 구간(view)은 데이터 전체 구간과 별개다. 줌은 커서 아래 시각을 고정한 채
 * 구간 길이만 바꾸고, 눈금 간격과 스냅 폭은 그 구간에서 되짚어 고른다.
 */

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** 드래그 스냅의 최소 단위. 더 확대해도 이보다 잘게 잡히지 않는다. */
export const SNAP_MS = 30 * MINUTE_MS;

export const VIEW_WIDTH = 960;
/** 세로 치수와 글자는 한 배율로 함께 키운다 — 따로 만지면 비례가 깨진다. */
export const SCALE = 1.15;
export const AXIS_HEIGHT = Math.round(40 * SCALE);
export const MARKER_ROW_HEIGHT = Math.round(18 * SCALE);
export const BAR_HEIGHT = Math.round(22 * SCALE);
export const ROW_GAP = Math.round(10 * SCALE);
export const ROW_PITCH = BAR_HEIGHT + ROW_GAP;
export const HANDLE_PX = Math.round(10 * SCALE);
export const INDENT_PX = Math.round(16 * SCALE);

export const FONT = {
  tick: Math.round(10 * SCALE),
  marker: Math.round(11 * SCALE),
  markerCount: Math.round(9 * SCALE),
  bar: Math.round(11 * SCALE),
};

/** 대략적인 글자 폭 — 한글은 글자 크기만큼, 라틴·숫자는 그 절반쯤 차지한다. */
export function estimateTextPx(text: string, fontSizePx: number): number {
  return [...text].reduce((sum, ch) => sum + (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch) ? fontSizePx : fontSizePx * 0.55), 0);
}

/** 주어진 폭에 맞게 잘라 말줄임한다. 한 글자도 못 넣으면 빈 문자열이다. */
export function truncateToWidth(text: string, maxPx: number, fontSizePx: number): string {
  if (estimateTextPx(text, fontSizePx) <= maxPx) return text;
  const budget = maxPx - estimateTextPx('…', fontSizePx);
  const kept: string[] = [];
  let used = 0;
  for (const ch of [...text]) {
    const next = used + estimateTextPx(ch, fontSizePx);
    if (next > budget) break;
    kept.push(ch);
    used = next;
  }
  return kept.length === 0 ? '' : `${kept.join('')}…`;
}

/**
 * 막대 안에 넣을 제목 — 주어진 폭에 맞춰 줄인다.
 * 두 글자도 못 남기면 비운다. 「└ …」 같은 껍데기만 남기느니 안 그리는 편이 낫다.
 */
export function barLabelText(title: string, availablePx: number, fontSizePx: number): string {
  const text = truncateToWidth(title, availablePx, fontSizePx);
  return [...text].length >= 2 ? text : '';
}

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
  pointerY: number;
  baseStart: number;
  baseEnd: number;
  startMs: number;
  endMs: number;
  /** 세로로 끌어 다른 막대 위에 올렸을 때의 부모 후보. null 이면 최상위로 뺀다. */
  dropParentId: string | null;
  moved: boolean;
}

/** 포인터를 따라다니는 말풍선 — 드래그 중 기간과 마감 점 내역을 같은 모양으로 보여준다. */
export interface Bubble {
  x: number;
  y: number;
  lines: string[];
}

export interface ViewRange {
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
  return snapTo(ms, SNAP_MS);
}

export function snapTo(ms: number, stepMs: number): number {
  const step = Math.max(1, stepMs);
  return Math.round(ms / step) * step;
}

/** datetime-local 입력값 — 로컬 시각 기준이라 ISO 문자열을 쓸 수 없다. */
export function toLocalInputValue(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 눈금·스냅이 고를 수 있는 간격. 사람이 시계로 읽을 수 있는 값만 둔다. */
export const NICE_STEPS_MS = [
  30 * MINUTE_MS,
  HOUR_MS,
  3 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS,
  2 * DAY_MS,
  7 * DAY_MS,
  14 * DAY_MS,
  28 * DAY_MS,
];

/** 라벨이 겹치지 않는 가장 촘촘한 간격을 고른다 (레퍼런스 niceTickHours 의 일반화). */
export function niceStep(rangeMs: number, widthPx: number, minGapPx: number): number {
  if (rangeMs <= 0 || widthPx <= 0) return DAY_MS;
  const msPerPx = rangeMs / widthPx;
  for (const step of NICE_STEPS_MS) {
    if (step / msPerPx >= minGapPx) return step;
  }
  return NICE_STEPS_MS[NICE_STEPS_MS.length - 1];
}

/** 드래그 스냅 폭 — 확대할수록 잘게, 축소하면 하루 단위로 잡힌다. */
export function snapStepFor(rangeMs: number, widthPx: number): number {
  return Math.max(SNAP_MS, niceStep(rangeMs, widthPx, 5));
}

export interface Tick {
  ms: number;
  label: string;
  /** 날짜가 바뀌는 자리 — 굵게 그린다. */
  major: boolean;
}

export function startOfDayMs(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function tickLabel(ms: number, stepMs: number): { label: string; major: boolean } {
  const date = new Date(ms);
  if (stepMs < DAY_MS) {
    const midnight = date.getHours() === 0 && date.getMinutes() === 0;
    return midnight
      ? { label: `${date.getMonth() + 1}/${date.getDate()}`, major: true }
      : { label: `${pad(date.getHours())}:${pad(date.getMinutes())}`, major: false };
  }
  const firstOfMonth = date.getDate() === 1;
  return firstOfMonth
    ? { label: `${date.getMonth() + 1}월`, major: true }
    : { label: `${date.getMonth() + 1}/${date.getDate()}`, major: false };
}

/** 라벨 없는 하루 경계선 — 너무 촘촘해지면 그리지 않는다. */
export function dayBoundaries(startMs: number, endMs: number, widthPx: number, minGapPx = 8): number[] {
  const range = Math.max(1, endMs - startMs);
  if ((DAY_MS / range) * widthPx < minGapPx) return [];
  const days: number[] = [];
  for (let ms = startOfDayMs(startMs) + DAY_MS; ms <= endMs; ms += DAY_MS) days.push(ms);
  return days;
}

/** 눈금은 자정 기준으로 정렬한다 — 시계에 없는 자리에 선이 서지 않게. */
export function generateTicks(startMs: number, endMs: number, stepMs: number): Tick[] {
  const ticks: Tick[] = [];
  if (stepMs >= 28 * DAY_MS) {
    const cursor = new Date(startMs);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= endMs) {
      if (cursor.getTime() >= startMs) ticks.push({ ms: cursor.getTime(), label: `${cursor.getMonth() + 1}월`, major: true });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }

  const dayStart = startOfDayMs(startMs);
  const first = dayStart + Math.ceil((startMs - dayStart) / stepMs) * stepMs;
  for (let ms = first; ms <= endMs; ms += stepMs) {
    ticks.push({ ms, ...tickLabel(ms, stepMs) });
  }
  return ticks;
}

/** 커서 아래 시각을 고정한 채 구간 길이만 바꾼다. */
export function zoomRange(view: ViewRange, factor: number, anchorMs: number, minMs: number, maxMs: number): ViewRange {
  const rangeMs = view.endMs - view.startMs;
  const nextRange = Math.max(minMs, Math.min(maxMs, rangeMs * factor));
  if (nextRange === rangeMs) return view;
  const ratio = (anchorMs - view.startMs) / rangeMs;
  const startMs = anchorMs - ratio * nextRange;
  return { startMs, endMs: startMs + nextRange };
}

export function panRange(view: ViewRange, deltaMs: number): ViewRange {
  return { startMs: view.startMs + deltaMs, endMs: view.endMs + deltaMs };
}

/** 드래그 결과 기간 — 이동은 길이를 지키고, 끝을 끌 때는 최소 한 칸을 지킨다. */
export function dragRange(
  mode: DragMode,
  baseStart: number,
  baseEnd: number,
  deltaMs: number,
  stepMs: number = SNAP_MS,
): { startMs: number; endMs: number } {
  const step = Math.max(1, stepMs);
  if (mode === 'move') {
    const startMs = snapTo(baseStart + deltaMs, step);
    return { startMs, endMs: startMs + (baseEnd - baseStart) };
  }
  if (mode === 'start') {
    return { startMs: Math.min(snapTo(baseStart + deltaMs, step), baseEnd - step), endMs: baseEnd };
  }
  return { startMs: baseStart, endMs: Math.max(snapTo(baseEnd + deltaMs, step), baseStart + step) };
}

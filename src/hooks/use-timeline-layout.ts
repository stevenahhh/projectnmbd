'use client';

import { useMemo } from 'react';
import {
  AXIS_HEIGHT,
  MARKER_ROW_HEIGHT,
  ROW_PITCH,
  VIEW_WIDTH,
  dayBoundaries,
  generateTicks,
  niceStep,
  type ViewRange,
} from '@/lib/timeline';
import {
  MARKER_MAX_ROWS,
  deadlineBucketMs,
  groupDeadlines,
  markerLabelShown,
  packMarkers,
} from '@/lib/timeline-markers';
import { layoutTree } from '@/lib/timeline-tree';
import type { TeamTask } from '@/lib/types';
import type { BarRow } from './use-timeline-drag';

/**
 * 보이는 구간에서 그릴 것들을 뽑는다 — 막대 계층, 눈금, 마감 점, 그리고 높이.
 * 밀도 규칙이 전부 여기로 모인다: 완료 마감은 기본으로 빼고, 라벨은 자리가 있을 때만 띄우며,
 * 점은 한(또는 두) 줄까지만 쌓고 넘치면 합친다.
 */
export function useTimelineLayout(tasks: TeamTask[], view: ViewRange, showDone: boolean) {
  const rangeMs = Math.max(1, view.endMs - view.startMs);

  const rows: BarRow[] = useMemo(() => {
    const bars = tasks.filter((task) => task.milestoneStartAt);
    const barIds = new Set(bars.map((task) => task.id));
    return layoutTree(
      bars.map((task) => ({
        id: task.id,
        parentId: task.milestoneId && barIds.has(task.milestoneId) ? task.milestoneId : null,
        order: task.order,
        task,
      })),
    );
  }, [tasks]);

  const ticks = useMemo(
    () => generateTicks(view.startMs, view.endMs, niceStep(rangeMs, VIEW_WIDTH, 78)),
    [view.startMs, view.endMs, rangeMs],
  );

  const dayLines = useMemo(() => dayBoundaries(view.startMs, view.endMs, VIEW_WIDTH), [view.startMs, view.endMs]);

  const { markers, markerRows, showMarkerLabel } = useMemo(() => {
    const bucketMs = deadlineBucketMs(rangeMs, VIEW_WIDTH);
    const showLabel = markerLabelShown(rangeMs, bucketMs, VIEW_WIDTH);
    const groups = groupDeadlines(
      tasks
        .filter((task) => !task.milestoneStartAt && (showDone || task.status !== 'done'))
        .map((task) => ({ ms: task.dueAt.toDate().getTime(), item: task })),
      bucketMs,
    ).filter((group) => group.ms >= view.startMs - bucketMs && group.ms <= view.endMs + bucketMs);
    const packed = packMarkers<TeamTask>(
      groups,
      (ms) => ((ms - view.startMs) / rangeMs) * VIEW_WIDTH,
      VIEW_WIDTH,
      { showLabel, maxRows: showDone ? MARKER_MAX_ROWS : 1 },
    );
    return { markers: packed.markers, markerRows: Math.max(1, packed.rows), showMarkerLabel: showLabel };
  }, [tasks, showDone, view.startMs, view.endMs, rangeMs]);

  const chartTop = AXIS_HEIGHT + markerRows * MARKER_ROW_HEIGHT;
  const height = chartTop + Math.max(1, rows.length) * ROW_PITCH + 16;

  return { rows, ticks, dayLines, markers, markerRows, showMarkerLabel, chartTop, height };
}

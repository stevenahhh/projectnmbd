'use client';

import { toDate } from '@/lib/time';
import {
  BAR_HEIGHT,
  HANDLE_PX,
  INDENT_PX,
  ROW_GAP,
  ROW_PITCH,
  TIMELINE_COLORS,
  VIEW_WIDTH,
  type DragMode,
  type DragState,
} from '@/lib/timeline';
import type { TreeRow } from '@/lib/timeline-tree';
import type { TeamTask } from '@/lib/types';

interface TimelineChartProps {
  rows: TreeRow<TeamTask>[];
  chartTop: number;
  height: number;
  archived: boolean;
  drag: DragState | null;
  x: (ms: number) => number;
  onBarPointerDown: (event: React.PointerEvent, task: TeamTask, mode: DragMode) => void;
  onTitleClick: (task: TeamTask) => void;
}

/** 막대 한 줄 — 부모는 자손 행까지 세로로 걸치고, 자식은 제목만 안쪽으로 들여쓴다. */
function Bar({
  row,
  index,
  chartTop,
  archived,
  drag,
  x,
  onBarPointerDown,
  onTitleClick,
}: {
  row: TreeRow<TeamTask>;
  index: number;
} & Omit<TimelineChartProps, 'rows' | 'height'>) {
  const task = row.item;
  const dragging = drag?.taskId === task.id;
  const start = dragging ? drag.startMs : (toDate(task.milestoneStartAt)?.getTime() ?? task.dueAt.toDate().getTime());
  const end = dragging ? drag.endMs : task.dueAt.toDate().getTime();
  const isDropTarget = drag?.moved === true && drag.dropParentId === task.id;

  const y = chartTop + index * ROW_PITCH;
  const height = row.span * ROW_PITCH - ROW_GAP;
  const left = x(start);
  const width = Math.max(12, x(end) - left);
  const color =
    task.status === 'done' ? TIMELINE_COLORS.muted : TIMELINE_COLORS.bars[index % TIMELINE_COLORS.bars.length];
  const labelX = Math.max(left, 0) + 10 + row.depth * INDENT_PX;

  return (
    <g opacity={dragging && drag.moved ? 0.75 : 1}>
      <rect
        x={left}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={color}
        opacity={task.status === 'done' ? 0.5 : row.span > 1 ? 0.28 : 0.95}
        stroke={isDropTarget ? TIMELINE_COLORS.todo : 'none'}
        strokeWidth={isDropTarget ? 2 : 0}
        className={archived ? '' : 'cursor-grab'}
        onPointerDown={(e) => onBarPointerDown(e, task, 'move')}
      />
      {/* 자손을 거느린 막대는 안이 비어 보이게 두고, 제목 줄만 진하게 얹는다 */}
      {row.span > 1 ? (
        <rect
          x={left}
          y={y}
          width={width}
          height={BAR_HEIGHT}
          rx={6}
          fill={color}
          opacity={0.95}
          className={archived ? '' : 'cursor-grab'}
          onPointerDown={(e) => onBarPointerDown(e, task, 'move')}
        />
      ) : null}

      {/* 양 끝 리사이즈 핸들 */}
      <rect
        x={left}
        y={y}
        width={HANDLE_PX}
        height={BAR_HEIGHT}
        fill="#ffffff"
        opacity={0.001}
        className={archived ? '' : 'cursor-ew-resize'}
        onPointerDown={(e) => onBarPointerDown(e, task, 'start')}
      />
      <rect
        x={left + width - HANDLE_PX}
        y={y}
        width={HANDLE_PX}
        height={BAR_HEIGHT}
        fill="#ffffff"
        opacity={0.001}
        className={archived ? '' : 'cursor-ew-resize'}
        onPointerDown={(e) => onBarPointerDown(e, task, 'end')}
      />

      <text
        x={labelX}
        y={y + 17}
        fontSize={11}
        fill="#ffffff"
        fontWeight={600}
        className="cursor-text"
        onClick={() => onTitleClick(task)}
      >
        {row.depth > 0 ? '└ ' : ''}
        {task.title}
        {task.status === 'done' ? ' · 완료' : ''}
      </text>
    </g>
  );
}

/** 타임라인 그림 — 상태를 갖지 않고 좌표만 그린다. */
export function TimelineChart({ rows, chartTop, height, ...rest }: TimelineChartProps) {
  return (
    <g>
      {rows.map((row, index) => (
        <Bar key={row.item.id} row={row} index={index} chartTop={chartTop} {...rest} />
      ))}

      {rows.length === 0 ? (
        <text x={16} y={chartTop + 20} fontSize={12} fill="currentColor" className="text-muted-foreground">
          기간이 있는 항목이 아직 없어요
        </text>
      ) : null}

      {/* 빈 영역으로 끌어내면 최상위로 빠진다 — 드롭 대상이 비어 있음을 알린다 */}
      {rest.drag?.moved === true && rest.drag.dropParentId === null ? (
        <text
          x={VIEW_WIDTH - 8}
          y={height - 6}
          fontSize={11}
          textAnchor="end"
          fill="currentColor"
          className="text-muted-foreground"
        >
          여기서 놓으면 최상위로
        </text>
      ) : null}
    </g>
  );
}

'use client';

import { toDate } from '@/lib/time';
import {
  BAR_HEIGHT,
  CHART_LEFT,
  HANDLE_PX,
  INDENT_PX,
  ROW_GAP,
  ROW_PITCH,
  TIMELINE_COLORS,
  VIEW_WIDTH,
  gutterTextWidth,
  truncateToWidth,
  type DragMode,
  type DragState,
} from '@/lib/timeline';
import type { TreeRow } from '@/lib/timeline-tree';
import type { TeamTask } from '@/lib/types';

interface TimelineChartProps {
  rows: TreeRow<TeamTask>[];
  /** 막대만 차트 영역에 가둔다 — 제목은 거터에 남아야 한다. */
  clipId: string;
  chartTop: number;
  height: number;
  archived: boolean;
  drag: DragState | null;
  x: (ms: number) => number;
  onBarPointerDown: (event: React.PointerEvent, task: TeamTask, mode: DragMode) => void;
  onTitleClick: (task: TeamTask) => void;
}

/** 거터의 제목 — 누르면 이름을 고친다. */
function GutterLabel({
  row,
  index,
  chartTop,
  onTitleClick,
}: {
  row: TreeRow<TeamTask>;
  index: number;
  chartTop: number;
  onTitleClick: (task: TeamTask) => void;
}) {
  const y = chartTop + index * ROW_PITCH;
  return (
    <text
      x={12 + row.depth * INDENT_PX}
      y={y + 15}
      fontSize={11}
      fontWeight={row.depth === 0 ? 600 : 400}
      fill="currentColor"
      className={row.item.status === 'done' ? 'text-muted-foreground cursor-text' : 'text-foreground cursor-text'}
      onClick={() => onTitleClick(row.item)}
    >
      {row.depth > 0 ? '└ ' : ''}
      {truncateToWidth(row.item.title, gutterTextWidth(row.depth))}
    </text>
  );
}

/** 막대 한 줄 — 시간 위에 놓이고 끌어서 옮긴다. */
function Bar({
  row,
  index,
  chartTop,
  archived,
  drag,
  x,
  onBarPointerDown,
}: { row: TreeRow<TeamTask>; index: number } & Omit<
  TimelineChartProps,
  'rows' | 'height' | 'clipId' | 'onTitleClick'
>) {
  const task = row.item;
  const dragging = drag?.taskId === task.id;
  const start = dragging ? drag.startMs : (toDate(task.milestoneStartAt)?.getTime() ?? task.dueAt.toDate().getTime());
  const end = dragging ? drag.endMs : task.dueAt.toDate().getTime();
  const isDropTarget = drag?.moved === true && drag.dropParentId === task.id;

  const y = chartTop + index * ROW_PITCH;
  const barHeight = row.span * ROW_PITCH - ROW_GAP;
  const left = x(start);
  const width = Math.max(6, x(end) - left);
  const color =
    task.status === 'done' ? TIMELINE_COLORS.muted : TIMELINE_COLORS.bars[index % TIMELINE_COLORS.bars.length];

  return (
    <g opacity={dragging && drag.moved ? 0.75 : 1}>
      <rect
        x={left}
        y={y}
        width={width}
        height={barHeight}
        rx={5}
        fill={color}
        opacity={task.status === 'done' ? 0.4 : row.span > 1 ? 0.25 : 0.9}
        stroke={isDropTarget ? TIMELINE_COLORS.todo : 'none'}
        strokeWidth={isDropTarget ? 2 : 0}
        className={archived ? '' : 'cursor-grab'}
        onPointerDown={(e) => onBarPointerDown(e, task, 'move')}
      />
      {/* 자손을 거느린 막대는 안이 비어 보이게 두고 제 몫만 진하게 얹는다 */}
      {row.span > 1 ? (
        <rect
          x={left}
          y={y}
          width={width}
          height={BAR_HEIGHT}
          rx={5}
          fill={color}
          opacity={0.9}
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
    </g>
  );
}

/** 타임라인 그림 — 상태를 갖지 않고 좌표만 그린다. */
export function TimelineChart({ rows, clipId, chartTop, height, onTitleClick, ...rest }: TimelineChartProps) {
  return (
    <g>
      {rows.map((row, index) => (
        <GutterLabel
          key={`label-${row.item.id}`}
          row={row}
          index={index}
          chartTop={chartTop}
          onTitleClick={onTitleClick}
        />
      ))}

      <g clipPath={`url(#${clipId})`}>
        {rows.map((row, index) => (
          <Bar key={row.item.id} row={row} index={index} chartTop={chartTop} {...rest} />
        ))}
      </g>

      {rows.length === 0 ? (
        <text x={CHART_LEFT + 12} y={chartTop + 16} fontSize={12} fill="currentColor" className="text-muted-foreground">
          기간이 있는 항목이 아직 없어요
        </text>
      ) : null}

      {/* 빈 영역으로 끌어내면 최상위로 빠진다 */}
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

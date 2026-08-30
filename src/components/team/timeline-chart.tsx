'use client';

import type { RefObject } from 'react';
import { toDate } from '@/lib/time';
import {
  AXIS_HEIGHT,
  BAR_HEIGHT,
  HANDLE_PX,
  ROW_GAP,
  TIMELINE_COLORS,
  VIEW_WIDTH,
  stamp,
  type DragMode,
  type DragState,
} from '@/lib/timeline';
import type { TeamTask } from '@/lib/types';

export interface Bubble {
  x: number;
  y: number;
  lines: string[];
}

interface TimelineChartProps {
  svgRef: RefObject<SVGSVGElement | null>;
  bars: TeamTask[];
  deadlineGroups: { ms: number; items: TeamTask[] }[];
  ticks: { x: number; label: string }[];
  startMs: number;
  endMs: number;
  nowMs: number;
  archived: boolean;
  drag: DragState | null;
  onBarPointerDown: (event: React.PointerEvent, task: TeamTask, mode: DragMode) => void;
  onTitleClick: (task: TeamTask) => void;
  onBubble: (bubble: Bubble | null) => void;
}

/** 타임라인 그림 — 상태를 갖지 않고 좌표만 그린다. */
export function TimelineChart({
  svgRef,
  bars,
  deadlineGroups,
  ticks,
  startMs,
  endMs,
  nowMs,
  archived,
  drag,
  onBarPointerDown,
  onTitleClick,
  onBubble,
}: TimelineChartProps) {
  const span = Math.max(1, endMs - startMs);
  const height = AXIS_HEIGHT + Math.max(1, bars.length) * (BAR_HEIGHT + ROW_GAP) + 16;
  const x = (ms: number) => ((ms - startMs) / span) * VIEW_WIDTH;

  return (
    <svg
      id="tut-timeline-chart"
      ref={svgRef}
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      className="min-w-[760px] touch-none select-none"
      role="img"
      aria-label="타임라인"
    >
      {ticks.map((tick) => (
        <g key={tick.label + tick.x}>
          <line
            x1={tick.x}
            y1={AXIS_HEIGHT - 12}
            x2={tick.x}
            y2={height}
            stroke="currentColor"
            strokeWidth={1}
            className="text-border"
          />
          <text x={tick.x + 4} y={12} fontSize={10} fill="currentColor" className="text-muted-foreground">
            {tick.label}
          </text>
        </g>
      ))}

      {/* 오늘 기준선 */}
      {nowMs >= startMs && nowMs <= endMs ? (
        <line
          x1={x(nowMs)}
          y1={AXIS_HEIGHT - 12}
          x2={x(nowMs)}
          y2={height}
          stroke={TIMELINE_COLORS.late}
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.5}
        />
      ) : null}

      {/* 마감 마커 — 날짜별로 묶어 축에 점 + 점선 */}
      {deadlineGroups.map((group) => {
        const cx = Math.min(VIEW_WIDTH - 8, Math.max(8, x(group.ms)));
        const allDone = group.items.every((task) => task.status === 'done');
        const anyLate = group.items.some((task) => task.status !== 'done' && task.dueAt.toDate().getTime() < nowMs);
        const color = anyLate ? TIMELINE_COLORS.late : allDone ? TIMELINE_COLORS.done : TIMELINE_COLORS.todo;
        const labelLeft = cx > VIEW_WIDTH - 80;
        return (
          <g key={group.ms}>
            <line
              x1={cx}
              y1={AXIS_HEIGHT - 6}
              x2={cx}
              y2={height}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.35}
            />
            <circle
              cx={cx}
              cy={AXIS_HEIGHT - 18}
              r={6}
              fill={color}
              className="cursor-pointer"
              onPointerEnter={(e) =>
                onBubble({
                  x: e.clientX,
                  y: e.clientY,
                  lines: [
                    `${stamp(group.ms).slice(0, 10)} 마감 ${group.items.length}개`,
                    ...group.items.slice(0, 5).map((t) => `· ${t.title}${t.status === 'done' ? ' (완료)' : ''}`),
                    ...(group.items.length > 5 ? [`외 ${group.items.length - 5}개`] : []),
                  ],
                })
              }
              onPointerLeave={() => onBubble(null)}
            />
            <text
              x={labelLeft ? cx - 10 : cx + 10}
              y={AXIS_HEIGHT - 14}
              fontSize={11}
              textAnchor={labelLeft ? 'end' : 'start'}
              fill="currentColor"
              className="text-muted-foreground"
            >
              {group.items.length}개
            </text>
          </g>
        );
      })}

      {/* 기간 막대 */}
      {bars.map((task, index) => {
        const dragging = drag?.taskId === task.id;
        const start = dragging ? drag.startMs : (toDate(task.milestoneStartAt)?.getTime() ?? startMs);
        const end = dragging ? drag.endMs : task.dueAt.toDate().getTime();
        const y = AXIS_HEIGHT + index * (BAR_HEIGHT + ROW_GAP);
        const color =
          task.status === 'done' ? TIMELINE_COLORS.muted : TIMELINE_COLORS.bars[index % TIMELINE_COLORS.bars.length];
        const left = x(start);
        const width = Math.max(12, x(end) - x(start));
        return (
          <g key={task.id}>
            <rect
              x={left}
              y={y}
              width={width}
              height={BAR_HEIGHT}
              rx={6}
              fill={color}
              opacity={task.status === 'done' ? 0.55 : 0.95}
              className={archived ? '' : 'cursor-grab'}
              onPointerDown={(e) => onBarPointerDown(e, task, 'move')}
            />
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
              x={left + 10}
              y={y + 17}
              fontSize={11}
              fill="#ffffff"
              fontWeight={600}
              className="cursor-text"
              onClick={() => onTitleClick(task)}
            >
              {task.title}
              {task.status === 'done' ? ' · 완료' : ''}
            </text>
          </g>
        );
      })}

      {bars.length === 0 ? (
        <text x={16} y={AXIS_HEIGHT + 24} fontSize={12} fill="currentColor" className="text-muted-foreground">
          기간이 있는 항목이 아직 없어요
        </text>
      ) : null}
    </svg>
  );
}

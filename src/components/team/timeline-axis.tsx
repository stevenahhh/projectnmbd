'use client';

import {
  MARKER_RADIUS,
  MARKER_ROW_HEIGHT,
  TIMELINE_COLORS,
  type Bubble,
  type PackedMarker,
  type Tick,
} from '@/lib/timeline';
import type { TeamTask } from '@/lib/types';

export type DeadlineGroup = { ms: number; items: TeamTask[] };

/** 점 하나가 라벨까지 포함해 차지하는 가로폭 — 겹침 판정에 쓰는 가상 박스의 너비. */
export function markerLabelWidth(count: number): number {
  return 8 + `${count}개`.length * 8;
}

function markerColor(items: TeamTask[], nowMs: number): string {
  if (items.some((task) => task.status !== 'done' && task.dueAt.toDate().getTime() < nowMs)) return TIMELINE_COLORS.late;
  if (items.every((task) => task.status === 'done')) return TIMELINE_COLORS.done;
  return TIMELINE_COLORS.todo;
}

interface TimelineAxisProps {
  ticks: Tick[];
  markers: PackedMarker<DeadlineGroup>[];
  markerRows: number;
  height: number;
  nowMs: number;
  x: (ms: number) => number;
  inView: (ms: number) => boolean;
  onBubble: (bubble: Bubble | null) => void;
}

/**
 * 위쪽 축 — 눈금과 마감 점.
 * 점은 packMarkers 가 정해준 줄에 얹는다. 같은 줄에서 박스가 겹치는 일은 없다.
 */
export function TimelineAxis({ ticks, markers, markerRows, height, nowMs, x, inView, onBubble }: TimelineAxisProps) {
  const markerTop = 16;
  const axisBottom = markerTop + markerRows * MARKER_ROW_HEIGHT;

  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick.ms}>
          <line
            x1={x(tick.ms)}
            y1={axisBottom}
            x2={x(tick.ms)}
            y2={height}
            stroke="currentColor"
            strokeWidth={1}
            className="text-border"
            opacity={tick.major ? 1 : 0.5}
          />
          <text
            x={x(tick.ms) + 4}
            y={11}
            fontSize={10}
            fill="currentColor"
            className="text-muted-foreground"
            fontWeight={tick.major ? 600 : 400}
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* 오늘 기준선 */}
      {inView(nowMs) ? (
        <line
          x1={x(nowMs)}
          y1={axisBottom}
          x2={x(nowMs)}
          y2={height}
          stroke={TIMELINE_COLORS.late}
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.5}
        />
      ) : null}

      {markers.map(({ item, ms, x: cx, row, flip }) => {
        const color = markerColor(item.items, nowMs);
        const cy = markerTop + row * MARKER_ROW_HEIGHT;
        const date = new Date(ms);
        return (
          <g key={ms}>
            <line
              x1={cx}
              y1={cy + MARKER_RADIUS}
              x2={cx}
              y2={height}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.3}
            />
            <circle
              cx={cx}
              cy={cy}
              r={MARKER_RADIUS}
              fill={color}
              className="cursor-pointer"
              onPointerEnter={(e) =>
                onBubble({
                  x: e.clientX,
                  y: e.clientY,
                  lines: [
                    `${date.getMonth() + 1}/${date.getDate()} 마감 ${item.items.length}개`,
                    ...item.items.slice(0, 5).map((task) => `· ${task.title}${task.status === 'done' ? ' (완료)' : ''}`),
                    ...(item.items.length > 5 ? [`외 ${item.items.length - 5}개`] : []),
                  ],
                })
              }
              onPointerLeave={() => onBubble(null)}
            />
            <text
              x={flip ? cx - MARKER_RADIUS - 4 : cx + MARKER_RADIUS + 4}
              y={cy + 4}
              fontSize={11}
              textAnchor={flip ? 'end' : 'start'}
              fill="currentColor"
              className="text-muted-foreground"
            >
              {item.items.length}개
            </text>
          </g>
        );
      })}
    </g>
  );
}

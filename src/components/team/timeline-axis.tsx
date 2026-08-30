'use client';

import { FONT, MARKER_ROW_HEIGHT, TIMELINE_COLORS, type Bubble, type Tick } from '@/lib/timeline';
import { MARKER_RADIUS, type PackedMarker } from '@/lib/timeline-markers';
import type { TeamTask } from '@/lib/types';

function markerColor(items: TeamTask[], nowMs: number): string {
  if (items.some((task) => task.status !== 'done' && task.dueAt.toDate().getTime() < nowMs)) return TIMELINE_COLORS.late;
  if (items.every((task) => task.status === 'done')) return TIMELINE_COLORS.done;
  return TIMELINE_COLORS.todo;
}

interface TimelineAxisProps {
  ticks: Tick[];
  dayLines: number[];
  markers: PackedMarker<TeamTask>[];
  markerRows: number;
  showMarkerLabel: boolean;
  height: number;
  nowMs: number;
  x: (ms: number) => number;
  inView: (ms: number) => boolean;
  onBubble: (bubble: Bubble | null) => void;
}

/**
 * 위쪽 축 — 눈금과 마감 점.
 * 라벨을 놓을 자리가 없으면 점 안에 개수만 넣는다. 박스가 넓어지지 않아 겹칠 일이 없다.
 */
export function TimelineAxis({
  ticks,
  dayLines,
  markers,
  markerRows,
  showMarkerLabel,
  height,
  nowMs,
  x,
  inView,
  onBubble,
}: TimelineAxisProps) {
  const markerTop = 18;
  const axisBottom = markerTop + markerRows * MARKER_ROW_HEIGHT;

  return (
    <g>
      {dayLines.map((ms) => (
        <line
          key={`day-${ms}`}
          x1={x(ms)}
          y1={axisBottom}
          x2={x(ms)}
          y2={height}
          stroke="currentColor"
          strokeWidth={1}
          className="text-border"
          opacity={0.25}
        />
      ))}

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
            opacity={tick.major ? 0.9 : 0.5}
          />
          <text
            x={x(tick.ms) + 4}
            y={FONT.tick + 2}
            fontSize={FONT.tick}
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
          opacity={0.6}
        />
      ) : null}

      {markers.map(({ items, ms, x: cx, row, flip, merged }) => {
        const color = markerColor(items, nowMs);
        const cy = markerTop + row * MARKER_ROW_HEIGHT;
        const date = new Date(ms);
        const radius = items.length > 1 ? MARKER_RADIUS + 1 : MARKER_RADIUS;
        return (
          <g
            key={ms}
            className="cursor-pointer"
            onPointerEnter={(e) =>
              onBubble({
                x: e.clientX,
                y: e.clientY,
                lines: [
                  `${date.getMonth() + 1}/${date.getDate()}${merged ? ' 부근' : ''} 마감 ${items.length}개`,
                  ...items.slice(0, 5).map((task) => `· ${task.title}${task.status === 'done' ? ' (완료)' : ''}`),
                  ...(items.length > 5 ? [`외 ${items.length - 5}개`] : []),
                ],
              })
            }
            onPointerLeave={() => onBubble(null)}
          >
            {/* 점선은 첫 줄만 — 줄이 늘수록 세로선이 축을 어지럽힌다 */}
            {row === 0 ? (
              <line
                x1={cx}
                y1={cy + radius}
                x2={cx}
                y2={height}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.25}
              />
            ) : null}
            <circle cx={cx} cy={cy} r={radius} fill={color} />
            {items.length > 1 && !showMarkerLabel ? (
              <text x={cx} y={cy + 4} fontSize={FONT.markerCount} fontWeight={700} textAnchor="middle" fill="#ffffff">
                {items.length > 9 ? '+' : items.length}
              </text>
            ) : null}
            {showMarkerLabel ? (
              <text
                x={flip ? cx - radius - 4 : cx + radius + 4}
                y={cy + 4}
                fontSize={FONT.marker}
                textAnchor={flip ? 'end' : 'start'}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {items.length}개
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

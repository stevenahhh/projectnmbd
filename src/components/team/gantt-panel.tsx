'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toDate } from '@/lib/time';
import type { Team, TeamTask } from '@/lib/types';

interface GanttPanelProps {
  team: Team;
  tasks: TeamTask[];
}

const BAR_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

/** 간트 타임라인 (§2.8-4) — SVG 직접 작성, 라이브러리 없음. 마일스톤 막대 + 할 일 마커. */
export function GanttPanel({ team, tasks }: GanttPanelProps) {
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [nowMs] = useState(() => Date.now());
  const { milestones, regularTasks, startMs, endMs } = useMemo(() => {
    const milestoneTasks = tasks.filter((t) => t.milestoneId && t.milestoneStartAt);
    const rest = tasks.filter((t) => !t.milestoneId);
    const starts = [
      team.startAt.toDate().getTime(),
      ...milestoneTasks.map((t) => (t.milestoneStartAt ? toDate(t.milestoneStartAt)?.getTime() ?? Infinity : Infinity)),
    ];
    const ends = [team.dueAt.toDate().getTime(), ...tasks.map((t) => toDate(t.dueAt)?.getTime() ?? 0)];
    return {
      milestones: milestoneTasks,
      regularTasks: rest,
      startMs: Math.min(...starts),
      endMs: Math.max(...ends),
    };
  }, [team, tasks]);

  const span = Math.max(1, endMs - startMs);
  const width = 900;
  const barHeight = 22;
  const rowGap = 10;
  const headerHeight = 24;
  const rows = milestones.length + regularTasks.length;
  const height = headerHeight + rows * (barHeight + rowGap) + 10;

  const x = (ms: number) => ((ms - startMs) / span) * width;

  const monthTicks = useMemo(() => {
    const ticks: { x: number; label: string }[] = [];
    const cursor = new Date(startMs);
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor.getTime() <= endMs) {
      if (cursor.getTime() >= startMs) {
        ticks.push({ x: x(cursor.getTime()), label: `${cursor.getUTCMonth() + 1}월` });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return ticks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMs, endMs, width, span]);

  let rowIndex = 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">간트 타임라인 — 마감에서 역산한 마일스톤</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" role="img" aria-label="간트 타임라인">
          {monthTicks.map((tick) => (
            <g key={tick.label + tick.x}>
              <line x1={tick.x} y1={0} x2={tick.x} y2={height} stroke="#e5e5e5" strokeWidth={1} />
              <text x={tick.x + 4} y={14} fontSize={10} fill="#737373">
                {tick.label}
              </text>
            </g>
          ))}

          {milestones.map((task) => {
            const start = toDate(task.milestoneStartAt)?.getTime() ?? startMs;
            const end = toDate(task.dueAt)?.getTime() ?? endMs;
            const y = headerHeight + rowIndex++ * (barHeight + rowGap);
            const color = task.status === 'done' ? '#a3a3a3' : BAR_COLORS[(rowIndex - 2) % BAR_COLORS.length];
            return (
              <g key={task.id}>
                <rect
                  x={x(start)}
                  y={y}
                  width={Math.max(6, x(end) - x(start))}
                  height={barHeight}
                  rx={5}
                  fill={color}
                  opacity={task.status === 'done' ? 0.5 : 0.9}
                />
                <text x={x(start) + 8} y={y + 15} fontSize={11} fill="#ffffff" fontWeight={600}>
                  {task.title}
                  {task.status === 'done' ? ' · 완료' : end < nowMs ? '' : ' · 진행/예정'}
                </text>
              </g>
            );
          })}

          {regularTasks.map((task) => {
            const due = toDate(task.dueAt)?.getTime() ?? endMs;
            const y = headerHeight + rowIndex++ * (barHeight + rowGap);
            const doneColor = '#10b981';
            const lateColor = '#ef4444';
            const todoColor = '#0ea5e9';
            const color = task.status === 'done' ? doneColor : due < nowMs ? lateColor : todoColor;
            return (
              <g key={task.id}>
                <circle cx={Math.min(width - 6, Math.max(6, x(due)))} cy={y + barHeight / 2} r={6} fill={color} />
                <text x={Math.min(width - 130, Math.max(16, x(due) + 12))} y={y + barHeight / 2 + 4} fontSize={11} fill="#404040">
                  {task.title}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="text-muted-foreground mt-3 text-xs">
          파란 점 = 예정 · 초록 = 완료 · 빨강 = 마감 경과. 마일스톤 막대는 할 일과 연결돼 있어요.
        </p>
      </CardContent>
    </Card>
  );
}

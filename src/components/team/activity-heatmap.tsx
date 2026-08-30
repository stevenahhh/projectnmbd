'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContributionResult } from '@/lib/contribution';
import { formatKST } from '@/lib/time';
import type { Team } from '@/lib/types';

interface Bubble {
  x: number;
  y: number;
  who: string;
  day: string;
  count: number;
  items: string[];
}

function cellColor(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 2) return 'bg-primary/30';
  if (count <= 5) return 'bg-primary/55';
  if (count <= 10) return 'bg-primary/75';
  return 'bg-primary';
}

/** 활동 시간축 — 총량은 부풀릴 수 있어도 서버가 찍은 날짜는 못 바꾼다. */
export function ActivityHeatmap({ team, result }: { team: Team; result: ContributionResult }) {
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const show = (element: Element, uid: string, day: string) => {
    const rect = element.getBoundingClientRect();
    setBubble({
      x: rect.left + rect.width / 2,
      y: rect.top,
      who: team.members[uid].nickname,
      day,
      count: result.timeline[uid]?.[day] ?? 0,
      items: result.timelineDetails[uid]?.[day] ?? [],
    });
  };

  return (
    <Card id="tutorial-timeline" className="xl:col-span-2">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">활동 시간축 · {formatKST(team.startAt, 'date')} ~</CardTitle>
        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
          적음
          <span className="bg-muted size-2.5 rounded-[3px]" />
          <span className="bg-primary/30 size-2.5 rounded-[3px]" />
          <span className="bg-primary/55 size-2.5 rounded-[3px]" />
          <span className="bg-primary/75 size-2.5 rounded-[3px]" />
          <span className="bg-primary size-2.5 rounded-[3px]" />
          많음
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 overflow-x-auto">
        {result.members.map((member) => (
          <div key={member.uid} className="flex items-center gap-3">
            <span className="text-muted-foreground w-16 shrink-0 truncate text-right text-xs">
              {team.members[member.uid].nickname}
            </span>
            <div className="flex flex-1 gap-1">
              {result.timelineDays.map((day) => (
                <span
                  key={day}
                  tabIndex={0}
                  onMouseEnter={(e) => show(e.currentTarget, member.uid, day)}
                  onMouseLeave={() => setBubble(null)}
                  onFocus={(e) => show(e.currentTarget, member.uid, day)}
                  onBlur={() => setBubble(null)}
                  className={`hover:ring-primary/60 size-4.5 shrink-0 cursor-pointer rounded-[3px] outline-none transition-transform hover:scale-110 hover:ring-2 focus-visible:ring-2 ${cellColor(result.timeline[member.uid]?.[day] ?? 0)}`}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="text-muted-foreground flex items-center justify-between text-[10px]">
          <span>{result.timelineDays[0] ?? ''}</span>
          <span>{result.timelineDays[result.timelineDays.length - 1] ?? ''}</span>
        </div>
      </CardContent>

      {bubble ? (
        <div
          className="pointer-events-none fixed z-50 w-64 -translate-x-1/2 -translate-y-full"
          style={{ left: bubble.x, top: bubble.y - 10 }}
        >
          <div className="bg-popover text-popover-foreground rounded-lg border p-3 shadow-lg">
            <p className="text-xs font-semibold">
              {bubble.who} · {bubble.day.split('-').map(Number).join('. ')}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">활동 {bubble.count}개</p>
            {bubble.items.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1">
                {bubble.items.slice(0, 5).map((item, index) => (
                  <li key={index} className="truncate text-[11px]">
                    · {item}
                  </li>
                ))}
                {bubble.count > Math.min(bubble.items.length, 5) ? (
                  <li className="text-muted-foreground text-[11px]">
                    외 {bubble.count - Math.min(bubble.items.length, 5)}건
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-2 text-[11px]">기록 없음</p>
            )}
          </div>
          <div className="bg-popover mx-auto -mt-1.5 size-3 rotate-45 border-r border-b" />
        </div>
      ) : null}
    </Card>
  );
}

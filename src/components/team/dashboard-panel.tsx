'use client';

import { useMemo, useRef, useState } from 'react';
import { Activity, CalendarClock, CheckCircle2, Download, Timer } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  aggregateContribution,
  describeEvent,
  type AggregatableEvent,
  type AggregatableTask,
} from '@/lib/contribution';
import { formatKST } from '@/lib/time';
import { ContributionPie } from './contribution-pie';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';

interface DashboardPanelProps {
  team: Team;
  events: LedgerEvent[];
  tasks: TeamTask[];
}

interface Bubble {
  x: number;
  y: number;
  who: string;
  day: string;
  count: number;
  items: string[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className="bg-secondary text-secondary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
          {hint ? <p className="text-muted-foreground truncate text-[11px]">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPanel({ team, events, tasks }: DashboardPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [now] = useState(() => new Date());

  const result = useMemo(() => {
    const memberUids = Object.keys(team.members);
    const aggregatableEvents: AggregatableEvent[] = events.map((e) => ({
      actorUid: e.actorUid,
      type: e.type,
      payload: e.payload ?? {},
      at: e.at ? e.at.toDate() : null,
    }));
    const aggregatableTasks: AggregatableTask[] = tasks.map((t) => ({
      id: t.id,
      assigneeUid: t.assigneeUid,
      dueAt: t.dueAt.toDate(),
      status: t.status,
    }));
    return aggregateContribution({
      memberUids,
      events: aggregatableEvents,
      tasks: aggregatableTasks,
      weights: team.weights,
      startAt: team.startAt.toDate(),
      dueAt: team.dueAt.toDate(),
      now,
    });
  }, [team, events, tasks, now]);

  const stats = useMemo(() => {
    const openTasks = tasks.filter((t) => t.status !== 'done');
    const soon = openTasks.filter((t) => {
      const due = t.dueAt.toDate().getTime();
      return due >= now.getTime() && due - now.getTime() <= 48 * 3600_000;
    });
    const overdue = openTasks.filter((t) => t.dueAt.toDate().getTime() < now.getTime());
    const weekAgo = now.getTime() - 7 * 86400_000;
    const weekEvents = events.filter((e) => (e.at ? e.at.toDate().getTime() >= weekAgo : false));
    const remainDays = Math.ceil((team.dueAt.toDate().getTime() - now.getTime()) / 86400000);
    return { openTasks, soon, overdue, weekEvents, remainDays };
  }, [tasks, events, team, now]);

  const recent = useMemo(
    () =>
      [...events]
        .filter((e) => e.at)
        .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0))
        .slice(0, 10),
    [events],
  );

  const exportPng = async (excludeImages: boolean) => {
    if (!surfaceRef.current) return;
    setExporting(true);
    try {
      const filter = excludeImages ? (node: HTMLElement) => node.tagName !== 'IMG' : undefined;
      const dataUrl = await toPng(surfaceRef.current, { filter, pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `기여리포트-${team.name}-${excludeImages ? '썸네일제외' : '전체'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG로 저장했어요');
    } catch {
      toast.error('PNG를 만들지 못했어요 — 썸네일 제외로 다시 시도해보세요');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="남은 기간"
          value={stats.remainDays >= 0 ? `D-${stats.remainDays}` : `D+${Math.abs(stats.remainDays)}`}
          hint={`마감 ${formatKST(team.dueAt, 'date')}`}
        />
        <StatCard
          icon={CheckCircle2}
          label="진행 중 할 일"
          value={`${stats.openTasks.length}건`}
          hint={`완료 ${tasks.length - stats.openTasks.length}건`}
        />
        <StatCard
          icon={Timer}
          label="48시간 내 마감"
          value={`${stats.soon.length}건`}
          hint={stats.overdue.length > 0 ? `마감 지남 ${stats.overdue.length}건` : '지난 마감 없음'}
        />
        <StatCard
          icon={Activity}
          label="최근 7일 활동"
          value={`${stats.weekEvents.length}개`}
          hint={`팀원 ${Object.keys(team.members).length}명`}
        />
      </div>

      <div ref={surfaceRef} id="report-surface" className="flex flex-col gap-4 bg-background p-1">
        <Card id="tutorial-bars">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">기여도</CardTitle>
            <div className="flex gap-2" data-no-export>
              <Button id="tutorial-export" size="sm" onClick={() => void exportPng(false)} disabled={exporting}>
                <Download /> 리포트 PNG
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportPng(true)} disabled={exporting}>
                썸네일 제외
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ContributionPie team={team} members={result.members} />
            {result.concentrated ? (
              <p className="text-muted-foreground text-xs">최다 기여자 비중 {Math.round(result.topShare * 100)}%</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
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
                    {result.timelineDays.map((day) => {
                      const count = result.timeline[member.uid]?.[day] ?? 0;
                      const items = result.timelineDetails[member.uid]?.[day] ?? [];
                      const color =
                        count === 0
                          ? 'bg-muted'
                          : count <= 2
                            ? 'bg-primary/30'
                            : count <= 5
                              ? 'bg-primary/55'
                              : count <= 10
                                ? 'bg-primary/75'
                                : 'bg-primary';
                      return (
                        <span
                          key={day}
                          tabIndex={0}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setBubble({
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              who: team.members[member.uid].nickname,
                              day,
                              count,
                              items,
                            });
                          }}
                          onMouseLeave={() => setBubble(null)}
                          onFocus={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setBubble({
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              who: team.members[member.uid].nickname,
                              day,
                              count,
                              items,
                            });
                          }}
                          onBlur={() => setBubble(null)}
                          className={`hover:ring-primary/60 size-4.5 shrink-0 cursor-pointer rounded-[3px] outline-none transition-transform hover:scale-110 hover:ring-2 focus-visible:ring-2 ${color}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                <span>{result.timelineDays[0] ?? ''}</span>
                <span>{result.timelineDays[result.timelineDays.length - 1] ?? ''}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 활동</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {recent.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-xs">
                  <span className="bg-primary/70 mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-medium">{team.members[event.actorUid]?.nickname ?? '알 수 없음'}</span>{' '}
                      {describeEvent(event.type, event.payload ?? {})}
                    </p>
                    <p className="text-muted-foreground">{formatKST(event.at)}</p>
                  </div>
                </div>
              ))}
              {recent.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">아직 활동이 없어요</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {bubble ? (
        <div
          className="pointer-events-none fixed z-50 w-64 -translate-x-1/2 -translate-y-full"
          style={{ left: bubble.x, top: bubble.y - 10 }}
        >
          <div className="bg-popover text-popover-foreground rounded-lg border p-3 shadow-lg">
            <p className="text-xs font-semibold">
              {bubble.who} ·{' '}
              {(() => {
                const [y, m, d] = bubble.day.split('-');
                return `${Number(y)}. ${Number(m)}. ${Number(d)}`;
              })()}
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

      <Badge variant="outline" className="self-start text-[11px]">
        가중치 · 문서 {team.weights.doc} / 자료 {team.weights.file} / 할 일 {team.weights.task} / 회의{' '}
        {team.weights.meeting}
      </Badge>
    </div>
  );
}

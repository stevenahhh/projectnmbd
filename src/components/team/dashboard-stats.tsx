'use client';

import { useMemo } from 'react';
import { Activity, CalendarClock, CheckCircle2, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatKST } from '@/lib/time';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';

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

interface DashboardStatsProps {
  team: Team;
  tasks: TeamTask[];
  events: LedgerEvent[];
  now: Date;
}

/** 상단 요약 4장 — 마감이 임박했는지부터 보이게 한다. */
export function DashboardStats({ team, tasks, events, now }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'done');
    const soon = openTasks.filter((task) => {
      const due = task.dueAt.toDate().getTime();
      return due >= now.getTime() && due - now.getTime() <= 48 * 3600_000;
    });
    const overdue = openTasks.filter((task) => task.dueAt.toDate().getTime() < now.getTime());
    const weekAgo = now.getTime() - 7 * 86400_000;
    const weekEvents = events.filter((event) => (event.at ? event.at.toDate().getTime() >= weekAgo : false));
    const remainDays = Math.ceil((team.dueAt.toDate().getTime() - now.getTime()) / 86400000);
    return { openTasks, soon, overdue, weekEvents, remainDays };
  }, [tasks, events, team, now]);

  return (
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
  );
}

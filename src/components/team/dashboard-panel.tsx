'use client';

import { useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { aggregateContribution, type AggregatableEvent, type AggregatableTask } from '@/lib/contribution';
import { describeEvent } from '@/lib/event-text';
import { formatKST } from '@/lib/time';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';
import { ActivityHeatmap } from './activity-heatmap';
import { ContributionPie } from './contribution-pie';
import { DashboardStats } from './dashboard-stats';
import { ManualNote } from './manual-note';

interface DashboardPanelProps {
  team: Team;
  events: LedgerEvent[];
  tasks: TeamTask[];
  uid: string;
}

/** 홈 — 기여 분포와 활동 시간축, 그리고 동료평가에 낼 한 장. */
export function DashboardPanel({ team, events, tasks, uid }: DashboardPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [now] = useState(() => new Date());

  const result = useMemo(() => {
    const aggregatableEvents: AggregatableEvent[] = events.map((event) => ({
      actorUid: event.actorUid,
      type: event.type,
      payload: event.payload ?? {},
      at: event.at ? event.at.toDate() : null,
    }));
    const aggregatableTasks: AggregatableTask[] = tasks.map((task) => ({
      id: task.id,
      assigneeUid: task.assigneeUid,
      dueAt: task.dueAt.toDate(),
      status: task.status,
    }));
    return aggregateContribution({
      memberUids: Object.keys(team.members),
      events: aggregatableEvents,
      tasks: aggregatableTasks,
      weights: team.weights,
      startAt: team.startAt.toDate(),
      dueAt: team.dueAt.toDate(),
      now,
    });
  }, [team, events, tasks, now]);

  const recent = useMemo(
    () =>
      events
        .filter((event) => event.at)
        .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0))
        .slice(0, 10),
    [events],
  );

  const exportPng = async () => {
    if (!surfaceRef.current) return;
    setExporting(true);
    const surface = surfaceRef.current;
    const stamp = formatKST(now, 'date').replaceAll(/[.\s]/g, '');
    const render = (excludeImages: boolean) =>
      toPng(surface, {
        filter: excludeImages ? (node: HTMLElement) => node.tagName !== 'IMG' : undefined,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
    try {
      // 외부 이미지(썸네일)가 CORS 로 막히면 이미지를 빼고 한 번 더 — 사용자가 고를 일이 아니다
      const dataUrl = await render(false).catch(() => render(true));
      const link = document.createElement('a');
      link.download = `Dibs-기여리포트-${team.name}-${stamp}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG로 저장했어요');
    } catch {
      toast.error('PNG를 만들지 못했어요');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DashboardStats team={team} tasks={tasks} events={events} now={now} />

      <div ref={surfaceRef} id="report-surface" className="bg-background flex flex-col gap-4 p-1">
        {/* 제출물로 바로 쓰이므로 팀·기간·생성 시각이 그림 안에 있어야 한다 */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <p className="text-sm font-semibold">
            {team.name} · {team.courseLabel}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatKST(team.startAt, 'date')} ~ {formatKST(team.dueAt, 'date')} · {formatKST(now, 'date')} 기준
          </p>
        </div>

        <Card id="tutorial-bars">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">기여도</CardTitle>
            <div className="flex gap-2" data-no-export>
              {team.archived ? null : <ManualNote team={team} uid={uid} />}
              <Button id="tutorial-export" size="sm" onClick={() => void exportPng()} disabled={exporting}>
                <Download /> 동료평가용 리포트 저장
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
          <ActivityHeatmap team={team} result={result} />

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

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[11px]">
          가중치 · 문서 {team.weights.doc} / 자료 {team.weights.file} / 할 일 {team.weights.task} / 회의{' '}
          {team.weights.meeting}
        </Badge>
        <span className="text-muted-foreground text-[11px]">대화와 활동일은 참고용이라 %에는 들어가지 않아요</span>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { aggregateContribution, type AggregatableEvent, type AggregatableTask } from '@/lib/contribution';
import { formatKST } from '@/lib/time';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';

interface DashboardPanelProps {
  team: Team;
  events: LedgerEvent[];
  tasks: TeamTask[];
}

/**
 * 대시보드 (§2.2-①) — 막대(총량) 주인공 + 시간축 분포 보조.
 * 판단어 0 — 시스템은 판정하지 않고 공백이 보이게 할 뿐이다 (§3).
 */
export function DashboardPanel({ team, events, tasks }: DashboardPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
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

  const exportPng = async (excludeImages: boolean) => {
    if (!surfaceRef.current) return;
    setExporting(true);
    try {
      const filter = excludeImages
        ? (node: HTMLElement) => node.tagName !== 'IMG'
        : undefined;
      const dataUrl = await toPng(surfaceRef.current, { filter, pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `기여리포트-${team.name}-${excludeImages ? '썸네일제외' : '전체'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG 저장 완료 — 동료평가 첨부물로 쓰세요');
    } catch {
      toast.error('PNG 생성 실패 — 썸네일 제외 모드로 다시 시도해보세요');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div ref={surfaceRef} id="report-surface" className="flex flex-col gap-4 bg-background p-1">
        <Card id="tutorial-bars">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">기여도</CardTitle>
            </div>
            <div className="flex gap-2" data-no-export>
              <Button id="tutorial-export" size="sm" onClick={() => void exportPng(false)} disabled={exporting}>
                <Download /> 리포트 PNG
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportPng(true)} disabled={exporting}>
                썸네일 제외
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {result.members.map((member) => {
              const info = team.members[member.uid];
              return (
                <div key={member.uid} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {info.nickname}
                      {info.roleLabel ? <span className="text-muted-foreground ml-2 text-xs">{info.roleLabel}</span> : null}
                      {team.leaderUid === member.uid ? <span className="bg-primary text-primary-foreground ml-2 rounded px-1.5 py-0.5 text-[10px]">팀장</span> : null}
                    </span>
                    <span className="tabular-nums">{member.percent.toFixed(0)}%</span>
                  </div>
                  <div className="bg-secondary h-3 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, member.percent)}%` }}
                    />
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    <span>문서 {member.raw.docChars.toLocaleString()}자</span>
                    <span>자료 {member.raw.fileCount}건 + 첨삭 {member.raw.commentCount}건</span>
                    <span>할 일 {member.raw.taskDone}/{member.raw.taskAssigned} (정시 {member.raw.taskOnTime})</span>
                    <span>회의 {member.raw.meetingAttend}회</span>
                    <span>수동 기록 {member.raw.noteCount}건</span>
                    <span>활동 {member.raw.activeDays}일</span>
                    {member.inactive ? (
                      <span className="text-destructive font-medium">
                        최근 {member.inactiveDays ?? '—'}일 활동 없음
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {result.concentrated ? (
              <p className="text-muted-foreground text-xs">
                최다 기여자 비중 {Math.round(result.topShare * 100)}%
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card id="tutorial-timeline">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">활동 시간축 · {formatKST(team.startAt, 'date')} ~</CardTitle>
            <span className="text-muted-foreground min-h-5 text-xs tabular-nums">{hovered ?? ''}</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 overflow-x-auto">
            {result.members.map((member) => (
              <div key={member.uid} className="flex items-center gap-2">
                <span className="text-muted-foreground w-12 shrink-0 text-right text-xs">{team.members[member.uid].nickname}</span>
                <div className="flex flex-1 gap-[3px]">
                  {result.timelineDays.map((day) => {
                    const count = result.timeline[member.uid]?.[day] ?? 0;
                    const [y, m, d] = day.split('-');
                    const label = `${team.members[member.uid].nickname} · ${Number(y)}. ${Number(m)}. ${Number(d)} - ${count}개 활동`;
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
                        title={label}
                        onMouseEnter={() => setHovered(label)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(label)}
                        onBlur={() => setHovered(null)}
                        tabIndex={0}
                        className={`hover:ring-primary/60 size-3 shrink-0 cursor-pointer rounded-[2px] outline-none hover:ring-2 focus-visible:ring-2 ${color}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="text-muted-foreground flex items-center justify-between text-[10px]">
              <span>{result.timelineDays[0] ?? ''}</span>
              <span className="flex items-center gap-1">
                활동 적음
                <span className="bg-muted size-2.5 rounded-[2px]" />
                <span className="bg-primary/30 size-2.5 rounded-[2px]" />
                <span className="bg-primary/55 size-2.5 rounded-[2px]" />
                <span className="bg-primary/75 size-2.5 rounded-[2px]" />
                <span className="bg-primary size-2.5 rounded-[2px]" />
                활동 많음
              </span>
              <span>{result.timelineDays[result.timelineDays.length - 1] ?? ''}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

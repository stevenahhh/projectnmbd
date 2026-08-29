'use client';

import { useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { aggregateContribution, type AggregatableEvent, type AggregatableTask } from '@/lib/contribution';
import { formatKST } from '@/lib/time';
import type { LedgerEvent, Team, TeamTask, UserProfile } from '@/lib/types';

interface DashboardPanelProps {
  team: Team;
  events: LedgerEvent[];
  tasks: TeamTask[];
  profile: UserProfile | null;
}

/**
 * 대시보드 (§2.2-①) — 막대(총량) 주인공 + 시간축 분포 보조.
 * 판단어 0 — 시스템은 판정하지 않고 공백이 보이게 할 뿐이다 (§3).
 */
export function DashboardPanel({ team, events, tasks, profile }: DashboardPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
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
      now: new Date(),
    });
  }, [team, events, tasks]);

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
              <CardTitle className="text-lg">기여도 — {team.name}</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {team.goal} · D-{Math.max(0, Math.ceil((team.dueAt.toDate().getTime() - now.getTime()) / 86400000))} · 가중치 (문서 {team.weights.doc} / 자료 {team.weights.file} / 할 일 {team.weights.task} / 회의 {team.weights.meeting} / 수동 {team.weights.note}) · 활동일은 참고축
              </p>
              <Badge id="tutorial-ledger" variant="secondary" className="mt-2">
                활동 원장 — 서버 시각 기록 · 추가만 가능
              </Badge>
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
              const isSelf = profile && member.uid === Object.keys(team.members).find(() => false);
              void isSelf;
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
                분포: 최다 기여자 비중 {Math.round(result.topShare * 100)}% — 수치는 사실이고 해석은 팀이 합니다
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card id="tutorial-timeline">
          <CardHeader>
            <CardTitle className="text-base">시간축 (서버 시각 · {formatKST(team.startAt, 'date')} ~)</CardTitle>
            <p className="text-muted-foreground text-xs">
              총량은 몰아 적어 부풀릴 수 있지만, 서버가 찍은 시각은 못 바꿉니다
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 overflow-x-auto">
            {result.members.map((member) => (
              <div key={member.uid} className="flex items-center gap-2">
                <span className="text-muted-foreground w-12 shrink-0 text-right text-xs">{team.members[member.uid].nickname}</span>
                <div className="relative flex h-4 flex-1 items-center">
                  {result.timelineDays.map((day) => {
                    const count = result.timeline[member.uid]?.[day] ?? 0;
                    if (count === 0) return null;
                    const index = result.timelineDays.indexOf(day);
                    const left = (index / Math.max(1, result.timelineDays.length - 1)) * 100;
                    return (
                      <span
                        key={day}
                        title={`${day} · ${count}건`}
                        className="bg-primary/70 absolute size-2 -translate-x-1/2 rounded-full"
                        style={{ left: `${left}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>{result.timelineDays[0] ?? ''}</span>
              <span>{result.timelineDays[Math.floor(result.timelineDays.length / 2)] ?? ''}</span>
              <span>{result.timelineDays[result.timelineDays.length - 1] ?? ''}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

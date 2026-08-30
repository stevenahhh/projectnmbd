'use client';

import { useMemo, useState } from 'react';
import { History, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateMilestone } from '@/lib/team-ops';
import { formatKST, toDate } from '@/lib/time';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';

interface GanttPanelProps {
  team: Team;
  tasks: TeamTask[];
  events: LedgerEvent[];
  uid: string;
}

const BAR_COLORS = ['#4b5bd6', '#7c5cd6', '#2f8fbf', '#3f9e78', '#c07b2f', '#5b6478'];
const DONE_COLOR = '#3f9e78';
const LATE_COLOR = '#c4453c';
const TODO_COLOR = '#4b5bd6';

/** 날짜 input(datetime-local)용 문자열 — 로컬 시간대 기준. */
function toInputValue(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 타임라인 (§2.8-4) — SVG 직접 작성. 막대를 눌러 기간을 고치면 수정 이력이 남는다. */
export function GanttPanel({ team, tasks, events, uid }: GanttPanelProps) {
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [nowMs] = useState(() => Date.now());
  const [editing, setEditing] = useState<TeamTask | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState({ title: '', startAt: '', dueAt: '' });
  const [saving, setSaving] = useState(false);

  const { milestones, regularTasks, startMs, endMs } = useMemo(() => {
    const milestoneTasks = tasks.filter((t) => t.milestoneId && t.milestoneStartAt);
    const rest = tasks.filter((t) => !t.milestoneId);
    const starts = [
      team.startAt.toDate().getTime(),
      ...milestoneTasks.map((t) => toDate(t.milestoneStartAt)?.getTime() ?? Infinity),
    ];
    const ends = [team.dueAt.toDate().getTime(), ...tasks.map((t) => toDate(t.dueAt)?.getTime() ?? 0)];
    return {
      milestones: milestoneTasks,
      regularTasks: rest,
      startMs: Math.min(...starts),
      endMs: Math.max(...ends),
    };
  }, [team, tasks]);

  const history = useMemo(
    () =>
      events
        .filter((e) => e.type === 'milestone.update')
        .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0)),
    [events],
  );

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
        ticks.push({ x: ((cursor.getTime() - startMs) / span) * width, label: `${cursor.getUTCMonth() + 1}월` });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return ticks;
  }, [startMs, endMs, span]);

  const openEdit = (task: TeamTask) => {
    setEditing(task);
    setForm({
      title: task.title,
      startAt: toInputValue(toDate(task.milestoneStartAt)),
      dueAt: toInputValue(task.dueAt.toDate()),
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!form.title.trim() || !form.dueAt) {
      toast.error('제목과 마감을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      await updateMilestone(team.id, uid, editing, {
        title: form.title.trim(),
        startAt: form.startAt ? new Date(form.startAt) : null,
        dueAt: new Date(form.dueAt),
      });
      setEditing(null);
      toast.success('기간을 수정했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수정하지 못했어요');
    } finally {
      setSaving(false);
    }
  };

  let rowIndex = 0;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">타임라인</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div id="tut-timeline-legend" className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: TODO_COLOR }} /> 예정
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: DONE_COLOR }} /> 완료
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: LATE_COLOR }} /> 마감 지남
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-[3px]" style={{ background: BAR_COLORS[0] }} /> 기간 항목
            </span>
          </div>
          <Button id="tut-timeline-history" size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
            <History /> 수정 이력 {history.length > 0 ? history.length : ''}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <p className="text-muted-foreground mb-2 text-xs">막대나 항목을 클릭하면 제목·기간을 고칠 수 있어요</p>
        <svg id="tut-timeline-chart" viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" role="img" aria-label="타임라인">
          {monthTicks.map((tick) => (
            <g key={tick.label + tick.x}>
              <line x1={tick.x} y1={0} x2={tick.x} y2={height} stroke="currentColor" strokeWidth={1} className="text-border" />
              <text x={tick.x + 4} y={14} fontSize={10} fill="currentColor" className="text-muted-foreground">
                {tick.label}
              </text>
            </g>
          ))}

          {milestones.map((task) => {
            const start = toDate(task.milestoneStartAt)?.getTime() ?? startMs;
            const end = toDate(task.dueAt)?.getTime() ?? endMs;
            const y = headerHeight + rowIndex++ * (barHeight + rowGap);
            const color = task.status === 'done' ? '#9aa0aa' : BAR_COLORS[(rowIndex - 1) % BAR_COLORS.length];
            return (
              <g key={task.id} className="cursor-pointer" onClick={() => openEdit(task)}>
                <rect
                  x={x(start)}
                  y={y}
                  width={Math.max(6, x(end) - x(start))}
                  height={barHeight}
                  rx={5}
                  fill={color}
                  opacity={task.status === 'done' ? 0.55 : 0.95}
                />
                <text x={x(start) + 8} y={y + 15} fontSize={11} fill="#ffffff" fontWeight={600}>
                  {task.title}
                  {task.status === 'done' ? ' · 완료' : ''}
                </text>
              </g>
            );
          })}

          {regularTasks.map((task) => {
            const due = toDate(task.dueAt)?.getTime() ?? endMs;
            const y = headerHeight + rowIndex++ * (barHeight + rowGap);
            const color = task.status === 'done' ? DONE_COLOR : due < nowMs ? LATE_COLOR : TODO_COLOR;
            return (
              <g key={task.id} className="cursor-pointer" onClick={() => openEdit(task)}>
                <circle cx={Math.min(width - 6, Math.max(6, x(due)))} cy={y + barHeight / 2} r={6} fill={color} />
                <text
                  x={Math.min(width - 130, Math.max(16, x(due) + 12))}
                  y={y + barHeight / 2 + 4}
                  fontSize={11}
                  fill="currentColor"
                  className="text-foreground"
                >
                  {task.title}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? setEditing(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4" /> 타임라인 항목 수정
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-title">제목</Label>
              <Input id="g-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            {editing?.milestoneStartAt ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="g-start">시작</Label>
                <Input
                  id="g-start"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-due">마감</Label>
              <Input
                id="g-due"
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>수정 이력</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col divide-y overflow-auto">
            {history.map((event) => {
              const payload = (event.payload ?? {}) as { title?: string; dueAt?: string; prevDueAt?: string };
              return (
                <div key={event.id} className="flex flex-col gap-0.5 py-2.5 text-xs">
                  <span className="font-medium">
                    {team.members[event.actorUid]?.nickname ?? '알 수 없음'} · {payload.title ?? '항목'}
                  </span>
                  <span className="text-muted-foreground">
                    {formatKST(event.at)}
                    {payload.prevDueAt && payload.dueAt
                      ? ` · 마감 ${formatKST(new Date(payload.prevDueAt))} → ${formatKST(new Date(payload.dueAt))}`
                      : ''}
                  </span>
                </div>
              );
            })}
            {history.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">아직 수정한 기록이 없어요</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

const SNAP_MS = 30 * 60 * 1000;
const VIEW_WIDTH = 960;
const AXIS_HEIGHT = 46;
const BAR_HEIGHT = 26;
const ROW_GAP = 12;
const HANDLE_PX = 10;

type DragMode = 'move' | 'start' | 'end';

interface DragState {
  taskId: string;
  mode: DragMode;
  pointerX: number;
  baseStart: number;
  baseEnd: number;
  startMs: number;
  endMs: number;
}

interface Bubble {
  x: number;
  y: number;
  lines: string[];
}

/** 날짜·시간 말풍선 표기 — 2026/08/01 19:00 형식. */
function stamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function snap(ms: number): number {
  return Math.round(ms / SNAP_MS) * SNAP_MS;
}

function toInputValue(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 타임라인 (§2.8-4) — SVG 직접 작성.
 * 기간이 있는 항목은 막대로 끌어 옮기거나 늘리고(30분 단위), 마감만 있는 할 일은 위쪽 축에 점으로 모은다.
 */
export function GanttPanel({ team, tasks, events, uid }: GanttPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [nowMs] = useState(() => Date.now());
  const [editing, setEditing] = useState<TeamTask | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState({ title: '', startAt: '', dueAt: '' });
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const { bars, deadlines, startMs, endMs } = useMemo(() => {
    const barTasks = tasks.filter((t) => t.milestoneStartAt);
    const rest = tasks.filter((t) => !t.milestoneStartAt);
    const starts = [team.startAt.toDate().getTime(), ...barTasks.map((t) => toDate(t.milestoneStartAt)?.getTime() ?? Infinity)];
    const ends = [team.dueAt.toDate().getTime(), ...tasks.map((t) => toDate(t.dueAt)?.getTime() ?? 0)];
    return { bars: barTasks, deadlines: rest, startMs: Math.min(...starts), endMs: Math.max(...ends) };
  }, [team, tasks]);

  const history = useMemo(
    () =>
      events
        .filter((e) => e.type === 'milestone.update')
        .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0)),
    [events],
  );

  /** 마감만 있는 할 일은 날짜별로 묶어 축에 점 하나로 세운다. */
  const deadlineGroups = useMemo(() => {
    const groups = new Map<string, { ms: number; items: TeamTask[] }>();
    for (const task of deadlines) {
      const due = task.dueAt.toDate();
      const key = `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
      const bucket = groups.get(key);
      if (bucket) bucket.items.push(task);
      else groups.set(key, { ms: due.getTime(), items: [task] });
    }
    return [...groups.values()].sort((a, b) => a.ms - b.ms);
  }, [deadlines]);

  const span = Math.max(1, endMs - startMs);
  const height = AXIS_HEIGHT + Math.max(1, bars.length) * (BAR_HEIGHT + ROW_GAP) + 16;
  const x = (ms: number) => ((ms - startMs) / span) * VIEW_WIDTH;
  const msPerViewPx = span / VIEW_WIDTH;

  const monthTicks = useMemo(() => {
    const ticks: { x: number; label: string }[] = [];
    const cursor = new Date(startMs);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= endMs) {
      if (cursor.getTime() >= startMs) {
        ticks.push({ x: ((cursor.getTime() - startMs) / span) * VIEW_WIDTH, label: `${cursor.getMonth() + 1}월` });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }, [startMs, endMs, span]);

  /** 클라이언트 픽셀 이동량을 시간으로 환산한다 (viewBox 스케일 보정). */
  const pxToMs = (dxClient: number): number => {
    const rect = svgRef.current?.getBoundingClientRect();
    const scale = rect && rect.width > 0 ? VIEW_WIDTH / rect.width : 1;
    return dxClient * scale * msPerViewPx;
  };

  useEffect(() => {
    if (!drag) return;

    const move = (event: PointerEvent) => {
      const deltaMs = pxToMs(event.clientX - drag.pointerX);
      let startNext = drag.baseStart;
      let endNext = drag.baseEnd;
      if (drag.mode === 'move') {
        startNext = snap(drag.baseStart + deltaMs);
        endNext = startNext + (drag.baseEnd - drag.baseStart);
      } else if (drag.mode === 'start') {
        startNext = Math.min(snap(drag.baseStart + deltaMs), drag.baseEnd - SNAP_MS);
      } else {
        endNext = Math.max(snap(drag.baseEnd + deltaMs), drag.baseStart + SNAP_MS);
      }
      setDrag({ ...drag, startMs: startNext, endMs: endNext });
      setBubble({ x: event.clientX, y: event.clientY, lines: [`${stamp(startNext)} - ${stamp(endNext)}`] });
    };

    const up = async () => {
      const task = tasks.find((t) => t.id === drag.taskId);
      setDrag(null);
      setBubble(null);
      if (!task) return;
      const movedStart = drag.startMs !== drag.baseStart;
      const movedEnd = drag.endMs !== drag.baseEnd;
      if (!movedStart && !movedEnd) return;
      try {
        await updateMilestone(team.id, uid, task, {
          title: task.title,
          startAt: new Date(drag.startMs),
          dueAt: new Date(drag.endMs),
        });
        toast.success(`${stamp(drag.startMs)} - ${stamp(drag.endMs)}로 옮겼어요`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '수정하지 못했어요');
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, tasks, team.id, uid]);

  const beginDrag = (event: React.PointerEvent, task: TeamTask, mode: DragMode) => {
    if (team.archived) return;
    event.preventDefault();
    const baseStart = toDate(task.milestoneStartAt)?.getTime() ?? task.dueAt.toDate().getTime() - SNAP_MS;
    const baseEnd = task.dueAt.toDate().getTime();
    setDrag({ taskId: task.id, mode, pointerX: event.clientX, baseStart, baseEnd, startMs: baseStart, endMs: baseEnd });
    setBubble({ x: event.clientX, y: event.clientY, lines: [`${stamp(baseStart)} - ${stamp(baseEnd)}`] });
  };

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
      toast.success('수정했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수정하지 못했어요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">타임라인</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div id="tut-timeline-legend" className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: TODO_COLOR }} /> 예정 마감
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
        <p className="text-muted-foreground mb-2 text-xs">
          막대를 끌면 기간이 옮겨지고, 양 끝을 끌면 30분 단위로 조절됩니다. 제목을 누르면 이름을 바꿀 수 있어요.
        </p>
        <svg
          id="tut-timeline-chart"
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          className="min-w-[760px] touch-none select-none"
          role="img"
          aria-label="타임라인"
        >
          {monthTicks.map((tick) => (
            <g key={tick.label + tick.x}>
              <line x1={tick.x} y1={AXIS_HEIGHT - 12} x2={tick.x} y2={height} stroke="currentColor" strokeWidth={1} className="text-border" />
              <text x={tick.x + 4} y={12} fontSize={10} fill="currentColor" className="text-muted-foreground">
                {tick.label}
              </text>
            </g>
          ))}

          {/* 오늘 기준선 */}
          {nowMs >= startMs && nowMs <= endMs ? (
            <line
              x1={x(nowMs)}
              y1={AXIS_HEIGHT - 12}
              x2={x(nowMs)}
              y2={height}
              stroke={LATE_COLOR}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.5}
            />
          ) : null}

          {/* 마감 마커 — 날짜별로 묶어 축에 점 + 점선 */}
          {deadlineGroups.map((group) => {
            const cx = Math.min(VIEW_WIDTH - 8, Math.max(8, x(group.ms)));
            const allDone = group.items.every((t) => t.status === 'done');
            const anyLate = group.items.some((t) => t.status !== 'done' && t.dueAt.toDate().getTime() < nowMs);
            const color = anyLate ? LATE_COLOR : allDone ? DONE_COLOR : TODO_COLOR;
            const labelLeft = cx > VIEW_WIDTH - 80;
            return (
              <g key={group.ms}>
                <line
                  x1={cx}
                  y1={AXIS_HEIGHT - 6}
                  x2={cx}
                  y2={height}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.35}
                />
                <circle
                  cx={cx}
                  cy={AXIS_HEIGHT - 18}
                  r={6}
                  fill={color}
                  className="cursor-pointer"
                  onPointerEnter={(e) =>
                    setBubble({
                      x: e.clientX,
                      y: e.clientY,
                      lines: [
                        `${stamp(group.ms).slice(0, 10)} 마감 ${group.items.length}개`,
                        ...group.items.slice(0, 5).map((t) => `· ${t.title}${t.status === 'done' ? ' (완료)' : ''}`),
                        ...(group.items.length > 5 ? [`외 ${group.items.length - 5}개`] : []),
                      ],
                    })
                  }
                  onPointerLeave={() => setBubble(null)}
                />
                <text
                  x={labelLeft ? cx - 10 : cx + 10}
                  y={AXIS_HEIGHT - 14}
                  fontSize={11}
                  textAnchor={labelLeft ? 'end' : 'start'}
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  {group.items.length}개
                </text>
              </g>
            );
          })}

          {/* 기간 막대 */}
          {bars.map((task, index) => {
            const dragging = drag?.taskId === task.id;
            const start = dragging ? drag.startMs : toDate(task.milestoneStartAt)?.getTime() ?? startMs;
            const end = dragging ? drag.endMs : task.dueAt.toDate().getTime();
            const y = AXIS_HEIGHT + index * (BAR_HEIGHT + ROW_GAP);
            const color = task.status === 'done' ? '#9aa0aa' : BAR_COLORS[index % BAR_COLORS.length];
            const left = x(start);
            const width = Math.max(12, x(end) - x(start));
            return (
              <g key={task.id}>
                <rect
                  x={left}
                  y={y}
                  width={width}
                  height={BAR_HEIGHT}
                  rx={6}
                  fill={color}
                  opacity={task.status === 'done' ? 0.55 : 0.95}
                  className={team.archived ? '' : 'cursor-grab'}
                  onPointerDown={(e) => beginDrag(e, task, 'move')}
                />
                {/* 양 끝 리사이즈 핸들 */}
                <rect
                  x={left}
                  y={y}
                  width={HANDLE_PX}
                  height={BAR_HEIGHT}
                  fill="#ffffff"
                  opacity={0.001}
                  className={team.archived ? '' : 'cursor-ew-resize'}
                  onPointerDown={(e) => beginDrag(e, task, 'start')}
                />
                <rect
                  x={left + width - HANDLE_PX}
                  y={y}
                  width={HANDLE_PX}
                  height={BAR_HEIGHT}
                  fill="#ffffff"
                  opacity={0.001}
                  className={team.archived ? '' : 'cursor-ew-resize'}
                  onPointerDown={(e) => beginDrag(e, task, 'end')}
                />
                <text
                  x={left + 10}
                  y={y + 17}
                  fontSize={11}
                  fill="#ffffff"
                  fontWeight={600}
                  className="cursor-text"
                  onClick={() => openEdit(task)}
                >
                  {task.title}
                  {task.status === 'done' ? ' · 완료' : ''}
                </text>
              </g>
            );
          })}

          {bars.length === 0 ? (
            <text x={16} y={AXIS_HEIGHT + 24} fontSize={12} fill="currentColor" className="text-muted-foreground">
              기간이 있는 항목이 아직 없어요
            </text>
          ) : null}
        </svg>
      </CardContent>

      {bubble ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: bubble.x, top: bubble.y - 12 }}
        >
          <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-lg">
            {bubble.lines.map((line, index) => (
              <p key={index} className={index === 0 ? 'font-semibold tabular-nums' : 'text-muted-foreground'}>
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? setEditing(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4" /> 항목 수정
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-title">제목</Label>
              <Input
                id="g-title"
                autoFocus
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
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

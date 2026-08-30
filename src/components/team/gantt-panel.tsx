'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { History } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateMilestone } from '@/lib/team-ops';
import { toDate } from '@/lib/time';
import {
  SNAP_MS,
  TIMELINE_COLORS,
  VIEW_WIDTH,
  dragRange,
  groupByDay,
  monthTicks,
  snapToHalfHour,
  stamp,
  toLocalInputValue,
  type DragMode,
  type DragState,
} from '@/lib/timeline';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';
import { TimelineChart, type Bubble } from './timeline-chart';
import { TimelineEditDialog, TimelineHistoryDialog, type TimelineForm } from './timeline-dialogs';

interface GanttPanelProps {
  team: Team;
  tasks: TeamTask[];
  events: LedgerEvent[];
  uid: string;
}

/**
 * 타임라인 (§2.8-4) — 기간이 있는 항목은 막대로 끌어 옮기거나 늘리고(30분 단위),
 * 마감만 있는 할 일은 위쪽 축에 날짜별 점으로 모은다.
 */
export function GanttPanel({ team, tasks, events, uid }: GanttPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [nowMs] = useState(() => Date.now());
  const [editing, setEditing] = useState<TeamTask | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState<TimelineForm>({ title: '', startAt: '', dueAt: '' });
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const { bars, deadlineGroups, startMs, endMs } = useMemo(() => {
    const barTasks = tasks.filter((task) => task.milestoneStartAt);
    const rest = tasks.filter((task) => !task.milestoneStartAt);
    const starts = [
      team.startAt.toDate().getTime(),
      ...barTasks.map((task) => toDate(task.milestoneStartAt)?.getTime() ?? Infinity),
    ];
    const ends = [team.dueAt.toDate().getTime(), ...tasks.map((task) => task.dueAt.toDate().getTime())];
    return {
      bars: barTasks,
      deadlineGroups: groupByDay(rest.map((task) => ({ ms: task.dueAt.toDate().getTime(), item: task }))),
      startMs: Math.min(...starts),
      endMs: Math.max(...ends),
    };
  }, [team, tasks]);

  const history = useMemo(
    () =>
      events
        .filter((event) => event.type === 'milestone.update')
        .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0)),
    [events],
  );

  const ticks = useMemo(() => monthTicks(startMs, endMs), [startMs, endMs]);

  useEffect(() => {
    if (!drag) return;
    const msPerViewPx = Math.max(1, endMs - startMs) / VIEW_WIDTH;

    /** 클라이언트 픽셀 이동량을 시간으로 환산한다 (viewBox 스케일 보정). */
    const pxToMs = (dxClient: number): number => {
      const rect = svgRef.current?.getBoundingClientRect();
      const scale = rect && rect.width > 0 ? VIEW_WIDTH / rect.width : 1;
      return dxClient * scale * msPerViewPx;
    };

    const move = (event: PointerEvent) => {
      const next = dragRange(drag.mode, drag.baseStart, drag.baseEnd, pxToMs(event.clientX - drag.pointerX));
      setDrag({ ...drag, ...next });
      setBubble({ x: event.clientX, y: event.clientY, lines: [`${stamp(next.startMs)} - ${stamp(next.endMs)}`] });
    };

    const up = async () => {
      const task = tasks.find((candidate) => candidate.id === drag.taskId);
      setDrag(null);
      setBubble(null);
      if (!task) return;
      if (drag.startMs === drag.baseStart && drag.endMs === drag.baseEnd) return;
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
  }, [drag, tasks, team.id, uid, startMs, endMs]);

  const beginDrag = (event: React.PointerEvent, task: TeamTask, mode: DragMode) => {
    if (team.archived) return;
    event.preventDefault();
    const baseEnd = task.dueAt.toDate().getTime();
    const baseStart = toDate(task.milestoneStartAt)?.getTime() ?? baseEnd - SNAP_MS;
    setDrag({ taskId: task.id, mode, pointerX: event.clientX, baseStart, baseEnd, startMs: baseStart, endMs: baseEnd });
    setBubble({ x: event.clientX, y: event.clientY, lines: [`${stamp(baseStart)} - ${stamp(baseEnd)}`] });
  };

  const openEdit = (task: TeamTask) => {
    setEditing(task);
    setForm({
      title: task.title,
      startAt: toLocalInputValue(toDate(task.milestoneStartAt)),
      dueAt: toLocalInputValue(task.dueAt.toDate()),
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
        startAt: form.startAt ? new Date(snapToHalfHour(new Date(form.startAt).getTime())) : null,
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
              <span className="size-2.5 rounded-full" style={{ background: TIMELINE_COLORS.todo }} /> 예정 마감
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: TIMELINE_COLORS.done }} /> 완료
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: TIMELINE_COLORS.late }} /> 마감 지남
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-[3px]" style={{ background: TIMELINE_COLORS.bars[0] }} /> 기간 항목
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
        <TimelineChart
          svgRef={svgRef}
          bars={bars}
          deadlineGroups={deadlineGroups}
          ticks={ticks}
          startMs={startMs}
          endMs={endMs}
          nowMs={nowMs}
          archived={Boolean(team.archived)}
          drag={drag}
          onBarPointerDown={beginDrag}
          onTitleClick={openEdit}
          onBubble={setBubble}
        />
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

      <TimelineEditDialog
        editing={editing}
        form={form}
        saving={saving}
        onFormChange={setForm}
        onClose={() => setEditing(null)}
        onSave={() => void save()}
      />

      <TimelineHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} team={team} history={history} />
    </Card>
  );
}

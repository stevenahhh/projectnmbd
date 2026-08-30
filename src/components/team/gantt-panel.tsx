'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimelineDrag, type BarRow } from '@/hooks/use-timeline-drag';
import { useTimelineView } from '@/hooks/use-timeline-view';
import { updateMilestone } from '@/lib/team-ops';
import { toDate } from '@/lib/time';
import {
  AXIS_HEIGHT,
  DAY_MS,
  MARKER_ROW_HEIGHT,
  ROW_PITCH,
  VIEW_WIDTH,
  generateTicks,
  groupByDay,
  niceStep,
  packMarkers,
  snapStepFor,
  snapToHalfHour,
  toLocalInputValue,
  type Bubble,
} from '@/lib/timeline';
import { layoutTree } from '@/lib/timeline-tree';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';
import { TimelineAxis, markerLabelWidth, type DeadlineGroup } from './timeline-axis';
import { TimelineChart } from './timeline-chart';
import { TimelineEditDialog, TimelineHistoryDialog, type TimelineForm } from './timeline-dialogs';
import { TimelineToolbar } from './timeline-toolbar';

interface GanttPanelProps {
  team: Team;
  tasks: TeamTask[];
  events: LedgerEvent[];
  uid: string;
}

/**
 * 타임라인 (§2.8-4) — 기간이 있는 항목은 막대, 마감만 있는 할 일은 위쪽 축의 점.
 * 막대는 끌어 옮기고 늘리며, 위아래로 끌면 다른 막대의 하위 항목이 된다.
 * 배경을 끌거나 가로 휠로 좌우 이동, ⌘/Ctrl+휠로 확대·축소한다.
 */
export function GanttPanel({ team, tasks, events, uid }: GanttPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [nowMs] = useState(() => Date.now());
  const [editing, setEditing] = useState<TeamTask | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState<TimelineForm>({ title: '', startAt: '', dueAt: '' });
  const [saving, setSaving] = useState(false);
  const [pan, setPan] = useState<{ pointerX: number; startMs: number; endMs: number } | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const bounds = useMemo(() => {
    const starts = tasks.map((task) => toDate(task.milestoneStartAt)?.getTime() ?? Infinity);
    const dues = tasks.map((task) => task.dueAt.toDate().getTime());
    const startMs = Math.min(team.startAt.toDate().getTime(), ...starts);
    const endMs = Math.max(team.dueAt.toDate().getTime(), ...dues);
    const padding = Math.max(DAY_MS, (endMs - startMs) * 0.02);
    return { startMs: startMs - padding, endMs: endMs + padding };
  }, [team, tasks]);

  const { view, setView, zoomBy, pxToMs, reset, focus } = useTimelineView(bounds, svgRef);
  const rangeMs = Math.max(1, view.endMs - view.startMs);
  const x = useCallback((ms: number) => ((ms - view.startMs) / rangeMs) * VIEW_WIDTH, [view.startMs, rangeMs]);

  const rows: BarRow[] = useMemo(() => {
    const bars = tasks.filter((task) => task.milestoneStartAt);
    const barIds = new Set(bars.map((task) => task.id));
    return layoutTree(
      bars.map((task) => ({
        id: task.id,
        parentId: task.milestoneId && barIds.has(task.milestoneId) ? task.milestoneId : null,
        order: task.order,
        task,
      })),
    );
  }, [tasks]);

  const ticks = useMemo(
    () => generateTicks(view.startMs, view.endMs, niceStep(rangeMs, VIEW_WIDTH, 78)),
    [view.startMs, view.endMs, rangeMs],
  );

  const { markers, markerRows } = useMemo(() => {
    const groups = groupByDay(
      tasks.filter((task) => !task.milestoneStartAt).map((task) => ({ ms: task.dueAt.toDate().getTime(), item: task })),
    ).filter((group) => group.ms >= view.startMs - DAY_MS && group.ms <= view.endMs + DAY_MS);
    const packed = packMarkers<DeadlineGroup>(
      groups.map((group) => ({ ms: group.ms, item: group, labelWidth: markerLabelWidth(group.items.length) })),
      (ms) => ((ms - view.startMs) / rangeMs) * VIEW_WIDTH,
      VIEW_WIDTH,
    );
    return { markers: packed.markers, markerRows: Math.max(1, packed.rows) };
  }, [tasks, view.startMs, rangeMs, view.endMs]);

  const history = useMemo(
    () =>
      events
        .filter((event) => event.type === 'milestone.update')
        .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0)),
    [events],
  );

  const chartTop = AXIS_HEIGHT + markerRows * MARKER_ROW_HEIGHT;
  const height = chartTop + Math.max(1, rows.length) * ROW_PITCH + 16;

  const { drag, beginDrag } = useTimelineDrag({
    team,
    uid,
    tasks,
    rows,
    view,
    pxToMs,
    snapStep: snapStepFor(rangeMs, VIEW_WIDTH),
    chartTop,
    height,
    svgRef,
    onBubble: setBubble,
  });

  useEffect(() => {
    if (!pan) return;
    // 누른 순간의 구간을 기준으로 밀어야 손가락과 화면이 어긋나지 않는다
    const base = { startMs: pan.startMs, endMs: pan.endMs };
    const move = (event: PointerEvent) => {
      const deltaMs = pxToMs(event.clientX - pan.pointerX, base);
      setView({ startMs: base.startMs - deltaMs, endMs: base.endMs - deltaMs });
    };
    const up = () => setPan(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [pan, pxToMs, setView]);

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
        <TimelineToolbar
          historyCount={history.length}
          onZoomIn={() => zoomBy(1 / 1.6)}
          onZoomOut={() => zoomBy(1.6)}
          onReset={reset}
          onToday={() => focus(nowMs)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <p className="text-muted-foreground mb-2 text-xs">
          막대를 끌면 기간이 옮겨지고, 양 끝을 끌면 눈금 단위로 조절됩니다. 위아래로 끌어 다른 막대에 놓으면 그 하위
          항목이 되고, 빈 곳에 놓으면 최상위로 빠집니다. 배경을 끌면 좌우로, ⌘/Ctrl+휠은 확대·축소입니다.
        </p>
        <svg
          id="tut-timeline-chart"
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          className="min-w-[760px] touch-none select-none"
          role="img"
          aria-label="타임라인"
        >
          <rect
            x={0}
            y={0}
            width={VIEW_WIDTH}
            height={height}
            fill="transparent"
            className={pan ? 'cursor-grabbing' : 'cursor-grab'}
            onPointerDown={(event) => setPan({ pointerX: event.clientX, startMs: view.startMs, endMs: view.endMs })}
          />

          <TimelineAxis
            ticks={ticks}
            markers={markers}
            markerRows={markerRows}
            height={height}
            nowMs={nowMs}
            x={x}
            inView={(ms) => ms >= view.startMs && ms <= view.endMs}
            onBubble={setBubble}
          />

          <TimelineChart
            rows={rows.map((row) => ({ ...row, item: row.item.task }))}
            chartTop={chartTop}
            height={height}
            archived={Boolean(team.archived)}
            drag={drag}
            x={x}
            onBarPointerDown={beginDrag}
            onTitleClick={openEdit}
          />
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

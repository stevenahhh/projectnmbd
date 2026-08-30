'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBoxSize, useFitHeight } from '@/hooks/use-fit-height';
import { useTimelineDrag } from '@/hooks/use-timeline-drag';
import { useTimelineLayout } from '@/hooks/use-timeline-layout';
import { useTimelineView } from '@/hooks/use-timeline-view';
import { updateMilestone } from '@/lib/team-ops';
import { toDate } from '@/lib/time';
import {
  DAY_MS,
  VIEW_WIDTH,
  snapStepFor,
  snapToHalfHour,
  toLocalInputValue,
  type Bubble,
} from '@/lib/timeline';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';
import { TimelineAxis } from './timeline-axis';
import { TimelineChart } from './timeline-chart';
import { TimelineEditDialog, TimelineHistoryDialog, type TimelineForm } from './timeline-dialogs';
import { TimelineToolbar } from './timeline-toolbar';

/** 가로 최소 폭(min-w-[760px])과 같은 값 — 좁은 화면에서 실제 렌더 폭이 여기서 멈춘다. */
const MIN_CHART_PX = 760;

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
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // 카드는 화면 아래끝까지만 차지하고, 넘치는 차트는 안쪽에서 스크롤한다
  const cardHeight = useFitHeight(cardRef);
  const contentBox = useBoxSize(contentRef);
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처한다.
  const [nowMs] = useState(() => Date.now());
  const [editing, setEditing] = useState<TeamTask | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState<TimelineForm>({ title: '', startAt: '', dueAt: '' });
  const [saving, setSaving] = useState(false);
  const [pan, setPan] = useState<{ pointerX: number; startMs: number; endMs: number } | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  // 완료된 마감까지 다 찍으면 축이 점으로 뒤덮인다 — 기본은 남은 것만 본다
  const [showDone, setShowDone] = useState(false);

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
  const { rows, ticks, dayLines, markers, markerRows, showMarkerLabel, chartTop, height } = useTimelineLayout(
    tasks,
    view,
    showDone,
  );

  const history = useMemo(
    () =>
      events
        .filter((event) => event.type === 'milestone.update')
        .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0)),
    [events],
  );

  /**
   * 그리는 높이 — 남는 세로 공간까지 캔버스로 쓴다. 세로선이 카드 아래끝까지 내려간다.
   * viewBox 단위는 가로 폭으로 정해지므로 (여백 픽셀 / 실제 렌더 폭) × 960 으로 환산한다.
   */
  const drawHeight = useMemo(() => {
    if (!contentBox || contentBox.width <= 0) return height;
    const renderedWidth = Math.max(contentBox.width, MIN_CHART_PX);
    // 딱 맞을 때 스크롤바가 생겨 폭이 다시 줄지 않도록 2px 만 남긴다
    return Math.max(height, Math.round(((contentBox.height - 2) / renderedWidth) * VIEW_WIDTH));
  }, [contentBox, height]);

  const { drag, beginDrag } = useTimelineDrag({
    team,
    uid,
    tasks,
    rows,
    view,
    pxToMs,
    snapStep: snapStepFor(rangeMs, VIEW_WIDTH),
    chartTop,
    height: drawHeight,
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
    <Card ref={cardRef} className="flex flex-col overflow-hidden" style={{ height: cardHeight }}>
      <CardHeader className="shrink-0 flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">타임라인</CardTitle>
        <TimelineToolbar
          historyCount={history.length}
          showDone={showDone}
          onToggleDone={() => setShowDone((value) => !value)}
          onZoomIn={() => zoomBy(1 / 1.6)}
          onZoomOut={() => zoomBy(1.6)}
          onReset={reset}
          onToday={() => focus(nowMs)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      </CardHeader>

      <CardContent ref={contentRef} className="min-h-0 flex-1 overflow-auto">
        <svg
          id="tut-timeline-chart"
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${drawHeight}`}
          className="min-w-[760px] touch-none select-none"
          role="img"
          aria-label="타임라인"
        >
          <rect
            x={0}
            y={0}
            width={VIEW_WIDTH}
            height={drawHeight}
            fill="transparent"
            className={pan ? 'cursor-grabbing' : 'cursor-grab'}
            onPointerDown={(event) => setPan({ pointerX: event.clientX, startMs: view.startMs, endMs: view.endMs })}
          />

          <g>
            <TimelineAxis
              ticks={ticks}
              dayLines={dayLines}
              markers={markers}
              markerRows={markerRows}
              showMarkerLabel={showMarkerLabel}
              height={drawHeight}
              nowMs={nowMs}
              x={x}
              inView={(ms) => ms >= view.startMs && ms <= view.endMs}
              onBubble={setBubble}
            />
          </g>

          <TimelineChart
            rows={rows.map((row) => ({ ...row, item: row.item.task }))}
            chartTop={chartTop}
            height={drawHeight}
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

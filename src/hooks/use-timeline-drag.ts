'use client';

import { useEffect, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { reparentMilestone, updateMilestone } from '@/lib/team-ops';
import { toDate } from '@/lib/time';
import { ROW_PITCH, dragRange, stamp, type Bubble, type DragMode, type DragState, type ViewRange } from '@/lib/timeline';
import { canReparent, type TreeRow } from '@/lib/timeline-tree';
import type { Team, TeamTask } from '@/lib/types';

export interface BarNode {
  id: string;
  parentId: string | null;
  order: number;
  task: TeamTask;
}

export type BarRow = TreeRow<BarNode>;

interface TimelineDragParams {
  team: Team;
  uid: string;
  tasks: TeamTask[];
  rows: BarRow[];
  view: ViewRange;
  pxToMs: (dxClient: number, view: ViewRange) => number;
  snapStep: number;
  chartTop: number;
  height: number;
  svgRef: RefObject<SVGSVGElement | null>;
  onBubble: (bubble: Bubble | null) => void;
}

/**
 * 막대 드래그 — 좌우로 끌면 기간이, 위아래로 끌면 상위 항목이 바뀐다.
 * 두 변화는 각각 원장 이벤트로 남는다.
 */
export function useTimelineDrag({
  team,
  uid,
  tasks,
  rows,
  view,
  pxToMs,
  snapStep,
  chartTop,
  height,
  svgRef,
  onBubble,
}: TimelineDragParams) {
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    if (!drag) return;

    const rowAtClientY = (clientY: number): BarRow | null => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.height === 0) return null;
      const svgY = ((clientY - rect.top) / rect.height) * height;
      return rows[Math.floor((svgY - chartTop) / ROW_PITCH)] ?? null;
    };

    /** 행 밖이면 최상위, 자기 행이면 그대로, 순환이면 거부한다. */
    const dropParentFor = (clientY: number): string | null => {
      if (drag.mode !== 'move') return drag.dropParentId;
      const target = rowAtClientY(clientY);
      if (!target) return null;
      if (target.item.id === drag.taskId) return drag.dropParentId;
      return canReparent(rows.map((row) => row.item), drag.taskId, target.item.id)
        ? target.item.id
        : drag.dropParentId;
    };

    const move = (event: PointerEvent) => {
      const next = dragRange(
        drag.mode,
        drag.baseStart,
        drag.baseEnd,
        pxToMs(event.clientX - drag.pointerX, view),
        snapStep,
      );
      setDrag({
        ...drag,
        ...next,
        dropParentId: dropParentFor(event.clientY),
        moved:
          drag.moved || Math.abs(event.clientX - drag.pointerX) > 2 || Math.abs(event.clientY - drag.pointerY) > 2,
      });
      onBubble({ x: event.clientX, y: event.clientY, lines: [`${stamp(next.startMs)} - ${stamp(next.endMs)}`] });
    };

    const up = async () => {
      const task = tasks.find((candidate) => candidate.id === drag.taskId);
      setDrag(null);
      onBubble(null);
      if (!task || !drag.moved) return;
      const movedTime = drag.startMs !== drag.baseStart || drag.endMs !== drag.baseEnd;
      const parent = drag.dropParentId === null ? null : rows.find((row) => row.item.id === drag.dropParentId)?.item;
      const changedParent = (task.milestoneId ?? null) !== (parent?.id ?? null);
      if (!movedTime && !changedParent) return;
      try {
        if (movedTime) {
          await updateMilestone(team.id, uid, task, {
            title: task.title,
            startAt: new Date(drag.startMs),
            dueAt: new Date(drag.endMs),
          });
        }
        if (changedParent) {
          await reparentMilestone(team.id, uid, task, parent ? { id: parent.id, title: parent.task.title } : null);
          toast.success(parent ? `「${parent.task.title}」 하위로 옮겼어요` : '최상위로 뺐어요');
        } else {
          toast.success(`${stamp(drag.startMs)} - ${stamp(drag.endMs)}로 옮겼어요`);
        }
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
  }, [drag, rows, tasks, team.id, uid, view, pxToMs, snapStep, chartTop, height, svgRef, onBubble]);

  const beginDrag = (event: React.PointerEvent, task: TeamTask, mode: DragMode) => {
    if (team.archived) return;
    event.preventDefault();
    event.stopPropagation();
    const baseEnd = task.dueAt.toDate().getTime();
    const baseStart = toDate(task.milestoneStartAt)?.getTime() ?? baseEnd - snapStep;
    setDrag({
      taskId: task.id,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      baseStart,
      baseEnd,
      startMs: baseStart,
      endMs: baseEnd,
      dropParentId: task.milestoneId ?? null,
      moved: false,
    });
  };

  return { drag, beginDrag };
}

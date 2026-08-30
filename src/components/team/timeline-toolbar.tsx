'use client';

import { History, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIMELINE_COLORS } from '@/lib/timeline';

interface TimelineToolbarProps {
  historyCount: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToday: () => void;
  onOpenHistory: () => void;
}

/** 타임라인 머리 — 범례와 확대·축소, 수정 이력. */
export function TimelineToolbar({
  historyCount,
  onZoomIn,
  onZoomOut,
  onReset,
  onToday,
  onOpenHistory,
}: TimelineToolbarProps) {
  return (
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
      </div>

      <div id="tut-timeline-zoom" className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="size-8" aria-label="축소" onClick={onZoomOut}>
          <ZoomOut />
        </Button>
        <Button size="icon" variant="outline" className="size-8" aria-label="확대" onClick={onZoomIn}>
          <ZoomIn />
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={onReset}>
          <Maximize2 /> 전체
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={onToday}>
          오늘
        </Button>
      </div>

      <Button id="tut-timeline-history" size="sm" variant="outline" onClick={onOpenHistory}>
        <History /> 수정 이력 {historyCount > 0 ? historyCount : ''}
      </Button>
    </div>
  );
}

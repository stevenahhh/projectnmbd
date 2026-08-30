'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { CHART_LEFT, CHART_WIDTH, HOUR_MS, VIEW_WIDTH, panRange, zoomRange, type ViewRange } from '@/lib/timeline';

const MIN_RANGE_MS = 3 * HOUR_MS;

/**
 * 보이는 구간(view)과 그 조작 — 확대·축소·좌우 이동.
 * 휠은 React 합성 이벤트가 passive 라 preventDefault 가 통하지 않는다. 직접 붙인다.
 */
export function useTimelineView(bounds: ViewRange, svgRef: RefObject<SVGSVGElement | null>) {
  const [view, setView] = useState<ViewRange>(bounds);
  const maxRangeMs = Math.max(bounds.endMs - bounds.startMs, 7 * 24 * HOUR_MS) * 1.5;

  // 팀이 바뀌면 그 팀의 전체 구간에서 다시 시작한다
  const boundsKey = `${bounds.startMs}-${bounds.endMs}`;
  const appliedKey = useRef(boundsKey);
  useEffect(() => {
    if (appliedKey.current === boundsKey) return;
    appliedKey.current = boundsKey;
    setView(bounds);
  }, [boundsKey, bounds]);

  /** 클라이언트 x 좌표가 가리키는 시각 — 줌 기준점이다. */
  const msAtClientX = useCallback(
    (clientX: number, current: ViewRange): number => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return (current.startMs + current.endMs) / 2;
      const unit = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
      const ratio = Math.min(1, Math.max(0, (unit - CHART_LEFT) / CHART_WIDTH));
      return current.startMs + (current.endMs - current.startMs) * ratio;
    },
    [svgRef],
  );

  const zoomBy = useCallback(
    (factor: number, clientX?: number) => {
      setView((current) =>
        zoomRange(
          current,
          factor,
          clientX === undefined ? (current.startMs + current.endMs) / 2 : msAtClientX(clientX, current),
          MIN_RANGE_MS,
          maxRangeMs,
        ),
      );
    },
    [msAtClientX, maxRangeMs],
  );

  /** viewBox 스케일을 보정해 화면 픽셀을 시간으로 환산한다. */
  const pxToMs = useCallback(
    (dxClient: number, current: ViewRange): number => {
      const rect = svgRef.current?.getBoundingClientRect();
      const scale = rect && rect.width > 0 ? VIEW_WIDTH / rect.width : 1;
      return (dxClient * scale * (current.endMs - current.startMs)) / CHART_WIDTH;
    },
    [svgRef],
  );

  const panByPx = useCallback(
    (dxClient: number) => setView((current) => panRange(current, pxToMs(dxClient, current))),
    [pxToMs],
  );

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.deltaY === 0) return;
        event.preventDefault();
        zoomBy(Math.exp(event.deltaY * 0.0015), event.clientX);
        return;
      }
      // 세로 휠은 페이지 스크롤로 넘긴다 — 가로 의도일 때만 시간축을 민다
      const horizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal) return;
      const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      event.preventDefault();
      panByPx(-delta);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [svgRef, zoomBy, panByPx]);

  const reset = useCallback(() => setView(bounds), [bounds]);

  const focus = useCallback((ms: number) => {
    setView((current) => {
      const half = (current.endMs - current.startMs) / 2;
      return { startMs: ms - half, endMs: ms + half };
    });
  }, []);

  return { view, setView, zoomBy, panByPx, pxToMs, reset, focus };
}

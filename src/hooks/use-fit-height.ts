'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * 요소를 화면 아래끝까지 채우는 높이 — 브라우저 높이에서 이 요소의 문서상 위치를 뺀다.
 * getBoundingClientRect().top 은 스크롤에 따라 변하므로 scrollY 를 더해 문서 기준으로 고정한다.
 */
export function useFitHeight(ref: RefObject<HTMLElement | null>, bottomGapPx = 24): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const documentTop = node.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(320, window.innerHeight - documentTop - bottomGapPx));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref, bottomGapPx]);

  return height;
}

/** 요소의 실제 픽셀 크기 — viewBox 단위를 화면 크기에 맞출 때 쓴다. */
export function useBoxSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } | undefined {
  const [box, setBox] = useState<{ width: number; height: number } | undefined>(undefined);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return box;
}

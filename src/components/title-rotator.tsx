'use client';

import { useEffect } from 'react';

/** 탭 제목 뒤에 붙는 말. 한 번에 하나만 보이고 천천히 돌아간다. */
export const TITLE_LINES = ['버스 기사 없는 팀플', '교수님 학점은 이렇게', '좋은 사람들과 좋은 과제'];

const ROTATE_MS = 3000;

/**
 * 탭 제목을 「Dibs — …」로 갈아 끼운다.
 * 서버가 그리는 제목은 하나로 고정해 두고(크롤러·링크 미리보기용), 도는 것은 화면에서만 한다.
 */
export function TitleRotator() {
  useEffect(() => {
    // 시작 지점을 방문마다 다르게 둔다 — 늘 같은 문구로 시작하면 도는 티가 나지 않는다
    let index = Math.floor(Math.random() * TITLE_LINES.length);
    const paint = () => {
      document.title = `Dibs — ${TITLE_LINES[index % TITLE_LINES.length]}`;
    };
    paint();

    const timer = setInterval(() => {
      // 보이지 않는 탭에서까지 돌릴 이유가 없다
      if (document.hidden) return;
      index += 1;
      paint();
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  return null;
}

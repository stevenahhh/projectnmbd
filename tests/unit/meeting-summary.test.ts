import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { summaryLinesOf, SummaryLines } from '@/components/team/meeting-summary';

describe('summaryLinesOf', () => {
  it('줄바꿈으로 저장된 세 줄을 그대로 나눈다', () => {
    expect(summaryLinesOf('첫째\n둘째\n셋째')).toEqual(['첫째', '둘째', '셋째']);
  });

  it('예전 「1) … 2) …」 한 줄 형식도 분해해 받아준다', () => {
    expect(summaryLinesOf('1) 첫째 2) 둘째 3) 셋째')).toEqual(['첫째', '둘째', '셋째']);
    expect(summaryLinesOf('1. 첫째 2. 둘째 3. 셋째')).toEqual(['첫째', '둘째', '셋째']);
  });

  it('각 줄 앞의 번호 접두사도 떼어낸다', () => {
    expect(summaryLinesOf('1) 첫째\n2) 둘째')).toEqual(['첫째', '둘째']);
  });

  it('빈 줄은 버린다', () => {
    expect(summaryLinesOf('\n첫째\n\n둘째\n')).toEqual(['첫째', '둘째']);
  });
});

const renderLines = (summary3: string, compact?: boolean) =>
  renderToStaticMarkup(createElement(SummaryLines, compact === undefined ? { summary3 } : { summary3, compact }));

describe('SummaryLines', () => {
  it('AI 라벨과 번호 목록을 렌더링한다', () => {
    const html = renderLines('첫째\n둘째\n셋째');
    expect(html).toContain('AI 세 줄 요약');
    expect(html).toContain('tabular-nums');
    expect(html).toContain('첫째');
    expect(html).toContain('p-4');
  });

  it('compact 모드에서는 패딩과 줄 제한이 다르다', () => {
    const html = renderLines('첫째', true);
    expect(html).toContain('p-2.5');
    expect(html).toContain('line-clamp-2');
  });

  it('요약이 비면 안내 문구를 보여준다', () => {
    expect(renderLines('')).toContain('요약이 없습니다');
  });
});

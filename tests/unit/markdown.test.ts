import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '@/components/markdown';

const render = (text: string, className?: string) =>
  renderToStaticMarkup(createElement(Markdown, { text, className }));

describe('Markdown 렌더러', () => {
  it('문단 하나로 감싸고, className 을 뒤에 붙인다', () => {
    expect(render('본문')).toBe('<div class="flex flex-col gap-3"><p>본문</p></div>');
    expect(render('본문', 'prose')).toBe('<div class="flex flex-col gap-3 prose"><p>본문</p></div>');
  });

  it('제목 #~### 를 h4 로 렌더링한다 (크기는 레벨별로)', () => {
    expect(render('# 큰 제목')).toContain('<h4 class="text-base mt-1 font-semibold">큰 제목</h4>');
    expect(render('## 중간 제목')).toContain('<h4 class="text-[15px] mt-1 font-semibold">중간 제목</h4>');
    expect(render('### 작은 제목')).toContain('<h4 class="text-sm mt-1 font-semibold">작은 제목</h4>');
  });

  it('글머리표 - 와 * 를 ul 로 묶는다', () => {
    expect(render('- 사과\n* 배')).toBe(
      '<div class="flex flex-col gap-3"><ul class="flex list-disc flex-col gap-1 pl-5"><li>사과</li><li>배</li></ul></div>',
    );
  });

  it('번호 목록 1. 과 1) 을 ol 로 묶는다', () => {
    expect(render('1. 하나\n2) 둘')).toBe(
      '<div class="flex flex-col gap-3"><ol class="flex list-decimal flex-col gap-1 pl-5"><li>하나</li><li>둘</li></ol></div>',
    );
  });

  it('인용 > 를 blockquote 의 p 들로 렌더링한다', () => {
    expect(render('> 인용 라인')).toBe(
      '<div class="flex flex-col gap-3"><blockquote class="text-muted-foreground border-l-2 pl-3"><p>인용 라인</p></blockquote></div>',
    );
  });

  it('**굵게** 는 strong, `코드` 는 code 로 감싼다', () => {
    const html = render('**굵게** 와 `코드`');
    expect(html).toContain('<strong>굵게</strong>');
    expect(html).toContain('<code class="bg-muted rounded px-1 py-0.5 text-[0.9em]">코드</code>');
  });

  it('빈 줄은 문단을 나눈다', () => {
    expect(render('첫 문단\n\n둘째 문단')).toBe(
      '<div class="flex flex-col gap-3"><p>첫 문단</p><p>둘째 문단</p></div>',
    );
  });

  it('빈 줄 없이 이어진 줄은 같은 문단에서 br 로 나뉜다', () => {
    const html = render('첫 줄\n둘째 줄');
    expect(html).toContain('<p>');
    expect(html).toContain('첫 줄');
    expect(html).toContain('<br/>');
    expect(html).toContain('둘째 줄');
  });
});

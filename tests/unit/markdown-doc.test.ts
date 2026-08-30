import { describe, expect, it } from 'vitest';
import { docToMarkdown, markdownToHtml, parseMarkdown, type DocNode } from '@/lib/markdown-doc';

const text = (value: string, ...marks: string[]): DocNode => ({
  type: 'text',
  text: value,
  ...(marks.length > 0 ? { marks: marks.map((type) => ({ type })) } : {}),
});
const listItem = (value: string): DocNode => ({
  type: 'listItem',
  content: [{ type: 'paragraph', content: [text(value)] }],
});

describe('마크다운 ↔ 편집기 문서', () => {
  describe('편집기로 들어갈 때', () => {
    it('제목·목록·인용·강조를 태그로 편다', () => {
      expect(markdownToHtml('## 결정')).toBe('<h2>결정</h2>');
      expect(markdownToHtml('- 하나\n- 둘')).toBe('<ul><li><p>하나</p></li><li><p>둘</p></li></ul>');
      expect(markdownToHtml('1. 하나')).toBe('<ol><li><p>하나</p></li></ol>');
      expect(markdownToHtml('> 인용')).toBe('<blockquote><p>인용</p></blockquote>');
      expect(markdownToHtml('**굵게** 와 `코드`')).toBe('<p><strong>굵게</strong> 와 <code>코드</code></p>');
    });

    it('본문이 HTML 을 주입할 수 없다', () => {
      expect(markdownToHtml('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    });

    it('# 만 있고 글이 없으면 제목이 아니라 그냥 글자다', () => {
      expect(parseMarkdown('#')[0]).toEqual({ kind: 'p', lines: ['#'] });
      expect(parseMarkdown('# 제목')[0]).toEqual({ kind: 'heading', level: 1, text: '제목' });
    });
  });

  describe('저장할 때 되돌리기', () => {
    it('블록을 마크다운으로 접는다', () => {
      const doc: DocNode = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [text('논의')] },
          { type: 'bulletList', content: [listItem('전처리 시연'), listItem('결측 확인')] },
          { type: 'orderedList', content: [listItem('첫째'), listItem('둘째')] },
          { type: 'blockquote', content: [{ type: 'paragraph', content: [text('인용')] }] },
          { type: 'paragraph', content: [text('보통 '), text('굵게', 'bold'), text(' 와 '), text('코드', 'code')] },
        ],
      };
      expect(docToMarkdown(doc)).toBe(
        ['## 논의', '', '- 전처리 시연\n- 결측 확인', '', '1. 첫째\n2. 둘째', '', '> 인용', '', '보통 **굵게** 와 `코드`'].join('\n'),
      );
    });

    it('빈 문단은 버리고, 빈 문서는 빈 문자열이다', () => {
      const doc: DocNode = {
        type: 'doc',
        content: [{ type: 'paragraph' }, { type: 'paragraph', content: [text('내용')] }, { type: 'paragraph' }],
      };
      expect(docToMarkdown(doc)).toBe('내용');
      expect(docToMarkdown({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('');
      expect(docToMarkdown(null)).toBe('');
    });

    it('줄바꿈은 한 문단 안에서 유지된다', () => {
      const doc: DocNode = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [text('첫 줄'), { type: 'hardBreak' }, text('둘째 줄')] }],
      };
      expect(docToMarkdown(doc)).toBe('첫 줄\n둘째 줄');
    });
  });

  describe('표', () => {
    const source = ['| 축 | 가중치 |', '| --- | --- |', '| 문서 | 1 |', '| 회의 | 2 |'].join('\n');

    it('구분선이 있는 파이프 표를 표로 읽는다', () => {
      const block = parseMarkdown(source)[0];
      expect(block).toEqual({ kind: 'table', header: ['축', '가중치'], rows: [['문서', '1'], ['회의', '2']] });
    });

    it('구분선이 없으면 표가 아니라 그냥 글이다', () => {
      expect(parseMarkdown('| 축 | 가중치 |')[0].kind).toBe('p');
    });

    it('편집기로 펼 때 표 태그가 된다', () => {
      const html = markdownToHtml(source);
      expect(html).toContain('<table>');
      expect(html).toContain('<th><p>축</p></th>');
      expect(html).toContain('<td><p>문서</p></td>');
    });

    it('저장할 때 파이프 표로 되돌아온다', () => {
      const cell = (value: string, header = false): DocNode => ({
        type: header ? 'tableHeader' : 'tableCell',
        content: [{ type: 'paragraph', content: [text(value)] }],
      });
      const doc: DocNode = {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              { type: 'tableRow', content: [cell('축', true), cell('가중치', true)] },
              { type: 'tableRow', content: [cell('문서'), cell('1')] },
              { type: 'tableRow', content: [cell('회의'), cell('2')] },
            ],
          },
        ],
      };
      expect(docToMarkdown(doc)).toBe(source);
      expect(parseMarkdown(docToMarkdown(doc))).toEqual(parseMarkdown(source));
    });
  });

  it('회의록 한 편이 편집기를 거쳐도 형식이 유지된다', () => {
    const original = '## 논의\n- 전처리 시연\n\n## 결정\n- KST 로 통일';
    // 편집기가 만들 문서와 같은 모양을 손으로 세워 되돌린다
    const doc: DocNode = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('논의')] },
        { type: 'bulletList', content: [listItem('전처리 시연')] },
        { type: 'heading', attrs: { level: 2 }, content: [text('결정')] },
        { type: 'bulletList', content: [listItem('KST 로 통일')] },
      ],
    };
    // 블록 사이는 늘 빈 줄 하나로 접는다. 글자는 달라도 파서가 읽는 결과는 같다.
    expect(docToMarkdown(doc)).toBe('## 논의\n\n- 전처리 시연\n\n## 결정\n\n- KST 로 통일');
    expect(markdownToHtml(docToMarkdown(doc))).toBe(markdownToHtml(original));
    expect(parseMarkdown(docToMarkdown(doc))).toEqual(parseMarkdown(original));
  });
});

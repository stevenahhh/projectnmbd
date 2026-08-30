import { Fragment, type ReactNode } from 'react';
import { parseMarkdown } from '@/lib/markdown-doc';

/**
 * 회의록·문서 본문용 최소 마크다운 렌더러.
 * 제목(#~###) · 목록(-, 1.) · 인용(>) · 강조(**, `) · 문단만 다룬다.
 * 외부 의존성을 늘리지 않기 위해 직접 파싱하고, HTML 은 절대 주입하지 않는다.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

function inline(text: string): ReactNode {
  const parts = text.split(INLINE).filter((part) => part !== '');
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-muted rounded px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={className ? `flex flex-col gap-3 ${className}` : 'flex flex-col gap-3'}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          let size = 'text-sm';
          if (block.level === 1) size = 'text-base';
          else if (block.level === 2) size = 'text-[15px]';
          return (
            <h4 key={index} className={`${size} mt-1 font-semibold`}>
              {inline(block.text)}
            </h4>
          );
        }
        if (block.kind === 'ul') {
          return (
            <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'ol') {
          return (
            <ol key={index} className="flex list-decimal flex-col gap-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.kind === 'table') {
          return (
            <div key={index} className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.95em]">
                <thead>
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th key={cellIndex} className="bg-muted border px-2.5 py-1.5 text-left font-semibold">
                        {inline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border px-2.5 py-1.5 align-top">
                          {inline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.kind === 'quote') {
          return (
            <blockquote key={index} className="text-muted-foreground border-l-2 pl-3">
              {block.lines.map((line, lineIndex) => (
                <p key={lineIndex}>{inline(line)}</p>
              ))}
            </blockquote>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

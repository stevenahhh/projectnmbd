import { Fragment, type ReactNode } from 'react';

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

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'p'; lines: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];

    if (line.trim() === '') {
      if (last && last.kind === 'p') blocks.push({ kind: 'p', lines: [] });
      continue;
    }
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }
    if (bullet) {
      if (last?.kind === 'ul') last.items.push(bullet[1]);
      else blocks.push({ kind: 'ul', items: [bullet[1]] });
      continue;
    }
    if (ordered) {
      if (last?.kind === 'ol') last.items.push(ordered[2]);
      else blocks.push({ kind: 'ol', items: [ordered[2]] });
      continue;
    }
    if (quote) {
      if (last?.kind === 'quote') last.lines.push(quote[1]);
      else blocks.push({ kind: 'quote', lines: [quote[1]] });
      continue;
    }
    if (last?.kind === 'p' && last.lines.length > 0) last.lines.push(line);
    else blocks.push({ kind: 'p', lines: [line] });
  }
  return blocks.filter((block) => block.kind !== 'p' || block.lines.length > 0);
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parse(text);
  return (
    <div className={className ? `flex flex-col gap-3 ${className}` : 'flex flex-col gap-3'}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const size = block.level === 1 ? 'text-base' : block.level === 2 ? 'text-[15px]' : 'text-sm';
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

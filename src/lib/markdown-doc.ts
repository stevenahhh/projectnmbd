/**
 * 마크다운 ↔ 에디터 문서 변환.
 *
 * 저장 형식은 계속 마크다운이다 — 이미 쌓인 회의록·문서가 그 형식이고,
 * 읽기 화면은 여전히 <Markdown> 이 그린다. 에디터는 입출력 지점에서만 갈아탄다.
 */

export type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'p'; lines: string[] };

/** | a | b | 꼴의 한 줄. */
function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

/** | --- | :--: | 꼴의 구분선. 이 줄이 있어야 표로 본다. */
function isTableDivider(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes('-');
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** 제목(#~###) · 목록(-, 1.) · 인용(>) · 표(|) · 문단을 다룬다. */
export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
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
    // 표는 다음 줄까지 봐야 판단이 선다 — 구분선이 뒤따를 때만 표다
    if (isTableRow(line) && isTableDivider(lines[index + 1] ?? '')) {
      const header = tableCells(line);
      const rows: string[][] = [];
      let cursor = index + 2;
      while (cursor < lines.length && isTableRow(lines[cursor])) {
        rows.push(tableCells(lines[cursor]));
        cursor += 1;
      }
      blocks.push({ kind: 'table', header, rows });
      index = cursor - 1;
      continue;
    }
    if (last?.kind === 'p' && last.lines.length > 0) last.lines.push(line);
    else blocks.push({ kind: 'p', lines: [line] });
  }
  return blocks.filter((block) => block.kind !== 'p' || block.lines.length > 0);
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function escapeHtml(text: string): string {
  return text.replaceAll(/[&<>]/g, (ch) => ESCAPES[ch]);
}

/** 강조만 태그로 바꾼다. 나머지는 전부 이스케이프 — 본문이 HTML 을 주입할 수 없다. */
function inlineHtml(text: string): string {
  return escapeHtml(text)
    .replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replaceAll(/`([^`]+)`/g, '<code>$1</code>');
}

/** 에디터가 처음 받아 읽을 HTML. */
export function markdownToHtml(source: string): string {
  return parseMarkdown(source)
    .map((block) => {
      if (block.kind === 'heading') {
        const level = Math.min(Math.max(block.level, 1), 3);
        return `<h${level}>${inlineHtml(block.text)}</h${level}>`;
      }
      if (block.kind === 'ul') {
        return `<ul>${block.items.map((item) => `<li><p>${inlineHtml(item)}</p></li>`).join('')}</ul>`;
      }
      if (block.kind === 'ol') {
        return `<ol>${block.items.map((item) => `<li><p>${inlineHtml(item)}</p></li>`).join('')}</ol>`;
      }
      if (block.kind === 'quote') {
        return `<blockquote>${block.lines.map((line) => `<p>${inlineHtml(line)}</p>`).join('')}</blockquote>`;
      }
      if (block.kind === 'table') {
        const head = block.header.map((cell) => `<th><p>${inlineHtml(cell)}</p></th>`).join('');
        const body = block.rows
          .map((row) => `<tr>${row.map((cell) => `<td><p>${inlineHtml(cell)}</p></td>`).join('')}</tr>`)
          .join('');
        return `<table><tbody><tr>${head}</tr>${body}</tbody></table>`;
      }
      return `<p>${block.lines.map(inlineHtml).join('<br>')}</p>`;
    })
    .join('');
}

/** 에디터 문서 노드 — tiptap JSON 의 우리가 쓰는 부분만. */
export interface DocNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
  content?: DocNode[];
}

function inlineMarkdown(nodes: DocNode[] | undefined): string {
  if (!nodes) return '';
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '\n';
      const text = node.text ?? '';
      if (!text) return '';
      const marks = new Set((node.marks ?? []).map((mark) => mark.type));
      if (marks.has('code')) return `\`${text}\``;
      let out = text;
      if (marks.has('bold')) out = `**${out}**`;
      if (marks.has('italic')) out = `*${out}*`;
      return out;
    })
    .join('');
}

/** 목록 항목 안은 문단이 하나뿐이라고 본다 — 우리 서식은 그 이상 만들지 않는다. */
function listItemText(item: DocNode): string {
  return (item.content ?? []).map((child) => inlineMarkdown(child.content)).join(' ').trim();
}

function blockMarkdown(node: DocNode): string {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 3);
      return `${'#'.repeat(level)} ${inlineMarkdown(node.content)}`;
    }
    case 'bulletList':
      return (node.content ?? []).map((item) => `- ${listItemText(item)}`).join('\n');
    case 'orderedList':
      return (node.content ?? []).map((item, index) => `${index + 1}. ${listItemText(item)}`).join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map((child) => inlineMarkdown(child.content))
        .flatMap((text) => text.split('\n'))
        .map((line) => `> ${line}`)
        .join('\n');
    case 'table': {
      const rows = (node.content ?? []).map((row) =>
        (row.content ?? []).map((cell) => inlineMarkdown(cell.content?.[0]?.content).replaceAll('|', '\\|')),
      );
      if (rows.length === 0) return '';
      const [header, ...rest] = rows;
      const divider = header.map(() => '---');
      return [header, divider, ...rest].map((row) => `| ${row.join(' | ')} |`).join('\n');
    }
    case 'codeBlock':
      return `\`\`\`\n${inlineMarkdown(node.content)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    default:
      return inlineMarkdown(node.content);
  }
}

/** 저장할 때 되돌리는 마크다운. 빈 문단은 문단 사이 간격으로만 남는다. */
export function docToMarkdown(doc: DocNode | null | undefined): string {
  if (!doc?.content) return '';
  return doc.content
    .map(blockMarkdown)
    .filter((text) => text.trim() !== '')
    .join('\n\n')
    .trim();
}

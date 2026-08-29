import { readFileSync } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** /about/devlog — 개발일지 정적 렌더 (G7). 빌드 시 devlog/DEVELOPMENT_LOG.md 를 읽는다. */
export default function DevlogPage() {
  const md = readFileSync(path.join(process.cwd(), 'devlog/DEVELOPMENT_LOG.md'), 'utf8');

  const blocks = md.split('\n');
  const rendered = blocks.map((line, index) => {
    if (line.startsWith('## ')) {
      return (
        <h2 key={index} className="mt-8 text-lg font-bold">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('- **')) {
      return (
        <p key={index} className="text-sm leading-relaxed">
          {line.replace(/^- /, '').replace(/\*\*(.+?)\*\*/g, '「$1」')}
        </p>
      );
    }
    if (line.startsWith('# ')) {
      return (
        <h1 key={index} className="text-2xl font-bold">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith('> ')) {
      return (
        <p key={index} className="text-muted-foreground border-l-2 pl-3 text-xs leading-relaxed">
          {line.slice(2)}
        </p>
      );
    }
    if (line.trim() === '') return null;
    return (
      <p key={index} className="text-muted-foreground text-xs leading-relaxed">
        {line}
      </p>
    );
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">개발일지</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">처음으로</Link>
        </Button>
      </div>
      <article className="mt-4 flex flex-col gap-1.5">{rendered}</article>
    </main>
  );
}

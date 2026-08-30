'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** 세 줄 요약은 줄 단위로 저장한다 — 예전 「1) … 2) …」 한 줄 형식도 분해해 받아준다. */
export function summaryLinesOf(summary3: string): string[] {
  const byLine = summary3
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const raw = byLine.length > 1 ? byLine : summary3.split(/\s*\d+[).]\s*/).filter(Boolean);
  return raw.map((line) => line.replace(/^\s*\d+[).]\s*/, '').trim()).filter(Boolean);
}

/** AI 결과라는 걸 은은하게 알리는 표면 — 옅은 그라디언트 한 겹. */
const AI_SURFACE =
  'rounded-lg bg-gradient-to-br from-violet-500/8 via-sky-500/6 to-emerald-500/8 ring-1 ring-violet-500/15';

function AiLabel({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${className ?? ''}`}>
      <Sparkles className="size-3.5 text-violet-500" />
      <span className="bg-gradient-to-r from-violet-600 via-sky-600 to-emerald-600 bg-clip-text text-transparent">
        AI 세 줄 요약
      </span>
    </span>
  );
}

/** 카드에 얹는 축약형 — 제목 없이 번호만. */
export function SummaryLines({ summary3, compact = false }: { summary3: string; compact?: boolean }) {
  const lines = summaryLinesOf(summary3);
  if (lines.length === 0) {
    return <p className="text-muted-foreground text-sm">요약이 없습니다</p>;
  }
  return (
    <div className={compact ? `${AI_SURFACE} p-2.5` : `${AI_SURFACE} p-4`}>
      <AiLabel className={compact ? 'mb-1.5' : 'mb-2'} />
      <ol className="flex flex-col gap-1 text-sm leading-relaxed">
        {lines.slice(0, 3).map((line, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
            <span className={compact ? 'line-clamp-2' : ''}>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

interface SummaryComposerProps {
  title: string;
  body: string;
  lines: string[];
  onChange: (lines: string[]) => void;
}

/** 작성 화면용 — AI가 본문에서 세 줄을 뽑고, 사람이 그대로 고칠 수 있다. */
export function SummaryComposer({ title, body, lines, onChange }: SummaryComposerProps) {
  const [running, setRunning] = useState(false);

  const generate = async () => {
    setRunning(true);
    try {
      const response = await fetch('/api/summarize-meeting', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = (await response.json()) as { lines?: string[]; error?: string };
      if (!response.ok || !data.lines) {
        toast.error(data.error ?? '요약하지 못했어요 — 직접 적어주세요');
        return;
      }
      onChange([data.lines[0] ?? '', data.lines[1] ?? '', data.lines[2] ?? '']);
      toast.success('본문에서 세 줄을 뽑았어요');
    } catch {
      toast.error('요약하지 못했어요 — 직접 적어주세요');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={`${AI_SURFACE} flex flex-col gap-2 p-3`}>
      <div className="flex items-center justify-between gap-2">
        <AiLabel />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          disabled={running || body.trim().length < 20}
          onClick={() => void generate()}
        >
          <Sparkles className={running ? 'animate-pulse' : ''} />
          {running ? '뽑는 중…' : '본문에서 뽑기'}
        </Button>
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground w-4 text-sm tabular-nums">{index + 1}.</span>
          <Input
            id={`m-sum-${index + 1}`}
            className="bg-background/70 h-8"
            value={lines[index] ?? ''}
            onChange={(e) => onChange(lines.map((line, i) => (i === index ? e.target.value : line)))}
            placeholder={index === 0 ? '무엇을 정했나요?' : index === 1 ? '무엇이 문제였나요?' : '다음에 무엇을 하나요?'}
          />
        </div>
      ))}
    </div>
  );
}

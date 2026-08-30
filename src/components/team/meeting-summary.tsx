'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { getFirebaseAuth } from '@/lib/firebase/client';

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

const SUMMARY_PLACEHOLDERS = ['무엇을 정했나요?', '무엇이 문제였나요?', '다음에 무엇을 하나요?'];

export type SummaryStatus = 'idle' | 'running' | 'ready' | 'failed';

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

/**
 * 카드에 얹는 축약형은 아이콘만 — 목록에서는 요약 내용이 주인공이고 라벨은 자리만 먹는다.
 * 문서 화면(compact 아님)에서는 무엇이 AI가 쓴 문장인지 이름으로 밝힌다.
 */
export function SummaryLines({ summary3, compact = false }: { summary3: string; compact?: boolean }) {
  const lines = summaryLinesOf(summary3);
  if (lines.length === 0) {
    return <p className="text-muted-foreground text-sm">요약이 없습니다</p>;
  }
  if (compact) {
    return (
      <div className={`${AI_SURFACE} flex gap-2 p-2.5`}>
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-500" aria-label="AI 세 줄 요약" />
        <ol className="flex min-w-0 flex-col gap-1 text-sm leading-relaxed">
          {lines.slice(0, 3).map((line, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
              <span className="line-clamp-2">{line}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div className={`${AI_SURFACE} p-4`}>
      <AiLabel className="mb-2" />
      <ol className="flex flex-col gap-1 text-sm leading-relaxed">
        {lines.slice(0, 3).map((line, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * 요약 초안 — 본문을 넣으면 AI가 세 줄을 만들고, 사람이 그대로 고친다.
 * 요약을 만든 본문(source)을 기억해 두어, 본문이 바뀌면 다시 만들게 한다.
 */
export function useMeetingSummary() {
  const [lines, setLines] = useState<string[]>(['', '', '']);
  const [status, setStatus] = useState<SummaryStatus>('idle');
  const [source, setSource] = useState<string | null>(null);

  /** 서버가 느려 한 번 실패하는 일이 있다 — 사용자가 다시 누르기 전에 우리가 한 번 더 해본다. */
  const attempt = async (title: string, body: string) => {
    const idToken = await getFirebaseAuth().currentUser?.getIdToken();
    const response = await fetch('/api/summarize-meeting', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken ?? ''}` },
      body: JSON.stringify({ title, body }),
    });
    const data = (await response.json()) as { lines?: string[]; error?: string };
    return { ok: response.ok && Boolean(data.lines), retryable: response.status >= 500, data };
  };

  const generate = async (title: string, body: string) => {
    setStatus('running');
    for (const isLast of [false, true]) {
      try {
        const { ok, retryable, data } = await attempt(title, body);
        if (ok && data.lines) {
          setLines([data.lines[0] ?? '', data.lines[1] ?? '', data.lines[2] ?? '']);
          setSource(body.trim());
          setStatus('ready');
          return;
        }
        if (!isLast && retryable) continue;
        setStatus('failed');
        toast.error(data.error ?? '요약하지 못했어요');
        return;
      } catch {
        if (!isLast) continue;
        setStatus('failed');
        toast.error('요약하지 못했어요 — 연결을 확인해주세요');
        return;
      }
    }
  };

  const reset = () => {
    setLines(['', '', '']);
    setStatus('idle');
    setSource(null);
  };

  /** 지금 본문으로 만든 요약이 손에 있는가 — 본문을 고치면 다시 만들어야 한다. */
  const isFresh = (body: string) => status === 'ready' && source === body.trim();

  return { lines, setLines, status, generate, reset, isFresh };
}

interface SummaryComposerProps {
  lines: string[];
  status: SummaryStatus;
  onChange: (lines: string[]) => void;
}

/** 작성 화면용 — 생성 중에는 표면이 흐르고, 끝나면 고칠 수 있게 열린다. */
export function SummaryComposer({ lines, status, onChange }: SummaryComposerProps) {
  const running = status === 'running';
  return (
    <div className={`${AI_SURFACE} ${running ? 'ai-generating' : ''} flex flex-col gap-2 p-3`}>
      <div className="flex items-center justify-between gap-2">
        <AiLabel />
        {running ? <span className="text-muted-foreground text-xs">본문을 읽는 중…</span> : null}
        {status === 'ready' ? <span className="text-xs text-violet-600">확인해보세요!</span> : null}
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground w-4 text-sm tabular-nums">{index + 1}.</span>
          <Input
            id={`m-sum-${index + 1}`}
            className="bg-background/70 h-8"
            disabled={running}
            value={lines[index] ?? ''}
            onChange={(e) => onChange(lines.map((line, i) => (i === index ? e.target.value : line)))}
            placeholder={running ? '' : SUMMARY_PLACEHOLDERS[index]}
          />
        </div>
      ))}
      <p className="text-muted-foreground text-[11px]">
        {status === 'ready'
          ? '어색한 줄은 직접 고쳐서 저장하세요'
          : '본문을 쓰고 「AI 요약 생성」을 누르면 세 줄이 만들어집니다'}
      </p>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { editMessage, postMessage } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { Message, Team } from '@/lib/types';

interface ChatPanelProps {
  team: Team;
  messages: Message[];
  uid: string;
}

/** 대화 (§2.2-⑤) — 카톡 대체가 아니라 팀플 관련 대화가 남게. 이 리스너가 유일한 실시간 구독이다 (S11). */
export function ChatPanel({ team, messages, uid }: ChatPanelProps) {
  // 렌더 도중 Date.now() 를 부르는 것은 순수성 위반 — 마운트 시점 한 번만 캡처하고 30초마다 갱신한다
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const [showPrev, setShowPrev] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      await postMessage(team.id, uid, trimmed);
    } catch {
      toast.error('전송 실패');
    }
  };

  const saveEdit = async (message: Message) => {
    if (!editing || editing.id !== message.id) return;
    const draft = editing.draft.trim();
    if (!draft) return;
    try {
      await editMessage(team.id, uid, message, draft);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수정하지 못했어요 — 5분이 지났을 수 있어요');
    }
  };

  return (
    <Card className="flex h-[70vh] flex-col">
      <CardHeader>
        <CardTitle className="text-base">대화</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <ScrollArea id="tut-chat-list" className="min-h-0 flex-1 pr-3">
          <div className="flex flex-col gap-2.5">
            {messages.map((message) => {
              const mine = message.actorUid === uid;
              const nickname = team.members[message.actorUid]?.nickname ?? '알 수 없음';
              const isEditing = editing?.id === message.id;
              // 5분 창은 서버 규칙이 강제한다. 여기선 버튼을 보여줄지 말지만 정한다.
              const editWindow = mine && message.at ? nowMs - message.at.toDate().getTime() <= 5 * 60_000 : false;
              return (
                <div key={message.id} className={mine ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    {nickname} · {formatKST(message.at, 'time')}
                    {message.editedAt ? (
                      <button
                        className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
                        onClick={() => setShowPrev((current) => (current === message.id ? null : message.id))}
                      >
                        수정됨
                      </button>
                    ) : null}
                    {editWindow && !isEditing ? (
                      <button
                        className="cursor-pointer"
                        aria-label="수정"
                        onClick={() => setEditing({ id: message.id, draft: message.text })}
                      >
                        <Pencil className="size-3" />
                      </button>
                    ) : null}
                  </span>

                  {isEditing ? (
                    <div className="flex w-full max-w-[85%] gap-1.5">
                      <Input
                        autoFocus
                        value={editing.draft}
                        onChange={(e) => setEditing({ id: message.id, draft: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) void saveEdit(message);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        className="h-8 text-sm"
                      />
                      <Button size="icon" className="size-8" aria-label="저장" onClick={() => void saveEdit(message)}>
                        <Check />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label="취소"
                        onClick={() => setEditing(null)}
                      >
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={
                        mine
                          ? 'bg-primary text-primary-foreground max-w-[75%] rounded-2xl rounded-br-sm px-3 py-1.5 text-sm'
                          : 'bg-muted max-w-[75%] rounded-2xl rounded-bl-sm px-3 py-1.5 text-sm'
                      }
                    >
                      {message.text}
                    </div>
                  )}

                  {showPrev === message.id && message.prevText ? (
                    <p className="text-muted-foreground mt-1 max-w-[75%] rounded-lg bg-foreground/5 px-2.5 py-1 text-xs italic line-through">
                      {message.prevText}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            id="tut-chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) void send();
            }}
            placeholder="메시지 입력 — Enter 전송"
          />
          <Button onClick={() => void send()} aria-label="전송">
            <Send />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
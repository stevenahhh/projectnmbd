'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { postMessage } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { Message, Team } from '@/lib/types';

interface ChatPanelProps {
  team: Team;
  messages: Message[];
  uid: string;
}

/** 대화 (§2.2-⑤) — 카톡 대체가 아니라 팀플 관련 대화가 남게. 이 리스너가 유일한 실시간 구독이다 (S11). */
export function ChatPanel({ team, messages, uid }: ChatPanelProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
              return (
                <div key={message.id} className={mine ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                  <span className="text-muted-foreground text-[11px]">
                    {nickname} · {formatKST(message.at, 'time')}
                  </span>
                  <div
                    className={
                      mine
                        ? 'bg-primary text-primary-foreground max-w-[75%] rounded-2xl rounded-br-sm px-3 py-1.5 text-sm'
                        : 'bg-muted max-w-[75%] rounded-2xl rounded-bl-sm px-3 py-1.5 text-sm'
                    }
                  >
                    {message.text}
                  </div>
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

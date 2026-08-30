'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { describeEvent } from '@/lib/contribution';
import { formatKST } from '@/lib/time';
import type { LedgerEvent, Team } from '@/lib/types';

/** 원장 종류를 사람이 고르는 단위로 묶는다. 새 종류가 생기면 '기타'로 떨어진다. */
const CATEGORIES: { key: string; label: string; prefixes: string[] }[] = [
  { key: 'all', label: '전체', prefixes: [] },
  { key: 'doc', label: '문서', prefixes: ['doc'] },
  { key: 'file', label: '자료', prefixes: ['file'] },
  { key: 'task', label: '할 일', prefixes: ['task', 'milestone'] },
  { key: 'meeting', label: '회의', prefixes: ['meeting'] },
  { key: 'message', label: '대화', prefixes: ['message'] },
  { key: 'team', label: '팀 운영', prefixes: ['team', 'member', 'role', 'leader'] },
];

const PAGE = 60;

interface LogsPanelProps {
  team: Team;
  events: LedgerEvent[];
}

/** 활동 로그 — 팀에서 일어난 모든 기록을 시각 순으로 펼쳐 본다. */
export function LogsPanel({ team, events }: LogsPanelProps) {
  const [category, setCategory] = useState<string>('all');
  const [actor, setActor] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const prefixes = CATEGORIES.find((c) => c.key === category)?.prefixes ?? [];
    return [...events]
      .filter((event) => (actor === 'all' ? true : event.actorUid === actor))
      .filter((event) => (prefixes.length === 0 ? true : prefixes.includes(event.type.split('.')[0])))
      .sort((a, b) => (b.at?.toDate().getTime() ?? 0) - (a.at?.toDate().getTime() ?? 0));
  }, [events, category, actor]);

  const groups = useMemo(() => {
    const byDay = new Map<string, LedgerEvent[]>();
    for (const event of filtered.slice(0, limit)) {
      const at = event.at?.toDate();
      const key = at ? formatKST(at, 'date') : '시각 없음';
      const bucket = byDay.get(key);
      if (bucket) bucket.push(event);
      else byDay.set(key, [event]);
    }
    return [...byDay.entries()];
  }, [filtered, limit]);

  return (
    <div className="flex flex-col gap-4">
      <Card id="tut-log-filter">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">활동 로그 {filtered.length}건</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((item) => (
              <Button
                key={item.key}
                size="sm"
                variant={category === item.key ? 'secondary' : 'ghost'}
                className="h-7 px-2.5 text-xs"
                onClick={() => {
                  setCategory(item.key);
                  setLimit(PAGE);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={actor === 'all' ? 'secondary' : 'ghost'}
            className="h-7 px-2.5 text-xs"
            onClick={() => {
              setActor('all');
              setLimit(PAGE);
            }}
          >
            모두
          </Button>
          {Object.entries(team.members).map(([memberUid, member]) => (
            <Button
              key={memberUid}
              size="sm"
              variant={actor === memberUid ? 'secondary' : 'ghost'}
              className="h-7 px-2.5 text-xs"
              onClick={() => {
                setActor(memberUid);
                setLimit(PAGE);
              }}
            >
              {member.nickname}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card id="tut-log-list">
        <CardContent className="flex flex-col gap-5 pt-6">
          {groups.map(([day, dayEvents]) => (
            <section key={day} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold">{day}</h3>
                <Badge variant="outline" className="text-[11px]">
                  {dayEvents.length}건
                </Badge>
                <Separator className="flex-1" />
              </div>
              {dayEvents.map((event) => (
                <div key={event.id} className="flex items-baseline gap-3 rounded-md px-1 py-1 text-sm">
                  <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">
                    {formatKST(event.at, 'time')}
                  </span>
                  <span className="w-16 shrink-0 truncate text-xs font-medium">
                    {team.members[event.actorUid]?.nickname ?? '알 수 없음'}
                  </span>
                  <span className="min-w-0 flex-1">{describeEvent(event.type, event.payload ?? {})}</span>
                </div>
              ))}
            </section>
          ))}

          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">해당하는 기록이 없어요</p>
          ) : null}

          {filtered.length > limit ? (
            <Button variant="outline" className="self-center" onClick={() => setLimit((v) => v + PAGE)}>
              {filtered.length - limit}건 더 보기
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

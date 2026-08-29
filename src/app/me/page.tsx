'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/auth-provider';
import { getTeam } from '@/lib/teams';
import { formatKST } from '@/lib/time';
import type { Team } from '@/lib/types';

/** /me — 내 팀플 기록: 보관함 포함 (지속가능성 10점). */
export default function MePage() {
  const { status, profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (status !== 'ready' || !profile) return;
    const ids = Object.keys(profile.teams ?? {});
    void Promise.all(ids.map((id) => getTeam(id))).then((list) =>
      setTeams(list.filter((t): t is Team => Boolean(t))),
    );
  }, [status, profile]);

  if (status !== 'ready') return <main className="p-10 text-center text-sm">들어가는 중…</main>;

  const active = teams.filter((t) => !t.archived && !t.deleted);
  const archived = teams.filter((t) => t.archived && !t.deleted);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 팀플 기록 — {profile?.nickname ?? '나'}</h1>
        <Button asChild variant="ghost">
          <Link href="/teams">내 팀</Link>
        </Button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">진행 중 {active.length}팀</h2>
        {active.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={'/teams/' + team.id} className="hover:underline">{team.name}</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {team.goal || team.courseLabel} · 시작 {formatKST(team.startAt, 'date')}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          보관함 {archived.length}팀 <Badge variant="secondary">읽기 전용</Badge>
        </h2>
        {archived.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={'/teams/' + team.id} className="hover:underline">{team.name}</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {team.goal || team.courseLabel} · {formatKST(team.startAt, 'date')} ~ {formatKST(team.dueAt, 'date')}
            </CardContent>
          </Card>
        ))}
        {archived.length === 0 ? <p className="text-muted-foreground text-sm">보관된 팀이 아직 없어요</p> : null}
      </section>
    </main>
  );
}

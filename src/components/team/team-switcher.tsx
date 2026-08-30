'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers/auth-provider';
import { getTeam } from '@/lib/teams';
import type { Team } from '@/lib/types';

/** 내가 속한 팀 사이를 바로 오가고, 새 팀도 여기서 만든다. */
export function TeamSwitcher({ current }: { current: Team }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const ids = Object.keys(profile?.teams ?? {});
    if (ids.length === 0) return;
    let cancelled = false;
    void Promise.all(ids.map((id) => getTeam(id))).then((list) => {
      if (cancelled) return;
      setTeams(list.filter((t): t is Team => t !== null && !t.deleted));
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const active = teams.filter((t) => !t.archived);
  const archived = teams.filter((t) => t.archived);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-auto w-full justify-between px-2.5 py-2 text-left">
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{current.name}</span>
            <span className="text-muted-foreground truncate text-xs font-normal">
              {current.courseLabel || current.goal}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>진행 중인 팀</DropdownMenuLabel>
        {active.map((team) => (
          <DropdownMenuItem key={team.id} onClick={() => router.push(`/teams/${team.id}`)}>
            <span className="flex-1 truncate">{team.name}</span>
            {team.id === current.id ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
        {active.length === 0 ? (
          <DropdownMenuItem disabled>진행 중인 팀이 없어요</DropdownMenuItem>
        ) : null}

        {archived.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>보관함</DropdownMenuLabel>
            {archived.map((team) => (
              <DropdownMenuItem key={team.id} onClick={() => router.push(`/teams/${team.id}`)}>
                <span className="flex-1 truncate">{team.name}</span>
                <Badge variant="secondary">보관</Badge>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/teams')}>
          <Plus className="size-4" /> 새 팀 만들기 · 초대로 합류
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

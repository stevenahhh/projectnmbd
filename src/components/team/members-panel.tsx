'use client';

import { useState } from 'react';
import { Archive, Crown, ShieldQuestion, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/auth-provider';
import { approveLeadership, requestLeadership } from '@/lib/teams';
import { assignRole, softDeleteTeam } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { LeaderRequest, Team } from '@/lib/types';

interface MembersPanelProps {
  team: Team;
  leaderRequests: LeaderRequest[];
  uid: string;
}

/** 멤버 (§2.8-0·1) — 역할 배정은 팀장만(규칙 게이트), 팀장 지정→승인 플로우. */
export function MembersPanel({ team, leaderRequests, uid }: MembersPanelProps) {
  const { refreshProfile } = useAuth();
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const isLeader = team.leaderUid === uid;
  const leaderless = team.leaderUid === null;

  const saveRole = async (memberUid: string) => {
    const label = roleDrafts[memberUid] ?? team.members[memberUid].roleLabel ?? '';
    try {
      await assignRole(team.id, uid, memberUid, label);
      toast.success('역할을 배정했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '역할 배정 실패');
    }
  };

  const requestLeadershipFor = async (targetUid: string) => {
    try {
      await requestLeadership(team.id, uid, targetUid);
      toast.success('팀장 지정 요청을 보냈어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '요청 실패');
    }
  };

  const approve = async (targetUid: string) => {
    try {
      await approveLeadership(team.id, targetUid);
      await refreshProfile();
      toast.success('팀장이 되었어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '승인 실패');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {leaderless ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldQuestion className="size-4" /> 팀장 공석 — 지정 → 승인 플로우
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {leaderRequests
              .filter((req) => req.status === 'pending')
              .map((req) => (
                <div key={req.id} className="flex items-center gap-2 text-sm">
                  <span>
                    {team.members[req.targetUid]?.nickname ?? '—'}님이 팀장으로 지정됐어요 ({formatKST(req.at)})
                  </span>
                  {req.targetUid === uid ? (
                    <Button size="sm" onClick={() => void approve(req.targetUid)}>
                      <UserCheck /> 승인
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">본인 승인 대기 중</span>
                  )}
                </div>
              ))}
            <div className="text-muted-foreground text-xs">
              아직 내 요청이 없으면 멤버 목록에서 「팀장으로 지정」을 누르세요.
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">참여자 {Object.keys(team.members).length}명</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {Object.entries(team.members).map(([memberUid, member]) => (
            <div key={memberUid} className="flex flex-wrap items-center gap-2 py-3">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button className="flex cursor-pointer items-center gap-2.5 text-left">
                    <Avatar>
                      <AvatarFallback>{member.nickname.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.nickname}
                        {team.leaderUid === memberUid ? <Crown className="ml-1.5 inline size-3.5 text-amber-500" /> : null}
                      </p>
                      <p className="text-muted-foreground text-xs">{member.roleLabel || '역할 미배정'}</p>
                    </div>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="flex flex-col gap-1 text-xs">
                    <p className="text-sm font-semibold">{member.nickname}</p>
                    <p>역할: {member.roleLabel || '미배정'}</p>
                    <p>합류: {formatKST(member.joinedAt, 'date')}</p>
                    <p className="text-muted-foreground">역량 태그·기여 요약은 대시보드를 참고하세요</p>
                  </div>
                </HoverCardContent>
              </HoverCard>

              <div className="ml-auto flex items-center gap-1.5">
                {isLeader ? (
                  <>
                    <Input
                      className="h-8 w-36 text-sm"
                      value={roleDrafts[memberUid] ?? member.roleLabel ?? ''}
                      onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [memberUid]: e.target.value }))}
                      placeholder="역할 자유 입력"
                    />
                    <Button size="sm" variant="outline" onClick={() => void saveRole(memberUid)}>
                      배정
                    </Button>
                  </>
                ) : null}
                {leaderless && memberUid !== uid ? (
                  <Button size="sm" variant="ghost" onClick={() => void requestLeadershipFor(memberUid)}>
                    팀장으로 지정
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isLeader ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">팀 관리 — 팀장 전용</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                void import('@/lib/teams').then((m) => m.archiveTeam(team.id, uid)).then(() => {
                  toast.success('보관했어요 — 이제 읽기 전용입니다');
                  void refreshProfile();
                })
              }
            >
              <Archive /> 팀 보관
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('이 팀을 삭제할까요? 되돌릴 수 없습니다.')) {
                  void softDeleteTeam(team.id, uid).then(() => {
                    toast.success('팀을 삭제했어요');
                    void refreshProfile();
                  });
                }
              }}
            >
              <Trash2 /> 팀 삭제
            </Button>
            <p className="text-muted-foreground w-full text-xs">
              팀 전체는 삭제할 수 있지만, 팀 안의 특정 기록만 골라 지우거나 날짜를 고칠 수는 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

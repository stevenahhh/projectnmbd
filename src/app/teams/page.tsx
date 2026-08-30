'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { createTeam, getTeam, joinTeam } from '@/lib/teams';
import type { Team } from '@/lib/types';

/** 내 팀 목록 — users/{uid}.teams 인덱스. 전역 teams 열거는 규칙이 막는다 (S2). */
export default function TeamsPage() {
  const { status, uid, profile } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [goal, setGoal] = useState('');
  const [due, setDue] = useState('');

  useEffect(() => {
    if (status !== 'ready' || !profile) return;
    const ids = Object.keys(profile.teams ?? {}).filter((id) => {
      // 팀 캐시에서 deleted 팀 제외 — 규칙상 deleted 팀은 읽기도 안 되므로 getTeam 이 null 이면 버린다
      return Boolean(id);
    });
    void Promise.all(ids.map((id) => getTeam(id))).then((list) => {
      const valid = list.filter((t): t is Team => t !== null && !t.deleted);
      setTeams(valid);
    });
  }, [status, profile]);

  if (status !== 'ready' || !uid) {
    return <main className="p-10 text-center text-sm">들어가는 중…</main>;
  }

  const submitCreate = async () => {
    if (!name.trim() || !due) {
      toast.error('이름과 마감을 입력하세요');
      return;
    }
    try {
      const teamId = await createTeam(uid, profile?.nickname ?? '팀장', {
        name: name.trim(),
        courseLabel: course.trim(),
        goal: goal.trim(),
        dueAt: new Date(due),
      });
      setOpen(false);
      toast.success('팀 생성 — 초대 링크를 만들어 팀원을 모으세요');
      router.push('/teams/' + teamId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '생성 실패');
    }
  };

  const submitJoin = async () => {
    const token = joinToken.trim().split('/').pop() ?? '';
    if (!token) {
      toast.error('초대 링크나 토큰을 입력하세요');
      return;
    }
    try {
      const teamId = await joinTeam(uid, token);
      toast.success('합류 완료!');
      router.push('/teams/' + teamId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '합류 실패');
    }
  };

  const activeTeams = teams.filter((t) => !t.archived);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 팀</h1>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> 팀 만들기
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 팀</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="t-name">팀 이름</Label>
                  <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 기계학습 팀프로젝트 5조" />
                </div>
                <div>
                  <Label htmlFor="t-course">과목</Label>
                  <Input id="t-course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="기계학습" />
                </div>
                <div>
                  <Label htmlFor="t-goal">목표</Label>
                  <Input id="t-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="과제 한 줄 요약" />
                </div>
                <div>
                  <Label htmlFor="t-due">마감</Label>
                  <Input id="t-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => void submitCreate()}>생성</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button asChild variant="outline">
            <Link href="/me">내 기록</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">초대로 합류</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={joinToken} onChange={(e) => setJoinToken(e.target.value)} placeholder="초대 링크 또는 토큰" />
          <Button variant="outline" onClick={() => void submitJoin()}>
            <Search /> 합류
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {activeTeams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={'/teams/' + team.id} className="hover:underline">
                  {team.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{team.goal || team.courseLabel}</p>
              <p className="text-muted-foreground mt-1 text-xs">멤버 {Object.keys(team.members).length}명</p>
              {team.leaderUid === uid ? <Badge className="mt-2">팀장</Badge> : null}
            </CardContent>
          </Card>
        ))}
        {activeTeams.length === 0 ? (
          <p className="text-muted-foreground text-sm sm:col-span-2">
            아직 팀이 없어요 — 새 팀을 만들거나 초대 링크로 합류해보세요.
          </p>
        ) : null}
      </div>
    </main>
  );
}

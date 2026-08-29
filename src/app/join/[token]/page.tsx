'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDb, getFirebaseAuth } from '@/lib/firebase/client';
import { joinTeam } from '@/lib/teams';
import type { Team } from '@/lib/types';

/** 초대 링크 합류 — /join/{token} */
export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [team, setTeam] = useState<Team | null | 'denied'>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        // 토큰을 아는 사람만 invites/{token} get 이 가능하다 (규칙 S4)
        const inviteSnap = await getDoc(doc(getDb(), 'invites', token));
        if (!inviteSnap.exists()) throw new Error('denied');
        const teamSnap = await getDoc(doc(getDb(), 'teams', inviteSnap.data().teamId as string));
        setTeam(teamSnap.exists() ? ({ id: teamSnap.id, ...(teamSnap.data() as Omit<Team, 'id'>) }) : 'denied');
      } catch {
        setTeam('denied');
      }
    })();
  }, [token]);

  const join = async () => {
    setJoining(true);
    try {
      const auth = getFirebaseAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('로그인 상태가 아닙니다');
      const teamId = await joinTeam(uid, token);
      router.push('/teams/' + teamId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '합류 실패');
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
      <Card>
        <CardHeader>
          <CardTitle>{team && team !== 'denied' ? team.name : '초대'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {team === 'denied' ? (
            <p className="text-muted-foreground text-sm">유효하지 않거나 만료된 초대예요.</p>
          ) : team ? (
            <>
              <p className="text-muted-foreground text-sm">
                {Object.keys(team.members).length}명이 활동 중이에요. 합류하면 기여 기록이 처음부터 쌓입니다.
              </p>
              <Button disabled={joining} onClick={() => void join()}>
                {joining ? '합류 중…' : '합류하기'}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">확인 중…</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

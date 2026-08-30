'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/components/providers/auth-provider';
import { Wordmark } from '@/components/wordmark';

const SKILL_SUGGESTIONS = ['데이터 정리', '모델링', '문서 작성', '발표', '자료조사', '디자인', '개발'];

/**
 * 온보딩 (§2.8-5) — 1단 닉네임 → 역량태그 → 링크(선택) → 관심과목.
 * 로그인·회원가입 화면은 존재하지 않는다 — 익명 uid + 닉네임만 (G1, C6).
 */
export default function OnboardingPage() {
  const { status, profile, saveProfile, triggerBootstrap } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  // 기본 닉네임이 채워져 있어 아무 글자나 쓰지 않아도 바로 시작할 수 있다
  const [nickname, setNickname] = useState(profile?.nickname ?? '새싹');
  const [skillTags, setSkillTags] = useState<string[]>(profile?.skillTags ?? []);
  const [customSkill, setCustomSkill] = useState('');
  const [github, setGithub] = useState(profile?.github ?? '');
  const [portfolio, setPortfolio] = useState(profile?.portfolio ?? '');
  const [interests, setInterests] = useState((profile?.interests ?? []).join(', '));
  const [saving, setSaving] = useState(false);

  if (status === 'loading') return <main className="p-10 text-center text-sm">들어가는 중…</main>;

  const finish = async () => {
    setSaving(true);
    try {
      await saveProfile({
        nickname: nickname.trim(),
        skillTags,
        ...(github.trim() ? { github: github.trim() } : {}),
        ...(portfolio.trim() ? { portfolio: portfolio.trim() } : {}),
        interests: interests.split(',').map((s) => s.trim()).filter(Boolean),
        onboardedAt: new Date(),
      } as never);
      const { teamId } = await triggerBootstrap();
      if (teamId) {
        router.push('/teams/' + teamId);
      } else {
        toast.warning('팀 준비에 실패했어요 — 직접 팀을 만들어 시작할 수 있어요');
        router.push('/teams');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1>
          <Wordmark className="text-3xl" />
        </h1>
        <Button asChild variant="ghost" size="sm"><Link href="/">처음으로</Link></Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{step === 0 ? '닉네임만 알려주세요' : step === 1 ? '역량 태그' : step === 2 ? '링크 (선택)' : '관심 과목 (선택)'}</CardTitle>
          <CardDescription>단계 {step + 1} / 4 · 모든 항목 선택 사항 · 실명·학번은 받지 않아요</CardDescription>
          {step > 0 ? (
            <button className="text-muted-foreground hover:text-foreground cursor-pointer self-start text-xs" onClick={() => void finish()}>
              건너뛰고 바로 시작 →
            </button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {step === 0 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="팀에서 부를 이름"
                onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && setStep(1)}
              />
              <Button disabled={!nickname.trim()} onClick={() => setStep(1)}>다음</Button>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map((skill) => (
                  <label key={skill} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                    <Checkbox
                      checked={skillTags.includes(skill)}
                      onCheckedChange={(v) => setSkillTags((prev) => (v === true ? [...prev, skill] : prev.filter((s) => s !== skill)))}
                    />
                    {skill}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} placeholder="자유 입력" />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (customSkill.trim()) {
                      setSkillTags((prev) => [...new Set([...prev, customSkill.trim()])]);
                      setCustomSkill('');
                    }
                  }}
                >
                  추가
                </Button>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>이전</Button>
                <Button onClick={() => setStep(2)}>다음</Button>
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="gh">GitHub</Label>
              <Input id="gh" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" />
              <Label htmlFor="pf">포트폴리오</Label>
              <Input id="pf" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>이전</Button>
                <Button onClick={() => setStep(3)}>다음</Button>
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="it">관심 과목 (쉼표 구분)</Label>
              <Input id="it" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="기계학습, 데이터베이스" />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>이전</Button>
                <Button disabled={saving || !nickname.trim()} onClick={() => void finish()}>
                  {saving ? '팀 준비 중…' : '시작하기'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

    </main>
  );
}

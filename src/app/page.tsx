import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight">팀플</h1>
        <p className="text-muted-foreground text-lg">
          팀 프로젝트를 한 곳에서 — 문서·자료·할 일·대화를 모으고,
          <br />
          기여도는 자동으로 정리됩니다.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button asChild size="lg" className="text-base">
          <Link href="/onboarding">체험하기</Link>
        </Button>
        <p className="text-muted-foreground text-xs">
          가입 없이 익명으로 바로 시작 — 팀 대시보드까지 10초면 충분해요
        </p>
      </div>
      <div className="grid gap-3 text-left text-sm sm:grid-cols-3">
        <div className="bg-card rounded-lg border p-4">
          <p className="font-semibold">자동 정리</p>
          <p className="text-muted-foreground mt-1">문서·파일·할 일·회의를 쓰면 누가 언제 했는지 자동으로 남습니다</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="font-semibold">고칠 수 없는 시각</p>
          <p className="text-muted-foreground mt-1">기록 시각은 서버가 찍고, 나중에 바꿀 수 없습니다</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="font-semibold">기여 리포트</p>
          <p className="text-muted-foreground mt-1">동료평가에 첨부할 한 장을 PNG로 내려받을 수 있어요</p>
        </div>
      </div>
    </main>
  );
}

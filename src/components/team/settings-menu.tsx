'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { clearTutorialProgress } from './tutorial';

/** 사이드바 하단 설정 — 접으면 디버그 도구가 나온다. */
export function SettingsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetEverything = async () => {
    setResetting(true);
    try {
      clearTutorialProgress();
      await signOut(getFirebaseAuth());
      // 새 익명 계정으로 다시 시작 — 이전 계정의 팀은 그대로 남고 접근만 끊긴다
      router.push('/onboarding');
      router.refresh();
    } catch (error) {
      setResetting(false);
      toast.error(error instanceof Error ? error.message : '초기화하지 못했어요');
    }
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm"
        aria-expanded={open}
      >
        <Settings className="size-4 shrink-0" />
        <span className="flex-1">설정</span>
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="mt-1 ml-3 flex flex-col gap-2 border-l pl-3">
          <p className="text-muted-foreground text-xs">디버그</p>
          <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)} disabled={resetting}>
            <RotateCcw /> {resetting ? '초기화 중…' : '데이터 지우고 새로 시작'}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="처음부터 다시 시작할까요?"
            description="이 브라우저의 익명 계정을 버리고 새 계정으로 시작합니다. 지금 팀에는 다시 들어올 수 없어요."
            confirmLabel="새로 시작"
            destructive
            onConfirm={resetEverything}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              clearTutorialProgress();
              toast.success('안내를 처음부터 다시 봅니다 — 화면을 새로고침해주세요');
            }}
          >
            안내 다시 보기
          </Button>
        </div>
      ) : null}
    </div>
  );
}

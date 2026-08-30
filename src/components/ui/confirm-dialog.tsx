'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** 되돌릴 수 없는 동작 — 버튼을 빨갛게 두고 기본 포커스를 주지 않는다. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * 확인창 — 브라우저 confirm() 대신 쓴다.
 * confirm() 은 탭 전체를 멈추고 모양을 손댈 수 없어 되돌릴 수 없는 동작의 무게를 못 싣는다.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            취소
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={() => void run()} disabled={running}>
            {running ? '처리 중…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatKST } from '@/lib/time';
import type { LedgerEvent, Team, TeamTask } from '@/lib/types';

export interface TimelineForm {
  title: string;
  startAt: string;
  dueAt: string;
}

interface EditDialogProps {
  editing: TeamTask | null;
  form: TimelineForm;
  saving: boolean;
  onFormChange: (form: TimelineForm) => void;
  onClose: () => void;
  onSave: () => void;
}

/** 항목 수정 — 제목만 바꾸든 기간까지 바꾸든 같은 창에서 한다. */
export function TimelineEditDialog({ editing, form, saving, onFormChange, onClose, onSave }: EditDialogProps) {
  return (
    <Dialog open={Boolean(editing)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" /> 항목 수정
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-title">제목</Label>
            <Input
              id="g-title"
              autoFocus
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
            />
          </div>
          {editing?.milestoneStartAt ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-start">시작</Label>
              <Input
                id="g-start"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => onFormChange({ ...form, startAt: e.target.value })}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-due">마감</Label>
            <Input
              id="g-due"
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => onFormChange({ ...form, dueAt: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  history: LedgerEvent[];
}

/** 기간 수정 이력 — 누가 언제 마감을 어디서 어디로 옮겼는지. */
export function TimelineHistoryDialog({ open, onOpenChange, team, history }: HistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>수정 이력</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col divide-y overflow-auto">
          {history.map((event) => {
            const payload = (event.payload ?? {}) as {
              title?: string;
              dueAt?: string;
              prevDueAt?: string;
              parentId?: string | null;
              parentTitle?: string | null;
            };
            const moved = 'parentId' in payload;
            return (
              <div key={event.id} className="flex flex-col gap-0.5 py-2.5 text-xs">
                <span className="font-medium">
                  {team.members[event.actorUid]?.nickname ?? '알 수 없음'} · {payload.title ?? '항목'}
                </span>
                <span className="text-muted-foreground">
                  {formatKST(event.at)}
                  {moved ? (payload.parentTitle ? ` · 「${payload.parentTitle}」 하위로` : ' · 최상위로') : ''}
                  {payload.prevDueAt && payload.dueAt
                    ? ` · 마감 ${formatKST(new Date(payload.prevDueAt))} → ${formatKST(new Date(payload.dueAt))}`
                    : ''}
                </span>
              </div>
            );
          })}
          {history.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">아직 수정한 기록이 없어요</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

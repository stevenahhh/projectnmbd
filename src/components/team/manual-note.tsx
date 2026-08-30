'use client';

import { useState } from 'react';
import { NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addNote } from '@/lib/team-ops';
import type { Team } from '@/lib/types';

/**
 * 화면 밖에서 한 일을 남긴다 — 발표 연습, 오프라인 자료조사처럼 앱이 자동으로 못 세는 몫.
 * 혼자 주장하는 기록이 되지 않도록 확인해줄 팀원을 함께 적는다.
 */
export function ManualNote({ team, uid }: { team: Team; uid: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [verifiers, setVerifiers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const others = Object.entries(team.members).filter(([memberUid]) => memberUid !== uid);

  const submit = async () => {
    if (text.trim().length < 2) {
      toast.error('무엇을 했는지 적어주세요');
      return;
    }
    setSaving(true);
    try {
      await addNote(team.id, uid, text.trim(), verifiers);
      setText('');
      setVerifiers([]);
      setOpen(false);
      toast.success('기록으로 남겼어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '남기지 못했어요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <NotebookPen /> 직접 기록
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>앱 밖에서 한 일 남기기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-text">무엇을 했나요?</Label>
            <Textarea
              id="note-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="예: 발표 리허설 2시간, 강의실 예약 데이터 직접 수집"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>확인해줄 팀원</Label>
            <div className="flex flex-wrap gap-3">
              {others.map(([memberUid, member]) => (
                <label key={memberUid} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={verifiers.includes(memberUid)}
                    onCheckedChange={(checked) =>
                      setVerifiers((prev) =>
                        checked === true ? [...prev, memberUid] : prev.filter((u) => u !== memberUid),
                      )
                    }
                  />
                  {member.nickname}
                </label>
              ))}
              {others.length === 0 ? <span className="text-muted-foreground text-xs">아직 팀원이 없어요</span> : null}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? '남기는 중…' : '남기기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

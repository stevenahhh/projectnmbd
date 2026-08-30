'use client';

import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichEditor } from '@/components/ui/rich-editor';
import { createMeeting, updateMeeting } from '@/lib/team-ops';
import { toLocalInputValue } from '@/lib/timeline';
import type { Meeting, Team } from '@/lib/types';
import { SummaryComposer, useMeetingSummary } from './meeting-summary';

/** 본문이 이만큼은 있어야 요약을 만든다. */
const MIN_BODY_FOR_SUMMARY = 30;

interface MeetingComposeProps {
  team: Team;
  uid: string;
  /** 있으면 편집 모드 — 화면을 스스로 열고(트리거 없음) 수정을 저장한다. */
  meeting?: Meeting | null;
  onClose?: () => void;
}

/**
 * 회의록 작성·수정 창.
 * 새 회의는 저장 전에 AI 요약을 한 번 거치게 한다. 수정할 때는 요약을 다시 만들지 않아도 되고,
 * 전문은 버전으로 남는다(저장 1회 = 버전 1개).
 */
export function MeetingCompose({ team, uid, meeting = null, onClose }: MeetingComposeProps) {
  const isEdit = Boolean(meeting);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(meeting?.title ?? '');
  const [startedAt, setStartedAt] = useState(meeting ? toLocalInputValue(meeting.startedAt.toDate()) : '');
  const [durationMin, setDurationMin] = useState(String(meeting?.durationMin ?? 60));
  const [place, setPlace] = useState(meeting?.place ?? '');
  const [online, setOnline] = useState(meeting?.online ?? false);
  const [attendees, setAttendees] = useState<string[]>(meeting?.attendeeUids ?? [uid]);
  const [body, setBody] = useState(meeting?.body ?? '');
  const summary = useMeetingSummary();
  const close = () => {
    setOpen(false);
    onClose?.();
  };

  const submit = async () => {
    if (!title.trim() || !startedAt || !place.trim()) {
      toast.error('주제·일시·장소를 입력하세요');
      return;
    }
    const input = {
      title: title.trim(),
      startedAt: new Date(startedAt),
      durationMin: Number(durationMin) || 60,
      place: place.trim(),
      online,
      attendeeUids: attendees,
      summary3: summary.lines
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n'),
      body: body.trim(),
    };
    try {
      if (isEdit && meeting) {
        await updateMeeting(team.id, uid, meeting, input);
        toast.success('회의록을 수정했어요 — 이전 전문은 버전으로 남습니다');
      } else {
        await createMeeting(team.id, uid, input);
        toast.success('회의록을 저장했어요');
      }
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  // 편집 모드는 화면이 스스로 열린다 (트리거 없음)
  const dialogOpen = isEdit ? Boolean(meeting) : open;

  return (
    <Dialog open={dialogOpen} onOpenChange={(next) => (isEdit ? (!next ? close() : undefined) : setOpen(next))}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button id="tut-meeting-new">
            <Plus /> 회의록 작성
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? '회의록 수정' : '회의록'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="m-title">주제</Label>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 주 3회 — 모델 리뷰"
            />
          </div>
          <div>
            <Label htmlFor="m-when">일시</Label>
            <Input id="m-when" type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="m-dur">진행시간(분)</Label>
            <Input id="m-dur" type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="m-place">장소</Label>
            <Input
              id="m-place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="공과대학 3호관 502호"
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <Checkbox checked={online} onCheckedChange={(v) => setOnline(v === true)} /> 비대면
          </label>
          <div className="col-span-2">
            <Label>참여인원</Label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {Object.entries(team.members).map(([memberUid, member]) => (
                <label key={memberUid} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={attendees.includes(memberUid)}
                    onCheckedChange={(v) =>
                      setAttendees((prev) => (v === true ? [...prev, memberUid] : prev.filter((u) => u !== memberUid)))
                    }
                  />
                  {member.nickname}
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="m-body">내용</Label>
            <RichEditor
              ariaLabel="회의록 내용"
              value={body}
              onChange={setBody}
              placeholder="논의한 것, 정한 것, 다음에 할 일을 적어주세요"
            />
          </div>
          <div className="col-span-2">
            <SummaryComposer lines={summary.lines} status={summary.status} onChange={summary.setLines} />
          </div>
        </div>
        <DialogFooter>
          {isEdit ? (
            <Button onClick={() => void submit()}>저장하고 새 버전 만들기</Button>
          ) : summary.isFresh(body) ? (
            <Button onClick={() => void submit()}>저장</Button>
          ) : (
            <Button
              disabled={summary.status === 'running' || body.trim().length < MIN_BODY_FOR_SUMMARY}
              onClick={() => void summary.generate(title, body)}
            >
              <Sparkles className={summary.status === 'running' ? 'animate-pulse' : ''} />
              {summary.status === 'running' ? '요약 생성 중…' : 'AI 요약 생성'}
            </Button>
          )}
          {!isEdit && summary.status === 'failed' ? (
            <Button variant="ghost" onClick={() => void submit()}>
              요약 없이 저장
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
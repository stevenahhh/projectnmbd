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
import { createMeeting } from '@/lib/team-ops';
import type { Team } from '@/lib/types';
import { SummaryComposer, useMeetingSummary } from './meeting-summary';

/** 본문이 이만큼은 있어야 요약을 만든다. */
const MIN_BODY_FOR_SUMMARY = 30;

/**
 * 회의록 작성 창.
 * 저장 전에 AI 요약을 한 번 거치게 한다 — 요약이 있어야 목록에서 회의를 알아볼 수 있다.
 */
export function MeetingCompose({ team, uid }: { team: Team; uid: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [place, setPlace] = useState('');
  const [online, setOnline] = useState(false);
  const [attendees, setAttendees] = useState<string[]>([uid]);
  const [body, setBody] = useState('');
  const summary = useMeetingSummary();

  const submit = async () => {
    if (!title.trim() || !startedAt || !place.trim()) {
      toast.error('주제·일시·장소를 입력하세요');
      return;
    }
    try {
      await createMeeting(team.id, uid, {
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
      });
      setOpen(false);
      setTitle('');
      setBody('');
      summary.reset();
      toast.success('회의록을 저장했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="tut-meeting-new">
          <Plus /> 회의록 작성
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>회의록</DialogTitle>
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
              placeholder="공학관 401호 또는 ZOOM"
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
          {/* 요약을 만들어야 저장이 열린다. 본문을 고치면 다시 만들게 된다. */}
          {summary.isFresh(body) ? (
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
          {/* AI 가 응답하지 못했을 때 쓴 글이 갇히지 않도록 열어 두는 문 */}
          {summary.status === 'failed' ? (
            <Button variant="ghost" onClick={() => void submit()}>
              요약 없이 저장
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { CalendarCheck, ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { checkAttend, createMeeting } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { Meeting, Team } from '@/lib/types';

interface MeetingsPanelProps {
  team: Team;
  meetings: Meeting[];
  uid: string;
  hasAiKey: boolean;
}

/** 회의록 (§2.8-3) — 정형 템플릿, 화자 분리·녹음 없음. 참석 체크가 출석 기록이다. */
export function MeetingsPanel({ team, meetings, uid, hasAiKey }: MeetingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [place, setPlace] = useState('');
  const [online, setOnline] = useState(false);
  const [attendees, setAttendees] = useState<string[]>([uid]);
  const [summary3, setSummary3] = useState('');
  const [body, setBody] = useState('');

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
        summary3: summary3.trim(),
        body: body.trim(),
      });
      setOpen(false);
      setTitle('');
      setSummary3('');
      setBody('');
      toast.success('회의록을 저장했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
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
                <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 주 3회 — 모델 리뷰" />
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
                <Input id="m-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="공학관 401호 또는 ZOOM" />
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
              <div className="col-span-2">
                <Label htmlFor="m-sum">세줄요약</Label>
                <Textarea id="m-sum" value={summary3} onChange={(e) => setSummary3(e.target.value)} placeholder="1) ... 2) ... 3) ..." />
              </div>
              <div className="col-span-2">
                <Label htmlFor="m-body">내용</Label>
                <Textarea id="m-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
              </div>
            </div>
            <DialogFooter>
              {hasAiKey ? (
                <Button variant="outline" disabled title="AI 요약 — 키 있을 때만 노출">
                  AI 요약
                </Button>
              ) : null}
              <Button onClick={() => void submit()}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4">
        {meetings.map((meeting) => (
          <Card key={meeting.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="size-4" /> {meeting.title}
                </CardTitle>
                <Button
                  size="sm"
                  variant={meeting.attendeeUids.includes(uid) ? 'secondary' : 'outline'}
                  onClick={() =>
                    void checkAttend(team.id, uid, meeting).then(() => toast.success('참석으로 기록했어요'))
                  }
                >
                  <CalendarCheck /> {meeting.attendeeUids.includes(uid) ? '참석함' : '참석 체크'}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {formatKST(meeting.startedAt)} · {meeting.durationMin}분 · {meeting.online ? '비대면' : meeting.place} · 작성 {team.members[meeting.actorUid]?.nickname ?? '—'}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm whitespace-pre-wrap font-medium">세줄요약{'\n'}{meeting.summary3 || '—'}</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{meeting.body || '—'}</p>
              <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                참석 {meeting.attendeeUids.length}명:
                {meeting.attendeeUids.map((attendeeUid) => (
                  <span key={attendeeUid} className="bg-secondary rounded px-1.5 py-0.5">
                    {team.members[attendeeUid]?.nickname ?? '—'}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {meetings.length === 0 ? <p className="text-muted-foreground py-8 text-center text-sm">아직 회의록이 없어요</p> : null}
      </div>
    </div>
  );
}

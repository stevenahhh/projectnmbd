'use client';

import { useState } from 'react';
import { CalendarCheck, ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Markdown } from '@/components/markdown';
import { checkAttend, createMeeting } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { Meeting, Team } from '@/lib/types';
import { SummaryComposer, SummaryLines } from './meeting-summary';

interface MeetingsPanelProps {
  team: Team;
  meetings: Meeting[];
  uid: string;
}

/** 회의록 (§2.8-3) — 정형 템플릿, 화자 분리·녹음 없음. 참석 체크가 출석 기록이다. */
export function MeetingsPanel({ team, meetings, uid }: MeetingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<Meeting | null>(null);
  const [title, setTitle] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [place, setPlace] = useState('');
  const [online, setOnline] = useState(false);
  const [attendees, setAttendees] = useState<string[]>([uid]);
  const [summaryLines, setSummaryLines] = useState<string[]>(['', '', '']);
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
        summary3: summaryLines.map((line) => line.trim()).filter(Boolean).join('\n'),
        body: body.trim(),
      });
      setOpen(false);
      setTitle('');
      setSummaryLines(['', '', '']);
      setBody('');
      toast.success('회의록을 저장했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  const attend = async (meeting: Meeting) => {
    try {
      await checkAttend(team.id, uid, meeting);
      toast.success('참석으로 기록했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '기록하지 못했어요');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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
                <Label htmlFor="m-body">내용</Label>
                <Textarea
                  id="m-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder={'## 논의\n- …\n\n## 결정\n- …'}
                />
                <p className="text-muted-foreground mt-1 text-[11px]">## 제목, - 목록 같은 마크다운을 그대로 씁니다</p>
              </div>
              <div className="col-span-2">
                <SummaryComposer title={title} body={body} lines={summaryLines} onChange={setSummaryLines} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => void submit()}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            id={meeting.id === meetings[0]?.id ? 'tut-meeting-card' : undefined}
            role="button"
            tabIndex={0}
            onClick={() => setReading(meeting)}
            onKeyDown={(e) => (e.key === 'Enter' ? setReading(meeting) : undefined)}
            className="bg-card hover:border-primary/50 flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-sm font-semibold">{meeting.title}</span>
              <Badge variant={meeting.online ? 'secondary' : 'outline'}>{meeting.online ? '비대면' : '대면'}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              {formatKST(meeting.startedAt)} · {meeting.durationMin}분
            </p>
            <SummaryLines summary3={meeting.summary3} compact />
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <p className="text-muted-foreground text-[11px]">
                참석 {meeting.attendeeUids.length}명
                {meeting.attendeeUids.length > 0
                  ? ` · ${meeting.attendeeUids
                      .slice(0, 3)
                      .map((a) => team.members[a]?.nickname ?? '—')
                      .join(', ')}${meeting.attendeeUids.length > 3 ? ' 외' : ''}`
                  : ''}
              </p>
              {meeting.attendeeUids.includes(uid) ? (
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <CalendarCheck className="size-3.5" /> 참석함
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    void attend(meeting);
                  }}
                >
                  <CalendarCheck /> 참석 체크
                </Button>
              )}
            </div>
          </div>
        ))}
        {meetings.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm md:col-span-2 xl:col-span-3">
            아직 회의록이 없어요
          </p>
        ) : null}
      </div>

      <Dialog open={Boolean(reading)} onOpenChange={(next) => (!next ? setReading(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="size-5" /> {reading?.title}
            </DialogTitle>
          </DialogHeader>
          {reading ? (
            <article className="flex flex-col gap-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-lg border p-4 text-sm">
                <dt className="text-muted-foreground">일시</dt>
                <dd>
                  {formatKST(reading.startedAt)} · {reading.durationMin}분
                </dd>
                <dt className="text-muted-foreground">장소</dt>
                <dd>
                  {reading.place} {reading.online ? '(비대면)' : ''}
                </dd>
                <dt className="text-muted-foreground">작성</dt>
                <dd>{team.members[reading.actorUid]?.nickname ?? '—'}</dd>
                <dt className="text-muted-foreground">참석</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {reading.attendeeUids.map((attendeeUid) => (
                    <span key={attendeeUid} className="bg-secondary rounded px-1.5 py-0.5 text-xs">
                      {team.members[attendeeUid]?.nickname ?? '—'}
                    </span>
                  ))}
                  {reading.attendeeUids.length === 0 ? <span className="text-muted-foreground text-xs">없음</span> : null}
                </dd>
              </dl>

              <SummaryLines summary3={reading.summary3} />

              <section className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold">내용</h3>
                {reading.body ? (
                  <Markdown text={reading.body} className="text-[15px] leading-7" />
                ) : (
                  <p className="text-muted-foreground text-sm">내용이 없습니다</p>
                )}
              </section>

              <Button
                variant={reading.attendeeUids.includes(uid) ? 'secondary' : 'default'}
                className="self-start"
                onClick={() =>
                  void attend(reading).then(() => setReading(null))
                }
              >
                <CalendarCheck /> {reading.attendeeUids.includes(uid) ? '참석함' : '참석 체크'}
              </Button>
            </article>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

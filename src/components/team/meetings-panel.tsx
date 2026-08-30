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
import { checkAttend, createMeeting } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { Meeting, Team } from '@/lib/types';

/** 세 줄 요약은 줄 단위로 저장한다 — 예전 「1) … 2) …」 한 줄 형식도 분해해 받아준다. */
function summaryLinesOf(summary3: string): string[] {
  const byLine = summary3.split('\n').map((line) => line.trim()).filter(Boolean);
  const raw = byLine.length > 1 ? byLine : summary3.split(/\s*\d+[).]\s*/).filter(Boolean);
  return raw.map((line) => line.replace(/^\s*\d+[).]\s*/, '').trim()).filter(Boolean);
}

interface MeetingsPanelProps {
  team: Team;
  meetings: Meeting[];
  uid: string;
  hasAiKey: boolean;
}

/** 회의록 (§2.8-3) — 정형 템플릿, 화자 분리·녹음 없음. 참석 체크가 출석 기록이다. */
export function MeetingsPanel({ team, meetings, uid, hasAiKey }: MeetingsPanelProps) {
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
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="m-sum-1">세 줄 요약</Label>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 text-sm tabular-nums">{index + 1}.</span>
                    <Input
                      id={`m-sum-${index + 1}`}
                      value={summaryLines[index] ?? ''}
                      onChange={(e) =>
                        setSummaryLines((prev) => prev.map((line, i) => (i === index ? e.target.value : line)))
                      }
                      placeholder={
                        index === 0 ? '무엇을 정했나요?' : index === 1 ? '무엇이 문제였나요?' : '다음에 무엇을 하나요?'
                      }
                    />
                  </div>
                ))}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {meetings.map((meeting) => (
          <button
            key={meeting.id}
            id={meeting.id === meetings[0]?.id ? 'tut-meeting-card' : undefined}
            onClick={() => setReading(meeting)}
            className="bg-card hover:border-primary/50 flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-sm font-semibold">{meeting.title}</span>
              <Badge variant={meeting.online ? 'secondary' : 'outline'}>{meeting.online ? '비대면' : '대면'}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              {formatKST(meeting.startedAt)} · {meeting.durationMin}분
            </p>
            <ol className="text-muted-foreground flex flex-col gap-0.5 text-sm">
              {summaryLinesOf(meeting.summary3).slice(0, 3).map((line, index) => (
                <li key={index} className="line-clamp-2">
                  {index + 1}. {line}
                </li>
              ))}
              {summaryLinesOf(meeting.summary3).length === 0 ? <li>요약이 없습니다</li> : null}
            </ol>
            <p className="text-muted-foreground mt-auto pt-1 text-[11px]">
              참석 {meeting.attendeeUids.length}명
              {meeting.attendeeUids.length > 0
                ? ` · ${meeting.attendeeUids
                    .slice(0, 3)
                    .map((a) => team.members[a]?.nickname ?? '—')
                    .join(', ')}${meeting.attendeeUids.length > 3 ? ' 외' : ''}`
                : ''}
            </p>
          </button>
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

              <section className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold">세 줄 요약</h3>
                <ol className="bg-muted flex flex-col gap-1.5 rounded-lg p-4 text-sm leading-relaxed">
                  {summaryLinesOf(reading.summary3).map((line, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
                      <span>{line}</span>
                    </li>
                  ))}
                  {summaryLinesOf(reading.summary3).length === 0 ? <li>요약이 없습니다</li> : null}
                </ol>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold">내용</h3>
                <p className="text-[15px] leading-7 whitespace-pre-wrap">{reading.body || '내용이 없습니다'}</p>
              </section>

              <Button
                variant={reading.attendeeUids.includes(uid) ? 'secondary' : 'default'}
                className="self-start"
                onClick={() =>
                  void checkAttend(team.id, uid, reading).then(() => {
                    toast.success('참석으로 기록했어요');
                    setReading(null);
                  })
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

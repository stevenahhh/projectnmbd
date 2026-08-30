'use client';

import { useState } from 'react';
import { CalendarCheck, ClipboardList, History, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Markdown } from '@/components/markdown';
import { checkAttend, restoreMeeting, softDeleteMeeting } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { Meeting, Team } from '@/lib/types';
import { MeetingCompose } from './meeting-compose';
import { MeetingVersionsDialog } from './meeting-versions';
import { SummaryLines } from './meeting-summary';

interface MeetingsPanelProps {
  team: Team;
  meetings: Meeting[];
  uid: string;
}

/** 회의록 (§2.8-3) — 정형 템플릿, 화자 분리·녹음 없음. 참석 체크가 출석 기록이다. */
export function MeetingsPanel({ team, meetings, uid }: MeetingsPanelProps) {
  const [reading, setReading] = useState<Meeting | null>(null);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        <MeetingCompose team={team} uid={uid} />
      </div>

      {editing ? (
        <MeetingCompose key={editing.id} team={team} uid={uid} meeting={editing} onClose={() => setEditing(null)} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={showDeleted ? 'ghost' : 'secondary'} onClick={() => setShowDeleted(false)}>
          전체 {meetings.filter((m) => !m.deleted).length}
        </Button>
        <Button size="sm" variant={showDeleted ? 'secondary' : 'ghost'} onClick={() => setShowDeleted(true)}>
          삭제된 {meetings.filter((m) => m.deleted).length}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {meetings.filter((meeting) => (showDeleted ? meeting.deleted : !meeting.deleted)).map((meeting) => (
          <div
            key={meeting.id}
            id={meeting.id === meetings[0]?.id && !meeting.deleted ? 'tut-meeting-card' : undefined}
            role="button"
            tabIndex={0}
            onClick={() => (meeting.deleted ? undefined : setReading(meeting))}
            onKeyDown={(e) => (e.key === 'Enter' && !meeting.deleted ? setReading(meeting) : undefined)}
            className={`bg-card flex flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition-all ${
              meeting.deleted ? 'opacity-60' : 'hover:border-primary/50 cursor-pointer hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-sm font-semibold">{meeting.title}</span>
              <Badge variant={meeting.online ? 'secondary' : 'outline'}>{meeting.online ? '비대면' : '대면'}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              {formatKST(meeting.startedAt)} · {meeting.durationMin}분
              {meeting.editedAt ? <span className="ml-1.5 text-[10px]">수정됨</span> : null}
            </p>
            <SummaryLines summary3={meeting.summary3} compact />
            {meeting.deleted ? (
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-muted-foreground text-[11px]">삭제(보관)됨 — 버전 포함 원본 보존</span>
                {team.leaderUid === uid ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      void restoreMeeting(team.id, uid, meeting).then(() => toast.success('다시 사용할 수 있어요'));
                    }}
                  >
                    복원
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-[11px]">팀장만 복원할 수 있어요</span>
                )}
              </div>
            ) : (
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
            )}
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
            <article className="selectable flex flex-col gap-5">
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

              <div className="flex flex-wrap items-center gap-2">
                {!reading.deleted && (reading.actorUid === uid || team.leaderUid === uid) ? (
                  <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 /> 삭제
                  </Button>
                ) : null}
                <ConfirmDialog
                  open={confirmDelete}
                  onOpenChange={setConfirmDelete}
                  title="이 회의록을 삭제할까요?"
                  description="원본은 '삭제된 회의록'에 보관됩니다. 버전 포함 그대로 남고, 팀장이 언제든 복원할 수 있어요."
                  confirmLabel="삭제(보관)"
                  destructive
                  onConfirm={async () => {
                    await softDeleteMeeting(team.id, uid, reading);
                    toast.success('삭제(보관)했어요');
                    setReading(null);
                  }}
                />
                <Button variant="outline" onClick={() => { setReading(null); setEditing(reading); }}>
                  <Pencil /> 수정
                </Button>
                <Button variant="outline" onClick={() => setVersionsOpen(true)}>
                  <History /> 버전 {Math.max(0, (reading.latestVersion ?? 1) - 1)}개
                </Button>
                <Button
                  variant={reading.attendeeUids.includes(uid) ? 'secondary' : 'default'}
                  onClick={() => void attend(reading).then(() => setReading(null))}
                >
                  <CalendarCheck /> {reading.attendeeUids.includes(uid) ? '참석함' : '참석 체크'}
                </Button>
              </div>
            </article>
          ) : null}
        </DialogContent>
      </Dialog>

      {reading ? (
        <MeetingVersionsDialog open={versionsOpen} onOpenChange={setVersionsOpen} team={team} uid={uid} meeting={reading} />
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Markdown } from '@/components/markdown';
import { collection, getDocs, orderBy, query, type Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { updateMeeting } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { Meeting, Team } from '@/lib/types';

interface MeetingVersion {
  id: string;
  version: number;
  body: string;
  actorUid: string;
  at: Timestamp | null;
}

async function fetchVersions(teamId: string, meetingId: string): Promise<MeetingVersion[]> {
  const snap = await getDocs(
    query(collection(getDb(), 'teams', teamId, 'meetings', meetingId, 'versions'), orderBy('version', 'asc')),
  );
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<MeetingVersion, 'id'>) }));
}

interface MeetingVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  uid: string;
  meeting: Meeting;
}

/** 회의록 버전 목록 — 저장 1회 = 버전 1개. 예전 전문을 보고, 그 버전으로 되돌린다. */
export function MeetingVersionsDialog({ open, onOpenChange, team, uid, meeting }: MeetingVersionsDialogProps) {
  const [versions, setVersions] = useState<MeetingVersion[]>([]);
  const [selected, setSelected] = useState<MeetingVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchVersions(team.id, meeting.id)
      .then((list) => {
        if (cancelled) return;
        setVersions(list);
        setSelected(list[list.length - 1] ?? null);
      })
      .catch(() => toast.error('버전을 읽지 못했어요'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meeting.id]);

  const restore = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      await updateMeeting(team.id, uid, meeting, {
        title: meeting.title,
        startedAt: meeting.startedAt.toDate(),
        durationMin: meeting.durationMin,
        place: meeting.place,
        online: meeting.online,
        attendeeUids: meeting.attendeeUids,
        summary3: meeting.summary3,
        body: selected.body,
      });
      toast.success(`v${selected.version}으로 되돌렸어요 — 그 일도 버전으로 남았습니다`);
      const list = await fetchVersions(team.id, meeting.id);
      setVersions(list);
      setSelected(list[list.length - 1] ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '되돌리지 못했어요');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" /> 버전 {versions.length ? `${versions.length}개` : '불러오는 중…'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="flex max-h-[46vh] flex-col gap-1 overflow-auto">
            {versions.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-xs">아직 버전이 없어요</p>
            ) : null}
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => setSelected(version)}
                className={`rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selected?.id === version.id ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'
                }`}
              >
                <span className="font-semibold">v{version.version}</span>
                <span className="text-muted-foreground ml-2">{team.members[version.actorUid]?.nickname ?? '—'}</span>
                <span className="text-muted-foreground mt-0.5 block">{formatKST(version.at)}</span>
              </button>
            ))}
          </div>
          <div className="flex min-h-[200px] flex-col rounded-lg border p-3">
            {selected ? (
              <>
                <div className="selectable flex-1 overflow-auto text-sm">
                  {selected.body ? <Markdown text={selected.body} /> : <p className="text-muted-foreground">내용 없음</p>}
                </div>
                <Button size="sm" variant="outline" className="mt-3 self-start" disabled={restoring} onClick={() => void restore()}>
                  <RotateCcw /> 이 버전으로 되돌리기
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground self-center text-xs">왼쪽에서 버전을 고르세요</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
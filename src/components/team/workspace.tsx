'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/auth-provider';
import { useTeamData } from '@/hooks/use-team-data';
import { buildNotifications, STAGE_LABEL, type DeadlineItem } from '@/lib/notifications';
import { DashboardPanel } from './dashboard-panel';
import { TasksPanel } from './tasks-panel';
import { ChatPanel } from './chat-panel';
import { MeetingsPanel } from './meetings-panel';
import { DocsPanel } from './docs-panel';
import { FilesPanel } from './files-panel';
import { GanttPanel } from './gantt-panel';
import { MembersPanel } from './members-panel';
import type { Team, TeamTask } from '@/lib/types';

const TABS = ['dashboard', 'tasks', 'chat', 'meetings', 'docs', 'files', 'gantt', 'members'] as const;
export type WorkspaceTab = (typeof TABS)[number];

const TAB_LABELS: Record<WorkspaceTab, string> = {
  dashboard: '대시보드',
  tasks: '할 일',
  chat: '대화',
  meetings: '회의',
  docs: '문서',
  files: '자료',
  gantt: '간트',
  members: '멤버',
};

/** 브라우저 Notification 권한은 접속 중 1회만 요청한다. */
function useBrowserNotificationPermission(): boolean {
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      setGranted(true);
    } else if (Notification.permission === 'default') {
      void Notification.requestPermission().then((result) => setGranted(result === 'granted'));
    }
  }, []);
  return granted;
}

export function TeamWorkspace({ teamId, initialTab = 'dashboard' }: { teamId: string; initialTab?: WorkspaceTab }) {
  const { uid, profile, status } = useAuth();
  const data = useTeamData(teamId);
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const notifyGranted = useBrowserNotificationPermission();

  const notifications = useMemo(() => {
    if (!data.team) return [];
    const items: DeadlineItem[] = data.tasks
      .filter((t) => t.status !== 'done')
      .map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt.toDate(), status: t.status }));
    return buildNotifications(items, new Date());
  }, [data.team, data.tasks]);

  // 새 단계 알림 발화 — 알림함 + 브라우저 Notification
  const [seen, setSeen] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fresh = notifications.filter((n) => !seen.has(n.id));
    if (fresh.length > 0) {
      setSeen((prev) => new Set([...prev, ...fresh.map((n) => n.id)]));
      if (notifyGranted) {
        for (const n of fresh.slice(0, 2)) {
          new Notification('팀플 원장', { body: n.message });
        }
      }
    }
  }, [notifications, seen, notifyGranted]);

  if (status !== 'ready' || !uid) {
    return <p className="text-muted-foreground p-10 text-center text-sm">들어가는 중…</p>;
  }
  if (data.loading && !data.team) {
    return <p className="text-muted-foreground p-10 text-center text-sm">팀 데이터 불러오는 중…</p>;
  }
  if (!data.team) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm">팀을 찾을 수 없거나 접근 권한이 없어요 (비멤버 읽기는 규칙이 차단합니다).</p>
        <Button asChild variant="link">
          <Link href="/teams">내 팀 목록으로</Link>
        </Button>
      </div>
    );
  }

  const team = data.team as Team;
  const hasAiKey = Boolean(process.env.NEXT_PUBLIC_HAS_AI_KEY);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground text-sm">
            {team.courseLabel} · {team.goal}
            {team.archived ? <Badge variant="secondary" className="ml-2">보관됨 — 읽기 전용</Badge> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="알림함">
                <Bell />
                {notifications.length > 0 ? (
                  <span className="bg-destructive absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] text-white">
                    {notifications.length}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <p className="mb-2 text-sm font-medium">알림함</p>
              {notifications.length === 0 ? (
                <p className="text-muted-foreground text-xs">임박한 마감이 없어요</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {notifications.map((n) => (
                    <li key={n.id} className="text-xs">
                      <Badge variant="secondary">{STAGE_LABEL[n.stage]}</Badge> {n.title}
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>
          <Button asChild variant="ghost">
            <Link href="/teams">내 팀</Link>
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as WorkspaceTab)}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'dashboard' ? <DashboardPanel team={team} events={data.events} tasks={data.tasks as TeamTask[]} profile={profile} /> : null}
      {tab === 'tasks' ? <TasksPanel team={team} tasks={data.tasks} uid={uid} /> : null}
      {tab === 'chat' ? <ChatPanel team={team} messages={data.messages} uid={uid} /> : null}
      {tab === 'meetings' ? <MeetingsPanel team={team} meetings={data.meetings} uid={uid} hasAiKey={hasAiKey} /> : null}
      {tab === 'docs' ? <DocsPanel team={team} docs={data.docs} uid={uid} /> : null}
      {tab === 'files' ? <FilesPanel team={team} files={data.files} uid={uid} teamSizeBytes={0} /> : null}
      {tab === 'gantt' ? <GanttPanel team={team} tasks={data.tasks} /> : null}
      {tab === 'members' ? <MembersPanel team={team} leaderRequests={data.leaderRequests} uid={uid} /> : null}
    </div>
  );
}

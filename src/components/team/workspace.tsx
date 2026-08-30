'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarRange,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  MessagesSquare,
  ScrollText,
  Users,
} from 'lucide-react';
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
import { LogsPanel } from './logs-panel';
import { Tutorial } from './tutorial';
import { SettingsMenu } from './settings-menu';
import { TeamSwitcher } from './team-switcher';
import { Wordmark } from '@/components/wordmark';
import type { Team, TeamTask } from '@/lib/types';

const TABS = ['dashboard', 'tasks', 'chat', 'meetings', 'docs', 'files', 'gantt', 'members', 'logs'] as const;
export type WorkspaceTab = (typeof TABS)[number];

const TAB_LABELS: Record<WorkspaceTab, string> = {
  dashboard: '홈',
  tasks: '할 일',
  chat: '대화',
  meetings: '회의',
  docs: '문서',
  files: '자료',
  gantt: '타임라인',
  members: '멤버',
  logs: '로그',
};

const TAB_ICONS: Record<WorkspaceTab, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  tasks: ListTodo,
  chat: MessagesSquare,
  meetings: ClipboardList,
  docs: FileText,
  files: FolderOpen,
  gantt: CalendarRange,
  members: Users,
  logs: ScrollText,
};

/**
 * 브라우저 알림 권한 — 들어오자마자 묻지 않는다.
 * 알림함을 처음 연 순간에만 요청해야 왜 묻는지가 사용자에게 보인다.
 */
function useBrowserNotificationPermission(): [boolean, () => void] {
  const [granted, setGranted] = useState<boolean>(() =>
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );
  const asked = useRef(false);
  const ask = () => {
    if (asked.current || typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    asked.current = true;
    void Notification.requestPermission().then((result) => setGranted(result === 'granted'));
  };
  return [granted, ask];
}

export function TeamWorkspace({ teamId, initialTab = 'dashboard' }: { teamId: string; initialTab?: WorkspaceTab }) {
  const { uid, status } = useAuth();
  const data = useTeamData(teamId);
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [notifyGranted, askNotifyPermission] = useBrowserNotificationPermission();

  const notifications = useMemo(() => {
    if (!data.team) return [];
    const items: DeadlineItem[] = data.tasks
      .filter((t) => t.status !== 'done')
      .map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt.toDate(), status: t.status }));
    return buildNotifications(items, new Date());
  }, [data.team, data.tasks]);

  // 새 단계 알림 발화 — 알림함 + 브라우저 Notification. 발화 이력은 ref 로 관리한다.
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fresh = notifications.filter((n) => !seen.current.has(n.id));
    if (fresh.length === 0) return;
    seen.current = new Set([...seen.current, ...fresh.map((n) => n.id)]);
    if (notifyGranted) {
      for (const n of fresh.slice(0, 2)) {
        new Notification('Dibs', { body: n.message });
      }
    }
  }, [notifications, notifyGranted]);

  if (status !== 'ready' || !uid) {
    return <p className="text-muted-foreground p-10 text-center text-sm">들어가는 중…</p>;
  }
  if (data.loading && !data.team) {
    return <p className="text-muted-foreground p-10 text-center text-sm">팀 데이터 불러오는 중…</p>;
  }
  if (!data.team) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm">팀을 찾을 수 없거나 접근 권한이 없어요.</p>
        <Button asChild variant="link">
          <Link href="/teams">내 팀 목록으로</Link>
        </Button>
      </div>
    );
  }

  const team = data.team as Team;

  const bell = (
    <Popover onOpenChange={(open) => (open ? askNotifyPermission() : undefined)}>
      <PopoverTrigger asChild>
        <span className="relative inline-flex">
          <Button variant="outline" size="icon" aria-label="알림함">
            <Bell />
          </Button>
          {notifications.length > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 z-10 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-background px-1 text-[10px] leading-none font-semibold tabular-nums">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          ) : null}
        </span>
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
  );

  const navItems = TABS.map((t) => {
    const Icon = TAB_ICONS[t];
    const active = tab === t;
    // 홈은 가장 자주 쓰는 화면이라 크게 둔다
    const home = t === 'dashboard';
    const base = 'flex cursor-pointer items-center rounded-md text-left transition-colors';
    const size = home ? 'gap-3 px-3 py-3 text-base font-semibold' : 'gap-2.5 px-3 py-2 text-sm';
    const tone = active ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted';
    return (
      <button key={t} onClick={() => setTab(t as WorkspaceTab)} className={`${base} ${size} ${tone}`}>
        <Icon className={home ? 'size-5 shrink-0' : 'size-4 shrink-0'} />
        {TAB_LABELS[t]}
      </button>
    );
  });

  return (
    <div className="flex min-h-screen w-full">
      {/* 사이드바 — 데스크톱 전용 */}
      <aside className="bg-card sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r p-3 lg:flex">
        <Link href="/" className="hover:bg-muted rounded-md px-2 py-1.5 text-lg font-bold tracking-tight">
          <Wordmark />
        </Link>
        <div className="mt-4">
          <TeamSwitcher current={team} />
        </div>
        <nav className="mt-4 flex flex-col gap-0.5">{navItems}</nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t pt-3">
          <Link href="/teams" className="hover:bg-muted rounded-md px-3 py-2 text-sm">
            내 팀
          </Link>
          <Link href="/me" className="hover:bg-muted rounded-md px-3 py-2 text-sm">
            내 기록
          </Link>
          <SettingsMenu />
        </div>
      </aside>

      {/* 콘텐츠 — 항상 남은 폭 전체 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{team.name}</h1>
            <p className="text-muted-foreground truncate text-sm">
              {team.courseLabel} · {team.goal}
              {team.archived ? <Badge variant="secondary" className="ml-2">보관됨 — 읽기 전용</Badge> : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bell}
            <Button asChild variant="ghost" className="lg:hidden">
              <Link href="/teams">내 팀</Link>
            </Button>
          </div>
        </header>

        {/* 모바일 팀 전환 + 탭 내비게이션 */}
        <div className="flex flex-col gap-2 border-b px-4 py-2 lg:hidden">
          <TeamSwitcher current={team} />
          <Tabs value={tab} onValueChange={(v) => setTab(v as WorkspaceTab)}>
            <TabsList className="flex w-full flex-wrap">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t} {...(t === 'tasks' ? { id: 'tutorial-tasks-tab' } : {})}>
                  {TAB_LABELS[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Tutorial tab={tab} />

        <main className="w-full flex-1 p-4 lg:px-8 lg:py-6">
          {tab === 'dashboard' ? <DashboardPanel team={team} events={data.events} tasks={data.tasks as TeamTask[]} uid={uid} /> : null}
          {tab === 'tasks' ? <TasksPanel team={team} tasks={data.tasks} uid={uid} /> : null}
          {tab === 'chat' ? <ChatPanel team={team} messages={data.messages} uid={uid} /> : null}
          {tab === 'meetings' ? <MeetingsPanel team={team} meetings={data.meetings} uid={uid} /> : null}
          {tab === 'docs' ? <DocsPanel team={team} docs={data.docs} uid={uid} /> : null}
          {tab === 'files' ? <FilesPanel team={team} files={data.files} uid={uid} teamSizeBytes={0} /> : null}
          {tab === 'gantt' ? <GanttPanel team={team} tasks={data.tasks} events={data.events} uid={uid} /> : null}
          {tab === 'members' ? <MembersPanel team={team} leaderRequests={data.leaderRequests} uid={uid} /> : null}
          {tab === 'logs' ? <LogsPanel team={team} events={data.events} /> : null}
        </main>
      </div>
    </div>
  );
}

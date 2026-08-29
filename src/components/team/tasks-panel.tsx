'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTask, completeTask, reopenTask } from '@/lib/team-ops';
import { formatKST, isOverdue } from '@/lib/time';
import type { Team, TeamTask } from '@/lib/types';

interface TasksPanelProps {
  team: Team;
  tasks: TeamTask[];
  uid: string;
}

/** 할 일 (§2.2-④) — 마감 지난 미완료는 빨강. overdue 이벤트는 존재하지 않는다 (결정 D6). */
export function TasksPanel({ team, tasks, uid }: TasksPanelProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(uid);
  const [due, setDue] = useState('');

  const isLeader = team.leaderUid === uid;

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => (a.status === b.status ? a.order - b.order : a.status === 'done' ? 1 : -1)),
    [tasks],
  );

  const submit = async () => {
    if (!title.trim() || !due) {
      toast.error('제목과 마감을 입력하세요');
      return;
    }
    try {
      await createTask(team.id, uid, {
        title: title.trim(),
        assigneeUid: assignee,
        dueAt: new Date(due),
      });
      setTitle('');
      toast.success('할 일 추가 완료');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '추가 실패');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 할 일</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input placeholder="할 일 제목" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="담당" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(team.members).map(([memberUid, member]) => (
                <SelectItem key={memberUid} value={memberUid}>
                  {member.nickname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="w-56" />
          <Button onClick={() => void submit()}>
            <PlusCircle /> 추가
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            할 일 {tasks.filter((t) => t.status !== 'done').length}건 미완료
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {sorted.map((task) => {
            const overdue = isOverdue(task.dueAt, task.status);
            return (
              <div key={task.id} className="flex items-center gap-3 py-2.5">
                <button
                  className="cursor-pointer"
                  onClick={() => {
                    if (task.status === 'done') {
                      void reopenTask(team.id, uid, task.id);
                    } else {
                      void completeTask(team.id, uid, task).then(() => toast.success('완료 기록 — 원장에 남았어요'));
                    }
                  }}
                  aria-label={task.status === 'done' ? '완료 취소' : '완료'}
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 className="text-primary size-5" />
                  ) : (
                    <Circle className="text-muted-foreground size-5" />
                  )}
                </button>
                <div className="flex flex-1 flex-col">
                  <span className={overdue ? 'text-destructive text-sm font-medium' : 'text-sm'}>
                    {task.title}
                    {overdue ? ' · 마감 경과' : ''}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {team.members[task.assigneeUid]?.nickname ?? '—'} 담당 · 마감 {formatKST(task.dueAt)}
                    {task.doneAt ? ` · 완료 ${formatKST(task.doneAt)}` : ''}
                    {task.milestoneId ? ' · 간트 마일스톤' : ''}
                  </span>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 ? <p className="text-muted-foreground py-6 text-center text-sm">아직 할 일이 없어요</p> : null}
        </CardContent>
      </Card>

      {isLeader ? (
        <p className="text-muted-foreground text-xs">팀장이시군요 — 마감 알림은 내일·3시간·1시간 3단계로 자동 생성됩니다.</p>
      ) : null}
    </div>
  );
}

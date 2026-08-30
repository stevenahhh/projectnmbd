'use client';

import { Fragment, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Circle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { completeTask, createTask, reopenTask } from '@/lib/team-ops';
import { formatKST, isOverdue } from '@/lib/time';
import type { Team, TeamTask } from '@/lib/types';

interface TasksPanelProps {
  team: Team;
  tasks: TeamTask[];
  uid: string;
}

/** 마감 표기 — 지남/오늘/D-n. 마감 경과는 저장이 아니라 화면에서 계산한다. */
function dueBadge(task: TeamTask, now: Date) {
  const due = task.dueAt.toDate();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (task.status === 'done') return null;
  if (due.getTime() < now.getTime()) return <Badge variant="destructive">마감 지남</Badge>;
  if (diffDays <= 0) return <Badge variant="destructive">오늘 마감</Badge>;
  if (diffDays <= 2) return <Badge>D-{diffDays}</Badge>;
  return <Badge variant="secondary">D-{diffDays}</Badge>;
}

/** 마감 입력 보조 — 학생 할 일은 대개 오늘·내일·이번 주 금요일·팀 마감이다. */
const DUE_PRESETS: { label: string; value: (now: Date, teamDue: Date) => string }[] = [
  { label: '오늘', value: (now) => endOfDay(now) },
  { label: '내일', value: (now) => endOfDay(addDays(now, 1)) },
  { label: '이번 주 금요일', value: (now) => endOfDay(addDays(now, (5 - now.getDay() + 7) % 7 || 7)) },
  { label: '팀 마감일', value: (_now, teamDue) => endOfDay(teamDue) },
];

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** datetime-local 값은 로컬 시각 문자열이라 ISO 를 쓸 수 없다. */
function endOfDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T23:59`;
}

export function TasksPanel({ team, tasks, uid }: TasksPanelProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assignee, setAssignee] = useState(uid);
  const [due, setDue] = useState('');
  const [doneOpen, setDoneOpen] = useState(false);
  const [now] = useState(() => new Date());

  const { todo, done } = useMemo(() => {
    const byDue = (a: TeamTask, b: TeamTask) => a.dueAt.toDate().getTime() - b.dueAt.toDate().getTime();
    return {
      todo: tasks.filter((t) => t.status !== 'done').sort(byDue),
      done: tasks.filter((t) => t.status === 'done').sort(byDue).reverse(),
    };
  }, [tasks]);

  const overdueCount = todo.filter((t) => isOverdue(t.dueAt, t.status, now)).length;

  const submit = async () => {
    if (!title.trim() || !due) {
      toast.error('제목과 마감을 입력해주세요');
      return;
    }
    try {
      await createTask(team.id, uid, {
        title: title.trim(),
        desc: desc.trim(),
        assigneeUid: assignee,
        dueAt: new Date(due),
      });
      setTitle('');
      setDesc('');
      setDue('');
      setOpen(false);
      toast.success('할 일을 추가했어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '추가하지 못했어요');
    }
  };

  // 실패를 삼키지 않는다 — 권한·네트워크 오류가 조용히 사라지면 눌렀는지조차 알 수 없다.
  const toggle = async (task: TeamTask, completed: boolean) => {
    try {
      if (completed) {
        await reopenTask(team.id, uid, task.id);
        toast.success('다시 진행 중으로 되돌렸어요');
      } else {
        await completeTask(team.id, uid, task);
        toast.success('완료로 표시했어요');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '바꾸지 못했어요');
    }
  };

  const row = (task: TeamTask) => {
    const assigneeName = team.members[task.assigneeUid]?.nickname ?? '담당 없음';
    const completed = task.status === 'done';
    return (
      <div className="hover:bg-muted/60 flex items-start gap-3 rounded-md px-3 py-3 transition-colors">
        <button
          className="mt-0.5 cursor-pointer"
          aria-label={completed ? '완료 취소' : '완료로 표시'}
          onClick={() => void toggle(task, completed)}
        >
          {completed ? <CheckCircle2 className="text-primary size-5" /> : <Circle className="text-muted-foreground size-5" />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={completed ? 'text-muted-foreground text-sm line-through' : 'text-sm font-medium'}>{task.title}</span>
            {dueBadge(task, now)}
            {task.milestoneId ? <Badge variant="outline">마일스톤</Badge> : null}
          </div>
          {task.desc ? <p className="text-muted-foreground text-xs">{task.desc}</p> : null}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5">{assigneeName}</span>
            <span>마감 {formatKST(task.dueAt)}</span>
            {task.doneAt ? <span>완료 {formatKST(task.doneAt)}</span> : null}
          </div>
        </div>
      </div>
    );
  };

  const rows = (list: TeamTask[]) =>
    list.map((task, index) => (
      <Fragment key={task.id}>
        {index > 0 ? <Separator /> : null}
        {row(task)}
      </Fragment>
    ));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-base font-semibold">할 일</span>
          <Badge variant="secondary">진행 중 {todo.length}</Badge>
          {overdueCount > 0 ? <Badge variant="destructive">마감 지남 {overdueCount}</Badge> : null}
          <Badge variant="outline">완료 {done.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button id="tut-task-add">
              <Plus /> 할 일 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 할 일</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-title">무엇을 하나요?</Label>
                <Input
                  id="t-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 발표자료 3장까지 초안"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="t-assignee">담당</Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger id="t-assignee" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(team.members).map(([memberUid, member]) => (
                        <SelectItem key={memberUid} value={memberUid}>
                          {member.nickname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="t-due">마감</Label>
                  <Input id="t-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
                  <div className="flex flex-wrap gap-1">
                    {DUE_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => setDue(preset.value(now, team.dueAt.toDate()))}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-desc">설명 (선택)</Label>
                <Textarea id="t-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => void submit()}>추가</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card id="tut-task-todo">
        <CardHeader>
          <CardTitle className="text-base">진행 중</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col px-2">
          {rows(todo)}
          {todo.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">진행 중인 할 일이 없어요</p>
          ) : null}
        </CardContent>
      </Card>

      {done.length > 0 ? (
        <Card id="tut-task-done">
          <CardHeader className="py-0">
            <button
              onClick={() => setDoneOpen((v) => !v)}
              aria-expanded={doneOpen}
              className="hover:bg-muted/60 -mx-2 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left transition-colors"
            >
              <ChevronDown className={`size-4 transition-transform ${doneOpen ? '' : '-rotate-90'}`} />
              <CardTitle className="text-muted-foreground text-base">완료 {done.length}</CardTitle>
            </button>
          </CardHeader>
          {doneOpen ? <CardContent className="flex flex-col px-2">{rows(done)}</CardContent> : null}
        </Card>
      ) : null}
    </div>
  );
}

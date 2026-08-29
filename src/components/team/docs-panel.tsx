'use client';

import { useEffect, useState } from 'react';
import { FileText, Lock, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createTeamDoc, saveTeamDoc, setDocLock } from '@/lib/team-ops';
import type { Team, TeamDoc } from '@/lib/types';

interface DocsPanelProps {
  team: Team;
  docs: TeamDoc[];
  uid: string;
}

/**
 * 문서 (§2.2-②) — 마크다운, 동시편집 없음·잠금 표시.
 * 저장 1회 = versions 1개(create-only) + doc.edit 이벤트 1건 (S8).
 */
export function DocsPanel({ team, docs, uid }: DocsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 잠금 해제 — 편집 화면을 떠날 때
  useEffect(() => {
    return () => {
      if (selectedId) {
        void setDocLock(team.id, selectedId, null).catch(() => undefined);
      }
    };
  }, [selectedId, team.id]);

  const openDoc = async (doc: TeamDoc) => {
    setSelectedId(doc.id);
    try {
      await setDocLock(team.id, doc.id, uid);
    } catch {
      // 잠금 표시 실패는 편집을 막지 않는다
    }
  };

  const selected = docs.find((d) => d.id === selectedId) ?? null;
  const lockedByOther = Boolean(selected?.lockedBy) && selected!.lockedBy !== uid;
  // 임시 원고는 문서 id 별로 관리 — 선택 변경 이펙트에서 setState 하는 패턴을 피한다
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const draft = selected ? (drafts[selected.id] ?? selected.body) : '';
  const setDraft = (value: string) => {
    if (!selected) return;
    setDrafts((prev) => ({ ...prev, [selected.id]: value }));
  };

  const save = async () => {
    if (!selected) return;
    try {
      await saveTeamDoc(team.id, uid, selected, draft);
      toast.success(`버전 ${selected.latestVersion + 1} 저장 — 누가·언제·몇 자 남았어요`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  const create = async () => {
    if (!newTitle.trim()) {
      toast.error('문서 제목을 입력하세요');
      return;
    }
    try {
      const id = await createTeamDoc(team.id, uid, newTitle.trim(), `# ${newTitle.trim()}\n\n`);
      setSelectedId(id);
      setCreating(false);
      setNewTitle('');
      toast.success('문서 생성 — 첫 버전이 기록됐어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '생성 실패');
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <Card className="h-fit">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">문서 {docs.length}개</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCreating((v) => !v)}>
            <Plus /> 새 문서
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {creating ? (
            <div className="mb-2 flex gap-1.5">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="제목" />
              <Button size="sm" onClick={() => void create()}>
                생성
              </Button>
            </div>
          ) : null}
          {docs.map((doc) => (
            <button
              key={doc.id}
              className={
                doc.id === selectedId
                  ? 'bg-secondary flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium'
                  : 'hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm'
              }
              onClick={() => void openDoc(doc)}
            >
              <FileText className="size-4 shrink-0" />
              <span className="flex-1 truncate">{doc.title}</span>
              {doc.lockedBy && doc.lockedBy !== uid ? <Lock className="text-muted-foreground size-3.5" /> : null}
            </button>
          ))}
          {docs.length === 0 ? <p className="text-muted-foreground text-sm">저장할 때마다 버전이 쌓여요</p> : null}
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{selected.title}</CardTitle>
              <Button size="sm" onClick={() => void save()} disabled={Boolean(lockedByOther)}>
                <Save /> 저장 (버전 {selected.latestVersion + 1})
              </Button>
            </div>
            {lockedByOther ? (
              <p className="text-destructive flex items-center gap-1 text-xs">
                <Lock className="size-3" /> {team.members[selected.lockedBy!]?.nickname ?? '다른 사람'}님이 편집 중입니다 — 동시편집 없음
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                최신 버전 {selected.latestVersion} · 저장할 때마다 누가·언제·몇 자가 기록됩니다
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={18} disabled={Boolean(lockedByOther)} className="font-mono text-sm" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground flex h-full items-center justify-center py-24 text-sm">
            왼쪽에서 문서를 선택하세요
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { FileText, History, Lock, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RichEditor } from '@/components/ui/rich-editor';
import { getDb } from '@/lib/firebase/client';
import { createTeamDoc, saveTeamDoc, setDocLock } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import type { DocVersion, Team, TeamDoc } from '@/lib/types';

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
  const [versionState, setVersionState] = useState<{ docId: string | null; list: DocVersion[] }>({ docId: null, list: [] });
  const [preview, setPreview] = useState<DocVersion | null>(null);

  // 선택한 문서의 이전 버전 목록 — 팀 스코프 구독
  useEffect(() => {
    if (!selectedId) return;
    const unsub = onSnapshot(
      query(collection(getDb(), 'teams', team.id, 'docs', selectedId, 'versions'), orderBy('version', 'desc')),
      (snap) =>
        setVersionState({
          docId: selectedId,
          list: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DocVersion, 'id'>) })),
        }),
      () => setVersionState({ docId: selectedId, list: [] }),
    );
    return () => unsub();
  }, [selectedId, team.id]);

  // 다른 문서를 고른 직후에는 이전 문서의 버전을 보여주지 않는다
  const versions = versionState.docId === selectedId ? versionState.list : [];

  const draft = selected ? (drafts[selected.id] ?? selected.body) : '';
  const setDraft = (value: string) => {
    if (!selected) return;
    setDrafts((prev) => ({ ...prev, [selected.id]: value }));
  };

  const save = async () => {
    if (!selected) return;
    try {
      await saveTeamDoc(team.id, uid, selected, draft);
      toast.success(`버전 ${selected.latestVersion + 1}로 저장했어요`);
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
      toast.success('문서를 만들었어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '생성 실패');
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <Card id="tut-doc-list" className="h-fit">
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
              <Button id="tut-doc-save" size="sm" onClick={() => void save()} disabled={Boolean(lockedByOther)}>
                <Save /> 저장 (버전 {selected.latestVersion + 1})
              </Button>
            </div>
            {lockedByOther ? (
              <p className="text-destructive flex items-center gap-1 text-xs">
                <Lock className="size-3" /> {team.members[selected.lockedBy!]?.nickname ?? '다른 사람'}님이 편집 중이에요
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">최신 버전 {selected.latestVersion}</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RichEditor
              ariaLabel="문서 내용"
              value={draft}
              onChange={setDraft}
              editable={!lockedByOther}
              placeholder="내용을 적어주세요"
            />

            <div id="tut-doc-versions" className="flex flex-col gap-1.5">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <History className="size-4" /> 이전 버전 {versions.length}개
              </p>
              <div className="flex flex-col divide-y rounded-md border">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setPreview(v)}
                    className="hover:bg-muted flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-xs"
                  >
                    <span className="font-medium">버전 {v.version}</span>
                    <span className="text-muted-foreground flex-1 truncate">
                      {team.members[v.actorUid]?.nickname ?? '알 수 없음'} · {formatKST(v.at)}
                    </span>
                    <span className={v.charsDelta >= 0 ? 'text-primary tabular-nums' : 'text-muted-foreground tabular-nums'}>
                      {v.charsDelta >= 0 ? '+' : ''}
                      {v.charsDelta.toLocaleString()}자
                    </span>
                  </button>
                ))}
                {versions.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-4 text-center text-xs">아직 저장된 버전이 없어요</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground flex h-full items-center justify-center py-24 text-sm">
            왼쪽에서 문서를 선택하세요
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => (!open ? setPreview(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.title} · 버전 {preview?.version}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-xs">
            {preview ? `${team.members[preview.actorUid]?.nickname ?? '알 수 없음'} · ${formatKST(preview.at)}` : ''}
          </p>
          <pre className="bg-muted max-h-[55vh] overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">{preview?.body}</pre>
          {preview && !lockedByOther ? (
            <Button
              variant="outline"
              onClick={() => {
                setDraft(preview.body);
                setPreview(null);
                toast.success(`버전 ${preview.version} 내용을 편집기로 불러왔어요 — 저장하면 새 버전이 됩니다`);
              }}
            >
              이 버전 내용 불러오기
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

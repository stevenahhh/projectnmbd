'use client';

import { useRef, useState } from 'react';
import { FileImage, FileText, MessageSquare, Upload } from 'lucide-react';
import { put } from '@vercel/blob/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { commentOnFile, registerFile } from '@/lib/team-ops';
import { formatKST } from '@/lib/time';
import { MAX_FILE_BYTES } from '@/lib/types';
import type { Team, TeamFile } from '@/lib/types';

interface FilesPanelProps {
  team: Team;
  files: TeamFile[];
  uid: string;
  teamSizeBytes: number;
}

/** 자료 (§2.2-③) — Vercel Blob. 개별 삭제 없음. 이미지는 렌더, PDF는 iframe, 그 외는 아이콘+메타. */
export function FilesPanel({ team, files, uid }: FilesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState<TeamFile | null>(null);
  const [commentText, setCommentText] = useState('');

  const upload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('파일을 선택하세요');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('파일당 10MB 까지 업로드할 수 있어요');
      return;
    }
    setUploading(true);
    try {
      const auth = (await import('firebase/auth')).getAuth();
      const idToken = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/blob-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ teamId: team.id, sizeBytes: file.size, fileName: file.name }),
      });
      const data = (await res.json()) as { clientToken?: string; pathname?: string; error?: string };
      if (!res.ok || !data.clientToken || !data.pathname) {
        throw new Error(data.error ?? '토큰 발급 실패');
      }
      const blob = await put(data.pathname, file, { access: 'public', token: data.clientToken, multipart: true });
      await registerFile(team.id, uid, {
        name: file.name,
        blobUrl: blob.url,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        caption: caption.trim(),
      });
      setOpen(false);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('업로드 완료 — 기록이 남았어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const submitComment = async () => {
    if (!commentTarget || !commentText.trim()) return;
    try {
      await commentOnFile(team.id, uid, commentTarget.id, commentText.trim());
      setCommentTarget(null);
      setCommentText('');
      toast.success('첨삭 기록 — 삭제 경로는 없어요');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '첨삭 실패');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">파일당 10MB · 팀당 200MB · 개별 삭제 없음</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload /> 업로드
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>파일 업로드</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="f-file">파일</Label>
                <Input id="f-file" type="file" ref={fileInputRef} />
              </div>
              <div>
                <Label htmlFor="f-caption">설명 한 줄</Label>
                <Input id="f-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="예: 발표자료 v1 — 첨삭 부탁드려요" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => void upload()} disabled={uploading}>
                {uploading ? '업로드 중…' : '업로드'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {files.map((file) => (
          <Card key={file.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                {file.contentType.startsWith('image/') ? <FileImage className="size-4" /> : <FileText className="size-4" />}
                {file.name}
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                {(file.sizeBytes / 1024 / 1024).toFixed(1)}MB · {team.members[file.actorUid]?.nickname ?? '—'} · {formatKST(file.uploadedAt)}
                {file.caption ? ` · ${file.caption}` : ''}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {file.blobUrl && file.contentType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.blobUrl} alt={file.name} className="max-h-52 w-full rounded-md object-contain" />
              ) : file.blobUrl && file.contentType === 'application/pdf' ? (
                <iframe src={file.blobUrl} title={file.name} className="h-52 w-full rounded-md border" />
              ) : (
                <div className="bg-muted text-muted-foreground flex h-20 items-center justify-center rounded-md text-xs">
                  미리보기 없음 — 아이콘+메타
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => setCommentTarget(file)}>
                <MessageSquare /> 첨삭
              </Button>
            </CardContent>
          </Card>
        ))}
        {files.length === 0 ? <p className="text-muted-foreground py-8 text-center text-sm md:col-span-2">아직 자료가 없어요</p> : null}
      </div>

      <Dialog open={Boolean(commentTarget)} onOpenChange={(v) => (!v ? setCommentTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>첨삭 — {commentTarget?.name}</DialogTitle>
          </DialogHeader>
          <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="첨삭 내용" />
          <DialogFooter>
            <Button onClick={() => void submitComment()}>첨삭 남기기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

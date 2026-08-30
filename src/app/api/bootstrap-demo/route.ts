/**
 * api/bootstrap-demo — 방문자별 데모 복제 (G2). 프로젝트 전체에서 유일한
 * firebase-admin 사용처다 (C4). 서비스 계정 키는 서버 전용 env — 클라이언트 번들 금지.
 *
 * 근거: events 의 at == request.time 규칙과 「한 달 전 기록」은 논리적으로 양립 불가.
 * Admin SDK 외 대안이 없고, 이 한 곳이 사용자 승인 예외다.
 * 멱등 — 이미 부트스트랩된 uid 면 스킵. 실패 시 클라이언트는 빈 팀 fallback 으로 진입한다.
 */
import { NextResponse } from 'next/server';
import { loadAdmin, initAdmin } from '@/lib/server/admin';
import { verifyIdTokenUid } from '@/lib/server/verify-id-token';
import { buildDemoDataset, estimateDemoWrites, DEMO_DATASET_WRITE_CAP, type DemoDataset } from '@/lib/demo-dataset';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Firestore 단일 배치는 500건 상한 — 450건 단위로 커밋한다.
 * Admin SDK 쓰기는 규칙을 통과하지 않는다(스모크테스트가 별도인 이유 — 태스크 16).
 */
class BatchWriter {
  private batch: import('firebase-admin/firestore').WriteBatch;
  private count = 0;
  private committed = 0;

  constructor(private db: import('firebase-admin/firestore').Firestore) {
    this.batch = db.batch();
  }

  set(ref: import('firebase-admin/firestore').DocumentReference, data: unknown) {
    this.batch.set(ref, data as FirebaseFirestore.DocumentData);
    if (++this.count >= 450) this.flush();
  }

  flush(): Promise<void>[] {
    if (this.count === 0) return [];
    const flushed = this.count;   // 카운터는 리셋 전에 캡처 — 리셋 후 참조하면 0이 더해진다
    const promise = this.batch.commit().then(() => {
      this.committed += flushed;
    });
    this.batch = this.db.batch();
    this.count = 0;
    return [promise];
  }

  get total() {
    return this.committed;
  }
}

async function writeDataset(db: import('firebase-admin/firestore').Firestore, dataset: DemoDataset): Promise<number> {
  const writer = new BatchWriter(db);
  const teamRef = db.collection('teams').doc(dataset.teamId);
  const archiveRef = db.collection('teams').doc(dataset.archivedTeamId);

  writer.set(teamRef, dataset.team);
  writer.set(archiveRef, dataset.archivedTeam);

  for (const e of dataset.events) writer.set(teamRef.collection('events').doc(), e);
  for (const m of dataset.messages) writer.set(teamRef.collection('messages').doc(), m);
  for (const { id, ...task } of dataset.tasks) writer.set(teamRef.collection('tasks').doc(id), task);
  for (const { id, ...meeting } of dataset.meetings) writer.set(teamRef.collection('meetings').doc(id), meeting);
  await Promise.all(writer.flush());

  // 파일 문서를 먼저 만들어 id 확보 → 첨삭 댓글이 그 하위로 들어간다
  const fileRefs: import('firebase-admin/firestore').DocumentReference[] = [];
  for (const f of dataset.files) {
    const ref = teamRef.collection('files').doc();
    fileRefs.push(ref);
    writer.set(ref, f);
  }
  await Promise.all(writer.flush());

  for (const c of dataset.fileComments) {
    writer.set(fileRefs[c.fileIndex].collection('comments').doc(), {
      actorUid: c.actorUid,
      text: c.text,
      at: c.at,
    });
  }

  for (const d of dataset.docs) {
    const docRef = teamRef.collection('docs').doc();
    writer.set(docRef, {
      title: d.title,
      latestVersion: d.versions.length,
      body: d.versions[d.versions.length - 1].body,
      lockedBy: null,
      lockedAt: null,
    });
    for (const v of d.versions) writer.set(docRef.collection('versions').doc(), v);
  }
  await Promise.all(writer.flush());

  return writer.total;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    const { app, firestore } = await loadAdmin();
    initAdmin(app);
    const db = firestore.getFirestore();
    const uid = await verifyIdTokenUid(idToken);
    if (!uid) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const data = userSnap.data() ?? {};
      // 멱등 — 이미 데모 팀이 있는 uid 면 스킵 (같은 uid 재호출 시 문서 수 불변)
      if (data.demoBootstrappedAt) {
        const teams = Object.keys((data.teams as Record<string, string>) ?? {});
        const existing = teams.find((t) => t.startsWith('demo-') && !t.includes('archive')) ?? null;
        return NextResponse.json({ ok: true, skipped: true, teamId: existing });
      }
    }

    const dataset = buildDemoDataset(uid, new Date());
    const estimated = estimateDemoWrites(dataset);
    if (estimated > DEMO_DATASET_WRITE_CAP) {
      return NextResponse.json(
        { error: `demo dataset exceeds write cap: ${estimated} > ${DEMO_DATASET_WRITE_CAP}` },
        { status: 500 },
      );
    }

    const written = await writeDataset(db, dataset);

    // admin SDK 는 set() 의 점 표기 키를 리터럴 필드명으로 저장한다 (웹 SDK 와 다름).
    // 기존 teams 맵을 읽어 병합한 뒤 통째로 기록한다.
    const currentTeams = (userSnap.data()?.teams as Record<string, string> | undefined) ?? {};
    await userRef.set(
      {
        teams: {
          ...currentTeams,
          [dataset.teamId]: '팀장',
          [dataset.archivedTeamId]: '팀장',
        },
        demoBootstrappedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, skipped: false, teamId: dataset.teamId, writes: written });
  } catch (error) {
    console.error('bootstrap-demo failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'bootstrap failed' },
      { status: 500 },
    );
  }
}

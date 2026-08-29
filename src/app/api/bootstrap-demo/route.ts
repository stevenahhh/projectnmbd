/**
 * api/bootstrap-demo — 방문자별 데모 복제 (G2). 프로젝트 전체에서 유일한
 * firebase-admin 사용처다 (C4). 서비스 계정 키는 서버 전용 env — 클라이언트 번들 금지.
 *
 * 근거: events 의 at == request.time 규칙과 「한 달 전 기록」은 논리적으로 양립 불가.
 * Admin SDK 외 대안이 없고, 이 한 곳이 사용자 승인 예외다.
 * 멱등 — 이미 부트스트랩된 uid 면 스킵. 실패 시 클라이언트는 빈 팀 fallback 으로 진입한다.
 */
import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { FieldValue, getFirestore, type WriteBatch, type DocumentReference } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { buildDemoDataset, estimateDemoWrites, DEMO_DATASET_WRITE_CAP, type DemoDataset } from '@/lib/demo-dataset';

export const runtime = 'nodejs';
export const maxDuration = 60;

let adminApp: App | null = null;

function initAdmin(): App {
  if (adminApp) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 설정되지 않았다');
  adminApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(raw)) });
  return adminApp;
}

/**
 * Firestore 단일 배치는 500건 상한 — 450건 단위로 커밋한다.
 * Admin SDK 쓰기는 규칙을 통과하지 않는다(스모크테스트가 별도인 이유 — 태스크 16).
 */
class BatchWriter {
  private batch: WriteBatch;
  private count = 0;
  private committed = 0;

  constructor(private db: FirebaseFirestore.Firestore) {
    this.batch = db.batch();
  }

  set(ref: DocumentReference, data: unknown) {
    this.batch.set(ref, data as FirebaseFirestore.DocumentData);
    if (++this.count >= 450) this.flush();
  }

  flush(): Promise<void>[] {
    if (this.count === 0) return [];
    const promise = this.batch.commit().then(() => {
      this.committed += this.count;
    });
    this.batch = this.db.batch();
    this.count = 0;
    return [promise];
  }

  get total() {
    return this.committed;
  }
}

async function writeDataset(db: FirebaseFirestore.Firestore, dataset: DemoDataset): Promise<number> {
  const writer = new BatchWriter(db);
  const teamRef = db.collection('teams').doc(dataset.teamId);
  const archiveRef = db.collection('teams').doc(dataset.archivedTeamId);

  writer.set(teamRef, dataset.team);
  writer.set(archiveRef, dataset.archivedTeam);

  for (const e of dataset.events) writer.set(teamRef.collection('events').doc(), e);
  for (const m of dataset.messages) writer.set(teamRef.collection('messages').doc(), m);
  for (const t of dataset.tasks) writer.set(teamRef.collection('tasks').doc(), t);
  for (const m of dataset.meetings) writer.set(teamRef.collection('meetings').doc(), m);
  await Promise.all(writer.flush());

  // 파일 문서를 먼저 만들어 id 확보 → 첨삭 댓글이 그 하위로 들어간다
  const fileRefs: DocumentReference[] = [];
  for (const f of dataset.files) {
    const ref = teamRef.collection('files').doc();
    fileRefs.push(ref);
    writer.set(ref, f);
  }
  await Promise.all(writer.flush());

  for (const [i, c] of dataset.fileComments.entries()) {
    writer.set(fileRefs[i].collection('comments').doc(), {
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
    const app = initAdmin();
    let uid: string;
    try {
      uid = (await getAuth(app).verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const db = getFirestore(app);
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const data = userSnap.data() ?? {};
      // 멱등 — 이미 데모 팀이 있는 uid 면 스킵 (같은 uid 재호출 시 문서 수 불변)
      if (data.demoBootstrappedAt) {
        const existing = Object.keys((data.teams as Record<string, string>) ?? {}).find((t) => t.startsWith('demo-'));
        return NextResponse.json({ ok: true, skipped: true, teamId: existing ?? null });
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

    await userRef.set(
      {
        [`teams.${dataset.teamId}`]: '팀장',
        [`teams.${dataset.archivedTeamId}`]: '팀장',
        demoBootstrappedAt: FieldValue.serverTimestamp(),
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

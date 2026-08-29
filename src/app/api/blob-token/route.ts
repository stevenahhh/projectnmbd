/**
 * api/blob-token — 파일 업로드 게이트 (G5).
 * 멤버 검증 후 Vercel Blob client token 을 발급한다. BLOB_READ_WRITE_TOKEN 은 서버 전용 (C2).
 * 상한: 파일당 10MB·팀당 200MB — Blob 초과 시 과금이 아니라 30일 정지라 코드에서 원천 차단.
 */
import { NextResponse } from 'next/server';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { MAX_FILE_BYTES, MAX_TEAM_BYTES } from '@/lib/types';

export const runtime = 'nodejs';

let adminApp: App | null = null;

function initAdmin(): App {
  if (adminApp) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 설정되지 않았다');
  adminApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(raw)) });
  return adminApp;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const app = initAdmin();
    let uid: string;
    try {
      uid = (await getAuth(app).verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const body = (await request.json()) as { teamId?: string; sizeBytes?: number; fileName?: string };
    const { teamId, sizeBytes, fileName } = body;
    if (!teamId || typeof sizeBytes !== 'number' || !fileName) {
      return NextResponse.json({ error: 'teamId·sizeBytes·fileName 필요' }, { status: 400 });
    }

    // 비멤버 403 — 규칙과 동일 계약을 서버 경계에서도 강제
    const teamSnap = await getFirestore(app).collection('teams').doc(teamId).get();
    if (!teamSnap.exists) return NextResponse.json({ error: 'team not found' }, { status: 404 });
    const team = teamSnap.data()!;
    if (!(uid in (team.members ?? {}))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (sizeBytes > MAX_FILE_BYTES) {
      return NextResponse.json({ error: '파일당 10MB 까지 업로드할 수 있어요' }, { status: 413 });
    }

    // 팀 총량 확인 — files 하위 sizeBytes 합산
    const filesSnap = await getFirestore(app).collection('teams').doc(teamId).collection('files').get();
    const totalBytes = filesSnap.docs.reduce((sum, d) => sum + ((d.data().sizeBytes as number) ?? 0), 0);
    if (totalBytes + sizeBytes > MAX_TEAM_BYTES) {
      return NextResponse.json({ error: '팀 자료 용량 200MB 를 초과했어요' }, { status: 413 });
    }

    const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!readWriteToken) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN 미설정' }, { status: 500 });
    }

    // 팀 스코프 경로로 한정된 클라이언트 토큰 발급 — pathname 은 서버가 결정한다
    const safeName = fileName.replace(/[/\\?%*:|"<>\s]+/g, '_').slice(-120);
    const pathname = `teams/${teamId}/${crypto.randomUUID()}/${safeName}`;
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: readWriteToken,
      pathname,
      maximumSizeInBytes: MAX_FILE_BYTES,
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, clientToken, pathname });
  } catch (error) {
    console.error('blob-token failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'token issuance failed' },
      { status: 500 },
    );
  }
}

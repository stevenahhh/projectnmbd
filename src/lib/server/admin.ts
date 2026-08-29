/**
 * firebase-admin 서버 로더 — 두 API 라우트가 유일한 사용처 (C4).
 *
 * Turbopack 외부화 모드에서 CJS 서브패스(firebase-admin/firestore 등)의 정적 named
 * import 가 런타임에 undefined 로 풀리는 인터롭 문제가 있다. dynamic import 의
 * module.exports 를 default 폴백과 함께 풀어 실제 네임스페이스를 얻는다.
 * admin/auth 는 의도적으로 로드하지 않는다 — jwks-rsa→jose(ESM) 체인이
 * 서버리스 런타임의 require(ESM) 미지원으로 콜드스타트를 죽인다.
 */
import type * as AppModule from 'firebase-admin/app';
import type * as FirestoreModule from 'firebase-admin/firestore';

type AppNamespace = typeof AppModule;
type FirestoreNamespace = typeof FirestoreModule;

let appNs: AppNamespace | null = null;
let firestoreNs: FirestoreNamespace | null = null;

function unwrap<T>(mod: T): T {
  const candidate = mod as unknown as { default?: T };
  return candidate.default ?? mod;
}

export async function loadAdmin(): Promise<{ app: AppNamespace; firestore: FirestoreNamespace }> {
  if (!appNs || !firestoreNs) {
    const [app, firestore] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/firestore'),
    ]);
    appNs = unwrap(app);
    firestoreNs = unwrap(firestore);
  }
  return { app: appNs, firestore: firestoreNs };
}

let initialized = false;

/** 서비스 계정으로 Admin 앱을 초기화한다 — 이미 초기화됐으면 무시(멱등). */
export function initAdmin(app: AppNamespace): void {
  if (initialized) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 설정되지 않았다');
  if (app.getApps().length) {
    initialized = true;
    return;
  }
  app.initializeApp({ credential: app.cert(JSON.parse(raw)) });
  initialized = true;
}

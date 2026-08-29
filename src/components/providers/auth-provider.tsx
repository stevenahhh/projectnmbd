'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/types';

type AuthStatus = 'loading' | 'ready';

interface AuthState {
  status: AuthStatus;
  uid: string | null;
  profile: UserProfile | null;
  bootstrapState: 'idle' | 'running' | 'done' | 'failed';
}

interface AuthActions {
  saveProfile: (partial: Partial<UserProfile> & { nickname: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  triggerBootstrap: () => Promise<{ teamId: string | null; skipped: boolean }>;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

/**
 * G1 — 로그인 화면 없음. 첫 방문이면 Anonymous Auth 로 uid 를 발급하고,
 * users/{uid} 문서와 데모 팀 복제(bootstrap-demo)가 뒤따른다.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', uid: null, profile: null, bootstrapState: 'idle' });
  const bootstrapRan = useRef(false);

  const refreshProfile = useCallback(async () => {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const snap = await getDoc(doc(getDb(), 'users', uid));
    const profile = snap.exists() ? (snap.data() as UserProfile) : null;
    setState((prev) => ({ ...prev, profile }));
  }, []);

  const saveProfile = useCallback(
    async (partial: Partial<UserProfile> & { nickname: string }) => {
      const auth = getFirebaseAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('로그인 상태가 아닙니다');
      await setDoc(
        doc(getDb(), 'users', uid),
        { ...partial, createdAt: serverTimestamp() },
        { merge: true },
      );
      await refreshProfile();
    },
    [refreshProfile],
  );

  const triggerBootstrap = useCallback(async () => {
    const auth = getFirebaseAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return { teamId: null, skipped: false };
    setState((prev) => ({ ...prev, bootstrapState: 'running' }));
    try {
      const idToken = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/bootstrap-demo', {
        method: 'POST',
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`bootstrap ${res.status}`);
      const data = (await res.json()) as { teamId: string | null; skipped: boolean };
      await refreshProfile();
      setState((prev) => ({ ...prev, bootstrapState: 'done' }));
      return { teamId: data.teamId, skipped: data.skipped };
    } catch {
      // 빈 팀 fallback — 방문자는 직접 팀을 만들어 정상 진입한다 (Spark 쓰기 한도 방어).
      setState((prev) => ({ ...prev, bootstrapState: 'failed' }));
      return { teamId: null, skipped: false };
    }
  }, [refreshProfile]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    setPersistence(auth, browserLocalPersistence).catch(() => undefined);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await signInAnonymously(auth).catch(() => undefined);
        return;
      }
      const snap = await getDoc(doc(getDb(), 'users', user.uid)).catch(() => null);
      const profile = snap && snap.exists() ? (snap.data() as UserProfile) : null;
      setState({ status: 'ready', uid: user.uid, profile, bootstrapState: 'idle' });
    });
    return () => unsub();
  }, []);

  // 온보딩(닉네임)이 끝난 뒤 1회 — 서버가 멱등 보장하므로 재호출은 스킵된다.
  useEffect(() => {
    if (bootstrapRan.current) return;
    if (state.status !== 'ready' || !state.profile?.nickname) return;
    if (state.profile.demoBootstrappedAt) {
      bootstrapRan.current = true;
      return;
    }
    if (state.profile.teams && Object.keys(state.profile.teams).length > 0) {
      bootstrapRan.current = true;
      return;
    }
    bootstrapRan.current = true;
    // 이펙트 안에서 동기 setState 를 유발하지 않도록 다음 틱으로 미룬다
    const timer = setTimeout(() => void triggerBootstrap(), 0);
    return () => clearTimeout(timer);
  }, [state.status, state.profile, triggerBootstrap]);

  return <AuthContext.Provider value={{ ...state, saveProfile, refreshProfile, triggerBootstrap }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 쓴다');
  return ctx;
}

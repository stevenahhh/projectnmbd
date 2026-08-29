/**
 * ID 토큰 검증 — firebase-admin/auth 를 쓰지 않는다.
 *
 * admin/auth 는 jwks-rsa → jose(ESM-only) 체인을 끌어오는데, Vercel 서버리스
 * 런타임에서 require(ESM) 미지원으로 콜드스타트가 죽는다. 대신 Google
 * identitytoolkit accounts:lookup 을 직접 호출한다 — 유효하지 않은 토큰은
 * Google 이 서명 검증에서 거절하므로 신뢰 경계는 동일하다 (비용: 1 RTT).
 */
export async function verifyIdTokenUid(idToken: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { localId?: string }[] };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

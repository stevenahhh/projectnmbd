# F7 — A.13 체크리스트 전수 (2026-08-30 기준)

> 원칙: 미도달 항목은 「미도달(사용자 게이트)」로 명시한다 — 숨김 없음.
> 사용자 게이트란 `bunx vercel login`(인터랙티브)이 필요한 배포·실측 항목이다.

## 도달 항목 (로컬·에뮬레이터·임시 배포에서 검증 완료)

| # | 항목 | 상태 | 증거 |
|---|---|---|---|
| ① | 규칙 13케이스 확장 전수 | **통과 13/13** | `evidence/final/F1-rules-13-final.log`, `evidence/qa/03-rules-13cases.log`, mutation proof `evidence/qa/03-mutation-case9.log` |
| ①보 | 규칙 와일드카드 0건 (S8) | 통과 | `evidence/qa/02-wildcard-grep.txt` |
| ② | 팀 생성→초대→합류 계약 | 규칙 테스트로 계약 검증(케이스 ⑨), 구현 완료 | `tests/rules/rules.test.ts`, `src/lib/teams.ts` |
| ③ | blob-token 비멤버 401·미인증 401 | 로컬 prod 서버 실측 | 본 문서 하단 스모크 로그, `src/app/api/blob-token/route.ts` |
| ④ | 대시보드 데모 데이터 렌더 계약 | 데이터셋·집계 단위테스트 28/28 | `evidence/final/unit-tests-final.log` |
| ⑤ | 랜딩 OG 태그 3종 | 로컬 + 임시 배포 실측 | `evidence/final/local-og-count.txt`, `public/og.png` |
| ⑦ | 리포트 PNG 내보내기 구현(썸네일 포함/제외 fallback 포함) | 구현·빌드 통과 | `src/components/team/dashboard-panel.tsx` |
| — | 튜토리얼 5스텝(driver.js, 지정 문안) | 구현·빌드 통과 | `src/components/team/tutorial.tsx` |
| — | bootstrap 멱등(서버 로직)·쓰기 상한 | 구현 + 코드 계약 검증, 빌드 통과 | `src/app/api/bootstrap-demo/route.ts` |
| — | 빈 팀 fallback | 구현(AuthProvider 실패 시 /teams 진입) | `src/components/providers/auth-provider.tsx` |
| — | 판단어·alert·task.overdue grep 0건 | 통과 | `evidence/qa/15-judgment-word-grep.txt`, `evidence/qa/08-task-overdue-grep.txt` |
| — | 덱 11장·cron 문구 0건 | 통과 | `evidence/qa/31-deck-check.txt`, `deck/teamledger-deck.pdf` |
| — | Vercel 원격 빌드 호환 | **임시 배포 Ready** — https://temporary-agile-nickel-vv5lsb8.vercel.app (59분 만료, env 미설정) | 본 문서 하단 스모크 로그 |
| — | devlog 아크 3건 이상 + 해시 실재 | 아크 7건, 해시 전부 `git cat-file -e` 통과 | `devlog/DEVELOPMENT_LOG.md` |

## 미도달 (사용자 게이트 — `bunx vercel login` 이후 즉시 실행 가능)

| # | 항목 | 이유 | 사용자 실행 절차 |
|---|---|---|---|
| ⑤ | 시크릿창 리허설(방문자별 격리·비멤버 차단·튜토리얼·팀 삭제·bootstrap 멱등) | 실브라우저 심사 필요 | 배포 URL을 시크릿창 3개로 열어 각자 체험하기 → 서로 다른 사본 확인 |
| ⑥ | prod 배포 URL 확정 + 헬스체크 | vercel 로그인 필요 | 아래 커맨드 참조 |
| ②③④ | prod URL에서의 체험 E2E 실측(업로드·PNG 2회·bootstrap 재호출 멱등 실측) | 동일 | 아래 커맨드 참조 |
| 16 | 규칙 스모크테스트(내 익명 uid 규칙 경유 실작성) | 로그인한 실유저 브라우저 필요 | 배포 후 앱 UI에서 기록 1회 → events 확인 |

## 사용자 배포 커맨드 (A.9 환경변수 매핑 값은 `.omo/plans/teamledger-4an.md` §2 참조)

```bash
cd /Users/gahn/Projects/99-aibootcamp-vibecoding
bunx vercel login                      # 게이트 — 인터랙티브
bunx vercel link                       # 프로젝트 연결
bunx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
bunx vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
bunx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
bunx vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
bunx vercel env add BLOB_READ_WRITE_TOKEN production        # Vercel Blob 스토어 연결 시 자동 주입되기도 함
bunx vercel env add FIREBASE_SERVICE_ACCOUNT production     # 서비스계정 JSON 전체를 한 줄로 (.env.local 참조)
bunx vercel --prod
bunx firebase-tools deploy --only firestore:rules           # 규칙을 실제 프로젝트에 배포
curl -sI <prod URL>                                          # HTTP 200 확인 (F6)
```

- 규칙 배포가 prod에서 이뤄져야 S1~S9 강제가 실서버에 적용된다 — 반드시 `firestore:deploy` 실행.
- `DEMO_EMAIL`/`DEMO_PASSWORD`는 존재하지 않는다 (폐기 확정).

## 로컬·임시배포 스모크 로그 (2026-08-30 실측)

```
로컬 prod 서버 (next start -p 3111)
/            → 200
/onboarding  → 200
/teams       → 200
/me          → 200
/about/devlog→ 200
/join/some-token → 200
POST /api/bootstrap-demo (인증 없음) → 401 {"error":"unauthenticated"}
POST /api/blob-token    (인증 없음) → 401 {"error":"unauthenticated"}
랜딩 og: 태그 → og:title·og:description·og:image·og:type

Vercel 임시 배포 (익명, env 미설정 — 빌드 호환성 검증용)
https://temporary-agile-nickel-vv5lsb8.vercel.app → 200, /onboarding 200, /me 200
POST /api/bootstrap-demo → 500 (FIREBASE_SERVICE_ACCOUNT 미설정 — 예상된 실패, 빈 팀 fallback 동작 대상)
랜딩 og: 태그 1행(og:title·description·image·type 포함)
```

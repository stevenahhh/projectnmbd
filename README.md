# 한몫

**팀플에서 내 한몫이 그대로 남습니다.**

문서·자료·할 일·대화·회의록을 한 공간에서 쓰면, 누가 언제 무엇을 했는지가 서버 시각과 함께 자동으로 쌓입니다. 동료평가에 낼 기여 리포트는 버튼 한 번으로 PNG가 됩니다.

- 서비스: <https://projectnmbd.vercel.app>
- 코드네임: `nmbd` (도메인·저장소 이름은 그대로 유지)

---

## 무엇을 해결하나

대학 팀플의 기여도 다툼은 대부분 "누가 얼마나 했는지 증거가 없다"에서 시작합니다. 한몫은 판정하지 않습니다. **다섯 축(문서·자료·할 일·회의·기록)을 따로 세고, 공백이 보이게** 할 뿐입니다.

- 총량은 몰아 적어 부풀릴 수 있지만, **서버가 찍은 시각은 못 바꿉니다.** 활동 시간축(잔디)이 그 증거입니다.
- 문서 기여는 **증가분만** 셉니다. 지웠다 다시 쓰는 방식으로는 늘지 않습니다.
- 할 일의 정시 완료 여부는 저장된 플래그가 아니라 **원장에 찍힌 시각과 마감을 서버 시각끼리 대조**해 판정합니다.

## 화면

| 화면 | 하는 일 |
|---|---|
| **홈** | 기여도 원 그래프(호버 시 축별 수치), 활동 시간축, 최근 활동, 기여 리포트 PNG 내려받기 |
| **할 일** | 담당·마감이 있는 체크리스트. 마감 임박 D-표시, 완료 목록은 접힘 |
| **대화** | 팀 대화. 보낸 글자 수가 활동 기록으로 남음 |
| **회의** | 정형 회의록(주제·일시·장소·참석). 본문은 마크다운, 세 줄 요약은 AI가 본문에서 추출 |
| **문서** | 저장할 때마다 버전이 남고 과거 버전을 그대로 열람 |
| **자료** | 파일 업로드(파일당 10MB·팀당 200MB), 이미지/PDF 미리보기, 첨삭 댓글 |
| **타임라인** | 기간 항목은 막대를 끌어 30분 단위로 이동·조절, 마감은 상단 축에 날짜별 점으로 집계 |
| **멤버** | 역할 배정, 팀장 지정 요청·승인, 팀 보관 |
| **로그** | 팀에서 일어난 모든 활동을 종류·사람으로 걸러 시각 순으로 열람 |

## 기술 스택

- **Next.js 15** (App Router, React 19, React Compiler 린트 활성) · TypeScript strict
- **Firebase**: 익명 인증 + Firestore(클라이언트 직접 접근, 권한은 보안 규칙으로) + Admin SDK(데모 부트스트랩 전용)
- **Vercel Blob**: 파일 저장. 업로드 토큰은 서버가 멤버 검증·용량 상한 확인 후 정확한 pathname 으로 발급
- **Tailwind v4** + shadcn 계열 UI + Wanted Sans Variable
- **Gemini** (`gemini-2.5-flash`): 회의록 세 줄 요약. 키가 없으면 요약하지 않고 직접 입력을 안내합니다
- 차트·간트·마크다운은 의존성 없이 직접 구현했습니다 (SVG + 최소 파서)

## 아키텍처 메모

- **원장(ledger) 우선**: 모든 활동은 `teams/{teamId}/events` 에 이벤트로 남고, 기여도는 저장된 집계가 아니라 클라이언트에서 원장을 접어(reduce) 계산합니다. 집계 캐시 문서를 두지 않습니다.
- **시각 위조 차단**: `events` 규칙이 `at == request.time` 을 강제합니다. 그래서 "한 달 전 기록"이 필요한 데모 데이터만 `POST /api/bootstrap-demo` 에서 Admin SDK 로 복제합니다(유일한 예외).
- **방문자별 데모**: 처음 접속하면 익명 uid 로 데모 팀이 복제되고, 방문자가 팀장 자리에 들어갑니다. 멱등이라 두 번 눌러도 늘지 않습니다.

## 개발

```bash
bun install
bun run dev      # http://localhost:3000
bun run build    # 타입체크 포함
bun run lint
bun run test     # vitest, tests/unit
bun run test:rules  # Firestore 보안 규칙 스모크
```

### 환경변수 (`.env.local`)

| 키 | 필요 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `APP_ID` | 필수 | 클라이언트 Firebase |
| `FIREBASE_SERVICE_ACCOUNT` | 필수 | Admin SDK JSON 한 줄. 데모 부트스트랩·블롭 토큰 검증 |
| `BLOB_READ_WRITE_TOKEN` | 파일 업로드 | Vercel Blob |
| `NEXT_PUBLIC_SITE_URL` | 선택 | OG·절대 URL |
| `GEMINI_API_KEY` | 선택 | 회의록 AI 세 줄 요약. 없으면 기능이 직접 입력으로 물러납니다 |

## 배포

Vercel(Hobby) + Firebase. `bunx vercel --prod` 로 배포하고, 보안 규칙은 `firebase deploy --only firestore:rules` 로 따로 올립니다.

## 문서

- [`docs/`](./docs) — 기획 보고서 4안 비교 (한몫은 4안 「팀플 원장」의 구현체)
- [`devlog/DEVELOPMENT_LOG.md`](./devlog/DEVELOPMENT_LOG.md) — 실패와 결정의 기록
- [`evidence/`](./evidence) — 규칙 스모크·테스트 로그 등 검증 산출물

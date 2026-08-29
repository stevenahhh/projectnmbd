# 순천대 바이브코딩 경진대회 — 4안 「팀플 원장(元帳)」

**작성 2026-08-29 · 접수 마감 2026-08-30 23:59 · 온라인 전시 08-31~09-04 · 심사 09-04~09-07 · 결과 09-08 · 사용자 결정으로 4안 채택 방향, 1안 실행 플랜 `.omo/plans/ctrlf-school-1an.md`는 파일로 보존**

> **이 보고서는 앞의 세 안과 성격이 다릅니다.** 1·2·3안은 "학교가 공개한 데이터를 파싱해 정적으로 보여주는" 서버 없는 설계였습니다. 4안은 사용자가 **직접 쓰고, 올리고, 대화하는** 다중 사용자 서비스라 **백엔드가 있습니다.** 그래서 이 보고서의 절반은 "무엇을 만드는가"가 아니라 **"심사 4일 동안 어떻게 안 죽게 만드는가"**에 씁니다.

---

## 요약 — 4안을 한 문장으로

**팀플의 모든 일(문서·자료·할 일·대화)을 한 공간에서 하게 만들고, 그 부산물로 "누가 얼마나 했는지"가 자동으로 기록되어 학기 끝에 동료평가에 붙일 기여 리포트 한 장이 나오는 팀플 워크스페이스.**

- **척추는 기여도입니다.** 문서 편집기·파일 공유·채팅은 Notion·카톡·드라이브가 이미 잘 합니다. 그것들이 **못 하는 것**은 "이 팀플에서 누가 무엇을 했는지"를 남기는 일이고, 그게 무임승차가 발생하는 자리입니다. 4안의 모든 기능은 **기록이 남는 형태로** 만들어져 있어서, 쓰기만 하면 기여도가 쌓입니다.
- **그 기록은 지울 수도, 날짜를 바꿀 수도 없습니다.** 활동 원장(`events`)은 **추가만 되는(append-only) 구조**이고, 기록자는 본인 계정으로 잠기며, 시각은 서버가 찍습니다. "막판에 몰아서 적으면 되지 않나"에 대한 답: 가능하지만 **몰아 적은 흔적이 서버 시각으로 남아 지워지지 않고, 시간축 화면에 그대로 보입니다.** 위조를 막는 게 아니라 위조가 드러나게 하는 설계입니다.
- **과거 팀플이 남습니다.** 학기가 끝나면 팀은 보관(archive)되고, "2026-1학기 마케팅원론 팀플에서 내가 한 일"을 나중에 다시 꺼낼 수 있습니다. 카톡방은 나가면 끝, 드라이브는 누구 것인지 흩어집니다.
- **경쟁작 26개(08-29 재확인) 중 팀플 진행을 다루는 작품은 0개.** 인접작 「역량 평가를 통한 팀원 모집 플랫폼」은 팀 **결성 전**(매칭)이고, 4안은 **결성 후**입니다.
- **스택은 심사 기간에 슬립하지 않는 것만 씁니다.** Vercel(Next.js) + Firebase Auth·Firestore(Spark, 카드 불필요, 슬립 없음) + Vercel Blob(파일, Hobby 무료). 대회 플랫폼 `scnuai.com` 자체가 **Vercel + Firestore**로 돌아가고 있어서, 이 조합이 심사 기간에 살아있다는 것은 주최측이 증명하고 있습니다.
- **정직한 약점**: 3안처럼 문제를 숫자로 증명할 데이터가 없습니다. "무임승차가 괴롭다"는 체감 진술이고, 설문을 돌릴 시간이 없습니다. 문제발굴 10점에서 3안보다 불리한 대신, 독창성·UI/UX·전달력에서 벌고 **심사위원이 직접 만져볼 수 있다**는 것으로 메웁니다.

---

## 1. 이 보고서의 근거

### 1.1 1~3안과 공유하는 근거

- **루브릭 100점**: 문제발굴 10 · 독창성 15 · 실제작동 15 · 기능충실도 10 · UI/UX 10 · AI개발과정 10 · AI문제해결 10 · 지속가능성 10 · 발표전달 10. 사업성 0. 발표 없음(PDF가 전달 10점 전부).
- **대회 원문의 배포 지침**: 별도 권장 스택 문구는 **없습니다.** 있는 것은 "웹/앱 서비스 구현"과 심사 문항 **"제출된 배포 URL에서 핵심 기능이 오류 없이 구동되는가?"** 뿐입니다. 사용자 조건(Vercel)과 필드 관행(26개 중 23개가 Vercel)을 따릅니다.

### 1.2 ★ 4안을 위해 오늘 새로 실측한 것

| # | 측정 | 결과 |
|---:|---|---|
| MP1 | 전시작 수 재확인 (Firestore `exhibitions`, `status=='published'`) | **17 → 26개** (08-27 → 08-29) |
| MP2 | "팀플·협업·무임승차·기여" 키워드 적중 | **1개** — 「역량 평가를 통한 팀원 모집 플랫폼」(수료증 OCR → 역량 프로필 → 팀원 매칭). **결성 전 단계.** 진행 관리 작품 0 |
| MP3 | 신규 9개 작품 성격 | 장학캘린더(공공데이터 1,859건 — **수치로 문제를 제시하는 경쟁자 등장**), SCNU-Mate 챗봇, 성적 관리, 야간점호(룸메 매칭+사감봇), 이음(이동시간 시간표), 모음(동아리 추천), 시험기간 생존, AI 생활 도우미 — 팀플과 무관 |
| MP4 | 신규작 호스팅 | `bolt.host` 2개, `lovable.app` 1개 — 무료 티어 슬립 계열. 나머지 Vercel |
| MP5 | 대회 플랫폼 스택 | JS 청크에서 `projectId: auraproject-dd957` 확인. **Next.js on Vercel + Firestore**, 공개 컬렉션 REST 조회 성공 |
| MP6 | Firebase Storage 과금 조건 | **2024-10-30 이후 신규 프로젝트는 Blaze(카드 등록) 필수.** 무료 한도는 유지되나 카드 없이는 버킷 생성 불가 |
| MP7 | Vercel Blob Hobby | **무료**, 저장 약 5GB·전송 100GB 한도, 초과 시 과금이 아니라 **30일 정지**. 카드 불필요 |
| MP8 | Firestore Spark 한도 | 읽기 5만/일 · 쓰기 2만/일 · 저장 1GB · **슬립 없음**. 팀 10개 × 심사위원 열람으로는 1%도 안 씀 |

**해석**: (1) 자리는 비어 있습니다. (2) 카드 없이 전부 무료로 서고, 슬립하는 부품이 없습니다. (3) 다만 "장학캘린더"처럼 수치로 문제를 내미는 경쟁자가 생겼으니, 4안은 **수치 대신 체험**으로 이겨야 합니다 — 심사위원이 30초 안에 "우리 팀에 이거 필요한데"를 느끼게.

---

## 2. 추천 주제 — 「팀플 원장: 쓰기만 하면 기여가 남는 팀플 공간」

### 2.1 불편의 실체

팀플의 고통은 **일하는 동안**이 아니라 **끝난 뒤**에 옵니다. 동료평가 칸 앞에서:

> "쟤가 거의 안 한 건 다들 아는데, **내가 뭘 근거로** 낮게 주지? 카톡 다시 올려볼까?"

카톡방 + 구글드라이브 조합으로는 이게 구조적으로 불가능합니다.

| 필요한 것 | 카톡+드라이브에서 | 4안에서 |
|---|---|---|
| 누가 얼마나 했는지 | 대화 수천 줄을 스크롤 | 자동 집계, 대시보드 한 장 |
| 참여율 | 알 수 없음 | 활동 일수 / 회의 응답 / 할 일 완료율 |
| 파일이 어디 있는지 | 개인 드라이브·카톡 첨부에 흩어짐 | 팀 공간 하나, 올린 사람 기록 |
| 할 일 배분 | 말로, 나중에 잊힘 | 담당·마감·완료 기록 |
| 지난 학기 팀플 | 방 나가면 끝 | 보관함에 그대로 |
| 동료평가 근거 | 기억 | **기여 리포트 PNG** |

### 2.2 무엇을 만드는가

**한 팀 = 한 공간.** 화면은 다섯 개고, 전부 **기록이 남는 형태**입니다.

**① 팀 홈 — 기여도 대시보드 (주력 화면)**

```
마케팅원론 3조 · 과제: 브랜드 분석 보고서 · D-6

기여도                        참여율
 김OO  ████████████  38%       활동 12/14일 · 할 일 5/5 · 회의 4/4
 이OO  ████████      27%       활동  9/14일 · 할 일 3/4 · 회의 4/4
 박OO  ██████        21%       활동  7/14일 · 할 일 2/3 · 회의 3/4
 최OO  ███           14%       활동  3/14일 · 할 일 1/3 · 회의 1/4   ⚠ 최근 5일 활동 없음

시간축 (서버 시각)   08-14 ─────────────────────────── 08-27
 김OO   ▪▪ ▪ ▪▪▪ ▪ ▪▪ ▪ ▪▪ ▪ ▪▪ ▪
 이OO   ▪   ▪▪  ▪  ▪▪   ▪  ▪▪ ▪
 박OO      ▪▪      ▪▪▪       ▪▪
 최OO                              ▪▪▪▪▪   ← 마지막 이틀에 몰림

타임라인  08-14 김 문서 「시장분석」 작성 (1,240자) · 08-15 이 파일 「경쟁사.pdf」 · 08-16 박 할 일 「설문 정리」 완료 …
```

막대(총량) 옆에 **시간축 분포**를 나란히 둡니다. 총량은 마지막 날 몰아 적기로 부풀릴 수 있지만, 서버 시각으로 찍힌 분포는 부풀릴 수 없습니다 — "누가 얼마나"보다 "누가 언제"가 동료평가에서 더 결정적인 증거입니다.

기여도는 **판정이 아니라 집계**입니다. 문서 글자 수·파일 수·할 일 완료·회의 출석·활동 일수를 **각각 따로** 보여주고, 종합 %는 가중치를 팀이 직접 정합니다(기본값 균등). "누가 무임승차자다"라고 시스템이 말하지 않습니다. **공백이 보이게** 할 뿐입니다.

**② 문서** — 간단한 마크다운 편집기. 저장할 때마다 **누가·언제·몇 자**가 버전으로 남습니다. 동시편집은 안 합니다(마감 이틀, 그리고 필요 없음 — 팀플 문서는 순서대로 씁니다). 편집 중 잠금 표시만.

**③ 자료** — 파일 업로드(Vercel Blob, 파일당 10MB) + 링크. 올린 사람·시각·설명 한 줄. 발표자료는 여기 올리고 **댓글로 첨삭**합니다. 첨삭은 사람이 하고, 시스템은 "누가 몇 개의 첨삭을 남겼는지"를 셉니다.

**④ 할 일** — 담당·마감·상태. 완료 시각 기록. 마감 지난 미완료는 빨갛게.

**⑤ 대화** — Firestore 실시간 채팅. 카톡을 대체하려는 게 아니라 **팀플 관련 대화가 여기 남게** 하려는 것. "회의" 버튼으로 시작하면 참석자가 기록됩니다(참여율의 회의 출석).

**보관함** — 학기 끝에 팀장이 "보관"하면 읽기 전용이 되고, 각자 "내 팀플 기록"에서 과거 팀 전부를 봅니다. **여기서 지속가능성 10점이 나옵니다** — 쓸수록 개인의 팀플 이력이 쌓입니다.

**기여 리포트** — 팀 홈의 대시보드를 **PNG 한 장**으로 내보내기. 동료평가 제출할 때 첨부하는 물건이고, 이 제품의 존재 이유입니다.

### 2.3 심사위원이 혼자 열었을 때 — 가장 중요한 설계

다중 사용자 서비스의 최대 리스크는 **심사위원이 혼자 열면 빈 화면**이라는 것입니다. 세 겹으로 막습니다.

1. **데모 계정 하나를 발급해 랜딩에 아이디·비밀번호를 그대로 적어둡니다.** 익명 로그인은 없습니다 — 심사위원은 그 계정으로 로그인하고, 이게 실제 사용자와 완전히 같은 경로입니다.
2. **데모 계정에는 실제로 1개월간 팀플한 것처럼 데이터를 채웁니다.** 「마케팅원론 3조」 4인, 회의록 4건, 할 일 20여 건(완료·지연·미완 섞음), 문서 버전 10여 개, 파일·링크, 대화 수백 줄, 보관된 지난 학기 팀 1개. 기여도·시간축·쏠림·알림·간트·리포트 — **모든 기능이 실데이터 위에서 그대로 작동**합니다.
3. **리셋 없음.** 심사위원이 몇 개 적어도 한 달치 위에서는 노이즈이고, 그 기록도 서버 시각으로 남아 오히려 "지금 내가 쓴 게 바로 찍힌다"는 증명이 됩니다. Cron 의존성 없음.

### 2.4 왜 이게 점수가 되는가 — 루브릭 9항목

| 항목 | 배점 | 대응 |
|---|---:|---|
| 문제발굴 | 10 | 수치 없음(약점). 대신 **심사위원 본인이 겪은 문제**입니다 — 교수라면 동료평가를 받아본 쪽, 학생 심사위원이라면 낸 쪽. 덱 2장은 "동료평가 칸 앞의 그 순간"을 그대로 재현. |
| **독창성** | 15 | 26개 중 팀플 진행 0개. 그리고 **"협업 도구가 아니라 증거 도구"**라는 프레이밍 — Notion·카톡과의 차이를 심사위원이 묻기 전에 슬라이드가 먼저 답합니다. |
| **실제작동** | 15 | 슬립하는 부품 0(§2.5). 심사위원 혼자 열어도 완성 화면(§2.3). 배포 후 시크릿 창 리허설. |
| 기능충실도 | 10 | 대시보드·문서·자료·할 일·대화·보관함·리포트 — **7개 기능이 한 목적으로 묶임.** "기능 나열"이 아니라 전부 기여 기록으로 수렴. |
| **UI·UX** | 10 | 기여도 막대 + 시간축 분포 한 화면. 데모 계정으로 30초 안에 전 기능 체험. |
| AI 개발과정 | 10 | Firestore 보안 규칙·실시간 리스너·Blob 업로드 토큰·기여도 집계 규칙 — 실패-수정 소재가 실제로 생깁니다(§4). |
| AI 문제해결 | 10 | "기여도를 어떻게 정의할 것인가"를 AI와 함께 설계한 과정 — 글자 수 하나로 하면 게이밍당함 → 5축 분리 → 가중치는 팀이 정함. 이 판단 과정이 곧 10점. |
| **지속가능성** | 10 | **쓸수록 개인 팀플 이력이 쌓임.** 학과·과목 무관, 순천대 무관 — 어느 대학에서도 그대로 씁니다. |
| 발표·전달 | 10 | 대시보드 스크린샷 1장 + 리포트 PNG 1장이면 설명 끝. |

### 2.5 배포 설계 — 심사 4일 동안 안 죽는 구성

```
Vercel Hobby (Next.js App Router)
 ├─ 정적/SSR 페이지 ──────────────── 슬립 없음
 ├─ /api/blob-token (함수 1개) ────── Blob 업로드 토큰 발급만. 콜드스타트 <1s, 슬립 없음
 └─ Cron: 없음 ─────────────────────── 데모는 고정 계정 + 1개월치 시드라 리셋 불필요

Firebase Spark (카드 불필요)
 ├─ Auth: 이메일/비밀번호 + Google ── 슬립 없음. 익명 로그인 없음(데모도 정식 계정)
 └─ Firestore: teams/{id}/{docs,files,tasks,meetings,messages,events} ── 슬립 없음, 실시간 리스너
      · events = append-only 원장: create만 허용, update/delete 규칙에서 금지
      · actorUid == request.auth.uid 강제, at == request.time 강제 (클라이언트 시각 불가)

Vercel Blob (Hobby 무료) ──────────── 파일 본체. 초과 시 과금 아닌 정지 → 파일당 10MB·팀당 200MB 상한으로 원천 차단
```

**프론트엔드**: Next.js App Router + Tailwind + **shadcn/ui**(1안에서 검토했던 것과 동일). 대시보드·간트·회의록·온보딩이 전부 폼·테이블·다이얼로그 조합이라 컴포넌트를 복사해 쓰는 shadcn이 이틀 일정에 맞고, 런타임 의존성이 아니라 소스로 들어오므로 빌드 리스크가 없습니다. 차트는 shadcn의 Recharts 래퍼, 간트는 SVG 직접 작성.

**쓰지 않는 것과 이유**: Supabase(7일 pause — 제출 08-30 → 심사 09-07이 8일), Render/bolt/lovable(#8 Scoop이 이걸로 이미 사망), Firebase Storage(카드 필요 — 대신 Vercel Blob), 런타임 LLM(비용·지연·"AI 첨삭"은 심사에서 차별화가 아님).

**보안 규칙 골자**: `teams/{id}`는 `members` 배열에 `request.auth.uid`가 있을 때만 읽기·쓰기. `events`는 위의 append-only 세 줄. 팀장 교체는 `leaderUid`가 null이거나 본인일 때만 트랜잭션으로 통과(동시에 두 명을 지정해도 팀장은 한 명). 데모 계정은 특례 없이 일반 팀원과 같은 규칙을 탑니다. 이 규칙 파일 자체가 devlog 소재입니다.

**개인정보**: 실명·학번 입력 칸 없음 — 닉네임만. Google 로그인 시 이메일은 저장하지 않고 uid만. 기여도는 팀 안에서만 보이고 외부 공개 URL 없음(리포트는 본인이 PNG로 내려받아 제출).

### 2.6 실행 가능성 — 이틀 안에 끝나는 순서

오늘 08-29, 마감 08-30 23:59. **순서가 곧 헤지입니다** — 어디서 멈춰도 출품 가능한 상태.

| 시각 | 작업 | 이 시점에 멈추면 |
|---|---|---|
| 08-29 저녁 | 스캐폴드 + Firebase Auth + Firestore 규칙 + 팀 생성/초대 + **배포** | 로그인·팀 생성만 되는 사이트 |
| 08-29 밤 | 할 일 + 대화 + **이벤트 로그**(모든 행동을 `events`에 기록) | 관리 도구 |
| 08-30 오전 | **기여도 대시보드**(events 집계 + 시간축) + 데모 계정·1개월치 시드 | **출품 가능한 최소형** |
| 08-30 오후 | 문서 편집기(버전 기록) + 파일(Blob) | 완성형 |
| 08-30 저녁 | 리포트 PNG + 보관함 + 덱 + 시크릿창 리허설 | 제출 |

핵심 트릭: **모든 기능이 `events` 컬렉션에 한 줄씩 남기고, 대시보드는 그것만 읽습니다.** 기능을 하나 덜 만들어도 대시보드는 그대로 돌아갑니다.

### 2.7 MVP 컷라인

**반드시**: 회원가입+온보딩 · 팀 생성/초대 링크 · 팀장 지정/승인 · 역할 배정 · 할 일 · 대화 · 이벤트 로그 · **기여도 대시보드** · 마감 알림 · 데모 계정 + 1개월치 시드
**되면**: 회의록 템플릿 · 간트 타임라인 · 문서 편집기 · 파일 업로드 · 「내가 한 일」 리포트 · 보관함
**안 함**: 동시편집 · LLM 첨삭 · 서버 푸시 알림 · 실명/학번 · 팀 밖으로 공개되는 기여도 URL

### 2.8 ★ 08-29 확정 사양 (사용자 결정 반영)

**0. 사용자 타겟 = 팀장.** 팀은 팀장이 만드는 것이 기본 흐름. 팀장이 먼저 만들지 않은 경우, 팀원 A가 팀원 B를 「팀장으로 지정」→ B에게 알림 → B가 **승인**해야 팀장이 됩니다. 승인 전까지 팀장 없는 상태로 기능은 제한 없이 동작(역할 배정·보관만 팀장 권한). Firestore: `teams/{id}.leaderUid` + `leaderRequests/{uid}` 문서, 승인 시 트랜잭션으로 교체 — 조건은 「현재 `leaderUid`가 null이거나 본인」, 승인되면 나머지 요청은 전부 무효화.

**1. 역할은 팀장이 직접.** 팀 참여자 목록을 불러와 각자에게 역할을 붙이고, **역할 이름은 자유 입력**(「자료조사」「PPT」「발표」 기본 제안 + 커스텀). 역할은 할 일의 기본 담당자로 연결되고, 대시보드의 「약속 대비 이행」 축이 됩니다.

**2. 쏠림 표시** — 채택. 한 사람이 기여의 60% 이상이면 대시보드에 분포만 표시, 판단어 없음.

**3. 회의록 = 정형 템플릿.** 화자 분리·녹음 없음. 필드: 주제 · 일시(+진행시간) · 장소(비대면/오프라인, 텍스트박스) · 참여인원(팀원 체크) · 세줄요약 · 내용(자유 작성). 저장하면 시스템 안에서 **정형 문서로 렌더링**되고, 참여인원 체크가 곧 회의 출석 기록입니다. 세줄요약은 사람이 쓰는 것이 기본이고, **「AI 요약」 버튼은 선택 기능** — 서버 함수 하나가 Gemini를 호출하되 키가 없으면 버튼 자체가 숨겨집니다. 심사용 배포는 키 없이도 완전히 동작해야 하고, 이 버튼이 죽어도 회의록은 저장됩니다.

**4. 타임라인 = 인터랙티브 간트.** 최종 마감에서 역산한 기본 마일스톤(초안/검토/발표자료/리허설)을 간트 막대로 깔고, 드래그로 기간 조정·담당 지정. 할 일과 양방향 연결(간트에서 만든 막대가 할 일이 됨). 라이브러리 없이 SVG로 그리거나 `frappe-gantt` 하나만 — 의존성 최소.

**5. 회원가입 + 인터랙티브 온보딩.** 가입 후 단계형 온보딩: 닉네임 → 역량 태그(디자인/개발/발표/자료조사/문서 등 선택 + 자유 입력) → GitHub·포트폴리오 링크(선택) → 관심 과목. 이 프로필이 팀 안에서 역할 배정의 근거로 보이고, 「내가 한 일」 리포트에 이력으로 누적됩니다. **실명·학번은 여전히 받지 않습니다.** 심사위원은 온보딩이 끝난 데모 계정으로 바로 들어가고, 온보딩 화면 자체는 데모 계정의 프로필 편집에서 다시 볼 수 있습니다.

**6. 알림은 마감 기준 자동.** 할 일·마일스톤 마감에 대해 「내일까지입니다」「3시간 남았습니다」「1시간 남았습니다」를 자동 생성. Hobby Cron이 1일 1회라 서버 예약 발송은 불가능하므로, **알림은 클라이언트가 접속 시·탭 열린 동안 계산**해 앱 내 알림함 + 브라우저 Notification으로 띄웁니다(서버 푸시는 MVP 제외). 비활동 경고는 고정 5일이 아니라 **팀플 기간에 비례**(기간의 20%, 최소 1일)로 계산 — 2주짜리 팀플이면 3일, 3일짜리면 1일.

이 여섯 개는 전부 `events` 로그 위에 얹히므로 §2.6의 헤지(어디서 멈춰도 출품 가능)는 유지됩니다. 순서는 **0·1 → 6 → 3 → 5 → 4 → 2**: 팀장·역할은 데이터 모델이라 처음에, 알림은 할 일만 있으면 공짜, 간트는 시각화라 마지막.

---

## 3. 설계 금지선 — 기여도는 판정하지 않는다

이 제품이 잘못 만들어지는 방식은 하나입니다: **시스템이 "무임승차자"를 지목하는 것.** 그 순간 세 가지가 무너집니다 — 게이밍(글자 수 부풀리기), 억울함(오프라인에서 일한 사람), 그리고 팀 내 갈등의 책임이 도구로 넘어옴.

따라서:

- **종합 점수를 시스템이 정하지 않습니다.** 5축(문서·파일·할 일·회의·활동일)을 따로 보여주고, 가중치는 팀이 합의해서 정합니다. 기본값은 균등.
- **"오프라인 기여" 수동 입력 칸을 둡니다.** 발표를 맡았거나 자료를 직접 구해온 사람이 팀 확인 하에 적습니다. 자동 집계의 한계를 도구가 스스로 인정합니다.
- **경고 표시는 사실만**: "최근 5일 활동 없음". "무임승차 의심" 같은 판단어는 UI 어디에도 없습니다.

덱 한 장 문장: **「도구는 기록하고, 판단은 팀이 합니다.」**

---

## 4. ★ 개발일지 — AI 20점의 소재 (예상되는 실패-수정 아크)

1~3안과 달리 아직 만들기 전이므로 **예상**이지만, 이 스택에서 거의 확실히 겪는 것들입니다. 실제로 겪은 것만 씁니다.

| # | 시도 | 예상 실패 | 원인 | 해결 |
|---:|---|---|---|---|
| 1 | Firestore 규칙에 `members` 배열 검사 | 초대 링크로 들어온 사람이 쓰기 거부 | 합류 트랜잭션 전에 규칙이 평가됨 | 합류 전용 `invites/{token}` 문서 + 규칙 분리 |
| 2 | 클라이언트에서 Blob 직접 업로드 | 토큰 노출 / CORS | Blob은 서버 토큰 필요 | `/api/blob-token` 함수 1개, 팀 멤버 검증 후 발급 |
| 3 | 기여도 = 문서 글자 수 | 복붙 한 번에 80% | 단일 지표 게이밍 | 5축 분리 + 팀 가중치 + 오프라인 입력 |
| 4 | 실시간 리스너를 화면마다 등록 | 읽기 카운트 폭증 | 리스너 중복 | 팀 단위 리스너 1개, 화면은 구독만 |
| 5 | 기여도 총량 막대만 표시 | "마지막 날 몰아 쓰면 되잖아요" | 총량은 시점을 안 보여줌 | `events` append-only + 서버 시각 강제 + 시간축 분포 화면 |

**커밋 규약**은 1안과 동일 — 1 작업 = 1 커밋, 실패-수정 커밋에만 `시도:/실패:/원인:/해결:` 4줄.

---

## 5. 전시물 설계

**OG 태그**: `og:title` 팀플 원장 — 쓰기만 하면 기여가 남는 팀플 공간 · `og:description` 동료평가 칸 앞에서 카톡을 다시 올리지 마세요. 문서·자료·할 일·대화가 한 곳에, 기여도는 자동으로. · `og:image` 대시보드 스크린샷.

**PDF 덱 (10~12장)**: 표지 / 문제: 동료평가 칸 앞의 그 순간 / 카톡+드라이브로 안 되는 6가지 표 / 해결: 대시보드 스크린샷 / 7개 기능이 한 목적으로 / **협업 도구가 아니라 증거 도구** (Notion·카톡 대비) / 도구는 기록하고 판단은 팀이 / 아키텍처: 슬립하는 부품 0 / AI 개발과정 2장 / 지속가능성: 내 팀플 이력 / 한계.

---

## 6. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| 이틀 안에 못 끝냄 | §2.6 순서 — 08-30 오전 시점에 이미 출품 가능 |
| 심사위원이 빈 화면을 봄 | 랜딩에 데모 계정 공개 + 1개월치 실데이터, 전 기능 작동 |
| 기록 위조("몰아 쓰기") | `events` append-only·서버 시각 → 위조가 시간축에 드러남 |
| 심사 중 다운 | 슬립 부품 0, 함수 1개, 배포 후 시크릿창 리허설, 09-04~07 매일 GET 헬스체크 |
| "Notion이랑 뭐가 달라요" | 슬라이드가 먼저 답함 — 증거 도구, 리포트 PNG |
| 기여도 게이밍·갈등 | §3 — 판정 안 함, 5축, 오프라인 입력 |
| Blob 한도 초과 → 30일 정지 | 파일당 10MB·팀당 200MB 상한을 코드에서 차단 |
| 문제발굴 근거 부재 | 덱에서 숨기지 않고 "체감 문제, 설문 미실시"로 명시 — 정직이 감점보다 쌈 |

---

## 7. 확인하지 못한 것 (정직하게)

- **Firebase 프로젝트를 아직 만들지 않았습니다.** 당신 Google 계정이 필요합니다. 이메일 로그인·append-only 규칙이 실제로 통과하는지는 만든 뒤 첫 30분 안에 확인됩니다.
- **Vercel Blob 서버 토큰 흐름을 실측하지 않았습니다.** 문서상으로는 함수 1개면 되지만 돌려보기 전입니다.
- **문제를 뒷받침하는 수치가 없습니다.** 무임승차 경험 비율 같은 근거는 체감뿐입니다.
- **1안 플랜과의 관계**: 4안으로 가면 1안(08-28~30 일정)은 사실상 이번 대회에 못 나갑니다. 1인 1작품이므로 **택1**이고, 이 보고서는 4안 선택을 전제로 씁니다. 1안 플랜 파일은 그대로 남깁니다.

---

## 8. ★ 부록 A — 세션 핸드오프 (새 세션은 이 문서만 읽고 실행)

**이 문서는 제품 스펙 + 실행 스펙의 단일 진실입니다.** 새 세션(에이전트)은 이 부록만 보고 구현하며, 이전 대화 기록이나 이전 세션의 결정을 다시 묻지 말 것. 아래 A.12 결정 원장의 판결은 재론 금지.

### A.1 현재 상태 (2026-08-29 기준)

- 구현 시작 전. 깃 저장소 없음(디렉토리에 `docs/` `omo/` `.senpi/` 만 존재).
- Firebase 프로젝트 없음, Vercel 연결 없음 — A.2의 사용자 게이트 대기.
- 스택·기능·규칙·집계·시드는 모두 이 문서에서 확정됨. 남은 것은 코드 작성과 배포.

### A.2 사용자가 먼저 해야 할 것 (블로킹 게이트 3개)

1. **Firebase 프로젝트 생성**(Google 계정) → Authentication(이메일/비밀번호 + Google) 켜기 → Firestore 프로덕션 모드 → 웹 앱 등록 → config를 세션에 전달. ※ Storage는 안 씀(카드 필요).
2. **Vercel 계정 + GitHub 리포 연결** — 배포 대상.
3. 데모 계정은 **회원가입으로 직접 만들고** 랜딩에 아이디·비밀번호를 노출(A.10).

게이트 전에도 스캐폴드·정적 UI 구현은 진행 가능(환경변수는 플레이스홀더). config 도착 후 연결.

### A.3 스택 결정 (변경 금지)

| 계층 | 선택 | 금지 |
|---|---|---|
| 호스팅 | Vercel Hobby + Next.js App Router | Render/Supabase/bolt/lovable(슬립), Firebase Storage(카드) |
| 인증 | Firebase Auth — 이메일/비밀번호 + Google | 익명 로그인(없음), 실명·학번 수집 |
| DB | Firestore Spark — 팀당 서브컬렉션 | Cloud Functions(Spark에서 불가), 서버 푸시 |
| 파일 | Vercel Blob (Hobby 무료, 파일당 10MB·팀당 200MB 코드 차단) | 클라이언트 직접 업로드(서버 토큰 필수) |
| UX | Tailwind + shadcn/ui, 간트는 SVG 직접 | 추가 차트/간트 라이브러리 |
| LLM | `api/ai-summary` 1개(Gemini, 키 없으면 버튼 숨김) | 런타임 LLM을 핵심 기능으로 사용 |
| 산출물 | MD만. **HTML 생성 금지** | `docs/*.html` |

### A.4 Firestore 데이터 모델

컬렉션 `users`, `teams` + 팀 서브컬렉션 `events` `tasks` `meetings` `messages` `docs`(버전은 `docs/{docId}/versions`) `files` `comments`. 문서 필드:

- `users/{uid}`: `{nickname, skillTags[], github?, portfolio?, interests[], createdAt, teams: {teamId: role}}`
- `teams/{teamId}`: `{name, courseLabel, goal, startAt, dueAt(UTC ISO), leaderUid|null, members: {uid: {nickname, roleLabel, joinedAt}}, weights: {doc:1,file:1,task:1,meeting:1,note:1}, archived: false, archiveAt?}` — role(역할 배정)은 `members[uid].roleLabel`에 자유 문자열.
- `teams/{teamId}/events` (A.5)
- `tasks`: `{title, desc?, assigneeUid, dueAt, status:'todo'|'done'|'overdue'|'late-done', doneAt?, milestoneId?, order}` — 간트의 막대 = 마일스톤 필드가 있는 task.
- `meetings`: `{title, startedAt, durationMin?, place, online: bool, attendeeUids[], summary3, body}` — 참석 체크가 회의 출석 기록.
- `messages`: `{actorUid, text, at: serverTimestamp}` — 채팅, 카톡 대체 아님.
- `docs/{docId}`: `{title, latestVersion, body}` + `docs/{docId}/versions/{v}`: `{body, charsDelta, actorUid, at}` — 저장마다 버전 생성. 동시편집 없음(편집 중 잠금 표시만).
- `files`: `{name, blobUrl, sizeBytes, actorUid, caption, uploadedAt}` — 삭제는 문서에 `deleted` 표시만, blob 정리는 보류.
- `files/{id}/comments`: 댓글 = 첨삭, `{actorUid, text, at}`.
- `invites/{token}`: `{teamId, createdAt}` — 초대 링크 합류 게이트 전용 문서(devlog 아크 1).
- `leaderRequests/{reqId}`: `{teamId, targetUid, requesterUid, status:'pending'|'approved', createdAt}` — 승인 트랜잭션은 팀 문서 교체 + 요청 전체 무효화.

### A.5 이벤트 원장 — 유일한 진실

모든 UI 행동 = `events` 1줄. 대시보드는 **events만 읽고** 집계한다. 필드: `{teamId, actorUid, type, payload, at: serverTimestamp}`. `at`은 반드시 `serverTimestamp()` 센티널로 쓰고(규칙이 `== request.time` 강제), 클라이언트 시각 금지. UI에는 UTC → KST 렌더.

| type | payload | 집계 축 |
|---|---|---|
| `doc.edit` | `{docId, docTitle, charsDelta, version}` | 문서 — charsDelta(증가분만 합산, 감소 제외) |
| `file.upload` | `{fileId, fileName, sizeBytes}` | 파일 |
| `file.comment` | `{fileId, chars}` | 파일(첨삭) |
| `task.create` | `{taskId, title, assigneeUid, dueAt}` | — |
| `task.complete` | `{taskId, title, onTime}` | 할 일(완료율·정시율) |
| `task.overdue` | `{taskId, title}` | 할 일(클라이언트가 마감 경과 시 1회 기록) |
| `meeting.create` | `{meetingId, title}` | — |
| `meeting.attend` | `{meetingId}` | 회의(참석) |
| `message.post` | `{chars}` | 활동일(참고축) |
| `note.add` | `{text, verifierUids[]}` | 수동 축(오프라인 기여, 팀 확인 하에) |

### A.6 기여도 집계 공식 (커밋 전 이것만으로 구현 가능해야 함)

팀원별 5축 → 축별 팀 내 정규화(최대=1) → 가중치 합:
`score_i = Σ_j w_j * (axis_ij / max_k axis_kj)`, 기본 `w = {doc:1, file:1, task:1, meeting:1, note:1}`, 팀이 UI에서 조정. 종합 % = `score_i / Σ score` 표시.

- **문서**: `Σ max(charsDelta, 0)` (문서당 최신 길이 단독 금지 — 복붙 게이밍).
- **할 일**: `(완료 수 / 담당 수)` 와 `(정시 완료 / 완료)` 둘 다 표시, 종합엔 완료율.
- **활동일**: `events.at` 기준 고유 일수 — **참고축, 종합 가중치 미포함**(접속 성실도일 뿐).
- **시간축 분포**: 멤버별 일별 마커(막대 옆 보조 화면). append-only + 서버 시각이라 게이밍 불가 — "누가 언제"가 핵심 증거.
- **쏠림**: 최대 기여자가 팀 합의 60% 이상이면 분포만 표시, 판단어 없음.
- **비활동 경고**: `(dueAt - startAt) * 0.2`(최소 1일) 이상 events 없는 멤버에게 단순 사실 문구.
- **리포트 PNG**: 대시보드 + 시간축을 `html-to-image` 류로 내보내기(동료평가 첨부물). 판정 문구 없음.

### A.7 firestore.rules 전문 (구현 첫 30분에 emulator + rules-unit-testing으로 검증, 통과 기록을 devlog에)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function member(teamId) {
      return signedIn() && request.auth.uid
        in get(/databases/$(database)/documents/teams/$(teamId)).data.members.keys();
    }
    match /users/{uid} {
      allow read: if signedIn();
      allow write: if signedIn() && request.auth.uid == uid;
    }
    match /invites/{token} {
      allow read: if signedIn();
      allow create: if signedIn() && member(request.resource.data.teamId);
      allow delete: if signedIn();
    }
    match /teams/{teamId} {
      allow read: if signedIn() && member(teamId);
      allow create: if signedIn() && request.resource.data.members[request.auth.uid] != null;
      allow update: if signedIn() && member(teamId)
        && (resource.data.leaderUid == null || resource.data.leaderUid == request.auth.uid
            || (request.auth.uid != resource.data.leaderUid
                && get(/databases/$(database)/documents/teams/$(teamId)/leaderRequests/$(request.auth.uid)).data.status == 'approved'
                && get(/databases/$(database)/documents/teams/$(teamId)/leaderRequests/$(request.auth.uid)).data.targetUid == request.resource.data.leaderUid));
      allow delete: if false;
      match /events/{docId} {
        allow create: if signedIn() && member(teamId)
          && request.resource.data.actorUid == request.auth.uid
          && request.resource.data.at == request.time;   // serverTimestamp() 클라이언트 필수
        allow read: if signedIn() && member(teamId);
        allow update, delete: if false;                    // append-only
      }
      match /{sub}/{docId} {
        allow read: if signedIn() && member(teamId);
        allow create: if signedIn() && member(teamId);
        allow update, delete: if signedIn() && member(teamId) && request.resource.data.deleted == true;
      }
    }
  }
}
```

주의: `leaderRequests` 승인 규칙은 `get()` 2회 호출 — 1회 쓰기당 get 제한(10회) 내이므로 OK. 합류는 `invites/{token}` read 후 클라이언트 트랜잭션으로 `members`에 추가(devlog 아크 1의 해결책).

### A.8 라우트 + 서버 함수

- `/` 랜딩(데모 계정 공개, 데모 팀 미리보기) · `/login` · `/onboarding` · `/teams` · `/teams/[id]`(대시보드) · `/teams/[id]/docs` · `/teams/[id]/files` · `/teams/[id]/tasks` · `/teams/[id]/meetings` · `/teams/[id]/chat` · `/teams/[id]/gantt` · `/me`(내 팀플 기록·보관함·리포트 PNG)
- `api/blob-token`(POST, 팀 멤버 검증 후 `@vercel/blob` 발급) · `api/ai-summary`(POST, Gemini, 키 없으면 클라이언트에서 버튼 숨김)
- 파이어베이스 관련 서버 코드 없음(firebase-admin 미사용 — 규칙이 전부).

### A.9 환경변수

```
NEXT_PUBLIC_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / APP_ID   (공개, 클라이언트)
BLOB_READ_WRITE_TOKEN   (서버 전용 — 클라이언트 번들 금지)
GEMINI_API_KEY          (선택)
DEMO_EMAIL / DEMO_PASSWORD   (랜딩 표시용 — 의도적 공개)
```

### A.10 데모 계정·시드 스펙

- 데모 계정 1개: 회원가입으로 생성, `users/{uid}` 온보딩 완료(역량 태그 채움), 랜딩에 자격증명 공개. 익명 로그인·리셋·Cron **없음**.
- 팀 「마케팅원론 3조」: `startAt` 4주 전 ~ `dueAt` 심사일 전. 멤버 4인(닉네임만), 팀장 1인.
- 이벤트 분포: 멤버 A·B·C는 4주에 걸쳐 고르게(문서 편집·파일·할 일·회의), 멤버 D는 **마지막 2일 몰림** — 시간축이 증명하는 그림. 1인쯤 `note.add` 1건(오프라인 기여).
- 회의록 4건(1건 비대면, 1건 오프라인+장소 텍스트) · 할 일 20여 건(완료/정시·지연 완료·미완료·마감 임박 섞음) · 문서 3개×버전 3~4개 · 파일 5개+댓글(첨삭) 몇 개 · 대화 수백 줄 · 간트 마일스톤 4개(초안/검토/발표자료/리허설) 중 2개 진행 중 · 보관된 지난 학기 팀 1개(보관함 확인용).
- 시드는 `serverTimestamp()` 대신 과거 시각으로 생성하되 **규칙 우회 금지** — 시드 스크립트는 인증된 실제 유저 4개를 만들어 `events`에 차례로 기록하는 정식 경로를 탄다(시드 자체가 규칙 스모크테스트). 시드 스크립트는 `npm run seed`로 1회 실행, 멱등(재실행 시 기존 데모 팀 감지 후 스킵).

### A.11 부트스트랩 명령 시퀀스

```bash
cd /Users/gahn/Projects/99-aibootcamp-vibecoding
git init -b main   # .gitignore에 .omo/ .senpi/ node_modules/ .next/ .env* 추가
bun create next-app@latest . --ts --app --tailwind --src-dir --no-import-alias
bunx shadcn@latest init -y && bunx shadcn@latest add button card dialog input textarea select table tabs badge avatar dropdown-menu progress
bun add firebase @vercel/blob html-to-image   # (선택) @google/generative-ai
bunx firebase-tools login && bunx firebase-tools firestore:deploy --only rules   # 규칙 배포(Spark OK)
bun run dev # 로컬 → bun run build && bunx serve out? 아니고: vercel 배포
bunx vercel link && bunx vercel --prod
bun run seed   # 배포 후 1회, 데모 데이터
```

셸 주의: `firebase-tools`는 `bunx firebase-tools`로 실행(인터랙티브 login이므로 세션에서 사용자가 직접).

### A.12 결정 원장 — 재론 금지

| 결정 | 판결 |
|---|---|
| 명칭 | 「기여도」 유지(「활동 기록」으로 바꾸지 않음 — 피치 우선) |
| 데모 | 계정 1개 + 1개월치 시드. 세션 복제·일일 리셋·악명 로그인·Cron 도입 금지 |
| 원장 | events append-only + actorUid 잠금 + 서버 시각 |
| 화면 | 기여도 막대(총량) 주인공, 시간축 분포 보조 |
| 지표 | 참여율의 활동 일수는 참고축(종합 미포함). 할 일 정시율은 표시만 |
| 권한 | 팀장 승인 트랜잭션 조건 「현재 leaderUid null 또는 본인」 |
| 회의록 | 화자 분리·녹음 없음, AI 요약은 키 유무로 숨김 |
| 프론트 | shadcn/ui, 간트 SVG 직접 |
| 개발 범위 | §2.6 일정·§2.7 컷라인·§2.8 순서 **변경 금지** |
| 산출물 | HTML 생성 금지(이 문서는 .md만) |
| 보류(기재 안 함) | Blob 고아 파일 정리, UTC·시계 오프셋 보정 상세, 집계 위치(클라 reduce) 세부 — 구현 중 자연 해결 |

### A.13 새 세션 첫 30분 체크리스트

1. `firestore.rules` 배포 → rules-unit-testing으로 ①anonymous 거부(로그인 안 한 유저) ②비멤버 거부 ③`events` update/delete 401 ④`at != request.time`(클라이언트 시각 작성) 401 ⑤팀장 승인 교체 성공 — 전부 통과 기록.
2. 팀 생성 → 초대 링크 → 합류(트랜잭션) 성공.
3. `api/blob-token` 로컬 검증: 비멤버 401, 멤버 발급 → 업로드 → `files` 문서 생성.
4. `bun run seed` 후 대시보드가 1개월치 시간축·막대·쏠림·경고를 표시.
5. 시크릿 창: 데모 계정 로그인 → 문서 저장(버전 2개) → 파일 업로드 → 할 일 완료 → 회의 참석 → **대시보드에 자신의 마커가 생기는지** 확인.
6. 배포 후 랜딩 OG·데모 자격증명 확인, 심사 기간(09-04~07) 매일 GET 헬스체크.

---

## 출처

- 전시관 Firestore (공개 읽기, `projectId: auraproject-dd957`) — 26개 출품작 08-29 재조회
- 역량 평가를 통한 팀원 모집 플랫폼 — https://scnu-teammate.vercel.app/
- Firebase Storage 과금 변경 FAQ — https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Firebase 요금제 — https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Vercel Blob 사용량·요금 — https://vercel.com/docs/vercel-blob/usage-and-pricing
- Vercel Hobby 플랜 — https://vercel.com/docs/plans/hobby
- 대회 플랫폼 소스 — https://github.com/LimJongTak/auraproject

*전시작 수·호스팅·스택 확인은 2026-08-29 실측. Firebase·Vercel 한도는 같은 날 공식 문서 기준.*

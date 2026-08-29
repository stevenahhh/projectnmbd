# 팀플 원장 — 개발일지 (devlog)

> 루브릭 「AI 개발과정 · AI 문제해결」 20점의 증거물이다. 실패-수정 커밋에는
> `시도:/실패:/원인:/해결:` 4줄 규약을 지켰고, 기재된 커밋 해시는 전부 실제 리포 히스토리에 존재한다.
> 개발 방식: 계획 파일(`.omo/plans/teamledger-4an.md`) + REPORT_4안을 단일 진실로, AI와의 대화형 반복 개선.

## 아크 1 — macOS java 스텁이 에뮬레이터를 죽였다

- **시도**: `command -v java` 로 JDK 존재를 확인하고 Firestore 에뮬레이터를 띄워 규칙 13케이스 게이트(S10)를 실행했다.
- **실패**: `Process \`java -version\` has exited with code 1` — 에뮬레이터가 기동 직후 죽었다.
- **원인**: macOS 는 JDK 가 없어도 `/usr/bin/java` 스텁이 존재해 `command -v` 가 성공한다. 존재 여부와 실행 가능 여부가 다르다.
- **해결**: 존재 검사를 `java -version` 실제 실행 성공 판정으로 바꾸고, homebrew openjdk@21 후보 경로를 순회하도록 `scripts/test-rules.sh` 를 고쳤다.
- **커밋**: `ec306f0` (검증: 13/13 통과 · 케이스 ⑨ mutation proof)

## 아크 2 — 규칙 테스트의 Firestore 타입 이중 사본

- **시도**: 테스트 헬퍼가 `@firebase/rules-unit-testing` 이 돌려주는 Firestore 객체에 앱이 쓰는 `firebase` v12 타입을 그대로 붙였다.
- **실패**: `next build` 타입 검사에서 TS2739(`type`, `toJSON` 누락)로 빌드가 깨졌다.
- **원인**: rules-unit-testing 이 자체 번들한 Firestore 선언과 앱의 v12 선언이 서로 다른 타입 사본이라 구조적으로 호환되지 않는다. 런타임 객체는 동일하다.
- **해결**: 컨텍스트 획득 경계 한 곳에서만 단언으로 맞추고, 테스트 본문 전체는 실제 v12 API 로 타입 검사가 유지되게 했다.
- **커밋**: `ec306f0`

## 아크 3 — 규칙 13케이스와 mutation proof (S10 게이트)

- 규칙 파일(`firestore.rules`)은 REPORT A.7 원문의 결함 4건(와일드카드 매치, invites delete 허용, `deleted == true` 강제로 docs 저장 거부, members 맵 무보호)을 재현하지 않도록 전면 재작성했다 — `3212cf3`.
- 합류 전용 절(S3)이 실제로 방어하는지 증명하기 위해, 규칙에서 「변경 키가 members 하나뿐」 조건을 지우고 케이스 ⑨가 실패하는 것을 확인한 뒤 원복했다(`03-mutation-case9.log`). 테스트가 통과한 이유를 알 때까지는 통과로 치지 않았다 — `9876133`, `ec306f0`.

## 아크 4 — 데모 데이터셋의 튜플 타입 불일치와 클라이언트 SDK 계약

- **시도**: 문서 버전을 `[day, hour, actor, body, charsDelta]` 5개 데이터로 작성하고 타입은 4개짜리 튜플로 선언했다.
- **실패**: `next build` 에서 TS2322 — charsDelta 가 버전 생성 로직으로 새어나가 body 와 뒤섞였다.
- **원인**: 데이터에는 이미 charsDelta 를 포함시켰는데, 생성 코드는 이전 버전 길이로 charsDelta 를 재계산하는 구버전 설계를 따랐다.
- **해결**: 튜플 타입을 5개로 확정하고 생성 코드는 데이터의 charsDelta 를 그대로 쓰게 단순화했다.
- 같은 빌드 사이클에서 클라이언트 SDK 의 `DocumentReference` 에 `.collection()` 이 없다는 것(TS2339)도 발견해 `collection(docRef, 'versions')` 계약으로 고쳤다.
- **커밋**: `a68a393` (해당 수정분 포함)

## 아크 5 — Vercel Blob 클라이언트 토큰 API 정합

- **시도**: `/api/blob-token` 이 경로 접두사(`pathnamePrefix`)로 토큰 범위를 제한하려 했다.
- **실패**: TS2353 — `GenerateClientTokenOptions` 에 `pathnamePrefix` 프로퍼티가 없다.
- **원인**: v2 클라이언트 토큰은 pathname 단위로 발급된다. 접두사 단위가 아니라 정확한 pathname 이 필수다.
- **해결**: pathname 을 서버가 결정하도록 흐름을 바꿨다 — 클라이언트는 파일명만 보내고, 서버가 멤버 검증·용량 상한(파일당 10MB·팀당 200MB) 후 `teams/{teamId}/{uuid}/{파일명}` pathname 으로 토큰을 발급한다.
- **커밋**: `a68a393`

## 아크 6 — 테스트 픽스처의 세 가지 실수 (구현이 아니라 기대값이 틀렸던 경우)

- 알림 정렬 순서를 stage 순서로 단정했다가 dueAt 오름차순 정렬과 불일치 — 기대 배열을 바로잡았다 (`테스트: 알림 3단계 경계` 커밋).
- 기여도 테스트 헬퍼가 `uid` 필드를 쓰는데 집계 모듈 계약은 `actorUid` — 필드명을 계약에 맞췄다 (`7310c47`).
- 테스트 파일에 이스케이프 백틱(`\``)이 그대로 박혀 파싱 실패(Invalid Unicode escape) — 올바른 템플릿 리터럴로 수정했다 (`수정: contribution 테스트` 커밋).

## 아크 7 — 시드-규칙 논리 모순과 Admin SDK 결정 (계획 확정 사항)

- `events` 규칙은 `at == request.time`(서버 시각 강제)인데, 데모 데이터는 「한 달 전 기록」이어야 한다. 클라이언트 경로로 과거 시각을 쓰는 방법은 존재하지 않는다 — 존재하면 위조도 가능해진다.
- 결론: 방문자별 데모 복제만 `api/bootstrap-demo` 한 곳에서 Admin SDK 로 수행한다(C4 — 사용자 승인 예외). 규칙 자체의 검증은 Admin 복제가 규칙을 통과하지 않으므로 별도 스모크테스트로 분리했다(태스크 16).
- 이 모순의 발견과 결정이 계획 v4 에 기록되어 있고, 구현은 `a68a393` 의 bootstrap-demo 라우트로 이어졌다.

## 커밋 규약

- 기능 구현 · 기능 수정 · 테스트 · 수정 · 검증 각각 atomic commit. push 는 마지막에 일괄(사용자가 직접).
- 실패-수정 커밋에만 4줄 규약 — devlog 원료.

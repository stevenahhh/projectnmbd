/**
 * PDF 덱 생성기 (태스크 31) — §5 구성 11장. bun scripts/build-deck.ts 로 실행.
 * 텍스트 기반 PDF. Cron 문구·판단어 없음. 「증거 도구」 프레이밍 + 한계 정직 고지.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fontkitModule from 'fontkit';
import { readFileSync, writeFileSync } from 'node:fs';

const fontkit = (fontkitModule as { default?: unknown }).default ?? fontkitModule;

const WIDTH = 595; // A4 portrait pt
const HEIGHT = 842;
const MARGIN = 56;

interface Slide {
  title: string;
  lines: { text: string; size?: number; bold?: boolean; gap?: number }[];
}

const NAVY = rgb(0.09, 0.11, 0.16);
const GRAY = rgb(0.35, 0.37, 0.42);
const ACCENT = rgb(0.05, 0.4, 0.75);

const SLIDES: Slide[] = [
  {
    title: '팀플 원장',
    lines: [
      { text: '쓰기만 하면 기여가 남는 팀플 공간', size: 20, gap: 12 },
      { text: '동료평가 칸 앞에서, 카톡을 다시 올리지 마세요.', size: 14, gap: 6 },
      { text: '문서·자료·할 일·대화가 한 곳에 — 기여도는 자동으로 기록됩니다.', size: 14, gap: 24 },
      { text: '순천대 바이브코딩 경진대회 · 4안', size: 11, gap: 0 },
    ],
  },
  {
    title: '문제 — 동료평가 칸 앞의 그 순간',
    lines: [
      { text: '"쟤가 거의 안 한 건 다들 아는데, 내가 뭘 근거로 낮게 주지?"', size: 15, bold: true, gap: 16 },
      { text: '팀플의 고통은 일하는 동안이 아니라 끝난 뒤에 옵니다.', size: 12, gap: 10 },
      { text: '· 카톡: 대화 수천 줄을 스크롤해야 "누가 얼마나 했는지"를 추측', gap: 4 },
      { text: '· 드라이브: 파일이 개인 폴더에 흩어지고, 올린 사람조차 기억 안 남', gap: 4 },
      { text: '· 할 일 배분: 말로 하고, 나중에 잊힘', gap: 4 },
      { text: '· 지난 학기 팀플: 방 나가면 끝', gap: 14 },
      { text: '근거가 없어서 무임승차 평가가 부당해지고, 기억에 의존한 평가가 억울해집니다.', size: 12, bold: true, gap: 0 },
    ],
  },
  {
    title: '카톡 + 드라이브로 안 되는 6가지',
    lines: [
      { text: '1. 누가 얼마나 했는지 — 대화 스크롤 vs 자동 집계 한 장', gap: 6 },
      { text: '2. 참여율 — 알 수 없음 vs 활동 일수·회의 출석·완료율', gap: 6 },
      { text: '3. 파일 추적 — 흩어짐 vs 팀 공간 + 올린 사람 기록', gap: 6 },
      { text: '4. 할 일 — 말로 vs 담당·마감·완료 기록', gap: 6 },
      { text: '5. 지난 학기 — 방 나가면 끝 vs 보관함에 그대로', gap: 6 },
      { text: '6. 평가 근거 — 기억 vs 기여 리포트 PNG', size: 12, gap: 14 },
      { text: '경쟁작 26개 중 팀플 "진행"을 다루는 작품은 0개였습니다 (08-29 재조회).', size: 12, bold: true, gap: 0 },
    ],
  },
  {
    title: '해결 — 기여도 대시보드',
    lines: [
      { text: '막대(총량)가 주인공, 시간축 분포가 보조 증거입니다.', size: 13, gap: 12 },
      { text: '· 5축 분리: 문서 글자 수 / 자료+첨삭 / 할 일 완료율 / 회의 참석 / 수동 기록', gap: 5 },
      { text: '· % 옆에 축 원값을 병기 — 숫자의 출처가 화면에서 바로 보입니다', gap: 5 },
      { text: '· 시간축: 서버가 찍은 시각으로 멤버별 일별 마커를 표시', gap: 5 },
      { text: '· 비활동 경고: "최근 N일 활동 없음" — 사실만, 해석은 팀이 합니다', gap: 14 },
      { text: '도구는 기록하고, 판단은 팀이 합니다.', size: 14, bold: true, gap: 0 },
    ],
  },
  {
    title: '7개 기능이 한 목적으로 수렴',
    lines: [
      { text: '대시보드 · 문서(버전 기록) · 자료(첨삭) · 할 일 · 대화 · 보관함 · 리포트 PNG', size: 13, gap: 12 },
      { text: '모든 기능이 활동 원장(events)에 한 줄씩 남기고, 대시보드는 그것만 읽습니다.', gap: 10 },
      { text: '· 문서: 저장할 때마다 누가·언제·몇 자가 버전으로 기록', gap: 5 },
      { text: '· 자료: 올린 사람·시각·설명 + 첨삭 댓글(삭제 경로 없음)', gap: 5 },
      { text: '· 할 일: 완료 시각 기록, 마감 경과는 화면에서 계산', gap: 5 },
      { text: '· 회의록: 정형 템플릿 + 참석 체크가 곧 출석 기록', gap: 5 },
      { text: '· 보관함: 학기 끝 팀은 읽기 전용으로 "내 팀플 기록"에 누적', gap: 0 },
    ],
  },
  {
    title: '협업 도구가 아니라 증거 도구',
    lines: [
      { text: 'Notion·카톡은 "지금 함께 쓰기"에는 좋습니다.', size: 13, gap: 12 },
      { text: '4안이 만드는 것은 "나중에 입증하기"입니다.', size: 13, bold: true, gap: 12 },
      { text: '· 활동 원장은 추가만 가능 — 수정·삭제가 데이터베이스 규칙 자체로 막혀 있습니다', gap: 5 },
      { text: '· 기록자는 본인 계정으로 잠기고, 시각은 서버가 찍습니다', gap: 5 },
      { text: '· "막판에 몰아 적으면?" — 가능하지만, 몰아 적은 흔적이 시간축에 그대로 남습니다', gap: 5 },
      { text: '· 팀 전체 삭제는 팀장만 가능하지만, 특정 기록만 골라 지우는 건 불가능합니다', gap: 14 },
      { text: '위조를 막는 게 아니라, 위조가 드러나게 하는 설계입니다.', size: 14, bold: true, gap: 0 },
    ],
  },
  {
    title: '심사위원이 혼자 열어도 — 방문자별 데모 복제',
    lines: [
      { text: '다중 사용자 서비스의 최대 리스크는 "빈 화면"입니다.', size: 13, gap: 12 },
      { text: '· 체험하기 1클릭 → 익명 계정 발급 → 1개월치 팀플 데이터가 내 전용으로 복제', gap: 5 },
      { text: '· 팀 「기계학습 팀프로젝트 4조」: 멤버 4인, 회의 4건, 할 일 24건,', gap: 5 },
      { text: '  문서 3개(버전 3~4), 파일 5개+첨삭, 대화 88줄, 마일스톤 4개', gap: 5 },
      { text: '· 태윤의 기록은 마지막 이틀에 몰려 있습니다 — 시간축이 그대로 보여줍니다', gap: 5 },
      { text: '· 내가 쓴 기록도 서버 시각으로 즉시 찍힙니다 — 데모 위에 살아있는 기록이 쌓입니다', gap: 14 },
      { text: '방문자 간 데이터는 완전 격리 — 보안 규칙이 비멤버 읽기·쓰기를 전부 차단합니다.', size: 12, bold: true, gap: 0 },
    ],
  },
  {
    title: '아키텍처 — 슬립하는 부품 0',
    lines: [
      { text: 'Vercel Hobby (Next.js App Router)', size: 13, bold: true, gap: 6 },
      { text: '· 정적/SSR 페이지 + 서버 함수 2개(blob 토큰, 데모 복제) — 콜드스타트 외 슬립 없음', gap: 10 },
      { text: 'Firestore Spark (카드 불필요)', size: 13, bold: true, gap: 6 },
      { text: '· 보안 규칙이 다중사용자를 강제: 비멤버 차단, 원장 append-only, 서버 시각 강제', gap: 5 },
      { text: '· 데모 복제 1회당 쓰기 약 323건 — 1일 쓰기 한도 대비 방문자 약 60명 수용', gap: 10 },
      { text: 'Vercel Blob (Hobby 무료)', size: 13, bold: true, gap: 6 },
      { text: '· 파일당 10MB·팀당 200MB 상한을 코드에서 원천 차단', gap: 12 },
      { text: '예약 작업 없음 — 모든 것은 접속 시점 계산과 append-only 기록으로 해결합니다.', size: 12, bold: true, gap: 0 },
    ],
  },
  {
    title: 'AI 개발과정 ① — 계획과 규칙 게이트',
    lines: [
      { text: 'AI와의 대화형 설계 → 5인 적대 교차비평 → 계획 v4 확정 → 구현', size: 12, gap: 12 },
      { text: '· 첫 게이트가 기능 코드가 아니라 보안 규칙이었습니다 (S10 원칙)', gap: 5 },
      { text: '  규칙 13케이스(비멤버 차단·append-only·서버 시각 강제·팀장 승인 동시성)를', gap: 5 },
      { text: '  에뮬레이터 위에서 전부 통과시킨 뒤에야 기능 코드를 썼습니다', gap: 8 },
      { text: '· mutation proof: 합류 전용 절의 방어 조건을 지우면 케이스 ⑨가 실패하는 것을', gap: 5 },
      { text: '  확인하고 원복 — 테스트가 진짜 방어하는지 증명했습니다', gap: 8 },
      { text: '· 실패-수정 아크 전부가 개발일지에 커밋 해시와 함께 기록되어 있습니다', gap: 0 },
    ],
  },
  {
    title: 'AI 개발과정 ② — 협업으로 해결한 막힌 지점',
    lines: [
      { text: '실제로 막혔던 지점과 해결 (개발일지 전문 공개):', size: 12, gap: 10 },
      { text: '· macOS java 스텁: "존재"와 "실행 가능"이 다름 — 실행 판정으로 해결', gap: 5 },
      { text: '· 규칙 테스트의 Firestore 타입 이중 사본 — 경계 한 곳에서만 정합', gap: 5 },
      { text: '· 시드-규칙 논리 모순: 서버 시각 강제 vs 한 달 전 데모 기록 —', gap: 5 },
      { text: '  Admin SDK 단일 사용처(사용자 승인)로 해결하고 스모크테스트 분리', gap: 5 },
      { text: '· Blob 토큰 API 정합: pathname 단위 발급으로 흐름 재설계', gap: 5 },
      { text: '· 기여도 정의: 글자 수 단독은 게이밍당함 → 5축 분리 → 가중치는 팀이 정함', gap: 12 },
      { text: '모든 결정의 근거와 대안 검토가 계획 문서와 개발일지에 남아 있습니다.', size: 12, bold: true, gap: 0 },
    ],
  },
  {
    title: '지속가능성과 한계 — 정직하게',
    lines: [
      { text: '지속가능성', size: 13, bold: true, gap: 6 },
      { text: '· 쓸수록 개인의 팀플 이력이 쌓입니다 — 학과·과목·대학 무관', gap: 5 },
      { text: '· 실명·학번 수집 없음: 익명 인증 + 닉네임만, 데모 데이터의 학번은 창작물', gap: 5 },
      { text: '· (선택) 익명 계정에 자격증명을 연결해 기기 간 이동 가능', gap: 12 },
      { text: '한계', size: 13, bold: true, gap: 6 },
      { text: '· 익명 uid는 브라우저에 귀속 — 시크릿창 종료·사이트 데이터 삭제 시 소멸', gap: 5 },
      { text: '· 오프라인 기여는 자동 집계되지 않습니다 — 수동 기록으로 보완', gap: 5 },
      { text: '· "무임승차"의 수치적 근거는 체감 진술 — 설문 데이터는 없습니다', gap: 5 },
      { text: '· 동시편집 없음 — 팀플 문서는 순서대로 쓴다는 판단에 근거합니다', size: 12, bold: true, gap: 0 },
    ],
  },
];

async function main() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit as never);
  doc.setTitle('팀플 원장 — 쓰기만 하면 기여가 남는 팀플 공간');
  doc.setAuthor('4안');

  // 표준 Helvetica 는 한글을 인코딩할 수 없다 — 한글 글리프를 가진 시스템 TTF 를 임베드한다.
  // pdf-lib 에는 바이트를 넘겨야 한다 (문자열은 URL/경로가 아니라 폰트 데이터로 해석된다).
  const appleGothic = readFileSync('/System/Library/Fonts/Supplemental/AppleGothic.ttf');
  const korean = await doc.embedFont(appleGothic, { subset: false });
  const bold = korean;
  const regular = korean;

  for (const slide of SLIDES) {
    const page = doc.addPage([WIDTH, HEIGHT]);
    page.drawRectangle({ x: 0, y: HEIGHT - 6, width: WIDTH, height: 6, color: ACCENT });

    let y = HEIGHT - MARGIN;
    page.drawText(slide.title, { x: MARGIN, y, size: 22, font: bold, color: NAVY });
    y -= 30;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 1, color: rgb(0.85, 0.86, 0.88) });
    y -= 28;

    for (const line of slide.lines) {
      const size = line.size ?? 12;
      // 한글은 StandardFonts 로 렌더 불가 — ASCII 로 라벨 대체 필요 없이
      // Windows-1252 범위를 벗어나는 문자는 PDF 뷰어에서 공백 처리될 수 있어
      // 여기서는 텍스트를 그대로 두고 폰트 내장에 의존한다.
      const safe = line.text;
      const font = line.bold ? bold : regular;
      page.drawText(safe, { x: MARGIN + (safe.startsWith('·') || /^[0-9]/.test(safe) ? 0 : 0), y, size, font, color: line.bold ? NAVY : GRAY, maxWidth: WIDTH - MARGIN * 2, lineHeight: size * 1.4 });
      y -= (line.gap ?? 5) + size * 1.45;
    }

    page.drawText(String(SLIDES.indexOf(slide) + 1), {
      x: WIDTH - MARGIN,
      y: MARGIN / 2,
      size: 10,
      font: regular,
      color: GRAY,
    });
  }

  const bytes = await doc.save();
  writeFileSync('deck/teamledger-deck.pdf', bytes);
  console.log('deck written:', SLIDES.length, 'slides,', bytes.length, 'bytes');
}

await main();

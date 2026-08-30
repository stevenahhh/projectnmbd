/** 데모 팀의 사람과 과목 — 방문자 uid 가 0번(김민지·팀장) 자리를 차지한다. */
export const DEMO_TEAM_NAME = '인공지능공학과 · 기계학습 팀프로젝트 4조';
export const DEMO_COURSE_LABEL = '기계학습';
export const DEMO_GOAL = '캠퍼스 혼잡도 예측 모델 개발 및 발표';
export const DEMO_ARCHIVED_TEAM_NAME = '데이터베이스 · 텀프로젝트 2조';

/** Spark 2만/일 기준 방문자 약 60명 이상 수용 — 실측 약 230건, 상한 300. */
export const DEMO_DATASET_WRITE_CAP = 300;

/** 학번 창작물 — 실제 유저 수집 항목이 아니다 (C6). yyyy 2022~2026, nnnn 2001~6099, 중복 금지. */
export const DEMO_STUDENT_IDS = ['20234127', '20223845', '20242158', '20255301'];

export interface DemoMemberDef {
  nickname: string;
  roleLabel: string;
  /** 0 번이 방문자(팀장) 자리다. */
  placeholderUid: string;
  studentId: string;
}

export const DEMO_MEMBERS: DemoMemberDef[] = [
  { nickname: '김민지', roleLabel: '팀장 · 데이터', placeholderUid: 'demo-minji', studentId: DEMO_STUDENT_IDS[0] },
  { nickname: '박준호', roleLabel: '모델링', placeholderUid: 'demo-junho', studentId: DEMO_STUDENT_IDS[1] },
  { nickname: '이서연', roleLabel: '문서 · 발표', placeholderUid: 'demo-seoyeon', studentId: DEMO_STUDENT_IDS[2] },
  { nickname: '최태윤', roleLabel: '평가 · 실험', placeholderUid: 'demo-taeyun', studentId: DEMO_STUDENT_IDS[3] },
];

'use client';

import { useEffect, useRef } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'hanmok-tutorial-done';

interface Step {
  element: string;
  popover: { title: string; description: string };
}

/**
 * 튜토리얼 — 처음 들어오면 홈에서 짧게 한 번, 그다음부터는 화면마다 3스텝씩.
 * 화면에 없는 요소는 실행 직전에 걸러내므로 데이터가 비어 있어도 안전하다.
 */
const TUTORIALS: Record<string, Step[]> = {
  dashboard: [
    {
      element: '#tutorial-bars',
      popover: { title: '기여도', description: '문서·자료·할 일·회의를 쓰기만 하면 여기에 자동으로 쌓입니다' },
    },
    {
      element: '#tutorial-timeline',
      popover: {
        title: '활동 시간축',
        description:
          '총량은 몰아 적어 부풀릴 수 있지만, 서버가 찍은 시각은 못 바꿉니다. 칸에 마우스를 올리면 그날 무엇을 했는지 보여요',
      },
    },
    {
      element: '#tutorial-export',
      popover: { title: '기여 리포트', description: '동료평가에 첨부할 한 장. PNG로 저장됩니다' },
    },
  ],
  tasks: [
    { element: '#tut-task-add', popover: { title: '할 일 추가', description: '무엇을·누가·언제까지만 정하면 끝이에요' } },
    {
      element: '#tut-task-todo',
      popover: { title: '진행 중', description: '마감이 가까우면 D-표시, 지나면 빨간 배지로 바로 보입니다' },
    },
    { element: '#tut-task-done', popover: { title: '완료', description: '완료한 시각이 그대로 남아 기여도에 반영됩니다' } },
  ],
  chat: [
    { element: '#tut-chat-list', popover: { title: '팀 대화', description: '팀 프로젝트 이야기는 여기에 모아둡니다' } },
    { element: '#tut-chat-input', popover: { title: '보내기', description: '보낸 글자 수도 활동 기록으로 함께 남아요' } },
  ],
  meetings: [
    { element: '#tut-meeting-new', popover: { title: '회의록 작성', description: '주제·일시·장소·참석자·요약을 정해진 형식으로' } },
    {
      element: '#tut-meeting-card',
      popover: { title: '카드에는 요약만', description: '카드를 누르면 문서 형태의 회의록 전문이 열립니다' },
    },
  ],
  docs: [
    { element: '#tut-doc-list', popover: { title: '문서 목록', description: '팀 문서를 여기서 만들고 골라 씁니다' } },
    { element: '#tut-doc-save', popover: { title: '저장', description: '저장할 때마다 새 버전이 만들어집니다' } },
    {
      element: '#tut-doc-versions',
      popover: { title: '버전 관리', description: '누가 언제 몇 자를 고쳤는지 남고, 예전 버전도 그대로 열어볼 수 있어요' },
    },
  ],
  files: [
    { element: '#tut-file-upload', popover: { title: '자료 올리기', description: '파일당 10MB까지, 올린 사람과 시각이 남아요' } },
    { element: '#tut-file-list', popover: { title: '미리보기와 첨삭', description: '이미지·PDF는 바로 보이고, 첨삭 댓글을 남길 수 있어요' } },
  ],
  gantt: [
    { element: '#tut-timeline-chart', popover: { title: '타임라인', description: '막대나 항목을 클릭하면 제목과 기간을 고칠 수 있어요' } },
    { element: '#tut-timeline-legend', popover: { title: '색으로 읽기', description: '예정·완료·마감 지남을 색으로 구분합니다' } },
    { element: '#tut-timeline-history', popover: { title: '수정 이력', description: '누가 언제 기간을 바꿨는지 전부 남습니다' } },
  ],
  members: [
    { element: '#tut-member-list', popover: { title: '참여자', description: '역할을 붙여두면 할 일 담당이 분명해져요' } },
    { element: '#tut-member-leader', popover: { title: '팀 관리', description: '역할 배정·보관·삭제는 팀장만 할 수 있어요' } },
  ],
};

export function Tutorial({ tab = 'dashboard' }: { tab?: string }) {
  const driverRef = useRef<Driver | null>(null);

  const start = (key: string) => {
    const steps = (TUTORIALS[key] ?? []).filter((step) => document.querySelector(step.element));
    if (steps.length === 0) return;
    driverRef.current?.destroy();
    driverRef.current = driver({
      showProgress: true,
      nextBtnText: '다음',
      prevBtnText: '이전',
      doneBtnText: '완료',
      steps: steps as never,
      onDestroyed: () => {
        driverRef.current = null;
        try {
          localStorage.setItem(STORAGE_KEY, '1');
        } catch {
          // localStorage 사용 불가 환경도 무시
        }
      },
    });
    driverRef.current.drive();
  };

  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      seen = false;
    }
    if (seen) return;
    // 첫 방문은 홈에서 짧게 한 번만
    const timer = setTimeout(() => start('dashboard'), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Button id="tutorial-replay" variant="ghost" size="sm" onClick={() => start(tab)}>
      이 화면 사용법
    </Button>
  );
}

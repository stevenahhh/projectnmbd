'use client';

import { useEffect, useRef } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'teamledger-tutorial-done';

/**
 * 튜토리얼 5스텝 (G6) — 발표평가가 없는 대회이므로 말풍선 ②③이 사실상의 발표다.
 * 문안은 계획 확정 문안 그대로다.
 */
const STEPS = [
  {
    element: '#tutorial-bars',
    popover: {
      title: '기여도 막대',
      description: '쓰기만 하면 자동으로 쌓입니다',
    },
  },
  {
    element: '#tutorial-timeline',
    popover: {
      title: '시간축 분포 (서버 시각)',
      description:
        '총량은 몰아 적어 부풀릴 수 있지만, 서버가 찍은 시각은 못 바꿉니다. 태윤님이 마지막 이틀에 몰린 게 그대로 보이죠?',
    },
  },
  {
    element: '#tutorial-ledger',
    popover: {
      title: '활동 원장 배지',
      description:
        '이 기록들은 추가만 되고 수정·삭제가 데이터베이스 규칙 자체로 막혀 있습니다. 도구는 기록하고, 판단은 팀이 합니다',
    },
  },
  {
    element: '#tutorial-tasks-tab',
    popover: {
      title: '할 일 + 간트',
      description: '마감에서 역산한 마일스톤. 드래그로 조정하세요',
    },
  },
  {
    element: '#tutorial-export',
    popover: {
      title: '기여 리포트 내보내기',
      description: '동료평가에 첨부할 기여 리포트 한 장. PNG로 저장됩니다',
    },
  },
] as const;

export function Tutorial({ onReplayOnly = false }: { onReplayOnly?: boolean }) {
  const driverRef = useRef<Driver | null>(null);

  const start = () => {
    if (driverRef.current) return;
    driverRef.current = driver({
      showProgress: true,
      steps: STEPS.map((step) => ({ ...step, element: step.element }) as never),
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
    if (onReplayOnly) return;
    // 첫 방문 자동 실행 — 시크릿창 = 항상 첫 방문
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      seen = false;
    }
    if (!seen) {
      const timer = setTimeout(() => start(), 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReplayOnly]);

  return (
    <Button
      id="tutorial-replay"
      variant="ghost"
      size="sm"
      onClick={() => {
        driverRef.current?.destroy();
        start();
      }}
    >
      튜토리얼 다시 보기
    </Button>
  );
}

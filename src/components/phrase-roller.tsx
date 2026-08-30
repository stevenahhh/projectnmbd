'use client';

import { useEffect, useState, type CSSProperties } from 'react';

/** 위에서 아래로 흘러 바뀌는 수식어. */
const PHRASES = [
  '버스 기사 없어지는',
  '카톡 뒤져보지 않아도 되는',
  '파일 관리가 편한',
  '핑계댈 수 없는',
  '지워지지 않는 기록으로 관리하는',
  '당신을 성장하게 해주는',
];

/** 이 한 줄만 빛이 흐른다 — 나머지와 같은 무게로 두면 눈에 걸리지 않는다. */
const HIGHLIGHT = '당신을 성장하게 해주는';

const HOLD_MS = 1500;
const SLIDE_MS = 380;
const TAIL = '팀프로젝트 관리 시스템';

/**
 * 캐치프레이즈의 앞말이 아래로 굴러간다.
 *
 * 위치는 인라인 transform 으로 준다. Tailwind 의 translate 유틸리티는 `--tw-translate-y`
 * 커스텀 속성을 거치는데 그 값은 transition 이 보간하지 못해, 투명도만 바뀌고 위치는 튄다.
 *
 * 문구 길이가 두 배 넘게 차이 나서 모두 같은 칸에 겹쳐 두고 칸 너비를 가장 긴 문구에 맞춘다.
 * 그래야 바뀔 때마다 뒷말이 좌우로 흔들리지 않는다.
 */
export function PhraseRoller({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % PHRASES.length), HOLD_MS);
    return () => clearInterval(timer);
  }, []);

  // 방금 자리를 내준 문구만 아래로 빠진다. 나머지는 위에서 차례를 기다린다.
  const leaving = (index + PHRASES.length - 1) % PHRASES.length;

  const slotStyle = (position: number): CSSProperties => {
    const offsetY = position === index ? '0%' : position === leaving ? '110%' : '-110%';
    return {
      gridArea: '1 / 1',
      justifySelf: 'end',
      transform: `translateY(${offsetY})`,
      opacity: position === index ? 1 : 0,
      transition: `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SLIDE_MS}ms ease-out`,
      willChange: 'transform, opacity',
    };
  };

  return (
    <p className={`flex flex-wrap items-center gap-x-2 ${className ?? ''}`}>
      {/* 1.5초마다 읽어주면 방해가 된다 — 낭독용으로는 한 문장만 둔다 */}
      <span className="sr-only">{`지워지지 않는 기록으로 관리하는 ${TAIL}`}</span>
      <span aria-hidden className="grid overflow-hidden py-1">
        {PHRASES.map((phrase, position) => (
          <span
            key={phrase}
            style={slotStyle(position)}
            className={`font-semibold whitespace-nowrap ${phrase === HIGHLIGHT ? 'phrase-shine' : 'text-foreground'}`}
          >
            {phrase}
          </span>
        ))}
      </span>
      <span aria-hidden className="text-muted-foreground">
        {TAIL}
      </span>
    </p>
  );
}

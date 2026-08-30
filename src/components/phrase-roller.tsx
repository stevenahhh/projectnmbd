'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

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
 * 칸 너비는 지금 보이는 문구를 따라간다. 가장 긴 문구에 고정해 두면 짧은 문구일 때
 * 한쪽에 빈 자리가 남아 문장 전체가 가운데에서 밀려 보인다. 너비도 같은 시간 동안
 * 함께 움직여서, 굴러 내려온 줄이 자리를 잡을 때 문장 전체가 가운데에 선다.
 */
export function PhraseRoller({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const slots = useRef<(HTMLSpanElement | null)[]>([]);

  // 너비를 재는 동안에는 칸을 묶어두지 않는다 — 묶은 뒤 재면 제 폭이 아니라 칸 폭이 나온다
  useLayoutEffect(() => {
    setWidths(slots.current.map((node) => node?.offsetWidth ?? 0));
  }, []);

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
      justifySelf: 'start',
      transform: `translateY(${offsetY})`,
      opacity: position === index ? 1 : 0,
      transition: `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SLIDE_MS}ms ease-out`,
      willChange: 'transform, opacity',
    };
  };

  const boxStyle: CSSProperties = {
    width: widths[index] ? `${widths[index]}px` : undefined,
    transition: `width ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  };

  return (
    <p className={`flex flex-wrap items-center gap-x-2 ${className ?? ''}`}>
      {/* 1.5초마다 읽어주면 방해가 된다 — 낭독용으로는 한 문장만 둔다 */}
      <span className="sr-only">{`지워지지 않는 기록으로 관리하는 ${TAIL}`}</span>
      <span aria-hidden style={boxStyle} className="grid overflow-hidden py-1">
        {PHRASES.map((phrase, position) => (
          <span
            key={phrase}
            ref={(node) => {
              slots.current[position] = node;
            }}
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

'use client';

import { useState } from 'react';
import type { MemberContribution } from '@/lib/contribution';
import type { Team } from '@/lib/types';

/** 살짝 채도를 낮춘 원색 — 인쇄해도 서로 구분된다. */
const SLICE_COLORS = ['#4b5bd6', '#3f9e78', '#c07b2f', '#7c5cd6', '#2f8fbf', '#c4453c', '#5b6478'];

const SIZE = 300;
const CENTER = SIZE / 2;
const R_OUTER = 96;
const R_INNER = 58;

function polar(radius: number, angle: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
}

function donutSlice(startAngle: number, endAngle: number): string {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const [x1, y1] = polar(R_OUTER, startAngle);
  const [x2, y2] = polar(R_OUTER, endAngle);
  const [x3, y3] = polar(R_INNER, endAngle);
  const [x4, y4] = polar(R_INNER, startAngle);
  return [
    `M ${x1} ${y1}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

function labelAnchor(x: number): 'start' | 'middle' | 'end' {
  if (x < CENTER - 6) return 'end';
  if (x > CENTER + 6) return 'start';
  return 'middle';
}

interface Slice {
  member: MemberContribution;
  start: number;
  end: number;
  color: string;
}

/** 비중을 시계방향 각도 구간으로 눕힌다. 렌더 밖 순수 함수로 둔다. */
function buildSlices(members: MemberContribution[], total: number): Slice[] {
  const slices: Slice[] = [];
  let cursor = 0;
  for (const [index, member] of members.entries()) {
    const sweep = (member.percent / total) * 360;
    slices.push({ member, start: cursor, end: cursor + sweep, color: SLICE_COLORS[index % SLICE_COLORS.length] });
    cursor += sweep;
  }
  return slices;
}

interface Hover {
  x: number;
  y: number;
  member: MemberContribution;
}

interface ContributionPieProps {
  team: Team;
  members: MemberContribution[];
}

/** 기여도 원 그래프 — 이름은 늘 보이고, 자세한 수치는 올려야 나온다. */
export function ContributionPie({ team, members }: ContributionPieProps) {
  const [hover, setHover] = useState<Hover | null>(null);

  const total = members.reduce((sum, member) => sum + member.percent, 0);
  if (total <= 0) {
    return <p className="text-muted-foreground py-10 text-center text-sm">아직 기여 기록이 없어요</p>;
  }

  const slices = buildSlices(members, total);

  const track = (event: { clientX: number; clientY: number }, member: MemberContribution) =>
    setHover({ x: event.clientX, y: event.clientY, member });

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-8">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[300px] shrink-0" role="img" aria-label="기여도 원 그래프">
        {slices.map(({ member, start, end, color }) => {
          const mid = (start + end) / 2;
          const [lx, ly] = polar(R_OUTER + 18, mid);
          const [tx, ty] = polar((R_OUTER + R_INNER) / 2, mid);
          const anchor = labelAnchor(lx);
          const wide = end - start >= 26;
          return (
            <g
              key={member.uid}
              className="cursor-pointer"
              onMouseMove={(e) => track(e, member)}
              onMouseLeave={() => setHover(null)}
            >
              {slices.length === 1 ? (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={(R_OUTER + R_INNER) / 2}
                  fill="none"
                  stroke={color}
                  strokeWidth={R_OUTER - R_INNER}
                />
              ) : (
                <path
                  d={donutSlice(start, end)}
                  fill={color}
                  opacity={hover && hover.member.uid !== member.uid ? 0.45 : 1}
                  className="transition-opacity"
                />
              )}
              {wide ? (
                <text x={tx} y={ty + 4} fontSize={12} fontWeight={600} fill="#ffffff" textAnchor="middle">
                  {member.percent.toFixed(0)}%
                </text>
              ) : null}
              <text
                x={lx}
                y={ly}
                fontSize={12}
                textAnchor={anchor}
                fill="currentColor"
                className="fill-foreground font-medium"
              >
                {team.members[member.uid]?.nickname ?? '—'}
                {wide ? '' : ` ${member.percent.toFixed(0)}%`}
              </text>
            </g>
          );
        })}
        <text x={CENTER} y={CENTER - 4} fontSize={13} textAnchor="middle" className="fill-muted-foreground">
          팀 기여 분포
        </text>
        <text x={CENTER} y={CENTER + 16} fontSize={13} textAnchor="middle" className="fill-muted-foreground">
          {members.length}명
        </text>
      </svg>

      <ul className="flex w-full min-w-0 flex-col gap-2">
        {slices.map(({ member, color }) => {
          const info = team.members[member.uid];
          return (
            <li
              key={member.uid}
              className="hover:bg-muted/60 flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm transition-colors"
              onMouseMove={(e) => track(e, member)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex items-center gap-2.5">
                <span className="size-3 shrink-0 rounded-[3px]" style={{ background: color }} />
                <span className="min-w-0 flex-1 truncate">
                  {info?.nickname ?? '—'}
                  {info?.roleLabel ? <span className="text-muted-foreground ml-2 text-xs">{info.roleLabel}</span> : null}
                  {team.leaderUid === member.uid ? (
                    <span className="bg-primary text-primary-foreground ml-2 rounded px-1.5 py-0.5 text-[10px]">팀장</span>
                  ) : null}
                </span>
                {member.inactive ? (
                  <span className="text-destructive text-xs">{member.inactiveDays ?? '—'}일 무활동</span>
                ) : null}
                <span className="tabular-nums">{member.percent.toFixed(0)}%</span>
              </div>
              <p className="text-muted-foreground pl-[22px] text-[11px]">
                문서 {member.raw.docChars.toLocaleString()}자 · 자료 {member.raw.fileCount} · 할 일{' '}
                {member.raw.taskDone}/{member.raw.taskAssigned} · 회의 {member.raw.meetingAttend}회 · 활동{' '}
                {member.raw.activeDays}일
              </p>
            </li>
          );
        })}
      </ul>

      {hover ? (
        <div
          className="pointer-events-none fixed z-50 w-60 -translate-x-1/2 -translate-y-full"
          style={{ left: hover.x, top: hover.y - 12 }}
        >
          <div className="bg-popover text-popover-foreground rounded-lg border p-3 shadow-lg">
            <p className="text-xs font-semibold">
              {team.members[hover.member.uid]?.nickname ?? '—'} · {hover.member.percent.toFixed(1)}%
            </p>
            <ul className="text-muted-foreground mt-1.5 flex flex-col gap-0.5 text-[11px]">
              <li>문서 {hover.member.raw.docChars.toLocaleString()}자</li>
              <li>
                자료 {hover.member.raw.fileCount}건 · 첨삭 {hover.member.raw.commentCount}건
              </li>
              <li>
                할 일 {hover.member.raw.taskDone}/{hover.member.raw.taskAssigned} · 정시 {hover.member.raw.taskOnTime}
              </li>
              <li>
                회의 {hover.member.raw.meetingAttend}회 · 대화 {hover.member.raw.messageCount}건
              </li>
              <li>활동 {hover.member.raw.activeDays}일</li>
              {hover.member.inactive ? (
                <li className="text-destructive">최근 {hover.member.inactiveDays ?? '—'}일 활동 없음</li>
              ) : null}
            </ul>
          </div>
          <div className="bg-popover mx-auto -mt-1.5 size-3 rotate-45 border-r border-b" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * 기여도 집계 — A.6 공식 그대로. 클라이언트 reduce 로만 계산한다.
 * 집계 캐시 문서·집계 인프라를 새로 만들지 않는다 (결정 D8).
 *
 * 이 모듈은 판정하지 않는다. 5축을 따로 세고, 공백이 보이게 할 뿐이다 (§3).
 */
import { dayKeyKST, eachDayKeyKST } from './time';
import { inactiveThresholdDays } from './notifications';
import type { ContributionWeights, EventType } from './types';

export interface AggregatableEvent {
  actorUid: string;
  type: EventType;
  payload: Record<string, unknown>;
  at: Date | null;
}

export interface AggregatableTask {
  id: string;
  assigneeUid: string;
  dueAt: Date;
  status: string;
}

export interface ContributionInput {
  memberUids: string[];
  events: AggregatableEvent[];
  tasks: AggregatableTask[];
  weights: ContributionWeights;
  startAt: Date;
  dueAt: Date;
  now: Date;
}

/** 종합 %에 들어가는 5축. 활동일은 여기 없다 — 참고축이다. */
export interface Axes {
  doc: number;
  file: number;
  task: number;
  meeting: number;
  note: number;
}

/** % 옆에 병기하는 축 원값 — 숫자의 출처를 화면에서 바로 보이게 한다. */
export interface RawCounts {
  docChars: number;
  fileCount: number;
  commentCount: number;
  taskAssigned: number;
  taskDone: number;
  taskOnTime: number;
  meetingAttend: number;
  noteCount: number;
  messageCount: number;
  activeDays: number;
}

export interface MemberContribution {
  uid: string;
  axes: Axes;
  raw: RawCounts;
  score: number;
  percent: number;
  lastActiveAt: Date | null;
  inactiveDays: number | null;
  inactive: boolean;
}

export interface ContributionResult {
  members: MemberContribution[];
  /** 최대 기여자 비중이 60% 이상이면 분포만 표시한다. 판단어 없음 (§2.8-2). */
  concentrated: boolean;
  topShare: number;
  inactiveThreshold: number;
  totalActiveDays: number;
  timelineDays: string[];
  timeline: Record<string, Record<string, number>>;
}

const AXIS_KEYS: (keyof Axes)[] = ['doc', 'file', 'task', 'meeting', 'note'];

function numberFrom(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function stringFrom(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function aggregateContribution(input: ContributionInput): ContributionResult {
  const { memberUids, events, tasks, weights, startAt, dueAt, now } = input;

  const raw = new Map<string, RawCounts>();
  const activeDaySets = new Map<string, Set<string>>();
  const lastActive = new Map<string, Date>();
  const timeline: Record<string, Record<string, number>> = {};

  for (const uid of memberUids) {
    raw.set(uid, {
      docChars: 0,
      fileCount: 0,
      commentCount: 0,
      taskAssigned: 0,
      taskDone: 0,
      taskOnTime: 0,
      meetingAttend: 0,
      noteCount: 0,
      messageCount: 0,
      activeDays: 0,
    });
    activeDaySets.set(uid, new Set());
    timeline[uid] = {};
  }

  // 할 일 담당 수는 원장이 아니라 현재 상태에서 센다.
  for (const task of tasks) {
    const counts = raw.get(task.assigneeUid);
    if (counts) counts.taskAssigned += 1;
  }
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  for (const event of events) {
    const counts = raw.get(event.actorUid);
    if (!counts) continue;

    const dayKey = dayKeyKST(event.at);
    if (dayKey) {
      activeDaySets.get(event.actorUid)?.add(dayKey);
      timeline[event.actorUid][dayKey] = (timeline[event.actorUid][dayKey] ?? 0) + 1;
    }
    if (event.at) {
      const previous = lastActive.get(event.actorUid);
      if (!previous || event.at.getTime() > previous.getTime()) lastActive.set(event.actorUid, event.at);
    }

    switch (event.type) {
      case 'doc.edit':
        // 증가분만 합산한다 — 지웠다 다시 쓰는 방식으로 부풀릴 수 없게.
        counts.docChars += Math.max(numberFrom(event.payload.charsDelta), 0);
        break;
      case 'file.upload':
        counts.fileCount += 1;
        break;
      case 'file.comment':
        counts.commentCount += 1;
        break;
      case 'task.complete': {
        counts.taskDone += 1;
        // payload.onTime 은 쓰되 신뢰하지 않는다.
        // 정시 여부는 원장이 찍힌 시각과 마감을 서버 시각끼리 대조해 판정한다.
        const task = taskById.get(stringFrom(event.payload.taskId));
        if (task && event.at) {
          if (event.at.getTime() <= task.dueAt.getTime()) counts.taskOnTime += 1;
        } else if (event.payload.onTime === true) {
          counts.taskOnTime += 1;
        }
        break;
      }
      case 'meeting.attend':
        counts.meetingAttend += 1;
        break;
      case 'note.add':
        counts.noteCount += 1;
        break;
      case 'message.post':
        counts.messageCount += 1;
        break;
      default:
        break;
    }
  }

  for (const uid of memberUids) {
    const counts = raw.get(uid)!;
    counts.activeDays = activeDaySets.get(uid)!.size;
  }

  const axesByUid = new Map<string, Axes>();
  for (const uid of memberUids) {
    const counts = raw.get(uid)!;
    axesByUid.set(uid, {
      doc: counts.docChars,
      file: counts.fileCount + counts.commentCount,
      // 종합에 들어가는 할 일 축은 완료율이다 (A.6). 정시율은 표시만 한다.
      task: counts.taskAssigned > 0 ? counts.taskDone / counts.taskAssigned : 0,
      meeting: counts.meetingAttend,
      note: counts.noteCount,
    });
  }

  const maxByAxis: Axes = { doc: 0, file: 0, task: 0, meeting: 0, note: 0 };
  for (const axisKey of AXIS_KEYS) {
    maxByAxis[axisKey] = Math.max(0, ...memberUids.map((uid) => axesByUid.get(uid)![axisKey]));
  }

  const scores = new Map<string, number>();
  for (const uid of memberUids) {
    const axes = axesByUid.get(uid)!;
    let score = 0;
    for (const axisKey of AXIS_KEYS) {
      const max = maxByAxis[axisKey];
      if (max > 0) score += weights[axisKey] * (axes[axisKey] / max);
    }
    scores.set(uid, score);
  }

  const scoreSum = memberUids.reduce((sum, uid) => sum + scores.get(uid)!, 0);
  const threshold = inactiveThresholdDays(startAt, dueAt);
  const thresholdMs = threshold * 86400000;

  const members: MemberContribution[] = memberUids.map((uid) => {
    const last = lastActive.get(uid) ?? null;
    const inactiveDays = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : null;
    return {
      uid,
      axes: axesByUid.get(uid)!,
      raw: raw.get(uid)!,
      score: scores.get(uid)!,
      percent: scoreSum > 0 ? (scores.get(uid)! / scoreSum) * 100 : 0,
      lastActiveAt: last,
      inactiveDays,
      inactive: !last || now.getTime() - last.getTime() >= thresholdMs,
    };
  });

  members.sort((a, b) => b.percent - a.percent);
  const topShare = members.length > 0 ? members[0].percent / 100 : 0;

  const timelineEnd = now.getTime() < dueAt.getTime() ? now : dueAt;
  const timelineDays = eachDayKeyKST(startAt, timelineEnd);

  return {
    members,
    concentrated: topShare >= 0.6,
    topShare,
    inactiveThreshold: threshold,
    totalActiveDays: timelineDays.length,
    timelineDays,
    timeline,
  };
}

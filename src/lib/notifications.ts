/**
 * 마감 알림 — 서버 예약 발송 없이 클라이언트가 접속·탭 오픈 중 계산한다 (§2.8-6).
 * Hobby Cron 은 1일 1회라 서버 예약이 불가능하고, Cron 자체가 금지 목록이다.
 */
export type NotifyStage = 'tomorrow' | 'hours3' | 'hour1';

export const STAGE_LABEL: Record<NotifyStage, string> = {
  tomorrow: '내일까지입니다',
  hours3: '3시간 남았습니다',
  hour1: '1시간 남았습니다',
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/**
 * 마감까지 남은 시간이 어느 단계에 속하는지.
 * 이미 지난 마감은 null — 마감 경과는 알림이 아니라 렌더 계산이다 (결정 D6).
 */
export function stageFor(dueAt: Date, now: Date): NotifyStage | null {
  const remaining = dueAt.getTime() - now.getTime();
  if (remaining <= 0) return null;
  if (remaining <= HOUR) return 'hour1';
  if (remaining <= 3 * HOUR) return 'hours3';
  if (remaining <= DAY) return 'tomorrow';
  return null;
}

/** 비활동 경고 임계 — 고정 5일이 아니라 팀플 기간의 20%, 최소 1일 (§2.8-6). */
export function inactiveThresholdDays(startAt: Date, dueAt: Date): number {
  const spanDays = (dueAt.getTime() - startAt.getTime()) / DAY;
  return Math.max(1, Math.round(spanDays * 0.2));
}

export interface DeadlineItem {
  id: string;
  title: string;
  dueAt: Date;
  status: string;
}

export interface StagedNotification {
  id: string;
  itemId: string;
  title: string;
  stage: NotifyStage;
  dueAt: Date;
  message: string;
}

/** 단계별로 항목당 정확히 1건씩만 만든다 — 같은 단계 중복 발화 금지. */
export function buildNotifications(items: DeadlineItem[], now: Date): StagedNotification[] {
  const out: StagedNotification[] = [];
  for (const item of items) {
    if (item.status === 'done') continue;
    const stage = stageFor(item.dueAt, now);
    if (!stage) continue;
    out.push({
      id: `${item.id}:${stage}`,
      itemId: item.id,
      title: item.title,
      stage,
      dueAt: item.dueAt,
      message: `${item.title} — ${STAGE_LABEL[stage]}`,
    });
  }
  return out.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

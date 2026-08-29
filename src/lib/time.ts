import { Timestamp } from 'firebase/firestore';

const KST = 'Asia/Seoul';

/** 원장의 UTC 시각을 화면에서만 KST 로 렌더한다. */
export function formatKST(value: Date | Timestamp | null | undefined, style: 'date' | 'datetime' | 'time' = 'datetime'): string {
  const date = toDate(value);
  if (!date) return '—';
  const options: Intl.DateTimeFormatOptions =
    style === 'date'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : style === 'time'
        ? { hour: '2-digit', minute: '2-digit', hour12: false }
        : { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('ko-KR', { ...options, timeZone: KST }).format(date);
}

export function toDate(value: Date | Timestamp | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate();
  return null;
}

/** KST 기준 날짜 키 — 활동 일수·시간축 버킷에 쓴다. */
export function dayKeyKST(value: Date | Timestamp | null | undefined): string | null {
  const date = toDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: KST }).format(date);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function eachDayKeyKST(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getTime());
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = dayKeyKST(cursor);
    if (key && !keys.includes(key)) keys.push(key);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

/** D-n 표기. 마감이 지났으면 D+n. */
export function dDay(due: Date | Timestamp | null | undefined, now: Date = new Date()): string {
  const date = toDate(due);
  if (!date) return '—';
  const diff = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'D-DAY';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

/** 마감 경과 판정은 저장이 아니라 렌더 시점 계산이다 (결정 D6 — 경과 이벤트는 존재하지 않음). */
export function isOverdue(dueAt: Date | Timestamp | null | undefined, status: string, now: Date = new Date()): boolean {
  const date = toDate(dueAt);
  if (!date) return false;
  return status !== 'done' && date.getTime() < now.getTime();
}

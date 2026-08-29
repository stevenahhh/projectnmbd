import type { Timestamp } from 'firebase/firestore';

/** A.5 이벤트 원장 — 모든 UI 행동이 여기 한 줄로 남는다. */
export type EventType =
  | 'doc.edit'
  | 'file.upload'
  | 'file.comment'
  | 'task.create'
  | 'task.complete'
  | 'meeting.create'
  | 'meeting.attend'
  | 'message.post'
  | 'note.add'
  | 'team.create'
  | 'member.join'
  | 'role.assign'
  | 'leader.request'
  | 'leader.approve'
  | 'team.archive';
// 'task.overdue' 는 존재하지 않는다 — 마감 경과는 렌더 시점 계산이다 (결정 D6).

export interface LedgerEvent {
  id: string;
  actorUid: string;
  type: EventType;
  payload: Record<string, unknown>;
  at: Timestamp | null;
}

export interface TeamMember {
  nickname: string;
  roleLabel: string;
  joinedAt: Timestamp;
  inviteToken?: string;
}

/** A.6 기여도 가중치 — 읽기 전용 상시 표기. 편집 UI 없음. */
export interface ContributionWeights {
  doc: number;
  file: number;
  task: number;
  meeting: number;
  note: number;
}

export interface Team {
  id: string;
  name: string;
  courseLabel: string;
  goal: string;
  startAt: Timestamp;
  dueAt: Timestamp;
  leaderUid: string | null;
  members: Record<string, TeamMember>;
  weights: ContributionWeights;
  archived: boolean;
  deleted: boolean;
  createdAt?: Timestamp;
}

export interface UserProfile {
  nickname: string;
  skillTags: string[];
  github?: string;
  portfolio?: string;
  interests: string[];
  teams: Record<string, string>;
  createdAt?: Timestamp;
  onboardedAt?: Timestamp | null;
  demoBootstrappedAt?: Timestamp | null;
}

export type TaskStatus = 'todo' | 'done';

export interface TeamTask {
  id: string;
  title: string;
  desc?: string;
  actorUid: string;
  assigneeUid: string;
  dueAt: Timestamp;
  status: TaskStatus;
  doneAt?: Timestamp | null;
  /** 간트 마일스톤 막대 — 이 값이 있으면 간트 막대로 렌더한다. */
  milestoneId?: string | null;
  milestoneStartAt?: Timestamp | null;
  order: number;
}

export interface Meeting {
  id: string;
  title: string;
  actorUid: string;
  startedAt: Timestamp;
  durationMin: number;
  place: string;
  online: boolean;
  attendeeUids: string[];
  summary3: string;
  body: string;
}

export interface Message {
  id: string;
  actorUid: string;
  text: string;
  at: Timestamp | null;
}

export interface TeamDoc {
  id: string;
  title: string;
  body: string;
  latestVersion: number;
  updatedBy: string;
  lockedBy?: string | null;
  lockedAt?: Timestamp | null;
}

export interface DocVersion {
  id: string;
  body: string;
  charsDelta: number;
  actorUid: string;
  at: Timestamp | null;
  version: number;
}

export interface TeamFile {
  id: string;
  name: string;
  blobUrl: string;
  contentType: string;
  sizeBytes: number;
  actorUid: string;
  caption: string;
  uploadedAt: Timestamp | null;
}

export interface FileComment {
  id: string;
  actorUid: string;
  text: string;
  at: Timestamp | null;
}

export type LeaderRequestStatus = 'pending' | 'approved' | 'void';

export interface LeaderRequest {
  id: string;
  targetUid: string;
  requesterUid: string;
  status: LeaderRequestStatus;
  at: Timestamp | null;
}

export interface Milestone {
  id: string;
  title: string;
  startAt: Timestamp;
  endAt: Timestamp;
}

export const DEFAULT_WEIGHTS: ContributionWeights = { doc: 1, file: 1, task: 1, meeting: 1, note: 1 };

/** 파일 상한 — Blob 한도 초과 시 과금이 아니라 30일 정지라 코드에서 원천 차단한다. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TEAM_BYTES = 200 * 1024 * 1024;

/**
 * 부트스트랩이 한 번에 써넣는 문서들의 모양.
 * 빌더(demo-dataset.ts)와 쓰기(api/bootstrap-demo)가 이 계약 하나만 공유한다.
 */
import type { ContributionWeights, EventType } from '../types';

export interface DemoDataset {
  teamId: string;
  archivedTeamId: string;
  team: {
    name: string;
    courseLabel: string;
    goal: string;
    startAt: Date;
    dueAt: Date;
    leaderUid: string;
    members: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }>;
    weights: ContributionWeights;
    archived: boolean;
    deleted: boolean;
    createdAt: Date;
  };
  archivedTeam: {
    name: string;
    courseLabel: string;
    goal: string;
    startAt: Date;
    dueAt: Date;
    leaderUid: string;
    members: Record<string, { nickname: string; roleLabel: string; joinedAt: Date; studentId?: string }>;
    weights: ContributionWeights;
    archived: boolean;
    deleted: boolean;
    createdAt: Date;
  };
  events: { type: EventType; actorUid: string; payload: Record<string, unknown>; at: Date }[];
  messages: { actorUid: string; text: string; at: Date }[];
  tasks: { id: string; title: string; desc?: string; actorUid: string; assigneeUid: string; dueAt: Date; status: 'done' | 'todo'; doneAt?: Date; milestoneId?: string; milestoneStartAt?: Date; order: number }[];
  docs: { title: string; versions: { body: string; charsDelta: number; actorUid: string; at: Date; version: number }[] }[];
  files: { name: string; contentType: string; sizeBytes: number; actorUid: string; caption: string; uploadedAt: Date }[];
  fileComments: { fileIndex: number; actorUid: string; text: string; at: Date }[];
  meetings: { id: string; title: string; startedAt: Date; durationMin: number; place: string; online: boolean; attendeeUids: string[]; summary3: string; body: string; actorUid: string }[];
}

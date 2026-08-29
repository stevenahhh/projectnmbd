'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import type {
  LedgerEvent,
  LeaderRequest,
  Meeting,
  Message,
  Team,
  TeamDoc,
  TeamFile,
  TeamTask,
} from '@/lib/types';

export interface TeamData {
  team: Team | null;
  tasks: TeamTask[];
  meetings: Meeting[];
  messages: Message[];
  docs: TeamDoc[];
  files: TeamFile[];
  events: LedgerEvent[];
  leaderRequests: LeaderRequest[];
  loading: boolean;
  error: string | null;
}

/**
 * 팀 스코프 실시간 데이터 — 리스너는 전부 teams/{id} 하위 경로만 구독한다 (S11).
 * 전역 컬렉션 구독은 이 훅에도, 앱 어디에도 없다.
 */
export function useTeamData(teamId: string): TeamData {
  const [data, setData] = useState<TeamData>({
    team: null,
    tasks: [],
    meetings: [],
    messages: [],
    docs: [],
    files: [],
    events: [],
    leaderRequests: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubs: Unsubscribe[] = [];

    let ready = 0;
    const markReady = () => {
      ready += 1;
      if (ready >= 7) setData((prev) => ({ ...prev, loading: false }));
    };

    const wrapError = (label: string) => (error: Error) => {
      setData((prev) => ({ ...prev, loading: false, error: `${label}: ${error.message}` }));
    };

    unsubs.push(
      onSnapshot(doc(getDb(), 'teams', teamId), (snap) => {
        setData((prev) => ({
          ...prev,
          team: snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Team, 'id'>) }) : null,
        }));
        markReady();
      }, wrapError('team')),
    );

    unsubs.push(
      onSnapshot(query(collection(getDb(), 'teams', teamId, 'tasks'), orderBy('order', 'asc')), (snap) => {
        setData((prev) => ({ ...prev, tasks: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamTask, 'id'>) })) }));
        markReady();
      }, wrapError('tasks')),
    );

    unsubs.push(
      onSnapshot(query(collection(getDb(), 'teams', teamId, 'meetings'), orderBy('startedAt', 'asc')), (snap) => {
        setData((prev) => ({ ...prev, meetings: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Meeting, 'id'>) })) }));
        markReady();
      }, wrapError('meetings')),
    );

    unsubs.push(
      onSnapshot(query(collection(getDb(), 'teams', teamId, 'messages'), orderBy('at', 'asc'), limit(300)), (snap) => {
        setData((prev) => ({ ...prev, messages: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })) }));
        markReady();
      }, wrapError('messages')),
    );

    unsubs.push(
      onSnapshot(collection(getDb(), 'teams', teamId, 'docs'), (snap) => {
        setData((prev) => ({ ...prev, docs: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamDoc, 'id'>) })) }));
        markReady();
      }, wrapError('docs')),
    );

    unsubs.push(
      onSnapshot(collection(getDb(), 'teams', teamId, 'files'), (snap) => {
        setData((prev) => ({ ...prev, files: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamFile, 'id'>) })) }));
        markReady();
      }, wrapError('files')),
    );

    unsubs.push(
      onSnapshot(query(collection(getDb(), 'teams', teamId, 'events'), orderBy('at', 'desc'), limit(400)), (snap) => {
        setData((prev) => ({ ...prev, events: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LedgerEvent, 'id'>) })) }));
        markReady();
      }, wrapError('events')),
    );

    unsubs.push(
      onSnapshot(collection(getDb(), 'teams', teamId, 'leaderRequests'), (snap) => {
        setData((prev) => ({ ...prev, leaderRequests: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LeaderRequest, 'id'>) })) }));
        markReady();
      }, wrapError('leaderRequests')),
    );

    return () => unsubs.forEach((u) => u());
  }, [teamId]);

  return data;
}

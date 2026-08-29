'use client';

import { use } from 'react';
import { TeamWorkspace, type WorkspaceTab } from '@/components/team/workspace';

export default function TeamGanttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeamWorkspace teamId={id} initialTab={'gantt' as WorkspaceTab} />;
}

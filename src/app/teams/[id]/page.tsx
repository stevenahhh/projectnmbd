'use client';

import { use } from 'react';
import { TeamWorkspace, type WorkspaceTab } from '@/components/team/workspace';

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeamWorkspace teamId={id} initialTab={'dashboard' as WorkspaceTab} />;
}

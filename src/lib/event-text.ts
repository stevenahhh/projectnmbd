/**
 * 원장 이벤트를 사람이 읽는 한 줄로 옮긴다.
 * 잔디 말풍선·최근 활동·로그가 같은 문장을 쓰도록 여기 한 곳에만 둔다.
 */
import type { EventType } from './types';

/** 이벤트 1건을 사람이 읽는 한 줄로. 알 수 없는 종류도 페이로드에서 이름을 찾아 표시한다. */
export function describeEvent(type: EventType, payload: Record<string, unknown>): string {
  const text = (key: string): string => (typeof payload[key] === 'string' ? (payload[key] as string) : '');
  const num = (key: string): number => (typeof payload[key] === 'number' ? (payload[key] as number) : 0);
  const name = text('docTitle') || text('title') || text('fileName') || text('name') || text('text');

  switch (type) {
    case 'doc.delete':
      return `문서 「${name || '문서'}」 삭제(보관)`;
    case 'doc.restore':
      return `문서 「${name || '문서'}」 복원`;
    case 'doc.edit': {
      const delta = num('charsDelta');
      return `문서 「${name || '제목 없음'}」 ${delta >= 0 ? '+' : ''}${delta.toLocaleString()}자`;
    }
    case 'file.upload':
      return `자료 「${name || '파일'}」 올림`;
    case 'file.comment':
      return `자료 첨삭 ${num('chars') ? `${num('chars')}자` : ''}`.trim();
    case 'task.create':
      return `할 일 「${name || '제목 없음'}」 추가`;
    case 'task.complete':
      return `할 일 「${name || '제목 없음'}」 완료`;
    case 'meeting.create':
      return `회의 「${name || '제목 없음'}」 작성`;
    case 'meeting.attend':
      return `회의 「${name || '회의'}」 참석`;
    case 'meeting.update':
      return `회의 「${name || '회의'}」 수정`;
    case 'meeting.restore':
      return `회의 「${name || '회의'}」 복원`;
    case 'meeting.delete':
      return `회의 「${name || '회의'}」 삭제(보관)`;
    case 'message.post':
      return `대화 ${num('chars')}자`;
    case 'note.add':
      return `기록 「${name || ''}」`;
    case 'milestone.update': {
      if ('parentId' in payload) {
        const parent = text('parentTitle');
        return parent ? `타임라인 「${name || '항목'}」 → 「${parent}」 하위로` : `타임라인 「${name || '항목'}」 최상위로`;
      }
      return `타임라인 「${name || '항목'}」 기간 수정`;
    }
    case 'team.create':
      return `팀 「${name || ''}」 만듦`;
    case 'member.join':
      return '팀 합류';
    case 'role.assign':
      return '역할 배정';
    case 'leader.request':
      return '팀장 지정 요청';
    case 'leader.approve':
      return '팀장 승인';
    case 'team.archive':
      return '팀 보관';
    default:
      return name || '활동';
  }
}

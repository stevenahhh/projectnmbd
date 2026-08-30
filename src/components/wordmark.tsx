/**
 * 브랜드 표기 — 화면에서 이름은 언제나 이 컴포넌트를 거친다.
 * 도메인·저장소는 코드네임(nmbd)을 그대로 쓰고, 사람에게 보이는 이름만 Dibs 로 통일한다.
 */
export function Wordmark({ className }: { className?: string }) {
  return <span className={className ? `wordmark ${className}` : 'wordmark'}>Dibs</span>;
}

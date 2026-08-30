/**
 * 타임라인 항목의 계층 — 부모-자식 펼치기와 순환 방지.
 * 시간·좌표와는 무관해서 따로 둔다.
 */

export interface TreeNode {
  id: string;
  parentId: string | null;
  order: number;
}

export interface TreeRow<T> {
  item: T;
  depth: number;
  /** 자기 자신 + 모든 자손 행 수. 부모 막대는 이만큼 세로로 걸친다. */
  span: number;
}

/**
 * 부모-자식 순서로 펼친다 (레퍼런스 computeDepths·computeRowSpans).
 * 부모가 목록에 없거나 순환이면 최상위로 취급해 행이 사라지지 않게 한다.
 */
export function layoutTree<T extends TreeNode>(items: T[]): TreeRow<T>[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];

  const isRooted = (item: T): boolean => {
    const seen = new Set<string>([item.id]);
    let parentId = item.parentId;
    while (parentId) {
      if (seen.has(parentId) || !byId.has(parentId)) return false;
      seen.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return true;
  };

  for (const item of items) {
    if (item.parentId && isRooted(item)) {
      const bucket = childrenOf.get(item.parentId);
      if (bucket) bucket.push(item);
      else childrenOf.set(item.parentId, [item]);
    } else {
      roots.push(item);
    }
  }

  const byOrder = (a: T, b: T) => a.order - b.order;
  const rows: TreeRow<T>[] = [];

  const walk = (item: T, depth: number): number => {
    const index = rows.length;
    rows.push({ item, depth, span: 1 });
    let span = 1;
    for (const child of (childrenOf.get(item.id) ?? []).sort(byOrder)) span += walk(child, depth + 1);
    rows[index] = { item, depth, span };
    return span;
  };

  for (const root of roots.sort(byOrder)) walk(root, 0);
  return rows;
}

/** 자기 자손을 부모로 삼으면 순환이 된다 (레퍼런스 isValidReparentTarget). */
export function canReparent(items: TreeNode[], draggedId: string, targetId: string | null): boolean {
  if (targetId === null) return true;
  if (draggedId === targetId) return false;
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  let parentId: string | null = targetId;
  while (parentId) {
    if (parentId === draggedId) return false;
    if (seen.has(parentId)) return true;
    seen.add(parentId);
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return true;
}

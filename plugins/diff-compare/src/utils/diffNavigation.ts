// Shared helpers for navigating between diff indices

/**
 * 计算下一个差异索引（循环）。
 * @param indices 已排序的差异索引列表，如 [0, 3, 7]
 * @param current 当前激活索引（通常是 activeIndex），不存在时传 -1
 */
export function getNextIndex(indices: number[], current: number): number {
  if (!indices.length) return -1
  const pos = indices.indexOf(current)
  if (pos === -1) return indices[0]
  return indices[(pos + 1) % indices.length]
}

/**
 * 计算上一个差异索引（循环）。
 */
export function getPrevIndex(indices: number[], current: number): number {
  if (!indices.length) return -1
  const pos = indices.indexOf(current)
  if (pos <= 0) return indices[indices.length - 1]
  return indices[pos - 1]
}


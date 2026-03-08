import { IDiffStrategy, DiffResult } from '../types';

export interface TextItem {
  str: string
  transform: number[]
  pageNum: number
  index: number
  bbox?: { x: number; y: number; width: number; height: number }
  confidence?: number
}

export class PdfDiffStrategy implements IDiffStrategy<TextItem> {
  type = 'pdf' as const 

  diff(source: TextItem[], target: TextItem[]): DiffResult<TextItem>[] {
    const s = this.normalize(source)
    const t = this.normalize(target)

    // 1. 获取完全相等的 LCS 匹配项
    const matches = this.computeLCS(s, t)
    const result: DiffResult<TextItem>[] = []

    let i = 0
    let j = 0

    // 2. 遍历匹配项，处理匹配项之间的“间隙 (Gap)”
    for (const match of matches) {
      const [matchI, matchJ] = match

      // 处理到达当前完全匹配节点前的差异间隙
      const sourceGap = s.slice(i, matchI)
      const targetGap = t.slice(j, matchJ)
      this.processGap(sourceGap, targetGap, result)

      // 压入完全匹配的节点
      result.push({
        type: 'equal',
        source: s[matchI],
        target: t[matchJ]
      })

      i = matchI + 1
      j = matchJ + 1
    }

    // 3. 处理尾部剩余的间隙
    this.processGap(s.slice(i), t.slice(j), result)

    return result
  }

  // 二次动态规划：专门处理无法完全匹配的间隙，寻找 modify，剩余的做 delete/insert
  private processGap(sourceGap: TextItem[], targetGap: TextItem[], result: DiffResult<TextItem>[]) {
    const m = sourceGap.length
    const n = targetGap.length

    if (m === 0) {
      targetGap.forEach(tgt => result.push({ type: 'insert', target: tgt }))
      return
    }
    if (n === 0) {
      sourceGap.forEach(src => result.push({ type: 'delete', source: src }))
      return
    }

    // 使用 DP 计算基于 isSimilar 的最长公共子序列
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (this.isSimilar(sourceGap[i], targetGap[j])) {
          dp[i][j] = dp[i + 1][j + 1] + 1
        } else {
          dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
        }
      }
    }

    let i = 0
    let j = 0

    // 回溯 DP 表，生成 modify, delete, insert
    while (i < m && j < n) {
      if (this.isSimilar(sourceGap[i], targetGap[j])) {
        result.push({
          type: 'modify',
          source: sourceGap[i],
          target: targetGap[j]
        })
        i++
        j++
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        result.push({ type: 'delete', source: sourceGap[i] })
        i++
      } else {
        result.push({ type: 'insert', target: targetGap[j] })
        j++
      }
    }

    // 处理剩下的未匹配项
    while (i < m) {
      result.push({ type: 'delete', source: sourceGap[i] })
      i++
    }
    while (j < n) {
      result.push({ type: 'insert', target: targetGap[j] })
      j++
    }
  }

  private normalize(items: TextItem[]): TextItem[] {
    return items
      .filter(i => i.str && i.str.trim().length > 0)
      .sort((a, b) => {
        if (a.pageNum !== b.pageNum) {
          return a.pageNum - b.pageNum
        }
        const ay = this.getY(a)
        const by = this.getY(b)

        if (Math.abs(ay - by) > 2) {
          return by - ay
        }

        const ax = this.getX(a)
        const bx = this.getX(b)
        return ax - bx
      })
  }

  private computeLCS(a: TextItem[], b: TextItem[]): [number, number][] {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (this.isEqual(a[i], b[j])) {
          dp[i][j] = dp[i + 1][j + 1] + 1
        } else {
          dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
        }
      }
    }

    const matches: [number, number][] = []
    let i = 0
    let j = 0

    while (i < m && j < n) {
      if (this.isEqual(a[i], b[j])) {
        matches.push([i, j])
        i++
        j++
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        i++
      } else {
        j++
      }
    }

    return matches
  }

  private isEqual(a: TextItem, b: TextItem): boolean {
    if (a.pageNum !== b.pageNum) return false
    if (a.str !== b.str) return false

    const dy = Math.abs(this.getY(a) - this.getY(b))
    return dy < 3
  }

  private isSimilar(a: TextItem, b: TextItem): boolean {
    if (a.pageNum !== b.pageNum) return false

    const dy = Math.abs(this.getY(a) - this.getY(b))
    if (dy > 10) return false

    const sim = this.textSimilarity(a.str, b.str)
    return sim > 0.6
  }

  // 核心修改：使用莱文斯坦距离 (Levenshtein Distance) 计算字符串相似度
  private textSimilarity(a: string, b: string): number {
    if (!a && !b) return 1
    if (!a || !b) return 0

    const lenA = a.length
    const lenB = b.length
    const matrix: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0))

    for (let i = 0; i <= lenA; i++) matrix[i][0] = i
    for (let j = 0; j <= lenB; j++) matrix[0][j] = j

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // 删除
          matrix[i][j - 1] + 1,       // 插入
          matrix[i - 1][j - 1] + cost // 替换
        )
      }
    }

    const distance = matrix[lenA][lenB]
    const maxLen = Math.max(lenA, lenB)
    return 1 - (distance / maxLen)
  }

  private getY(item: TextItem): number {
    if (item.bbox) return item.bbox.y
    return item.transform[5]
  }

  private getX(item: TextItem): number {
    if (item.bbox) return item.bbox.x
    return item.transform[4]
  }
}
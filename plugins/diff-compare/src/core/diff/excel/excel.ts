import { DiffResult, IDiffStrategy } from '../types'
import { normalizeString } from '../../../utils/string'

export class ExcelDiffStrategy implements IDiffStrategy<any[]> {
  type = 'excel' as const

  diff(source: any[][], target: any[][]): DiffResult<any[]>[] {
    const diffs: any[] = []
    const maxRows = Math.max(source.length, target.length)
    let maxCols = 0

    for (let r = 0; r < maxRows; r++) {
      const sourceRow = source[r] || []
      const targetRow = target[r] || []
      const rowMaxCols = Math.max(sourceRow.length, targetRow.length)
      if (rowMaxCols > maxCols) maxCols = rowMaxCols

      for (let c = 0; c < rowMaxCols; c++) {
        const sVal = normalizeString(sourceRow[c])
        const tVal = normalizeString(targetRow[c])

        if (sVal !== tVal) {
          diffs.push({
            row: r,
            col: c,
            source: sVal,
            target: tVal
          })
        }
      }
    }

    return {
      type: 'excel',
      chunks: [], // Excel diff results are handled differently by ExcelDiffView
      // We extend the result with extra data that the view expects
      ...({
        diffs,
        maxRows,
        maxCols
      } as any)
    }
  }
}

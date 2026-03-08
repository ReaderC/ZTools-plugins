import { DiffResult, IDiffStrategy } from '../types'

export class ImageDiffStrategy implements IDiffStrategy<string> {
  type = 'image' as const

  diff(source: string[], target: string[]): DiffResult<string>[] {
    // Image diff is essentially pixel diff
    return []
  }
}

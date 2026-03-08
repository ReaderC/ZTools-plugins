import { DiffResult, IDiffStrategy } from '../types'
import { TextDiffStrategy } from '../text/text'

export class WordDiffStrategy implements IDiffStrategy<string> {
  type = 'word' as const
  private textStrategy = new TextDiffStrategy()

  diff(source: string[], target: string[]): DiffResult<string>[] {
    // Word diff is essentially text diff on paragraphs
    return this.textStrategy.diff(source, target)
  }
}

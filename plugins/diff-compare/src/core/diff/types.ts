export type DiffType = 'text' | 'image' | 'word' | 'excel' | 'pdf'

export interface DiffResult<T> {
  type: 'equal' | 'modify' | 'delete' | 'insert'
  source?: T
  target?: T
}

export interface IDiffStrategy<T = any> {
  type: DiffType
  diff(source: T[], target: T[]): DiffResult<T>[]
}
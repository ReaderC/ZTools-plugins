export type DiffType = 'text' | 'image' | 'word'

export interface DiffChunk {
  type: 'equal' | 'insert' | 'delete'
  value: string
  // For UI rendering, we might need a unique ID or line number references.
}

export interface DiffResult {
  type: DiffType
  chunks: DiffChunk[]
  // additional metadata to easily compute lines
  originalLineCount?: number
  modifiedLineCount?: number
}

export interface IDiffStrategy<InputType = any> {
  type: DiffType
  compute(original: InputType, modified: InputType): DiffResult
}

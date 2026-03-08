import {  diffArrays} from 'diff';
import {  DiffResult, IDiffStrategy } from '../types';

export class TextDiffStrategy implements IDiffStrategy<string> {
 type = 'text' as const
 
  diff(source: string[], target: string[]): DiffResult<string>[] {

    const changes = diffArrays(source, target)

    const result: DiffResult<string>[] = []

    let i = 0
    let j = 0

    for (let c = 0; c < changes.length; c++) {

      const part = changes[c]

      // equal
      if (!part.added && !part.removed) {

        for (const value of part.value) {

          result.push({
            type: 'equal',
            source: value,
            target: value
          })

          i++
          j++
        }

        continue
      }

      // delete
      if (part.removed) {

        const next = changes[c + 1]

        // delete + insert => modify
        if (next && next.added) {

          const len = Math.max(part.value.length, next.value.length)

          for (let k = 0; k < len; k++) {

            const s = part.value[k]
            const t = next.value[k]

            if (s !== undefined && t !== undefined) {

              result.push({
                type: 'modify',
                source: s,
                target: t
              })

              i++
              j++

            } else if (s !== undefined) {

              result.push({
                type: 'delete',
                source: s
              })

              i++

            } else if (t !== undefined) {

              result.push({
                type: 'insert',
                target: t
              })

              j++
            }
          }

          c++ // skip next
          continue
        }

        for (const value of part.value) {

          result.push({
            type: 'delete',
            source: value
          })

          i++
        }

        continue
      }

      // insert
      if (part.added) {

        for (const value of part.value) {

          result.push({
            type: 'insert',
            target: value
          })

          j++
        }
      }
    }

    return result
  }
}
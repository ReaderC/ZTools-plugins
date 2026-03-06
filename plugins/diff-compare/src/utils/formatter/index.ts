export function formatCode(text: string): string {
  // A very lightweight heuristic formatter.
  // It handles simple JSON and basic indentation for nested braces.
  
  if (!text) return ''

  const trimmed = text.trim()
  
  // Try JSON first
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const obj = JSON.parse(trimmed)
      return JSON.stringify(obj, null, 2)
    } catch (e) {
      // not valid JSON, fallback
    }
  }

  // Fallback: simple brace counter for JS/CSS like structures
  // This is highly simplified and avoids 3rd party libs per requirements.
  let formatted = ''
  let indentLevel = 0
  const indentStr = '  '
  let inString = false
  let stringChar = ''

  // Split by simple tokens to handle basic newlines
  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '"' || char === '\'' || char === '`') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (stringChar === char && text[i-1] !== '\\') {
        inString = false
      }
      formatted += char
      continue
    }

    if (inString) {
      formatted += char
      continue
    }

    if (char === '{' || char === '[') {
      formatted += char + '\n' + indentStr.repeat(++indentLevel)
    } else if (char === '}' || char === ']') {
      indentLevel = Math.max(0, indentLevel - 1)
      // Only prefix newline if the previous char wasn't a brace
      // To strictly follow rules, we prefer ensuring newline before closing
      if (!formatted.endsWith('\n' + indentStr.repeat(indentLevel + 1))) {
        formatted += '\n' + indentStr.repeat(indentLevel) + char
      } else {
        // Strip trailing indent before adding our own
        formatted = formatted.replace(new RegExp('\n' + indentStr.repeat(indentLevel + 1) + '$'), '\n' + indentStr.repeat(indentLevel))
        formatted += char
      }
    } else if (char === ';' || char === ',') {
      formatted += char + '\n' + indentStr.repeat(indentLevel)
    } else if (char === '\n') {
      // consolidate structural newlines
      const nextChar = text[i+1]?.trim()
      if (nextChar === '}' || nextChar === ']') {
        // skip, let brace handler do it
      } else {
        formatted += '\n' + indentStr.repeat(indentLevel)
      }
    } else {
      // simplify excessive whitespace
      if (char === ' ' && text[i-1] === ' ') {
         // skip
      } else {
        formatted += char
      }
    }
  }

  // Final cleanup for multiple newlines
  return formatted.replace(/\n\s*\n/g, '\n').trim()
}

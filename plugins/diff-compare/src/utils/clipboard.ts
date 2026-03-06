// Clipboard helpers for file-based diff views

/**
 * 从剪贴板中提取满足条件的文件列表。
 */
export function extractFilesFromClipboard(
  e: ClipboardEvent,
  accept: (file: File) => boolean
): File[] {
  const items = e.clipboardData?.items
  if (!items) return []

  const files: File[] = []
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const file = items[i].getAsFile()
      if (file && accept(file)) {
        files.push(file)
      }
    }
  }

  return files
}


// Shared file reading helpers for diff views

/**
 * Read a File as ArrayBuffer.
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file as ArrayBuffer'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Read a File as data URL string (useful for images).
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file as DataURL'))
    reader.readAsDataURL(file)
  })
}


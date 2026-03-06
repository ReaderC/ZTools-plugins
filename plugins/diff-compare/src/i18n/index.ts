import { ref } from 'vue'
import zh from './locales/zh'
import en from './locales/en'

// ── Type definitions ─────────────────────────────────
export type LangCode = 'zh' | 'en'

/**
 * Messages is the canonical shape of a locale object.
 * Derived from zh (the reference locale) — all keys must be strings.
 */
export type Messages = { [K in keyof typeof zh]: string }

// ── Locale registry ───────────────────────────────────
// TypeScript will error here if any locale is missing a key from Messages
const locales: Record<LangCode, Messages> = { zh, en }

// ── Shared reactive singleton ─────────────────────────
const currentLang = ref<LangCode>('zh')

// ── Public composable ─────────────────────────────────
export function useI18n() {
  const t = (key: keyof Messages, params?: Record<string, string | number>): string => {
    let text: string = locales[currentLang.value][key]
    if (params) {
      for (const k of Object.keys(params)) {
        text = text.replace(`{${k}}`, String(params[k]))
      }
    }
    return text
  }

  const toggleLang = () => {
    currentLang.value = currentLang.value === 'zh' ? 'en' : 'zh'
  }

  return { t, currentLang, toggleLang }
}

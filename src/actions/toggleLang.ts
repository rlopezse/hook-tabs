import type { Lang } from '../i18n'

export const toggleLang = (lang: Lang, setLang: (lang: Lang) => void) => {
  const nextLang: Lang = lang === 'en' ? 'es' : 'en'

  setLang(nextLang)
  chrome.storage.local.set({ lang: nextLang })
}

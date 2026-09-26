export const getDomain = (url?: string) => {
  if (!url) return ''

  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export type Lang = 'en' | 'es'

const strings = {
  appTitle: {
    en: 'Hook Tabs - Search. Find. Close. Pin.',
    es: 'Hook Tabs - Busca. Encuentra. Cierra. Fija.',
  },
  searchPlaceholder: {
    en: 'Search tabs and bookmarks',
    es: 'Buscar pestañas y marcadores',
  },
  notFound: {
    en: 'No tabs or bookmarks found',
    es: 'No se encontraron pestañas ni marcadores',
  },
  bookmarked: {
    en: 'Bookmarked',
    es: 'Marcado',
  },
  closed: {
    en: 'Closed',
    es: 'Cerrada',
  },
  bookmark: {
    en: 'Bookmark',
    es: 'Marcador',
  },
  pinned: {
    en: 'pin',
    es: 'fijo',
  },
  navigate: {
    en: 'navigate',
    es: 'navegar',
  },
  close: {
    en: 'close',
    es: 'cerrar',
  },
  pin: {
    en: 'pin',
    es: 'fijar',
  },
  move: {
    en: 'move',
    es: 'mover',
  },
  stopMoving: {
    en: 'stop moving',
    es: 'dejar de mover',
  },
  open: {
    en: 'open',
    es: 'abrir',
  },
} as const

export type StringKey = keyof typeof strings

export const t = (lang: Lang, key: StringKey) => strings[key][lang]

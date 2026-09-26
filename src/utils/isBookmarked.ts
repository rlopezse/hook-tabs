export const isBookmarked = (
  url: string | undefined,
  bookmarkedUrls: Set<string | undefined>,
) => !!url && bookmarkedUrls.has(url)

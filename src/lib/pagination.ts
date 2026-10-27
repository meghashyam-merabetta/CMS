import type { PaginationMeta } from '@/types/api';

export async function collectAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<{ data: T[]; pagination?: PaginationMeta }>,
  key: (item: T) => string | number
): Promise<T[]> {
  const result: T[] = [];
  const seen = new Set<string>();
  const limit = 100;
  let offset = 0;
  while (true) {
    const page = await fetchPage(offset, limit);
    if (!Array.isArray(page.data)) throw new Error('Unable to read the complete list. Please refresh.');
    for (const item of page.data) {
      const rawId = key(item);
      if (rawId == null || String(rawId) === '') throw new Error('The server returned a record without an ID. Please refresh.');
      const id = String(rawId);
      if (seen.has(id)) throw new Error('The server repeated a page of results. Please refresh.');
      seen.add(id);
      result.push(item);
    }
    offset += page.data.length;
    const more = page.pagination
      ? page.pagination.hasMore || offset < page.pagination.total
      : page.data.length === limit;
    if (!more) return result;
    if (!page.data.length) throw new Error('The server returned an incomplete list. Please refresh.');
  }
}

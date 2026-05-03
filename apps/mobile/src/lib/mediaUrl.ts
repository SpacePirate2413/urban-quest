/**
 * Convert an /api/media/foo.jpg path returned by the API into an absolute URL
 * the React Native Image / Video components can fetch. Same logic as the
 * quest player's local helper, broken out so the scout tab can reuse it.
 *
 * No-op for already-absolute URLs (http://, https://, file://, blob:).
 */
const API_HOST = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

export function fullMediaUrl(rel: string | null | undefined): string | null {
  if (!rel) return null;
  if (/^(https?|file|blob):/i.test(rel)) return rel;
  return `${API_HOST}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

export type AppView = 'builder' | 'templates' | 'append-stickers' | 'moon-phases-pdf' | 'astrology-pdf';

const ROUTE_VIEW_MAP: Record<string, AppView> = {
  '/templates': 'templates',
  '/append-stickers': 'append-stickers',
  '/moon-phases-pdf': 'moon-phases-pdf',
  '/astrology-pdf': 'astrology-pdf',
};

export function normalizeAppHash(hash: string) {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const [path] = withoutHash.split(/[?&]/, 1);
  const normalizedPath = `/${path.replace(/^\/+|\/+$/g, '')}`;

  return normalizedPath === '/' ? '/' : normalizedPath;
}

export function resolveAppView(hash: string): AppView {
  return ROUTE_VIEW_MAP[normalizeAppHash(hash)] ?? 'builder';
}

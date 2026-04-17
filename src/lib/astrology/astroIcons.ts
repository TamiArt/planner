const DEFAULT_ICON_SIZE = 64;

const ASTRO_ICON_EMOJI: Record<string, string> = {
  'high-voltage': '⚡',
  rocket: '🚀',
  'person-running': '🏃',
  broom: '🧹',
  seedling: '🌱',
  herb: '🌿',
  'crossed-swords': '⚔️',
  'bow-and-arrow': '🏹',
  rock: '🪨',
  sun: '☀️',
  'crescent-moon': '🌙',
  fire: '🔥',
  'writing-hand': '✍️',
  books: '📚',
  'two-hearts': '💕',
  'speech-balloon': '💬',
  'artist-palette': '🎨',
  'person-in-bed': '🛏️',
  'new-moon': '🌑',
  'full-moon': '🌕',
  'waxing-crescent-moon': '🌒',
  'waning-crescent-moon': '🌘',
};

function createSvgDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildEmojiIconSvg(iconName: string) {
  const emoji = ASTRO_ICON_EMOJI[iconName] ?? '❔';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${DEFAULT_ICON_SIZE}" height="${DEFAULT_ICON_SIZE}" viewBox="0 0 64 64">
      <text
        x="32"
        y="34"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"
        font-size="44"
      >${emoji}</text>
    </svg>
  `.trim();
}

export function getAstroIconDataUri(iconName: string) {
  return createSvgDataUri(buildEmojiIconSvg(iconName));
}

import type { BackgroundAsset } from '../../types/planner';

export const backgroundAssets: BackgroundAsset[] = [
  {
    id: 'minimal-paper',
    name: 'Чистая бумага',
    type: 'color',
    source: 'minimal-paper',
    preview: 'linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%)',
    themeId: 'minimal',
    variant: 'theme-preset',
  },
  {
    id: 'minimal-texture',
    name: 'Тонкая текстура',
    type: 'texture',
    source: 'minimal-texture',
    preview:
      'radial-gradient(circle at 20% 20%, rgba(72,112,255,0.13), transparent 24%), linear-gradient(180deg, #ffffff 0%, #eff4fb 100%)',
    themeId: 'minimal',
    variant: 'theme-preset',
  },
  {
    id: 'minimal-tint',
    name: 'Холодный акцент',
    type: 'image',
    source: 'minimal-tint',
    preview:
      'radial-gradient(circle at 85% 20%, rgba(130,164,255,0.34), transparent 22%), linear-gradient(160deg, #ffffff 0%, #edf4ff 100%)',
    themeId: 'minimal',
    variant: 'theme-preset',
  },
  {
    id: 'soft-paper',
    name: 'Кремовый лист',
    type: 'color',
    source: 'soft-paper',
    preview: 'linear-gradient(180deg, #fffdfb 0%, #fff5f7 100%)',
    themeId: 'soft',
    variant: 'theme-preset',
  },
  {
    id: 'soft-texture',
    name: 'Акварельный шум',
    type: 'texture',
    source: 'soft-texture',
    preview:
      'radial-gradient(circle at 18% 25%, rgba(216,111,147,0.18), transparent 22%), radial-gradient(circle at 82% 15%, rgba(164,137,255,0.15), transparent 24%), linear-gradient(160deg, #fffdf8 0%, #fff3fa 100%)',
    themeId: 'soft',
    variant: 'theme-preset',
  },
  {
    id: 'soft-blush',
    name: 'Пудровый градиент',
    type: 'image',
    source: 'soft-blush',
    preview:
      'radial-gradient(circle at 78% 20%, rgba(248,190,211,0.42), transparent 24%), linear-gradient(160deg, #fffaf7 0%, #fff0f6 44%, #f7f0ff 100%)',
    themeId: 'soft',
    variant: 'theme-preset',
  },
  {
    id: 'dark-graphite',
    name: 'Графит',
    type: 'color',
    source: 'dark-graphite',
    preview: 'linear-gradient(180deg, #171c29 0%, #111624 100%)',
    themeId: 'dark',
    variant: 'theme-preset',
  },
  {
    id: 'dark-grid',
    name: 'Ночное полотно',
    type: 'texture',
    source: 'dark-grid',
    preview:
      'radial-gradient(circle at 20% 18%, rgba(214,178,106,0.16), transparent 24%), linear-gradient(160deg, #171d2a 0%, #111523 100%)',
    themeId: 'dark',
    variant: 'theme-preset',
  },
  {
    id: 'dark-velvet',
    name: 'Бархатный свет',
    type: 'image',
    source: 'dark-velvet',
    preview:
      'radial-gradient(circle at 82% 16%, rgba(214,178,106,0.28), transparent 18%), radial-gradient(circle at 18% 82%, rgba(88,104,170,0.32), transparent 20%), linear-gradient(160deg, #141927 0%, #241b33 100%)',
    themeId: 'dark',
    variant: 'theme-preset',
  },
];

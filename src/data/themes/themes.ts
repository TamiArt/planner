import type { PlannerTheme } from '../../types/planner';

export const plannerThemes: PlannerTheme[] = [
  {
    id: 'minimal',
    name: 'Минимал',
    description: 'Светлый минимализм с чистой типографикой и нейтральными акцентами.',
    preview: 'linear-gradient(135deg, #ffffff 0%, #f5f7fb 50%, #eef3f8 100%)',
    colors: {
      background: '#f4f7fb',
      paper: '#ffffff',
      text: '#1d2433',
      accent: '#4870ff',
      border: '#d7deea',
      muted: '#6e788d',
      tabText: '#f8fbff',
    },
    fonts: {
      heading: 'Georgia',
      body: 'Trebuchet MS',
    },
    decoration: {
      tabStyle: 'rounded-solid',
      lineStyle: 'fine-grid',
      blockStyle: 'airy-card',
    },
  },
  {
    id: 'soft',
    name: 'Софт',
    description: 'Пастельная тема с теплым фоном, мягкими линиями и дневниковым настроением.',
    preview: 'linear-gradient(135deg, #fffaf7 0%, #ffe4ef 48%, #f5f1ff 100%)',
    colors: {
      background: '#fff8f7',
      paper: '#fffdfb',
      text: '#3b3043',
      accent: '#d86f93',
      border: '#edd3df',
      muted: '#887489',
      tabText: '#fff9fd',
    },
    fonts: {
      heading: 'Georgia',
      body: 'Trebuchet MS',
    },
    decoration: {
      tabStyle: 'soft-pill',
      lineStyle: 'rounded-rule',
      blockStyle: 'pastel-panels',
    },
  },
  {
    id: 'dark',
    name: 'Тёмный',
    description: 'Темная премиальная тема с графитовой основой и выразительными акцентами.',
    preview: 'linear-gradient(145deg, #131722 0%, #1e2434 40%, #352949 100%)',
    colors: {
      background: '#131722',
      paper: '#1a2030',
      text: '#eef2ff',
      accent: '#d6b26a',
      border: '#36405c',
      muted: '#97a2c4',
      tabText: '#111620',
    },
    fonts: {
      heading: 'Georgia',
      body: 'Trebuchet MS',
    },
    decoration: {
      tabStyle: 'premium-chip',
      lineStyle: 'glow-rule',
      blockStyle: 'glass-card',
    },
  },
];

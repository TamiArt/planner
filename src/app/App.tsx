import { useEffect, useState } from 'react';
import { AstrologyPdfEditorPage } from '../pages/AstrologyPdfEditorPage';
import { BuilderWorkflowPage } from '../pages/BuilderWorkflowPage';
import { MoonPhasePdfEditorPage } from '../pages/MoonPhasePdfEditorPage';
import { StickerPdfAppenderPage } from '../pages/StickerPdfAppenderPage';
import { TemplatesPage } from '../pages/TemplatesPage';

type AppView = 'builder' | 'templates' | 'append-stickers' | 'moon-phases-pdf' | 'astrology-pdf';

function getAppView(hash: string): AppView {
  if (hash === '#/templates') {
    return 'templates';
  }

  if (hash === '#/append-stickers') {
    return 'append-stickers';
  }

  if (hash === '#/moon-phases-pdf') {
    return 'moon-phases-pdf';
  }

  if (hash === '#/astrology-pdf') {
    return 'astrology-pdf';
  }

  return 'builder';
}

export function App() {
  const [view, setView] = useState<AppView>(() => getAppView(window.location.hash));

  useEffect(() => {
    function handleHashChange() {
      setView(getAppView(window.location.hash));
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (view === 'templates') {
    return <TemplatesPage />;
  }

  if (view === 'append-stickers') {
    return <StickerPdfAppenderPage />;
  }

  if (view === 'moon-phases-pdf') {
    return <MoonPhasePdfEditorPage />;
  }

  if (view === 'astrology-pdf') {
    return <AstrologyPdfEditorPage />;
  }

  return <BuilderWorkflowPage />;
}

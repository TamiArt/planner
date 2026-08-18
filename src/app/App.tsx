import { useEffect, useState } from 'react';
import { AstrologyPdfEditorPage } from '../pages/AstrologyPdfEditorPage';
import { BuilderWorkflowPage } from '../pages/BuilderWorkflowPage';
import { MoonPhasePdfEditorPage } from '../pages/MoonPhasePdfEditorPage';
import { StickerPdfAppenderPage } from '../pages/StickerPdfAppenderPage';
import { TemplatesPage } from '../pages/TemplatesPage';
import { resolveAppView } from './routeResolver';

export function App() {
  const [view, setView] = useState(() => resolveAppView(window.location.hash));

  useEffect(() => {
    function handleHashChange() {
      setView(resolveAppView(window.location.hash));
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

import { StatusPill } from '../components/StatusPill';
import { useEffect, useMemo } from 'react';
import { PlannerRenderPreviewPanel } from '../components/PlannerRenderPreviewPanel';
import { PreviewPanel } from '../components/PreviewPanel';
import { getBackgroundById } from '../lib/assets/assetRegistry';
import { buildPlannerPlan } from '../lib/navigation/buildPlannerPlan';
import { getThemeById } from '../lib/themes/themeRegistry';
import { validatePlannerConfig } from '../lib/validators/plannerConfigValidator';
import { usePlannerStore } from '../store/plannerStore';

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TemplatesPage() {
  const config = usePlannerStore((state) => state.config);
  const lastSavedAt = usePlannerStore((state) => state.lastSavedAt);

  const validation = useMemo(() => validatePlannerConfig(config), [config]);
  const plan = useMemo(() => buildPlannerPlan(config), [config]);
  const themeName = getThemeById(config.themeId).name;
  const backgroundName = getBackgroundById(config.backgroundId, config.customBackground).name;

  useEffect(() => {
    function rehydrateStore() {
      void usePlannerStore.persist.rehydrate();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== 'planner-builder-config') {
        return;
      }

      rehydrateStore();
    }

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="hero hero--templates">
        <div className="hero__grid hero__grid--single">
          <div>
            <p className="hero__eyebrow">Шаблоны</p>
            <h1 className="hero__title hero__title--compact">Живой предпросмотр на отдельной странице.</h1>
            <p className="hero__lead">
              Этот экран показывает рабочие шаблоны планера отдельно от конструктора. Если предпросмотр открыт в соседней
              вкладке, он подтягивает актуальный конфиг из локального хранилища после изменений в конструкторе.
            </p>

            <div className="hero__actions">
              <a href="#" className="button button--primary">
                Вернуться в конструктор
              </a>
              <a href="#/append-stickers" className="button button--secondary">
                Дополнить PDF
              </a>
              <a href="#/moon-phases-pdf" className="button button--ghost">
                Фазы в PDF
              </a>
              <a href="#/astrology-pdf" className="button button--ghost">
                Астрология в PDF
              </a>
            </div>

            <div className="hero__status-strip">
              <StatusPill label="Тема" value={themeName} />
              <StatusPill label="Фон" value={backgroundName} />
              <StatusPill label="Синхронизация" value={`локально · ${formatTime(lastSavedAt)}`} />
            </div>
          </div>
        </div>
      </section>

      <div className="preview-section">
        <PreviewPanel
          config={config}
          plan={plan}
          errors={validation.errors}
          warnings={validation.warnings}
        />
      </div>

      <div className="preview-section">
        <PlannerRenderPreviewPanel
          config={config}
          plan={plan}
        />
      </div>
    </main>
  );
}

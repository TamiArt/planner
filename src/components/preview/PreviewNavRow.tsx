import { PreviewLinkAction } from './PreviewLinkAction';

interface PreviewNavRowItem {
  label: string;
  targetPageId?: string;
}

interface PreviewNavRowProps {
  items: PreviewNavRowItem[];
  compact?: boolean;
  onNavigate: (pageId: string) => void;
}

export function PreviewNavRow({ items, compact = false, onNavigate }: PreviewNavRowProps) {
  return (
    <div className={compact ? 'planner-preview__nav-row planner-preview__nav-row--compact' : 'planner-preview__nav-row'}>
      {items.map((item) => (
        <PreviewLinkAction
          key={item.label}
          className="planner-preview__nav-button"
          targetPageId={item.targetPageId}
          onNavigate={onNavigate}
        >
          {item.label}
        </PreviewLinkAction>
      ))}
    </div>
  );
}

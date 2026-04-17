import clsx from 'clsx';
import type { ReactNode } from 'react';

interface PreviewLinkActionProps {
  className: string;
  targetPageId?: string;
  onNavigate: (pageId: string) => void;
  block?: boolean;
  children: ReactNode;
}

export function PreviewLinkAction({
  className,
  targetPageId,
  onNavigate,
  block = false,
  children,
}: PreviewLinkActionProps) {
  return (
    <button
      type="button"
      disabled={!targetPageId}
      onClick={() => {
        if (targetPageId) {
          onNavigate(targetPageId);
        }
      }}
      className={clsx(
        className,
        'planner-preview__interactive',
        block && 'planner-preview__interactive--block',
      )}
    >
      {children}
    </button>
  );
}

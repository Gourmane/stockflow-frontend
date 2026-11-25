import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  embedded?: boolean;
}

export default function EmptyState({ title, description, action, embedded = false }: EmptyStateProps) {
  return (
    <div className={`p-5 sm:p-6 ${embedded ? '' : 'panel'}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-canvas text-muted">
          <Inbox aria-hidden="true" className="size-[18px]" />
        </span>
        <div className="min-w-0 wrap-anywhere">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

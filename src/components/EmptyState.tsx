import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Inbox aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-500" />
        <div className="min-w-0 wrap-anywhere">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 max-w-prose text-sm text-slate-600">{description}</p>}
        </div>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

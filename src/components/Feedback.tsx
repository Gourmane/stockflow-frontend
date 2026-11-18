import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

interface FeedbackProps {
  status: 'success' | 'error';
  message: string;
  action?: ReactNode;
}

export default function Feedback({ status, message, action }: FeedbackProps) {
  const isError = status === 'error';
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <div className={`rounded-md border p-3 text-sm ${
      isError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }`}>
      <div className="flex items-start gap-2" role={isError ? 'alert' : 'status'}>
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="min-w-0 wrap-anywhere">{message}</p>
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

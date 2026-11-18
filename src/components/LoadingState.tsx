import { LoaderCircle } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Chargement…' }: LoadingStateProps) {
  return (
    <div role="status" className="flex items-center gap-3 py-6 text-sm text-slate-700">
      <LoaderCircle aria-hidden="true" className="size-5 shrink-0 text-blue-700 motion-safe:animate-spin" />
      <span className="min-w-0 wrap-anywhere">{message}</span>
    </div>
  );
}

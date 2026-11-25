import { LoaderCircle } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Chargement…' }: LoadingStateProps) {
  return (
    <div role="status" className="panel flex items-center gap-3 px-4 py-5 sm:px-5 text-sm text-muted">
      <LoaderCircle aria-hidden="true" className="size-5 shrink-0 text-brand motion-safe:animate-spin" />
      <span className="min-w-0 wrap-anywhere">{message}</span>
    </div>
  );
}

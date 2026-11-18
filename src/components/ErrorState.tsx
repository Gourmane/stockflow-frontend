import ActionButton from './ActionButton';
import Feedback from './Feedback';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function ErrorState({ message, onRetry, isRetrying }: ErrorStateProps) {
  return (
    <Feedback
      status="error"
      message={message}
      action={(
        <ActionButton
          variant="secondary"
          onClick={onRetry}
          isPending={isRetrying}
          pendingLabel="Nouvelle tentative…"
        >
          Réessayer
        </ActionButton>
      )}
    />
  );
}

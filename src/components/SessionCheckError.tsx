import ActionButton from './ActionButton';
import Feedback from './Feedback';

interface SessionCheckErrorProps {
  message: string;
  onRetry?: () => void;
  disabled?: boolean;
}

export default function SessionCheckError({ message, onRetry, disabled }: SessionCheckErrorProps) {
  return (
    <Feedback
      status="error"
      message={message}
      action={onRetry && (
        <ActionButton variant="secondary" onClick={onRetry} disabled={disabled}>
          Réessayer
        </ActionButton>
      )}
    />
  );
}

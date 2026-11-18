interface SessionCheckErrorProps {
  message: string;
  onRetry?: () => void;
  disabled?: boolean;
}

export default function SessionCheckError({ message, onRetry, disabled }: SessionCheckErrorProps) {
  return (
    <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
      <p role="alert">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={disabled} className="mt-2 underline disabled:opacity-50">
          Réessayer
        </button>
      )}
    </div>
  );
}

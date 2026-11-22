import { useId, useLayoutEffect, useRef } from 'react';
import ActionButton from './ActionButton';
import Feedback from './Feedback';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
  isPending?: boolean;
  error?: string;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  destructive = false,
  isPending = false,
  error,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    dialog.showModal();
    return () => dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      closedby={isPending ? 'none' : 'closerequest'}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      className="ui-dialog"
    >
      <h2 id={titleId} className="text-lg font-semibold wrap-anywhere">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm wrap-anywhere text-muted">{description}</p>
      {error && (
        <div className="mt-4">
          <Feedback status="error" message={error} />
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <ActionButton variant="secondary" onClick={onClose} disabled={isPending}>
          Annuler
        </ActionButton>
        <ActionButton variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} isPending={isPending}>
          {confirmLabel}
        </ActionButton>
      </div>
    </dialog>
  );
}

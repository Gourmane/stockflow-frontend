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
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:p-6"
    >
      <h2 id={titleId} className="text-lg font-semibold wrap-anywhere">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm wrap-anywhere text-slate-600">{description}</p>
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

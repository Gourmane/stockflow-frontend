import { LoaderCircle } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';

interface ActionButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'danger';
  isPending?: boolean;
  pendingLabel?: string;
}

const variantStyles = {
  primary: 'border-transparent bg-blue-700 text-white enabled:hover:bg-blue-800',
  secondary: 'border-slate-300 bg-white text-slate-900 enabled:hover:bg-slate-100',
  danger: 'border-transparent bg-red-700 text-white enabled:hover:bg-red-800',
};

export default function ActionButton({
  children,
  type = 'button',
  variant = 'primary',
  disabled,
  isPending = false,
  pendingLabel = 'En cours…',
  className = '',
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || isPending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles[variant]} ${className}`}
    >
      {isPending ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 shrink-0 motion-safe:animate-spin" />
          {pendingLabel}
        </>
      ) : children}
    </button>
  );
}

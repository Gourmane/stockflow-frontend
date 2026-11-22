import { LoaderCircle } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';

interface ActionButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  isPending?: boolean;
  pendingLabel?: string;
}

const variantStyles = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  quiet: 'button-quiet',
  danger: 'button-danger',
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
      className={`button ${variantStyles[variant]} ${className}`}
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

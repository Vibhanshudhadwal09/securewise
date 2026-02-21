import * as React from 'react';
import { InlineLoader } from './LoadingStates';

type ButtonVariant =
  | 'default'
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'secondary'
  | 'destructive'
  | 'danger'
  | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

function join(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-[var(--accent-blue)] text-white hover:bg-blue-600 shadow-sm focus-visible:ring-[var(--accent-blue)]',
  primary: 'bg-[var(--accent-blue)] text-white hover:bg-blue-600 shadow-sm focus-visible:ring-[var(--accent-blue)]',
  outline: 'border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] focus-visible:ring-[var(--accent-blue)]',
  ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] focus-visible:ring-[var(--accent-blue)]',
  secondary: 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] focus-visible:ring-[var(--accent-blue)]',
  destructive: 'text-[var(--accent-red)] hover:bg-red-50 focus-visible:ring-[var(--accent-red)]',
  danger: 'bg-[var(--accent-red)] text-white hover:bg-red-700 focus-visible:ring-[var(--accent-red)] shadow-sm',
  success: 'bg-[var(--accent-green)] text-white hover:bg-green-700 focus-visible:ring-[var(--accent-green)] shadow-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-11 px-5 text-md gap-3',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type, loading, icon, fullWidth, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      type={type || 'button'}
      className={join(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : undefined,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <InlineLoader size={size === 'sm' ? 'sm' : 'md'} />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon ? <span className="inline-flex">{icon}</span> : null}
          {children}
        </>
      )}
    </button>
  )
);

Button.displayName = 'Button';

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
  default: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm focus-visible:ring-primary-500',
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm focus-visible:ring-primary-500',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-primary-500',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-primary-500',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-primary-500',
  destructive: 'text-error-600 hover:bg-error-50 focus-visible:ring-error-500',
  danger: 'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500 shadow-sm',
  success: 'bg-success-600 text-white hover:bg-success-700 focus-visible:ring-success-500 shadow-sm',
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

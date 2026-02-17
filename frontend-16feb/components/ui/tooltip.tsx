'use client';

import * as React from 'react';

type TooltipProps = {
  children: React.ReactNode;
  className?: string;
};

type TooltipTriggerProps = {
  children: React.ReactNode;
  asChild?: boolean;
};

type TooltipContentProps = React.HTMLAttributes<HTMLDivElement>;

export function Tooltip({ children, className }: TooltipProps) {
  return <div className={`relative inline-flex group ${className || ''}`}>{children}</div>;
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return children;
  }
  return <div className="inline-flex">{children}</div>;
}

export function TooltipContent({ className, children, ...rest }: TooltipContentProps) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-full z-50 hidden w-max max-w-[260px] -translate-x-1/2 mt-2 rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block ${className || ''}`}
      {...rest}
    >
      {children}
    </div>
  );
}

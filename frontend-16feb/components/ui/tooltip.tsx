'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  children: React.ReactNode;
  className?: string;
};

type TooltipTriggerProps = {
  children: React.ReactNode;
  asChild?: boolean;
};

type TooltipContentProps = {
  children: React.ReactNode;
  className?: string;
};

interface TooltipContextValue {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export function Tooltip({ children, className }: TooltipProps) {
  const anchorRef = React.useRef<HTMLElement | null>(null);
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipContext.Provider value={{ anchorRef, open, setOpen }}>
      <div className={`inline-flex ${className || ''}`}>{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const ctx = React.useContext(TooltipContext);

  const handleRef = (el: HTMLElement | null) => {
    if (ctx) ctx.anchorRef.current = el;
  };

  const props = {
    onMouseEnter: () => ctx?.setOpen(true),
    onMouseLeave: () => ctx?.setOpen(false),
    onFocus: () => ctx?.setOpen(true),
    onBlur: () => ctx?.setOpen(false),
  };

  const divRef = React.useCallback((el: HTMLDivElement | null) => {
    if (ctx) ctx.anchorRef.current = el;
  }, [ctx]);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      ref: handleRef,
    });
  }

  return (
    <div
      ref={divRef}
      className="inline-flex"
      {...props}
    >
      {children}
    </div>
  );
}

export function TooltipContent({ children, className }: TooltipContentProps) {
  const ctx = React.useContext(TooltipContext);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (ctx?.open && ctx.anchorRef.current) {
      const rect = ctx.anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,       // viewport-relative; translate-y-full lifts above the trigger
        left: rect.left + rect.width / 2,
      });
    }
  }, [ctx?.open, ctx?.anchorRef]);

  if (!mounted || !ctx?.open) return null;

  return createPortal(
    <div
      role="tooltip"
      style={{ top: pos.top, left: pos.left }}
      className={`pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full w-max max-w-[260px] rounded-md bg-slate-800 border border-slate-600 px-3 py-1.5 text-xs text-white shadow-xl ${className || ''}`}
    >
      {children}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
    </div>,
    document.body
  );
}

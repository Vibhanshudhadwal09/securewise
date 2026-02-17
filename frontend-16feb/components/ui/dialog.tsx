"use client";

import * as React from 'react';
import { createPortal } from 'react-dom';

type DialogContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error('Dialog components must be used within <Dialog>');
  return ctx;
}

export function Dialog(props: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  const { open, onOpenChange, children } = props;
  return <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useDialogContext();
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        if (!open) setOpen(true);
      }}
    />
  );
}

export function DialogContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = useDialogContext();
  const { className, ...rest } = props;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => setOpen(false)}
      />
      <div
        className={`relative z-10 w-full max-w-3xl rounded-xl bg-white shadow-xl border border-gray-200 ${className || ''}`}
        {...rest}
      />
    </div>,
    document.body
  );
}

export function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={`px-6 pt-5 pb-3 border-b border-gray-100 ${className || ''}`} {...rest} />;
}

export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props;
  return <h2 className={`text-lg font-semibold text-gray-900 ${className || ''}`} {...rest} />;
}

export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const { className, ...rest } = props;
  return <p className={`text-sm text-gray-600 ${className || ''}`} {...rest} />;
}

export function DialogBody(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={`px-6 py-4 ${className || ''}`} {...rest} />;
}

export function DialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={`px-6 pb-5 pt-3 flex justify-end gap-2 ${className || ''}`} {...rest} />;
}

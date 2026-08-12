import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';
type ButtonSize = 'md' | 'sm';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-canvas hover:bg-ink/85',
  secondary: 'border border-line bg-surface text-ink shadow-card hover:bg-surface-hover',
  ghost: 'text-ink-secondary hover:bg-ink/5 hover:text-ink',
  // Two weights of destructive, and the difference is commitment. `danger` is
  // the quiet trigger that sits in a list row and only opens a question;
  // `destructive` is the answer to it, and never appears outside a
  // confirmation — nothing that deletes on first click should look this final.
  danger: 'text-negative hover:bg-negative/10',
  destructive: 'bg-negative text-canvas hover:bg-negative/85',
};

/** `sm` is for actions that sit inside a row of a list, not on their own. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-9 px-3.5 text-sm',
  sm: 'h-8 px-2.5 text-[13px]',
};

/**
 * The button look, on its own.
 *
 * Exported for the one case a `<button>` cannot cover: a `Link` that acts as
 * an action («Επεξεργασία»). It is still a link — it navigates, it opens in a
 * new tab, it is announced as a link — it merely wears the same clothes.
 * Anything that does something rather than goes somewhere uses `Button`.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium',
    'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
    'disabled:pointer-events-none disabled:opacity-50',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type,
  ...props
}: ButtonProps) {
  return (
    <button type={type ?? 'button'} className={buttonClass(variant, size, className)} {...props} />
  );
}

import { forwardRef, createContext, useContext } from 'react';
import { Loader2, Ban, Check, Edit2, Eye, Key, Lock, Printer, DollarSign, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn.js';

export const ActionCellContext = createContext(false);

const ICON_MAP = {
  edit: Edit2,
  delete: Trash2,
  remove: Trash2,
  open: Eye,
  view: Eye,
  details: Eye,
  suspend: Ban,
  activate: Check,
  permissions: Key,
  lock: Lock,
  print: Printer,
  pay: DollarSign,
  collect: DollarSign,
  settle: DollarSign,
  approve: Check
};

const VARIANTS = {
  primary:
    'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glass hover:from-brand-400 hover:to-brand-500 disabled:from-ink-600 disabled:to-ink-700 disabled:text-ink-300',
  secondary:
    'bg-white/5 text-ink-100 border border-white/10 backdrop-blur hover:bg-white/10 disabled:bg-white/[0.03] disabled:text-ink-400',
  ghost:
    'bg-transparent text-ink-200 hover:bg-white/5 disabled:text-ink-500',
  danger:
    'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-glass hover:from-rose-400 hover:to-rose-500 disabled:from-ink-600 disabled:to-ink-700 disabled:text-ink-300',
  outline:
    'border border-white/15 text-ink-100 hover:bg-white/5 disabled:text-ink-500'
};

const SIZES = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-11 px-5 text-base rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-xl'
};

export const Button = forwardRef(function Button(
  {
    type = 'button',
    variant = 'primary',
    size = 'md',
    className,
    children,
    isLoading = false,
    disabled,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    ...props
  },
  ref
) {
  const isActionCell = useContext(ActionCellContext);
  const isDisabled = disabled || isLoading;

  let finalLeftIcon = LeftIcon;
  let finalChildren = children;
  let finalSize = size;
  let finalClassName = className;
  let finalTitle = props.title || '';

  if (isActionCell) {
    const textLabel = typeof children === 'string' ? children.trim() : '';
    const textLower = textLabel.toLowerCase();

    // Map labels to lucide icons
    if (!finalLeftIcon && ICON_MAP[textLower]) {
      finalLeftIcon = ICON_MAP[textLower];
      finalChildren = null;
    } else if (finalLeftIcon && textLabel) {
      finalChildren = null;
    }

    if (textLabel && !finalTitle) {
      finalTitle = textLabel;
    }

    finalSize = 'icon';
    finalClassName = cn(
      'datatable-action-btn border border-white/10 hover:border-brand-500 hover:scale-105 transition-all duration-200',
      className
    );
  }

  const LeftIconRef = finalLeftIcon;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      title={finalTitle || undefined}
      className={cn(
        'inline-flex min-w-0 select-none items-center justify-center whitespace-nowrap font-medium transition',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[finalSize],
        finalClassName
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        LeftIconRef && <LeftIconRef className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {finalChildren && <span className="truncate">{finalChildren}</span>}
      {!isLoading && RightIcon && <RightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
    </button>
  );
});

import React, {
  forwardRef,
  useId,
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  Children
} from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/cn.js';

export const Select = forwardRef(function Select(
  {
    label,
    description,
    error,
    leftIcon: LeftIcon,
    className,
    containerClassName,
    id,
    children,
    placeholder = 'Select option...',
    ...props
  },
  ref
) {
  const reactId = useId();
  const selectId = id || reactId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef(null);
  const selectRef = useRef(null);
  const searchInputRef = useRef(null);

  // Expose the native select ref to form libraries
  useImperativeHandle(ref, () => selectRef.current);

  // Parse option elements from children
  const options = Children.toArray(children)
    .map((child) => {
      if (!child) return null;
      if (child.type === 'option') {
        return {
          value: child.props.value !== undefined ? String(child.props.value) : '',
          label: child.props.children || ''
        };
      }
      return null;
    })
    .filter(Boolean);

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(props.value || ''));
  const displayText = selectedOption ? selectedOption.label : placeholder;
  const isDisabled = Boolean(props.disabled);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    String(opt.label).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Autofocus search input when open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    if (isDisabled) return;
    if (selectRef.current) {
      const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        'value'
      ).set;
      nativeSelectValueSetter.call(selectRef.current, val);

      const event = new Event('change', { bubbles: true });
      selectRef.current.dispatchEvent(event);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={cn('relative flex min-w-0 flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium uppercase tracking-wider text-ink-300 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative w-full">
        {/* Hidden native select for form hooks */}
        <select
          ref={selectRef}
          id={selectId}
          className="sr-only"
          {...props}
          tabIndex={-1}
        >
          {children}
        </select>

        {/* Custom Premium Dropdown Button */}
        <button
          type="button"
          onClick={() => {
            if (!isDisabled) setIsOpen(!isOpen);
          }}
          disabled={isDisabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'group flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-ink-50 transition text-left focus:outline-none focus:border-brand-400/70 focus:bg-white/[0.07]',
            isOpen && 'border-brand-400/70 bg-white/[0.07]',
            isDisabled && 'cursor-not-allowed opacity-60',
            error && 'border-rose-400/60 focus:border-rose-400/80',
            className
          )}
        >
          {LeftIcon && <LeftIcon className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />}
          <span className="flex-1 truncate">{displayText}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-ink-300 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>

        {/* Dropdown Options Popover */}
        {isOpen && (
          <div className="glass-panel-strong absolute left-0 right-0 z-50 mt-1.5 flex max-h-64 flex-col overflow-hidden p-1.5 animate-fade-in shadow-glass-lg">
            {/* Search Input Box */}
            <div className="relative flex items-center shrink-0 px-2 py-1.5 border-b border-white/5">
              <Search className="absolute left-4 h-3.5 w-3.5 text-ink-300" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search options..."
                className="w-full h-8 pl-8 pr-2 rounded-lg bg-white/5 border border-white/10 text-xs text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-brand-400/50"
              />
            </div>

            {/* Options List */}
            <div className="scrollbar-glass overflow-y-auto flex-1 flex flex-col gap-0.5 p-1 min-h-[40px]">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(props.value || '');
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        'w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors flex items-center justify-between',
                        isSelected
                          ? 'bg-brand-500/10 text-brand-300 font-medium theme-light:bg-brand-500/8 theme-light:text-brand-600'
                          : 'text-ink-200 hover:bg-white/5 hover:text-ink-50'
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-400 theme-light:text-brand-500" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-2.5 py-4 text-xs text-center text-ink-400">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {description && !error && (
        <p id={`${selectId}-desc`} className="text-xs text-ink-400">
          {description}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
});

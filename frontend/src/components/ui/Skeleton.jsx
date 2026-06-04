import { cn } from '@/lib/cn.js';

export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'shimmer-bg animate-shimmer rounded-md',
        className
      )}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

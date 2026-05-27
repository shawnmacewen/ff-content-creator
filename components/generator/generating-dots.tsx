import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BouncingDots({
  className,
  dotClassName,
}: {
  className?: string;
  dotClassName?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-label="Generating">
      <span className={cn('h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.2s]', dotClassName)} />
      <span className={cn('h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.1s]', dotClassName)} />
      <span className={cn('h-2 w-2 rounded-full bg-primary animate-bounce', dotClassName)} />
    </div>
  );
}

export function GeneratingOutputState({
  label = 'Generating output',
  detail = 'Editorial is creating the draft. This can take a moment.',
}: {
  label?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-8 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <BouncingDots className="mb-5 justify-center gap-3" dotClassName="h-5 w-5" />
      <div className="text-base font-semibold">{label}</div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

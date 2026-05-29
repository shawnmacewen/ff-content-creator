import type { ComponentType, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type HeaderMetric = {
  label: string;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
  iconClassName?: string;
  trailing?: ReactNode;
};

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: HeaderMetric[];
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  metrics,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section className={cn('overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)}>
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-[linear-gradient(135deg,#11285a_0%,#143a7b_58%,#0f6f8f_100%)] p-6 text-white sm:p-7">
          <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/10">
            {eyebrow}
          </Badge>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/85">
            {description}
          </p>
          {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        <div className="flex content-center items-center gap-3 overflow-x-auto bg-secondary/60 p-6 sm:p-7">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex min-h-[70px] min-w-[180px] flex-1 items-center gap-3 rounded-md border border-border bg-card p-4"
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  metric.active === false
                    ? 'bg-muted text-muted-foreground'
                    : metric.iconClassName || 'bg-primary text-primary-foreground'
                )}
              >
                <metric.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{metric.label}</p>
                {metric.detail ? (
                  <p className="truncate text-xs text-muted-foreground">{metric.detail}</p>
                ) : null}
              </div>
              {metric.trailing}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

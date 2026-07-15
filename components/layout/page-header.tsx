import type { ComponentType, ReactNode } from 'react';
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
  title,
  metrics,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <>
      <section className={cn('rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6', className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {actions ? <div className="flex shrink-0 justify-end">{actions}</div> : null}
        </div>
      </section>

      {metrics.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex min-h-24 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  metric.active === false
                    ? 'bg-muted text-muted-foreground'
                    : metric.iconClassName || 'bg-primary text-primary-foreground'
                )}
              >
                <metric.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5">{metric.label}</p>
                {metric.detail ? (
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{metric.detail}</p>
                ) : null}
              </div>
              {metric.trailing ? <div className="shrink-0">{metric.trailing}</div> : null}
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

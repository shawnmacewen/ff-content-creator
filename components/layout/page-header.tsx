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
        <div className="flex flex-col justify-center gap-4 bg-secondary/60 p-6 sm:p-7">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-start gap-3 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
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
        </div>
      </div>
    </section>
  );
}
